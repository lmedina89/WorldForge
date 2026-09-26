import * as THREE from 'three';

export const VEHICLE_GENERATOR_VERSION='0.1.0';

export const VEHICLE_ARCHETYPES=Object.freeze({
  mbt:{label:'Main Battle Tank',drive:'tracked',length:7.4,width:3.6,height:1.45,wheels:6,module:'turret',weapon:'cannon',weaponScale:1.0},
  lightTank:{label:'Light Tank',drive:'tracked',length:6.0,width:3.0,height:1.25,wheels:5,module:'turret',weapon:'cannon',weaponScale:.72},
  apc:{label:'Tracked APC',drive:'tracked',length:6.8,width:3.2,height:1.75,wheels:6,module:'troop',weapon:'mg',weaponScale:.36},
  ifv:{label:'8×8 IFV',drive:'wheeled8',length:7.2,width:3.0,height:1.75,wheels:4,module:'ifv',weapon:'autocannon',weaponScale:.62},
  mrap:{label:'MRAP / Armored Car',drive:'wheeled4',length:5.7,width:2.65,height:2.2,wheels:2,module:'cab',weapon:'mg',weaponScale:.32},
  spg:{label:'Self-Propelled Artillery',drive:'tracked',length:7.8,width:3.5,height:1.5,wheels:7,module:'casemate',weapon:'howitzer',weaponScale:1.35},
  mlrs:{label:'Multiple Rocket Launcher',drive:'wheeled6',length:7.4,width:2.8,height:1.55,wheels:3,module:'rocketPod',weapon:'rockets',weaponScale:1},
  sam:{label:'SAM Carrier',drive:'wheeled8',length:7.4,width:3.0,height:1.55,wheels:4,module:'samRack',weapon:'missiles',weaponScale:1},
  spaag:{label:'Anti-Air Gun',drive:'tracked',length:6.6,width:3.25,height:1.35,wheels:6,module:'aaTurret',weapon:'twinGun',weaponScale:.72},
  recon:{label:'Recon Vehicle',drive:'wheeled6',length:5.8,width:2.55,height:1.45,wheels:3,module:'sensor',weapon:'autocannon',weaponScale:.42},
  truck:{label:'Military Cargo Truck',drive:'wheeled6',length:7.0,width:2.55,height:1.55,wheels:3,module:'cargo',weapon:'none',weaponScale:0}
});

const PALETTES=Object.freeze({
  olive:{armor:0x657055,armor2:0x505b46,dark:0x202521,accent:0x98a66f,glass:0x27383b},
  desert:{armor:0xa28d67,armor2:0x837253,dark:0x2e2a24,accent:0xc6af7d,glass:0x314047},
  slate:{armor:0x59636b,armor2:0x454d54,dark:0x1d2226,accent:0x8ea4ad,glass:0x21333c},
  red:{armor:0x6e4a43,armor2:0x523732,dark:0x211f1e,accent:0xa96859,glass:0x28373a}
});

function mulberry32(seed){let a=(Number(seed)||1)>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function jitter(r,v,a=.08){return v*(1+(r()-.5)*2*a);}
function mat(color,metal=.05){return new THREE.MeshStandardMaterial({color,roughness:.86,metalness:metal,flatShading:true});}
function addMesh(g,geom,material,pos=[0,0,0],rot=[0,0,0],name='part'){const m=new THREE.Mesh(geom,material);m.position.set(...pos);m.rotation.set(...rot);m.castShadow=true;m.receiveShadow=true;m.name=name;g.add(m);return m;}
function box(g,s,material,pos,name='box',rot=[0,0,0]){return addMesh(g,new THREE.BoxGeometry(s[0],s[1],s[2],1,1,1),material,pos,rot,name);}
function cyl(g,r,len,material,pos,axis='y',segments=10,name='cylinder'){
  const geom=new THREE.CylinderGeometry(r,r,len,segments,1,false);const rot=axis==='x'?[0,0,Math.PI/2]:axis==='z'?[Math.PI/2,0,0]:[0,0,0];return addMesh(g,geom,material,pos,rot,name);
}
function cone(g,r,len,material,pos,axis='x',segments=8,name='cone'){
  const geom=new THREE.ConeGeometry(r,len,segments,1,false);let rot=[0,0,-Math.PI/2];if(axis==='z')rot=[0,0,0];return addMesh(g,geom,material,pos,rot,name);
}
function wedgeGeometry(length,width,height,nose=.62){
  const x0=-length/2,x1=length/2,y=width/2,z0=0,zr=height,zf=height*nose;
  const v=[x0,-y,z0,x0,y,z0,x1,-y,z0,x1,y,z0,x0,-y,zr,x0,y,zr,x1,-y,zf,x1,y,zf];
  const idx=[0,2,3,0,3,1,4,5,7,4,7,6,0,4,6,0,6,2,1,3,7,1,7,5,0,1,5,0,5,4,2,6,7,2,7,3];
  const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(v,3));geom.setIndex(idx);geom.computeVertexNormals();return geom;
}
function wedge(g,l,w,h,material,pos=[0,0,0],nose=.62,name='wedge'){return addMesh(g,wedgeGeometry(l,w,h,nose),material,pos,[0,0,0],name);}

function addWheels(g,cfg,mats,r){
  const {length,width,drive}=cfg;const wheelR=drive==='wheeled4'?.62:drive==='wheeled6'?.58:.54;const count=cfg.wheels;
  const spread=length*.70;for(let i=0;i<count;i++){
    const x=count===1?0:-spread/2+(spread*i/(count-1));
    for(const side of [-1,1])cyl(g,wheelR,.34,mats.dark,[x,side*(width/2+.17),wheelR*.92],'y',10,'wheel');
  }
  if(drive==='tracked'){
    box(g,[length*.82,.34,wheelR*1.45],mats.dark,[0,width/2+.18,wheelR*.95],'trackR');
    box(g,[length*.82,.34,wheelR*1.45],mats.dark,[0,-width/2-.18,wheelR*.95],'trackL');
  }
}
function addChassis(g,cfg,mats,r,style){
  const ground=cfg.drive==='tracked'?.62:.72;
  const lowerH=cfg.drive==='tracked'?.52:.55;
  box(g,[cfg.length*.86,cfg.width*.84,lowerH],mats.armor2,[-.08,0,ground+.15],'lowerHull');
  const nose=style==='industrial'?.74:style==='compact'?.58:.50;
  wedge(g,cfg.length*.78,cfg.width*.76,cfg.height,mats.armor,[.05,0,ground+.28],nose,'upperHull');
  if(style==='angular'){
    box(g,[cfg.length*.52,.12,cfg.height*.72],mats.accent,[.1,cfg.width*.39,ground+.55],'sideAccentR');
    box(g,[cfg.length*.52,.12,cfg.height*.72],mats.accent,[.1,-cfg.width*.39,ground+.55],'sideAccentL');
  }
  return ground+cfg.height;
}
function addBarrel(g,mats,{x=0,y=0,z=2,length=3,radius=.12,thick=.18,name='gun'}={}){
  cyl(g,radius,length,mats.dark,[x+length/2,y,z],'x',8,name);
  cyl(g,thick,.34,mats.dark,[x+length+.08,y,z],'x',8,name+'Muzzle');
}
function addTurret(g,cfg,mats,r,deckZ,style,weaponScale=1){
  const tw=cfg.width*(style==='compact'?.48:.56),tl=cfg.length*.31,th=.72;
  const tx=-cfg.length*.05;
  if(style==='angular')wedge(g,tl,tw,th,mats.armor2,[tx,0,deckZ+.05],.48,'turret');
  else box(g,[tl,tw,th],mats.armor2,[tx,0,deckZ+.42],'turret');
  cyl(g,.34,.16,mats.accent,[tx-.12,0,deckZ+.84],'z',10,'hatch');
  addBarrel(g,mats,{x:tx+tl*.48,y:0,z:deckZ+.52,length:cfg.length*.48*weaponScale,radius:.105*weaponScale,thick:.16*weaponScale,name:'mainGun'});
  box(g,[.34,.22,.22],mats.glass,[tx+tl*.08,tw*.33,deckZ+.72],'optic');
}
function addTroopModule(g,cfg,mats,r,deckZ,style){
  box(g,[cfg.length*.55,cfg.width*.74,.78],mats.armor2,[-cfg.length*.10,0,deckZ+.38],'troopDeck');
  box(g,[.85,.8,.28],mats.armor,[cfg.length*.18,0,deckZ+.90],'cupola');
  addBarrel(g,mats,{x:cfg.length*.55*.20,y:0,z:deckZ+1.0,length:.9,radius:.055,thick:.08,name:'mg'});
}
function addIfvModule(g,cfg,mats,r,deckZ,style){
  const tw=cfg.width*.46;wedge(g,cfg.length*.24,tw,.62,mats.armor2,[.25,0,deckZ+.08],.54,'ifvTurret');
  addBarrel(g,mats,{x:cfg.length*.17,y:0,z:deckZ+.48,length:cfg.length*.24,radius:.07,thick:.10,name:'autocannon'});
  box(g,[.28,.20,.25],mats.glass,[.25,tw*.3,deckZ+.62],'sensor');
}
function addCab(g,cfg,mats,r,deckZ){
  const cabX=cfg.length*.19;wedge(g,cfg.length*.36,cfg.width*.72,1.18,mats.armor,[cabX,0,deckZ+.02],.58,'mrapCab');
  box(g,[.12,cfg.width*.52,.34],mats.glass,[cabX+cfg.length*.18-.04,0,deckZ+.72],'windshield');
  box(g,[.78,.7,.25],mats.armor2,[cabX-.15,0,deckZ+1.2],'remoteTurret');
  addBarrel(g,mats,{x:cabX+.16,y:0,z:deckZ+1.32,length:.72,radius:.045,thick:.07,name:'remoteGun'});
}
function addCasemate(g,cfg,mats,r,deckZ){
  const x=-cfg.length*.08;wedge(g,cfg.length*.42,cfg.width*.76,1.25,mats.armor2,[x,0,deckZ+.04],.82,'casemate');
  addBarrel(g,mats,{x:x+cfg.length*.20,y:0,z:deckZ+.75,length:cfg.length*.67,radius:.14,thick:.22,name:'howitzer'});
}
function addRocketPod(g,cfg,mats,r,deckZ){
  const pod=box(g,[cfg.length*.34,cfg.width*.62,.78],mats.dark,[-.42,0,deckZ+1.0],'rocketPod',[0,-.24,0]);
  for(let row=0;row<2;row++)for(let col=0;col<3;col++){
    const x=-.05,y=(col-1)*cfg.width*.17,z=deckZ+.83+row*.28; cyl(g,.075,.48,mats.accent,[x,y,z],'x',7,'rocketTube');
  }
}
function addSamRack(g,cfg,mats,r,deckZ){
  const rack=box(g,[cfg.length*.30,cfg.width*.60,.18],mats.armor2,[-.25,0,deckZ+.80],'samRack',[0,-.20,0]);
  for(let i=0;i<4;i++){
    const y=(i-1.5)*cfg.width*.16;const z=deckZ+.96+Math.abs(i-1.5)*.02;
    cyl(g,.09,cfg.length*.38,mats.accent,[.10,y,z],'x',8,'missile');cone(g,.10,.25,mats.accent,[cfg.length*.31,y,z],'x',8,'missileNose');
  }
}
function addAATurret(g,cfg,mats,r,deckZ){
  box(g,[1.45,cfg.width*.48,.62],mats.armor2,[0,0,deckZ+.40],'aaTurret');
  for(const y of [-.23,.23])addBarrel(g,mats,{x:.58,y,z:deckZ+.55,length:2.15,radius:.065,thick:.08,name:'aaGun'});
  cyl(g,.48,.12,mats.glass,[-.40,0,deckZ+1.12],'x',12,'radarDish');
}
function addSensor(g,cfg,mats,r,deckZ){
  box(g,[1.15,1.15,.44],mats.armor2,[.20,0,deckZ+.26],'reconTurret');
  cyl(g,.07,1.25,mats.dark,[-.20,0,deckZ+1.0],'z',7,'sensorMast');
  box(g,[.45,.18,.34],mats.glass,[-.20,0,deckZ+1.68],'sensorHead');
  addBarrel(g,mats,{x:.72,y:0,z:deckZ+.45,length:1.05,radius:.055,thick:.075,name:'reconGun'});
}
function addCargo(g,cfg,mats,r,deckZ){
  const cabX=cfg.length*.28;wedge(g,cfg.length*.27,cfg.width*.78,1.16,mats.armor,[cabX,0,deckZ+.05],.55,'truckCab');
  box(g,[.10,cfg.width*.56,.34],mats.glass,[cabX+cfg.length*.135-.03,0,deckZ+.75],'windshield');
  box(g,[cfg.length*.47,cfg.width*.76,.18],mats.armor2,[-cfg.length*.13,0,deckZ+.14],'cargoBed');
  for(const side of [-1,1])box(g,[cfg.length*.44,.09,.58],mats.armor2,[-cfg.length*.13,side*cfg.width*.36,deckZ+.48],'cargoRail');
}
function addDetails(g,cfg,mats,r,deckZ){
  box(g,[.38,.13,.18],mats.accent,[cfg.length*.30,cfg.width*.28,deckZ+.10],'lightR');
  box(g,[.38,.13,.18],mats.accent,[cfg.length*.30,-cfg.width*.28,deckZ+.10],'lightL');
  if(r()>.35){cyl(g,.025,.95,mats.dark,[-cfg.length*.28,cfg.width*.24,deckZ+.72],'z',6,'antenna');}
  if(r()>.55){box(g,[.42,.32,.28],mats.armor2,[-cfg.length*.30,-cfg.width*.26,deckZ+.22],'stowage');}
}

export function generateLowPolyVehicle(recipe={}){
  const type=VEHICLE_ARCHETYPES[recipe.type]?recipe.type:'mbt';const base=VEHICLE_ARCHETYPES[type];const seed=Number(recipe.seed)||48127;const r=mulberry32(seed);
  const style=['industrial','angular','compact'].includes(recipe.style)?recipe.style:'angular';const palette=PALETTES[recipe.palette]||PALETTES.olive;
  const cfg={...base,length:jitter(r,base.length,.075),width:jitter(r,base.width,.055),height:jitter(r,base.height,.09)};
  const materials={armor:mat(palette.armor,.08),armor2:mat(palette.armor2,.10),dark:mat(palette.dark,.18),accent:mat(palette.accent,.05),glass:mat(palette.glass,.12)};
  const g=new THREE.Group();g.name=`VehicleForge_${type}_${seed}`;g.userData.vehicleRecipe={schema:'worldforge.vehicle-generator.v1',version:VEHICLE_GENERATOR_VERSION,type,seed,style,palette:recipe.palette||'olive'};
  addWheels(g,cfg,materials,r);const deckZ=addChassis(g,cfg,materials,r,style);
  switch(base.module){
    case 'turret':addTurret(g,cfg,materials,r,deckZ,style,base.weaponScale);break;
    case 'troop':addTroopModule(g,cfg,materials,r,deckZ,style);break;
    case 'ifv':addIfvModule(g,cfg,materials,r,deckZ,style);break;
    case 'cab':addCab(g,cfg,materials,r,deckZ);break;
    case 'casemate':addCasemate(g,cfg,materials,r,deckZ);break;
    case 'rocketPod':addRocketPod(g,cfg,materials,r,deckZ);break;
    case 'samRack':addSamRack(g,cfg,materials,r,deckZ);break;
    case 'aaTurret':addAATurret(g,cfg,materials,r,deckZ);break;
    case 'sensor':addSensor(g,cfg,materials,r,deckZ);break;
    case 'cargo':addCargo(g,cfg,materials,r,deckZ);break;
  }
  addDetails(g,cfg,materials,r,deckZ);
  g.userData.vehicleInfo={label:base.label,drive:base.drive,archetype:type,seed,style,palette:recipe.palette||'olive',nominalLength:+cfg.length.toFixed(2),nominalWidth:+cfg.width.toFixed(2)};
  return {group:g,recipe:g.userData.vehicleRecipe,info:g.userData.vehicleInfo};
}
