import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const VEHICLE_BAKER_VERSION = '0.1.2';
export const VEHICLE_DIRECTIONS = Object.freeze([
  { id:'N',  degrees: 90 },
  { id:'NE', degrees: 45 },
  { id:'E',  degrees: 0 },
  { id:'SE', degrees:-45 },
  { id:'S',  degrees:-90 },
  { id:'SW', degrees:-135 },
  { id:'W',  degrees:180 },
  { id:'NW', degrees:135 }
]);

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
    this.directionIndex=((Number(index)||0)%8+8)%8;
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

  metadata(frameSize=128,includeShadow=true){
    const dir=VEHICLE_DIRECTIONS.map((d,i)=>({id:d.id,index:i,degrees:d.degrees+this.forwardOffsetDeg,x:i*frameSize,y:0,width:frameSize,height:frameSize}));
    const metaCamera=new THREE.OrthographicCamera();
    setCameraFrame(metaCamera,1,this.previewSpan);
    const pivotWorld=new THREE.Vector3(0,0,0).project(metaCamera);
    const pivotPx={x:+((pivotWorld.x*.5+.5)*frameSize).toFixed(2),y:+((-pivotWorld.y*.5+.5)*frameSize).toFixed(2)};
    return {
      schema:'worldforge.vehicle-sprite.v1',
      vehicleBakerVersion:VEHICLE_BAKER_VERSION,
      source:this.sourceName,
      sourceInfo:this.sourceInfo,
      camera:{type:'orthographic',preset:'rts-classic-3q',position:[10.5,-14.5,11.5],target:[0,0,1.8],span:this.previewSpan,autoFitted:true,targetFrameOccupancy:AUTO_FIT_TARGET},
      frame:{width:frameSize,height:frameSize,count:8,layout:'horizontal',transparent:true,shadow:!!includeShadow,pivotPx,bakeOversample:BAKE_OVERSAMPLE},
      forwardCalibration:{assumedModelForward:'+X',offsetDegrees:this.forwardOffsetDeg},
      directions:dir
    };
  }

  async bakeSpriteSheet({frameSize=128,includeShadow=true}={}){
    if(!this.modelRoot)throw new Error('Load a GLB vehicle first.');
    frameSize=Math.max(64,Math.min(512,Number(frameSize)||128));
    const renderSize=Math.min(2048,frameSize*BAKE_OVERSAMPLE);
    const sheet=document.createElement('canvas');sheet.width=frameSize*8;sheet.height=frameSize;
    const ctx=sheet.getContext('2d',{alpha:true});
    ctx.clearRect(0,0,sheet.width,sheet.height);
    ctx.imageSmoothingEnabled=true;
    ctx.imageSmoothingQuality='high';

    const old={
      background:this.scene.background,
      direction:this.directionIndex,
      shadowVisible:this.shadowCatcher.visible,
      shadowOpacity:this.shadowCatcher.material.opacity,
      lightVisible:this.bakeLightRig.visible,
      pixelRatio:this.renderer.getPixelRatio(),
      size:new THREE.Vector2(),
      left:this.camera.left,right:this.camera.right,top:this.camera.top,bottom:this.camera.bottom,near:this.camera.near,far:this.camera.far,
      position:this.camera.position.clone(),target:this.controls.target.clone()
    };
    this.renderer.getSize(old.size);
    this.scene.background=null;
    this.shadowCatcher.visible=!!includeShadow;
    this.shadowCatcher.material.opacity=includeShadow ? .16 : 0;
    this.bakeLightRig.visible=true;
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(renderSize,renderSize,false);
    this.renderer.setClearColor(0x000000,0);
    this.fitPreview(1);

    for(let i=0;i<VEHICLE_DIRECTIONS.length;i++){
      this.setDirection(i);
      this.renderer.render(this.scene,this.camera);
      ctx.drawImage(this.renderer.domElement,i*frameSize,0,frameSize,frameSize);
    }
    const meta=this.metadata(frameSize,includeShadow);

    this.setDirection(old.direction);this.scene.background=old.background;this.shadowCatcher.visible=old.shadowVisible;this.shadowCatcher.material.opacity=old.shadowOpacity;
    this.bakeLightRig.visible=old.lightVisible;
    this.renderer.setPixelRatio(old.pixelRatio);this.renderer.setSize(old.size.x,old.size.y,false);
    this.camera.left=old.left;this.camera.right=old.right;this.camera.top=old.top;this.camera.bottom=old.bottom;this.camera.near=old.near;this.camera.far=old.far;this.camera.position.copy(old.position);this.camera.updateProjectionMatrix();this.controls.target.copy(old.target);this.camera.lookAt(this.controls.target);this.controls.update();

    const blob=await new Promise((resolve,reject)=>sheet.toBlob(b=>b?resolve(b):reject(new Error('PNG encoding failed.')),'image/png'));
    return {blob,metadata:meta,canvas:sheet,baseName:cleanName(this.sourceName)};
  }
}
