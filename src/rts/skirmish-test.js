import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createRTSBuilding, RTS_BUILDINGS } from './rts-building-assets.js';
import { RTSSimulation, RTS_SIMULATION_VERSION } from './sim/rts-simulation.js';
import { COMMAND_SOURCES } from './sim/command-bus.js';
import { RTS_COMMANDS } from './sim/rts-commands.js';
import { LOCOMOTORS, WEAPONS, UNIT_DEFINITIONS } from './data/rts-definitions.js';
import { instantiateMasterBuilding, masterBuildingForRole, MASTER_BUILDINGS } from './rts-asset-library.js';
import { loadAegisReferenceVehicle } from '../vehicle/vehicle-generator.js';

export const SKIRMISH_VERSION='0.7.6';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
function disposeObject(root){if(!root)return;root.traverse(o=>{o.geometry?.dispose?.();const ms=Array.isArray(o.material)?o.material:(o.material?[o.material]:[]);ms.forEach(m=>m?.dispose?.());});}
function cloneMaterials(root){root.traverse(o=>{if(!o.material)return;o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();});return root;}

const GUARDIAN_TURRET_WEAPON=Object.freeze({id:'guardianAutocannon',label:'Guardian Autocannon',range:96,reloadSeconds:1.55,projectileSpeed:145,gravity:0,damage:95,lifeSeconds:2.8});
const UNIT_FACTION_COLORS=Object.freeze({
  aegis:Object.freeze({primary:0x60704f,secondary:0x39483c,highlight:0x788363,accent:0xc9a54b,cloth:0x68705c}),
  desert:Object.freeze({primary:0x806b47,secondary:0x584a35,highlight:0xb49d73,accent:0xd1ad57,cloth:0x9b8662}),
  crimson:Object.freeze({primary:0x7b3431,secondary:0x3f2b2a,highlight:0x95534d,accent:0xc75745,cloth:0x6b403c}),
  slate:Object.freeze({primary:0x3e6272,secondary:0x293f49,highlight:0x68757e,accent:0x91b3bd,cloth:0x536b75}),
  blackops:Object.freeze({primary:0x252e2c,secondary:0x171d1b,highlight:0x59645e,accent:0xa96044,cloth:0x343d39})
});
function applyUnitFactionPalette(root,preset='aegis'){
  const p=UNIT_FACTION_COLORS[preset]||UNIT_FACTION_COLORS.aegis,seen=new Set();
  root.traverse(o=>{const mats=Array.isArray(o.material)?o.material:(o.material?[o.material]:[]);for(const m of mats){if(!m||seen.has(m.uuid)||!m.color)continue;seen.add(m.uuid);const n=String(m.name||'');let c=null;
    if(/WF_TEAM_PRIMARY|Armor_Olive/i.test(n))c=p.primary;
    else if(/WF_TEAM_SECONDARY|Armor_Dark/i.test(n))c=p.secondary;
    else if(/Armor_Highlight/i.test(n))c=p.highlight;
    else if(/WF_TEAM_ACCENT|Faction_Accent|Team_Accent|^patch$/i.test(n))c=p.accent;
    else if(/^(cloth|cloth2|armor|armor2|helmet|pouch|strap)$/i.test(n))c=/cloth|pouch|strap/i.test(n)?p.cloth:(/armor2/i.test(n)?p.highlight:p.primary);
    if(c!=null){m.color.setHex(c);m.needsUpdate=true;m.userData={...(m.userData||{}),worldForgeFaction:preset};}
  }});root.userData={...(root.userData||{}),worldForgeFaction:preset};return root;
}

export class SkirmishTest{
  constructor({scene,camera,renderer,controls,mapForge,onStateChange=null}){
    this.scene=scene;this.camera=camera;this.renderer=renderer;this.controls=controls;this.mapForge=mapForge;this.onStateChange=onStateChange;
    this.loader=new GLTFLoader();this.root=new THREE.Group();this.root.name='WorldForgeSkirmish';this.root.visible=false;scene.add(this.root);
    this.effects=new THREE.Group();this.effects.name='SkirmishEffects';this.root.add(this.effects);
    this.active=false;this.started=false;this.mapSignature='';this.tank=null;this.supportUnits=[];this.supportSerial=0;this.infantryUnits=[];this.infantryViewPromises=new Map();this.riflemanAssetPromise=null;this.enemyTargets=[];this.enemyBaseEntityIds=[];this.buildings=[];this.buildingViewPromises=new Map();this.fx=[];this.projectileViews=new Map();this.renderEvents=[];this.resourceEntityByZoneId=new Map();this.selectedEntityIds=[];this.harvestCredits=0;
    this.drive={forward:false,back:false,left:false,right:false};this.aimPoint=new THREE.Vector3();this.pendingBuild=null;this.follow=true;this.viewMode='overview';this.lastMessage='';this.buildSerial=1;this.playerPalette='aegis';this.enemyPalette='crimson';
    this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.softShadowTexture=this._makeSoftShadowTexture();this.aimMarker=this._makeAimMarker();this.root.add(this.aimMarker);this.aimMarker.visible=false;this.selectedUnitMarker=this._makeSelectedUnitMarker();this.root.add(this.selectedUnitMarker);
    this.collisionDebug=false;this.collisionDebugRoot=new THREE.Group();this.collisionDebugRoot.name='CollisionDebug';this.collisionDebugRoot.visible=false;this.root.add(this.collisionDebugRoot);
    this.sim=new RTSSimulation({hz:30,seed:1});this.playerFaction=null;this.enemyFaction=null;this.lastUiTick=-999;this._configureSimulation();
  }

  get credits(){return this.playerFaction?.credits??0;}
  get powerSupply(){return this.playerFaction?.powerSupply??0;}
  get powerUse(){return this.playerFaction?.powerUse??0;}
  setFactionPalettes(player='aegis',enemy='crimson'){this.playerPalette=player||'aegis';this.enemyPalette=enemy||'crimson';}

  _configureSimulation(){
    this.sim.onCommand(RTS_COMMANDS.DRIVE_INPUT,(cmd)=>{
      const e=this.sim.entities.get(cmd.payload.entityId);if(!e?.components?.input)return;
      const key=cmd.payload.key;if(key in e.components.input)e.components.input[key]=!!cmd.payload.on;
    });
    this.sim.onCommand(RTS_COMMANDS.AIM,(cmd)=>{
      const e=this.sim.entities.get(cmd.payload.entityId);if(!e?.components?.turret)return;
      e.components.turret.aimPoint={...cmd.payload.point};
    });
    this.sim.onCommand(RTS_COMMANDS.FIRE,(cmd)=>this._handleFireCommand(cmd));
    this.sim.onCommand(RTS_COMMANDS.BUILD,(cmd)=>this._handlePlaceBuildingCommand(cmd));
    this.sim.onCommand(RTS_COMMANDS.PRODUCE,(cmd)=>this._handleProduceCommand(cmd));
    this.sim.onCommand(RTS_COMMANDS.MOVE,(cmd)=>this._handleMoveCommand(cmd));
    this.sim.onCommand(RTS_COMMANDS.STOP,(cmd)=>this._handleStopCommand(cmd));
    this.sim.onCommand(RTS_COMMANDS.HARVEST,(cmd)=>this._handleHarvestCommand(cmd));
    this.sim.onCommand(RTS_COMMANDS.RETURN_CARGO,(cmd)=>this._handleReturnCargoCommand(cmd));
    this.sim.addSystem('locomotion',(dt)=>this._systemLocomotion(dt),{priority:10});
    this.sim.addSystem('infantry-locomotion',(dt)=>this._systemInfantryLocomotion(dt),{priority:12});
    this.sim.addSystem('local-separation',(dt)=>this._systemLocalSeparation(dt),{priority:14});
    this.sim.addSystem('harvester-economy',(dt)=>this._systemHarvesterEconomy(dt),{priority:18});
    this.sim.addSystem('turret-aim',(dt)=>this._systemTurretAim(dt),{priority:20});
    this.sim.addSystem('guardian-turrets',(dt)=>this._systemGuardianTurrets(dt),{priority:28});
    this.sim.addSystem('weapons',(dt)=>this._systemWeapons(dt),{priority:30});
    this.sim.addSystem('infantry-combat',(dt)=>this._systemInfantryCombat(dt),{priority:35});
    this.sim.addSystem('construction',(dt)=>this._systemConstruction(dt),{priority:40});
    this.sim.addSystem('production',(dt)=>this._systemProduction(dt),{priority:45});
    this.sim.addSystem('projectiles',(dt)=>this._systemProjectiles(dt),{priority:50});
  }

  _makeAimMarker(){
    const g=new THREE.Group();g.name='AimMarker';const m=new THREE.MeshBasicMaterial({color:0xffcf57,transparent:true,opacity:.86,depthWrite:false});
    const r=new THREE.Mesh(new THREE.RingGeometry(2.3,2.8,28),m);r.position.z=.25;g.add(r);const c=new THREE.Mesh(new THREE.CircleGeometry(.45,18),m);c.position.z=.28;g.add(c);return g;
  }
  _makeSelectedUnitMarker(){
    const g=new THREE.Group();g.name='SelectedUnitMarker';const m=new THREE.MeshBasicMaterial({color:0x8ff7a5,transparent:true,opacity:.84,depthWrite:false,depthTest:true,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
    const ring=new THREE.Mesh(new THREE.RingGeometry(.82,1.0,40),m);ring.name='CommandSelectionMarker';ring.renderOrder=8;g.add(ring);g.visible=false;return g;
  }
  _makeSoftShadowTexture(){
    if(typeof document==='undefined')return null;
    const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d');if(!ctx)return null;
    const g=ctx.createRadialGradient(32,32,2,32,32,31);g.addColorStop(0,'rgba(9,14,10,.52)');g.addColorStop(.48,'rgba(9,14,10,.30)');g.addColorStop(.78,'rgba(9,14,10,.11)');g.addColorStop(1,'rgba(9,14,10,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.needsUpdate=true;return tex;
  }
  _attachPresentationShadow(view,{air=false}={}){
    if(!view?.root)return null;view.root.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(view.root),size=bounds.getSize(new THREE.Vector3());
    const material=new THREE.MeshBasicMaterial({color:0x172019,map:this.softShadowTexture||null,transparent:true,opacity:air?.34:.58,depthWrite:false,depthTest:true,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),material);mesh.name=air?'AirUnitGroundShadow':'GroundUnitContactShadow';mesh.renderOrder=2;
    const width=Math.max(2.5,size.x*(air?1.18:1.04)),length=Math.max(3.2,size.y*(air?1.10:.92));mesh.scale.set(width,length,1);
    const group=new THREE.Group();group.name=`PresentationShadow_${view.entityId||'unit'}`;group.add(mesh);this.root.add(group);view.presentationShadow={group,mesh,material,air,baseWidth:width,baseLength:length};return view.presentationShadow;
  }
  _updatePresentationShadow(view,t){
    const s=view?.presentationShadow;if(!s||!t)return;const ground=this.mapForge.surfaceHeightAt(t.x,t.y),altitude=Math.max(0,t.z-ground);
    s.group.position.set(t.x,t.y,ground+.10);s.group.rotation.z=t.heading||0;
    if(s.air){const spread=1+clamp(altitude/70,0,.48);s.mesh.scale.set(s.baseWidth*spread,s.baseLength*spread,1);s.material.opacity=clamp(.30-altitude*.006,.10,.24);}
    else{s.mesh.scale.set(s.baseWidth,s.baseLength,1);s.material.opacity=.58;}
  }
  setActive(active){this.active=!!active;this.root.visible=this.active;if(!this.active)this.clearDrive();}
  clearDrive(){
    for(const k of Object.keys(this.drive))this.drive[k]=false;
    const e=this.tank&&this.sim.entities.get(this.tank.entityId);if(e?.components?.input)for(const k of Object.keys(e.components.input))e.components.input[k]=false;
  }
  setDrive(key,on){if(!(key in this.drive)||!this.tank)return;this.drive[key]=!!on;const e=this.sim.entities.get(this.tank.entityId);if(on&&e?.components?.move){e.components.move.moving=false;e.components.move.state='manual';e.components.move.order=null;}this.sim.issueCommand(RTS_COMMANDS.DRIVE_INPUT,{entityId:this.tank.entityId,key,on:!!on},{source:COMMAND_SOURCES.PLAYER});}
  setFollow(on){
    this.follow=!!on;
    if(this.follow)this._followCamera(true);
    this._emit(this.follow?'Camera following selected unit · pinch to zoom.':'Free camera engaged · drag the battlefield to pan · pinch to zoom.');
  }
  toggleFreeCamera(){this.setFollow(!this.follow);}
  setViewMode(mode='overview'){this.viewMode=mode==='tactical'?'tactical':'overview';this.camera.zoom=1;this._setCamera();this._emit(this.viewMode==='tactical'?'Tactical camera engaged · pinch or wheel for fine zoom.':'Overview camera engaged · pinch or wheel for fine zoom.');}
  toggleViewMode(){this.setViewMode(this.viewMode==='overview'?'tactical':'overview');}
  panFreeCamera(deltaX,deltaY,rect){
    if(!this.active||this.follow||!rect?.width||!rect?.height)return false;
    const viewW=(this.camera.right-this.camera.left)/Math.max(.001,this.camera.zoom||1),viewH=(this.camera.top-this.camera.bottom)/Math.max(.001,this.camera.zoom||1);
    const right=new THREE.Vector3(1,0,0).applyQuaternion(this.camera.quaternion);right.z=0;if(right.lengthSq()<1e-6)right.set(1,0,0);else right.normalize();
    const up=new THREE.Vector3(0,1,0).applyQuaternion(this.camera.quaternion);up.z=0;if(up.lengthSq()<1e-6)up.set(0,1,0);else up.normalize();
    const delta=right.multiplyScalar(-deltaX*(viewW/rect.width)).add(up.multiplyScalar(deltaY*(viewH/rect.height)));
    const size=this.mapForge.recipe?.size||1024,H=size*.5,margin=Math.min(40,size*.04),old=this.controls.target.clone(),nx=clamp(old.x+delta.x,-H+margin,H-margin),ny=clamp(old.y+delta.y,-H+margin,H-margin),nz=this.mapForge.surfaceHeightAt(nx,ny)+3.2;
    const actual=new THREE.Vector3(nx-old.x,ny-old.y,nz-old.z);this.controls.target.set(nx,ny,nz);this.camera.position.add(actual);this.camera.lookAt(this.controls.target);return true;
  }
  resizeCamera(){if(this.active)this._setCamera();}
  setSimulationPaused(paused){this.sim.setPaused(paused);this._emit(paused?'Simulation paused.':'Simulation resumed.');}
  stepSimulation(){if(!this.started)return;this.sim.stepOnce();this._consumeRenderEvents();this._syncViews(this.sim.clock.fixedDelta);this._emit(`Advanced one simulation tick to ${this.sim.clock.tick}.`);}
  exportSnapshot(){return this.sim.snapshot();}
  toggleCollisionDebug(force=null){
    this.collisionDebug=force==null?!this.collisionDebug:!!force;
    if(this.collisionDebugRoot)this.collisionDebugRoot.visible=this.collisionDebug;
    if(!this.collisionDebug)this._clearCollisionDebugGeometry();
    this._emit(this.collisionDebug?'Collision debug enabled · building/unit footprints visible.':'Collision debug hidden.');
    return this.collisionDebug;
  }

  async start({reset=false}={}){
    if(!this.mapForge?.metadata)throw new Error('Generate an RTS map before starting skirmish mode.');
    const sig=`${this.mapForge.recipe?.seed||0}:${this.mapForge.recipe?.size||0}:${this.mapForge.recipe?.biome||''}`;if(this.mapSignature!==sig)reset=true;
    if(this.started&&!reset){this.setActive(true);this._setCamera();this._emit();return;}
    this.mapSignature=sig;this._clearSession();
    this.sim.reset({seed:this.mapForge.recipe?.seed||1});this.lastUiTick=-999;this.viewMode='overview';this.follow=true;this.camera.zoom=1;this.playerFaction=this.sim.createFaction('player',{credits:5000});this.enemyFaction=this.sim.createFaction('enemy',{credits:0});this.pendingBuild=null;this.buildSerial=1;this.harvestCredits=0;this._registerResourceFields();
    await this._spawnPlayerTank();await this._spawnStartingConstructionYard();await this._spawnEnemySandboxBase();this.started=true;this.setActive(true);this._setCamera();this._emit(`Skirmish ${SKIRMISH_VERSION} ready · ground vehicles now stage fully clear of production structures and mobile MOVE taps have wider touch tolerance. Tap friendlies to command, explore with FREE CAM, and use the Aegis-X main gun against hostile structures.`);
  }

  _clearSession(){
    this.clearDrive();this.tank=null;this.supportUnits=[];this.supportSerial=0;this.infantryUnits=[];this.infantryViewPromises.clear();this.enemyTargets=[];this.enemyBaseEntityIds=[];this.buildings=[];this.buildingViewPromises.clear();this.fx=[];this.projectileViews.clear();this.renderEvents=[];this.resourceEntityByZoneId.clear();this.selectedEntityIds=[];this.harvestCredits=0;this.aimMarker.visible=false;this.started=false;
    while(this.root.children.length){const c=this.root.children[this.root.children.length-1];this.root.remove(c);if(c!==this.aimMarker)disposeObject(c);}
    this.effects=new THREE.Group();this.effects.name='SkirmishEffects';this.root.add(this.effects);this.aimMarker=this._makeAimMarker();this.root.add(this.aimMarker);this.aimMarker.visible=false;this.selectedUnitMarker=this._makeSelectedUnitMarker();this.root.add(this.selectedUnitMarker);
    this.collisionDebugRoot=new THREE.Group();this.collisionDebugRoot.name='CollisionDebug';this.collisionDebugRoot.visible=this.collisionDebug;this.root.add(this.collisionDebugRoot);
  }

  _registerResourceFields(){
    this.resourceEntityByZoneId.clear();
    for(const zone of this.mapForge.metadata?.resourceZones||[]){
      const hp=zone.harvestPoint||{x:zone.x,y:zone.y,z:this.mapForge.surfaceHeightAt(zone.x,zone.y)},capacity=Math.max(0,Number(zone.capacity)||0);
      const e=this.sim.createEntity('resource',{transform:{x:zone.x,y:zone.y,z:zone.z||this.mapForge.surfaceHeightAt(zone.x,zone.y)},resourceField:{zoneId:zone.id,richness:zone.richness,capacity,remaining:capacity,harvestPoint:{x:hp.x,y:hp.y,z:hp.z}}});
      this.resourceEntityByZoneId.set(zone.id,e.id);this.mapForge.setResourceFieldFraction?.(zone.id,1);
    }
  }
  _resourceFieldByZone(zoneId){const id=this.resourceEntityByZoneId.get(String(zoneId));return id?this.sim.entities.get(id):null;}
  _selectedEntities(){return this.selectedEntityIds.map(id=>this.sim.entities.get(id)).filter(e=>e?.kind==='unit'&&!e.components.health?.destroyed&&e.components.owner==='player');}
  _selectedEntity(){return this._selectedEntities()[0]||null;}
  clearSelection(message='Selection cleared.'){this.selectedEntityIds=[];if(this.selectedUnitMarker)this.selectedUnitMarker.visible=false;this._emit(message);}
  _selectEntity(entityId){
    const e=this.sim.entities.get(entityId);if(!e||e.kind!=='unit'||e.components.owner!=='player'||e.components.health?.destroyed)return false;
    // Re-tapping the already-selected unit keeps selection locked. On touch screens an
    // accidental second hit must not silently turn the next terrain tap back into tank aim.
    if(this.selectedEntityIds.length===1&&this.selectedEntityIds[0]===e.id){this._updateSelectedUnitMarker();return true;}
    this.selectedEntityIds=[e.id];this._updateSelectedUnitMarker();const def=UNIT_DEFINITIONS[e.components.unitType];this._emit(`${def?.label||'Friendly unit'} selected · tap terrain to move${e.components.unitType==='aegisHarvester'?' or tap a crystal field to harvest':''}.`);return true;
  }
  _updateSelectedUnitMarker(){
    const e=this._selectedEntity(),m=this.selectedUnitMarker;if(!m)return;if(!e){m.visible=false;return;}const t=e.components.transform,def=UNIT_DEFINITIONS[e.components.unitType]||{},fp=def.collisionFootprint||[(def.collisionRadius||1)*2,(def.collisionRadius||1)*2],radius=Math.max(1.35,Math.max(fp[0],fp[1])*.62);m.position.set(t.x,t.y,this.mapForge.surfaceHeightAt(t.x,t.y)+.17);m.scale.set(radius,radius,1);m.visible=true;
  }
  _entityIdFromObject(object){let o=object;while(o&&o!==this.root){if(o.userData?.skirmishEntityId)return Number(o.userData.skirmishEntityId);o=o.parent;}return null;}
  _resourceZoneIdFromHit(hit){const map=hit?.object?.userData?.instanceMap;if(!hit?.object?.userData?.worldForgeResourceInstances||!Array.isArray(map))return null;const item=map[hit.instanceId??-1];return item?.resourceZoneId||null;}

  async _spawnPlayerTank(){
    const def=UNIT_DEFINITIONS.aegisMbt,loc=LOCOMOTORS[def.locomotor],weapon=WEAPONS[def.primaryWeapon];
    const gltf=await this.loader.loadAsync(def.asset);const source=cloneMaterials(gltf.scene);source.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    const axis=new THREE.Group();axis.name='AegisX_ZUpAxis';axis.rotation.x=Math.PI/2;axis.add(source);const vehicle=new THREE.Group();vehicle.name='Player_AegisX';vehicle.add(axis);this.root.add(vehicle);
    const start=this.mapForge.metadata.startRegions[0],toward=new THREE.Vector2(-start.x,-start.y).normalize(),x=start.x+toward.x*58,y=start.y+toward.y*58,z=this.mapForge.surfaceHeightAt(x,y)-.1,heading=Math.atan2(toward.y,toward.x);
    const turret=source.getObjectByName('TurretRoot'),gun=source.getObjectByName('GunPitchRoot'),muzzle=source.getObjectByName(weapon.muzzleSocket);if(!turret||!gun||!muzzle)throw new Error('Aegis-X articulation nodes are missing.');
    const aim={x:x+Math.cos(heading)*100,y:y+Math.sin(heading)*100,z:this.mapForge.surfaceHeightAt(x+Math.cos(heading)*100,y+Math.sin(heading)*100)+1.5};
    const e=this.sim.createEntity('unit',{unitType:def.id,owner:'player',transform:{x,y,z,heading},health:{current:def.maxHp,max:def.maxHp,destroyed:false},locomotor:{...loc},input:{forward:false,back:false,left:false,right:false},move:{waypoints:[],index:0,moving:false,state:'idle',order:null,destination:null,stuckSeconds:0},turret:{yaw:0,pitch:0,yawRate:1.9,pitchRate:.8,aimPoint:aim},weapon:{id:weapon.id,cooldown:0}},'player');
    vehicle.userData.skirmishEntityId=e.id;vehicle.position.set(x,y,z);vehicle.rotation.z=heading;this.tank={entityId:e.id,root:vehicle,source,axis,turret,gun,muzzle,definition:def};this._attachPresentationShadow(this.tank,{air:false});this.aimPoint.set(aim.x,aim.y,aim.z);
  }


  _supportDefinitionForArchetype(archetype){
    return {mbt:UNIT_DEFINITIONS.aegisMbt,hmmwv50:UNIT_DEFINITIONS.aegisHmmwv,attackHeli:UNIT_DEFINITIONS.aegisTalon,fieldHarvester:UNIT_DEFINITIONS.aegisHarvester}[archetype]||null;
  }
  _supportArchetypeForUnit(unitType){
    return {aegisMbt:'mbt',aegisHmmwv:'hmmwv50',aegisTalon:'attackHeli',aegisHarvester:'fieldHarvester'}[unitType]||null;
  }
  async _createSupportUnitView(entity,archetype,{name=null}={}){
    const def=this._supportDefinitionForArchetype(archetype);if(!def||!entity)return null;
    const owner=entity.components.owner||'player',factionPalette=owner==='enemy'?this.enemyPalette:this.playerPalette;
    let source;
    if(archetype==='mbt'){
      const gltf=await this.loader.loadAsync(def.asset);source=cloneMaterials(gltf.scene.clone(true));applyUnitFactionPalette(source,factionPalette);
    }else{
      const paletteMap={aegis:'olive',desert:'desert',crimson:'red',slate:'slate',blackops:'slate'},result=await loadAegisReferenceVehicle({type:archetype,palette:paletteMap[factionPalette]||'olive',seed:(this.mapForge.recipe?.seed||1)+this.supportSerial});source=result.group;applyUnitFactionPalette(source,factionPalette);
    }
    source.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    const axis=new THREE.Group();axis.name='SupportUnit_YUp_to_ZUp';axis.rotation.x=Math.PI/2;axis.add(source);const root=new THREE.Group();root.name=name||`${owner.toUpperCase()}_${def.id}_${++this.supportSerial}`;root.add(axis);root.userData.skirmishEntityId=entity.id;this.root.add(root);
    const t=entity.components.transform;root.position.set(t.x,t.y,t.z);root.rotation.z=t.heading||0;
    const wheelNames=archetype==='fieldHarvester'?['FrontLeftWheelSpinRoot','FrontRightWheelSpinRoot','MidLeftWheelSpinRoot','MidRightWheelSpinRoot','RearLeftWheelSpinRoot','RearRightWheelSpinRoot']:(archetype==='hmmwv50'?['FL','FR','RL','RR'].map(k=>`WheelSpinRoot_${k}`):[]);
    const view={entityId:entity.id,root,source,axis,definition:def,archetype,rotorMain:source.getObjectByName('MainRotorRoot'),rotorTail:source.getObjectByName('TailRotorRoot'),wheels:wheelNames.map(n=>source.getObjectByName(n)).filter(Boolean),collector:source.getObjectByName('CollectorDrumRoot'),dumpDoors:[source.getObjectByName('HopperDoorLeftRoot'),source.getObjectByName('HopperDoorRightRoot')].filter(Boolean)};
    this._attachPresentationShadow(view,{air:entity.components.locomotor?.movementClass==='air'});this.supportUnits.push(view);return view;
  }

  async spawnSupportUnit(archetype){
    if(!this.started)return false;
    const def=this._supportDefinitionForArchetype(archetype);if(!def)return false;
    const base=this.tank?this.sim.entities.get(this.tank.entityId)?.components.transform:null,start=this.mapForge.metadata.startRegions[0],bx=base?.x??start.x,by=base?.y??start.y,heading=base?.heading??0,side=new THREE.Vector2(-Math.sin(heading),Math.cos(heading));
    const offset=14+(this.supportSerial+1)*7,rawX=bx+side.x*offset-Math.cos(heading)*8,rawY=by+side.y*offset-Math.sin(heading)*8,loc=LOCOMOTORS[def.locomotor],spawn=loc.movementClass==='air'?{x:rawX,y:rawY}:this._findOpenGroundSpawn(def,rawX,rawY,heading),x=spawn.x,y=spawn.y,ground=this.mapForge.surfaceHeightAt(x,y),z=loc.movementClass==='air'?ground+(loc.preferredAltitude||22):ground-.1;
    const components={unitType:def.id,owner:'player',transform:{x,y,z,heading},health:{current:def.maxHp,max:def.maxHp,destroyed:false},locomotor:{...loc},move:{waypoints:[],index:0,moving:false,state:'idle',order:null,destination:null,stuckSeconds:0}};
    if(def.id==='aegisHarvester')components.resource={capacity:def.resourceCapacity||1200,cargo:0,state:'idle',targetResourceEntityId:null,refineryEntityId:null,autoHarvest:false,harvestRate:def.harvestRate||120,unloadRate:def.unloadRate||600,creditPerUnit:def.creditPerUnit||1,unloadedThisTrip:0};
    const e=this.sim.createEntity('unit',components,'player');await this._createSupportUnitView(e,archetype);this._emit(`${def.label} master asset deployed for skirmish testing.`);return true;
  }

  _buildingComponents(type,x,y,{owner='player',complete=false}={}){
    const def=RTS_BUILDINGS[type],components={buildingType:type,owner,transform:{x,y,z:this.mapForge.surfaceHeightAt(x,y),heading:0},health:{current:def.hp,max:def.hp,destroyed:false},building:{footprint:[...def.footprint],collisionFootprint:[...(def.collisionFootprint||def.footprint)],buildRadius:def.buildRadius||0,powerUse:def.powerUse||0,powerSupply:def.powerSupply||0,starterUnit:def.starterUnit||null,starterUnitSpawned:false},construction:{progress:complete?1:0,duration:1.8,complete:!!complete}};
    if(type==='barracks'||type==='vehicleFactory')components.production={queue:[],active:null,rallySerial:0};
    if(type==='gunTurret'){components.turret={yaw:0,pitch:0,targetId:null};components.weapon={id:GUARDIAN_TURRET_WEAPON.id,cooldown:0};}
    return components;
  }

  _buildingLocalPoint(entity,[lx,ly,lz]){
    const t=entity.components.transform,h=t.heading||0,c=Math.cos(h),s=Math.sin(h);
    return {x:t.x+c*lx-s*ly,y:t.y+s*lx+c*ly,z:t.z+lz};
  }
  _barracksExitProfile(entity){
    return {
      spawn:this._buildingLocalPoint(entity,[6.15,0,.68]),
      entry:this._buildingLocalPoint(entity,[8.18,0,.68]),
      path0:this._buildingLocalPoint(entity,[8.78,0,.64]),
      path1:this._buildingLocalPoint(entity,[9.92,0,.52]),
      path2:this._buildingLocalPoint(entity,[10.55,0,.50]),
      rally:this._buildingLocalPoint(entity,[12.0,0,.58])
    };
  }
  _barracksRallySlot(entity,index){
    const spacing=UNIT_DEFINITIONS.aegisRifleman.personalSpace||.82,row=Math.floor(index/5),col=index%5,columns=[0,1,-1,2,-2],forward=row*spacing,lateral=columns[col]*spacing;
    return this._buildingLocalPoint(entity,[12.0+forward,lateral,.58]);
  }

  trainRifleman(){
    if(!this.started)return false;
    this.sim.issueCommand(RTS_COMMANDS.PRODUCE,{unitType:'aegisRifleman'},{source:COMMAND_SOURCES.PLAYER});
    this._emit('Rifleman production command queued.');
    return true;
  }

  produceVehicle(unitType){
    if(!this.started)return false;
    if(!['aegisMbt','aegisHmmwv','aegisHarvester'].includes(unitType))return false;
    this.sim.issueCommand(RTS_COMMANDS.PRODUCE,{unitType},{source:COMMAND_SOURCES.PLAYER});
    const def=UNIT_DEFINITIONS[unitType];this._emit(`${def?.label||'Vehicle'} production command queued.`);return true;
  }

  _factoryExitProfile(factory){
    const b=factory?.components?.building,p=b?.vehicleExitProfile;if(p?.spawn&&p?.entry&&p?.rally)return p;
    return {spawn:this._buildingLocalPoint(factory,[0,-7,.35]),entry:this._buildingLocalPoint(factory,[0,-9,.25]),path0:this._buildingLocalPoint(factory,[0,-11,.20]),path1:this._buildingLocalPoint(factory,[0,-13,.15]),path2:this._buildingLocalPoint(factory,[0,-15,.12]),rally:this._buildingLocalPoint(factory,[0,-19,.10])};
  }
  _factoryRallySlot(factory,index){
    const p=this._factoryExitProfile(factory),base=p.rally,prev=p.path2||p.entry||p.spawn,dx=base.x-prev.x,dy=base.y-prev.y,len=Math.hypot(dx,dy)||1,fx=dx/len,fy=dy/len,sx=-fy,sy=fx,cols=[0,1,-1,2,-2],col=cols[index%cols.length],row=Math.floor(index/cols.length),spacing=6.0;
    return {x:base.x+sx*col*spacing+fx*row*spacing*.85,y:base.y+sy*col*spacing+fy*row*spacing*.85,z:this.mapForge.surfaceHeightAt(base.x+sx*col*spacing+fx*row*spacing*.85,base.y+sy*col*spacing+fy*row*spacing*.85)-.1};
  }
  _spawnFactoryVehicleEntity(factory,unitType){
    const def=UNIT_DEFINITIONS[unitType],archetype=this._supportArchetypeForUnit(unitType);if(!def||!archetype)return null;
    const loc=LOCOMOTORS[def.locomotor],profile=this._factoryExitProfile(factory),prod=factory.components.production||(factory.components.production={queue:[],active:null,rallySerial:0}),rally=this._factoryRallySlot(factory,prod.rallySerial++),spawn=profile.spawn,entry=profile.entry||spawn,heading=Math.atan2(entry.y-spawn.y,entry.x-spawn.x);
    const components={unitType:def.id,owner:'player',transform:{x:spawn.x,y:spawn.y,z:spawn.z,heading},health:{current:def.maxHp,max:def.maxHp,destroyed:false},locomotor:{...loc},move:{waypoints:[],index:0,moving:false,state:'deploy',order:'factoryDeploy',destination:{x:rally.x,y:rally.y},stuckSeconds:0},factoryProduced:true};
    if(def.id==='aegisHarvester')components.resource={capacity:def.resourceCapacity||1200,cargo:0,state:'idle',targetResourceEntityId:null,refineryEntityId:null,autoHarvest:false,harvestRate:def.harvestRate||120,unloadRate:def.unloadRate||600,creditPerUnit:def.creditPerUnit||1,unloadedThisTrip:0};
    const e=this.sim.createEntity('unit',components,'player'),corridor=[profile.entry,profile.path0,profile.path1,profile.path2,profile.rally].filter(Boolean);this._startControlledEgress(e,factory,corridor,rally,{state:'deploy',order:'factoryDeploy',minimumSafeIndex:Math.max(0,corridor.length-1),clearance:1.0});this.renderEvents.push({type:'spawnSupportUnit',entityId:e.id,archetype});this.renderEvents.push({type:'message',message:`${def.label} rolling out through the Vehicle Factory egress corridor.`});return e;
  }

  _handleProduceCommand(cmd){
    const def=UNIT_DEFINITIONS[cmd.payload.unitType];
    if(!def){this.renderEvents.push({type:'message',message:'Unknown unit production request.'});return;}
    if(def.id==='aegisRifleman'){
      const barracks=this.sim.entities.values().find(e=>e.kind==='building'&&e.components.owner==='player'&&e.components.buildingType==='barracks'&&e.components.construction?.complete&&!e.components.health?.destroyed);
      if(!barracks){this.renderEvents.push({type:'message',message:'Build and complete a Field Barracks before training Riflemen.'});return;}
      const prod=barracks.components.production||(barracks.components.production={queue:[],active:null,rallySerial:0}),queued=(prod.queue?.length||0)+(prod.active?1:0);
      if(queued>=5){this.renderEvents.push({type:'message',message:'Field Barracks queue is full.'});return;}
      if(!this.playerFaction?.spend(def.cost)){this.renderEvents.push({type:'message',message:`Not enough credits for ${def.label}.`});return;}
      prod.queue.push({unitType:def.id,remaining:def.buildSeconds,total:def.buildSeconds});this.renderEvents.push({type:'message',message:`${def.label} training · $${def.cost}.`});return;
    }
    if(['aegisMbt','aegisHmmwv','aegisHarvester'].includes(def.id)){
      const factory=this.sim.entities.values().find(e=>e.kind==='building'&&e.components.owner==='player'&&e.components.buildingType==='vehicleFactory'&&e.components.construction?.complete&&!e.components.health?.destroyed);
      if(!factory){this.renderEvents.push({type:'message',message:`Build and complete an Aegis Vehicle Factory before producing ${def.label}.`});return;}
      const prod=factory.components.production||(factory.components.production={queue:[],active:null,rallySerial:0}),queued=(prod.queue?.length||0)+(prod.active?1:0);
      if(queued>=4){this.renderEvents.push({type:'message',message:'Vehicle Factory queue is full.'});return;}
      if(!this.playerFaction?.spend(def.cost)){this.renderEvents.push({type:'message',message:`Not enough credits for ${def.label}.`});return;}
      prod.queue.push({unitType:def.id,remaining:def.buildSeconds,total:def.buildSeconds});this.renderEvents.push({type:'message',message:`${def.label} production started · $${def.cost}.`});return;
    }
    this.renderEvents.push({type:'message',message:`${def.label||'Unit'} is not assigned to a production structure yet.`});
  }

  _spawnRiflemanEntity(barracks){
    const def=UNIT_DEFINITIONS.aegisRifleman,loc=LOCOMOTORS[def.locomotor],weapon=WEAPONS[def.primaryWeapon],profile=this._barracksExitProfile(barracks),heading=barracks.components.transform.heading||0,prod=barracks.components.production||(barracks.components.production={queue:[],active:null,rallySerial:0}),rally=this._barracksRallySlot(barracks,prod.rallySerial++);
    const waypoints=[profile.entry,profile.path0,profile.path1,profile.path2,rally].map(p=>({...p}));
    const e=this.sim.createEntity('unit',{
      unitType:def.id,owner:'player',
      transform:{x:profile.spawn.x,y:profile.spawn.y,z:profile.spawn.z,heading},
      health:{current:def.maxHp,max:def.maxHp,destroyed:false},
      locomotor:{...loc},
      move:{waypoints,index:0,moving:true,state:'deploy',order:'barracksDeploy',destination:{x:rally.x,y:rally.y},stuckSeconds:0,exitBuildingId:barracks.id},
      weapon:{id:weapon.id,cooldown:0},
      combat:{targetId:null,state:'deploying'}
    },'player');
    this.renderEvents.push({type:'spawnRifleman',entityId:e.id});
    this.renderEvents.push({type:'message',message:'Aegis Rifleman deployed from the Field Barracks.'});
    return e;
  }

  async _createRiflemanView(entity){
    const def=UNIT_DEFINITIONS.aegisRifleman;
    if(!this.riflemanAssetPromise)this.riflemanAssetPromise=this.loader.loadAsync(def.asset);
    const gltf=await this.riflemanAssetPromise,source=cloneMaterials(gltf.scene.clone(true)),owner=entity.components.owner||'player';applyUnitFactionPalette(source,owner==='enemy'?this.enemyPalette:this.playerPalette);
    source.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    const axis=new THREE.Group();axis.name='Rifleman_YUp_to_ZUp';axis.rotation.x=Math.PI/2;axis.add(source);
    const forwardFix=new THREE.Group();forwardFix.name='Rifleman_ForwardFix';forwardFix.rotation.z=Math.PI/2;forwardFix.add(axis);
    const root=new THREE.Group();root.name=`${owner.toUpperCase()}_Rifleman_${entity.id}`;root.userData.skirmishEntityId=entity.id;root.add(forwardFix);this.root.add(root);
    const mixer=new THREE.AnimationMixer(source),walkClip=THREE.AnimationClip.findByName(gltf.animations,def.walkClip),fireClip=THREE.AnimationClip.findByName(gltf.animations,def.fireClip);
    const walkAction=walkClip?mixer.clipAction(walkClip):null,fireAction=fireClip?mixer.clipAction(fireClip):null;
    if(walkAction){walkAction.play();walkAction.paused=false;}
    if(fireAction){fireAction.setLoop(THREE.LoopOnce,1);fireAction.clampWhenFinished=true;}
    const view={entityId:entity.id,root,source,axis,forwardFix,mixer,walkAction,fireAction,definition:def,fireTimer:0};
    this._attachPresentationShadow(view,{air:false});this.infantryUnits.push(view);return view;
  }
  async _createBuildingView(entity,{palette=null,name=null}={}){
    const type=entity.components.buildingType,t=entity.components.transform,c=entity.components.construction,def=RTS_BUILDINGS[type];
    const factionPalette=palette||(entity.components.owner==='enemy'?this.enemyPalette:this.playerPalette);
    let g,masterAsset=null;const configuredMasterId=def?.masterAsset;const master=(configuredMasterId&&MASTER_BUILDINGS[configuredMasterId])||masterBuildingForRole(type);
    if(master){
      try{
        const loaded=await instantiateMasterBuilding(master.id,{palette:factionPalette});masterAsset=master.id;
        const axis=new THREE.Group();axis.name='MasterBuilding_YUp_to_ZUp';axis.rotation.x=Math.PI/2;axis.add(loaded.group);g=new THREE.Group();g.name='MasterBuildingView';g.add(axis);
      }catch(err){console.warn('Master building load failed; using procedural fallback.',type,err);}
    }
    if(!g){const fallbackPalette=factionPalette==='crimson'?'red':factionPalette==='desert'?'desert':factionPalette==='slate'?'slate':'olive';g=createRTSBuilding(type,{palette:fallbackPalette}).group;}
    g.position.set(t.x,t.y,t.z);g.rotation.z=t.heading||0;g.name=name||`${entity.components.owner.toUpperCase()}_${type}_${entity.id}`;g.userData.skirmishEntityId=entity.id;g.scale.z=c.complete?1:Math.max(.03,c.progress);this.root.add(g);
    const view={entityId:entity.id,id:g.name,type,group:g,def,owner:entity.components.owner,masterAsset,functional:{
      radar:g.getObjectByName('RadarYawRoot'),
      fans:[1,2,3,4].map(i=>g.getObjectByName(`CoolingFanRoot_${i}`)).filter(Boolean),
      dustFan:g.getObjectByName('DustCollectorFanRoot'),
      apronFeeder:g.getObjectByName('ApronFeederRoot'),
      dockSignal:g.getObjectByName('DockSignalRoot'),
      turret:g.getObjectByName('TurretRoot'),
      gun:g.getObjectByName('GunPitchRoot'),
      muzzle:g.getObjectByName('MuzzleSocket'),
      vehicleSpawn:g.getObjectByName('WF_SPAWN_VEHICLE'),
      vehicleEntry:g.getObjectByName('WF_ENTRY'),
      vehicleExit0:g.getObjectByName('WF_EXIT_PATH_0'),
      vehicleExit1:g.getObjectByName('WF_EXIT_PATH_1'),
      vehicleExit2:g.getObjectByName('WF_EXIT_PATH_2'),
      vehicleRally:g.getObjectByName('WF_RALLY'),
      serviceBay:g.getObjectByName('WF_SERVICE_BAY'),
      doorCenter:g.getObjectByName('WF_DOOR_CENTER')
    }};
    if(type==='refinery'){
      g.updateMatrixWorld(true);const point=(name)=>{const node=g.getObjectByName(name);if(!node)return null;const wp=new THREE.Vector3();node.getWorldPosition(wp);return {x:wp.x,y:wp.y,z:wp.z};};
      const profile={queue:point('HarvesterQueueSocket'),approach:point('HarvesterApproachSocket'),dock:point('HarvesterDockSocket'),unload:point('HarvesterUnloadSocket'),exit:point('HarvesterExitSocket'),rally:point('HarvesterRallySocket')};
      entity.components.building.harvesterDockProfile=profile;if(profile.dock)entity.components.building.harvesterDockPoint={...profile.dock};
    }
    if(type==='vehicleFactory'){
      g.updateMatrixWorld(true);const point=(node)=>{if(!node)return null;const wp=new THREE.Vector3();node.getWorldPosition(wp);return {x:wp.x,y:wp.y,z:wp.z};};
      entity.components.building.vehicleExitProfile={spawn:point(view.functional.vehicleSpawn),entry:point(view.functional.vehicleEntry),path0:point(view.functional.vehicleExit0),path1:point(view.functional.vehicleExit1),path2:point(view.functional.vehicleExit2),rally:point(view.functional.vehicleRally)};
    }
    this.buildings.push(view);return view;
  }
  async _spawnStarterHarvesterForRefinery(refineryEntityId){
    const refinery=this.sim.entities.get(refineryEntityId);if(!refinery||refinery.components.buildingType!=='refinery'||refinery.components.health?.destroyed)return false;
    const b=refinery.components.building;if(b.starterUnitSpawned)return false;
    let refineryView=this.buildings.find(v=>v.entityId===refineryEntityId)||null;
    if(!refineryView){const pending=this.buildingViewPromises.get(refineryEntityId);if(pending)refineryView=await pending;}
    if(!refineryView)return false;
    const dockSocket=refineryView.group.getObjectByName('HarvesterDockSocket');if(!dockSocket)throw new Error('Field Refinery master is missing HarvesterDockSocket.');
    const def=UNIT_DEFINITIONS.aegisHarvester,loc=LOCOMOTORS[def.locomotor],paletteMap={aegis:'olive',desert:'desert',crimson:'red',slate:'slate',blackops:'slate'};
    const result=await loadAegisReferenceVehicle({type:'fieldHarvester',palette:paletteMap[this.playerPalette]||'olive'}),source=result.group;
    source.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    const align=source.getObjectByName(def.dockAlignSocket||'RefineryDockAlignSocket');if(!align)throw new Error('Field Harvester master is missing RefineryDockAlignSocket.');
    const axis=new THREE.Group();axis.name='Harvester_YUp_to_ZUp';axis.rotation.x=Math.PI/2;axis.add(source);
    const root=new THREE.Group();root.name=`PLAYER_StarterHarvester_${++this.supportSerial}`;root.add(axis);root.rotation.z=(refinery.components.transform.heading||0)+Math.PI;this.root.add(root);
    refineryView.group.updateMatrixWorld(true);const dockWorld=new THREE.Vector3();dockSocket.getWorldPosition(dockWorld);
    root.position.copy(dockWorld);root.updateMatrixWorld(true);const alignWorld=new THREE.Vector3();align.getWorldPosition(alignWorld);root.position.add(dockWorld.clone().sub(alignWorld));root.updateMatrixWorld(true);
    const heading=root.rotation.z,x=root.position.x,y=root.position.y,z=root.position.z;
    const e=this.sim.createEntity('unit',{unitType:def.id,owner:'player',transform:{x,y,z,heading},health:{current:def.maxHp,max:def.maxHp,destroyed:false},locomotor:{...loc},move:{waypoints:[],index:0,moving:false,state:'docked',order:null,destination:null,stuckSeconds:0},resource:{capacity:def.resourceCapacity||1200,cargo:0,state:'docked',targetResourceEntityId:null,refineryEntityId,autoHarvest:false,harvestRate:def.harvestRate||120,unloadRate:def.unloadRate||600,creditPerUnit:def.creditPerUnit||1,unloadedThisTrip:0},docked:{refineryEntityId,state:'parked',dockSocket:'HarvesterDockSocket',alignSocket:def.dockAlignSocket||'RefineryDockAlignSocket'}},'player');root.userData.skirmishEntityId=e.id;
    const view={entityId:e.id,root,source,axis,definition:def,archetype:'fieldHarvester',dockedTo:refineryEntityId,rotorMain:null,rotorTail:null,wheels:['FrontLeftWheelSpinRoot','FrontRightWheelSpinRoot','MidLeftWheelSpinRoot','MidRightWheelSpinRoot','RearLeftWheelSpinRoot','RearRightWheelSpinRoot'].map(n=>source.getObjectByName(n)).filter(Boolean),collector:source.getObjectByName('CollectorDrumRoot'),dumpDoors:[source.getObjectByName('HopperDoorLeftRoot'),source.getObjectByName('HopperDoorRightRoot')].filter(Boolean)};
    this._attachPresentationShadow(view,{air:false});this.supportUnits.push(view);b.starterUnitSpawned=true;this.renderEvents.push({type:'message',message:'Field Refinery complete · starter Field Harvester docked inside the unload bay.'});return true;
  }

  async _spawnStartingConstructionYard(){
    const start=this.mapForge.metadata.startRegions[0],e=this.sim.createEntity('building',this._buildingComponents('constructionYard',start.x,start.y,{owner:'player',complete:true}),'player');await this._createBuildingView(e,{name:'PLAYER_TacticalCommandPost'});
  }
  _enemyStartRegion(){
    const starts=this.mapForge.metadata?.startRegions||[];if(starts.length<2)return null;const p=starts[0];return [...starts.slice(1)].sort((a,b)=>Math.hypot(b.x-p.x,b.y-p.y)-Math.hypot(a.x-p.x,a.y-p.y))[0]||starts[1];
  }
  async _spawnEnemyBuilding(type,x,y,heading,name){
    const e=this.sim.createEntity('building',this._buildingComponents(type,x,y,{owner:'enemy',complete:true}),'enemy');e.components.transform.heading=heading||0;await this._createBuildingView(e,{palette:this.enemyPalette,name:name||`ENEMY_${type}_${e.id}`});this.enemyBaseEntityIds.push(e.id);return e;
  }
  async _spawnEnemySupport(unitType,x,y,heading=0,{altitude=null}={}){
    const def=UNIT_DEFINITIONS[unitType],archetype=this._supportArchetypeForUnit(unitType);if(!def||!archetype)return null;const loc=LOCOMOTORS[def.locomotor],ground=this.mapForge.surfaceHeightAt(x,y),z=loc.movementClass==='air'?ground+(altitude??loc.preferredAltitude??26):ground-.1;
    const components={unitType:def.id,owner:'enemy',transform:{x,y,z,heading},health:{current:def.maxHp,max:def.maxHp,destroyed:false},locomotor:{...loc},move:{waypoints:[],index:0,moving:false,state:'guard',order:'guard',destination:null,stuckSeconds:0},combat:{targetId:null,state:'guard'}};
    if(def.primaryWeapon){const w=WEAPONS[def.primaryWeapon];components.weapon={id:def.primaryWeapon,cooldown:0};if(def.id==='aegisMbt')components.turret={yaw:0,pitch:0,yawRate:1.9,pitchRate:.8,aimPoint:null};}
    if(def.id==='aegisHarvester')components.resource={capacity:def.resourceCapacity||1200,cargo:0,state:'idle',targetResourceEntityId:null,refineryEntityId:null,autoHarvest:false,harvestRate:def.harvestRate||120,unloadRate:def.unloadRate||600,creditPerUnit:def.creditPerUnit||1,unloadedThisTrip:0};
    const e=this.sim.createEntity('unit',components,'enemy');await this._createSupportUnitView(e,archetype,{name:`ENEMY_${def.id}_${e.id}`});this.enemyBaseEntityIds.push(e.id);return e;
  }
  async _spawnEnemyRifleman(x,y,heading=0){
    const def=UNIT_DEFINITIONS.aegisRifleman,loc=LOCOMOTORS[def.locomotor],weapon=WEAPONS[def.primaryWeapon],e=this.sim.createEntity('unit',{unitType:def.id,owner:'enemy',transform:{x,y,z:this.mapForge.surfaceHeightAt(x,y)+.04,heading},health:{current:def.maxHp,max:def.maxHp,destroyed:false},locomotor:{...loc},move:{waypoints:[],index:0,moving:false,state:'guard',order:'guard'},weapon:{id:weapon.id,cooldown:0},combat:{targetId:null,state:'guard'}},'enemy');await this._createRiflemanView(e);this.enemyBaseEntityIds.push(e.id);return e;
  }
  async _spawnEnemySandboxBase(){
    const start=this._enemyStartRegion();if(!start)return;const toward=new THREE.Vector2(-start.x,-start.y).normalize(),side=new THREE.Vector2(-toward.y,toward.x),heading=Math.atan2(toward.y,toward.x),pt=(f,s)=>({x:start.x+toward.x*f+side.x*s,y:start.y+toward.y*f+side.y*s});
    const layout=[['constructionYard',0,0,'ENEMY_CommandPost'],['powerPlant',-34,-27,'ENEMY_PowerNode'],['refinery',-30,30,'ENEMY_Refinery'],['barracks',30,-31,'ENEMY_Barracks'],['vehicleFactory',34,34,'ENEMY_VehicleFactory'],['gunTurret',60,-22,'ENEMY_Guardian_Left'],['gunTurret',60,22,'ENEMY_Guardian_Right']];
    const spawned={};for(const [type,f,s,name] of layout){const p=pt(f,s);spawned[name]=await this._spawnEnemyBuilding(type,p.x,p.y,heading,name);}
    const unitSpecs=[['aegisMbt',46,0],['aegisHmmwv',38,-14],['aegisHarvester',-18,24],['aegisTalon',18,18]];for(const [type,f,s] of unitSpecs){const p=pt(f,s),def=UNIT_DEFINITIONS[type],open=LOCOMOTORS[def.locomotor].movementClass==='air'?p:this._findOpenGroundSpawn(def,p.x,p.y,heading);await this._spawnEnemySupport(type,open.x,open.y,heading,{altitude:type==='aegisTalon'?24:null});}
    for(const [f,s] of [[49,-10],[49,10],[42,-20],[42,20]]){const p=pt(f,s);await this._spawnEnemyRifleman(p.x,p.y,heading);}
    const focus=spawned.ENEMY_CommandPost?.components?.transform;if(focus)this.aimPoint.set(focus.x,focus.y,focus.z+5);this.renderEvents.push({type:'message',message:'Crimson forward base deployed on the opposing start · hostile Guardian Turrets are active.'});
  }


  selectBuild(type){if(!RTS_BUILDINGS[type]||type==='constructionYard'){this.pendingBuild=null;this._emit('Build selection cleared.');return;}this.pendingBuild=type;this._emit(`${RTS_BUILDINGS[type].label} selected · $${RTS_BUILDINGS[type].cost}. Tap buildable terrain near your structures.`);}
  cancelBuild(){this.pendingBuild=null;this._emit('Build placement cancelled.');}
  _isBuildableFootprint(x,y,def){const [w,d]=def.footprint,samples=[[0,0],[w*.42,d*.42],[w*.42,-d*.42],[-w*.42,d*.42],[-w*.42,-d*.42]];return samples.every(([ox,oy])=>this.mapForge.buildableAt(x+ox,y+oy));}
  _withinBuildRadius(x,y){return this.buildings.some(v=>{const e=this.sim.entities.get(v.entityId);return e&&e.components.owner==='player'&&e.components.construction?.complete&&Math.hypot(x-e.components.transform.x,y-e.components.transform.y)<=Math.max(85,v.def.buildRadius||105);});}
  _rectAxes(heading=0){const c=Math.cos(heading),s=Math.sin(heading);return [[c,s],[-s,c]];}
  _rectsOverlap(a,b,gap=1.25){
    const aa=this._rectAxes(a.heading||0),ba=this._rectAxes(b.heading||0),delta=[b.x-a.x,b.y-a.y],axes=[aa[0],aa[1],ba[0],ba[1]],ah=[a.footprint[0]*.5,a.footprint[1]*.5],bh=[b.footprint[0]*.5,b.footprint[1]*.5],dot=(u,v)=>u[0]*v[0]+u[1]*v[1];
    for(const axis of axes){const ra=ah[0]*Math.abs(dot(aa[0],axis))+ah[1]*Math.abs(dot(aa[1],axis)),rb=bh[0]*Math.abs(dot(ba[0],axis))+bh[1]*Math.abs(dot(ba[1],axis));if(Math.abs(dot(delta,axis))>=ra+rb+gap)return false;}return true;
  }
  _collidesBuilding(x,y,def){const candidate={x,y,heading:0,footprint:def.footprint};return this.buildings.some(v=>{const e=this.sim.entities.get(v.entityId);if(!e||e.components.health?.destroyed)return false;const t=e.components.transform,fp=e.components.building?.footprint||v.def.footprint;return this._rectsOverlap(candidate,{x:t.x,y:t.y,heading:t.heading||0,footprint:fp},1.25);});}
  _canPlace(type,x,y){const def=RTS_BUILDINGS[type];if(!def)return {ok:false,message:'Unknown structure.'};if(!this.playerFaction?.canAfford(def.cost))return {ok:false,message:`Not enough credits for ${def.label}.`};if(!this._isBuildableFootprint(x,y,def))return {ok:false,message:'Cannot build there: terrain is too steep, blocked, road/water, or otherwise non-buildable.'};if(!this._withinBuildRadius(x,y))return {ok:false,message:'Cannot build there: outside current construction radius.'};if(this._collidesBuilding(x,y,def))return {ok:false,message:'Cannot build there: another structure is too close.'};return {ok:true};}
  _nearestValidPlacement(type,x,y,{maxRadius=66,step=6}={}){
    const direct=this._canPlace(type,x,y);if(direct.ok)return {x,y,distance:0};
    // Non-spatial failures cannot be solved by moving the footprint.
    if(/Unknown structure|Not enough credits/i.test(direct.message||''))return {error:direct.message};
    // Mobile placement aid: large footprints are easy to tap a few metres off a legal center.
    // Search concentric rings and return the nearest legal center, never a guessed fixed offset.
    for(let r=step;r<=maxRadius;r+=step){
      const points=Math.max(12,Math.ceil((Math.PI*2*r)/step));
      for(let i=0;i<points;i++){
        const a=(i/points)*Math.PI*2+(r/step%2)*.173,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;
        if(this._canPlace(type,px,py).ok)return {x:px,y:py,distance:r};
      }
    }
    return {error:direct.message||'No legal building footprint near that point.'};
  }
  placeSelectedBuilding(x,y){
    const type=this.pendingBuild;if(!type)return false;
    const placement=this._nearestValidPlacement(type,x,y);
    if(placement.error){this._emit(`${placement.error} Try a clearer patch of terrain.`);return false;}
    this.sim.issueCommand(RTS_COMMANDS.BUILD,{type,x:placement.x,y:placement.y},{source:COMMAND_SOURCES.PLAYER});
    this.pendingBuild=null;
    const snapped=placement.distance>0?` · snapped ${Math.round(placement.distance)} m to nearest legal footprint`:'';
    this._emit(`${RTS_BUILDINGS[type].label} placement command queued${snapped}.`);return true;
  }
  _handlePlaceBuildingCommand(cmd){
    const {type,x,y}=cmd.payload,def=RTS_BUILDINGS[type],check=this._canPlace(type,x,y);if(!def||!check.ok){this.renderEvents.push({type:'message',message:check.message||'Build command rejected.'});return;}
    if(!this.playerFaction.spend(def.cost)){this.renderEvents.push({type:'message',message:`Not enough credits for ${def.label}.`});return;}
    this.playerFaction.addPower({supply:def.powerSupply,use:def.powerUse});const e=this.sim.createEntity('building',this._buildingComponents(type,x,y,{owner:'player',complete:false}),'player');this.renderEvents.push({type:'spawnBuilding',entityId:e.id,name:`PLAYER_${type}_${this.buildSerial++}`});this.renderEvents.push({type:'message',message:`${def.label} construction started.`});
  }

  _nearestCompletedRefinery(x,y){
    let best=null,bestD=Infinity;for(const e of this.sim.entities.values()){if(e.kind!=='building'||e.components.owner!=='player'||e.components.buildingType!=='refinery'||!e.components.construction?.complete||e.components.health?.destroyed)continue;const t=e.components.transform,d=Math.hypot(t.x-x,t.y-y);if(d<bestD){bestD=d;best=e;}}return best;
  }
  _refineryDockPoint(refinery){
    const t=refinery?.components?.transform,b=refinery?.components?.building,p=b?.harvesterDockProfile?.dock||b?.harvesterDockPoint;if(p)return {x:p.x,y:p.y,z:p.z};if(!t)return null;return this._buildingLocalPoint(refinery,[0,-5,.15]);
  }
  _refineryDockProfile(refinery){
    const b=refinery?.components?.building,p=b?.harvesterDockProfile;if(p)return p;const dock=this._refineryDockPoint(refinery);if(!dock)return null;return {approach:this._buildingLocalPoint(refinery,[0,-12,.12]),dock,exit:this._buildingLocalPoint(refinery,[0,-12,.12]),rally:this._buildingLocalPoint(refinery,[0,-18,.10])};
  }
  _pointInsideRect(x,y,rect,margin=0){
    const axes=this._rectAxes(rect.heading||0),dx=x-rect.x,dy=y-rect.y,lx=dx*axes[0][0]+dy*axes[0][1],ly=dx*axes[1][0]+dy*axes[1][1],hx=rect.footprint[0]*.5+margin,hy=rect.footprint[1]*.5+margin;return Math.abs(lx)<hx&&Math.abs(ly)<hy;
  }
  _routeBlockRects(e,{ignoreBuildingIds=[],includeDynamicUnits=false}={}){
    const ignore=new Set(ignoreBuildingIds.filter(Boolean)),def=UNIT_DEFINITIONS[e.components.unitType]||{},fp=def.collisionFootprint||[(def.collisionRadius||1)*2,(def.collisionRadius||1)*2],clearance=Math.min(fp[0],fp[1])*.44+.28,rects=[];
    for(const other of this.sim.entities.values()){
      if(other.components.health?.destroyed||ignore.has(other.id))continue;
      if(['building','target'].includes(other.kind)){
        const r=this._buildingCollisionRect(other);rects.push({entityId:other.id,kind:'building',dynamic:false,x:r.x,y:r.y,heading:r.heading,footprint:[r.footprint[0]+clearance*2,r.footprint[1]+clearance*2]});continue;
      }
      if(!includeDynamicUnits||other.id===e.id||!this._isGroundUnit(other)||this._isInfantry(other))continue;
      // Ground vehicles are temporary route obstacles. Infantry does not hard-block the
      // route graph; its soft separation system handles soldier-to-soldier spacing.
      const r=this._unitCollisionRect(other),unitClearance=Math.max(.35,Math.min(fp[0],fp[1])*.28);
      rects.push({entityId:other.id,kind:'unit',dynamic:true,x:r.x,y:r.y,heading:r.heading,footprint:[r.footprint[0]+unitClearance*2,r.footprint[1]+unitClearance*2]});
    }
    return rects;
  }
  _segmentClearForUnit(e,a,b,{ignoreBuildingIds=[],includeDynamicUnits=false}={}){
    const loc=e.components.locomotor,kind=loc?.movementClass||'tracked',rects=this._routeBlockRects(e,{ignoreBuildingIds,includeDynamicUnits}),dist=Math.hypot(b.x-a.x,b.y-a.y),steps=Math.max(1,Math.ceil(dist/2.5));
    for(let i=0;i<=steps;i++){
      const u=i/steps,x=a.x+(b.x-a.x)*u,y=a.y+(b.y-a.y)*u;if(!this.mapForge.movementAt(x,y,kind).allowed)return false;
      for(const r of rects){
        // If two friendly vehicles begin close together, allow the first few metres of a
        // segment to escape that crowd instead of declaring every route impossible.
        if(r.dynamic&&Math.hypot(x-a.x,y-a.y)<2.25)continue;
        if(this._pointInsideRect(x,y,r,.05))return false;
      }
    }
    return true;
  }
  _nearestOpenUnitDestination(e,x,y){
    const loc=e.components.locomotor,kind=loc?.movementClass||'tracked',heading=e.components.transform.heading||0,infantry=this._isInfantry(e),poseOpts=infantry?{gap:.06,ignoreInfantry:true}:{gap:.18};
    if(this.mapForge.movementAt(x,y,kind).allowed&&this._unitPoseAllowed(e,x,y,heading,poseOpts))return {x,y,z:this.mapForge.surfaceHeightAt(x,y)-.1};
    for(let r=2;r<=34;r+=2){const pts=Math.max(12,Math.ceil(Math.PI*2*r/3));for(let i=0;i<pts;i++){const a=(i/pts)*Math.PI*2,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;if(!this.mapForge.movementAt(px,py,kind).allowed)continue;if(this._unitPoseAllowed(e,px,py,heading,poseOpts))return {x:px,y:py,z:this.mapForge.surfaceHeightAt(px,py)-.1};}}return null;
  }
  _planGroundRoute(e,toX,toY,{fromX=null,fromY=null,ignoreBuildingIds=[]}={}){
    const t=e.components.transform,sx=fromX??t.x,sy=fromY??t.y,loc=e.components.locomotor,kind=loc?.movementClass||'tracked',goal=this._nearestOpenUnitDestination(e,toX,toY);if(!goal)return [];
    const base=this.mapForge.findPath(sx,sy,goal.x,goal.y,kind);if(!base.length)return [];const start={x:sx,y:sy,z:this.mapForge.surfaceHeightAt(sx,sy)-.1},nodes=[start,...base.map(p=>({x:p.x,y:p.y,z:p.z}))],goalIndex=nodes.length-1,rects=this._routeBlockRects(e,{ignoreBuildingIds,includeDynamicUnits:true});
    for(const r of rects){const axes=this._rectAxes(r.heading||0),pad=r.dynamic?.30:.45,hx=r.footprint[0]*.5+pad,hy=r.footprint[1]*.5+pad;for(const [lx,ly] of [[-hx,-hy],[hx,-hy],[hx,hy],[-hx,hy]]){const x=r.x+axes[0][0]*lx+axes[1][0]*ly,y=r.y+axes[0][1]*lx+axes[1][1]*ly;if(this.mapForge.movementAt(x,y,kind).allowed)nodes.push({x,y,z:this.mapForge.surfaceHeightAt(x,y)-.1});}}
    const n=nodes.length,dist=new Float64Array(n),prev=new Int32Array(n),used=new Uint8Array(n);dist.fill(Infinity);prev.fill(-1);dist[0]=0;
    for(let iter=0;iter<n;iter++){let u=-1,best=Infinity;for(let i=0;i<n;i++)if(!used[i]&&dist[i]<best){best=dist[i];u=i;}if(u<0)break;if(u===goalIndex)break;used[u]=1;for(let v=1;v<n;v++){if(v===u||used[v])continue;const a=nodes[u],b=nodes[v];if(!this._segmentClearForUnit(e,a,b,{ignoreBuildingIds,includeDynamicUnits:true}))continue;const nd=dist[u]+Math.hypot(b.x-a.x,b.y-a.y);if(nd<dist[v]){dist[v]=nd;prev[v]=u;}}}
    if(!Number.isFinite(dist[goalIndex]))return [];const out=[];let cur=goalIndex;while(cur>0){out.push(nodes[cur]);cur=prev[cur];if(cur<0)return [];}out.reverse();return out;
  }
  _containingBuilding(e){
    const rect=this._unitCollisionRect(e),hits=[];for(const other of this.sim.entities.values()){if(other.components.health?.destroyed||!['building','target'].includes(other.kind))continue;const depth=this._rectOverlapDepth(rect,this._buildingCollisionRect(other),.02);if(depth>0)hits.push({entity:other,depth});}hits.sort((a,b)=>b.depth-a.depth);return hits[0]?.entity||null;
  }
  _findBuildingEgressPoint(e,building,targetX,targetY){
    const br=this._buildingCollisionRect(building),axes=this._rectAxes(br.heading||0),def=UNIT_DEFINITIONS[e.components.unitType]||{},fp=def.collisionFootprint||[(def.collisionRadius||1)*2,(def.collisionRadius||1)*2],clearance=Math.max(2.6,Math.min(fp[0],fp[1])*.65+1.35),rx=br.footprint[0]*.5+Math.max(fp[0],fp[1])*.58+clearance,ry=br.footprint[1]*.5+Math.max(fp[0],fp[1])*.58+clearance,candidates=[];
    for(let i=0;i<36;i++){const a=i/36*Math.PI*2,lx=Math.cos(a)*rx,ly=Math.sin(a)*ry,x=br.x+axes[0][0]*lx+axes[1][0]*ly,y=br.y+axes[0][1]*lx+axes[1][1]*ly;if(!this.mapForge.movementAt(x,y,e.components.locomotor?.movementClass||'tracked').allowed)continue;if(!this._unitFullyOutsideBuilding(e,building,x,y,e.components.transform.heading,.95))continue;if(!this._unitPoseAllowed(e,x,y,e.components.transform.heading,{ignoreBuildingId:building.id,ignoreInfantry:true,gap:.12}))continue;candidates.push({x,y,z:this.mapForge.surfaceHeightAt(x,y)-.1,score:Math.hypot(x-targetX,y-targetY)});}candidates.sort((a,b)=>a.score-b.score);return candidates[0]||null;
  }
  _unitFullyOutsideBuilding(e,building,x=null,y=null,heading=null,margin=.18){
    if(!e||!building)return true;const t=e.components.transform;return this._rectOverlapDepth(this._unitCollisionRect(e,x??t.x,y??t.y,heading??t.heading??0),this._buildingCollisionRect(building),margin)<=0;
  }
  _startControlledEgress(e,building,preferredPoints,target,{state='deploy',order='egress',minimumSafeIndex=0,clearance=.90}={}){
    if(!e||!building)return false;const points=(preferredPoints||[]).filter(Boolean).map(p=>({x:p.x,y:p.y,z:this.mapForge.surfaceHeightAt(p.x,p.y)-.1})),kind=e.components.locomotor?.movementClass||'tracked';let safeIndex=-1,startIndex=Math.max(0,Math.min(points.length-1,minimumSafeIndex||0));
    for(let i=startIndex;i<points.length;i++){const p=points[i];if(!this.mapForge.movementAt(p.x,p.y,kind).allowed)continue;if(this._unitFullyOutsideBuilding(e,building,p.x,p.y,e.components.transform.heading,clearance)&&this._unitPoseAllowed(e,p.x,p.y,e.components.transform.heading,{ignoreBuildingId:building.id,ignoreInfantry:true,gap:.10})){safeIndex=i;break;}}
    if(safeIndex<0){const eg=this._findBuildingEgressPoint(e,building,target.x,target.y);if(!eg)return false;points.push(eg);safeIndex=points.length-1;}
    const corridor=points.slice(0,safeIndex+1),safe=corridor[corridor.length-1],sameGoal=Math.hypot(safe.x-target.x,safe.y-target.y)<2.0,tail=sameGoal?[]:this._planGroundRoute(e,target.x,target.y,{fromX:safe.x,fromY:safe.y,ignoreBuildingIds:[building.id]});
    if(!sameGoal&&!tail.length)return false;return this._installMove(e,[...corridor,...tail],{state,order,destination:{x:target.x,y:target.y},exitBuildingId:building.id,exitBuildingUntilIndex:safeIndex,controlledEgress:true,egressClearance:clearance});
  }
  _tryControlledEgressMove(e,dx,dy){
    const t=e.components.transform,loc=e.components.locomotor,nx=t.x+dx,ny=t.y+dy;if(!this.mapForge.movementAt(nx,ny,loc.movementClass).allowed)return false;
    const blockers=this._unitPoseBlockers(e,nx,ny,t.heading,{ignoreBuildingId:e.components.move?.exitBuildingId||null,ignoreInfantry:true,ignoreUnits:true,gap:.05});
    if(blockers.length)return false;this._moveGroundUnitTo(e,nx,ny);return true;
  }
  _releaseControlledEgressIfClear(e){
    const move=e?.components?.move;if(!move?.controlledEgress)return true;const source=move.exitBuildingId?this.sim.entities.get(move.exitBuildingId):null;if(!source||source.components.health?.destroyed){move.exitBuildingId=null;move.exitBuildingUntilIndex=null;move.controlledEgress=false;return true;}
    if(!this._unitFullyOutsideBuilding(e,source,null,null,null,move.egressClearance||.90))return false;move.exitBuildingId=null;move.exitBuildingUntilIndex=null;move.controlledEgress=false;if(e.components.docked?.state==='departing')e.components.docked.state='enroute';return true;
  }
  _installMove(e,path,{state,order,destination,exitBuildingId=null,exitBuildingUntilIndex=null,controlledEgress=false,egressClearance=.90}={}){
    if(!path?.length)return false;const move=e.components.move||(e.components.move={});move.waypoints=path.map(p=>({...p}));move.index=0;move.moving=true;move.state=state||'moving';move.order=order||'move';move.destination={...destination};move.resolvedDestination={...path[path.length-1]};move.stuckSeconds=0;move.lastProgressX=e.components.transform.x;move.lastProgressY=e.components.transform.y;move.lastProgressSeconds=0;move.exitBuildingId=exitBuildingId;move.exitBuildingUntilIndex=exitBuildingUntilIndex;move.controlledEgress=!!controlledEgress;move.egressClearance=egressClearance;return true;
  }
  _commandMoveEntity(e,x,y,{state='moving',order='move',skipEgress=false}={}){
    if(!e||e.kind!=='unit'||e.components.health?.destroyed)return false;const t=e.components.transform,loc=e.components.locomotor,kind=loc?.movementClass||'tracked';if(kind==='air')return this._installMove(e,[{x,y,z:this.mapForge.surfaceHeightAt(x,y)+(loc.preferredAltitude||28)}],{state,order,destination:{x,y}});
    if(!skipEgress){
      const active=e.components.move;if(active?.controlledEgress&&active.exitBuildingId){const source=this.sim.entities.get(active.exitBuildingId);if(source&&!source.components.health?.destroyed){const end=Math.max(active.index||0,Number.isInteger(active.exitBuildingUntilIndex)?active.exitBuildingUntilIndex:active.index||0),remaining=(active.waypoints||[]).slice(active.index||0,end+1);return this._startControlledEgress(e,source,remaining,{x,y},{state,order,minimumSafeIndex:Math.max(0,remaining.length-1),clearance:active.egressClearance||.90});}}
      const containing=this._containingBuilding(e);if(containing){let prefix=[];if(e.components.unitType==='aegisHarvester'&&e.components.docked?.refineryEntityId===containing.id){const prof=this._refineryDockProfile(containing);prefix=[prof?.exit,prof?.rally].filter(Boolean);}return this._startControlledEgress(e,containing,prefix,{x,y},{state,order,minimumSafeIndex:prefix.length?prefix.length-1:0,clearance:this._isInfantry(e)?0.25:0.90});}
    }
    const path=this._planGroundRoute(e,x,y);return this._installMove(e,path,{state,order,destination:{x,y}});
  }
  _handleMoveCommand(cmd){
    const ids=Array.isArray(cmd.payload.entityIds)?cmd.payload.entityIds:[cmd.payload.entityId].filter(Boolean),point=cmd.payload.point;if(!point)return;let moved=0,failed=0;
    for(const id of ids){const e=this.sim.entities.get(id);if(!e||e.components.owner!=='player'||e.kind!=='unit')continue;if(e.components.unitType==='aegisHarvester'&&e.components.resource){e.components.resource.autoHarvest=false;e.components.resource.targetResourceEntityId=null;e.components.resource.state='moving';}if(this._commandMoveEntity(e,point.x,point.y,{state:'commanded',order:'move'}))moved++;else failed++;}
    this.renderEvents.push({type:'message',message:moved?`${moved>1?moved+' units':'Unit'} moving to ordered position${failed?' · '+failed+' route failed':''}.`:'No traversable route to that position.'});
  }
  _handleStopCommand(cmd){
    const ids=Array.isArray(cmd.payload.entityIds)?cmd.payload.entityIds:[cmd.payload.entityId].filter(Boolean);for(const id of ids){const e=this.sim.entities.get(id);if(!e?.components?.move)continue;e.components.move.moving=false;e.components.move.state='stopped';e.components.move.order='stop';if(e.components.resource){e.components.resource.autoHarvest=false;e.components.resource.state=e.components.resource.cargo>0?'holding':'idle';}}
  }
  _beginHarvestTrip(harvester,target){
    const r=harvester?.components?.resource,field=target?.components?.resourceField;if(!r||!field||field.remaining<=0)return false;const hp=field.harvestPoint||target.components.transform;r.targetResourceEntityId=target.id;r.autoHarvest=true;r.state='toResource';if(r.refineryEntityId)harvester.components.docked={...(harvester.components.docked||{}),refineryEntityId:r.refineryEntityId,state:'departing'};const ok=this._commandMoveEntity(harvester,hp.x,hp.y,{state:'toResource',order:'harvest'});if(ok)r.harvestApproach={...harvester.components.move.resolvedDestination};else r.state='idle';return ok;
  }
  _beginReturnCargo(harvester){
    const r=harvester?.components?.resource;if(!r)return false;let refinery=r.refineryEntityId?this.sim.entities.get(r.refineryEntityId):null;if(!refinery||refinery.components.health?.destroyed||!refinery.components.construction?.complete){const t=harvester.components.transform;refinery=this._nearestCompletedRefinery(t.x,t.y);}
    if(!refinery){r.state='holding';this.renderEvents.push({type:'message',message:'Harvester is carrying minerals but no completed Refinery is available.'});return false;}r.refineryEntityId=refinery.id;harvester.components.docked={...(harvester.components.docked||{}),refineryEntityId:refinery.id,state:'returning'};const profile=this._refineryDockProfile(refinery),approach=profile?.approach||profile?.rally||this._refineryDockPoint(refinery);if(!approach)return false;r.state='toRefinery';r.unloadedThisTrip=0;const ok=this._commandMoveEntity(harvester,approach.x,approach.y,{state:'toRefinery',order:'returnCargo'});if(ok)r.refineryApproach={...harvester.components.move.resolvedDestination};else{r.state='holding';this.renderEvents.push({type:'message',message:'Harvester cannot find a traversable route back to the Refinery.'});}return ok;
  }
  _handleHarvestCommand(cmd){
    const harvester=this.sim.entities.get(cmd.payload.entityId),target=this._resourceFieldByZone(cmd.payload.zoneId);if(!harvester||harvester.components.unitType!=='aegisHarvester'||harvester.components.owner!=='player'){this.renderEvents.push({type:'message',message:'Select a Field Harvester before ordering a mineral harvest.'});return;}if(!target?.components?.resourceField||target.components.resourceField.remaining<=0){this.renderEvents.push({type:'message',message:'That mineral field is exhausted.'});return;}
    const t=harvester.components.transform,refinery=this._nearestCompletedRefinery(t.x,t.y);if(!refinery){this.renderEvents.push({type:'message',message:'Build and complete a Field Refinery before harvesting minerals.'});return;}const r=harvester.components.resource;r.refineryEntityId=refinery.id;r.autoHarvest=true;if(r.cargo>=r.capacity-.01){this._beginReturnCargo(harvester);return;}if(this._beginHarvestTrip(harvester,target))this.renderEvents.push({type:'message',message:`Harvester ordered to ${target.components.resourceField.richness.toUpperCase()} mineral field · ${Math.round(target.components.resourceField.remaining)} remaining.`});else this.renderEvents.push({type:'message',message:'No traversable Harvester route to that mineral field.'});
  }
  _handleReturnCargoCommand(cmd){const e=this.sim.entities.get(cmd.payload.entityId);if(e?.components?.unitType==='aegisHarvester')this._beginReturnCargo(e);}
  _findNearestAvailableResource(harvester){const t=harvester.components.transform;let best=null,bestD=Infinity;for(const e of this.sim.entities.values()){const f=e.components.resourceField;if(e.kind!=='resource'||!f||f.remaining<=0)continue;const hp=f.harvestPoint||e.components.transform,d=Math.hypot(hp.x-t.x,hp.y-t.y);if(d<bestD){bestD=d;best=e;}}return best;}
  _systemHarvesterEconomy(dt){
    const def=UNIT_DEFINITIONS.aegisHarvester;
    for(const e of this.sim.entities.values()){
      if(e.kind!=='unit'||e.components.unitType!==def.id||e.components.health?.destroyed||!e.components.resource)continue;const r=e.components.resource,t=e.components.transform,move=e.components.move;
      if(r.state==='toResource'){
        const target=this.sim.entities.get(r.targetResourceEntityId),field=target?.components?.resourceField;if(!field||field.remaining<=0){if(r.cargo>0)this._beginReturnCargo(e);else{const next=this._findNearestAvailableResource(e);if(next)this._beginHarvestTrip(e,next);else{r.state='idle';r.autoHarvest=false;}}continue;}const hp=field.harvestPoint||target.components.transform,approach=r.harvestApproach||hp;if(!move?.moving&&Math.hypot(t.x-approach.x,t.y-approach.y)<=4.2){r.state='harvesting';move.state='harvesting';move.order='harvest';}
      }else if(r.state==='harvesting'){
        const target=this.sim.entities.get(r.targetResourceEntityId),field=target?.components?.resourceField;if(!field||field.remaining<=0){if(r.cargo>0)this._beginReturnCargo(e);continue;}const room=Math.max(0,r.capacity-r.cargo),amount=Math.min(field.remaining,room,(r.harvestRate||def.harvestRate||120)*dt);if(amount>0){field.remaining=Math.max(0,field.remaining-amount);r.cargo=Math.min(r.capacity,r.cargo+amount);const zone=this.mapForge.metadata?.resourceZones?.find(z=>z.id===field.zoneId);if(zone){zone.remainingCapacity=field.remaining;const total=Math.max(1,zone.visualClusterCount||1),bucket=field.remaining<=0?0:Math.max(1,Math.ceil(total*(field.remaining/field.capacity)));if(bucket!==field.visualBucket){field.visualBucket=bucket;this.mapForge.setResourceFieldFraction?.(field.zoneId,field.remaining/field.capacity);}}}
        if(field.remaining<=.001){field.remaining=0;this.mapForge.setResourceFieldFraction?.(field.zoneId,0);this.renderEvents.push({type:'message',message:`${field.richness.toUpperCase()} mineral field exhausted.`});}if(r.cargo>=r.capacity-.01||field.remaining<=0){if(r.cargo>0)this._beginReturnCargo(e);else{const next=this._findNearestAvailableResource(e);if(next)this._beginHarvestTrip(e,next);else{r.state='idle';r.autoHarvest=false;}}}
      }else if(r.state==='toRefinery'){
        const refinery=this.sim.entities.get(r.refineryEntityId),profile=this._refineryDockProfile(refinery),approach=r.refineryApproach||profile?.approach||profile?.rally;if(!refinery||refinery.components.health?.destroyed||!profile?.dock){r.state='holding';continue;}if(!move?.moving&&approach&&Math.hypot(t.x-approach.x,t.y-approach.y)<=4.0){const dockPath=[profile.dock].filter(Boolean);this._installMove(e,dockPath,{state:'docking',order:'returnCargo',destination:{x:profile.dock.x,y:profile.dock.y},exitBuildingId:refinery.id,exitBuildingUntilIndex:dockPath.length-1});r.state='docking';e.components.docked={...(e.components.docked||{}),refineryEntityId:refinery.id,state:'docking'};}
      }else if(r.state==='docking'){
        const refinery=this.sim.entities.get(r.refineryEntityId),dock=this._refineryDockPoint(refinery);if(!refinery||!dock){r.state='holding';continue;}if(!move?.moving&&Math.hypot(t.x-dock.x,t.y-dock.y)<=4.0){r.state='unloading';move.state='unloading';e.components.docked={...(e.components.docked||{}),refineryEntityId:refinery.id,state:'unloading'};}
      }else if(r.state==='unloading'){
        const amount=Math.min(r.cargo,(r.unloadRate||def.unloadRate||600)*dt);if(amount>0){r.cargo=Math.max(0,r.cargo-amount);const value=amount*(r.creditPerUnit||def.creditPerUnit||1);this.playerFaction?.credit(value);this.harvestCredits+=value;r.unloadedThisTrip=(r.unloadedThisTrip||0)+value;}
        if(r.cargo<=.001){r.cargo=0;const delivered=Math.round(r.unloadedThisTrip||0);r.unloadedThisTrip=0;this.renderEvents.push({type:'message',message:`Harvester unloaded minerals · +$${delivered.toLocaleString()} credits.`});const current=this.sim.entities.get(r.targetResourceEntityId);if(r.autoHarvest&&current?.components?.resourceField?.remaining>0)this._beginHarvestTrip(e,current);else if(r.autoHarvest){const next=this._findNearestAvailableResource(e);if(next)this._beginHarvestTrip(e,next);else{r.state='docked';r.autoHarvest=false;e.components.docked={...(e.components.docked||{}),state:'parked'};this.renderEvents.push({type:'message',message:'All known mineral fields are exhausted.'});}}else{r.state='docked';e.components.docked={...(e.components.docked||{}),state:'parked'};}}
      }
    }
  }

  _screenDistanceToWorld(clientX,clientY,rect,x,y,z){
    const p=new THREE.Vector3(x,y,z).project(this.camera);if(p.z<-1||p.z>1)return Infinity;const sx=rect.left+(p.x*.5+.5)*rect.width,sy=rect.top+(-p.y*.5+.5)*rect.height;return Math.hypot(clientX-sx,clientY-sy);
  }
  _assistedFriendlyPick(clientX,clientY,rect,{excludeId=null,deliberate=false}={}){
    let best=null,bestD=Infinity;const mobile=rect.width<900;
    for(const e of this.sim.entities.values()){
      if(e.kind!=='unit'||e.components.owner!=='player'||e.components.health?.destroyed||e.id===excludeId)continue;
      const t=e.components.transform,infantry=e.components.unitType==='aegisRifleman',radius=deliberate?(mobile?(infantry?18:20):(infantry?15:17)):(mobile?(infantry?54:46):(infantry?34:30)),z=(t.z??this.mapForge.surfaceHeightAt(t.x,t.y))+(infantry?1.0:1.5),d=this._screenDistanceToWorld(clientX,clientY,rect,t.x,t.y,z);
      if(d<=radius&&d<bestD){bestD=d;best=e;}
    }
    return best;
  }
  _assistedResourcePick(clientX,clientY,rect){
    let best=null,bestD=Infinity;const radius=rect.width<900?62:40;for(const e of this.sim.entities.values()){const f=e.components.resourceField;if(e.kind!=='resource'||!f||f.remaining<=0)continue;const p=f.harvestPoint||e.components.transform,z=this.mapForge.surfaceHeightAt(p.x,p.y)+1.2,d=this._screenDistanceToWorld(clientX,clientY,rect,p.x,p.y,z);if(d<=radius&&d<bestD){bestD=d;best=e;}}return best;
  }
  _terrainPointFromPointer(){
    const ray=this.raycaster.ray,dir=ray.direction;if(Math.abs(dir.z)<1e-5)return null;const size=this.mapForge.recipe?.size||1024,H=size*.5;let targetZ=this.controls.target?.z||0,t=(targetZ-ray.origin.z)/dir.z;if(!Number.isFinite(t)||t<0)t=(-ray.origin.z)/dir.z;
    let x=0,y=0,z=0;for(let i=0;i<5;i++){x=ray.origin.x+dir.x*t;y=ray.origin.y+dir.y*t;x=clamp(x,-H,H);y=clamp(y,-H,H);z=this.mapForge.surfaceHeightAt(x,y);const nt=(z-ray.origin.z)/dir.z;if(!Number.isFinite(nt)||nt<0)break;t=nt;}return {x,y,z};
  }
  _showCommandMarker(p){const z=this.mapForge.surfaceHeightAt(p.x,p.y);this.aimMarker.position.set(p.x,p.y,z+.28);this.aimMarker.visible=true;}
  pointerAction(clientX,clientY,rect){
    if(!this.active)return false;this.camera.updateMatrixWorld(true);this.pointer.x=((clientX-rect.left)/rect.width)*2-1;this.pointer.y=-((clientY-rect.top)/rect.height)*2+1;this.raycaster.setFromCamera(this.pointer,this.camera);
    const unitHits=this.raycaster.intersectObjects(this.root.children,true),mapHits=this.raycaster.intersectObjects(this.mapForge.root.children,true),terrainPoint=this._terrainPointFromPointer();
    if(this.pendingBuild){if(!terrainPoint)return false;return this.placeSelectedBuilding(terrainPoint.x,terrainPoint.y);}
    const selected=this._selectedEntity();
    let hostileHit=null;for(const hit of unitHits){const id=this._entityIdFromObject(hit.object),e=id?this.sim.entities.get(id):null;if(e?.components?.owner==='enemy'&&!e.components.health?.destroyed){hostileHit={entity:e,point:hit.point};break;}}
    if(selected){
      // Once a unit is selected, commands own the battlefield. The large first-selection
      // touch halo no longer steals terrain taps; switching units requires a deliberate
      // tap close to the other unit's screen-space center.
      if(selected.components.unitType==='aegisHarvester'){
        let resourceTarget=null;for(const hit of mapHits){const zoneId=this._resourceZoneIdFromHit(hit);if(!zoneId)continue;resourceTarget=this._resourceFieldByZone(zoneId)||null;if(resourceTarget)break;}
        if(!resourceTarget)resourceTarget=this._assistedResourcePick(clientX,clientY,rect);
        if(resourceTarget){this.sim.issueCommand(RTS_COMMANDS.HARVEST,{entityId:selected.id,zoneId:resourceTarget.components.resourceField.zoneId},{source:COMMAND_SOURCES.PLAYER});this._showCommandMarker(resourceTarget.components.resourceField.harvestPoint||resourceTarget.components.transform);this._emit('Harvest order queued.');return true;}
      }
      if(hostileHit&&selected.id===this.tank?.entityId){const ht=hostileHit.entity.components.transform,p=hostileHit.point||new THREE.Vector3(ht.x,ht.y,ht.z+2.5),aim={x:p.x,y:p.y,z:p.z};this.aimPoint.set(aim.x,aim.y,aim.z);this._showCommandMarker({x:aim.x,y:aim.y});this.sim.issueCommand(RTS_COMMANDS.AIM,{entityId:selected.id,point:aim},{source:COMMAND_SOURCES.PLAYER});this._emit(`Hostile ${RTS_BUILDINGS[hostileHit.entity.components.buildingType]?.label||UNIT_DEFINITIONS[hostileHit.entity.components.unitType]?.label||'target'} acquired · FIRE MAIN GUN.`);return true;}
      let directFriendly=null;for(const hit of unitHits){const id=this._entityIdFromObject(hit.object),e=id?this.sim.entities.get(id):null;if(e?.kind==='unit'&&e.components.owner==='player'&&!e.components.health?.destroyed&&e.id!==selected.id){directFriendly=e;break;}}if(directFriendly)return this._selectEntity(directFriendly.id);
      const switchTarget=this._assistedFriendlyPick(clientX,clientY,rect,{excludeId:selected.id,deliberate:true});if(switchTarget)return this._selectEntity(switchTarget.id);
      if(!terrainPoint)return false;const loc=selected.components.locomotor,ground=(loc?.movementClass||'tracked')!=='air',resolved=ground?this._nearestOpenUnitDestination(selected,terrainPoint.x,terrainPoint.y):terrainPoint;
      if(!resolved){this._emit('BLOCKED · no traversable destination near that tap.');return true;}
      const z=this.mapForge.surfaceHeightAt(resolved.x,resolved.y)+.5;this.aimPoint.set(resolved.x,resolved.y,z);this._showCommandMarker(resolved);this.sim.issueCommand(RTS_COMMANDS.MOVE,{entityIds:[selected.id],point:{x:resolved.x,y:resolved.y}},{source:COMMAND_SOURCES.PLAYER});if(selected.id===this.tank?.entityId)this.sim.issueCommand(RTS_COMMANDS.AIM,{entityId:selected.id,point:{x:resolved.x,y:resolved.y,z}},{source:COMMAND_SOURCES.PLAYER});const snapped=Math.hypot(resolved.x-terrainPoint.x,resolved.y-terrainPoint.y)>1.0?' · snapped to nearby traversable ground':'';this._emit(`${UNIT_DEFINITIONS[selected.components.unitType]?.label||'Unit'} move order queued${snapped}.`);return true;
    }
    // With nothing selected, keep the generous touch assist that made tiny infantry easy
    // to acquire on iPhone.
    for(const hit of unitHits){const id=this._entityIdFromObject(hit.object);if(!id)continue;const e=this.sim.entities.get(id);if(e?.kind==='unit'&&e.components.owner==='player'&&!e.components.health?.destroyed)return this._selectEntity(id);}
    const assistedUnit=this._assistedFriendlyPick(clientX,clientY,rect);if(assistedUnit)return this._selectEntity(assistedUnit.id);
    if(hostileHit){const ht=hostileHit.entity.components.transform,p=hostileHit.point||new THREE.Vector3(ht.x,ht.y,ht.z+2.5),aim={x:p.x,y:p.y,z:p.z};this.aimPoint.set(aim.x,aim.y,aim.z);this._showCommandMarker({x:aim.x,y:aim.y});if(this.tank&&!this.sim.entities.get(this.tank.entityId)?.components.health?.destroyed)this.sim.issueCommand(RTS_COMMANDS.AIM,{entityId:this.tank.entityId,point:aim},{source:COMMAND_SOURCES.PLAYER});this._emit(`Hostile ${RTS_BUILDINGS[hostileHit.entity.components.buildingType]?.label||UNIT_DEFINITIONS[hostileHit.entity.components.unitType]?.label||'target'} acquired.`);return true;}
    if(!terrainPoint)return false;const z=this.mapForge.surfaceHeightAt(terrainPoint.x,terrainPoint.y)+.5;this.aimPoint.set(terrainPoint.x,terrainPoint.y,z);this._showCommandMarker(terrainPoint);if(this.tank&&!this.sim.entities.get(this.tank.entityId)?.components.health?.destroyed)this.sim.issueCommand(RTS_COMMANDS.AIM,{entityId:this.tank.entityId,point:{x:terrainPoint.x,y:terrainPoint.y,z}},{source:COMMAND_SOURCES.PLAYER});this._emit('Tap a friendly unit to select it, then tap terrain to move.');return true;
  }

  fire(){const e=this.tank&&this.sim.entities.get(this.tank.entityId);if(!e||e.components.health?.destroyed||e.components.weapon.cooldown>0)return false;this.sim.issueCommand(RTS_COMMANDS.FIRE,{entityId:e.id},{source:COMMAND_SOURCES.PLAYER});this._emit('Fire command queued.');return true;}
  _handleFireCommand(cmd){
    const e=this.sim.entities.get(cmd.payload.entityId);if(!e||e.components.health?.destroyed)return;const weapon=WEAPONS[e.components.weapon?.id];if(!weapon||e.components.weapon.cooldown>0)return;
    const t=e.components.transform,tur=e.components.turret,worldYaw=t.heading+tur.yaw,pitch=tur.pitch,cp=Math.cos(pitch),dir={x:Math.cos(worldYaw)*cp,y:Math.sin(worldYaw)*cp,z:Math.sin(pitch)};
    let pos={x:t.x+Math.cos(worldYaw)*7,y:t.y+Math.sin(worldYaw)*7,z:t.z+2.8};
    if(this.tank?.muzzle){this.tank.root.updateMatrixWorld(true);this.tank.muzzle.updateMatrixWorld(true);const wp=new THREE.Vector3();this.tank.muzzle.getWorldPosition(wp);pos={x:wp.x,y:wp.y,z:wp.z};}
    const p=this.sim.createEntity('projectile',{owner:e.components.owner||'player',transform:{x:pos.x,y:pos.y,z:pos.z},projectile:{vx:dir.x*weapon.projectileSpeed,vy:dir.y*weapon.projectileSpeed,vz:dir.z*weapon.projectileSpeed,gravity:weapon.gravity,life:weapon.lifeSeconds,damage:weapon.damage,sourceEntityId:e.id,weaponId:weapon.id}});e.components.weapon.cooldown=weapon.reloadSeconds;this.renderEvents.push({type:'spawnProjectile',entityId:p.id});this.renderEvents.push({type:'muzzleFlash',position:pos});this.renderEvents.push({type:'message',message:'Main gun fired.'});
  }

  _systemWeapons(dt){for(const e of this.sim.entities.values()){if(e.components.weapon)e.components.weapon.cooldown=Math.max(0,e.components.weapon.cooldown-dt);}}
  _definitionCollisionRect(def,x,y,heading=0){
    const diameter=(def?.personalSpace||((def?.collisionRadius||.4)*2)),fp=def?.collisionFootprint||[diameter,diameter];
    return {x,y,heading:(heading||0)+(def?.collisionHeadingOffset||0),footprint:[fp[0],fp[1]]};
  }
  _unitCollisionRect(e,x=null,y=null,heading=null){
    const t=e.components.transform||{},def=UNIT_DEFINITIONS[e.components.unitType]||{},px=x??t.x,py=y??t.y,ph=heading??t.heading??0;
    return this._definitionCollisionRect(def,px,py,ph);
  }
  _buildingCollisionRect(e){
    const t=e.components.transform||{},fp=e.components.building?.collisionFootprint||e.components.building?.footprint||[8,8];
    return {x:t.x,y:t.y,heading:t.heading||0,footprint:[fp[0],fp[1]]};
  }
  _isGroundUnit(e){return e?.kind==='unit'&&!e.components.health?.destroyed&&e.components.locomotor?.movementClass!=='air';}
  _isInfantry(e){return e?.components?.unitType==='aegisRifleman';}
  _rectOverlapDepth(a,b,gap=0){
    const aa=this._rectAxes(a.heading||0),ba=this._rectAxes(b.heading||0),delta=[b.x-a.x,b.y-a.y],axes=[aa[0],aa[1],ba[0],ba[1]],ah=[a.footprint[0]*.5,a.footprint[1]*.5],bh=[b.footprint[0]*.5,b.footprint[1]*.5],dot=(u,v)=>u[0]*v[0]+u[1]*v[1];let minPen=Infinity;
    for(const axis of axes){const ra=ah[0]*Math.abs(dot(aa[0],axis))+ah[1]*Math.abs(dot(aa[1],axis)),rb=bh[0]*Math.abs(dot(ba[0],axis))+bh[1]*Math.abs(dot(ba[1],axis)),pen=ra+rb+gap-Math.abs(dot(delta,axis));if(pen<=0)return 0;minPen=Math.min(minPen,pen);}return minPen;
  }
  _collisionBlockersForRect(rect,{ignoreEntityId=null,ignoreBuildingId=null,ignoreInfantry=false,ignoreUnits=false,gap=.08}={}){
    const blockers=[];
    for(const other of this.sim.entities.values()){
      if(other.id===ignoreEntityId||other.components.health?.destroyed)continue;
      if(['building','target'].includes(other.kind)){
        if(other.id===ignoreBuildingId)continue;
        const depth=this._rectOverlapDepth(rect,this._buildingCollisionRect(other),gap);if(depth>0)blockers.push({entity:other,kind:'building',rect:this._buildingCollisionRect(other),depth});
      }else if(this._isGroundUnit(other)){
        if(ignoreUnits)continue;if(ignoreInfantry&&this._isInfantry(other))continue;
        const orect=this._unitCollisionRect(other),depth=this._rectOverlapDepth(rect,orect,gap);if(depth>0)blockers.push({entity:other,kind:'unit',rect:orect,depth});
      }
    }
    return blockers;
  }
  _unitPoseBlockers(e,x,y,heading,{ignoreBuildingId=null,ignoreInfantry=false,ignoreUnits=false,gap=.08}={}){
    if(e.components.locomotor?.movementClass==='air')return [];
    const dockState=e.components.docked?.state,dockIgnore=['parked','departing','docking','unloading'].includes(dockState)?e.components.docked?.refineryEntityId:null,effectiveIgnore=ignoreBuildingId||dockIgnore;
    return this._collisionBlockersForRect(this._unitCollisionRect(e,x,y,heading),{ignoreEntityId:e.id,ignoreBuildingId:effectiveIgnore,ignoreInfantry,ignoreUnits,gap});
  }
  _unitPoseCollisionDepth(e,x,y,heading,opts={}){
    return this._unitPoseBlockers(e,x,y,heading,opts).reduce((sum,b)=>sum+b.depth,0);
  }
  _unitPoseAllowed(e,x,y,heading,opts={}){
    return this._unitPoseBlockers(e,x,y,heading,opts).length===0;
  }
  _definitionPoseAllowed(def,x,y,heading,{gap=.08}={}){
    return this._collisionBlockersForRect(this._definitionCollisionRect(def,x,y,heading),{gap}).length===0;
  }
  _findOpenGroundSpawn(def,x,y,heading){
    if(this._definitionPoseAllowed(def,x,y,heading))return {x,y};
    for(let r=3;r<=24;r+=3){
      const points=Math.max(12,Math.ceil(Math.PI*2*r/3));
      for(let i=0;i<points;i++){const a=(i/points)*Math.PI*2,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;if(this.mapForge.movementAt(px,py,LOCOMOTORS[def.locomotor]?.movementClass||'wheeled').allowed&&this._definitionPoseAllowed(def,px,py,heading))return {x:px,y:py};}
    }
    return {x,y};
  }
  _moveGroundUnitTo(e,x,y){
    const t=e.components.transform;t.x=x;t.y=y;t.z=this.mapForge.surfaceHeightAt(x,y)-.1;
  }
  _tryGroundUnitMove(e,dx,dy){
    const t=e.components.transform,loc=e.components.locomotor,nx=t.x+dx,ny=t.y+dy;
    if(!this.mapForge.movementAt(nx,ny,loc.movementClass).allowed)return false;
    const moveOpts={ignoreBuildingId:e.components.move?.exitBuildingId||null};
    const blockers=this._unitPoseBlockers(e,nx,ny,t.heading,moveOpts);
    if(!blockers.length){this._moveGroundUnitTo(e,nx,ny);return true;}
    const candidates=[];
    for(const b of blockers){
      const axes=this._rectAxes(b.rect.heading||0);
      for(const axis of axes){const proj=dx*axis[0]+dy*axis[1];if(Math.abs(proj)>.01)candidates.push([axis[0]*proj,axis[1]*proj]);}
      if(b.kind==='unit'){const ox=t.x-b.rect.x,oy=t.y-b.rect.y,d=Math.hypot(ox,oy)||1,tx=-oy/d,ty=ox/d,proj=dx*tx+dy*ty,mag=Math.max(.06,Math.hypot(dx,dy));if(Math.abs(proj)>.01)candidates.push([tx*proj,ty*proj]);candidates.push([tx*mag*.88,ty*mag*.88],[-tx*mag*.88,-ty*mag*.88]);}
    }
    candidates.push([dx,0],[0,dy]);
    candidates.sort((a,b)=>(b[0]*b[0]+b[1]*b[1])-(a[0]*a[0]+a[1]*a[1]));
    const seen=new Set();
    for(const [sx,sy] of candidates){
      const key=`${sx.toFixed(3)}:${sy.toFixed(3)}`;if(seen.has(key)||Math.hypot(sx,sy)<.01)continue;seen.add(key);
      const px=t.x+sx,py=t.y+sy;if(!this.mapForge.movementAt(px,py,loc.movementClass).allowed)continue;
      if(this._unitPoseAllowed(e,px,py,t.heading,moveOpts)){this._moveGroundUnitTo(e,px,py);return true;}
    }
    return false;
  }
  _systemLocomotion(dt){
    for(const e of this.sim.entities.values()){
      if(e.kind!=='unit'||e.components.health?.destroyed||this._isInfantry(e))continue;const c=e.components,t=c.transform,loc=c.locomotor;if(!loc)continue;
      const input=e.id===this.tank?.entityId?c.input:null,throttle=input?((input.forward?1:0)-(input.back?1:0)):0,turn=input?((input.left?1:0)-(input.right?1:0)):0,manual=!!(throttle||turn);
      if(manual&&loc.movementClass!=='air'){
        if(c.move){c.move.moving=false;c.move.state='manual';c.move.order=null;}
        if(turn){const next=t.heading+turn*loc.turnRate*dt*(Math.abs(throttle)>.01?.72:1),currentDepth=this._unitPoseCollisionDepth(e,t.x,t.y,t.heading),nextDepth=this._unitPoseCollisionDepth(e,t.x,t.y,next);if(nextDepth<=.001||nextDepth<=currentDepth+.002)t.heading=next;}
        if(throttle){const speed=throttle>0?loc.maxSpeed:loc.reverseSpeed,step=speed*dt*throttle;this._tryGroundUnitMove(e,Math.cos(t.heading)*step,Math.sin(t.heading)*step);}continue;
      }
      const move=c.move;if(!move?.moving||!move.waypoints?.length)continue;const wp=move.waypoints[Math.min(move.index||0,move.waypoints.length-1)],dx=wp.x-t.x,dy=wp.y-t.y,dist=Math.hypot(dx,dy),def=UNIT_DEFINITIONS[c.unitType]||{},fp=def.collisionFootprint||[(def.collisionRadius||1)*2,(def.collisionRadius||1)*2],arrival=Math.max(.8,Math.min(2.6,Math.max(fp[0],fp[1])*.14));
      if(dist<=arrival){
        move.index=(move.index||0)+1;if(move.controlledEgress&&move.index>(move.exitBuildingUntilIndex??-1))this._releaseControlledEgressIfClear(e);
        if(move.index>=move.waypoints.length){
          if(move.controlledEgress&&!this._releaseControlledEgressIfClear(e)){const source=move.exitBuildingId?this.sim.entities.get(move.exitBuildingId):null,escape=source?this._findBuildingEgressPoint(e,source,move.destination?.x??t.x,move.destination?.y??t.y):null;if(escape&&Math.hypot(escape.x-t.x,escape.y-t.y)>.45){move.waypoints.push(escape);move.exitBuildingUntilIndex=move.waypoints.length-1;continue;}move.moving=false;move.state='blocked';move.stuckSeconds=0;if(c.owner==='player')this.renderEvents.push({type:'message',message:`${def.label||'Unit'} could not clear its production structure.`});continue;}
          move.moving=false;move.state=move.state==='deploy'?'rallied':'arrived';move.exitBuildingId=null;move.exitBuildingUntilIndex=null;move.controlledEgress=false;move.stuckSeconds=0;
        }continue;
      }
      const desired=Math.atan2(dy,dx),err=angleDelta(desired,t.heading),turnStep=(loc.turnRate||1)*dt;t.heading+=clamp(err,-turnStep,turnStep);
      if(loc.movementClass==='air'){
        const step=Math.min(dist,(loc.maxSpeed||30)*dt),nx=t.x+Math.cos(desired)*step,ny=t.y+Math.sin(desired)*step,ground=this.mapForge.surfaceHeightAt(nx,ny),targetZ=ground+(loc.preferredAltitude||28),dz=targetZ-t.z,maxDz=(dz>=0?(loc.climbRate||10):(loc.descentRate||10))*dt;t.x=nx;t.y=ny;t.z+=clamp(dz,-maxDz,maxDz);move.stuckSeconds=0;continue;
      }
      if(Math.abs(err)>1.18&&!move.controlledEgress)continue;const speed=(loc.maxSpeed||8)*(move.controlledEgress?.55:Math.max(.22,Math.cos(err))),step=Math.min(dist,speed*dt),oldX=t.x,oldY=t.y,moved=move.controlledEgress?this._tryControlledEgressMove(e,Math.cos(desired)*step,Math.sin(desired)*step):this._tryGroundUnitMove(e,Math.cos(t.heading)*step,Math.sin(t.heading)*step);
      if(moved&&Math.hypot(t.x-oldX,t.y-oldY)>.01){move.stuckSeconds=0;move.lastProgressSeconds=0;move.lastProgressX=t.x;move.lastProgressY=t.y;continue;}move.stuckSeconds=(move.stuckSeconds||0)+dt;move.lastProgressSeconds=(move.lastProgressSeconds||0)+dt;
      if(move.stuckSeconds>.75&&move.destination&&!move.controlledEgress){const oldState=move.state,oldOrder=move.order,dest={...move.destination};if(this._commandMoveEntity(e,dest.x,dest.y,{state:oldState,order:oldOrder})){const nm=e.components.move;nm.repathCount=(move.repathCount||0)+1;if(c.owner==='player'&&nm.repathCount===1)this.renderEvents.push({type:'message',message:`${def.label||'Unit'} re-routing around base obstruction.`});}else{move.moving=false;move.state='blocked';move.stuckSeconds=0;if(c.owner==='player')this.renderEvents.push({type:'message',message:`${def.label||'Unit'} route blocked.`});}}
    }
  }

  _tryInfantryMove(e,dx,dy,ignoreBuildingId=null){
    const t=e.components.transform,nx=t.x+dx,ny=t.y+dy,opts={ignoreBuildingId,ignoreInfantry:true,gap:.035};
    if(this.mapForge.movementAt(nx,ny,'infantry').allowed&&this._unitPoseAllowed(e,nx,ny,t.heading,opts)){t.x=nx;t.y=ny;return true;}
    const d=Math.hypot(dx,dy)||1,tx=-dy/d,ty=dx/d,desired=Math.atan2(dy,dx);
    // Try progressively stronger sidesteps. This prevents a rifleman whose route brushes
    // a tank/building corner from failing the same microscopic forward step forever.
    for(const scale of [.75,1.25,1.8,2.35])for(const sign of [1,-1]){
      const side=Math.max(.10,d*scale),px=t.x+dx*.42+tx*side*sign,py=t.y+dy*.42+ty*side*sign;
      if(this.mapForge.movementAt(px,py,'infantry').allowed&&this._unitPoseAllowed(e,px,py,t.heading,opts)){t.x=px;t.y=py;return true;}
    }
    // If the direct line and slides are locally boxed in, sample a small radial escape fan.
    // This is intentionally local; global pathing still decides where the soldier is going.
    const radii=[Math.max(.22,d*1.15),Math.max(.38,d*1.8),Math.max(.62,d*2.5)],offsets=[Math.PI/4,-Math.PI/4,Math.PI/2,-Math.PI/2,Math.PI*3/4,-Math.PI*3/4,Math.PI];
    for(const radius of radii)for(const off of offsets){const px=t.x+Math.cos(desired+off)*radius,py=t.y+Math.sin(desired+off)*radius;if(!this.mapForge.movementAt(px,py,'infantry').allowed)continue;if(this._unitPoseAllowed(e,px,py,t.heading,opts)){t.x=px;t.y=py;return true;}}
    return false;
  }
  _systemInfantryLocomotion(dt){
    for(const e of this.sim.entities.values()){
      if(e.components.unitType!=='aegisRifleman'||e.components.health?.destroyed)continue;
      const t=e.components.transform,move=e.components.move,loc=e.components.locomotor;if(!move?.moving||!move.waypoints?.length)continue;
      const wp=move.waypoints[Math.min(move.index,move.waypoints.length-1)],dx=wp.x-t.x,dy=wp.y-t.y,dist=Math.hypot(dx,dy);
      if(dist<.30){
        move.index++;
        if(move.index>=move.waypoints.length){move.moving=false;move.state=move.state==='deploy'?'rallied':'arrived';move.exitBuildingId=null;if(e.components.combat)e.components.combat.state='ready';t.z=this.mapForge.surfaceHeightAt(t.x,t.y)+.04;}
        continue;
      }
      const desired=Math.atan2(dy,dx),err=angleDelta(desired,t.heading);t.heading+=clamp(err,-loc.turnRate*dt,loc.turnRate*dt);
      const step=Math.min(dist,loc.maxSpeed*dt),mx=Math.cos(desired)*step,my=Math.sin(desired)*step,oldX=t.x,oldY=t.y,movedOk=this._tryInfantryMove(e,mx,my,move.exitBuildingId);
      if(movedOk){
        const moved=Math.hypot(t.x-oldX,t.y-oldY),u=dist>0?Math.min(1,moved/dist):1,targetZ=Number.isFinite(wp.z)?wp.z:this.mapForge.surfaceHeightAt(t.x,t.y)+.04;t.z=t.z+(targetZ-t.z)*Math.max(.35,u);
        if(moved>.006){move.stuckSeconds=0;move.lastProgressX=t.x;move.lastProgressY=t.y;continue;}
      }
      move.stuckSeconds=(move.stuckSeconds||0)+dt;
      if(move.stuckSeconds>.55&&move.destination){
        const oldState=move.state,oldOrder=move.order,dest={...move.destination},oldCount=move.repathCount||0;
        if(this._commandMoveEntity(e,dest.x,dest.y,{state:oldState,order:oldOrder})){const nm=e.components.move;nm.repathCount=oldCount+1;if(e.components.owner==='player'&&nm.repathCount===1)this.renderEvents.push({type:'message',message:'Rifleman finding a clear step around obstruction.'});}
        else{move.moving=false;move.state='blocked';move.stuckSeconds=0;if(e.components.owner==='player')this.renderEvents.push({type:'message',message:'Rifleman route blocked · choose another destination.'});}
      }
    }
  }
  _circleRectPush(px,py,radius,rect,gap=.05){
    const axes=this._rectAxes(rect.heading||0),dx=px-rect.x,dy=py-rect.y,lx=dx*axes[0][0]+dy*axes[0][1],ly=dx*axes[1][0]+dy*axes[1][1],hx=rect.footprint[0]*.5+radius+gap,hy=rect.footprint[1]*.5+radius+gap;
    if(Math.abs(lx)>=hx||Math.abs(ly)>=hy)return null;
    const penX=hx-Math.abs(lx),penY=hy-Math.abs(ly);
    if(penX<penY){const sign=lx>=0?1:-1,amt=penX+.01;return {x:axes[0][0]*sign*amt,y:axes[0][1]*sign*amt};}
    const sign=ly>=0?1:-1,amt=penY+.01;return {x:axes[1][0]*sign*amt,y:axes[1][1]*sign*amt};
  }
  _systemLocalSeparation(dt){
    const infantry=this.sim.entities.values().filter(e=>this._isInfantry(e)&&!e.components.health?.destroyed),maxPush=Math.max(.025,1.6*dt);
    // Soft infantry-to-infantry separation: close formations are allowed, overlapping bodies are not.
    for(let i=0;i<infantry.length;i++)for(let j=i+1;j<infantry.length;j++){
      const a=infantry[i],b=infantry[j],ta=a.components.transform,tb=b.components.transform,da=UNIT_DEFINITIONS[a.components.unitType],db=UNIT_DEFINITIONS[b.components.unitType],space=Math.max(da.personalSpace||.82,db.personalSpace||.82),dx=tb.x-ta.x,dy=tb.y-ta.y;let dist=Math.hypot(dx,dy);
      let nx,ny;if(dist<1e-5){const ang=((a.id*12.9898+b.id*78.233)%6.283185307179586);nx=Math.cos(ang);ny=Math.sin(ang);dist=0;}else{nx=dx/dist;ny=dy/dist;}
      if(dist>=space)continue;const push=Math.min((space-dist)*.5,maxPush);
      const aIgnore=a.components.move?.exitBuildingId||null,bIgnore=b.components.move?.exitBuildingId||null;
      const ax=ta.x-nx*push,ay=ta.y-ny*push;if(this.mapForge.movementAt(ax,ay,'infantry').allowed&&this._unitPoseAllowed(a,ax,ay,ta.heading,{ignoreBuildingId:aIgnore,ignoreInfantry:true,gap:.02})){ta.x=ax;ta.y=ay;ta.z=this.mapForge.surfaceHeightAt(ax,ay)+.04;}
      const bx=tb.x+nx*push,by=tb.y+ny*push;if(this.mapForge.movementAt(bx,by,'infantry').allowed&&this._unitPoseAllowed(b,bx,by,tb.heading,{ignoreBuildingId:bIgnore,ignoreInfantry:true,gap:.02})){tb.x=bx;tb.y=by;tb.z=this.mapForge.surfaceHeightAt(bx,by)+.04;}
    }
    // Keep infantry out of ground-vehicle hulls while still allowing them to stand close beside vehicles.
    const vehicles=this.sim.entities.values().filter(e=>this._isGroundUnit(e)&&!this._isInfantry(e));
    for(const soldier of infantry){
      const t=soldier.components.transform,def=UNIT_DEFINITIONS[soldier.components.unitType],radius=def.collisionRadius||.40,ignoreBuildingId=soldier.components.move?.exitBuildingId||null;
      for(const vehicle of vehicles){
        const push=this._circleRectPush(t.x,t.y,radius,this._unitCollisionRect(vehicle),.06);if(!push)continue;const len=Math.hypot(push.x,push.y)||1,amt=Math.min(len,maxPush*1.4),px=t.x+push.x/len*amt,py=t.y+push.y/len*amt;
        if(this.mapForge.movementAt(px,py,'infantry').allowed&&this._unitPoseAllowed(soldier,px,py,t.heading,{ignoreBuildingId,ignoreInfantry:true,gap:.02})){t.x=px;t.y=py;t.z=this.mapForge.surfaceHeightAt(px,py)+.04;}
      }
    }
  }

  _systemTurretAim(dt){
    if(!this.tank)return;const e=this.sim.entities.get(this.tank.entityId);if(!e)return;const t=e.components.transform,tur=e.components.turret,a=tur.aimPoint;if(!a)return;const desiredWorld=Math.atan2(a.y-t.y,a.x-t.x),localYaw=angleDelta(desiredWorld,t.heading),yawErr=angleDelta(localYaw,tur.yaw);tur.yaw+=clamp(yawErr,-tur.yawRate*dt,tur.yawRate*dt);const horizontal=Math.hypot(a.x-t.x,a.y-t.y),desiredPitch=clamp(Math.atan2(a.z-(t.z+2.6),horizontal),-.12,.32),pitchErr=desiredPitch-tur.pitch;tur.pitch+=clamp(pitchErr,-tur.pitchRate*dt,tur.pitchRate*dt);
  }
  _systemConstruction(dt){
    for(const e of this.sim.entities.values()){
      const c=e.components.construction;if(!c||c.complete)continue;c.progress=Math.min(1,c.progress+dt/c.duration);if(c.progress>=1){c.complete=true;this.renderEvents.push({type:'constructionComplete',entityId:e.id,label:RTS_BUILDINGS[e.components.buildingType]?.label||'Structure',buildingType:e.components.buildingType});}
    }
  }

  _systemProduction(dt){
    for(const e of this.sim.entities.values()){
      if(e.kind!=='building'||!['barracks','vehicleFactory'].includes(e.components.buildingType)||!e.components.construction?.complete||e.components.health?.destroyed)continue;
      const p=e.components.production||(e.components.production={queue:[],active:null,rallySerial:0});
      if(!p.active&&p.queue.length)p.active=p.queue.shift();
      if(!p.active)continue;
      p.active.remaining=Math.max(0,p.active.remaining-dt);
      if(p.active.remaining<=0){const unitType=p.active.unitType;p.active=null;if(unitType==='aegisRifleman')this._spawnRiflemanEntity(e);else this._spawnFactoryVehicleEntity(e,unitType);}
    }
  }

  _systemGuardianTurrets(dt){
    const w=GUARDIAN_TURRET_WEAPON;
    for(const e of this.sim.entities.values()){
      if(e.kind!=='building'||e.components.buildingType!=='gunTurret'||e.components.health?.destroyed||!e.components.construction?.complete)continue;const t=e.components.transform,tur=e.components.turret,weapon=e.components.weapon;if(!tur||!weapon)continue;
      let target=null,best=Infinity;for(const other of this.sim.entities.values()){if(other.kind!=='unit'||other.components.owner===e.components.owner||other.components.health?.destroyed)continue;const ot=other.components.transform,d=Math.hypot(ot.x-t.x,ot.y-t.y);if(d<w.range&&d<best){best=d;target=other;}}
      if(!target){tur.targetId=null;continue;}tur.targetId=target.id;const tt=target.components.transform,desired=Math.atan2(tt.y-t.y,tt.x-t.x),err=angleDelta(desired,(t.heading||0)+tur.yaw);tur.yaw+=clamp(err,-1.8*dt,1.8*dt);const horizontal=Math.max(.01,best),desiredPitch=clamp(Math.atan2((tt.z+1.4)-(t.z+3.4),horizontal),-.18,.36);tur.pitch+=clamp(desiredPitch-tur.pitch,-.8*dt,.8*dt);if(Math.abs(err)>.12||weapon.cooldown>0)continue;
      const worldYaw=(t.heading||0)+tur.yaw,cp=Math.cos(tur.pitch),dir={x:Math.cos(worldYaw)*cp,y:Math.sin(worldYaw)*cp,z:Math.sin(tur.pitch)},pos={x:t.x+Math.cos(worldYaw)*6.1,y:t.y+Math.sin(worldYaw)*6.1,z:t.z+3.3};
      const p=this.sim.createEntity('projectile',{owner:e.components.owner,transform:{x:pos.x,y:pos.y,z:pos.z},projectile:{vx:dir.x*w.projectileSpeed,vy:dir.y*w.projectileSpeed,vz:dir.z*w.projectileSpeed,gravity:w.gravity,life:w.lifeSeconds,damage:w.damage,sourceEntityId:e.id,weaponId:w.id}});weapon.cooldown=w.reloadSeconds;this.renderEvents.push({type:'spawnProjectile',entityId:p.id});this.renderEvents.push({type:'muzzleFlash',position:pos});
    }
  }
  _systemInfantryCombat(dt){
    const rifleDef=UNIT_DEFINITIONS.aegisRifleman,weapon=WEAPONS[rifleDef.primaryWeapon];
    for(const e of this.sim.entities.values()){
      if(e.components.unitType!==rifleDef.id||e.components.health?.destroyed||e.components.move?.moving)continue;
      const t=e.components.transform;
      let target=null,best=Infinity;
      for(const other of this.sim.entities.values()){
        if(other.components.owner===e.components.owner||!other.components.owner||other.components.health?.destroyed||!['target','unit','building'].includes(other.kind))continue;
        const ot=other.components.transform,d=Math.hypot(ot.x-t.x,ot.y-t.y);if(d<=weapon.range&&d<best){best=d;target=other;}
      }
      if(!target){e.components.combat.targetId=null;e.components.combat.state='ready';continue;}
      e.components.combat.targetId=target.id;e.components.combat.state='engaging';
      const tt=target.components.transform,desired=Math.atan2(tt.y-t.y,tt.x-t.x),err=angleDelta(desired,t.heading),turn=e.components.locomotor.turnRate*dt;t.heading+=clamp(err,-turn,turn);
      if(Math.abs(err)>.18||e.components.weapon.cooldown>0)continue;
      e.components.weapon.cooldown=weapon.reloadSeconds;
      const hp=target.components.health;hp.current=Math.max(0,hp.current-weapon.damage);const destroyed=hp.current<=0;if(destroyed)hp.destroyed=true;
      const from={x:t.x+Math.cos(t.heading)*.55,y:t.y+Math.sin(t.heading)*.55,z:t.z+1.34};
      const to={x:tt.x,y:tt.y,z:tt.z+(target.kind==='target'?3.0:1.2)};
      this.renderEvents.push({type:'infantryFire',entityId:e.id,from,to});
      this.renderEvents.push({type:'entityHit',entityId:target.id,current:hp.current,max:hp.max,destroyed,sourceOwner:e.components.owner});
    }
  }
  _systemProjectiles(dt){
    for(const e of [...this.sim.entities.values()]){
      if(e.kind!=='projectile')continue;const t=e.components.transform,p=e.components.projectile;p.life-=dt;p.vz-=p.gravity*dt;t.x+=p.vx*dt;t.y+=p.vy*dt;t.z+=p.vz*dt;let hitTarget=null;
      for(const target of this.sim.entities.values()){
        if(!['target','unit','building'].includes(target.kind)||target.components.health?.destroyed||target.components.owner===e.components.owner||target.id===p.sourceEntityId)continue;const tt=target.components.transform;if(!tt)continue;let r=2.0,cz=tt.z+1.5,v=3.0;if(target.kind==='unit'){const def=UNIT_DEFINITIONS[target.components.unitType]||{};r=def.collisionRadius||1.4;v=Math.max(2.2,r*1.25);}else{const fp=target.components.building?.collisionFootprint||target.components.building?.footprint||[8,8];r=Math.max(fp[0],fp[1])*.52;cz=tt.z+Math.min(5.0,r*.35+1.5);v=Math.max(4.0,r*.7);}if(Math.hypot(t.x-tt.x,t.y-tt.y)<=r&&Math.abs(t.z-cz)<=v){hitTarget=target;break;}
      }
      if(hitTarget){const hp=hitTarget.components.health;hp.current=Math.max(0,hp.current-p.damage);const destroyed=hp.current<=0;if(destroyed)hp.destroyed=true;this.renderEvents.push({type:'impact',position:{x:t.x,y:t.y,z:t.z},big:destroyed});this.renderEvents.push({type:'entityHit',entityId:hitTarget.id,current:hp.current,max:hp.max,destroyed,sourceOwner:e.components.owner});this.sim.destroyEntity(e.id);continue;}
      const ground=this.mapForge.surfaceHeightAt(t.x,t.y);if(t.z<=ground+.3){this.renderEvents.push({type:'impact',position:{x:t.x,y:t.y,z:ground+.5},big:false});this.sim.destroyEntity(e.id);continue;}if(p.life<=0)this.sim.destroyEntity(e.id);
    }
  }

  _muzzleFlash(pos){const p=new THREE.Vector3(pos.x,pos.y,pos.z),flash=new THREE.Mesh(new THREE.IcosahedronGeometry(1.25,1),new THREE.MeshBasicMaterial({color:0xffbd54,transparent:true,opacity:.95}));flash.position.copy(p);this.effects.add(flash);const light=new THREE.PointLight(0xff8b32,6,28,2);light.position.copy(p);this.effects.add(light);this.fx.push({kind:'flash',mesh:flash,light,life:.10,maxLife:.10});}
  _rifleTracer(from,to){
    const a=new THREE.Vector3(from.x,from.y,from.z),b=new THREE.Vector3(to.x,to.y,to.z),g=new THREE.BufferGeometry().setFromPoints([a,b]),m=new THREE.LineBasicMaterial({color:0xffd47a,transparent:true,opacity:.82,depthWrite:false,toneMapped:false}),line=new THREE.Line(g,m);line.name='RifleTracer';this.effects.add(line);
    const flash=new THREE.Mesh(new THREE.IcosahedronGeometry(.16,0),new THREE.MeshBasicMaterial({color:0xffbd54,transparent:true,opacity:.95,toneMapped:false}));flash.position.copy(a);this.effects.add(flash);
    this.fx.push({kind:'tracer',mesh:line,flash,life:.075,maxLife:.075});
  }
  _impact(pos,big=false){const p=new THREE.Vector3(pos.x,pos.y,pos.z),light=new THREE.PointLight(big?0xff7a28:0xffa344,big?10:5,big?42:24,2);light.position.copy(p);this.effects.add(light);this.fx.push({kind:'light',light,life:big?.32:.18,maxLife:big?.32:.18});const count=big?18:9;for(let i=0;i<count;i++){const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(big?.45:.25,0),new THREE.MeshBasicMaterial({color:i%3===0?0xffd36a:0xff7d2d,transparent:true,opacity:.9}));mesh.position.copy(p);this.effects.add(mesh);const a=Math.random()*Math.PI*2,s=(big?8:5)+Math.random()*(big?16:9);this.fx.push({kind:'particle',mesh,vel:new THREE.Vector3(Math.cos(a)*s,Math.sin(a)*s,4+Math.random()*12),life:.45+Math.random()*.5,maxLife:1});}if(big)this._smokeBurst(p);}
  _smokeBurst(pos){for(let i=0;i<8;i++){const s=new THREE.Mesh(new THREE.SphereGeometry(1.2+Math.random()*.9,7,5),new THREE.MeshBasicMaterial({color:0x2d302e,transparent:true,opacity:.48,depthWrite:false}));s.position.copy(pos).add(new THREE.Vector3((Math.random()-.5)*3,(Math.random()-.5)*3,1+Math.random()*3));this.effects.add(s);this.fx.push({kind:'smoke',mesh:s,vel:new THREE.Vector3((Math.random()-.5)*1.3,(Math.random()-.5)*1.3,2+Math.random()*2),life:2.2+Math.random()*1.5,maxLife:3.5});}}
  _updateFx(dt){for(let i=this.fx.length-1;i>=0;i--){const f=this.fx[i];f.life-=dt;const t=clamp(f.life/Math.max(.001,f.maxLife),0,1);if(f.kind==='flash'){f.mesh.scale.setScalar(1+(1-t)*1.4);f.mesh.material.opacity=t;if(f.light)f.light.intensity=6*t;}else if(f.kind==='tracer'){f.mesh.material.opacity=.82*t;if(f.flash)f.flash.material.opacity=t;}else if(f.kind==='light'){f.light.intensity*=Math.pow(.08,dt);}else if(f.kind==='particle'){f.vel.z-=14*dt;f.mesh.position.addScaledVector(f.vel,dt);f.mesh.material.opacity=t;}else if(f.kind==='smoke'){f.mesh.position.addScaledVector(f.vel,dt);f.mesh.scale.multiplyScalar(1+dt*.55);f.mesh.material.opacity=.48*t;}if(f.life<=0){if(f.mesh){this.effects.remove(f.mesh);disposeObject(f.mesh);}if(f.flash){this.effects.remove(f.flash);disposeObject(f.flash);}if(f.light)this.effects.remove(f.light);this.fx.splice(i,1);}}}

  _consumeRenderEvents(){
    for(const ev of this.renderEvents.splice(0)){
      if(ev.type==='message')this.lastMessage=ev.message;
      else if(ev.type==='spawnBuilding'){const e=this.sim.entities.get(ev.entityId);if(e){const promise=this._createBuildingView(e,{name:ev.name});this.buildingViewPromises.set(e.id,promise);promise.catch(err=>{console.error('Building view load failed',err);this.renderEvents.push({type:'message',message:`${RTS_BUILDINGS[e.components.buildingType]?.label||'Building'} visual load failed: ${err.message}`});});}}
      else if(ev.type==='constructionComplete'){const v=this.buildings.find(b=>b.entityId===ev.entityId);if(v)v.group.scale.z=1;this.lastMessage=`${ev.label} complete.`;if(ev.buildingType==='refinery'){void this._spawnStarterHarvesterForRefinery(ev.entityId).catch(err=>{const e=this.sim.entities.get(ev.entityId);if(e?.components?.building)e.components.building.starterUnitSpawned=false;console.error('Starter harvester spawn failed',err);this.renderEvents.push({type:'message',message:`Refinery completed, but starter Harvester failed to dock: ${err.message}`});});}}
      else if(ev.type==='spawnProjectile'){const e=this.sim.entities.get(ev.entityId);if(e){const hostile=e.components.owner==='enemy',mesh=new THREE.Mesh(new THREE.SphereGeometry(.28,8,6),new THREE.MeshStandardMaterial({color:hostile?0xff6b55:0xffd37a,emissive:hostile?0xff2418:0xff7a18,emissiveIntensity:3,roughness:.25}));const t=e.components.transform;mesh.position.set(t.x,t.y,t.z);this.effects.add(mesh);this.projectileViews.set(e.id,mesh);}}
      else if(ev.type==='spawnRifleman'){const e=this.sim.entities.get(ev.entityId);if(e){const promise=this._createRiflemanView(e);this.infantryViewPromises.set(e.id,promise);promise.catch(err=>{console.error('Rifleman visual load failed',err);this.renderEvents.push({type:'message',message:`Rifleman visual load failed: ${err.message}`});});}}
      else if(ev.type==='spawnSupportUnit'){const e=this.sim.entities.get(ev.entityId);if(e){void this._createSupportUnitView(e,ev.archetype,{name:`${String(e.components.owner||'player').toUpperCase()}_${e.components.unitType}_${e.id}`}).catch(err=>{console.error('Produced vehicle visual load failed',err);this.renderEvents.push({type:'message',message:`Produced vehicle visual load failed: ${err.message}`});});}}
      else if(ev.type==='infantryFire'){const v=this.infantryUnits.find(x=>x.entityId===ev.entityId);if(v?.fireAction){v.fireTimer=.70;if(v.walkAction)v.walkAction.paused=true;v.fireAction.reset();v.fireAction.setLoop(THREE.LoopOnce,1);v.fireAction.clampWhenFinished=true;v.fireAction.play();}this._rifleTracer(ev.from,ev.to);}
      else if(ev.type==='muzzleFlash')this._muzzleFlash(ev.position);
      else if(ev.type==='impact')this._impact(ev.position,ev.big);
      else if(ev.type==='targetHit'){const v=this.enemyTargets.find(t=>t.entityId===ev.entityId);if(ev.destroyed){if(v)v.group.visible=false;this.lastMessage='Training target destroyed.';}else this.lastMessage=`Hit training target · ${Math.round(ev.current)}/${Math.round(ev.max)} HP.`;}
      else if(ev.type==='entityHit'){const target=this.sim.entities.get(ev.entityId),label=RTS_BUILDINGS[target?.components?.buildingType]?.label||UNIT_DEFINITIONS[target?.components?.unitType]?.label||'Target';if(ev.destroyed)this.lastMessage=`${label} destroyed.`;else if(ev.sourceOwner==='player')this.lastMessage=`${label} hit · ${Math.round(ev.current)} / ${Math.round(ev.max)} HP.`;}
    }
  }
  _clearCollisionDebugGeometry(){
    if(!this.collisionDebugRoot)return;
    while(this.collisionDebugRoot.children.length){const c=this.collisionDebugRoot.children[this.collisionDebugRoot.children.length-1];this.collisionDebugRoot.remove(c);disposeObject(c);}
  }
  _collisionDebugRect(rect,z,color){
    const axes=this._rectAxes(rect.heading||0),hx=rect.footprint[0]*.5,hy=rect.footprint[1]*.5,corners=[[-hx,-hy],[hx,-hy],[hx,hy],[-hx,hy]],pts=corners.map(([lx,ly])=>new THREE.Vector3(rect.x+axes[0][0]*lx+axes[1][0]*ly,rect.y+axes[0][1]*lx+axes[1][1]*ly,z));
    const geom=new THREE.BufferGeometry().setFromPoints(pts),mat=new THREE.LineBasicMaterial({color,transparent:true,opacity:.92,depthTest:false,toneMapped:false}),line=new THREE.LineLoop(geom,mat);line.renderOrder=99;this.collisionDebugRoot.add(line);
  }
  _collisionDebugCircle(x,y,z,r,color){
    const pts=[];for(let i=0;i<24;i++){const a=i/24*Math.PI*2;pts.push(new THREE.Vector3(x+Math.cos(a)*r,y+Math.sin(a)*r,z));}
    const geom=new THREE.BufferGeometry().setFromPoints(pts),mat=new THREE.LineBasicMaterial({color,transparent:true,opacity:.92,depthTest:false,toneMapped:false}),line=new THREE.LineLoop(geom,mat);line.renderOrder=99;this.collisionDebugRoot.add(line);
  }
  _updateCollisionDebug(){
    if(!this.collisionDebug||!this.collisionDebugRoot)return;this._clearCollisionDebugGeometry();
    for(const e of this.sim.entities.values()){
      if(e.components.health?.destroyed)continue;
      const t=e.components.transform;if(!t)continue;const z=this.mapForge.surfaceHeightAt(t.x,t.y)+.35;
      if(['building','target'].includes(e.kind))this._collisionDebugRect(this._buildingCollisionRect(e),z,e.components.owner==='enemy'?0xff725f:0xffcf57);
      else if(this._isGroundUnit(e)){if(this._isInfantry(e))this._collisionDebugCircle(t.x,t.y,z,UNIT_DEFINITIONS[e.components.unitType]?.collisionRadius||.4,0x7fffa0);else this._collisionDebugRect(this._unitCollisionRect(e),z,e.components.owner==='enemy'?0xff725f:0x5de6ff);if(e.components.move?.controlledEgress&&e.components.move?.waypoints?.length){const pts=[new THREE.Vector3(t.x,t.y,z+.15),...e.components.move.waypoints.slice(e.components.move.index||0).map(p=>new THREE.Vector3(p.x,p.y,this.mapForge.surfaceHeightAt(p.x,p.y)+.5))],geom=new THREE.BufferGeometry().setFromPoints(pts),mat=new THREE.LineBasicMaterial({color:0xff4dff,depthTest:false,transparent:true,opacity:.9}),line=new THREE.Line(geom,mat);line.renderOrder=100;this.collisionDebugRoot.add(line);}}
    }
  }

  _syncViews(dt=0){
    if(this.tank){const e=this.sim.entities.get(this.tank.entityId);if(e){const t=e.components.transform,tur=e.components.turret;this.tank.root.position.set(t.x,t.y,t.z);this.tank.root.rotation.z=t.heading;this.tank.turret.rotation.y=tur.yaw;this.tank.gun.rotation.z=tur.pitch;this._updatePresentationShadow(this.tank,t);}}
    for(const v of this.supportUnits){const e=this.sim.entities.get(v.entityId);if(!e||e.components.health?.destroyed){v.root.visible=false;continue;}v.root.visible=true;const t=e.components.transform;v.root.position.set(t.x,t.y,t.z);v.root.rotation.z=t.heading;if(v.rotorMain)v.rotorMain.rotation.y+=dt*10.8;if(v.rotorTail)v.rotorTail.rotation.z+=dt*14.4;this._updatePresentationShadow(v,t);}
    for(const v of this.infantryUnits){const e=this.sim.entities.get(v.entityId);if(!e||e.components.health?.destroyed){v.root.visible=false;continue;}const t=e.components.transform,moving=!!e.components.move?.moving;v.root.position.set(t.x,t.y,t.z);v.root.rotation.z=t.heading;if(v.fireTimer>0){v.fireTimer=Math.max(0,v.fireTimer-dt);}else if(v.walkAction){if(moving){v.walkAction.paused=false;v.walkAction.enabled=true;v.walkAction.play();}else{v.walkAction.paused=true;v.walkAction.time=.25;}}v.mixer?.update?.(dt);this._updatePresentationShadow(v,t);}
    for(const v of this.buildings){const e=this.sim.entities.get(v.entityId);if(!e||e.components.health?.destroyed){v.group.visible=false;continue;}v.group.visible=true;const t=e.components.transform,c=e.components.construction;v.group.position.set(t.x,t.y,t.z);v.group.rotation.z=t.heading||0;if(c&&!c.complete)v.group.scale.z=Math.max(.03,c.progress);else v.group.scale.z=1;if(v.functional?.radar)v.functional.radar.rotation.y+=dt*.32;if(v.functional?.fans)for(const f of v.functional.fans)f.rotation.z+=dt*4.2;if(v.functional?.dustFan)v.functional.dustFan.rotation.z+=dt*9.6;if(v.functional?.turret&&e.components.turret)v.functional.turret.rotation.y=e.components.turret.yaw||0;if(v.functional?.gun&&e.components.turret)v.functional.gun.rotation.z=e.components.turret.pitch||0;}
    for(const [id,mesh] of [...this.projectileViews.entries()]){const e=this.sim.entities.get(id);if(!e){this.effects.remove(mesh);disposeObject(mesh);this.projectileViews.delete(id);}else{const t=e.components.transform;mesh.position.set(t.x,t.y,t.z);}}
    this.selectedEntityIds=this.selectedEntityIds.filter(id=>{const e=this.sim.entities.get(id);return e?.kind==='unit'&&!e.components.health?.destroyed&&e.components.owner==='player';});this._updateSelectedUnitMarker();this._updateCollisionDebug();
  }

  _setCamera(){if(!this.tank)return;const hostAspect=Math.max(.5,this.renderer.domElement.clientWidth/Math.max(1,this.renderer.domElement.clientHeight)),landscape=hostAspect>=1.2,tactical=this.viewMode==='tactical',span=tactical?(landscape?40:46):(landscape?62:58);this.camera.left=-span*hostAspect;this.camera.right=span*hostAspect;this.camera.top=span;this.camera.bottom=-span;this.camera.near=.1;this.camera.far=2200;this.camera.up.set(0,0,1);this.camera.userData.skirmishLandscape=landscape;this.camera.userData.skirmishViewMode=this.viewMode;this.camera.updateProjectionMatrix();this._followCamera(true);}
  _followCamera(force=false){if(!this.follow||!this.tank)return;const selected=this._selectedEntity(),focus=selected||this.sim.entities.get(this.tank.entityId),ft=focus?.components?.transform,p=ft?new THREE.Vector3(ft.x,ft.y,ft.z):this.tank.root.position,target=new THREE.Vector3(p.x,p.y,p.z+3.2),landscape=this.camera.userData.skirmishLandscape!==false,tactical=this.viewMode==='tactical',offset=tactical?(landscape?new THREE.Vector3(54,-68,42):new THREE.Vector3(50,-62,52)):(landscape?new THREE.Vector3(78,-98,58):new THREE.Vector3(65,-82,68)),desired=target.clone().add(offset);if(force){this.camera.position.copy(desired);this.controls.target.copy(target);}else{this.camera.position.lerp(desired,.12);this.controls.target.lerp(target,.16);}this.camera.lookAt(this.controls.target);}

  update(dt){if(!this.active||!this.started)return;const steps=this.sim.advance(dt);this._consumeRenderEvents();this._syncViews(dt);if(steps>0)this._updateFx(steps*this.sim.clock.fixedDelta);if(steps>0&&this.sim.clock.tick-this.lastUiTick>=6){this.lastUiTick=this.sim.clock.tick;this._emit();}this._followCamera(false);}

  drawMinimap(canvas){
    this.mapForge.drawMinimap(canvas);if(!canvas||!this.mapForge.recipe)return;const ctx=canvas.getContext('2d'),w=canvas.width,size=this.mapForge.recipe.size,H=size/2,s=w/size;
    for(const v of this.buildings){const e=this.sim.entities.get(v.entityId);if(!e||e.components.health?.destroyed)continue;const t=e.components.transform;ctx.fillStyle=e.components.owner==='player'?'#6de38d':'#da6958';ctx.fillRect((t.x+H)*s-2,w-(t.y+H)*s-2,4,4);}
    for(const v of this.enemyTargets){const e=this.sim.entities.get(v.entityId);if(!e||e.components.health?.destroyed)continue;const t=e.components.transform;ctx.fillStyle='#df6657';ctx.beginPath();ctx.arc((t.x+H)*s,w-(t.y+H)*s,4,0,Math.PI*2);ctx.fill();}
    for(const v of this.supportUnits){const e=this.sim.entities.get(v.entityId);if(!e||e.components.health?.destroyed)continue;const t=e.components.transform;ctx.fillStyle=e.components.owner==='enemy'?'#df6657':'#7fdba0';ctx.beginPath();ctx.arc((t.x+H)*s,w-(t.y+H)*s,3,0,Math.PI*2);ctx.fill();}
    for(const v of this.infantryUnits){const e=this.sim.entities.get(v.entityId);if(!e||e.components.health?.destroyed)continue;const t=e.components.transform;ctx.fillStyle=e.components.owner==='enemy'?'#ef7b69':'#a8f2b7';ctx.beginPath();ctx.arc((t.x+H)*s,w-(t.y+H)*s,1.8,0,Math.PI*2);ctx.fill();}
    if(this.tank){const e=this.sim.entities.get(this.tank.entityId);if(e){const t=e.components.transform;ctx.fillStyle='#a9ffb6';ctx.beginPath();ctx.arc((t.x+H)*s,w-(t.y+H)*s,5,0,Math.PI*2);ctx.fill();}}
  }

  state(){
    const tank=this.tank&&this.sim.entities.get(this.tank.entityId),hp=tank?.components.health;
    const barracks=this.sim.entities.values().find(e=>e.kind==='building'&&e.components.owner==='player'&&e.components.buildingType==='barracks'&&e.components.construction?.complete&&!e.components.health?.destroyed),factory=this.sim.entities.values().find(e=>e.kind==='building'&&e.components.owner==='player'&&e.components.buildingType==='vehicleFactory'&&e.components.construction?.complete&&!e.components.health?.destroyed);
    const prod=barracks?.components.production,riflemanQueue=(prod?.queue?.length||0)+(prod?.active?1:0),factoryProd=factory?.components.production,vehicleQueue=(factoryProd?.queue?.length||0)+(factoryProd?.active?1:0),riflemanDef=UNIT_DEFINITIONS.aegisRifleman,mbtDef=UNIT_DEFINITIONS.aegisMbt,hmmwvDef=UNIT_DEFINITIONS.aegisHmmwv,harvesterDef=UNIT_DEFINITIONS.aegisHarvester,selected=this._selectedEntity(),selectedDef=selected?UNIT_DEFINITIONS[selected.components.unitType]:null,selectedHp=selected?.components.health,selectedResource=selected?.components.resource,selectedMove=selected?.components.move;
    let resourceRemaining=0,resourceCapacity=0,resourceFields=0;for(const e of this.sim.entities.values()){const f=e.components.resourceField;if(e.kind!=='resource'||!f)continue;resourceFields++;resourceRemaining+=f.remaining;resourceCapacity+=f.capacity;}
    const cameraHint=this.follow?'':' · DRAG = PAN';const commandHint=!selected?`TAP FRIENDLY TO SELECT · TAP HOSTILE TO AIM${cameraHint}`:selected.components.unitType==='aegisHarvester'?`HARVESTER: TAP CRYSTALS = HARVEST · TAP TERRAIN = MOVE${cameraHint}`:selected.id===this.tank?.entityId?`AEGIS-X: TAP HOSTILE = AIM · TAP TERRAIN = MOVE${cameraHint}`:`SELECTED: TAP TERRAIN = MOVE${cameraHint}`;const enemyBaseAlive=this.enemyBaseEntityIds.filter(id=>{const e=this.sim.entities.get(id);return e&&!e.components.health?.destroyed;}).length;
    return {credits:this.credits,powerSupply:this.powerSupply,powerUse:this.powerUse,powerNet:(this.playerFaction?.powerNet??0),tankHp:hp?.current||0,tankMaxHp:hp?.max||0,pendingBuild:this.pendingBuild,buildingCount:this.buildings.length,supportUnitCount:this.supportUnits.length,infantryCount:this.infantryUnits.length,barracksReady:!!barracks,riflemanQueue,riflemanCost:riflemanDef.cost,canTrainRifleman:!!barracks&&this.credits>=riflemanDef.cost&&riflemanQueue<5,factoryReady:!!factory,vehicleQueue,vehicleQueueMax:4,mbtCost:mbtDef.cost,hmmwvCost:hmmwvDef.cost,harvesterCost:harvesterDef.cost,canBuildMbt:!!factory&&this.credits>=mbtDef.cost&&vehicleQueue<4,canBuildHmmwv:!!factory&&this.credits>=hmmwvDef.cost&&vehicleQueue<4,canBuildHarvester:!!factory&&this.credits>=harvesterDef.cost&&vehicleQueue<4,fireReady:(tank?.components.weapon?.cooldown||0)<=0,message:this.lastMessage,simTick:this.sim.clock.tick,simHz:this.sim.clock.hz,simPaused:this.sim.paused,entityCount:this.sim.entities.count(),stateHash:this.sim.stateHash(),commandLog:this.sim.commands.recent(6),simulationVersion:RTS_SIMULATION_VERSION,viewMode:this.viewMode,follow:this.follow,freeCamera:!this.follow,collisionDebug:this.collisionDebug,selectedUnitId:selected?.id||null,selectedUnitType:selected?.components.unitType||null,selectedUnitLabel:selectedDef?.label||null,selectedHp:selectedHp?.current||0,selectedMaxHp:selectedHp?.max||0,selectedOrder:selectedResource?.state||selectedMove?.state||null,selectedCargo:selectedResource?.cargo||0,selectedCapacity:selectedResource?.capacity||0,commandHint,harvestCredits:this.harvestCredits,resourceFields,resourceRemaining,resourceCapacity,enemyBaseAlive};
  }
  _emit(message=null){if(message)this.lastMessage=message;this.onStateChange?.(this.state());}
}
