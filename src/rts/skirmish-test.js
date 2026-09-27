import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createRTSBuilding, RTS_BUILDINGS } from './rts-building-assets.js';
import { RTSSimulation, RTS_SIMULATION_VERSION } from './sim/rts-simulation.js';
import { COMMAND_SOURCES } from './sim/command-bus.js';
import { RTS_COMMANDS } from './sim/rts-commands.js';
import { LOCOMOTORS, WEAPONS, UNIT_DEFINITIONS } from './data/rts-definitions.js';
import { instantiateMasterBuilding, masterBuildingForRole, MASTER_BUILDINGS } from './rts-asset-library.js';
import { loadAegisReferenceVehicle } from '../vehicle/vehicle-generator.js';

export const SKIRMISH_VERSION='0.6.3';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
function disposeObject(root){if(!root)return;root.traverse(o=>{o.geometry?.dispose?.();const ms=Array.isArray(o.material)?o.material:(o.material?[o.material]:[]);ms.forEach(m=>m?.dispose?.());});}
function cloneMaterials(root){root.traverse(o=>{if(!o.material)return;o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();});return root;}

export class SkirmishTest{
  constructor({scene,camera,renderer,controls,mapForge,onStateChange=null}){
    this.scene=scene;this.camera=camera;this.renderer=renderer;this.controls=controls;this.mapForge=mapForge;this.onStateChange=onStateChange;
    this.loader=new GLTFLoader();this.root=new THREE.Group();this.root.name='WorldForgeSkirmish';this.root.visible=false;scene.add(this.root);
    this.effects=new THREE.Group();this.effects.name='SkirmishEffects';this.root.add(this.effects);
    this.active=false;this.started=false;this.mapSignature='';this.tank=null;this.supportUnits=[];this.supportSerial=0;this.infantryUnits=[];this.infantryViewPromises=new Map();this.riflemanAssetPromise=null;this.enemyTargets=[];this.buildings=[];this.buildingViewPromises=new Map();this.fx=[];this.projectileViews=new Map();this.renderEvents=[];
    this.drive={forward:false,back:false,left:false,right:false};this.aimPoint=new THREE.Vector3();this.pendingBuild=null;this.follow=true;this.viewMode='overview';this.lastMessage='';this.buildSerial=1;this.playerPalette='aegis';this.enemyPalette='crimson';
    this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.softShadowTexture=this._makeSoftShadowTexture();this.aimMarker=this._makeAimMarker();this.root.add(this.aimMarker);this.aimMarker.visible=false;
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
    this.sim.addSystem('locomotion',(dt)=>this._systemLocomotion(dt),{priority:10});
    this.sim.addSystem('infantry-locomotion',(dt)=>this._systemInfantryLocomotion(dt),{priority:12});
    this.sim.addSystem('local-separation',(dt)=>this._systemLocalSeparation(dt),{priority:14});
    this.sim.addSystem('turret-aim',(dt)=>this._systemTurretAim(dt),{priority:20});
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
  setDrive(key,on){if(!(key in this.drive)||!this.tank)return;this.drive[key]=!!on;this.sim.issueCommand(RTS_COMMANDS.DRIVE_INPUT,{entityId:this.tank.entityId,key,on:!!on},{source:COMMAND_SOURCES.PLAYER});}
  setFollow(on){this.follow=!!on;this._emit();}
  setViewMode(mode='overview'){this.viewMode=mode==='tactical'?'tactical':'overview';this.camera.zoom=1;this._setCamera();this._emit(this.viewMode==='tactical'?'Tactical camera engaged · pinch or wheel for fine zoom.':'Overview camera engaged · pinch or wheel for fine zoom.');}
  toggleViewMode(){this.setViewMode(this.viewMode==='overview'?'tactical':'overview');}
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
    this.sim.reset({seed:this.mapForge.recipe?.seed||1});this.lastUiTick=-999;this.viewMode='overview';this.camera.zoom=1;this.playerFaction=this.sim.createFaction('player',{credits:5000});this.enemyFaction=this.sim.createFaction('enemy',{credits:0});this.pendingBuild=null;this.buildSerial=1;
    await this._spawnPlayerTank();await this._spawnStartingConstructionYard();await this._spawnTrainingTarget();this.started=true;this.setActive(true);this._setCamera();this._emit('Skirmish ready · oriented vehicle hull collision, corner sliding and compact infantry spacing active.');
  }

  _clearSession(){
    this.clearDrive();this.tank=null;this.supportUnits=[];this.supportSerial=0;this.infantryUnits=[];this.infantryViewPromises.clear();this.enemyTargets=[];this.buildings=[];this.buildingViewPromises.clear();this.fx=[];this.projectileViews.clear();this.renderEvents=[];this.aimMarker.visible=false;this.started=false;
    while(this.root.children.length){const c=this.root.children[this.root.children.length-1];this.root.remove(c);if(c!==this.aimMarker)disposeObject(c);}
    this.effects=new THREE.Group();this.effects.name='SkirmishEffects';this.root.add(this.effects);this.aimMarker=this._makeAimMarker();this.root.add(this.aimMarker);this.aimMarker.visible=false;
    this.collisionDebugRoot=new THREE.Group();this.collisionDebugRoot.name='CollisionDebug';this.collisionDebugRoot.visible=this.collisionDebug;this.root.add(this.collisionDebugRoot);
  }

  async _spawnPlayerTank(){
    const def=UNIT_DEFINITIONS.aegisMbt,loc=LOCOMOTORS[def.locomotor],weapon=WEAPONS[def.primaryWeapon];
    const gltf=await this.loader.loadAsync(def.asset);const source=cloneMaterials(gltf.scene);source.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    const axis=new THREE.Group();axis.name='AegisX_ZUpAxis';axis.rotation.x=Math.PI/2;axis.add(source);const vehicle=new THREE.Group();vehicle.name='Player_AegisX';vehicle.add(axis);this.root.add(vehicle);
    const start=this.mapForge.metadata.startRegions[0],toward=new THREE.Vector2(-start.x,-start.y).normalize(),x=start.x+toward.x*58,y=start.y+toward.y*58,z=this.mapForge.surfaceHeightAt(x,y)-.1,heading=Math.atan2(toward.y,toward.x);
    const turret=source.getObjectByName('TurretRoot'),gun=source.getObjectByName('GunPitchRoot'),muzzle=source.getObjectByName(weapon.muzzleSocket);if(!turret||!gun||!muzzle)throw new Error('Aegis-X articulation nodes are missing.');
    const aim={x:x+Math.cos(heading)*100,y:y+Math.sin(heading)*100,z:this.mapForge.surfaceHeightAt(x+Math.cos(heading)*100,y+Math.sin(heading)*100)+1.5};
    const e=this.sim.createEntity('unit',{unitType:def.id,owner:'player',transform:{x,y,z,heading},health:{current:def.maxHp,max:def.maxHp,destroyed:false},locomotor:{...loc},input:{forward:false,back:false,left:false,right:false},turret:{yaw:0,pitch:0,yawRate:1.9,pitchRate:.8,aimPoint:aim},weapon:{id:weapon.id,cooldown:0}},'player');
    vehicle.position.set(x,y,z);vehicle.rotation.z=heading;this.tank={entityId:e.id,root:vehicle,source,axis,turret,gun,muzzle,definition:def};this._attachPresentationShadow(this.tank,{air:false});this.aimPoint.set(aim.x,aim.y,aim.z);
  }


  async spawnSupportUnit(archetype){
    if(!this.started)return false;
    const map={hmmwv50:UNIT_DEFINITIONS.aegisHmmwv,attackHeli:UNIT_DEFINITIONS.aegisTalon,fieldHarvester:UNIT_DEFINITIONS.aegisHarvester},def=map[archetype];if(!def)return false;
    const paletteMap={aegis:'olive',desert:'desert',crimson:'red',slate:'slate',blackops:'slate'},result=await loadAegisReferenceVehicle({type:archetype,palette:paletteMap[this.playerPalette]||'olive',seed:(this.mapForge.recipe?.seed||1)+this.supportSerial});
    const source=result.group;source.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    const axis=new THREE.Group();axis.name='SupportUnit_YUp_to_ZUp';axis.rotation.x=Math.PI/2;axis.add(source);const root=new THREE.Group();root.name=`Support_${def.id}_${++this.supportSerial}`;root.add(axis);this.root.add(root);
    const base=this.tank?this.sim.entities.get(this.tank.entityId)?.components.transform:null,start=this.mapForge.metadata.startRegions[0],bx=base?.x??start.x,by=base?.y??start.y,heading=base?.heading??0,side=new THREE.Vector2(-Math.sin(heading),Math.cos(heading));
    const offset=14+this.supportSerial*7,rawX=bx+side.x*offset-Math.cos(heading)*8,rawY=by+side.y*offset-Math.sin(heading)*8,loc=LOCOMOTORS[def.locomotor],spawn=loc.movementClass==='air'?{x:rawX,y:rawY}:this._findOpenGroundSpawn(def,rawX,rawY,heading),x=spawn.x,y=spawn.y,ground=this.mapForge.surfaceHeightAt(x,y),z=loc.movementClass==='air'?ground+(loc.preferredAltitude||22):ground-.1;
    const e=this.sim.createEntity('unit',{unitType:def.id,owner:'player',transform:{x,y,z,heading},health:{current:def.maxHp,max:def.maxHp,destroyed:false},locomotor:{...loc}},'player');root.position.set(x,y,z);root.rotation.z=heading;
    const wheelNames=archetype==='fieldHarvester'?['FrontLeftWheelSpinRoot','FrontRightWheelSpinRoot','MidLeftWheelSpinRoot','MidRightWheelSpinRoot','RearLeftWheelSpinRoot','RearRightWheelSpinRoot']:['FL','FR','RL','RR'].map(k=>`WheelSpinRoot_${k}`);
    const view={entityId:e.id,root,source,axis,definition:def,archetype,rotorMain:source.getObjectByName('MainRotorRoot'),rotorTail:source.getObjectByName('TailRotorRoot'),wheels:wheelNames.map(n=>source.getObjectByName(n)).filter(Boolean),collector:source.getObjectByName('CollectorDrumRoot'),dumpDoors:[source.getObjectByName('HopperDoorLeftRoot'),source.getObjectByName('HopperDoorRightRoot')].filter(Boolean)};this._attachPresentationShadow(view,{air:loc.movementClass==='air'});this.supportUnits.push(view);this._emit(`${def.label} master asset deployed for skirmish testing.`);return true;
  }

  _buildingComponents(type,x,y,{owner='player',complete=false}={}){
    const def=RTS_BUILDINGS[type],components={buildingType:type,owner,transform:{x,y,z:this.mapForge.surfaceHeightAt(x,y),heading:0},health:{current:def.hp,max:def.hp,destroyed:false},building:{footprint:[...def.footprint],collisionFootprint:[...(def.collisionFootprint||def.footprint)],buildRadius:def.buildRadius||0,powerUse:def.powerUse||0,powerSupply:def.powerSupply||0,starterUnit:def.starterUnit||null,starterUnitSpawned:false},construction:{progress:complete?1:0,duration:1.8,complete:!!complete}};
    if(type==='barracks')components.production={queue:[],active:null,rallySerial:0};
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

  _handleProduceCommand(cmd){
    const def=UNIT_DEFINITIONS[cmd.payload.unitType];
    if(!def||def.id!=='aegisRifleman'){this.renderEvents.push({type:'message',message:'Unknown infantry production request.'});return;}
    const barracks=this.sim.entities.values().find(e=>e.kind==='building'&&e.components.owner==='player'&&e.components.buildingType==='barracks'&&e.components.construction?.complete&&!e.components.health?.destroyed);
    if(!barracks){this.renderEvents.push({type:'message',message:'Build and complete a Field Barracks before training Riflemen.'});return;}
    const prod=barracks.components.production||(barracks.components.production={queue:[],active:null});
    const queued=(prod.queue?.length||0)+(prod.active?1:0);
    if(queued>=5){this.renderEvents.push({type:'message',message:'Field Barracks queue is full.'});return;}
    if(!this.playerFaction?.spend(def.cost)){this.renderEvents.push({type:'message',message:`Not enough credits for ${def.label}.`});return;}
    prod.queue.push({unitType:def.id,remaining:def.buildSeconds,total:def.buildSeconds});
    this.renderEvents.push({type:'message',message:`${def.label} training · $${def.cost}.`});
  }

  _spawnRiflemanEntity(barracks){
    const def=UNIT_DEFINITIONS.aegisRifleman,loc=LOCOMOTORS[def.locomotor],weapon=WEAPONS[def.primaryWeapon],profile=this._barracksExitProfile(barracks),heading=barracks.components.transform.heading||0,prod=barracks.components.production||(barracks.components.production={queue:[],active:null,rallySerial:0}),rally=this._barracksRallySlot(barracks,prod.rallySerial++);
    const waypoints=[profile.entry,profile.path0,profile.path1,profile.path2,rally].map(p=>({...p}));
    const e=this.sim.createEntity('unit',{
      unitType:def.id,owner:'player',
      transform:{x:profile.spawn.x,y:profile.spawn.y,z:profile.spawn.z,heading},
      health:{current:def.maxHp,max:def.maxHp,destroyed:false},
      locomotor:{...loc},
      move:{waypoints,index:0,moving:true,state:'deploy',exitBuildingId:barracks.id},
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
    const gltf=await this.riflemanAssetPromise,source=cloneMaterials(gltf.scene.clone(true));
    source.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    const axis=new THREE.Group();axis.name='Rifleman_YUp_to_ZUp';axis.rotation.x=Math.PI/2;axis.add(source);
    const forwardFix=new THREE.Group();forwardFix.name='Rifleman_ForwardFix';forwardFix.rotation.z=Math.PI/2;forwardFix.add(axis);
    const root=new THREE.Group();root.name=`PLAYER_Rifleman_${entity.id}`;root.add(forwardFix);this.root.add(root);
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
    g.position.set(t.x,t.y,t.z);g.rotation.z=t.heading||0;g.name=name||`${entity.components.owner.toUpperCase()}_${type}_${entity.id}`;g.scale.z=c.complete?1:Math.max(.03,c.progress);this.root.add(g);
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
      vehicleRally:g.getObjectByName('WF_RALLY'),
      serviceBay:g.getObjectByName('WF_SERVICE_BAY'),
      doorCenter:g.getObjectByName('WF_DOOR_CENTER')
    }};this.buildings.push(view);return view;
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
    const e=this.sim.createEntity('unit',{unitType:def.id,owner:'player',transform:{x,y,z,heading},health:{current:def.maxHp,max:def.maxHp,destroyed:false},locomotor:{...loc},resource:{capacity:def.resourceCapacity||1200,cargo:0,state:'docked',refineryEntityId},docked:{refineryEntityId,state:'parked',dockSocket:'HarvesterDockSocket',alignSocket:def.dockAlignSocket||'RefineryDockAlignSocket'}},'player');
    const view={entityId:e.id,root,source,axis,definition:def,archetype:'fieldHarvester',dockedTo:refineryEntityId,rotorMain:null,rotorTail:null,wheels:['FrontLeftWheelSpinRoot','FrontRightWheelSpinRoot','MidLeftWheelSpinRoot','MidRightWheelSpinRoot','RearLeftWheelSpinRoot','RearRightWheelSpinRoot'].map(n=>source.getObjectByName(n)).filter(Boolean),collector:source.getObjectByName('CollectorDrumRoot'),dumpDoors:[source.getObjectByName('HopperDoorLeftRoot'),source.getObjectByName('HopperDoorRightRoot')].filter(Boolean)};
    this._attachPresentationShadow(view,{air:false});this.supportUnits.push(view);b.starterUnitSpawned=true;this.renderEvents.push({type:'message',message:'Field Refinery complete · starter Field Harvester docked inside the unload bay.'});return true;
  }

  async _spawnStartingConstructionYard(){
    const start=this.mapForge.metadata.startRegions[0],e=this.sim.createEntity('building',this._buildingComponents('constructionYard',start.x,start.y,{owner:'player',complete:true}),'player');await this._createBuildingView(e,{name:'PLAYER_TacticalCommandPost'});
  }
  async _spawnTrainingTarget(){
    const start=this.mapForge.metadata.startRegions[0],toward=new THREE.Vector2(-start.x,-start.y).normalize(),side=new THREE.Vector2(-toward.y,toward.x),x=start.x+toward.x*145+side.x*24,y=start.y+toward.y*145+side.y*24;
    const e=this.sim.createEntity('target',this._buildingComponents('gunTurret',x,y,{owner:'enemy',complete:true}),'enemy');e.components.collisionRadius=7;
    const view=await this._createBuildingView(e,{palette:this.enemyPalette,name:'ENEMY_GuardianTurret'});
    this.enemyTargets.push({entityId:e.id,id:'ENEMY_TEST_TURRET',type:'gunTurret',group:view.group,radius:7});
    this.aimPoint.set(x,y,e.components.transform.z+3.2);
    if(this.tank)this.sim.issueCommand(RTS_COMMANDS.AIM,{entityId:this.tank.entityId,point:{x,y,z:e.components.transform.z+3.2}},{source:COMMAND_SOURCES.SYSTEM,delayTicks:0});
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

  pointerAction(clientX,clientY,rect){
    if(!this.active)return false;this.pointer.x=((clientX-rect.left)/rect.width)*2-1;this.pointer.y=-((clientY-rect.top)/rect.height)*2+1;this.raycaster.setFromCamera(this.pointer,this.camera);const hits=this.raycaster.intersectObjects(this.mapForge.root.children,true);if(!hits.length)return false;const p=hits[0].point;
    if(this.pendingBuild)return this.placeSelectedBuilding(p.x,p.y);
    const z=Math.max(this.mapForge.surfaceHeightAt(p.x,p.y)+.5,p.z);this.aimPoint.set(p.x,p.y,z);this.aimMarker.position.set(p.x,p.y,this.mapForge.surfaceHeightAt(p.x,p.y)+.28);this.aimMarker.visible=true;if(this.tank)this.sim.issueCommand(RTS_COMMANDS.AIM,{entityId:this.tank.entityId,point:{x:p.x,y:p.y,z}},{source:COMMAND_SOURCES.PLAYER});this._emit('Turret aim command queued.');return true;
  }

  fire(){const e=this.tank&&this.sim.entities.get(this.tank.entityId);if(!e||e.components.weapon.cooldown>0)return false;this.sim.issueCommand(RTS_COMMANDS.FIRE,{entityId:e.id},{source:COMMAND_SOURCES.PLAYER});this._emit('Fire command queued.');return true;}
  _handleFireCommand(cmd){
    const e=this.sim.entities.get(cmd.payload.entityId);if(!e||e.components.health?.destroyed)return;const weapon=WEAPONS[e.components.weapon?.id];if(!weapon||e.components.weapon.cooldown>0)return;
    const t=e.components.transform,tur=e.components.turret,worldYaw=t.heading+tur.yaw,pitch=tur.pitch,cp=Math.cos(pitch),dir={x:Math.cos(worldYaw)*cp,y:Math.sin(worldYaw)*cp,z:Math.sin(pitch)};
    let pos={x:t.x+Math.cos(worldYaw)*7,y:t.y+Math.sin(worldYaw)*7,z:t.z+2.8};
    if(this.tank?.muzzle){this.tank.root.updateMatrixWorld(true);this.tank.muzzle.updateMatrixWorld(true);const wp=new THREE.Vector3();this.tank.muzzle.getWorldPosition(wp);pos={x:wp.x,y:wp.y,z:wp.z};}
    const p=this.sim.createEntity('projectile',{owner:'player',transform:{x:pos.x,y:pos.y,z:pos.z},projectile:{vx:dir.x*weapon.projectileSpeed,vy:dir.y*weapon.projectileSpeed,vz:dir.z*weapon.projectileSpeed,gravity:weapon.gravity,life:weapon.lifeSeconds,damage:weapon.damage,sourceEntityId:e.id,weaponId:weapon.id}});e.components.weapon.cooldown=weapon.reloadSeconds;this.renderEvents.push({type:'spawnProjectile',entityId:p.id});this.renderEvents.push({type:'muzzleFlash',position:pos});this.renderEvents.push({type:'message',message:'Main gun fired.'});
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
  _collisionBlockersForRect(rect,{ignoreEntityId=null,ignoreBuildingId=null,ignoreInfantry=false,gap=.08}={}){
    const blockers=[];
    for(const other of this.sim.entities.values()){
      if(other.id===ignoreEntityId||other.components.health?.destroyed)continue;
      if(['building','target'].includes(other.kind)){
        if(other.id===ignoreBuildingId)continue;
        const depth=this._rectOverlapDepth(rect,this._buildingCollisionRect(other),gap);if(depth>0)blockers.push({entity:other,kind:'building',rect:this._buildingCollisionRect(other),depth});
      }else if(this._isGroundUnit(other)){
        if(ignoreInfantry&&this._isInfantry(other))continue;
        const orect=this._unitCollisionRect(other),depth=this._rectOverlapDepth(rect,orect,gap);if(depth>0)blockers.push({entity:other,kind:'unit',rect:orect,depth});
      }
    }
    return blockers;
  }
  _unitPoseBlockers(e,x,y,heading,{ignoreBuildingId=null,ignoreInfantry=false,gap=.08}={}){
    if(e.components.locomotor?.movementClass==='air')return [];
    const dockIgnore=e.components.docked?.refineryEntityId||ignoreBuildingId;
    return this._collisionBlockersForRect(this._unitCollisionRect(e,x,y,heading),{ignoreEntityId:e.id,ignoreBuildingId:dockIgnore,ignoreInfantry,gap});
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
    const blockers=this._unitPoseBlockers(e,nx,ny,t.heading);
    if(!blockers.length){this._moveGroundUnitTo(e,nx,ny);return true;}
    const candidates=[];
    for(const b of blockers){
      const axes=this._rectAxes(b.rect.heading||0);
      for(const axis of axes){const proj=dx*axis[0]+dy*axis[1];if(Math.abs(proj)>.01)candidates.push([axis[0]*proj,axis[1]*proj]);}
      if(b.kind==='unit'){const ox=t.x-b.rect.x,oy=t.y-b.rect.y,d=Math.hypot(ox,oy)||1,tx=-oy/d,ty=ox/d,proj=dx*tx+dy*ty;if(Math.abs(proj)>.01)candidates.push([tx*proj,ty*proj]);}
    }
    candidates.push([dx,0],[0,dy]);
    candidates.sort((a,b)=>(b[0]*b[0]+b[1]*b[1])-(a[0]*a[0]+a[1]*a[1]));
    const seen=new Set();
    for(const [sx,sy] of candidates){
      const key=`${sx.toFixed(3)}:${sy.toFixed(3)}`;if(seen.has(key)||Math.hypot(sx,sy)<.01)continue;seen.add(key);
      const px=t.x+sx,py=t.y+sy;if(!this.mapForge.movementAt(px,py,loc.movementClass).allowed)continue;
      if(this._unitPoseAllowed(e,px,py,t.heading)){this._moveGroundUnitTo(e,px,py);return true;}
    }
    return false;
  }
  _systemLocomotion(dt){
    if(!this.tank)return;const e=this.sim.entities.get(this.tank.entityId);if(!e)return;const c=e.components,t=c.transform,input=c.input,loc=c.locomotor,throttle=(input.forward?1:0)-(input.back?1:0),turn=(input.left?1:0)-(input.right?1:0);
    if(turn){
      const next=t.heading+turn*loc.turnRate*dt*(Math.abs(throttle)>.01?.72:1),currentDepth=this._unitPoseCollisionDepth(e,t.x,t.y,t.heading),nextDepth=this._unitPoseCollisionDepth(e,t.x,t.y,next);
      if(nextDepth<=.001||nextDepth<=currentDepth+.002)t.heading=next;
    }
    if(throttle){const speed=throttle>0?loc.maxSpeed:loc.reverseSpeed,step=speed*dt*throttle;this._tryGroundUnitMove(e,Math.cos(t.heading)*step,Math.sin(t.heading)*step);}
  }
  _tryInfantryMove(e,dx,dy,ignoreBuildingId=null){
    const t=e.components.transform,loc=e.components.locomotor,nx=t.x+dx,ny=t.y+dy;
    if(!this.mapForge.movementAt(nx,ny,'infantry').allowed)return false;
    if(this._unitPoseAllowed(e,nx,ny,t.heading,{ignoreBuildingId,ignoreInfantry:true,gap:.04})){t.x=nx;t.y=ny;return true;}
    const d=Math.hypot(dx,dy)||1,tx=-dy/d,ty=dx/d,side=Math.min(.26,d*.75);
    for(const sign of [1,-1]){
      const px=t.x+dx*.55+tx*side*sign,py=t.y+dy*.55+ty*side*sign;
      if(this.mapForge.movementAt(px,py,'infantry').allowed&&this._unitPoseAllowed(e,px,py,t.heading,{ignoreBuildingId,ignoreInfantry:true,gap:.04})){t.x=px;t.y=py;return true;}
    }
    return false;
  }
  _systemInfantryLocomotion(dt){
    for(const e of this.sim.entities.values()){
      if(e.components.unitType!=='aegisRifleman'||e.components.health?.destroyed)continue;
      const t=e.components.transform,move=e.components.move,loc=e.components.locomotor;if(!move?.moving||!move.waypoints?.length)continue;
      const wp=move.waypoints[Math.min(move.index,move.waypoints.length-1)],dx=wp.x-t.x,dy=wp.y-t.y,dist=Math.hypot(dx,dy);
      if(dist<.30){
        move.index++;
        if(move.index>=move.waypoints.length){move.moving=false;move.state='rallied';move.exitBuildingId=null;e.components.combat.state='ready';t.z=this.mapForge.surfaceHeightAt(t.x,t.y)+.04;}
        continue;
      }
      const desired=Math.atan2(dy,dx),err=angleDelta(desired,t.heading);t.heading+=clamp(err,-loc.turnRate*dt,loc.turnRate*dt);
      const step=Math.min(dist,loc.maxSpeed*dt),mx=Math.cos(desired)*step,my=Math.sin(desired)*step,oldX=t.x,oldY=t.y;
      if(this._tryInfantryMove(e,mx,my,move.exitBuildingId)){
        const moved=Math.hypot(t.x-oldX,t.y-oldY),u=dist>0?Math.min(1,moved/dist):1,targetZ=Number.isFinite(wp.z)?wp.z:this.mapForge.surfaceHeightAt(t.x,t.y)+.04;
        t.z=t.z+(targetZ-t.z)*Math.max(.35,u);
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
      if(e.kind!=='building'||e.components.buildingType!=='barracks'||!e.components.construction?.complete||e.components.health?.destroyed)continue;
      const p=e.components.production||(e.components.production={queue:[],active:null});
      if(!p.active&&p.queue.length)p.active=p.queue.shift();
      if(!p.active)continue;
      p.active.remaining=Math.max(0,p.active.remaining-dt);
      if(p.active.remaining<=0){const unitType=p.active.unitType;p.active=null;if(unitType==='aegisRifleman')this._spawnRiflemanEntity(e);}
    }
  }

  _systemInfantryCombat(dt){
    const rifleDef=UNIT_DEFINITIONS.aegisRifleman,weapon=WEAPONS[rifleDef.primaryWeapon];
    for(const e of this.sim.entities.values()){
      if(e.components.unitType!==rifleDef.id||e.components.health?.destroyed||e.components.move?.moving)continue;
      const t=e.components.transform;
      let target=null,best=Infinity;
      for(const other of this.sim.entities.values()){
        if(other.components.owner!=='enemy'||other.components.health?.destroyed||!['target','unit','building'].includes(other.kind))continue;
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
      if(target.kind==='target')this.renderEvents.push({type:'targetHit',entityId:target.id,current:hp.current,max:hp.max,destroyed});
    }
  }
  _systemProjectiles(dt){
    for(const e of [...this.sim.entities.values()]){
      if(e.kind!=='projectile')continue;const t=e.components.transform,p=e.components.projectile;p.life-=dt;p.vz-=p.gravity*dt;t.x+=p.vx*dt;t.y+=p.vy*dt;t.z+=p.vz*dt;let hitTarget=null;
      for(const target of this.sim.entities.values()){
        if(target.kind!=='target'||target.components.health?.destroyed)continue;const tt=target.components.transform,r=target.components.collisionRadius||7;if(Math.hypot(t.x-tt.x,t.y-tt.y,t.z-(tt.z+3.2))<r){hitTarget=target;break;}
      }
      if(hitTarget){const hp=hitTarget.components.health;hp.current=Math.max(0,hp.current-p.damage);const destroyed=hp.current<=0;if(destroyed)hp.destroyed=true;this.renderEvents.push({type:'impact',position:{x:t.x,y:t.y,z:t.z},big:destroyed});this.renderEvents.push({type:'targetHit',entityId:hitTarget.id,current:hp.current,max:hp.max,destroyed});this.sim.destroyEntity(e.id);continue;}
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
      else if(ev.type==='spawnProjectile'){const e=this.sim.entities.get(ev.entityId);if(e){const mesh=new THREE.Mesh(new THREE.SphereGeometry(.28,8,6),new THREE.MeshStandardMaterial({color:0xffd37a,emissive:0xff7a18,emissiveIntensity:3,roughness:.25}));const t=e.components.transform;mesh.position.set(t.x,t.y,t.z);this.effects.add(mesh);this.projectileViews.set(e.id,mesh);}}
      else if(ev.type==='spawnRifleman'){const e=this.sim.entities.get(ev.entityId);if(e){const promise=this._createRiflemanView(e);this.infantryViewPromises.set(e.id,promise);promise.catch(err=>{console.error('Rifleman visual load failed',err);this.renderEvents.push({type:'message',message:`Rifleman visual load failed: ${err.message}`});});}}
      else if(ev.type==='infantryFire'){const v=this.infantryUnits.find(x=>x.entityId===ev.entityId);if(v?.fireAction){v.fireTimer=.70;if(v.walkAction)v.walkAction.paused=true;v.fireAction.reset();v.fireAction.setLoop(THREE.LoopOnce,1);v.fireAction.clampWhenFinished=true;v.fireAction.play();}this._rifleTracer(ev.from,ev.to);}
      else if(ev.type==='muzzleFlash')this._muzzleFlash(ev.position);
      else if(ev.type==='impact')this._impact(ev.position,ev.big);
      else if(ev.type==='targetHit'){const v=this.enemyTargets.find(t=>t.entityId===ev.entityId);if(ev.destroyed){if(v)v.group.visible=false;this.lastMessage='Training target destroyed.';}else this.lastMessage=`Hit training target · ${Math.round(ev.current)}/${Math.round(ev.max)} HP.`;}
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
      else if(this._isGroundUnit(e)){if(this._isInfantry(e))this._collisionDebugCircle(t.x,t.y,z,UNIT_DEFINITIONS[e.components.unitType]?.collisionRadius||.4,0x7fffa0);else this._collisionDebugRect(this._unitCollisionRect(e),z,0x5de6ff);}
    }
  }

  _syncViews(dt=0){
    if(this.tank){const e=this.sim.entities.get(this.tank.entityId);if(e){const t=e.components.transform,tur=e.components.turret;this.tank.root.position.set(t.x,t.y,t.z);this.tank.root.rotation.z=t.heading;this.tank.turret.rotation.y=tur.yaw;this.tank.gun.rotation.z=tur.pitch;this._updatePresentationShadow(this.tank,t);}}
    for(const v of this.supportUnits){const e=this.sim.entities.get(v.entityId);if(!e)continue;const t=e.components.transform;v.root.position.set(t.x,t.y,t.z);v.root.rotation.z=t.heading;if(v.rotorMain)v.rotorMain.rotation.y+=dt*10.8;if(v.rotorTail)v.rotorTail.rotation.z+=dt*14.4;this._updatePresentationShadow(v,t);}
    for(const v of this.infantryUnits){const e=this.sim.entities.get(v.entityId);if(!e||e.components.health?.destroyed){v.root.visible=false;continue;}const t=e.components.transform,moving=!!e.components.move?.moving;v.root.position.set(t.x,t.y,t.z);v.root.rotation.z=t.heading;if(v.fireTimer>0){v.fireTimer=Math.max(0,v.fireTimer-dt);}else if(v.walkAction){if(moving){v.walkAction.paused=false;v.walkAction.enabled=true;v.walkAction.play();}else{v.walkAction.paused=true;v.walkAction.time=.25;}}v.mixer?.update?.(dt);this._updatePresentationShadow(v,t);}
    for(const v of this.buildings){const e=this.sim.entities.get(v.entityId);if(!e)continue;const t=e.components.transform,c=e.components.construction;v.group.position.set(t.x,t.y,t.z);v.group.rotation.z=t.heading||0;if(c&&!c.complete)v.group.scale.z=Math.max(.03,c.progress);else v.group.scale.z=1;if(v.functional?.radar)v.functional.radar.rotation.y+=dt*.32;if(v.functional?.fans)for(const f of v.functional.fans)f.rotation.z+=dt*4.2;if(v.functional?.dustFan)v.functional.dustFan.rotation.z+=dt*9.6;}
    for(const [id,mesh] of [...this.projectileViews.entries()]){const e=this.sim.entities.get(id);if(!e){this.effects.remove(mesh);disposeObject(mesh);this.projectileViews.delete(id);}else{const t=e.components.transform;mesh.position.set(t.x,t.y,t.z);}}
    this._updateCollisionDebug();
  }

  _setCamera(){if(!this.tank)return;const hostAspect=Math.max(.5,this.renderer.domElement.clientWidth/Math.max(1,this.renderer.domElement.clientHeight)),landscape=hostAspect>=1.2,tactical=this.viewMode==='tactical',span=tactical?(landscape?40:46):(landscape?62:58);this.camera.left=-span*hostAspect;this.camera.right=span*hostAspect;this.camera.top=span;this.camera.bottom=-span;this.camera.near=.1;this.camera.far=2200;this.camera.up.set(0,0,1);this.camera.userData.skirmishLandscape=landscape;this.camera.userData.skirmishViewMode=this.viewMode;this.camera.updateProjectionMatrix();this._followCamera(true);}
  _followCamera(force=false){if(!this.follow||!this.tank)return;const p=this.tank.root.position,target=new THREE.Vector3(p.x,p.y,p.z+3.2),landscape=this.camera.userData.skirmishLandscape!==false,tactical=this.viewMode==='tactical',offset=tactical?(landscape?new THREE.Vector3(54,-68,42):new THREE.Vector3(50,-62,52)):(landscape?new THREE.Vector3(78,-98,58):new THREE.Vector3(65,-82,68)),desired=target.clone().add(offset);if(force){this.camera.position.copy(desired);this.controls.target.copy(target);}else{this.camera.position.lerp(desired,.12);this.controls.target.lerp(target,.16);}this.camera.lookAt(this.controls.target);}

  update(dt){if(!this.active||!this.started)return;const steps=this.sim.advance(dt);this._consumeRenderEvents();this._syncViews(dt);if(steps>0)this._updateFx(steps*this.sim.clock.fixedDelta);if(steps>0&&this.sim.clock.tick-this.lastUiTick>=6){this.lastUiTick=this.sim.clock.tick;this._emit();}this._followCamera(false);}

  drawMinimap(canvas){
    this.mapForge.drawMinimap(canvas);if(!canvas||!this.mapForge.recipe)return;const ctx=canvas.getContext('2d'),w=canvas.width,size=this.mapForge.recipe.size,H=size/2,s=w/size;
    for(const v of this.buildings){const e=this.sim.entities.get(v.entityId);if(!e||e.components.health?.destroyed)continue;const t=e.components.transform;ctx.fillStyle=e.components.owner==='player'?'#6de38d':'#da6958';ctx.fillRect((t.x+H)*s-2,w-(t.y+H)*s-2,4,4);}
    for(const v of this.enemyTargets){const e=this.sim.entities.get(v.entityId);if(!e||e.components.health?.destroyed)continue;const t=e.components.transform;ctx.fillStyle='#df6657';ctx.beginPath();ctx.arc((t.x+H)*s,w-(t.y+H)*s,4,0,Math.PI*2);ctx.fill();}
    for(const v of this.supportUnits){const e=this.sim.entities.get(v.entityId);if(!e||e.components.health?.destroyed)continue;const t=e.components.transform;ctx.fillStyle='#7fdba0';ctx.beginPath();ctx.arc((t.x+H)*s,w-(t.y+H)*s,3,0,Math.PI*2);ctx.fill();}
    for(const v of this.infantryUnits){const e=this.sim.entities.get(v.entityId);if(!e||e.components.health?.destroyed)continue;const t=e.components.transform;ctx.fillStyle='#a8f2b7';ctx.beginPath();ctx.arc((t.x+H)*s,w-(t.y+H)*s,1.8,0,Math.PI*2);ctx.fill();}
    if(this.tank){const e=this.sim.entities.get(this.tank.entityId);if(e){const t=e.components.transform;ctx.fillStyle='#a9ffb6';ctx.beginPath();ctx.arc((t.x+H)*s,w-(t.y+H)*s,5,0,Math.PI*2);ctx.fill();}}
  }

  state(){
    const tank=this.tank&&this.sim.entities.get(this.tank.entityId),hp=tank?.components.health;
    const barracks=this.sim.entities.values().find(e=>e.kind==='building'&&e.components.owner==='player'&&e.components.buildingType==='barracks'&&e.components.construction?.complete&&!e.components.health?.destroyed);
    const prod=barracks?.components.production,riflemanQueue=(prod?.queue?.length||0)+(prod?.active?1:0),riflemanDef=UNIT_DEFINITIONS.aegisRifleman;
    return {credits:this.credits,powerSupply:this.powerSupply,powerUse:this.powerUse,powerNet:(this.playerFaction?.powerNet??0),tankHp:hp?.current||0,tankMaxHp:hp?.max||0,pendingBuild:this.pendingBuild,buildingCount:this.buildings.length,supportUnitCount:this.supportUnits.length,infantryCount:this.infantryUnits.length,barracksReady:!!barracks,riflemanQueue,riflemanCost:riflemanDef.cost,canTrainRifleman:!!barracks&&this.credits>=riflemanDef.cost&&riflemanQueue<5,fireReady:(tank?.components.weapon?.cooldown||0)<=0,message:this.lastMessage,simTick:this.sim.clock.tick,simHz:this.sim.clock.hz,simPaused:this.sim.paused,entityCount:this.sim.entities.count(),stateHash:this.sim.stateHash(),commandLog:this.sim.commands.recent(6),simulationVersion:RTS_SIMULATION_VERSION,viewMode:this.viewMode,collisionDebug:this.collisionDebug};
  }
  _emit(message=null){if(message)this.lastMessage=message;this.onStateChange?.(this.state());}
}
