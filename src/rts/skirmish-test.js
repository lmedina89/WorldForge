import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createRTSBuilding, RTS_BUILDINGS } from './rts-building-assets.js';
import { RTSSimulation, RTS_SIMULATION_VERSION } from './sim/rts-simulation.js';
import { COMMAND_SOURCES } from './sim/command-bus.js';
import { RTS_COMMANDS } from './sim/rts-commands.js';
import { LOCOMOTORS, WEAPONS, UNIT_DEFINITIONS } from './data/rts-definitions.js';
import { instantiateMasterBuilding, masterBuildingForRole, MASTER_BUILDINGS } from './rts-asset-library.js';
import { loadAegisReferenceVehicle } from '../vehicle/vehicle-generator.js';

export const SKIRMISH_VERSION='0.4.1';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
function disposeObject(root){if(!root)return;root.traverse(o=>{o.geometry?.dispose?.();const ms=Array.isArray(o.material)?o.material:(o.material?[o.material]:[]);ms.forEach(m=>m?.dispose?.());});}
function cloneMaterials(root){root.traverse(o=>{if(!o.material)return;o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();});return root;}

export class SkirmishTest{
  constructor({scene,camera,renderer,controls,mapForge,onStateChange=null}){
    this.scene=scene;this.camera=camera;this.renderer=renderer;this.controls=controls;this.mapForge=mapForge;this.onStateChange=onStateChange;
    this.loader=new GLTFLoader();this.root=new THREE.Group();this.root.name='WorldForgeSkirmish';this.root.visible=false;scene.add(this.root);
    this.effects=new THREE.Group();this.effects.name='SkirmishEffects';this.root.add(this.effects);
    this.active=false;this.started=false;this.mapSignature='';this.tank=null;this.supportUnits=[];this.supportSerial=0;this.enemyTargets=[];this.buildings=[];this.buildingViewPromises=new Map();this.fx=[];this.projectileViews=new Map();this.renderEvents=[];
    this.drive={forward:false,back:false,left:false,right:false};this.aimPoint=new THREE.Vector3();this.pendingBuild=null;this.follow=true;this.lastMessage='';this.buildSerial=1;this.playerPalette='aegis';this.enemyPalette='crimson';
    this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.aimMarker=this._makeAimMarker();this.root.add(this.aimMarker);this.aimMarker.visible=false;
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
    this.sim.addSystem('locomotion',(dt)=>this._systemLocomotion(dt),{priority:10});
    this.sim.addSystem('turret-aim',(dt)=>this._systemTurretAim(dt),{priority:20});
    this.sim.addSystem('weapons',(dt)=>this._systemWeapons(dt),{priority:30});
    this.sim.addSystem('construction',(dt)=>this._systemConstruction(dt),{priority:40});
    this.sim.addSystem('projectiles',(dt)=>this._systemProjectiles(dt),{priority:50});
  }

  _makeAimMarker(){
    const g=new THREE.Group();g.name='AimMarker';const m=new THREE.MeshBasicMaterial({color:0xffcf57,transparent:true,opacity:.86,depthWrite:false});
    const r=new THREE.Mesh(new THREE.RingGeometry(2.3,2.8,28),m);r.position.z=.25;g.add(r);const c=new THREE.Mesh(new THREE.CircleGeometry(.45,18),m);c.position.z=.28;g.add(c);return g;
  }
  setActive(active){this.active=!!active;this.root.visible=this.active;if(!this.active)this.clearDrive();}
  clearDrive(){
    for(const k of Object.keys(this.drive))this.drive[k]=false;
    const e=this.tank&&this.sim.entities.get(this.tank.entityId);if(e?.components?.input)for(const k of Object.keys(e.components.input))e.components.input[k]=false;
  }
  setDrive(key,on){if(!(key in this.drive)||!this.tank)return;this.drive[key]=!!on;this.sim.issueCommand(RTS_COMMANDS.DRIVE_INPUT,{entityId:this.tank.entityId,key,on:!!on},{source:COMMAND_SOURCES.PLAYER});}
  setFollow(on){this.follow=!!on;this._emit();}
  resizeCamera(){if(this.active)this._setCamera();}
  setSimulationPaused(paused){this.sim.setPaused(paused);this._emit(paused?'Simulation paused.':'Simulation resumed.');}
  stepSimulation(){if(!this.started)return;this.sim.stepOnce();this._consumeRenderEvents();this._syncViews();this._emit(`Advanced one simulation tick to ${this.sim.clock.tick}.`);}
  exportSnapshot(){return this.sim.snapshot();}

  async start({reset=false}={}){
    if(!this.mapForge?.metadata)throw new Error('Generate an RTS map before starting skirmish mode.');
    const sig=`${this.mapForge.recipe?.seed||0}:${this.mapForge.recipe?.size||0}:${this.mapForge.recipe?.biome||''}`;if(this.mapSignature!==sig)reset=true;
    if(this.started&&!reset){this.setActive(true);this._setCamera();this._emit();return;}
    this.mapSignature=sig;this._clearSession();
    this.sim.reset({seed:this.mapForge.recipe?.seed||1});this.lastUiTick=-999;this.playerFaction=this.sim.createFaction('player',{credits:5000});this.enemyFaction=this.sim.createFaction('enemy',{credits:0});this.pendingBuild=null;this.buildSerial=1;
    await this._spawnPlayerTank();await this._spawnStartingConstructionYard();this._spawnTrainingTarget();this.started=true;this.setActive(true);this._setCamera();this._emit('Skirmish ready · compact military masters active · Field Refinery includes one docked Field Harvester on completion.');
  }

  _clearSession(){
    this.clearDrive();this.tank=null;this.supportUnits=[];this.supportSerial=0;this.enemyTargets=[];this.buildings=[];this.buildingViewPromises.clear();this.fx=[];this.projectileViews.clear();this.renderEvents=[];this.aimMarker.visible=false;this.started=false;
    while(this.root.children.length){const c=this.root.children[this.root.children.length-1];this.root.remove(c);if(c!==this.aimMarker)disposeObject(c);}
    this.effects=new THREE.Group();this.effects.name='SkirmishEffects';this.root.add(this.effects);this.aimMarker=this._makeAimMarker();this.root.add(this.aimMarker);this.aimMarker.visible=false;
  }

  async _spawnPlayerTank(){
    const def=UNIT_DEFINITIONS.aegisMbt,loc=LOCOMOTORS[def.locomotor],weapon=WEAPONS[def.primaryWeapon];
    const gltf=await this.loader.loadAsync(def.asset);const source=cloneMaterials(gltf.scene);source.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    const axis=new THREE.Group();axis.name='AegisX_ZUpAxis';axis.rotation.x=Math.PI/2;axis.add(source);const vehicle=new THREE.Group();vehicle.name='Player_AegisX';vehicle.add(axis);this.root.add(vehicle);
    const start=this.mapForge.metadata.startRegions[0],toward=new THREE.Vector2(-start.x,-start.y).normalize(),x=start.x+toward.x*58,y=start.y+toward.y*58,z=this.mapForge.surfaceHeightAt(x,y)-.1,heading=Math.atan2(toward.y,toward.x);
    const turret=source.getObjectByName('TurretRoot'),gun=source.getObjectByName('GunPitchRoot'),muzzle=source.getObjectByName(weapon.muzzleSocket);if(!turret||!gun||!muzzle)throw new Error('Aegis-X articulation nodes are missing.');
    const aim={x:x+Math.cos(heading)*100,y:y+Math.sin(heading)*100,z:this.mapForge.surfaceHeightAt(x+Math.cos(heading)*100,y+Math.sin(heading)*100)+1.5};
    const e=this.sim.createEntity('unit',{unitType:def.id,owner:'player',transform:{x,y,z,heading},health:{current:def.maxHp,max:def.maxHp,destroyed:false},locomotor:{...loc},input:{forward:false,back:false,left:false,right:false},turret:{yaw:0,pitch:0,yawRate:1.9,pitchRate:.8,aimPoint:aim},weapon:{id:weapon.id,cooldown:0}},'player');
    vehicle.position.set(x,y,z);vehicle.rotation.z=heading;this.tank={entityId:e.id,root:vehicle,source,axis,turret,gun,muzzle,definition:def};this.aimPoint.set(aim.x,aim.y,aim.z);
  }


  async spawnSupportUnit(archetype){
    if(!this.started)return false;
    const map={hmmwv50:UNIT_DEFINITIONS.aegisHmmwv,attackHeli:UNIT_DEFINITIONS.aegisTalon,fieldHarvester:UNIT_DEFINITIONS.aegisHarvester},def=map[archetype];if(!def)return false;
    const paletteMap={aegis:'olive',desert:'desert',crimson:'red',slate:'slate',blackops:'slate'},result=await loadAegisReferenceVehicle({type:archetype,palette:paletteMap[this.playerPalette]||'olive',seed:(this.mapForge.recipe?.seed||1)+this.supportSerial});
    const source=result.group;source.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    const axis=new THREE.Group();axis.name='SupportUnit_YUp_to_ZUp';axis.rotation.x=Math.PI/2;axis.add(source);const root=new THREE.Group();root.name=`Support_${def.id}_${++this.supportSerial}`;root.add(axis);this.root.add(root);
    const base=this.tank?this.sim.entities.get(this.tank.entityId)?.components.transform:null,start=this.mapForge.metadata.startRegions[0],bx=base?.x??start.x,by=base?.y??start.y,heading=base?.heading??0,side=new THREE.Vector2(-Math.sin(heading),Math.cos(heading));
    const offset=14+this.supportSerial*7,x=bx+side.x*offset-Math.cos(heading)*8,y=by+side.y*offset-Math.sin(heading)*8,loc=LOCOMOTORS[def.locomotor],ground=this.mapForge.surfaceHeightAt(x,y),z=loc.movementClass==='air'?ground+(loc.preferredAltitude||22):ground-.1;
    const e=this.sim.createEntity('unit',{unitType:def.id,owner:'player',transform:{x,y,z,heading},health:{current:def.maxHp,max:def.maxHp,destroyed:false},locomotor:{...loc}},'player');root.position.set(x,y,z);root.rotation.z=heading;
    const wheelNames=archetype==='fieldHarvester'?['FrontLeftWheelSpinRoot','FrontRightWheelSpinRoot','MidLeftWheelSpinRoot','MidRightWheelSpinRoot','RearLeftWheelSpinRoot','RearRightWheelSpinRoot']:['FL','FR','RL','RR'].map(k=>`WheelSpinRoot_${k}`);
    const view={entityId:e.id,root,source,axis,definition:def,archetype,rotorMain:source.getObjectByName('MainRotorRoot'),rotorTail:source.getObjectByName('TailRotorRoot'),wheels:wheelNames.map(n=>source.getObjectByName(n)).filter(Boolean),collector:source.getObjectByName('CollectorDrumRoot'),dumpDoors:[source.getObjectByName('HopperDoorLeftRoot'),source.getObjectByName('HopperDoorRightRoot')].filter(Boolean)};this.supportUnits.push(view);this._emit(`${def.label} master asset deployed for skirmish testing.`);return true;
  }

  _buildingComponents(type,x,y,{owner='player',complete=false}={}){
    const def=RTS_BUILDINGS[type];return {buildingType:type,owner,transform:{x,y,z:this.mapForge.surfaceHeightAt(x,y),heading:0},health:{current:def.hp,max:def.hp,destroyed:false},building:{footprint:[...def.footprint],buildRadius:def.buildRadius||0,powerUse:def.powerUse||0,powerSupply:def.powerSupply||0,starterUnit:def.starterUnit||null,starterUnitSpawned:false},construction:{progress:complete?1:0,duration:1.8,complete:!!complete}};
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
    const view={entityId:entity.id,id:g.name,type,group:g,def,owner:entity.components.owner,masterAsset,functional:{radar:g.getObjectByName('RadarYawRoot'),fans:[1,2,3,4].map(i=>g.getObjectByName(`CoolingFanRoot_${i}`)).filter(Boolean),dustFan:g.getObjectByName('DustCollectorFanRoot'),apronFeeder:g.getObjectByName('ApronFeederRoot'),dockSignal:g.getObjectByName('DockSignalRoot')}};this.buildings.push(view);return view;
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
    this.supportUnits.push(view);b.starterUnitSpawned=true;this.renderEvents.push({type:'message',message:'Field Refinery complete · starter Field Harvester docked inside the unload bay.'});return true;
  }

  async _spawnStartingConstructionYard(){
    const start=this.mapForge.metadata.startRegions[0],e=this.sim.createEntity('building',this._buildingComponents('constructionYard',start.x,start.y,{owner:'player',complete:true}),'player');await this._createBuildingView(e,{name:'PLAYER_TacticalCommandPost'});
  }
  _spawnTrainingTarget(){
    const start=this.mapForge.metadata.startRegions[0],toward=new THREE.Vector2(-start.x,-start.y).normalize(),side=new THREE.Vector2(-toward.y,toward.x),x=start.x+toward.x*145+side.x*24,y=start.y+toward.y*145+side.y*24;
    const e=this.sim.createEntity('target',this._buildingComponents('gunTurret',x,y,{owner:'enemy',complete:true}),'enemy');e.components.collisionRadius=7;
    const asset=createRTSBuilding('gunTurret',{palette:'red'});asset.group.position.set(x,y,e.components.transform.z);asset.group.name='ENEMY_TestTurret';this.root.add(asset.group);this.enemyTargets.push({entityId:e.id,id:'ENEMY_TEST_TURRET',type:'gunTurret',group:asset.group,radius:7});this.aimPoint.set(x,y,e.components.transform.z+4);
    if(this.tank)this.sim.issueCommand(RTS_COMMANDS.AIM,{entityId:this.tank.entityId,point:{x,y,z:e.components.transform.z+4}},{source:COMMAND_SOURCES.SYSTEM,delayTicks:0});
  }

  selectBuild(type){if(!RTS_BUILDINGS[type]||type==='constructionYard'){this.pendingBuild=null;this._emit('Build selection cleared.');return;}this.pendingBuild=type;this._emit(`${RTS_BUILDINGS[type].label} selected · $${RTS_BUILDINGS[type].cost}. Tap buildable terrain near your structures.`);}
  cancelBuild(){this.pendingBuild=null;this._emit('Build placement cancelled.');}
  _isBuildableFootprint(x,y,def){const [w,d]=def.footprint,samples=[[0,0],[w*.42,d*.42],[w*.42,-d*.42],[-w*.42,d*.42],[-w*.42,-d*.42]];return samples.every(([ox,oy])=>this.mapForge.buildableAt(x+ox,y+oy));}
  _withinBuildRadius(x,y){return this.buildings.some(v=>{const e=this.sim.entities.get(v.entityId);return e&&e.components.owner==='player'&&e.components.construction?.complete&&Math.hypot(x-e.components.transform.x,y-e.components.transform.y)<=Math.max(85,v.def.buildRadius||105);});}
  _collidesBuilding(x,y,def){const r=Math.hypot(def.footprint[0],def.footprint[1])*.48;return this.buildings.some(v=>{const e=this.sim.entities.get(v.entityId);if(!e||e.components.health?.destroyed)return false;const br=Math.hypot(v.def.footprint[0],v.def.footprint[1])*.48;return Math.hypot(x-e.components.transform.x,y-e.components.transform.y)<r+br+2;});}
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
  _blockedByStructureSim(x,y,ignoreEntityId=null){
    for(const e of this.sim.entities.values()){
      if(e.id===ignoreEntityId||e.components.health?.destroyed||!['building','target'].includes(e.kind))continue;const fp=e.components.building?.footprint||[8,8],r=Math.hypot(fp[0],fp[1])*.46+3,t=e.components.transform;if(Math.hypot(x-t.x,y-t.y)<r)return true;
    }return false;
  }
  _systemLocomotion(dt){
    if(!this.tank)return;const e=this.sim.entities.get(this.tank.entityId);if(!e)return;const c=e.components,t=c.transform,input=c.input,loc=c.locomotor,throttle=(input.forward?1:0)-(input.back?1:0),turn=(input.left?1:0)-(input.right?1:0);
    if(turn)t.heading+=turn*loc.turnRate*dt*(Math.abs(throttle)>.01?.72:1);
    if(throttle){const speed=throttle>0?loc.maxSpeed:loc.reverseSpeed,nx=t.x+Math.cos(t.heading)*speed*dt*throttle,ny=t.y+Math.sin(t.heading)*speed*dt*throttle,nav=this.mapForge.movementAt(nx,ny,loc.movementClass);if(nav.allowed&&!this._blockedByStructureSim(nx,ny,e.id)){t.x=nx;t.y=ny;t.z=this.mapForge.surfaceHeightAt(nx,ny)-.1;}}
  }
  _systemTurretAim(dt){
    if(!this.tank)return;const e=this.sim.entities.get(this.tank.entityId);if(!e)return;const t=e.components.transform,tur=e.components.turret,a=tur.aimPoint;if(!a)return;const desiredWorld=Math.atan2(a.y-t.y,a.x-t.x),localYaw=angleDelta(desiredWorld,t.heading),yawErr=angleDelta(localYaw,tur.yaw);tur.yaw+=clamp(yawErr,-tur.yawRate*dt,tur.yawRate*dt);const horizontal=Math.hypot(a.x-t.x,a.y-t.y),desiredPitch=clamp(Math.atan2(a.z-(t.z+2.6),horizontal),-.12,.32),pitchErr=desiredPitch-tur.pitch;tur.pitch+=clamp(pitchErr,-tur.pitchRate*dt,tur.pitchRate*dt);
  }
  _systemConstruction(dt){
    for(const e of this.sim.entities.values()){
      const c=e.components.construction;if(!c||c.complete)continue;c.progress=Math.min(1,c.progress+dt/c.duration);if(c.progress>=1){c.complete=true;this.renderEvents.push({type:'constructionComplete',entityId:e.id,label:RTS_BUILDINGS[e.components.buildingType]?.label||'Structure',buildingType:e.components.buildingType});}
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
  _impact(pos,big=false){const p=new THREE.Vector3(pos.x,pos.y,pos.z),light=new THREE.PointLight(big?0xff7a28:0xffa344,big?10:5,big?42:24,2);light.position.copy(p);this.effects.add(light);this.fx.push({kind:'light',light,life:big?.32:.18,maxLife:big?.32:.18});const count=big?18:9;for(let i=0;i<count;i++){const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(big?.45:.25,0),new THREE.MeshBasicMaterial({color:i%3===0?0xffd36a:0xff7d2d,transparent:true,opacity:.9}));mesh.position.copy(p);this.effects.add(mesh);const a=Math.random()*Math.PI*2,s=(big?8:5)+Math.random()*(big?16:9);this.fx.push({kind:'particle',mesh,vel:new THREE.Vector3(Math.cos(a)*s,Math.sin(a)*s,4+Math.random()*12),life:.45+Math.random()*.5,maxLife:1});}if(big)this._smokeBurst(p);}
  _smokeBurst(pos){for(let i=0;i<8;i++){const s=new THREE.Mesh(new THREE.SphereGeometry(1.2+Math.random()*.9,7,5),new THREE.MeshBasicMaterial({color:0x2d302e,transparent:true,opacity:.48,depthWrite:false}));s.position.copy(pos).add(new THREE.Vector3((Math.random()-.5)*3,(Math.random()-.5)*3,1+Math.random()*3));this.effects.add(s);this.fx.push({kind:'smoke',mesh:s,vel:new THREE.Vector3((Math.random()-.5)*1.3,(Math.random()-.5)*1.3,2+Math.random()*2),life:2.2+Math.random()*1.5,maxLife:3.5});}}
  _updateFx(dt){for(let i=this.fx.length-1;i>=0;i--){const f=this.fx[i];f.life-=dt;const t=clamp(f.life/Math.max(.001,f.maxLife),0,1);if(f.kind==='flash'){f.mesh.scale.setScalar(1+(1-t)*1.4);f.mesh.material.opacity=t;if(f.light)f.light.intensity=6*t;}else if(f.kind==='light'){f.light.intensity*=Math.pow(.08,dt);}else if(f.kind==='particle'){f.vel.z-=14*dt;f.mesh.position.addScaledVector(f.vel,dt);f.mesh.material.opacity=t;}else if(f.kind==='smoke'){f.mesh.position.addScaledVector(f.vel,dt);f.mesh.scale.multiplyScalar(1+dt*.55);f.mesh.material.opacity=.48*t;}if(f.life<=0){if(f.mesh){this.effects.remove(f.mesh);disposeObject(f.mesh);}if(f.light)this.effects.remove(f.light);this.fx.splice(i,1);}}}

  _consumeRenderEvents(){
    for(const ev of this.renderEvents.splice(0)){
      if(ev.type==='message')this.lastMessage=ev.message;
      else if(ev.type==='spawnBuilding'){const e=this.sim.entities.get(ev.entityId);if(e){const promise=this._createBuildingView(e,{name:ev.name});this.buildingViewPromises.set(e.id,promise);promise.catch(err=>{console.error('Building view load failed',err);this.renderEvents.push({type:'message',message:`${RTS_BUILDINGS[e.components.buildingType]?.label||'Building'} visual load failed: ${err.message}`});});}}
      else if(ev.type==='constructionComplete'){const v=this.buildings.find(b=>b.entityId===ev.entityId);if(v)v.group.scale.z=1;this.lastMessage=`${ev.label} complete.`;if(ev.buildingType==='refinery'){void this._spawnStarterHarvesterForRefinery(ev.entityId).catch(err=>{const e=this.sim.entities.get(ev.entityId);if(e?.components?.building)e.components.building.starterUnitSpawned=false;console.error('Starter harvester spawn failed',err);this.renderEvents.push({type:'message',message:`Refinery completed, but starter Harvester failed to dock: ${err.message}`});});}}
      else if(ev.type==='spawnProjectile'){const e=this.sim.entities.get(ev.entityId);if(e){const mesh=new THREE.Mesh(new THREE.SphereGeometry(.28,8,6),new THREE.MeshStandardMaterial({color:0xffd37a,emissive:0xff7a18,emissiveIntensity:3,roughness:.25}));const t=e.components.transform;mesh.position.set(t.x,t.y,t.z);this.effects.add(mesh);this.projectileViews.set(e.id,mesh);}}
      else if(ev.type==='muzzleFlash')this._muzzleFlash(ev.position);
      else if(ev.type==='impact')this._impact(ev.position,ev.big);
      else if(ev.type==='targetHit'){const v=this.enemyTargets.find(t=>t.entityId===ev.entityId);if(ev.destroyed){if(v)v.group.visible=false;this.lastMessage='Training target destroyed.';}else this.lastMessage=`Hit training target · ${Math.round(ev.current)}/${Math.round(ev.max)} HP.`;}
    }
  }
  _syncViews(){
    if(this.tank){const e=this.sim.entities.get(this.tank.entityId);if(e){const t=e.components.transform,tur=e.components.turret;this.tank.root.position.set(t.x,t.y,t.z);this.tank.root.rotation.z=t.heading;this.tank.turret.rotation.y=tur.yaw;this.tank.gun.rotation.z=tur.pitch;}}
    for(const v of this.supportUnits){const e=this.sim.entities.get(v.entityId);if(!e)continue;const t=e.components.transform;v.root.position.set(t.x,t.y,t.z);v.root.rotation.z=t.heading;if(v.rotorMain)v.rotorMain.rotation.y+=.18;if(v.rotorTail)v.rotorTail.rotation.x+=.24;}
    for(const v of this.buildings){const e=this.sim.entities.get(v.entityId);if(!e)continue;const t=e.components.transform,c=e.components.construction;v.group.position.set(t.x,t.y,t.z);v.group.rotation.z=t.heading||0;if(c&&!c.complete)v.group.scale.z=Math.max(.03,c.progress);else v.group.scale.z=1;if(v.functional?.radar)v.functional.radar.rotation.y+=.006;if(v.functional?.fans)for(const f of v.functional.fans)f.rotation.y+=.08;if(v.functional?.dustFan)v.functional.dustFan.rotation.y+=.12;}
    for(const [id,mesh] of [...this.projectileViews.entries()]){const e=this.sim.entities.get(id);if(!e){this.effects.remove(mesh);disposeObject(mesh);this.projectileViews.delete(id);}else{const t=e.components.transform;mesh.position.set(t.x,t.y,t.z);}}
  }

  _setCamera(){if(!this.tank)return;const hostAspect=Math.max(.5,this.renderer.domElement.clientWidth/Math.max(1,this.renderer.domElement.clientHeight)),span=58;this.camera.left=-span*hostAspect;this.camera.right=span*hostAspect;this.camera.top=span;this.camera.bottom=-span;this.camera.near=.1;this.camera.far=2200;this.camera.up.set(0,0,1);this.camera.updateProjectionMatrix();this._followCamera(true);}
  _followCamera(force=false){if(!this.follow||!this.tank)return;const p=this.tank.root.position,target=new THREE.Vector3(p.x,p.y,p.z+3.2),desired=target.clone().add(new THREE.Vector3(65,-82,68));if(force){this.camera.position.copy(desired);this.controls.target.copy(target);}else{this.camera.position.lerp(desired,.12);this.controls.target.lerp(target,.16);}this.camera.lookAt(this.controls.target);}

  update(dt){if(!this.active||!this.started)return;const steps=this.sim.advance(dt);this._consumeRenderEvents();this._syncViews();if(steps>0)this._updateFx(steps*this.sim.clock.fixedDelta);if(steps>0&&this.sim.clock.tick-this.lastUiTick>=6){this.lastUiTick=this.sim.clock.tick;this._emit();}this._followCamera(false);}

  drawMinimap(canvas){
    this.mapForge.drawMinimap(canvas);if(!canvas||!this.mapForge.recipe)return;const ctx=canvas.getContext('2d'),w=canvas.width,size=this.mapForge.recipe.size,H=size/2,s=w/size;
    for(const v of this.buildings){const e=this.sim.entities.get(v.entityId);if(!e||e.components.health?.destroyed)continue;const t=e.components.transform;ctx.fillStyle=e.components.owner==='player'?'#6de38d':'#da6958';ctx.fillRect((t.x+H)*s-2,w-(t.y+H)*s-2,4,4);}
    for(const v of this.enemyTargets){const e=this.sim.entities.get(v.entityId);if(!e||e.components.health?.destroyed)continue;const t=e.components.transform;ctx.fillStyle='#df6657';ctx.beginPath();ctx.arc((t.x+H)*s,w-(t.y+H)*s,4,0,Math.PI*2);ctx.fill();}
    for(const v of this.supportUnits){const e=this.sim.entities.get(v.entityId);if(!e||e.components.health?.destroyed)continue;const t=e.components.transform;ctx.fillStyle='#7fdba0';ctx.beginPath();ctx.arc((t.x+H)*s,w-(t.y+H)*s,3,0,Math.PI*2);ctx.fill();}
    if(this.tank){const e=this.sim.entities.get(this.tank.entityId);if(e){const t=e.components.transform;ctx.fillStyle='#a9ffb6';ctx.beginPath();ctx.arc((t.x+H)*s,w-(t.y+H)*s,5,0,Math.PI*2);ctx.fill();}}
  }

  state(){const tank=this.tank&&this.sim.entities.get(this.tank.entityId),hp=tank?.components.health;return {credits:this.credits,powerSupply:this.powerSupply,powerUse:this.powerUse,powerNet:(this.playerFaction?.powerNet??0),tankHp:hp?.current||0,tankMaxHp:hp?.max||0,pendingBuild:this.pendingBuild,buildingCount:this.buildings.length,supportUnitCount:this.supportUnits.length,fireReady:(tank?.components.weapon?.cooldown||0)<=0,message:this.lastMessage,simTick:this.sim.clock.tick,simHz:this.sim.clock.hz,simPaused:this.sim.paused,entityCount:this.sim.entities.count(),stateHash:this.sim.stateHash(),commandLog:this.sim.commands.recent(6),simulationVersion:RTS_SIMULATION_VERSION};}
  _emit(message=null){if(message)this.lastMessage=message;this.onStateChange?.(this.state());}
}
