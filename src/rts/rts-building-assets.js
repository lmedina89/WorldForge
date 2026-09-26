import * as THREE from 'three';

export const RTS_BUILDING_VERSION='0.1.0';

const PALETTES={
  olive:{armor:0x5f6b50,dark:0x252b28,trim:0x88936c,accent:0xd1a84b,glass:0x405660,concrete:0x6d6d64},
  desert:{armor:0x9d895f,dark:0x2d2a25,trim:0xc0a679,accent:0xd5aa4c,glass:0x56616a,concrete:0x777066},
  slate:{armor:0x59636a,dark:0x242a2e,trim:0x7f8b92,accent:0xd09f45,glass:0x3d515e,concrete:0x676b6d},
  red:{armor:0x6a5148,dark:0x2b2524,trim:0x8f6a5e,accent:0xd8a247,glass:0x46565f,concrete:0x6c6763}
};

export const RTS_BUILDINGS=Object.freeze({
  constructionYard:{id:'constructionYard',label:'Construction Yard',cost:0,hp:2200,footprint:[24,20],powerUse:0,powerSupply:0,buildRadius:125,category:'core'},
  powerPlant:{id:'powerPlant',label:'Power Plant',cost:500,hp:900,footprint:[18,14],powerUse:0,powerSupply:100,category:'power'},
  refinery:{id:'refinery',label:'Refinery',cost:900,hp:1250,footprint:[24,18],powerUse:18,powerSupply:0,category:'economy'},
  barracks:{id:'barracks',label:'Barracks',cost:650,hp:900,footprint:[17,12],powerUse:10,powerSupply:0,category:'production'},
  vehicleFactory:{id:'vehicleFactory',label:'Vehicle Factory',cost:1200,hp:1700,footprint:[30,23],powerUse:30,powerSupply:0,category:'production'},
  gunTurret:{id:'gunTurret',label:'Gun Turret',cost:600,hp:700,footprint:[9,9],powerUse:12,powerSupply:0,category:'defense'}
});

function materials(name='olive'){
  const p=PALETTES[name]||PALETTES.olive;
  const m=(color,rough=.84,metal=.05,extra={})=>new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal,...extra});
  return {armor:m(p.armor,.8,.08),dark:m(p.dark,.72,.2),trim:m(p.trim,.82,.04),accent:m(p.accent,.72,.1),glass:m(p.glass,.24,.12,{transparent:true,opacity:.72}),concrete:m(p.concrete,.97,0),light:new THREE.MeshStandardMaterial({color:0xffc86a,emissive:0xff8a24,emissiveIntensity:1.8,roughness:.45})};
}
function box(parent,name,size,pos,mat,bevel=false){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);mesh.name=name;mesh.position.set(...pos);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function cyl(parent,name,r,depth,pos,mat,segments=10){
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,depth,segments),mat);mesh.name=name;mesh.rotation.x=Math.PI/2;mesh.position.set(...pos);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function cylX(parent,name,r,depth,pos,mat,segments=10){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,depth,segments),mat);mesh.name=name;mesh.rotation.z=-Math.PI/2;mesh.position.set(...pos);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function socket(parent,name,pos){const g=new THREE.Group();g.name=name;g.position.set(...pos);parent.add(g);return g;}
function roofVent(parent,x,y,z,m){
  const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);
  box(g,'VentBase',[2.8,2.2,.45],[0,0,.225],m.dark);for(let i=-1;i<=1;i++)box(g,'VentSlat',[2.2,.18,.25],[0,i*.52,.62],m.trim);
}
function lamp(parent,x,y,z,m){const a=cyl(parent,'Lamp',.24,.28,[x,y,z],m.light,8);a.rotation.y=Math.PI/2;return a;}
function makeFoundation(root,w,d,m){box(root,'Foundation',[w,d,.65],[0,0,.325],m.concrete);}
function makeConstructionYard(root,m){
  makeFoundation(root,24,20,m);box(root,'MainHall',[15,12,6.8],[-2,0,4.05],m.armor);box(root,'ControlBlock',[7,7,4.8],[7,3,3.05],m.trim);box(root,'ControlGlass',[.3,5.2,1.5],[10.65,3,4.3],m.glass);
  box(root,'ServiceBay',[7.8,9.2,3.7],[-5,-.2,2.45],m.dark);const door=box(root,'DoorRoot',[.45,7.2,3.1],[-9.12,-.2,2.2],m.trim);door.userData.functional='door';
  const crane=new THREE.Group();crane.name='CraneRoot';crane.position.set(5,-5.5,.65);root.add(crane);cyl(crane,'CraneMast',.55,7,[0,0,3.5],m.dark,10);box(crane,'CraneArm',[9,.65,.65],[3.7,0,6.55],m.trim);box(crane,'HookCable',[.16,.16,3.0],[7.5,0,4.8],m.dark);
  box(root,'AntennaBase',[2.4,2.4,1.2],[7,-3,7.4],m.dark);cyl(root,'Antenna',.12,6,[7,-3,10.9],m.dark,8);roofVent(root,0,3,7.45,m);lamp(root,10.9,-5.5,3,m);lamp(root,10.9,5.5,3,m);
  socket(root,'BuildOriginSocket',[0,0,.7]);socket(root,'SmokeSocket',[-2,2,7.7]);socket(root,'DamageSocket_01',[-4,-3,4]);
}
function makePowerPlant(root,m){
  makeFoundation(root,18,14,m);box(root,'GeneratorHall',[14,10,4.8],[0,0,3.05],m.armor);box(root,'ControlCab',[5.2,5.8,3.8],[5,0,5.3],m.trim);box(root,'ControlGlass',[.24,4.3,1.2],[7.72,0,5.7],m.glass);
  for(const y of [-3.1,3.1]){cyl(root,'TurbineHousing',2.2,5.5,[-2,y,5.1],m.dark,12);cyl(root,'TurbineCap',1.2,5.8,[-2,y,5.1],m.accent,12);}
  for(const x of [-5,4]){cyl(root,'ExhaustStack',.65,7,[x,-4.1,7.9],m.dark,10);cyl(root,'ExhaustCap',.9,.6,[x,-4.1,11.7],m.trim,10);}
  roofVent(root,1,0,5.7,m);socket(root,'SmokeSocket_A',[-5,-4.1,12.2]);socket(root,'SmokeSocket_B',[4,-4.1,12.2]);socket(root,'DamageSocket_01',[0,0,5.8]);
}
function makeRefinery(root,m){
  makeFoundation(root,24,18,m);box(root,'ProcessingHall',[12,12,6],[2,0,3.65],m.armor);box(root,'UnloadBay',[8,9,3.4],[-7,0,2.35],m.dark);box(root,'UnloadDoor',[.4,6.6,2.6],[-11.2,0,2.35],m.trim);
  for(const y of [-4.2,4.2]){cyl(root,'StorageTank',2.25,7.5,[7,y,5.0],m.trim,14);cyl(root,'TankTop',2.0,.7,[7,y,8.95],m.dark,14);}
  const pipeMat=m.dark;for(const y of [-3.2,3.2])cylX(root,'TransferPipe',.35,10,[-1,y,6.1],pipeMat,8);
  box(root,'PumpStation',[4.5,5,2.6],[-4,5,1.95],m.accent);socket(root,'HarvesterDock',[-13,0,.7]);socket(root,'SmokeSocket',[2,0,7]);
}
function makeBarracks(root,m){
  makeFoundation(root,17,12,m);box(root,'BarracksBody',[13.5,9.5,5.1],[0,0,3.05],m.armor);box(root,'EntryPorch',[3.4,4.3,3],[7.2,0,2.2],m.dark);box(root,'EntryDoor',[.35,2.6,2.6],[8.95,0,2.2],m.trim);
  for(const y of [-3.2,0,3.2])box(root,'Window',[.22,1.8,1.25],[-6.88,y,3.8],m.glass);box(root,'RoofArmor',[12.4,8.5,.55],[0,0,5.88],m.trim);roofVent(root,-2,2,6.2,m);cyl(root,'RadioMast',.12,5,[4,-3.3,8.4],m.dark,8);socket(root,'InfantryExit',[9.5,0,.7]);socket(root,'DamageSocket_01',[0,0,5.3]);
}
function makeVehicleFactory(root,m){
  makeFoundation(root,30,23,m);box(root,'FactoryHall',[22,18,8],[1,0,4.65],m.armor);box(root,'AssemblyWing',[7,14,5.7],[-11,0,3.5],m.trim);box(root,'RoofSpine',[18,4,.9],[1,0,9.1],m.dark);
  const doorRoot=new THREE.Group();doorRoot.name='DoorRoot';doorRoot.position.set(12.2,0,.65);root.add(doorRoot);box(doorRoot,'BlastDoor',[.55,12.5,6.3],[0,0,3.15],m.dark);for(let y=-5;y<=5;y+=2.5)box(doorRoot,'DoorRib',[.72,.24,5.8],[.08,y,3.15],m.trim);
  for(const y of [-7.2,7.2])cyl(root,'ExhaustStack',.6,7,[-5,y,10.9],m.dark,10);box(root,'ControlTower',[5.5,6,4.3],[6,-6,9.0],m.trim);box(root,'ControlGlass',[.25,4.3,1.35],[8.88,-6,9.5],m.glass);
  socket(root,'ProductionExit',[18,0,.8]);socket(root,'RallySocket',[28,0,.8]);socket(root,'SmokeSocket',[-5,0,9.2]);socket(root,'DamageSocket_01',[2,3,7]);
}
function makeGunTurret(root,m){
  makeFoundation(root,9,9,m);cyl(root,'TurretBase',3.5,1.5,[0,0,1.4],m.concrete,14);const turret=new THREE.Group();turret.name='TurretRoot';turret.position.set(0,0,2.0);root.add(turret);box(turret,'TurretBody',[5.4,4.4,2.6],[0,0,1.6],m.armor);box(turret,'FrontArmor',[2.3,4.9,1.8],[2.7,0,1.55],m.trim);
  const gun=new THREE.Group();gun.name='GunPitchRoot';gun.position.set(2.6,0,1.7);turret.add(gun);cylX(gun,'GunBarrel',.28,7,[3.5,0,0],m.dark,10);cylX(gun,'BarrelSleeve',.46,2.1,[1.0,0,0],m.trim,10);socket(gun,'MuzzleSocket',[7.1,0,0]);
  box(turret,'Optic',[1.0,1.2,.8],[.5,-1.9,3.0],m.glass);socket(root,'DamageSocket_01',[0,0,3.8]);
}

export function createRTSBuilding(type,{palette='olive'}={}){
  const def=RTS_BUILDINGS[type];if(!def)throw new Error(`Unknown RTS building: ${type}`);
  const root=new THREE.Group();root.name='BuildingRoot';root.userData={...def,buildingType:type,buildingVersion:RTS_BUILDING_VERSION};
  const m=materials(palette);
  if(type==='constructionYard')makeConstructionYard(root,m);
  else if(type==='powerPlant')makePowerPlant(root,m);
  else if(type==='refinery')makeRefinery(root,m);
  else if(type==='barracks')makeBarracks(root,m);
  else if(type==='vehicleFactory')makeVehicleFactory(root,m);
  else if(type==='gunTurret')makeGunTurret(root,m);
  return {group:root,definition:def,info:{label:def.label,cost:def.cost,hp:def.hp,footprint:[...def.footprint],powerUse:def.powerUse,powerSupply:def.powerSupply,version:RTS_BUILDING_VERSION}};
}
