import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createRTSBuilding, RTS_BUILDINGS, RTS_BUILDING_VERSION } from './rts-building-assets.js';

export const SKIRMISH_VERSION='0.1.0';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
function disposeObject(root){if(!root)return;root.traverse(o=>{o.geometry?.dispose?.();const ms=Array.isArray(o.material)?o.material:(o.material?[o.material]:[]);ms.forEach(m=>m?.dispose?.());});}
function cloneMaterials(root){root.traverse(o=>{if(!o.material)return;o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();});return root;}

export class SkirmishTest{
  constructor({scene,camera,renderer,controls,mapForge,onStateChange=null}){
    this.scene=scene;this.camera=camera;this.renderer=renderer;this.controls=controls;this.mapForge=mapForge;this.onStateChange=onStateChange;
    this.loader=new GLTFLoader();this.root=new THREE.Group();this.root.name='WorldForgeSkirmish';this.root.visible=false;scene.add(this.root);
    this.effects=new THREE.Group();this.effects.name='SkirmishEffects';this.root.add(this.effects);
    this.active=false;this.started=false;this.mapSignature='';this.tank=null;this.enemyTargets=[];this.buildings=[];this.projectiles=[];this.fx=[];this.smokeSources=[];
    this.drive={forward:false,back:false,left:false,right:false};this.aimPoint=new THREE.Vector3();this.pendingBuild=null;this.credits=5000;this.powerSupply=0;this.powerUse=0;this.fireCooldown=0;this.follow=true;this.lastMessage='';this.buildSerial=1;
    this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.aimMarker=this._makeAimMarker();this.root.add(this.aimMarker);this.aimMarker.visible=false;
  }

  _makeAimMarker(){
    const g=new THREE.Group();g.name='AimMarker';const m=new THREE.MeshBasicMaterial({color:0xffcf57,transparent:true,opacity:.86,depthWrite:false});
    const r=new THREE.Mesh(new THREE.RingGeometry(2.3,2.8,28),m);r.position.z=.25;g.add(r);const c=new THREE.Mesh(new THREE.CircleGeometry(.45,18),m);c.position.z=.28;g.add(c);return g;
  }
  setActive(active){this.active=!!active;this.root.visible=this.active;if(!this.active)this.clearDrive();}
  clearDrive(){for(const k of Object.keys(this.drive))this.drive[k]=false;}
  setDrive(key,on){if(key in this.drive)this.drive[key]=!!on;}
  setFollow(on){this.follow=!!on;this._emit();}
  resizeCamera(){if(this.active)this._setCamera();}

  async start({reset=false}={}){
    if(!this.mapForge?.metadata)throw new Error('Generate an RTS map before starting skirmish mode.');
    const sig=`${this.mapForge.recipe?.seed||0}:${this.mapForge.recipe?.size||0}:${this.mapForge.recipe?.biome||''}`;if(this.mapSignature!==sig)reset=true;
    if(this.started&&!reset){this.setActive(true);this._setCamera();this._emit();return;}
    this.mapSignature=sig;
    this._clearSession();this.credits=5000;this.powerSupply=0;this.powerUse=0;this.pendingBuild=null;this.buildSerial=1;
    await this._spawnPlayerTank();this._spawnStartingConstructionYard();this._spawnTrainingTarget();this.started=true;this.setActive(true);this._setCamera();this._emit('Skirmish ready. Drive with the pad/WASD, tap terrain to aim, then fire.');
  }

  _clearSession(){
    this.clearDrive();this.tank=null;this.enemyTargets=[];this.buildings=[];this.projectiles=[];this.fx=[];this.smokeSources=[];this.fireCooldown=0;this.aimMarker.visible=false;
    while(this.root.children.length){const c=this.root.children[this.root.children.length-1];this.root.remove(c);if(c!==this.aimMarker)disposeObject(c);}
    this.effects=new THREE.Group();this.effects.name='SkirmishEffects';this.root.add(this.effects);this.aimMarker=this._makeAimMarker();this.root.add(this.aimMarker);this.aimMarker.visible=false;
  }

  async _spawnPlayerTank(){
    const gltf=await this.loader.loadAsync('assets/aegis_x_mbt_v2.glb');const source=cloneMaterials(gltf.scene);
    source.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    const axis=new THREE.Group();axis.name='AegisX_ZUpAxis';axis.rotation.x=Math.PI/2;axis.add(source);
    const vehicle=new THREE.Group();vehicle.name='Player_AegisX';vehicle.add(axis);this.root.add(vehicle);
    const start=this.mapForge.metadata.startRegions[0],toward=new THREE.Vector2(-start.x,-start.y).normalize(),x=start.x+toward.x*42,y=start.y+toward.y*42;
    vehicle.position.set(x,y,this.mapForge.surfaceHeightAt(x,y)-.1);vehicle.rotation.z=Math.atan2(toward.y,toward.x);
    const turret=source.getObjectByName('TurretRoot'),gun=source.getObjectByName('GunPitchRoot'),muzzle=source.getObjectByName('MuzzleSocket');
    if(!turret||!gun||!muzzle)throw new Error('Aegis-X articulation nodes are missing.');
    this.tank={root:vehicle,source,axis,turret,gun,muzzle,heading:vehicle.rotation.z,hp:1200,maxHp:1200,speed:18,reverse:8,turnRate:1.0,aimYaw:0,aimPitch:0};
    this.aimPoint.set(x+Math.cos(vehicle.rotation.z)*100,y+Math.sin(vehicle.rotation.z)*100,this.mapForge.surfaceHeightAt(x+Math.cos(vehicle.rotation.z)*100,y+Math.sin(vehicle.rotation.z)*100)+1.5);
  }

  _spawnStartingConstructionYard(){
    const start=this.mapForge.metadata.startRegions[0],asset=createRTSBuilding('constructionYard');asset.group.position.set(start.x,start.y,this.mapForge.surfaceHeightAt(start.x,start.y));asset.group.name='PLAYER_ConstructionYard';this.root.add(asset.group);
    this.buildings.push({id:'PLAYER_CY',type:'constructionYard',group:asset.group,def:asset.definition,hp:asset.definition.hp,maxHp:asset.definition.hp,owner:'player',complete:true,buildProgress:1});
  }

  _spawnTrainingTarget(){
    const start=this.mapForge.metadata.startRegions[0],toward=new THREE.Vector2(-start.x,-start.y).normalize(),side=new THREE.Vector2(-toward.y,toward.x),x=start.x+toward.x*145+side.x*24,y=start.y+toward.y*145+side.y*24;
    const asset=createRTSBuilding('gunTurret',{palette:'red'});asset.group.position.set(x,y,this.mapForge.surfaceHeightAt(x,y));asset.group.name='ENEMY_TestTurret';this.root.add(asset.group);
    this.enemyTargets.push({id:'ENEMY_TEST_TURRET',type:'gunTurret',group:asset.group,hp:800,maxHp:800,radius:7,alive:true});
    this.aimPoint.set(x,y,this.mapForge.surfaceHeightAt(x,y)+4);
  }

  selectBuild(type){
    if(!RTS_BUILDINGS[type]||type==='constructionYard'){this.pendingBuild=null;this._emit('Build selection cleared.');return;}
    this.pendingBuild=type;this._emit(`${RTS_BUILDINGS[type].label} selected · $${RTS_BUILDINGS[type].cost}. Tap buildable terrain near your structures.`);
  }
  cancelBuild(){this.pendingBuild=null;this._emit('Build placement cancelled.');}

  _navCell(x,y){return this.mapForge.movementAt(x,y,'tracked');}
  _isBuildableFootprint(x,y,def){
    const [w,d]=def.footprint,samples=[[0,0],[w*.42,d*.42],[w*.42,-d*.42],[-w*.42,d*.42],[-w*.42,-d*.42]];
    return samples.every(([ox,oy])=>this.mapForge.buildableAt(x+ox,y+oy));
  }
  _withinBuildRadius(x,y){
    return this.buildings.some(b=>b.owner==='player'&&b.complete&&Math.hypot(x-b.group.position.x,y-b.group.position.y)<=Math.max(85,b.def.buildRadius||105));
  }
  _collidesBuilding(x,y,def){
    const r=Math.hypot(def.footprint[0],def.footprint[1])*.48;
    return this.buildings.some(b=>{const br=Math.hypot(b.def.footprint[0],b.def.footprint[1])*.48;return Math.hypot(x-b.group.position.x,y-b.group.position.y)<r+br+2;});
  }
  placeSelectedBuilding(x,y){
    const type=this.pendingBuild;if(!type)return false;const def=RTS_BUILDINGS[type];
    if(this.credits<def.cost){this._emit(`Not enough credits for ${def.label}.`);return false;}
    if(!this._isBuildableFootprint(x,y,def)){this._emit('Cannot build there: terrain is too steep, blocked, road/water, or otherwise non-buildable.');return false;}
    if(!this._withinBuildRadius(x,y)){this._emit('Cannot build there: outside current construction radius.');return false;}
    if(this._collidesBuilding(x,y,def)){this._emit('Cannot build there: another structure is too close.');return false;}
    const asset=createRTSBuilding(type),g=asset.group;g.position.set(x,y,this.mapForge.surfaceHeightAt(x,y));g.name=`PLAYER_${type}_${this.buildSerial++}`;g.scale.z=.03;this.root.add(g);
    this.buildings.push({id:g.name,type,group:g,def,hp:def.hp,maxHp:def.hp,owner:'player',complete:false,buildProgress:0});this.credits-=def.cost;this.powerUse+=def.powerUse;this.powerSupply+=def.powerSupply;this.pendingBuild=null;this._emit(`${def.label} construction started.`);return true;
  }

  pointerAction(clientX,clientY,rect){
    if(!this.active)return false;this.pointer.x=((clientX-rect.left)/rect.width)*2-1;this.pointer.y=-((clientY-rect.top)/rect.height)*2+1;this.raycaster.setFromCamera(this.pointer,this.camera);
    const hits=this.raycaster.intersectObjects(this.mapForge.root.children,true);if(!hits.length)return false;const p=hits[0].point;
    if(this.pendingBuild)return this.placeSelectedBuilding(p.x,p.y);
    this.aimPoint.copy(p);this.aimPoint.z=Math.max(this.mapForge.surfaceHeightAt(p.x,p.y)+.5,p.z);this.aimMarker.position.set(p.x,p.y,this.mapForge.surfaceHeightAt(p.x,p.y)+.28);this.aimMarker.visible=true;this._emit('Turret aim updated.');return true;
  }

  fire(){
    if(!this.tank||this.fireCooldown>0)return false;this.tank.root.updateMatrixWorld(true);this.tank.muzzle.updateMatrixWorld(true);
    const pos=new THREE.Vector3();this.tank.muzzle.getWorldPosition(pos);const q=new THREE.Quaternion();this.tank.muzzle.getWorldQuaternion(q);const dir=new THREE.Vector3(1,0,0).applyQuaternion(q).normalize();
    const shell=new THREE.Mesh(new THREE.SphereGeometry(.28,8,6),new THREE.MeshStandardMaterial({color:0xffd37a,emissive:0xff7a18,emissiveIntensity:3,roughness:.25}));shell.position.copy(pos);shell.castShadow=false;this.effects.add(shell);
    this.projectiles.push({mesh:shell,vel:dir.multiplyScalar(175),life:4.5,damage:320});this.fireCooldown=1.05;this._muzzleFlash(pos);this._emit('Main gun fired.');return true;
  }

  _muzzleFlash(pos){
    const flash=new THREE.Mesh(new THREE.IcosahedronGeometry(1.25,1),new THREE.MeshBasicMaterial({color:0xffbd54,transparent:true,opacity:.95}));flash.position.copy(pos);this.effects.add(flash);const light=new THREE.PointLight(0xff8b32,6,28,2);light.position.copy(pos);this.effects.add(light);this.fx.push({kind:'flash',mesh:flash,light,life:.10,maxLife:.10});
  }
  _impact(pos,big=false){
    const light=new THREE.PointLight(big?0xff7a28:0xffa344,big?10:5,big?42:24,2);light.position.copy(pos);this.effects.add(light);this.fx.push({kind:'light',light,life:big?.32:.18,maxLife:big?.32:.18});
    const count=big?18:9;for(let i=0;i<count;i++){
      const p=new THREE.Mesh(new THREE.IcosahedronGeometry(big?.45:.25,0),new THREE.MeshBasicMaterial({color:i%3===0?0xffd36a:0xff7d2d,transparent:true,opacity:.9}));p.position.copy(pos);this.effects.add(p);const a=Math.random()*Math.PI*2,s=(big?8:5)+Math.random()*(big?16:9);this.fx.push({kind:'particle',mesh:p,vel:new THREE.Vector3(Math.cos(a)*s,Math.sin(a)*s,4+Math.random()*12),life:.45+Math.random()*.5,maxLife:1});
    }
    if(big)this._smokeBurst(pos);
  }
  _smokeBurst(pos){for(let i=0;i<8;i++){const s=new THREE.Mesh(new THREE.SphereGeometry(1.2+Math.random()*.9,7,5),new THREE.MeshBasicMaterial({color:0x2d302e,transparent:true,opacity:.48,depthWrite:false}));s.position.copy(pos).add(new THREE.Vector3((Math.random()-.5)*3,(Math.random()-.5)*3,1+Math.random()*3));this.effects.add(s);this.fx.push({kind:'smoke',mesh:s,vel:new THREE.Vector3((Math.random()-.5)*1.3,(Math.random()-.5)*1.3,2+Math.random()*2),life:2.2+Math.random()*1.5,maxLife:3.5});}}

  _damageTarget(target,damage,pos){if(!target.alive)return;target.hp=Math.max(0,target.hp-damage);this._impact(pos,target.hp<=0);if(target.hp<=0){target.alive=false;target.group.visible=false;this._emit('Training target destroyed.');}else this._emit(`Hit training target · ${target.hp}/${target.maxHp} HP.`);}

  _updateProjectiles(dt){
    for(let i=this.projectiles.length-1;i>=0;i--){const p=this.projectiles[i];p.life-=dt;p.vel.z-=9.8*dt;p.mesh.position.addScaledVector(p.vel,dt);let hit=false;
      for(const t of this.enemyTargets){if(!t.alive)continue;const center=t.group.position.clone().add(new THREE.Vector3(0,0,3.2));if(p.mesh.position.distanceTo(center)<t.radius){this._damageTarget(t,p.damage,p.mesh.position.clone());hit=true;break;}}
      if(!hit){const ground=this.mapForge.surfaceHeightAt(p.mesh.position.x,p.mesh.position.y);if(p.mesh.position.z<=ground+.3){this._impact(new THREE.Vector3(p.mesh.position.x,p.mesh.position.y,ground+.5),false);hit=true;}}
      if(hit||p.life<=0){this.effects.remove(p.mesh);disposeObject(p.mesh);this.projectiles.splice(i,1);}
    }
  }
  _updateFx(dt){
    for(let i=this.fx.length-1;i>=0;i--){const f=this.fx[i];f.life-=dt;const t=clamp(f.life/Math.max(.001,f.maxLife),0,1);
      if(f.kind==='flash'){f.mesh.scale.setScalar(1+(1-t)*1.4);f.mesh.material.opacity=t;if(f.light)f.light.intensity=6*t;}
      else if(f.kind==='light'){f.light.intensity*=Math.pow(.08,dt);}
      else if(f.kind==='particle'){f.vel.z-=14*dt;f.mesh.position.addScaledVector(f.vel,dt);f.mesh.material.opacity=t;}
      else if(f.kind==='smoke'){f.mesh.position.addScaledVector(f.vel,dt);f.mesh.scale.multiplyScalar(1+dt*.55);f.mesh.material.opacity=.48*t;}
      if(f.life<=0){if(f.mesh){this.effects.remove(f.mesh);disposeObject(f.mesh);}if(f.light)this.effects.remove(f.light);this.fx.splice(i,1);}
    }
  }

  _updateBuildings(dt){for(const b of this.buildings){if(b.complete)continue;b.buildProgress=Math.min(1,b.buildProgress+dt/1.8);b.group.scale.z=Math.max(.03,b.buildProgress);if(b.buildProgress>=1){b.complete=true;b.group.scale.z=1;this._emit(`${b.def.label} complete.`);}}}

  _blockedByStructure(x,y){
    for(const b of this.buildings){if(!b.complete)continue;const r=Math.hypot(b.def.footprint[0],b.def.footprint[1])*.46+3;if(Math.hypot(x-b.group.position.x,y-b.group.position.y)<r)return true;}
    for(const e of this.enemyTargets){if(e.alive&&Math.hypot(x-e.group.position.x,y-e.group.position.y)<e.radius+4)return true;}
    return false;
  }

  _updateTank(dt){
    const t=this.tank;if(!t)return;const throttle=(this.drive.forward?1:0)-(this.drive.back?1:0),turn=(this.drive.left?1:0)-(this.drive.right?1:0);
    if(turn)t.heading+=turn*t.turnRate*dt*(Math.abs(throttle)>.01?.72:1);t.root.rotation.z=t.heading;
    if(throttle){const speed=throttle>0?t.speed:t.reverse,nx=t.root.position.x+Math.cos(t.heading)*speed*dt*throttle,ny=t.root.position.y+Math.sin(t.heading)*speed*dt*throttle,nav=this.mapForge.movementAt(nx,ny,'tracked');if(nav.allowed&&!this._blockedByStructure(nx,ny)){t.root.position.x=nx;t.root.position.y=ny;t.root.position.z=this.mapForge.surfaceHeightAt(nx,ny)-.1;}}
    const desiredWorld=Math.atan2(this.aimPoint.y-t.root.position.y,this.aimPoint.x-t.root.position.x),localYaw=angleDelta(desiredWorld,t.heading),yawErr=angleDelta(localYaw,t.turret.rotation.y);t.turret.rotation.y+=clamp(yawErr,-1.9*dt,1.9*dt);
    t.root.updateMatrixWorld(true);const gunPos=new THREE.Vector3();t.gun.getWorldPosition(gunPos);const horizontal=Math.hypot(this.aimPoint.x-gunPos.x,this.aimPoint.y-gunPos.y),desiredPitch=clamp(Math.atan2(this.aimPoint.z-gunPos.z,horizontal),-.12,.32),pitchErr=desiredPitch-t.gun.rotation.z;t.gun.rotation.z+=clamp(pitchErr,-.8*dt,.8*dt);
  }

  _setCamera(){if(!this.tank)return;const hostAspect=Math.max(.5,this.renderer.domElement.clientWidth/Math.max(1,this.renderer.domElement.clientHeight)),span=58;this.camera.left=-span*hostAspect;this.camera.right=span*hostAspect;this.camera.top=span;this.camera.bottom=-span;this.camera.near=.1;this.camera.far=2200;this.camera.up.set(0,0,1);this.camera.updateProjectionMatrix();this._followCamera(true);}
  _followCamera(force=false){if(!this.follow||!this.tank)return;const p=this.tank.root.position,target=new THREE.Vector3(p.x,p.y,p.z+3.2),desired=target.clone().add(new THREE.Vector3(65,-82,68));if(force){this.camera.position.copy(desired);this.controls.target.copy(target);}else{this.camera.position.lerp(desired,.12);this.controls.target.lerp(target,.16);}this.camera.lookAt(this.controls.target);}

  update(dt){if(!this.active||!this.started)return;this.fireCooldown=Math.max(0,this.fireCooldown-dt);this._updateTank(dt);this._updateBuildings(dt);this._updateProjectiles(dt);this._updateFx(dt);this._followCamera(false);}

  drawMinimap(canvas){
    this.mapForge.drawMinimap(canvas);if(!canvas||!this.mapForge.recipe)return;const ctx=canvas.getContext('2d'),w=canvas.width,size=this.mapForge.recipe.size,H=size/2,s=w/size;
    for(const b of this.buildings){ctx.fillStyle=b.owner==='player'?'#6de38d':'#da6958';ctx.fillRect((b.group.position.x+H)*s-2,w-(b.group.position.y+H)*s-2,4,4);}
    for(const t of this.enemyTargets){if(!t.alive)continue;ctx.fillStyle='#df6657';ctx.beginPath();ctx.arc((t.group.position.x+H)*s,w-(t.group.position.y+H)*s,4,0,Math.PI*2);ctx.fill();}
    if(this.tank){ctx.fillStyle='#a9ffb6';ctx.beginPath();ctx.arc((this.tank.root.position.x+H)*s,w-(this.tank.root.position.y+H)*s,5,0,Math.PI*2);ctx.fill();}
  }

  state(){return {credits:this.credits,powerSupply:this.powerSupply,powerUse:this.powerUse,powerNet:this.powerSupply-this.powerUse,tankHp:this.tank?.hp||0,tankMaxHp:this.tank?.maxHp||0,pendingBuild:this.pendingBuild,buildingCount:this.buildings.length,fireReady:this.fireCooldown<=0,message:this.lastMessage};}
  _emit(message=null){if(message)this.lastMessage=message;this.onStateChange?.(this.state());}
}
