import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const VEHICLE_BAKER_VERSION = '0.2.0';
export const VEHICLE_DIRECTIONS = Object.freeze([
  {id:'N',degrees:90},{id:'NNE',degrees:67.5},{id:'NE',degrees:45},{id:'ENE',degrees:22.5},
  {id:'E',degrees:0},{id:'ESE',degrees:-22.5},{id:'SE',degrees:-45},{id:'SSE',degrees:-67.5},
  {id:'S',degrees:-90},{id:'SSW',degrees:-112.5},{id:'SW',degrees:-135},{id:'WSW',degrees:-157.5},
  {id:'W',degrees:180},{id:'WNW',degrees:157.5},{id:'NW',degrees:135},{id:'NNW',degrees:112.5}
]);
const ATLAS_COLUMNS=4;
const degRad=degrees=>THREE.MathUtils.degToRad(degrees);
const roundPx=n=>+n.toFixed(2);
function chooseTurretCandidate(node){
  const name=(node.name||'').toLowerCase();
  if(!/turret|weapon.?station|gun.?yaw|rotating.?mount/.test(name) || /ring|socket|bearing|hatch|skirt|armor|bolt|optic|shield|bracket/.test(name))return -1;
  let descendants=0;node.traverse(c=>{if(c.isMesh)descendants++;});
  if(!descendants)return -1;
  return (/turret.?yaw/.test(name)?100:/turret.?root/.test(name)?90:/^turret$/.test(name)?85:/turret/.test(name)?60:35)+Math.min(descendants,15);
}

const VEHICLE_CAMERA_TARGET = new THREE.Vector3(0,0,1.8);
const VEHICLE_CAMERA_POSITION = new THREE.Vector3(10.5,-14.5,11.5);
const DEFAULT_PREVIEW_SPAN = 6.6;
const AUTO_FIT_TARGET = 0.74; // occupy ~74% of each frame dimension
const BAKE_OVERSAMPLE = 3;

function disposeObject(root){
  if(!root)return;
  const materials=new Set(),textures=new Set();
  root.traverse(o=>{
    o.geometry?.dispose?.();
    const mats=Array.isArray(o.material)?o.material:(o.material?[o.material]:[]);
    for(const m of mats){
      materials.add(m);
      for(const v of Object.values(m||{}))if(v?.isTexture)textures.add(v);
    }
  });
  textures.forEach(t=>t.dispose?.());
  materials.forEach(m=>m.dispose?.());
}

function triangleCount(root){
  let triangles=0,meshes=0;
  root?.traverse(o=>{
    if(!o.isMesh||!o.geometry)return;
    meshes++;
    const g=o.geometry;
    triangles+=g.index?Math.floor(g.index.count/3):Math.floor((g.attributes?.position?.count||0)/3);
  });
  return {meshes,triangles};
}

function cleanName(name='vehicle'){
  return String(name).replace(/\.(glb|gltf)$/i,'').replace(/[^a-z0-9_-]+/gi,'_').replace(/^_+|_+$/g,'').toLowerCase()||'vehicle';
}

function setCameraFrame(camera,aspect,span){
  camera.left=-span*aspect;
  camera.right=span*aspect;
  camera.top=span;
  camera.bottom=-span;
  camera.near=.1;
  camera.far=200;
  camera.up.set(0,0,1);
  camera.position.copy(VEHICLE_CAMERA_POSITION);
  camera.lookAt(VEHICLE_CAMERA_TARGET);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
}

function boundsCorners(box){
  return [
    new THREE.Vector3(box.min.x,box.min.y,box.min.z),
    new THREE.Vector3(box.min.x,box.min.y,box.max.z),
    new THREE.Vector3(box.min.x,box.max.y,box.min.z),
    new THREE.Vector3(box.min.x,box.max.y,box.max.z),
    new THREE.Vector3(box.max.x,box.min.y,box.min.z),
    new THREE.Vector3(box.max.x,box.min.y,box.max.z),
    new THREE.Vector3(box.max.x,box.max.y,box.min.z),
    new THREE.Vector3(box.max.x,box.max.y,box.max.z)
  ];
}

export class VehicleBaker{
  constructor({scene,camera,renderer,controls}){
    this.scene=scene;this.camera=camera;this.renderer=renderer;this.controls=controls;
    this.loader=new GLTFLoader();
    this.container=new THREE.Group();this.container.name='WorldForgeVehicleBaker';this.container.visible=false;scene.add(this.container);
    this.modelRoot=null;this.sourceName='';this.sourceInfo=null;this.directionIndex=0;this.forwardOffsetDeg=0;this.previewSpan=DEFAULT_PREVIEW_SPAN;
    this.turretNode=null;this.turretCandidates=[];this.turretUpAxis='y';
    this.shadowCatcher=new THREE.Mesh(new THREE.PlaneGeometry(28,28),new THREE.ShadowMaterial({color:0x000000,opacity:.18,transparent:true,depthWrite:false}));
    this.shadowCatcher.name='WorldForgeVehicleShadowCatcher';this.shadowCatcher.position.z=-.025;this.shadowCatcher.receiveShadow=true;this.shadowCatcher.visible=false;scene.add(this.shadowCatcher);

    this.bakeLightRig=new THREE.Group();
    this.bakeLightRig.name='WorldForgeVehicleBakeLights';
    this.bakeLightRig.visible=false;
    const hemi=new THREE.HemisphereLight(0xe8f1f8,0x495045,.72);
    const key=new THREE.DirectionalLight(0xffedd2,1.35);key.position.set(-6,-10,18);
    const fill=new THREE.DirectionalLight(0xe7efff,.85);fill.position.set(11,5,9);
    const rim=new THREE.DirectionalLight(0xf9f6ef,.35);rim.position.set(3,14,8);
    this.bakeLightRig.add(hemi,key,fill,rim);
    scene.add(this.bakeLightRig);
  }

  setActive(active){
    this.container.visible=!!active;
    this.shadowCatcher.visible=!!active&&!!this.modelRoot;
    this.bakeLightRig.visible=!!active;
  }

  hasModel(){return !!this.modelRoot;}

  async loadURL(url,name='vehicle.glb'){
    const gltf=await this.loader.loadAsync(url);
    return this._install(gltf,name);
  }

  async loadFile(file){
    const url=URL.createObjectURL(file);
    try{return await this.loadURL(url,file.name||'vehicle.glb');}
    finally{URL.revokeObjectURL(url);}
  }

  installGenerated(object3D,name='generated_vehicle',extraInfo={}){
    return this._installScene(object3D,name,{sourceUp:'Z',animations:[],extraInfo});
  }

  installGeneratedYUp(object3D,name='generated_vehicle',extraInfo={}){
    return this._installScene(object3D,name,{sourceUp:'Y',animations:[],extraInfo});
  }

  _install(gltf,name){
    return this._installScene(gltf.scene,name,{sourceUp:'Y',animations:gltf.animations||[],extraInfo:{}});
  }

  _installScene(sourceScene,name,{sourceUp='Y',animations=[],extraInfo={}}={}){
    if(this.modelRoot){this.container.remove(this.modelRoot);disposeObject(this.modelRoot);}
    const pivot=new THREE.Group();pivot.name='VehiclePivot';
    if(sourceUp==='Y'){
      const axis=new THREE.Group();axis.name='GLTF_Y_Up_to_WorldForge_Z_Up';axis.rotation.x=Math.PI/2;axis.add(sourceScene);pivot.add(axis);
    }else pivot.add(sourceScene);
    this.container.add(pivot);this.modelRoot=pivot;
    this.turretUpAxis=sourceUp==='Y'?'y':'z';
    this.turretCandidates=[];
    sourceScene.traverse(node=>{
      if(node===sourceScene)return;
      let score=chooseTurretCandidate(node);
      // Advanced manual fallback for imported GLBs with unnamed or nonstandard turret pivots.
      // Avoid leaf meshes; only show group nodes that control at least one mesh.
      if(score<0&&node.isGroup&&node.children.length){
        let meshes=0;node.traverse(c=>{if(c.isMesh)meshes++;});
        if(meshes)score=0;
      }
      if(score>=0)this.turretCandidates.push({id:node.uuid,name:node.name||`Group ${node.id}`,score,node});
    });
    this.turretCandidates.sort((a,b)=>b.score-a.score);
    this.turretNode=this.turretCandidates.find(c=>c.score>0)?.node||null;

    pivot.updateMatrixWorld(true);
    let box=new THREE.Box3().setFromObject(pivot),size=new THREE.Vector3();box.getSize(size);
    const sourceSize={x:size.x,y:size.y,z:size.z};
    const largestHorizontal=Math.max(.001,size.x,size.y),targetLength=8.5;
    const scale=targetLength/largestHorizontal;pivot.scale.setScalar(scale);pivot.updateMatrixWorld(true);
    box=new THREE.Box3().setFromObject(pivot);const center=new THREE.Vector3();box.getCenter(center);
    pivot.position.x-=center.x;pivot.position.y-=center.y;pivot.position.z-=box.min.z;pivot.updateMatrixWorld(true);

    sourceScene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    const counts=triangleCount(sourceScene),normalizedBox=new THREE.Box3().setFromObject(pivot),normalizedSize=new THREE.Vector3();normalizedBox.getSize(normalizedSize);
    this.sourceName=name;this.sourceInfo={
      name,
      sourceDimensions:{x:+sourceSize.x.toFixed(4),y:+sourceSize.y.toFixed(4),z:+sourceSize.z.toFixed(4)},
      normalizedDimensions:{x:+normalizedSize.x.toFixed(4),y:+normalizedSize.y.toFixed(4),z:+normalizedSize.z.toFixed(4)},
      normalizationScale:+scale.toFixed(6),
      meshCount:counts.meshes,
      triangleCount:counts.triangles,
      turretCandidates:this.turretCandidates.map(c=>({id:c.id,name:c.name})),
      detectedTurret:this.turretNode?.name||null,
      animationCount:animations.length,
      animations:animations.map(a=>a.name||'unnamed'),
      ...extraInfo
    };
    this._recomputeOptimalSpan();
    this.setDirection(0);
    this.shadowCatcher.visible=this.container.visible;
    return this.sourceInfo;
  }

  _measureProjectedExtents(aspect=1){
    if(!this.modelRoot)return null;
    const box=new THREE.Box3().setFromObject(this.modelRoot);
    if(box.isEmpty())return null;
    const camera=new THREE.OrthographicCamera();
    setCameraFrame(camera,aspect,1);
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for(const v0 of boundsCorners(box)){
      const v=v0.clone().project(camera);
      minX=Math.min(minX,v.x);maxX=Math.max(maxX,v.x);minY=Math.min(minY,v.y);maxY=Math.max(maxY,v.y);
    }
    return {minX,maxX,minY,maxY,width:maxX-minX,height:maxY-minY};
  }

  _recomputeOptimalSpan(){
    if(!this.modelRoot){this.previewSpan=DEFAULT_PREVIEW_SPAN;return this.previewSpan;}
    const previousIndex=this.directionIndex;
    let requiredSpan=1;
    for(let i=0;i<VEHICLE_DIRECTIONS.length;i++){
      this.directionIndex=i;
      this.modelRoot.rotation.z=THREE.MathUtils.degToRad(VEHICLE_DIRECTIONS[i].degrees+this.forwardOffsetDeg);
      this.modelRoot.updateMatrixWorld(true);
      const ext=this._measureProjectedExtents(1);
      if(!ext)continue;
      const need=Math.max(
        Math.max(Math.abs(ext.minX),Math.abs(ext.maxX))/AUTO_FIT_TARGET,
        Math.max(Math.abs(ext.minY),Math.abs(ext.maxY))/AUTO_FIT_TARGET
      );
      if(Number.isFinite(need)&&need>requiredSpan)requiredSpan=need;
    }
    this.previewSpan=+Math.max(2.2,requiredSpan*1.03).toFixed(3);
    this.directionIndex=previousIndex;
    this.setDirection(previousIndex);
    return this.previewSpan;
  }

  setForwardOffset(deg=0){
    this.forwardOffsetDeg=Number(deg)||0;
    this._recomputeOptimalSpan();
    this.setDirection(this.directionIndex);
  }

  setDirection(index=0){
    this.directionIndex=((Number(index)||0)%VEHICLE_DIRECTIONS.length+VEHICLE_DIRECTIONS.length)%VEHICLE_DIRECTIONS.length;
    if(!this.modelRoot)return;
    const d=VEHICLE_DIRECTIONS[this.directionIndex];
    this.modelRoot.rotation.z=THREE.MathUtils.degToRad(d.degrees+this.forwardOffsetDeg);
    this.modelRoot.updateMatrixWorld(true);
  }

  fitPreview(aspect=1.5){
    const span=this.previewSpan;
    this.camera.left=-span*aspect;this.camera.right=span*aspect;this.camera.top=span;this.camera.bottom=-span;this.camera.near=.1;this.camera.far=200;this.camera.updateProjectionMatrix();
    this.controls.target.copy(VEHICLE_CAMERA_TARGET);this.camera.position.copy(VEHICLE_CAMERA_POSITION);this.camera.lookAt(this.controls.target);this.controls.update();
  }

  canonicalObject(){
    if(!this.modelRoot)return null;
    const clone=this.modelRoot.clone(true);
    clone.rotation.z=THREE.MathUtils.degToRad(this.forwardOffsetDeg);
    clone.updateMatrixWorld(true);
    return clone;
  }

  selectTurret(uuid=''){
    this.turretNode=this.turretCandidates.find(t=>t.id===uuid)?.node||null;
    if(this.sourceInfo)this.sourceInfo.detectedTurret=this.turretNode?.name||null;
    return this.turretNode;
  }

  _projectPx(point,frameSize,camera){
    const p=point.clone().project(camera);
    return {x:roundPx((p.x*.5+.5)*frameSize),y:roundPx((-.5*p.y+.5)*frameSize)};
  }

  metadata(frameSize=128,includeShadow=true,layer='combined'){
    const dir=VEHICLE_DIRECTIONS.map((d,i)=>({id:d.id,index:i,degrees:d.degrees+this.forwardOffsetDeg,
      x:(i%ATLAS_COLUMNS)*frameSize,y:Math.floor(i/ATLAS_COLUMNS)*frameSize,width:frameSize,height:frameSize}));
    const metaCamera=new THREE.OrthographicCamera();
    setCameraFrame(metaCamera,1,this.previewSpan);
    const pivotPx=this._projectPx(new THREE.Vector3(0,0,0),frameSize,metaCamera);
    let turret=null;
    if(this.turretNode){
      const previousRotation=this.modelRoot.rotation.z;
      const node=this.turretNode;
      const previousYaw=node.rotation[this.turretUpAxis];
      const hullTurretPivots=[];
      const turretSpritePivotPxByDirection=[];
      for(const d of VEHICLE_DIRECTIONS){
        this.modelRoot.rotation.z=degRad(d.degrees+this.forwardOffsetDeg);
        node.rotation[this.turretUpAxis]=previousYaw;
        this.modelRoot.updateMatrixWorld(true);
        const projected=this._projectPx(node.getWorldPosition(new THREE.Vector3()),frameSize,metaCamera);
        hullTurretPivots.push(projected);
        turretSpritePivotPxByDirection.push(projected);
      }
      this.modelRoot.rotation.z=degRad(this.forwardOffsetDeg);
      node.rotation[this.turretUpAxis]=previousYaw;
      this.modelRoot.updateMatrixWorld(true);
      const turretSpritePivotPx=this._projectPx(node.getWorldPosition(new THREE.Vector3()),frameSize,metaCamera);
      this.modelRoot.rotation.z=previousRotation;this.modelRoot.updateMatrixWorld(true);
      turret={node:node.name,localYawAxis:this.turretUpAxis,
        turretSpritePivotPx,turretSpritePivotPxByDirection,hullTurretPivotPxByDirection:hullTurretPivots,
        alignment:'Offset turret sprite so turretSpritePivotPxByDirection[turretFrame] aligns with hullTurretPivotPxByDirection[hullFrame]. Hull and turret headings are fully independent.'};
    }
    return {schema:'worldforge.vehicle-sprite.v2',vehicleBakerVersion:VEHICLE_BAKER_VERSION,source:this.sourceName,
      sourceInfo:this.sourceInfo,camera:{type:'orthographic',preset:'rts-classic-3q',position:[10.5,-14.5,11.5],
      target:[0,0,1.8],span:this.previewSpan,autoFitted:true,targetFrameOccupancy:AUTO_FIT_TARGET},
      frame:{width:frameSize,height:frameSize,count:16,columns:ATLAS_COLUMNS,rows:4,layout:'4x4',transparent:true,
      shadow:layer==='turret'?false:!!includeShadow,pivotPx,bakeOversample:BAKE_OVERSAMPLE},
      layer,forwardCalibration:{assumedModelForward:'+X',offsetDegrees:this.forwardOffsetDeg},
      turret,directions:dir};
  }

  async bakeSpriteSheet({frameSize=128,includeShadow=true,layer='combined',onProgress=null}={}){
    if(!this.modelRoot)throw new Error('Load a GLB vehicle first.');
    if(!['combined','hull','turret'].includes(layer))throw new Error('Unsupported sprite layer.');
    if(layer!=='combined'&&!this.turretNode)throw new Error('No turret pivot selected. Select TurretYaw (or another turret root) to split hull and turret.');
    frameSize=Math.max(64,Math.min(512,Number(frameSize)||128));
    const renderSize=Math.min(2048,frameSize*BAKE_OVERSAMPLE);
    const sheet=document.createElement('canvas');sheet.width=frameSize*ATLAS_COLUMNS;sheet.height=frameSize*4;
    const ctx=sheet.getContext('2d',{alpha:true});
    if(!ctx)throw new Error('Sprite canvas is unavailable.');
    ctx.clearRect(0,0,sheet.width,sheet.height);
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    const old={background:this.scene.background,clearColor:this.renderer.getClearColor(new THREE.Color()).clone(),clearAlpha:this.renderer.getClearAlpha(),
      direction:this.directionIndex,modelYaw:this.modelRoot.rotation.z,
      shadowVisible:this.shadowCatcher.visible,shadowOpacity:this.shadowCatcher.material.opacity,
      lightVisible:this.bakeLightRig.visible,pixelRatio:this.renderer.getPixelRatio(),size:new THREE.Vector2(),
      left:this.camera.left,right:this.camera.right,top:this.camera.top,bottom:this.camera.bottom,near:this.camera.near,far:this.camera.far,
      position:this.camera.position.clone(),target:this.controls.target.clone()};
    this.renderer.getSize(old.size);
    const oldSceneVisibility=[];
    for(const c of this.scene.children){
      if(c!==this.container && c!==this.shadowCatcher && c!==this.bakeLightRig && !c.isLight){
        oldSceneVisibility.push([c,c.visible]);c.visible=false;
      }
    }
    const rootMeshVisibility=[];
    const turretMeshIds=new Set();
    this.turretNode?.traverse(n=>{if(n.isMesh)turretMeshIds.add(n.uuid);});
    this.modelRoot.traverse(n=>{if(n.isMesh){rootMeshVisibility.push([n,n.visible]);if(layer==='hull'&&turretMeshIds.has(n.uuid))n.visible=false;
      if(layer==='turret'&&!turretMeshIds.has(n.uuid))n.visible=false;}});
    const yawBefore=this.turretNode?.rotation[this.turretUpAxis];
    const meta=this.metadata(frameSize,includeShadow,layer);
    try{
      this.scene.background=null;
      this.shadowCatcher.visible=layer!=='turret'&&!!includeShadow;
      this.shadowCatcher.material.opacity=includeShadow?.16:0;
      this.bakeLightRig.visible=true;
      this.renderer.setPixelRatio(1);
      this.renderer.setSize(renderSize,renderSize,false);
      this.renderer.setClearColor(0x000000,0);
      this.fitPreview(1);
      for(let i=0;i<VEHICLE_DIRECTIONS.length;i++){
        if(layer==='turret'){
          // Bake turret headings by rotating the full vehicle root to the requested world heading
          // while keeping the turret at its authored local zero. This keeps the atlas direction
          // labels consistent with the combined/hull sheets even for imported GLBs whose turret
          // local yaw basis differs from the hull basis.
          this.modelRoot.rotation.z=degRad(VEHICLE_DIRECTIONS[i].degrees+this.forwardOffsetDeg);
          this.turretNode.rotation[this.turretUpAxis]=yawBefore;
          this.modelRoot.updateMatrixWorld(true);
        }else this.setDirection(i);
        this.renderer.clear(true,true,true);
        this.renderer.render(this.scene,this.camera);
        ctx.drawImage(this.renderer.domElement,(i%ATLAS_COLUMNS)*frameSize,Math.floor(i/ATLAS_COLUMNS)*frameSize,frameSize,frameSize);
        onProgress?.(i+1,16,layer);
        // Yield periodically so iPhone Safari can show progress and respond during large bakes.
        if(i%2===1)await new Promise(resolve=>requestAnimationFrame(resolve));
      }
      const blob=await new Promise((resolve,reject)=>sheet.toBlob(b=>b?resolve(b):reject(new Error('PNG encoding failed.')),'image/png'));
      return {blob,metadata:meta,canvas:sheet,baseName:cleanName(this.sourceName),layer};
    }finally{
      if(this.turretNode)this.turretNode.rotation[this.turretUpAxis]=yawBefore;
      this.modelRoot.rotation.z=old.modelYaw;this.directionIndex=old.direction;this.modelRoot.updateMatrixWorld(true);
      rootMeshVisibility.forEach(([n,visible])=>n.visible=visible);
      oldSceneVisibility.forEach(([n,visible])=>n.visible=visible);
      this.scene.background=old.background;
      this.shadowCatcher.visible=old.shadowVisible;this.shadowCatcher.material.opacity=old.shadowOpacity;
      this.bakeLightRig.visible=old.lightVisible;
      this.renderer.setPixelRatio(old.pixelRatio);this.renderer.setSize(old.size.x,old.size.y,false);
      this.renderer.setClearColor(old.clearColor,old.clearAlpha);
      this.camera.left=old.left;this.camera.right=old.right;this.camera.top=old.top;this.camera.bottom=old.bottom;
      this.camera.near=old.near;this.camera.far=old.far;this.camera.position.copy(old.position);
      this.camera.updateProjectionMatrix();this.controls.target.copy(old.target);this.camera.lookAt(this.controls.target);this.controls.update();
    }
  }
}
