import * as THREE from 'three';
import { instantiateMasterBuilding, MASTER_BUILDINGS, RTS_ASSET_LIBRARY_VERSION } from '../rts/rts-asset-library.js';

export const BUILDING_FORGE_VERSION='0.2.0';

function disposeObject(root){if(!root)return;const mats=new Set();root.traverse(o=>{o.geometry?.dispose?.();const a=Array.isArray(o.material)?o.material:(o.material?[o.material]:[]);a.forEach(m=>mats.add(m));});mats.forEach(m=>m?.dispose?.());}

export class BuildingForge{
  constructor({scene,camera,renderer,controls}){
    this.scene=scene;this.camera=camera;this.renderer=renderer;this.controls=controls;
    this.container=new THREE.Group();this.container.name='WorldForgeBuildingForge';this.container.visible=false;scene.add(this.container);
    this.shadow=new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.ShadowMaterial({color:0x000000,opacity:.2,transparent:true,depthWrite:false}));this.shadow.rotation.x=0;this.shadow.position.z=-.03;this.shadow.receiveShadow=true;this.shadow.visible=false;scene.add(this.shadow);
    this.modelRoot=null;this.source=null;this.info=null;this.assetId='tacticalCommandPost';this.palette='aegis';this.colors={};this.animateFunctional=true;this.elapsed=0;
    this.lightRig=new THREE.Group();this.lightRig.visible=false;this.lightRig.name='BuildingForgeLights';const hemi=new THREE.HemisphereLight(0xdbe8ef,0x3d4038,.7);const key=new THREE.DirectionalLight(0xffecd0,1.6);key.position.set(-45,-55,80);const fill=new THREE.DirectionalLight(0xdce8ff,.8);fill.position.set(55,20,35);this.lightRig.add(hemi,key,fill);scene.add(this.lightRig);
  }
  setActive(active){this.container.visible=!!active;this.shadow.visible=!!active&&!!this.modelRoot;this.lightRig.visible=!!active;}
  hasModel(){return !!this.modelRoot;}
  async load(assetId=this.assetId,{palette=this.palette,colors=this.colors}={}){
    const result=await instantiateMasterBuilding(assetId,{palette,colors});
    if(this.modelRoot){this.container.remove(this.modelRoot);disposeObject(this.modelRoot);}
    const axis=new THREE.Group();axis.name='GLTF_Y_Up_to_WorldForge_Z_Up';axis.rotation.x=Math.PI/2;axis.add(result.group);
    const pivot=new THREE.Group();pivot.name='BuildingForgePivot';pivot.add(axis);this.container.add(pivot);this.modelRoot=pivot;this.source=result.group;this.info=result.info;this.assetId=assetId;this.palette=palette;this.colors={...colors};
    pivot.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(pivot),center=new THREE.Vector3();box.getCenter(center);pivot.position.x-=center.x;pivot.position.y-=center.y;pivot.position.z-=box.min.z;pivot.updateMatrixWorld(true);
    this.fitPreview();return this.info;
  }
  async applyVariant({palette=this.palette,colors=this.colors}={}){return this.load(this.assetId,{palette,colors});}
  fitPreview(aspect=1.5){if(!this.modelRoot)return;const box=new THREE.Box3().setFromObject(this.modelRoot),size=new THREE.Vector3();box.getSize(size);const span=Math.max(12,size.x*.57,size.y*.57,size.z*.95);this.camera.left=-span*aspect;this.camera.right=span*aspect;this.camera.top=span;this.camera.bottom=-span;this.camera.near=.1;this.camera.far=1000;this.camera.up.set(0,0,1);const target=new THREE.Vector3(0,0,size.z*.32);this.controls.target.copy(target);this.camera.position.set(span*.95,-span*1.25,span*.9);this.camera.lookAt(target);this.camera.updateProjectionMatrix();this.controls.update();}
  update(dt){if(!this.container.visible||!this.source||!this.animateFunctional)return;this.elapsed+=dt;const radar=this.source.getObjectByName('RadarYawRoot');if(radar)radar.rotation.y+=dt*.32;for(let i=1;i<=4;i++){const fan=this.source.getObjectByName(`CoolingFanRoot_${i}`);if(fan)fan.rotation.y+=dt*4.2;}const beacon=this.source.getObjectByName('WarningBeaconRoot');if(beacon)beacon.rotation.y+=dt*.8;}
  canonicalObject(){if(!this.source)return null;return this.source.clone(true);}
  definition(){const master=MASTER_BUILDINGS[this.assetId];return {schema:'worldforge.rts-building-master.v1',buildingForgeVersion:BUILDING_FORGE_VERSION,assetLibraryVersion:RTS_ASSET_LIBRARY_VERSION,masterAsset:{id:master.id,label:master.label,role:master.role,classification:master.classification||'military',version:master.version,asset:master.asset,footprint:master.footprint,height:master.height,skirmishDefault:!!master.skirmishDefault},faction:{preset:this.palette,colors:{...this.colors}},inspection:this.info};}
}
