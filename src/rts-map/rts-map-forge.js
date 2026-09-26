import * as THREE from 'three';

export const RTS_MAP_FORGE_VERSION='0.1.0';
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
  temperate:{low:0x6d805f,mid:0x748462,high:0x7d8266,tree:0x315a39,trunk:0x584735,rock:0x76766d,road:0x585953,water:0x4d8394,resource:0xd0b44a},
  drylands:{low:0x8b7c59,mid:0x9b895f,high:0xa29167,tree:0x5e6d3d,trunk:0x65513a,rock:0x81745f,road:0x6b6254,water:0x538697,resource:0xd4b04d},
  alpine:{low:0x667760,mid:0x6f7965,high:0x8b8d80,tree:0x2e4e39,trunk:0x534638,rock:0x777a77,road:0x555854,water:0x4f8192,resource:0xcbb04c}
};

export function normalizeRTSMapRecipe(input={}){
  const size=[512,768,1024,1536].includes(Number(input.size))?Number(input.size):1024;
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
    relief:clamp(Number(input.relief)||0.72,0,1),
    forest:clamp(Number(input.forest)||0.55,0,1),
    resources:clamp(Number(input.resources)||0.62,0,1),
    river:input.river!==false,
    roads:input.roads!==false,
    startProtection:['open','balanced','fortified'].includes(input.startProtection)?input.startProtection:'balanced'
  };
}

export class RTSMapForge{
  constructor({scene,camera,renderer,controls}){
    this.scene=scene;this.camera=camera;this.renderer=renderer;this.controls=controls;
    this.root=new THREE.Group();this.root.name='WorldForgeRTSMap';this.root.visible=false;scene.add(this.root);
    this.overlay=new THREE.Group();this.overlay.name='WorldForgeRTSMapOverlay';this.overlay.visible=false;scene.add(this.overlay);
    this.lightRig=new THREE.Group();this.lightRig.visible=false;
    const hemi=new THREE.HemisphereLight(0xf2f8ff,0x68735d,1.55);
    const key=new THREE.DirectionalLight(0xffefd2,1.35);key.position.set(-180,-230,330);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.near=10;key.shadow.camera.far=2800;this.mapKey=key;
    this.lightRig.add(hemi,key);scene.add(this.lightRig);
    this.recipe=null;this.metadata=null;this.heightAt=()=>0;this.fogPreview=false;this.fogTexture=null;this.fogMesh=null;this.fogCanvas=null;this.fogCtx=null;
  }

  setActive(active){
    this.root.visible=!!active;this.overlay.visible=!!active;this.lightRig.visible=!!active;
    if(this.fogMesh)this.fogMesh.visible=!!active&&this.fogPreview;
  }

  disposeGenerated(){
    for(const group of [this.root,this.overlay]){while(group.children.length){const c=group.children[group.children.length-1];group.remove(c);disposeGroup(c);}}
    this.fogTexture?.dispose?.();this.fogTexture=null;this.fogMesh=null;this.fogCanvas=null;this.fogCtx=null;
  }

  _layout(recipe){
    const size=recipe.size,H=size/2;
    const corners=recipe.players===2?
      [{id:'START_01',x:-H*.80,y:-H*.80,angle:Math.PI/4,owner:'player'},{id:'START_02',x:H*.80,y:H*.80,angle:-3*Math.PI/4,owner:'opponent'}]:
      [
        {id:'START_01',x:-H*.80,y:-H*.80,angle:Math.PI/4,owner:'player'},
        {id:'START_02',x:-H*.80,y:H*.80,angle:-Math.PI/4,owner:'opponent'},
        {id:'START_03',x:H*.80,y:H*.80,angle:-3*Math.PI/4,owner:'opponent'},
        {id:'START_04',x:H*.80,y:-H*.80,angle:3*Math.PI/4,owner:'opponent'}
      ];
    const ex=[];
    for(const s of corners){
      const toward=new THREE.Vector2(-s.x,-s.y).normalize();const side=new THREE.Vector2(-toward.y,toward.x);
      ex.push({id:`${s.id}_EXP_A`,x:s.x+toward.x*size*.22+side.x*size*.08,y:s.y+toward.y*size*.22+side.y*size*.08,kind:'safeExpansion'});
      ex.push({id:`${s.id}_EXP_B`,x:s.x+toward.x*size*.30-side.x*size*.13,y:s.y+toward.y*size*.30-side.y*size*.13,kind:'hiddenPocket'});
    }
    return {starts:corners,expansions:ex};
  }

  _makeTerrainFunction(recipe,layout){
    const size=recipe.size,H=size/2,relief=recipe.relief;
    const amp=12+relief*18;
    const river=x=>size*.015+size*.07*Math.sin((x+size*.07)/(size*.19))+size*.018*Math.sin(x/(size*.07));
    const ridgeWidth=size*(recipe.tacticalProfile==='mountainPasses'?.045:.06);
    const startRingHeight=(recipe.startProtection==='fortified'?1.28:recipe.startProtection==='open'?.58:1)*amp;
    const startRingRadius=size*.105;
    const startRingWidth=size*.026;
    const hiddenBowlRadius=size*.065;
    const passXs=[-size*.20,size*.08,size*.31];
    const gauss=(v,w)=>Math.exp(-(v*v)/(w*w));
    const angleDiff=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
    const fn=(x,y)=>{
      let h=(Math.sin(x*0.014*(1024/size))*2.2+Math.cos(y*0.016*(1024/size))*1.8+Math.sin((x+y)*0.024*(1024/size))*.9)*(0.65+relief*.6);
      h+=Math.sin(Math.hypot(x+size*.10,y-size*.03)*0.018*(1024/size))*4.5*relief;
      // Major diagonal ridge with intentionally carved passes.
      const ridgeLine=y-(.46*x+size*.035);
      let passMask=1;for(const px of passXs)passMask*=1-gauss(x-px,size*.05);
      h+=gauss(ridgeLine,ridgeWidth)*amp*.62*passMask;
      // Opposing secondary ridge / high ground.
      h+=gauss(y+0.32*x+size*.12,size*.08)*amp*.28;
      // Long low valley and ravine for concealed movement.
      h-=gauss(x+size*.055+.20*y,size*.028)*amp*.34;
      h-=gauss(y-size*.18*Math.sin(x/(size*.19))-size*.11,size*.045)*amp*.22;
      // Start-region mountain bowls. Main opening points toward map center; small rear/flank cut avoids single-route traps.
      for(const s of layout.starts){
        const dx=x-s.x,dy=y-s.y,d=Math.hypot(dx,dy),a=Math.atan2(dy,dx);
        const mainGate=1-smooth(angleDiff(a,s.angle)/(Math.PI*.19));
        const flankGate=1-smooth(angleDiff(a,s.angle+(s.x*s.y>0?.75:-.75))/(Math.PI*.11));
        const gate=Math.max(mainGate,flankGate*.62);
        h+=gauss(d-startRingRadius,startRingWidth)*startRingHeight*(1-gate);
        if(d<size*.062){const k=smooth((size*.062-d)/(size*.026));h=h*(1-k)+4.5*k;}
      }
      // Hidden expansion bowls get ridges with narrow access.
      for(const e of layout.expansions.filter(e=>e.kind==='hiddenPocket')){
        const dx=x-e.x,dy=y-e.y,d=Math.hypot(dx,dy),a=Math.atan2(dy,dx),toCenter=Math.atan2(-e.y,-e.x);
        const gate=1-smooth(angleDiff(a,toCenter)/(Math.PI*.13));
        h+=gauss(d-hiddenBowlRadius,size*.018)*amp*.40*(1-gate);
        h-=gauss(d,size*.042)*amp*.10;
      }
      // River depression through center.
      if(recipe.river){const ry=river(x),rd=Math.abs(y-ry);h-=gauss(rd,size*.020)*amp*.32;}
      // Plateau / artillery high-ground pockets.
      h+=gauss(Math.hypot(x-size*.12,y-size*.24),size*.12)*amp*.24;
      h+=gauss(Math.hypot(x+size*.26,y+size*.02),size*.11)*amp*.22;
      return h;
    };
    return {heightAt:fn,river};
  }

  _terrainColor(recipe,z,random){
    const b=BIOMES[recipe.biome];let c;
    if(z>18+recipe.relief*12)c=new THREE.Color(b.high);else if(z>7)c=new THREE.Color(b.mid);else c=new THREE.Color(b.low);
    c.offsetHSL((random()-.5)*.008,(random()-.5)*.025,(random()-.5)*.045);return c;
  }

  _makeStrip(pathFn,width,segments,color,zLift=.24){
    const size=this.recipe.size,H=size/2,p=[],idx=[];
    for(let i=0;i<=segments;i++){
      const x=-H+size*i/segments,y=pathFn(x),e=size/1024*1.2,dy=pathFn(x+e)-pathFn(x-e),nx=-dy,ny=2*e,n=Math.hypot(nx,ny)||1;
      for(const s of [-1,1]){const xx=x+nx/n*width*.5*s,yy=y+ny/n*width*.5*s;p.push(xx,yy,this.heightAt(xx,yy)+zLift);}
    }
    for(let i=0;i<segments;i++){const a=i*2,b=a+1,c=a+2,d=c+1;idx.push(a,c,b,b,c,d);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();
    const m=new THREE.Mesh(g,mat(color,.96));m.receiveShadow=true;return m;
  }

  _addBridge(x,riverFn){
    const size=this.recipe.size,y=riverFn(x),z=this.heightAt(x,y)+size*.0022,w=size*.042,d=size*.022;
    const g=new THREE.Group();g.name=`Bridge_${Math.round(x)}`;g.position.set(x,y,z);g.rotation.z=Math.atan2(riverFn(x+2)-riverFn(x-2),4)+Math.PI/2;
    box(g,0,0,0,w,d,size*.0012,0x77766d,.82);
    for(const sy of [-d*.48,d*.48])box(g,0,sy,size*.001,w,d*.025,size*.0014,0x3e4542,.75);
    this.root.add(g);
  }

  _startMarker(start,index){
    const size=this.recipe.size,z=this.heightAt(start.x,start.y)+.7;
    const g=new THREE.Group();g.name=start.id;
    const radius=size*.055;
    const fill=new THREE.Mesh(new THREE.CircleGeometry(radius,48),new THREE.MeshBasicMaterial({color:index===0?0x55c97a:0x8da18e,transparent:true,opacity:index===0?.22:.10,depthWrite:false}));fill.position.set(start.x,start.y,z);g.add(fill);
    const pts=[];for(let i=0;i<=64;i++){const a=i/64*Math.PI*2;pts.push(new THREE.Vector3(start.x+Math.cos(a)*radius,start.y+Math.sin(a)*radius,z+.2));}
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),lineMaterial(index===0?0x7ff0a0:0xa8b9aa,index===0?.95:.6)));
    this.overlay.add(g);
  }

  _zoneMarker(zone,color=0x8ed7a0){
    const size=this.recipe.size,r=size*.035,z=this.heightAt(zone.x,zone.y)+.55,pts=[];for(let i=0;i<=40;i++){const a=i/40*Math.PI*2;pts.push(new THREE.Vector3(zone.x+Math.cos(a)*r,zone.y+Math.sin(a)*r,z));}
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),lineMaterial(color,.55));line.name=zone.id;this.overlay.add(line);
  }

  _navigationMetadata(recipe,riverFn){
    const N=64,size=recipe.size,H=size/2,cell=size/N,heights=[],flags=[];
    let buildable=0,walkable=0;
    for(let j=0;j<N;j++)for(let i=0;i<N;i++){
      const x=-H+(i+.5)*cell,y=-H+(j+.5)*cell,h=this.heightAt(x,y),e=cell*.35;
      const sx=Math.abs(this.heightAt(x+e,y)-this.heightAt(x-e,y))/(2*e),sy=Math.abs(this.heightAt(x,y+e)-this.heightAt(x,y-e))/(2*e),slope=Math.hypot(sx,sy);
      const water=recipe.river&&Math.abs(y-riverFn(x))<size*.018;
      const cliff=slope>.62,canWalk=!water&&!cliff,canBuild=!water&&slope<.14;
      let f=0;if(canWalk)f|=1;if(canBuild)f|=2;if(water)f|=4;if(cliff)f|=8;
      if(canWalk)walkable++;if(canBuild)buildable++;heights.push(+h.toFixed(2));flags.push(f);
    }
    return {resolution:N,cellSize:+cell.toFixed(2),heights,flags,flagLegend:{walkable:1,buildable:2,water:4,cliff:8},stats:{walkablePercent:+(walkable/(N*N)*100).toFixed(1),buildablePercent:+(buildable/(N*N)*100).toFixed(1)}};
  }

  _score(recipe,layout,navigation){
    const routes=recipe.roads?5:3,passes=recipe.tacticalProfile==='mountainPasses'?5:4,hidden=layout.expansions.filter(e=>e.kind==='hiddenPocket').length;
    return {
      routeDiversity:clamp(72+routes*4+(recipe.relief>.55?5:0),0,100),
      defensibleRegions:clamp(70+hidden*3+(recipe.startProtection==='fortified'?8:0),0,100),
      expansionOptions:clamp(68+layout.expansions.length*3,0,100),
      spawnSeparation:recipe.players===4?94:96,
      buildableLand:Math.round(clamp(navigation.stats.buildablePercent*1.55,0,100)),
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
        const x=-H+cx*actualChunk+i/seg*actualChunk,y=-H+cy*actualChunk+j/seg*actualChunk,z=this.heightAt(x,y),c=this._terrainColor(recipe,z,random);p.push(x,y,z);colors.push(c.r,c.g,c.b);
      }
      for(let j=0;j<seg;j++)for(let i=0;i<seg;i++){const a=j*(seg+1)+i,b=a+1,c=a+seg+1,d=c+1;idx.push(a,b,c,b,d,c);tris+=2;}
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setIndex(idx);geo.computeVertexNormals();
      const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.98,metalness:0}));mesh.name=`TerrainChunk_${cx}_${cy}`;mesh.receiveShadow=true;this.root.add(mesh);
    }
    const biome=BIOMES[recipe.biome];
    if(recipe.river){const water=this._makeStrip(shape.river,size*.032,Math.max(80,Math.round(size/5)),biome.water,-1.05);water.material.transparent=true;water.material.opacity=.90;water.material.roughness=.28;water.name='River';this.root.add(water);for(const bx of [-size*.24,size*.015,size*.25])this._addBridge(bx,shape.river);}
    const routes=[];
    if(recipe.roads){
      const roadFns=[
        x=>-size*.13+.34*x+size*.028*Math.sin((x+size*.1)/(size*.17)),
        x=> size*.14-.30*x+size*.024*Math.sin((x-size*.06)/(size*.16)),
        x=> size*.015+size*.018*Math.sin(x/(size*.15))
      ];
      roadFns.forEach((fn,i)=>{const r=this._makeStrip(fn,size*(i===2?.010:.012),Math.max(90,Math.round(size/5)),biome.road,.28);r.name=`Road_${i+1}`;this.root.add(r);routes.push({id:`ROAD_${i+1}`,role:i===0?'mainRoute':i===1?'flankRoute':'centralConnector'});});
    }
    // Instanced trees / scrub.
    const areaScale=(size/1024)*(size/1024);
    const treeCount=Math.min(1700,Math.round(areaScale*(260+recipe.forest*360)));
    const trunkGeo=new THREE.CylinderGeometry(size*.00055,size*.00078,size*.0046,6),crownGeo=new THREE.ConeGeometry(size*.0032,size*.0090,7),trunkMat=mat(biome.trunk,1),crownMat=mat(biome.tree,1);
    const trunks=new THREE.InstancedMesh(trunkGeo,trunkMat,treeCount),crowns=new THREE.InstancedMesh(crownGeo,crownMat,treeCount);trunks.castShadow=crowns.castShadow=true;const dummy=new THREE.Object3D();let t=0,attempts=0;
    while(t<treeCount&&attempts++<treeCount*25){
      const x=(random()-.5)*size*.96,y=(random()-.5)*size*.96;if(recipe.river&&Math.abs(y-shape.river(x))<size*.035)continue;
      if(layout.starts.some(s=>Math.hypot(x-s.x,y-s.y)<size*.075))continue;
      const z=this.heightAt(x,y),s=.70+random()*.75;dummy.position.set(x,y,z+size*.0023*s);dummy.scale.set(s,s,s);dummy.rotation.set(0,0,random()*Math.PI*2);dummy.updateMatrix();trunks.setMatrixAt(t,dummy.matrix);dummy.position.z=z+size*.0067*s;dummy.updateMatrix();crowns.setMatrixAt(t,dummy.matrix);t++;
    }
    trunks.count=crowns.count=t;trunks.name='ForestTrunks';crowns.name='ForestCanopies';this.root.add(trunks,crowns);
    // Rocks / tactical cover clusters.
    const rockCount=Math.min(420,Math.round(areaScale*(65+recipe.relief*90))),rocks=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(size*.0024,0),mat(biome.rock,1),rockCount);rocks.castShadow=true;
    for(let i=0;i<rockCount;i++){const x=(random()-.5)*size*.94,y=(random()-.5)*size*.94,z=this.heightAt(x,y),s=.6+random()*1.6;dummy.position.set(x,y,z+size*.0012*s);dummy.scale.set(s,s,s*(.45+random()*.45));dummy.rotation.set(random(),random(),random()*6.28);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);}rocks.name='RockCover';this.root.add(rocks);
    // Resource fields are gameplay markers/objects, not faction structures.
    const resourceCount=recipe.players===4?(size>=1536?13:size>=1024?9:7):(size>=1536?9:size>=1024?6:5),resourceZones=[];
    const resourceMat=mat(biome.resource,.58);for(let i=0;i<resourceCount;i++){
      const a=(i/resourceCount)*Math.PI*2+.35,radius=size*(i%3===0?.16:i%3===1?.26:.34),x=Math.cos(a)*radius,y=Math.sin(a)*radius,z=this.heightAt(x,y);const id=`RESOURCE_${String(i+1).padStart(2,'0')}`;resourceZones.push({id,x:+x.toFixed(2),y:+y.toFixed(2),radius:+(size*.025).toFixed(2),tier:i%3===0?'contested':'standard'});
      for(let k=0;k<10+Math.round(recipe.resources*8);k++){const qx=x+(random()-.5)*size*.036,qy=y+(random()-.5)*size*.036,qz=this.heightAt(qx,qy),q=new THREE.Mesh(new THREE.OctahedronGeometry(size*(.0016+random()*.0014),0),resourceMat);q.position.set(qx,qy,qz+size*.0019);q.rotation.set(random(),random(),random()*6.28);q.castShadow=true;this.root.add(q);}
    }
    layout.starts.forEach((s,i)=>this._startMarker(s,i));layout.expansions.forEach(e=>this._zoneMarker(e,e.kind==='hiddenPocket'?0x76a9d8:0x93d49a));
    const navigation=this._navigationMetadata(recipe,shape.river),score=this._score(recipe,layout,navigation);
    this.metadata={schema:'worldforge.rts-map-meta.v1',mapForgeVersion:RTS_MAP_FORGE_VERSION,recipe,terrain:{chunkSize:+actualChunk.toFixed(2),chunkCount:chunks*chunks,segmentsPerChunk:seg,approxTriangles:tris},startRegions:layout.starts.map((s,i)=>({...s,index:i,radius:+(size*.055).toFixed(2),reservedOnly:true})),expansionZones:layout.expansions.map(e=>({...e,x:+e.x.toFixed(2),y:+e.y.toFixed(2),radius:+(size*.035).toFixed(2)})),resourceZones,routes,crossings:recipe.river?[{x:-size*.24,type:'bridge'},{x:size*.015,type:'bridge'},{x:size*.25,type:'bridge'}]:[],navigation,tacticalScore:score,notes:['No faction buildings are generated. Start regions are reserved terrain metadata only.','Faction economy/construction systems place structures during gameplay.']};
    this._buildFog();this.setFogPreview(false);this.root.visible=true;this.overlay.visible=true;return this.metadata;
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
    for(const z of this.metadata.resourceZones){ctx.fillStyle='#d0b44a';ctx.beginPath();ctx.arc((z.x+H)*s,w-(z.y+H)*s,3.5*dpr,0,Math.PI*2);ctx.fill();}
    for(const st of this.metadata.startRegions){ctx.fillStyle=st.index===0?'#63dd89':'#a9b7ab';ctx.beginPath();ctx.arc((st.x+H)*s,w-(st.y+H)*s,5*dpr,0,Math.PI*2);ctx.fill();}
    if(this.fogPreview){const start=this.metadata.startRegions[0],vision=size*.115;ctx.fillStyle='rgba(0,0,0,.78)';ctx.fillRect(0,0,w,w);ctx.save();ctx.globalCompositeOperation='destination-out';ctx.beginPath();ctx.arc((start.x+H)*s,w-(start.y+H)*s,vision*s,0,Math.PI*2);ctx.fill();ctx.restore();}
    const cx=this.controls.target.x,cy=this.controls.target.y,viewW=(this.camera.right-this.camera.left)*s,viewH=(this.camera.top-this.camera.bottom)*s;ctx.strokeStyle='rgba(255,255,255,.92)';ctx.lineWidth=Math.max(1.2,dpr);ctx.strokeRect((cx+H)*s-viewW/2,w-(cy+H)*s-viewH/2,viewW,viewH);
  }

  jumpFromMinimap(nx,ny){if(!this.recipe)return;const size=this.recipe.size,H=size/2,offset=this.camera.position.clone().sub(this.controls.target);this.controls.target.x=clamp(nx,0,1)*size-H;this.controls.target.y=(1-clamp(ny,0,1))*size-H;if(offset.lengthSq()<1)offset.set(size*.15,-size*.18,size*.14);this.camera.position.copy(this.controls.target).add(offset);this.camera.lookAt(this.controls.target);this.controls.update();}

  exportRecipe(){return JSON.parse(JSON.stringify(this.recipe));}
  exportMetadata(){return JSON.parse(JSON.stringify(this.metadata));}
}
