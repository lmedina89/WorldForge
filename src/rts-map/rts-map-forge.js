import * as THREE from 'three';
import { instantiateMasterResource, masterResourceForRichness } from '../rts/rts-asset-library.js';

export const RTS_MAP_FORGE_VERSION='0.2.7';
export const RTS_MAP_SCHEMA='worldforge.rts-map.v1';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
function makeRng(seed){let s=(Number(seed)>>>0)||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};}
function disposeGroup(root){
  if(!root)return;
  root.traverse(o=>{
    o.geometry?.dispose?.();
    const mats=Array.isArray(o.material)?o.material:(o.material?[o.material]:[]);
    mats.forEach(m=>m?.dispose?.());
  });
}
function mat(color,roughness=.95,extra={}){return new THREE.MeshStandardMaterial({color,roughness,metalness:0,...extra});}
function box(parent,x,y,z,sx,sy,sz,color,rough=.9){
  const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat(color,rough));
  m.position.set(x,y,z+sz*.5);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function lineMaterial(color,opacity=.9){return new THREE.LineBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:false});}

const BIOMES={
  temperate:{low:0x627557,mid:0x71805d,high:0x85866f,tree:0x285136,trunk:0x554536,rock:0x74736a,road:0x4b4c46,roadShoulder:0x676153,water:0x477f90,resource:0xd0b44a},
  drylands:{low:0x887858,mid:0x9a875f,high:0xaa956c,tree:0x59693b,trunk:0x65503a,rock:0x7e725e,road:0x625b50,roadShoulder:0x7f6e53,water:0x4f8393,resource:0xd4b04d},
  alpine:{low:0x60725d,mid:0x6d7864,high:0x8a8d81,tree:0x284a36,trunk:0x504438,rock:0x737874,road:0x50534f,roadShoulder:0x68685f,water:0x4b7d8e,resource:0xcbb04c}
};
const lerpColor=(a,b,t)=>new THREE.Color(a).lerp(new THREE.Color(b),clamp(t,0,1));

export const RTS_MOVEMENT_CLASSES=Object.freeze({
  tracked:{bit:1,label:'Tracked',maxSlopeDeg:32,roadCost:.78,groundCost:1.00,roughCost:1.28,forestPenalty:.07},
  wheeled:{bit:2,label:'Wheeled',maxSlopeDeg:22,roadCost:.56,groundCost:1.22,roughCost:2.05,forestPenalty:.16},
  infantry:{bit:4,label:'Infantry',maxSlopeDeg:42,roadCost:.86,groundCost:1.00,roughCost:1.14,forestPenalty:.025},
  amphibious:{bit:8,label:'Amphibious',maxSlopeDeg:30,roadCost:.88,groundCost:1.08,roughCost:1.34,waterCost:1.18,forestPenalty:.06},
  air:{bit:16,label:'Air',maxSlopeDeg:90,airCost:1.00}
});
const MOVEMENT_ORDER=Object.freeze(['tracked','wheeled','infantry','amphibious','air']);
const NAV_FLAG=Object.freeze({buildable:1,water:2,cliff:4,road:8,bridge:16,forest:32,rough:64});
const toCost10=v=>v===null||!Number.isFinite(v)?0:Math.max(1,Math.min(255,Math.round(v*10)));

export function normalizeRTSMapRecipe(input={}){
  const size=[512,768,1024,1536].includes(Number(input.size))?Number(input.size):1536;
  const players=Number(input.players)===2?2:4;
  return {
    schema:RTS_MAP_SCHEMA,
    version:RTS_MAP_FORGE_VERSION,
    type:'rtsMap',
    seed:Math.max(1,Math.floor(Number(input.seed)||731904)),
    size,
    players,
    biome:BIOMES[input.biome]?input.biome:'temperate',
    tacticalProfile:['balanced','mountainPasses','valleyWar'].includes(input.tacticalProfile)?input.tacticalProfile:'balanced',
    relief:clamp(Number(input.relief)||1,0,1),
    forest:clamp(Number(input.forest)||1,0,1),
    resources:clamp(Number(input.resources)||0.75,0,1),
    river:input.river!==false,
    roads:input.roads!==false,
    startProtection:['open','balanced','fortified'].includes(input.startProtection)?input.startProtection:'fortified'
  };
}

export class RTSMapForge{
  constructor({scene,camera,renderer,controls}){
    this.scene=scene;this.camera=camera;this.renderer=renderer;this.controls=controls;
    this.root=new THREE.Group();this.root.name='WorldForgeRTSMap';this.root.visible=false;scene.add(this.root);
    this.overlay=new THREE.Group();this.overlay.name='WorldForgeRTSMapOverlay';this.overlay.visible=false;scene.add(this.overlay);
    this.movementOverlay=new THREE.Group();this.movementOverlay.name='WorldForgeRTSMovementOverlay';this.movementOverlay.visible=false;scene.add(this.movementOverlay);
    this.lightRig=new THREE.Group();this.lightRig.visible=false;
    const hemi=new THREE.HemisphereLight(0xf2f8ff,0x68735d,1.55);this.mapHemi=hemi;
    const key=new THREE.DirectionalLight(0xffefd2,1.35);key.position.set(-180,-230,330);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.near=10;key.shadow.camera.far=2800;key.shadow.bias=-.00018;key.shadow.normalBias=.045;key.shadow.radius=2;this.mapKey=key;
    this.lightRig.add(hemi,key);scene.add(this.lightRig);
    this.recipe=null;this.metadata=null;this.heightAt=()=>0;this.fogPreview=false;this.fogTexture=null;this.fogMesh=null;this.fogCanvas=null;this.fogCtx=null;
    this.movementPreview='off';this.bridgeData=[];this.roadFns=[];this.treePoints=[];this.resourceViews=[];this.resourceLoadPromise=Promise.resolve([]);this.generationSerial=0;
  }

  setActive(active){
    this.root.visible=!!active;this.overlay.visible=!!active;this.lightRig.visible=!!active;
    this.movementOverlay.visible=!!active&&this.movementPreview!=='off'&&!!this.metadata;
    if(this.fogMesh)this.fogMesh.visible=!!active&&this.fogPreview;
  }
  setVisualProfile(profile='map'){
    const skirmish=profile==='skirmish';
    if(this.mapHemi)this.mapHemi.intensity=skirmish?.82:1.18;
    if(this.mapKey){this.mapKey.intensity=skirmish?2.05:1.58;this.mapKey.shadow.bias=skirmish?-.00022:-.00018;this.mapKey.shadow.normalBias=skirmish?.05:.045;}
  }

  disposeGenerated(){
    this.generationSerial++;
    for(const group of [this.root,this.overlay,this.movementOverlay]){while(group.children.length){const c=group.children[group.children.length-1];group.remove(c);disposeGroup(c);}}
    this.fogTexture?.dispose?.();this.fogTexture=null;this.fogMesh=null;this.fogCanvas=null;this.fogCtx=null;
    this.bridgeData=[];this.roadFns=[];this.treePoints=[];this.resourceViews=[];this.resourceLoadPromise=Promise.resolve([]);
  }

  async _populateResourceAssets(resourceZones,generationId=this.generationSerial){
    const loadedFields=[];
    const byAsset=new Map();
    for(const zone of resourceZones){
      const anchor=new THREE.Group();anchor.name=`${zone.id}_FIELD_ANCHOR`;anchor.position.set(zone.x,zone.y,zone.z||this.heightAt(zone.x,zone.y));
      anchor.userData={worldForgeResourceField:true,resourceZoneId:zone.id,richness:zone.richness,capacity:zone.capacity,remainingCapacity:zone.capacity,collisionMode:'nonblocking_resource'};
      this.root.add(anchor);this.resourceViews.push(anchor);loadedFields.push(anchor);
      for(const cluster of zone.visualClusters||[]){
        if(!byAsset.has(cluster.assetId))byAsset.set(cluster.assetId,[]);
        byAsset.get(cluster.assetId).push({zone,cluster});
      }
    }
    const axisMatrix=new THREE.Matrix4().makeRotationX(Math.PI/2),tmpPos=new THREE.Vector3();
    for(const [assetId,entries] of byAsset){
      try{
        const result=await instantiateMasterResource(assetId);
        if(generationId!==this.generationSerial){disposeGroup(result.group);continue;}
        result.group.updateMatrixWorld(true);
        const sourceMeshes=[];result.group.traverse(o=>{if(o.isMesh)sourceMeshes.push(o);});
        const helper=result.group.getObjectByName('WF_HARVEST_POINT');
        const clusterMatrices=[];
        for(const {cluster} of entries){
          const t=new THREE.Matrix4().makeTranslation(cluster.x,cluster.y,cluster.z+.04),r=new THREE.Matrix4().makeRotationZ(cluster.heading),sc=new THREE.Matrix4().makeScale(cluster.scale,cluster.scale,cluster.scale);
          clusterMatrices.push(new THREE.Matrix4().multiply(t).multiply(r).multiply(sc).multiply(axisMatrix));
        }
        sourceMeshes.forEach((sourceMesh,meshIndex)=>{
          const inst=new THREE.InstancedMesh(sourceMesh.geometry,sourceMesh.material,entries.length);inst.name=`Resource_${assetId}_${meshIndex}_${sourceMesh.name||'Mesh'}`;inst.castShadow=sourceMesh.castShadow!==false;inst.receiveShadow=sourceMesh.receiveShadow!==false;inst.renderOrder=sourceMesh.renderOrder||0;
          entries.forEach(({zone,cluster},i)=>{const m=new THREE.Matrix4().multiplyMatrices(clusterMatrices[i],sourceMesh.matrixWorld);inst.setMatrixAt(i,m);});
          inst.instanceMatrix.needsUpdate=true;inst.userData={worldForgeResourceInstances:true,resourceAsset:assetId,instanceMap:entries.map(({zone,cluster})=>({resourceZoneId:zone.id,clusterId:cluster.id,richness:zone.richness,fieldCapacity:zone.capacity,visualOnly:true}))};
          this.root.add(inst);
        });
        if(helper){
          helper.getWorldPosition(tmpPos);
          const firstByZone=new Set();
          entries.forEach(({zone,cluster},i)=>{if(firstByZone.has(zone.id))return;firstByZone.add(zone.id);const hp=tmpPos.clone().applyMatrix4(clusterMatrices[i]);zone.harvestPoint={x:+hp.x.toFixed(2),y:+hp.y.toFixed(2),z:+hp.z.toFixed(2)};});
        }
      }catch(err){
        console.error(`Resource field asset load failed for ${assetId}`,err);
      }
    }
    return loadedFields;
  }

  awaitResourceAssets(){return this.resourceLoadPromise||Promise.resolve([]);}

  _layout(recipe){
    const size=recipe.size,H=size/2;
    const corners=recipe.players===2?
      [{id:'START_01',x:-H*.68,y:-H*.68,angle:Math.PI/4,owner:'player'},{id:'START_02',x:H*.68,y:H*.68,angle:-3*Math.PI/4,owner:'opponent'}]:
      [
        {id:'START_01',x:-H*.68,y:-H*.68,angle:Math.PI/4,owner:'player'},
        {id:'START_02',x:-H*.68,y:H*.68,angle:-Math.PI/4,owner:'opponent'},
        {id:'START_03',x:H*.68,y:H*.68,angle:-3*Math.PI/4,owner:'opponent'},
        {id:'START_04',x:H*.68,y:-H*.68,angle:3*Math.PI/4,owner:'opponent'}
      ];
    const ex=[];
    for(const s of corners){
      const toward=new THREE.Vector2(-s.x,-s.y).normalize();const side=new THREE.Vector2(-toward.y,toward.x);
      ex.push({id:`${s.id}_EXP_A`,x:s.x+toward.x*size*.22+side.x*size*.08,y:s.y+toward.y*size*.22+side.y*size*.08,kind:'safeExpansion'});
      ex.push({id:`${s.id}_EXP_B`,x:s.x+toward.x*size*.30-side.x*size*.13,y:s.y+toward.y*size*.30-side.y*size*.13,kind:'hiddenPocket'});
    }
    return {starts:corners,expansions:ex};
  }

  _roadCurves(size){
    return [
      {id:'ROAD_1',role:'mainRoute',preferred:['wheeled','tracked','infantry'],width:size*.012,fn:x=>-size*.13+.34*x+size*.028*Math.sin((x+size*.1)/(size*.17))},
      {id:'ROAD_2',role:'flankRoute',preferred:['wheeled','tracked','infantry'],width:size*.012,fn:x=>size*.14-.30*x+size*.024*Math.sin((x-size*.06)/(size*.16))},
      {id:'ROAD_3',role:'centralConnector',preferred:['wheeled','tracked','infantry'],width:size*.010,fn:x=>size*.015+size*.018*Math.sin(x/(size*.15))}
    ];
  }

  _makeTerrainFunction(recipe,layout){
    const size=recipe.size,relief=recipe.relief;
    const amp=12+relief*18;
    const river=x=>size*.015+size*.07*Math.sin((x+size*.07)/(size*.19))+size*.018*Math.sin(x/(size*.07));
    const roadCurves=recipe.roads?this._roadCurves(size):[];
    const ridgeWidth=size*(recipe.tacticalProfile==='mountainPasses'?.045:.06);
    const startRingHeight=(recipe.startProtection==='fortified'?1.28:recipe.startProtection==='open'?.58:1)*amp;
    const startRingRadius=size*.140;
    const startRingWidth=size*.028;
    const hiddenBowlRadius=size*.065;
    const passXs=[-size*.20,size*.08,size*.31];
    const gauss=(v,w)=>Math.exp(-(v*v)/(w*w));
    const angleDiff=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
    const raw=(x,y)=>{
      let h=(Math.sin(x*0.014*(1024/size))*2.2+Math.cos(y*0.016*(1024/size))*1.8+Math.sin((x+y)*0.024*(1024/size))*.9)*(0.65+relief*.6);
      h+=Math.sin(Math.hypot(x+size*.10,y-size*.03)*0.018*(1024/size))*4.5*relief;
      const ridgeLine=y-(.46*x+size*.035);
      let passMask=1;for(const px of passXs)passMask*=1-gauss(x-px,size*.05);
      h+=gauss(ridgeLine,ridgeWidth)*amp*.62*passMask;
      h+=gauss(y+0.32*x+size*.12,size*.08)*amp*.28;
      h-=gauss(x+size*.055+.20*y,size*.028)*amp*.34;
      h-=gauss(y-size*.18*Math.sin(x/(size*.19))-size*.11,size*.045)*amp*.22;
      for(const s of layout.starts){
        const dx=x-s.x,dy=y-s.y,d=Math.hypot(dx,dy),a=Math.atan2(dy,dx);
        const mainGate=1-smooth(angleDiff(a,s.angle)/(Math.PI*.19));
        const flankGate=1-smooth(angleDiff(a,s.angle+(s.x*s.y>0?.75:-.75))/(Math.PI*.11));
        const gate=Math.max(mainGate,flankGate*.62);
        h+=gauss(d-startRingRadius,startRingWidth)*startRingHeight*(1-gate);
        if(d<size*.085){const k=smooth((size*.085-d)/(size*.028));h=h*(1-k)+4.5*k;}
      }
      for(const e of layout.expansions.filter(e=>e.kind==='hiddenPocket')){
        const dx=x-e.x,dy=y-e.y,d=Math.hypot(dx,dy),a=Math.atan2(dy,dx),toCenter=Math.atan2(-e.y,-e.x);
        const gate=1-smooth(angleDiff(a,toCenter)/(Math.PI*.13));
        h+=gauss(d-hiddenBowlRadius,size*.018)*amp*.40*(1-gate);
        h-=gauss(d,size*.042)*amp*.10;
      }
      if(recipe.river){const ry=river(x),rd=Math.abs(y-ry);h-=gauss(rd,size*.020)*amp*.32;}
      h+=gauss(Math.hypot(x-size*.12,y-size*.24),size*.12)*amp*.24;
      h+=gauss(Math.hypot(x+size*.26,y+size*.02),size*.11)*amp*.22;
      return h;
    };
    const fn=(x,y)=>{
      let h=raw(x,y);
      for(const road of roadCurves){
        const dy=y-road.fn(x),reach=road.width*1.85,ad=Math.abs(dy);
        if(ad>=reach)continue;
        const w=smooth(1-ad/reach),step=Math.max(6,size*.006);
        const roadBase=(raw(x-step*2,road.fn(x-step*2))+raw(x-step,road.fn(x-step))+raw(x,road.fn(x))+raw(x+step,road.fn(x+step))+raw(x+step*2,road.fn(x+step*2)))/5;
        const cut=amp*.0045;
        h=THREE.MathUtils.lerp(h,roadBase-cut,w*(ad<road.width*.7?.88:.58));
      }
      return h;
    };
    return {heightAt:fn,river,roadCurves};
  }

  _terrainContext(recipe,layout,x,y,z,slopeDeg=0,riverProximity=0){
    const size=recipe.size;
    let baseClear=0;
    for(const s of layout.starts){
      const d=Math.hypot(x-s.x,y-s.y);
      if(d<size*.13)baseClear=Math.max(baseClear,1-clamp((d-size*.06)/(size*.07),0,1));
    }
    for(const e of layout.expansions){
      const r=e.kind==='safeExpansion'?size*.050:size*.036,d=Math.hypot(x-e.x,y-e.y);
      if(d<r*2.1)baseClear=Math.max(baseClear,(1-clamp((d-r*.7)/(r*1.4),0,1))*(e.kind==='safeExpansion'?.52:.34));
    }
    const macro=.5+.5*((Math.sin((x+y)*0.0026)+Math.sin(x*0.0031)+Math.cos(y*0.0028))/3);
    const upland=smooth(clamp((z-4)/(18+recipe.relief*12),0,1));
    const rocky=clamp(smooth(clamp((slopeDeg-13)/22,0,1))*.72+upland*.18,0,1);
    const dry=clamp(smooth(clamp(upland*(1-riverProximity*.72)+clamp((slopeDeg-9)/22,0,1)*.34,0,1))*.75+macro*.10,0,1);
    return {baseClear,macro,upland,rocky,dry};
  }

  _terrainColor(recipe,z,random,slopeDeg=0,riverProximity=0,zone={}){
    const b=BIOMES[recipe.biome];
    const low=new THREE.Color(b.low),mid=new THREE.Color(b.mid),high=new THREE.Color(b.high),tree=new THREE.Color(b.tree),rock=new THREE.Color(b.rock),shoulder=new THREE.Color(b.roadShoulder),water=new THREE.Color(b.water);
    const elev=clamp((z+6)/(30+recipe.relief*18),0,1);
    let c=elev<.45?low.clone().lerp(mid,elev/.45):mid.clone().lerp(high,(elev-.45)/.55);
    const lush=low.clone().lerp(tree,.34).lerp(water,.08);
    c.lerp(lush,clamp(riverProximity*.52*(1-(zone.dry||0)*.35),0,1));
    c.lerp(shoulder,clamp((zone.dry||0)*.16+(zone.baseClear||0)*.12,0,.24));
    c.lerp(rock,clamp(zone.rocky||0,0,1)*.74);
    const slopeShade=clamp(slopeDeg/42,0,1)*.075,riverLift=clamp(riverProximity,0,1)*.022,macroShift=((zone.macro??.5)-.5)*.018;
    c.offsetHSL((random()-.5)*.006,(random()-.5)*.018+macroShift,(random()-.5)*.025-slopeShade+riverLift-(zone.baseClear||0)*.016);
    return c;
  }

  _stripFrame(pathFn,x,width){
    const size=this.recipe.size,e=Math.max(1.25,size/1024*1.2),y=pathFn(x),dy=pathFn(x+e)-pathFn(x-e),nx=-dy,ny=2*e,n=Math.hypot(nx,ny)||1;
    const ux=nx/n,uy=ny/n,half=width*.5;
    return {x,y,ux,uy,left:{x:x-ux*half,y:y-uy*half},right:{x:x+ux*half,y:y+uy*half}};
  }

  _roadProfileHeight(pathFn,x,width){
    const size=this.recipe.size,step=Math.max(4,size*.0042),weights=[1,2,3,2,1];
    let sum=0,weightSum=0;
    for(let k=-2;k<=2;k++){
      const sx=x+k*step,frame=this._stripFrame(pathFn,sx,width),center=this.heightAt(frame.x,frame.y),left=this.heightAt(frame.left.x,frame.left.y),right=this.heightAt(frame.right.x,frame.right.y);
      // A mostly-flat cross-section prevents the road core from diving through the
      // terrain on side slopes. The carved corridor keeps the lift visually small.
      const cross=Math.max(center,left,right),w=weights[k+2];sum+=cross*w;weightSum+=w;
    }
    return sum/weightSum;
  }

  _makeRoadStrip(pathFn,width,segments,color,zLift=.18,profileWidth=width){
    const size=this.recipe.size,H=size/2,p=[],idx=[];
    for(let i=0;i<=segments;i++){
      const x=-H+size*i/segments,frame=this._stripFrame(pathFn,x,width),zz=this._roadProfileHeight(pathFn,x,profileWidth)+zLift;
      p.push(frame.left.x,frame.left.y,zz,frame.right.x,frame.right.y,zz);
    }
    for(let i=0;i<segments;i++){const a=i*2,b=a+1,c=a+2,d=c+1;idx.push(a,c,b,b,c,d);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();
    const m=new THREE.Mesh(g,mat(color,.96));m.receiveShadow=true;m.renderOrder=2;return m;
  }

  _riverSurfaceAt(x,riverFn){
    const size=this.recipe.size,step=Math.max(5,size*.006),weights=[1,2,3,2,1];
    let bed=0,weightSum=0;
    for(let k=-2;k<=2;k++){const sx=x+k*step,w=weights[k+2];bed+=this.heightAt(sx,riverFn(sx))*w;weightSum+=w;}
    // The old strip sat below the river bed on some terrain samples. Keep the water
    // safely above the carved channel while still well below the banks.
    return bed/weightSum+clamp(size*.00155,1.65,2.55);
  }

  _makeRiverStrip(pathFn,width,segments,color){
    const size=this.recipe.size,H=size/2,p=[],idx=[];
    for(let i=0;i<=segments;i++){
      const x=-H+size*i/segments,frame=this._stripFrame(pathFn,x,width),zz=this._riverSurfaceAt(x,pathFn);
      // Water is level across the channel at each station; sampling terrain at both
      // edges made the ribbon fold into the banks and vanish in isolated spans.
      p.push(frame.left.x,frame.left.y,zz,frame.right.x,frame.right.y,zz);
    }
    for(let i=0;i<segments;i++){const a=i*2,b=a+1,c=a+2,d=c+1;idx.push(a,c,b,b,c,d);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();
    const m=new THREE.Mesh(g,mat(color,.28,{transparent:true,opacity:.90,depthWrite:true}));m.receiveShadow=true;m.renderOrder=1;return m;
  }

  _bridgeFrame(x,riverFn){
    const size=this.recipe.size,riverWidth=size*.032,y=riverFn(x),e=Math.max(1,size/1024*2);
    const tangent=new THREE.Vector2(2*e,riverFn(x+e)-riverFn(x-e)).normalize();
    const axis=new THREE.Vector2(-tangent.y,tangent.x).normalize();
    const angle=Math.atan2(axis.y,axis.x);
    const bankOffset=riverWidth*.72,approachLength=clamp(size*.030,18,42),bridgeWidth=clamp(size*.0105,8.5,14),deckThickness=clamp(size*.00115,.65,1.65);
    const ax=x+axis.x*bankOffset,ay=y+axis.y*bankOffset,bx=x-axis.x*bankOffset,by=y-axis.y*bankOffset;
    const outerA={x:x+axis.x*(bankOffset+approachLength),y:y+axis.y*(bankOffset+approachLength)};
    const outerB={x:x-axis.x*(bankOffset+approachLength),y:y-axis.y*(bankOffset+approachLength)};
    const bankA=this.heightAt(ax,ay),bankB=this.heightAt(bx,by),outerAH=this.heightAt(outerA.x,outerA.y),outerBH=this.heightAt(outerB.x,outerB.y);
    const waterZ=this._riverSurfaceAt(x,riverFn);
    const minClearance=clamp(size*.0018,1.4,2.8),deckLift=clamp(size*.0008,.55,1.15);
    const deckZ=Math.max(bankA,bankB,waterZ+minClearance)+deckLift;
    const deckLength=bankOffset*2*1.08;
    return {x,y,angle,axis:[axis.x,axis.y],riverWidth,bankOffset,approachLength,bridgeWidth,deckThickness,deckLength,deckZ,waterZ,
      bankA:{x:ax,y:ay,z:bankA},bankB:{x:bx,y:by,z:bankB},outerA:{...outerA,z:outerAH},outerB:{...outerB,z:outerBH}};
  }

  _bridgeRamp(group,side,frame,biome){
    const deckHalf=frame.deckLength*.5,approach=frame.approachLength,outer=side>0?frame.outerA:frame.outerB;
    const delta=frame.deckZ-outer.z,len=Math.hypot(approach,delta),thickness=Math.max(.45,frame.deckThickness*.72);
    const ramp=new THREE.Mesh(new THREE.BoxGeometry(len,frame.bridgeWidth,thickness),mat(biome.road,.91));
    ramp.name=side>0?'Approach_A':'Approach_B';
    ramp.position.set(side*(deckHalf+approach*.5),0,(frame.deckZ+outer.z)*.5+thickness*.5);
    ramp.rotation.y=side*Math.atan2(delta,approach);
    ramp.castShadow=false;ramp.receiveShadow=true;group.add(ramp);
  }

  _addBridge(x,riverFn,index=0){
    const frame=this._bridgeFrame(x,riverFn),biome=BIOMES[this.recipe.biome],g=new THREE.Group();
    g.name=`Bridge_${String(index+1).padStart(2,'0')}`;g.position.set(frame.x,frame.y,0);g.rotation.z=frame.angle;
    const deck=box(g,0,0,frame.deckZ,frame.deckLength,frame.bridgeWidth,frame.deckThickness,0x77766d,.82);deck.name='BridgeDeck';
    const railH=Math.max(.8,frame.deckThickness*1.15);
    for(const sy of [-frame.bridgeWidth*.48,frame.bridgeWidth*.48]){const rail=box(g,0,sy,frame.deckZ+frame.deckThickness,frame.deckLength,Math.max(.22,frame.bridgeWidth*.025),railH,0x3e4542,.75);rail.name='BridgeRail';}
    this._bridgeRamp(g,1,frame,biome);this._bridgeRamp(g,-1,frame,biome);
    this.root.add(g);
    const meta={id:g.name,type:'bridge',x:+frame.x.toFixed(2),y:+frame.y.toFixed(2),angle:+frame.angle.toFixed(5),deckZ:+frame.deckZ.toFixed(2),waterZ:+frame.waterZ.toFixed(2),clearance:+(frame.deckZ-frame.waterZ).toFixed(2),length:+frame.deckLength.toFixed(2),width:+frame.bridgeWidth.toFixed(2),approachLength:+frame.approachLength.toFixed(2),
      endpoints:[{x:+frame.outerA.x.toFixed(2),y:+frame.outerA.y.toFixed(2),z:+frame.outerA.z.toFixed(2)},{x:+frame.outerB.x.toFixed(2),y:+frame.outerB.y.toFixed(2),z:+frame.outerB.z.toFixed(2)}],allowed:['tracked','wheeled','infantry','amphibious']};
    this.bridgeData.push({...meta,_frame:frame});return meta;
  }

  _bridgeAt(x,y){
    for(const b of this.bridgeData){const f=b._frame,dx=x-f.x,dy=y-f.y,c=Math.cos(f.angle),ss=Math.sin(f.angle),lx=dx*c+dy*ss,ly=-dx*ss+dy*c;
      if(Math.abs(lx)<=f.deckLength*.5+f.approachLength&&Math.abs(ly)<=f.bridgeWidth*.62)return b;
    }
    return null;
  }

  _startMarker(start,index){
    const size=this.recipe.size,z=this.heightAt(start.x,start.y)+.7;
    const g=new THREE.Group();g.name=start.id;
    const radius=size*.085;
    const fill=new THREE.Mesh(new THREE.CircleGeometry(radius,48),new THREE.MeshBasicMaterial({color:index===0?0x55c97a:0x8da18e,transparent:true,opacity:index===0?.22:.10,depthWrite:false}));fill.position.set(start.x,start.y,z);g.add(fill);
    const pts=[];for(let i=0;i<=64;i++){const a=i/64*Math.PI*2;pts.push(new THREE.Vector3(start.x+Math.cos(a)*radius,start.y+Math.sin(a)*radius,z+.2));}
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),lineMaterial(index===0?0x7ff0a0:0xa8b9aa,index===0?.95:.6)));
    this.overlay.add(g);
  }

  _zoneMarker(zone,color=0x8ed7a0){
    const size=this.recipe.size,r=size*.035,z=this.heightAt(zone.x,zone.y)+.55,pts=[];for(let i=0;i<=40;i++){const a=i/40*Math.PI*2;pts.push(new THREE.Vector3(zone.x+Math.cos(a)*r,zone.y+Math.sin(a)*r,z));}
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),lineMaterial(color,.55));line.name=zone.id;this.overlay.add(line);
  }

  _navigationMetadata(recipe,riverFn,layout){
    const N=64,size=recipe.size,H=size/2,cell=size/N,heights=[],slopes=[],terrainFlags=[],movementMask=[];
    const costs=Object.fromEntries(MOVEMENT_ORDER.map(k=>[k,[]]));
    const forestCounts=new Uint8Array(N*N);
    for(const pt of this.treePoints){const ix=clamp(Math.floor((pt[0]+H)/cell),0,N-1),iy=clamp(Math.floor((pt[1]+H)/cell),0,N-1),k=iy*N+ix;forestCounts[k]=Math.min(255,forestCounts[k]+1);}
    const roadWidths=this.roadFns.map(r=>r.width||size*.012);
    let buildable=0,waterCells=0,roadCells=0,bridgeCells=0;
    const profiles=Object.fromEntries(MOVEMENT_ORDER.map(k=>[k,{...RTS_MOVEMENT_CLASSES[k]}]));
    for(let j=0;j<N;j++)for(let i=0;i<N;i++){
      const k=j*N+i,x=-H+(i+.5)*cell,y=-H+(j+.5)*cell,h=this.heightAt(x,y),e=cell*.34;
      const gx=(this.heightAt(x+e,y)-this.heightAt(x-e,y))/(2*e),gy=(this.heightAt(x,y+e)-this.heightAt(x,y-e))/(2*e),gradient=Math.hypot(gx,gy),slopeDeg=Math.atan(gradient)*180/Math.PI;
      const bridge=this._bridgeAt(x,y),riverWidth=size*.032,water=recipe.river&&!bridge&&Math.abs(y-riverFn(x))<riverWidth*.50;
      let road=false;for(let ri=0;ri<this.roadFns.length;ri++){const fn=this.roadFns[ri],rw=roadWidths[ri];if(Math.abs(y-fn(x))<rw*.62){road=true;break;}}
      const forest=forestCounts[k],rough=slopeDeg>12||forest>=2,cliff=slopeDeg>42&&!bridge;
      const canBuild=!water&&!bridge&&!road&&!cliff&&slopeDeg<7.5&&forest<5;
      let f=0;if(canBuild)f|=NAV_FLAG.buildable;if(water)f|=NAV_FLAG.water;if(cliff)f|=NAV_FLAG.cliff;if(road)f|=NAV_FLAG.road;if(bridge)f|=NAV_FLAG.bridge;if(forest)f|=NAV_FLAG.forest;if(rough)f|=NAV_FLAG.rough;
      let mask=RTS_MOVEMENT_CLASSES.air.bit;
      for(const key of MOVEMENT_ORDER){
        const p=RTS_MOVEMENT_CLASSES[key];let ok=false,cost=null;
        if(key==='air'){ok=true;cost=p.airCost;}
        else if(key==='amphibious'&&water){ok=true;cost=p.waterCost;}
        else if(bridge){ok=true;cost=key==='wheeled'?.62:key==='tracked'?.76:key==='infantry'?.88:.86;}
        else if(!water&&!cliff&&slopeDeg<=p.maxSlopeDeg){
          ok=true;const slopeRatio=slopeDeg/Math.max(1,p.maxSlopeDeg),base=road?p.roadCost:(rough?p.roughCost:p.groundCost);cost=base+slopeRatio*slopeRatio*(key==='wheeled'?1.15:key==='tracked'?.82:key==='infantry'?.50:.72)+forest*p.forestPenalty;
        }
        if(ok)mask|=p.bit;costs[key].push(toCost10(cost));
      }
      heights.push(+h.toFixed(2));slopes.push(+slopeDeg.toFixed(1));terrainFlags.push(f);movementMask.push(mask);
      if(canBuild)buildable++;if(water)waterCells++;if(road)roadCells++;if(bridge)bridgeCells++;
    }
    const pointIndex=(pt)=>{const ix=clamp(Math.floor((pt.x+H)/cell),0,N-1),iy=clamp(Math.floor((pt.y+H)/cell),0,N-1);return iy*N+ix;};
    const connectivity={};
    for(const key of MOVEMENT_ORDER){
      const bit=RTS_MOVEMENT_CLASSES[key].bit,startIndex=pointIndex(layout.starts[0]),seen=new Uint8Array(N*N),queue=[];
      if(movementMask[startIndex]&bit){seen[startIndex]=1;queue.push(startIndex);}
      for(let qi=0;qi<queue.length;qi++){
        const cur=queue[qi],cx=cur%N,cy=Math.floor(cur/N);
        for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){if(!ox&&!oy)continue;const nx=cx+ox,ny=cy+oy;if(nx<0||ny<0||nx>=N||ny>=N)continue;const nk=ny*N+nx;if(seen[nk]||!(movementMask[nk]&bit))continue;if(ox&&oy){const sideA=cy*N+nx,sideB=ny*N+cx;if(!(movementMask[sideA]&bit)||!(movementMask[sideB]&bit))continue;}seen[nk]=1;queue.push(nk);}
      }
      const enemy=layout.starts.slice(1),reachableStarts=enemy.filter(pt=>seen[pointIndex(pt)]).length,reachableExpansions=layout.expansions.filter(pt=>seen[pointIndex(pt)]).length,traversable=movementMask.reduce((n,m)=>n+((m&bit)?1:0),0);
      connectivity[key]={traversablePercent:+(traversable/(N*N)*100).toFixed(1),reachableStarts,enemyStarts:enemy.length,reachableStartPercent:enemy.length?+(reachableStarts/enemy.length*100).toFixed(1):100,reachableExpansions,totalExpansions:layout.expansions.length,reachableExpansionPercent:layout.expansions.length?+(reachableExpansions/layout.expansions.length*100).toFixed(1):100};
    }
    return {resolution:N,cellSize:+cell.toFixed(2),heights,slopeDegrees:slopes,terrainFlags,terrainFlagLegend:NAV_FLAG,movementMask,movementBitLegend:Object.fromEntries(MOVEMENT_ORDER.map(k=>[k,RTS_MOVEMENT_CLASSES[k].bit])),costScale:10,costs,profiles,
      stats:{buildablePercent:+(buildable/(N*N)*100).toFixed(1),waterPercent:+(waterCells/(N*N)*100).toFixed(1),roadPercent:+(roadCells/(N*N)*100).toFixed(1),bridgePercent:+(bridgeCells/(N*N)*100).toFixed(1),movement:connectivity}};
  }

  _score(recipe,layout,navigation){
    const routes=recipe.roads?5:3,passes=recipe.tacticalProfile==='mountainPasses'?5:4,hidden=layout.expansions.filter(e=>e.kind==='hiddenPocket').length,m=navigation.stats.movement;
    const groundConnectivity=(m.tracked.reachableStartPercent+m.wheeled.reachableStartPercent+m.infantry.reachableStartPercent)/3;
    return {
      routeDiversity:clamp(72+routes*4+(recipe.relief>.55?5:0),0,100),
      defensibleRegions:clamp(70+hidden*3+(recipe.startProtection==='fortified'?8:0),0,100),
      expansionOptions:clamp(68+layout.expansions.length*3,0,100),
      spawnSeparation:recipe.players===4?94:96,
      buildableLand:Math.round(clamp(navigation.stats.buildablePercent*1.55,0,100)),
      movementConnectivity:+groundConnectivity.toFixed(1),
      passes,hiddenPockets:hidden
    };
  }

  generate(input={}){
    const recipe=normalizeRTSMapRecipe(input);this.recipe=recipe;this.disposeGenerated();
    const random=makeRng(recipe.seed),layout=this._layout(recipe),shape=this._makeTerrainFunction(recipe,layout);this.heightAt=shape.heightAt;this.riverFn=shape.river;
    const shadowSpan=recipe.size*.62;this.mapKey.shadow.camera.left=-shadowSpan;this.mapKey.shadow.camera.right=shadowSpan;this.mapKey.shadow.camera.top=shadowSpan;this.mapKey.shadow.camera.bottom=-shadowSpan;this.mapKey.shadow.camera.updateProjectionMatrix();
    const size=recipe.size,H=size/2,chunkSize=256,chunks=Math.ceil(size/chunkSize),seg=24,actualChunk=size/chunks;
    let tris=0;
    for(let cy=0;cy<chunks;cy++)for(let cx=0;cx<chunks;cx++){
      const p=[],colors=[],idx=[];
      for(let j=0;j<=seg;j++)for(let i=0;i<=seg;i++){
        const x=-H+cx*actualChunk+i/seg*actualChunk,y=-H+cy*actualChunk+j/seg*actualChunk,z=this.heightAt(x,y),sample=Math.max(1.5,actualChunk/seg*.22),gx=(this.heightAt(x+sample,y)-this.heightAt(x-sample,y))/(sample*2),gy=(this.heightAt(x,y+sample)-this.heightAt(x,y-sample))/(sample*2),slopeDeg=Math.atan(Math.hypot(gx,gy))*180/Math.PI,riverProximity=recipe.river?clamp(1-Math.abs(y-shape.river(x))/(size*.055),0,1):0,zone=this._terrainContext(recipe,layout,x,y,z,slopeDeg,riverProximity),c=this._terrainColor(recipe,z,random,slopeDeg,riverProximity,zone);p.push(x,y,z);colors.push(c.r,c.g,c.b);
      }
      for(let j=0;j<seg;j++)for(let i=0;i<seg;i++){const a=j*(seg+1)+i,b=a+1,c=a+seg+1,d=c+1;idx.push(a,b,c,b,d,c);tris+=2;}
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setIndex(idx);geo.computeVertexNormals();
      const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.96,metalness:0,dithering:true}));mesh.name=`TerrainChunk_${cx}_${cy}`;mesh.receiveShadow=true;this.root.add(mesh);
    }
    const biome=BIOMES[recipe.biome],routes=[];
    if(recipe.river){
      const water=this._makeRiverStrip(shape.river,size*.032,Math.max(180,Math.round(size/3.2)),biome.water);water.name='River';this.root.add(water);
      [-size*.24,size*.015,size*.25].forEach((bx,i)=>this._addBridge(bx,shape.river,i));
    }
    if(recipe.roads){
      const roadCurves=shape.roadCurves||this._roadCurves(size);
      roadCurves.forEach((road,i)=>{const segments=Math.max(220,Math.round(size/2.7)),profileWidth=road.width*1.38,shoulder=this._makeRoadStrip(road.fn,profileWidth,segments,biome.roadShoulder,.10,profileWidth);shoulder.name=`RoadShoulder_${i+1}`;shoulder.renderOrder=1;this.root.add(shoulder);const r=this._makeRoadStrip(road.fn,road.width,segments,biome.road,.18,profileWidth);r.name=`Road_${i+1}`;r.renderOrder=3;this.root.add(r);this.roadFns.push(Object.assign(road.fn,{width:road.width}));routes.push({id:road.id,role:road.role,preferred:road.preferred});});
    }
    // Instanced upright trees / scrub. Three.js cylinder/cone primitives are Y-up, so rotate geometry once into WorldForge Z-up.
    const areaScale=(size/1024)*(size/1024);
    const treeCount=Math.min(1850,Math.round(areaScale*(250+recipe.forest*350)));
    const trunkGeo=new THREE.CylinderGeometry(size*.00055,size*.00078,size*.0046,6),crownGeo=new THREE.ConeGeometry(size*.0032,size*.0090,7),trunkMat=mat(biome.trunk,1),crownMat=mat(biome.tree,1);
    trunkGeo.rotateX(Math.PI/2);crownGeo.rotateX(Math.PI/2);
    const trunks=new THREE.InstancedMesh(trunkGeo,trunkMat,treeCount),crowns=new THREE.InstancedMesh(crownGeo,crownMat,treeCount);trunks.castShadow=crowns.castShadow=true;const dummy=new THREE.Object3D();let t=0,attempts=0;
    while(t<treeCount&&attempts++<treeCount*25){
      const x=(random()-.5)*size*.96,y=(random()-.5)*size*.96;if(recipe.river&&Math.abs(y-shape.river(x))<size*.035)continue;
      if(layout.starts.some(s=>Math.hypot(x-s.x,y-s.y)<size*.110))continue;
      if(layout.expansions.some(e=>Math.hypot(x-e.x,y-e.y)<size*(e.kind==='safeExpansion'?.055:.034)))continue;
      if(this.roadFns.some(fn=>Math.abs(y-fn(x))<(fn.width||size*.012)*1.45))continue;
      const z=this.heightAt(x,y),sample=Math.max(1.6,size*.0022),gx=(this.heightAt(x+sample,y)-this.heightAt(x-sample,y))/(sample*2),gy=(this.heightAt(x,y+sample)-this.heightAt(x,y-sample))/(sample*2),slopeDeg=Math.atan(Math.hypot(gx,gy))*180/Math.PI,riverProximity=recipe.river?clamp(1-Math.abs(y-shape.river(x))/(size*.085),0,1):0,zone=this._terrainContext(recipe,layout,x,y,z,slopeDeg,riverProximity),treeChance=clamp(.12+recipe.forest*(.28+riverProximity*.44+(1-zone.dry)*.28-zone.rocky*.46-zone.baseClear*.24),.05,.94);
      if(random()>treeChance)continue;
      const scale=.62+random()*.78*(1-zone.rocky*.22),yaw=random()*Math.PI*2;dummy.position.set(x,y,z+size*.0023*scale);dummy.scale.set(scale,scale,scale);dummy.rotation.set(0,0,yaw);dummy.updateMatrix();trunks.setMatrixAt(t,dummy.matrix);dummy.position.z=z+size*.0067*scale;dummy.updateMatrix();crowns.setMatrixAt(t,dummy.matrix);this.treePoints.push([x,y]);t++;
    }
    trunks.count=crowns.count=t;trunks.name='ForestTrunks';crowns.name='ForestCanopies';this.root.add(trunks,crowns);
    // Rocks / tactical cover clusters.
    const rockCount=Math.min(420,Math.round(areaScale*(65+recipe.relief*90))),rocks=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(size*.0024,0),mat(biome.rock,1),rockCount);rocks.castShadow=true;
    let rPlaced=0,rAttempts=0;while(rPlaced<rockCount&&rAttempts++<rockCount*22){const x=(random()-.5)*size*.94,y=(random()-.5)*size*.94;if(layout.starts.some(s=>Math.hypot(x-s.x,y-s.y)<size*.095))continue;if(layout.expansions.some(e=>Math.hypot(x-e.x,y-e.y)<size*(e.kind==='safeExpansion'?.042:.026)))continue;if(this.roadFns.some(fn=>Math.abs(y-fn(x))<(fn.width||size*.012)*1.08))continue;const z=this.heightAt(x,y),sample=Math.max(1.6,size*.0024),gx=(this.heightAt(x+sample,y)-this.heightAt(x-sample,y))/(sample*2),gy=(this.heightAt(x,y+sample)-this.heightAt(x,y-sample))/(sample*2),slopeDeg=Math.atan(Math.hypot(gx,gy))*180/Math.PI,riverProximity=recipe.river?clamp(1-Math.abs(y-shape.river(x))/(size*.085),0,1):0,zone=this._terrainContext(recipe,layout,x,y,z,slopeDeg,riverProximity),rockChance=clamp(.10+zone.rocky*.78+zone.upland*.18-riverProximity*.14-zone.baseClear*.26,.06,.96);if(random()>rockChance)continue;const scale=.52+random()*1.15+zone.rocky*.68;dummy.position.set(x,y,z+size*.0012*scale);dummy.scale.set(scale,scale,scale*(.45+random()*.45));dummy.rotation.set(random(),random(),random()*6.28);dummy.updateMatrix();rocks.setMatrixAt(rPlaced++,dummy.matrix);}rocks.count=rPlaced;rocks.name='RockCover';this.root.add(rocks);
    // Exact approved Rich/Dense masters now form multi-cluster resource fields.
    // Each field remains one logical economy deposit; the repeated crystals are visual instances only.
    const resourceCount=recipe.players===4?(size>=1536?13:size>=1024?9:7):(size>=1536?9:size>=1024?6:5),resourceZones=[];
    for(let i=0;i<resourceCount;i++){
      const a=(i/resourceCount)*Math.PI*2+.35,radius=size*(i%3===0?.16:i%3===1?.26:.34),x=Math.cos(a)*radius,y=Math.sin(a)*radius,denseShare=clamp(.08+recipe.resources*.35,.15,.43),densityRank=((i*5)%resourceCount)/resourceCount,richness=densityRank<denseShare?'dense':'rich',tier=richness==='dense'?'contested':'standard',resourceDef=masterResourceForRichness(richness),id=`RESOURCE_${String(i+1).padStart(2,'0')}`,zoneRadius=size*.025,qz=this.heightAt(x,y),capacity=resourceDef.defaultCapacity,clusterCount=richness==='dense'?5+Math.floor(random()*4):3+Math.floor(random()*3),spread=richness==='dense'?size*.0115:size*.0085,visualClusters=[];
      for(let j=0;j<clusterCount;j++){
        const center=j===0,ang=center?0:(j*2.3999632297+random()*.72),rad=center?0:spread*(.32+Math.sqrt(random())*.68),px=x+Math.cos(ang)*rad,py=y+Math.sin(ang)*rad,pz=this.heightAt(px,py),scale=richness==='dense'?.88+random()*.23:.82+random()*.25;
        visualClusters.push({id:`${id}_CLUSTER_${String(j+1).padStart(2,'0')}`,assetId:resourceDef.id,richness,x:+px.toFixed(2),y:+py.toFixed(2),z:+pz.toFixed(2),heading:+(random()*Math.PI*2).toFixed(4),scale:+scale.toFixed(3),visualOnly:true});
      }
      const deposit={id:`${id}_FIELD`,assetId:resourceDef.id,richness,x:+x.toFixed(2),y:+y.toFixed(2),z:+qz.toFixed(2),capacity};
      resourceZones.push({id,x:+x.toFixed(2),y:+y.toFixed(2),z:+qz.toFixed(2),radius:+zoneRadius.toFixed(2),tier,richness,assetId:resourceDef.id,capacity,depositCount:1,visualClusterCount:visualClusters.length,deposits:[deposit],visualClusters});
    }
    layout.starts.forEach((s,i)=>this._startMarker(s,i));layout.expansions.forEach(e=>this._zoneMarker(e,e.kind==='hiddenPocket'?0x76a9d8:0x93d49a));
    const navigation=this._navigationMetadata(recipe,shape.river,layout),score=this._score(recipe,layout,navigation),crossings=this.bridgeData.map(({_frame,...b})=>b);
    this.metadata={schema:'worldforge.rts-map-meta.v2',mapForgeVersion:RTS_MAP_FORGE_VERSION,recipe,terrain:{chunkSize:+actualChunk.toFixed(2),chunkCount:chunks*chunks,segmentsPerChunk:seg,approxTriangles:tris},startRegions:layout.starts.map((s,i)=>({...s,index:i,radius:+(size*.085).toFixed(2),clearRadius:+(size*.105).toFixed(2),reservedOnly:true})),expansionZones:layout.expansions.map(e=>({...e,x:+e.x.toFixed(2),y:+e.y.toFixed(2),radius:+(size*.035).toFixed(2)})),resourceZones,routes,crossings,navigation,tacticalScore:score,
      routeAffinities:{mainRoad:['wheeled','tracked','infantry'],roughPass:['tracked','infantry'],steepTrail:['infantry'],deepWater:['amphibious','air'],mountain:['air'],bridge:['tracked','wheeled','infantry','amphibious']},
      notes:['No faction buildings are generated. Start regions are reserved terrain metadata only.','Resource fields now render 3–5 approved Rich clusters or 5–8 approved Dense clusters while remaining one logical economy deposit per field; repeated visuals are GPU-instanced and the source GLBs remain unchanged.','1536 m is the intended main-world scale; enlarged start reserves provide roughly 260 m of usable base diameter before the mountain ring.','Terrain coloration now blends elevation, slope, river moisture, and reserved-base clearing influence for more believable battlefield zones.','Road corridors use a smoothed flat cross-section profile so the dark road core stays above the terrain instead of exposing brown shoulder/ground patches on elevation changes.','Trees and rock cover are excluded from start-development zones, safe expansions, and road setbacks so construction and vehicle lanes stay readable.','Movement metadata is exported per class: tracked, wheeled, infantry, amphibious and air.','River water now uses a smoothed center-channel surface rather than edge-sampled terrain heights, preventing isolated missing-water gaps; bridges share the same water-surface calculation.' , 'Bridges are explicit traversal links with raised decks and graded approach meshes.']};
    const generationId=this.generationSerial;this.resourceLoadPromise=this._populateResourceAssets(resourceZones,generationId);
    this._buildFog();this.setFogPreview(false);this._buildMovementOverlay();this.root.visible=true;this.overlay.visible=true;this.movementOverlay.visible=this.movementPreview!=='off';return this.metadata;
  }

  _buildMovementOverlay(){
    while(this.movementOverlay.children.length){const c=this.movementOverlay.children[this.movementOverlay.children.length-1];this.movementOverlay.remove(c);disposeGroup(c);}
    if(!this.metadata||this.movementPreview==='off'){this.movementOverlay.visible=false;return;}
    const nav=this.metadata.navigation,key=this.movementPreview,bit=nav.movementBitLegend[key];if(!bit){this.movementOverlay.visible=false;return;}
    const N=nav.resolution,size=this.recipe.size,H=size/2,cell=size/N,p=[],colors=[],idx=[];
    const costs=nav.costs[key];let v=0;
    for(let j=0;j<N;j++)for(let i=0;i<N;i++){
      const k=j*N+i,x0=-H+i*cell,y0=-H+j*cell,x1=x0+cell,y1=y0+cell,ok=!!(nav.movementMask[k]&bit),raw=costs[k]||0,cost=raw/nav.costScale;
      const color=!ok?new THREE.Color(0xb3463f):key==='air'?new THREE.Color(0x5f9fcb):cost<=.9?new THREE.Color(0x4ca76b):cost<=1.5?new THREE.Color(0xc3a84c):new THREE.Color(0xd77942),lift=.72;
      p.push(x0,y0,this.heightAt(x0,y0)+lift,x1,y0,this.heightAt(x1,y0)+lift,x1,y1,this.heightAt(x1,y1)+lift,x0,y1,this.heightAt(x0,y1)+lift);for(let q=0;q<4;q++)colors.push(color.r,color.g,color.b);idx.push(v,v+1,v+2,v,v+2,v+3);v+=4;
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(idx);
    const mesh=new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.34,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));mesh.name=`MovementPreview_${key}`;mesh.renderOrder=55;this.movementOverlay.add(mesh);this.movementOverlay.visible=this.root.visible;
  }

  setMovementPreview(kind='off'){
    this.movementPreview=MOVEMENT_ORDER.includes(kind)?kind:'off';this._buildMovementOverlay();
  }

  movementAt(x,y,kind='tracked'){
    const nav=this.metadata?.navigation;if(!nav||!this.recipe)return {allowed:false,cost:Infinity,index:-1};
    const size=this.recipe.size,H=size/2,N=nav.resolution,cell=size/N;
    const ix=Math.floor((x+H)/cell),iy=Math.floor((y+H)/cell);
    if(ix<0||iy<0||ix>=N||iy>=N)return {allowed:false,cost:Infinity,index:-1};
    const index=iy*N+ix,bit=nav.movementBitLegend?.[kind]||0,raw=nav.costs?.[kind]?.[index]||0;
    return {allowed:!!(nav.movementMask[index]&bit),cost:raw?raw/nav.costScale:Infinity,index,ix,iy,flags:nav.terrainFlags[index],slopeDeg:nav.slopeDegrees[index],height:nav.heights[index]};
  }

  buildableAt(x,y){
    const nav=this.metadata?.navigation;if(!nav)return false;const cell=this.movementAt(x,y,'tracked');if(cell.index<0)return false;
    return !!(cell.flags&(nav.terrainFlagLegend?.buildable||1));
  }

  surfaceHeightAt(x,y){
    const bridge=this._bridgeAt(x,y);if(!bridge)return this.heightAt(x,y);
    const f=bridge._frame,dx=x-f.x,dy=y-f.y,c=Math.cos(f.angle),ss=Math.sin(f.angle),lx=dx*c+dy*ss;
    const deckHalf=f.deckLength*.5,deckTop=f.deckZ+f.deckThickness;
    if(Math.abs(lx)<=deckHalf)return deckTop;
    const side=lx>=0?1:-1,outer=side>0?f.outerA:f.outerB,t=clamp((Math.abs(lx)-deckHalf)/Math.max(.001,f.approachLength),0,1);
    return THREE.MathUtils.lerp(deckTop,outer.z,t);
  }

  _buildFog(){
    const N=64,size=this.recipe.size,H=size/2;this.fogCanvas=document.createElement('canvas');this.fogCanvas.width=this.fogCanvas.height=N;this.fogCtx=this.fogCanvas.getContext('2d');this.fogTexture=new THREE.CanvasTexture(this.fogCanvas);this.fogTexture.magFilter=THREE.LinearFilter;this.fogTexture.minFilter=THREE.LinearFilter;
    const p=[],uv=[],idx=[];for(let j=0;j<=N;j++)for(let i=0;i<=N;i++){const x=-H+size*i/N,y=-H+size*j/N;p.push(x,y,this.heightAt(x,y)+1.0);uv.push(i/N,j/N);}for(let j=0;j<N;j++)for(let i=0;i<N;i++){const a=j*(N+1)+i,b=a+1,c=a+N+1,d=c+1;idx.push(a,b,c,b,d,c);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);
    const material=new THREE.MeshBasicMaterial({map:this.fogTexture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});this.fogMesh=new THREE.Mesh(geo,material);this.fogMesh.name='FogPreview';this.fogMesh.renderOrder=60;this.root.add(this.fogMesh);this._paintFog();
  }

  _paintFog(){
    if(!this.fogCtx||!this.metadata)return;const N=this.fogCanvas.width,size=this.recipe.size,H=size/2,start=this.metadata.startRegions[0],vision=size*.115,img=this.fogCtx.createImageData(N,N);
    for(let iy=0;iy<N;iy++)for(let ix=0;ix<N;ix++){const x=-H+(ix+.5)*size/N,y=-H+(iy+.5)*size/N,d=Math.hypot(x-start.x,y-start.y),a=d<vision?0:d<vision*1.35?115:242,row=N-1-iy,o=(row*N+ix)*4;img.data[o]=3;img.data[o+1]=9;img.data[o+2]=10;img.data[o+3]=a;}
    this.fogCtx.putImageData(img,0,0);this.fogTexture.needsUpdate=true;
  }

  setFogPreview(active){this.fogPreview=!!active;if(this.fogMesh)this.fogMesh.visible=this.root.visible&&this.fogPreview;}

  setView(kind='overview',aspect=1.4){
    if(!this.recipe)return;const size=this.recipe.size,start=this.metadata?.startRegions?.[0]||{x:0,y:0};this.camera.up.set(0,0,1);
    if(kind==='top'){
      const span=size*.54;this.camera.left=-span*aspect;this.camera.right=span*aspect;this.camera.top=span;this.camera.bottom=-span;this.camera.position.set(0,-.01,size*.9);this.camera.up.set(0,1,0);this.controls.target.set(0,0,0);
    }else if(kind==='start'){
      const span=size*.13;this.camera.left=-span*aspect;this.camera.right=span*aspect;this.camera.top=span;this.camera.bottom=-span;this.camera.position.set(start.x+size*.15,start.y-size*.18,size*.14);this.controls.target.set(start.x,start.y,6);
    }else if(kind==='tactical'){
      const span=size*.18;this.camera.left=-span*aspect;this.camera.right=span*aspect;this.camera.top=span;this.camera.bottom=-span;this.camera.position.set(start.x+size*.19,start.y-size*.23,size*.18);this.controls.target.set(start.x+size*.09,start.y+size*.07,5);
    }else{
      const span=size*.46;this.camera.left=-span*aspect;this.camera.right=span*aspect;this.camera.top=span;this.camera.bottom=-span;this.camera.position.set(size*.42,-size*.50,size*.42);this.controls.target.set(0,0,4);
    }
    this.camera.near=.1;this.camera.far=Math.max(1800,size*3);this.camera.updateProjectionMatrix();this.camera.lookAt(this.controls.target);this.controls.update();
  }

  drawMinimap(canvas){
    if(!canvas||!this.recipe||!this.metadata)return;const rect=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2),w=Math.max(110,Math.round((rect.width||150)*dpr));if(canvas.width!==w){canvas.width=w;canvas.height=w;}const ctx=canvas.getContext('2d'),size=this.recipe.size,H=size/2,s=w/size,b=BIOMES[this.recipe.biome];ctx.clearRect(0,0,w,w);ctx.fillStyle='#62755d';ctx.fillRect(0,0,w,w);
    if(this.recipe.river){ctx.strokeStyle='#4f8fa2';ctx.lineWidth=Math.max(2,dpr);ctx.beginPath();for(let i=0;i<100;i++){const x=-H+size*i/99,y=this.riverFn(x),px=(x+H)*s,py=w-(y+H)*s;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.stroke();}
    for(const z of this.metadata.resourceZones){const dense=z.richness==='dense';ctx.fillStyle=dense?'#f1c85a':'#b9983f';ctx.beginPath();ctx.arc((z.x+H)*s,w-(z.y+H)*s,(dense?4.5:3.5)*dpr,0,Math.PI*2);ctx.fill();}
    for(const st of this.metadata.startRegions){ctx.fillStyle=st.index===0?'#63dd89':'#a9b7ab';ctx.beginPath();ctx.arc((st.x+H)*s,w-(st.y+H)*s,5*dpr,0,Math.PI*2);ctx.fill();}
    if(this.fogPreview){const start=this.metadata.startRegions[0],vision=size*.115;ctx.fillStyle='rgba(0,0,0,.78)';ctx.fillRect(0,0,w,w);ctx.save();ctx.globalCompositeOperation='destination-out';ctx.beginPath();ctx.arc((start.x+H)*s,w-(start.y+H)*s,vision*s,0,Math.PI*2);ctx.fill();ctx.restore();}
    const cx=this.controls.target.x,cy=this.controls.target.y,viewW=(this.camera.right-this.camera.left)*s,viewH=(this.camera.top-this.camera.bottom)*s;ctx.strokeStyle='rgba(255,255,255,.92)';ctx.lineWidth=Math.max(1.2,dpr);ctx.strokeRect((cx+H)*s-viewW/2,w-(cy+H)*s-viewH/2,viewW,viewH);
  }

  jumpFromMinimap(nx,ny){if(!this.recipe)return;const size=this.recipe.size,H=size/2,offset=this.camera.position.clone().sub(this.controls.target);this.controls.target.x=clamp(nx,0,1)*size-H;this.controls.target.y=(1-clamp(ny,0,1))*size-H;if(offset.lengthSq()<1)offset.set(size*.15,-size*.18,size*.14);this.camera.position.copy(this.controls.target).add(offset);this.camera.lookAt(this.controls.target);this.controls.update();}

  exportRecipe(){return JSON.parse(JSON.stringify(this.recipe));}
  exportMetadata(){return JSON.parse(JSON.stringify(this.metadata));}
}
