import * as THREE from 'three';

export const VEHICLE_GENERATOR_VERSION='0.2.0';

export const VEHICLE_ARCHETYPES=Object.freeze({
  mbt:{label:'Main Battle Tank',drive:'tracked',quality:'aegis'},
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

export const MBT_SILHOUETTES=Object.freeze({
  wedge:{label:'Wedge',length:7.85,width:3.58,deckZ:1.48,wheels:7,turretLength:3.52,turretWidth:2.78,turretHeight:.78,gunLength:5.05,bustle:1.02,skirtThickness:.14},
  heavy:{label:'Heavy',length:8.12,width:3.82,deckZ:1.58,wheels:7,turretLength:3.78,turretWidth:3.02,turretHeight:.92,gunLength:4.92,bustle:1.18,skirtThickness:.17},
  compact:{label:'Compact',length:7.18,width:3.34,deckZ:1.39,wheels:6,turretLength:3.08,turretWidth:2.56,turretHeight:.73,gunLength:4.42,bustle:.88,skirtThickness:.13}
});

const PALETTES=Object.freeze({
  olive:{armor:0x657055,armor2:0x505b46,armor3:0x788363,dark:0x202521,track:0x171b18,accent:0x98a66f,team:0x9cb86a,glass:0x27383b,light:0xc8d18a},
  desert:{armor:0xa28d67,armor2:0x837253,armor3:0xb49d73,dark:0x2e2a24,track:0x24211d,accent:0xc6af7d,team:0xc78d52,glass:0x314047,light:0xe4cf91},
  slate:{armor:0x59636b,armor2:0x454d54,armor3:0x68757e,dark:0x1d2226,track:0x15191c,accent:0x8ea4ad,team:0x66a1b5,glass:0x21333c,light:0xbdd0d5},
  red:{armor:0x6e4a43,armor2:0x523732,armor3:0x80574f,dark:0x211f1e,track:0x191716,accent:0xa96859,team:0xc75745,glass:0x28373a,light:0xd59c74}
});

function mulberry32(seed){let a=(Number(seed)||1)>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function jitter(r,v,a=.05){return v*(1+(r()-.5)*2*a);}
function pick(r,items){return items[Math.min(items.length-1,Math.floor(r()*items.length))];}
function mat(color,metal=.06,rough=.84){return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal,flatShading:true});}
function addMesh(g,geom,material,pos=[0,0,0],rot=[0,0,0],name='part'){
  const m=new THREE.Mesh(geom,material);m.position.set(...pos);m.rotation.set(...rot);m.castShadow=true;m.receiveShadow=true;m.name=name;g.add(m);return m;
}
function box(g,s,material,pos,name='box',rot=[0,0,0]){return addMesh(g,new THREE.BoxGeometry(s[0],s[1],s[2],1,1,1),material,pos,rot,name);}
function cyl(g,r,len,material,pos,axis='y',segments=10,name='cylinder'){
  const geom=new THREE.CylinderGeometry(r,r,len,segments,1,false);const rot=axis==='x'?[0,0,Math.PI/2]:axis==='z'?[Math.PI/2,0,0]:[0,0,0];return addMesh(g,geom,material,pos,rot,name);
}
function cone(g,r,len,material,pos,axis='x',segments=8,name='cone'){
  const geom=new THREE.ConeGeometry(r,len,segments,1,false);let rot=[0,0,-Math.PI/2];if(axis==='z')rot=[0,0,0];return addMesh(g,geom,material,pos,rot,name);
}
function group(parent,name,pos=[0,0,0]){const g=new THREE.Group();g.name=name;g.position.set(...pos);parent.add(g);return g;}
function socket(parent,name,pos=[0,0,0]){const o=new THREE.Object3D();o.name=name;o.position.set(...pos);parent.add(o);return o;}

// Closed, outward-wound faceted body built from X-axis cross-sections.
// Each section: {x,zBottom,zTop,halfBottom,halfTop}.
function facetedBodyGeometry(sections){
  const verts=[];for(const s of sections){verts.push(s.x,-s.halfBottom,s.zBottom,s.x,s.halfBottom,s.zBottom,s.x,-s.halfTop,s.zTop,s.x,s.halfTop,s.zTop);}
  const idx=[];
  for(let i=0;i<sections.length-1;i++){
    const a=i*4,b=(i+1)*4;
    // bottom (-Z)
    idx.push(a,a+1,b+1,a,b+1,b);
    // top (+Z)
    idx.push(a+2,b+2,b+3,a+2,b+3,a+3);
    // -Y side
    idx.push(a,b,b+2,a,b+2,a+2);
    // +Y side
    idx.push(a+1,a+3,b+3,a+1,b+3,b+1);
  }
  // rear (-X)
  idx.push(0,2,3,0,3,1);
  // front (+X)
  const q=(sections.length-1)*4;idx.push(q,q+1,q+3,q,q+3,q+2);
  const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geom.setIndex(idx);geom.computeVertexNormals();return geom;
}
function facetedBody(g,sections,material,name='facetedBody'){return addMesh(g,facetedBodyGeometry(sections),material,[0,0,0],[0,0,0],name);}

function wedgeGeometry(length,width,height,nose=.62){
  const x0=-length/2,x1=length/2,y=width/2,z0=0,zr=height,zf=height*nose;
  const v=[x0,-y,z0,x0,y,z0,x1,-y,z0,x1,y,z0,x0,-y,zr,x0,y,zr,x1,-y,zf,x1,y,zf];
  const idx=[0,2,3,0,3,1,4,5,7,4,7,6,0,4,6,0,6,2,1,3,7,1,7,5,0,1,5,0,5,4,2,6,7,2,7,3];
  const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(v,3));geom.setIndex(idx);geom.computeVertexNormals();return geom;
}
function wedge(g,l,w,h,material,pos=[0,0,0],nose=.62,name='wedge'){return addMesh(g,wedgeGeometry(l,w,h,nose),material,pos,[0,0,0],name);}

function buildMaterials(paletteName){const p=PALETTES[paletteName]||PALETTES.olive;return {
  armor:mat(p.armor,.08,.82),armor2:mat(p.armor2,.11,.86),armor3:mat(p.armor3,.07,.79),dark:mat(p.dark,.20,.77),track:mat(p.track,.24,.91),accent:mat(p.accent,.05,.79),team:mat(p.team,.04,.76),glass:mat(p.glass,.14,.52),light:mat(p.light,.04,.62)
};}

function resolvedSilhouette(recipe,r){
  if(MBT_SILHOUETTES[recipe.silhouette])return recipe.silhouette;
  return pick(r,['wedge','heavy','compact']);
}

function mbtConfig(recipe,r){
  const silhouette=resolvedSilhouette(recipe,r);const b=MBT_SILHOUETTES[silhouette];const style=['angular','industrial','compact'].includes(recipe.style)?recipe.style:'angular';
  const styleMul=style==='industrial'?1.035:style==='compact'?.975:1;
  const cfg={
    silhouette,style,
    length:jitter(r,b.length,.035)*styleMul,width:jitter(r,b.width,.028)*styleMul,deckZ:jitter(r,b.deckZ,.025),wheels:b.wheels,
    turretLength:jitter(r,b.turretLength,.045),turretWidth:jitter(r,b.turretWidth,.035),turretHeight:jitter(r,b.turretHeight,.04),gunLength:jitter(r,b.gunLength,.045),
    bustle:jitter(r,b.bustle,.045),skirtThickness:b.skirtThickness,
    wheelRadius:silhouette==='heavy'?.48:silhouette==='compact'?.43:.46,
    detail:recipe.detail==='standard'?'standard':'enhanced'
  };
  if(recipe.roadWheels==='6')cfg.wheels=6;else if(recipe.roadWheels==='7')cfg.wheels=7;
  cfg.length=clamp(cfg.length,6.9,8.35);cfg.width=clamp(cfg.width,3.15,3.95);cfg.turretHeight=clamp(cfg.turretHeight,.68,.98);cfg.gunLength=clamp(cfg.gunLength,4.15,5.35);
  return cfg;
}

function buildRunningGear(hull,cfg,m,r){
  const sideY=cfg.width*.475+.14;const wheelZ=.51;const roadR=cfg.wheelRadius;const hubR=roadR*.46;
  const first=-cfg.length*.31,last=cfg.length*.29;const step=(last-first)/(cfg.wheels-1);
  for(const side of [-1,1]){
    const suffix=side<0?'L':'R';
    // Continuous-looking four-piece track silhouette.
    box(hull,[cfg.length*.69,.28,.19],m.track,[-.04,side*sideY,.22],`Track_${suffix}_Lower`);
    box(hull,[cfg.length*.64,.25,.15],m.track,[-.10,side*sideY,1.01],`Track_${suffix}_Upper`);
    box(hull,[.92,.26,.16],m.track,[cfg.length*.315,side*sideY,.72],`Track_${suffix}_FrontRamp`,[0,-.72,0]);
    box(hull,[.80,.26,.16],m.track,[-cfg.length*.335,side*sideY,.73],`Track_${suffix}_RearRamp`,[0,.74,0]);
    for(let i=0;i<cfg.wheels;i++){
      const x=first+step*i;const rr=roadR*(1+((i===0||i===cfg.wheels-1)?0.015:0));
      cyl(hull,rr,.29,m.track,[x,side*sideY,wheelZ],'y',14,`RoadWheel_${suffix}_${i}`);
      cyl(hull,hubR,.305,m.armor2,[x,side*sideY,wheelZ],'y',12,`RoadHub_${suffix}_${i}`);
    }
    const idlerX=cfg.length*.355,sprocketX=-cfg.length*.36;
    cyl(hull,roadR*1.03,.31,m.track,[idlerX,side*sideY,.61],'y',14,`Idler_${suffix}`);
    cyl(hull,hubR*.92,.325,m.armor2,[idlerX,side*sideY,.61],'y',12,`IdlerHub_${suffix}`);
    cyl(hull,roadR*1.05,.31,m.track,[sprocketX,side*sideY,.62],'y',14,`Sprocket_${suffix}`);
    cyl(hull,hubR*.95,.325,m.accent,[sprocketX,side*sideY,.62],'y',12,`SprocketHub_${suffix}`);
    const rollers=cfg.wheels===7?4:3;
    for(let i=0;i<rollers;i++){const x=-cfg.length*.22+i*(cfg.length*.44/(rollers-1));cyl(hull,.13,.27,m.track,[x,side*sideY,.94],'y',10,`ReturnRoller_${suffix}_${i}`);}
  }
}

function buildHull(hull,cfg,m,r){
  const L=cfg.length,W=cfg.width;
  // Lower armored tub: tapered nose and rear, inset top edge.
  facetedBody(hull,[
    {x:-L*.48,zBottom:.38,zTop:.95,halfBottom:W*.43,halfTop:W*.40},
    {x:-L*.31,zBottom:.34,zTop:1.03,halfBottom:W*.46,halfTop:W*.43},
    {x:L*.22,zBottom:.34,zTop:1.04,halfBottom:W*.46,halfTop:W*.43},
    {x:L*.45,zBottom:.43,zTop:.78,halfBottom:W*.38,halfTop:W*.34}
  ],m.armor2,'LowerHull');

  // Upper hull / glacis: true long sloped nose rather than stacked boxes.
  const deck=cfg.deckZ;const frontTop=cfg.silhouette==='wedge'?deck*.56:cfg.silhouette==='heavy'?deck*.66:deck*.60;
  facetedBody(hull,[
    {x:-L*.40,zBottom:.94,zTop:deck*.93,halfBottom:W*.40,halfTop:W*.37},
    {x:-L*.14,zBottom:.99,zTop:deck,halfBottom:W*.42,halfTop:W*.38},
    {x:L*.17,zBottom:.98,zTop:deck*.97,halfBottom:W*.41,halfTop:W*.36},
    {x:L*.39,zBottom:.82,zTop:frontTop,halfBottom:W*.35,halfTop:W*.28},
    {x:L*.46,zBottom:.72,zTop:frontTop*.88,halfBottom:W*.31,halfTop:W*.24}
  ],m.armor,'UpperHull');

  // Glacis cheek armor strengthens front silhouette.
  for(const side of [-1,1]){
    const suffix=side<0?'L':'R';
    box(hull,[L*.205,.18,.56],m.armor3,[L*.285,side*W*.315,1.08],`GlacisCheek_${suffix}`,[0,-.28,side*.10]);
  }
  box(hull,[.48,W*.72,.28],m.armor2,[L*.43,0,.69],'LowerNose',[0,-.14,0]);

  // Fenders and segmented composite skirts.
  const skirtY=W*.465+.08;for(const side of [-1,1]){
    const suffix=side<0?'L':'R';box(hull,[L*.86,.16,.22],m.armor2,[-.03,side*skirtY,1.10],`Fender_${suffix}`);
    const segments=cfg.wheels===7?6:5;const usable=L*.73;const segLen=usable/segments*.92;
    for(let i=0;i<segments;i++){
      const x=-usable/2+segLen*.56+i*(usable/segments);const z=1.01-(i===segments-1?.07:0);
      box(hull,[segLen,.16,.66],i%2?m.armor2:m.armor,[x,side*(skirtY+.03),z],`SideSkirt_${suffix}_${i}`,[0,0,side*(i%2?.015:-.012)]);
      box(hull,[segLen*.94,.17,.115],m.dark,[x,side*(skirtY+.035),.68],`SkirtLower_${suffix}_${i}`);
    }
  }

  // Engine deck and rear power pack.
  const engineX=-L*.27;box(hull,[L*.28,W*.67,.18],m.armor2,[engineX,0,deck+.02],'EngineDeck');
  const vents=5;for(let i=0;i<vents;i++)box(hull,[.20,W*.54,.055],m.dark,[engineX-L*.09+i*(L*.18/(vents-1)),0,deck+.13],`EngineVent_${i}`);
  box(hull,[.34,W*.76,.48],m.armor2,[-L*.44,0,1.16],'RearPowerPack');
  for(const side of [-1,1]){
    box(hull,[.56,.58,.50],m.armor2,[-L*.37,side*W*.34,1.28],`RearStowage_${side<0?'L':'R'}`);
    cyl(hull,.15,.56,m.dark,[-L*.43,side*W*.31,1.48],'z',10,`Exhaust_${side}`);
    cyl(hull,.12,.10,m.dark,[L*.445,side*W*.27,.55],'y',10,`TowEye_${side}`);
    box(hull,[.25,.18,.18],m.light,[L*.38,side*W*.31,.98],`Headlight_${side}`,[0,-.18,0]);
    box(hull,[.32,.22,.05],m.dark,[L*.385,side*W*.31,1.02],`HeadlightGuard_${side}`,[0,-.18,0]);
    box(hull,[1.08,.045,.24],m.team,[-.05,side*(W*.475+.175),1.12],`TeamPanel_${side<0?'L':'R'}`);
  }
}

function buildMainGun(turret,cfg,m){
  const front=cfg.turretLength*.43;const gunZ=cfg.turretHeight*.52;
  const gunRoot=group(turret,'GunPitchRoot',[front,0,gunZ]);
  // Mantlet and coaxial base.
  facetedBody(gunRoot,[
    {x:-.18,zBottom:-.38,zTop:.35,halfBottom:.54,halfTop:.48},
    {x:.22,zBottom:-.31,zTop:.30,halfBottom:.47,halfTop:.40},
    {x:.48,zBottom:-.24,zTop:.24,halfBottom:.34,halfTop:.30}
  ],m.armor2,'Mantlet');
  cyl(gunRoot,.19,.42,m.dark,[.54,0,0],'x',12,'GunBase');
  const sleeveLen=cfg.gunLength*.44;const barrelLen=cfg.gunLength*.48;
  cyl(gunRoot,.14,sleeveLen,m.armor2,[.54+sleeveLen/2,0,0],'x',12,'ThermalSleeve');
  cyl(gunRoot,.19,.46,m.dark,[.54+sleeveLen*.66,0,0],'x',12,'BoreEvacuator');
  cyl(gunRoot,.105,barrelLen,m.dark,[.54+sleeveLen+barrelLen/2,0,0],'x',12,'MainBarrel');
  const muzzleX=.54+sleeveLen+barrelLen; cyl(gunRoot,.145,.24,m.dark,[muzzleX+.08,0,0],'x',12,'MuzzleCollar');
  socket(gunRoot,'MuzzleSocket',[muzzleX+.22,0,0]);socket(gunRoot,'CoaxMuzzleSocket',[.44,-.40,.04]);
  return gunRoot;
}

function buildTurret(hull,cfg,m,r){
  const socketRoot=group(hull,'TurretSocket',[.12,0,cfg.deckZ+.06]);const turret=group(socketRoot,'TurretRoot');
  cyl(turret,cfg.turretWidth*.39,.15,m.dark,[0,0,.04],'z',16,'TurretRing');
  const TL=cfg.turretLength,TW=cfg.turretWidth,TH=cfg.turretHeight;
  // Purpose-built low faceted turret with tapered nose and bustle shoulder.
  facetedBody(turret,[
    {x:-TL*.46,zBottom:.12,zTop:TH*.72,halfBottom:TW*.40,halfTop:TW*.34},
    {x:-TL*.30,zBottom:.10,zTop:TH*.93,halfBottom:TW*.47,halfTop:TW*.39},
    {x:TL*.08,zBottom:.08,zTop:TH,halfBottom:TW*.48,halfTop:TW*.38},
    {x:TL*.34,zBottom:.10,zTop:TH*.84,halfBottom:TW*.39,halfTop:TW*.28},
    {x:TL*.47,zBottom:.17,zTop:TH*.62,halfBottom:TW*.28,halfTop:TW*.18}
  ],m.armor2,'TurretShell');

  // Cheeks + applique/ERA create the Aegis-X readable front mass.
  for(const side of [-1,1]){
    const suffix=side<0?'L':'R';
    box(turret,[TL*.32,.46,TH*.62],m.armor3,[TL*.23,side*TW*.34,TH*.43],`TurretCheek_${suffix}`,[0,-.12,side*.12]);
    for(let i=0;i<2;i++)box(turret,[.46,.12,.25],m.armor,[TL*.16+i*.47,side*TW*.445,TH*.45],`TurretERA_${suffix}_${i}`,[0,0,side*.05]);
  }

  // Rear bustle and racks.
  box(turret,[cfg.bustle,TW*.66,TH*.62],m.armor2,[-TL*.47-cfg.bustle*.30,0,TH*.43],'TurretBustle');
  for(const side of [-1,1]){
    box(turret,[.70,.24,.23],m.dark,[-TL*.49,side*TW*.39,TH*.60],`BustleRack_${side<0?'L':'R'}`);
    box(turret,[.55,.32,.31],m.armor,[-TL*.52,side*TW*.38,TH*.33],`BustleStow_${side<0?'L':'R'}`);
  }

  buildMainGun(turret,cfg,m);

  // Cupolas and optics.
  cyl(turret,.40,.18,m.armor3,[-TL*.11,-TW*.18,TH+.05],'z',14,'CommanderCupola');
  cyl(turret,.33,.13,m.armor3,[TL*.02,TW*.18,TH+.03],'z',14,'GunnerCupola');
  box(turret,[.34,.36,.30],m.glass,[-TL*.03,-TW*.22,TH+.25],'CommanderPanoramicSight',[0,0,.08]);
  box(turret,[.29,.40,.27],m.glass,[TL*.17,TW*.24,TH*.20],'GunnerPrimarySight',[0,0,-.06]);
  box(turret,[.24,.22,.20],m.glass,[TL*.30,TW*.12,TH*.15],'LaserRangefinder');

  // APS radar panels.
  const aps=[[-TL*.05,-TW*.45,TH*.64],[TL*.15,-TW*.45,TH*.55],[-TL*.05,TW*.45,TH*.64],[TL*.15,TW*.45,TH*.55]];
  aps.forEach((p,i)=>box(turret,[.31,.08,.29],m.dark,p,`APS_Radar_${i}`,[0,0,i<2?-.06:.06]));

  // Smoke grenade banks.
  for(const side of [-1,1])for(let i=0;i<5;i++){
    const x=-TL*.02+i*.16;const y=side*TW*.45;const z=TH*.58+i*.025;
    const mesh=cyl(turret,.073,.32,m.dark,[x,y,z],'x',8,`Smoke_${side<0?'L':'R'}_${i}`);mesh.rotation.y=-.18;mesh.rotation.z=side*.35;
  }
  socket(turret,'SmokeLeftSocket',[-TL*.02,-TW*.47,TH*.64]);socket(turret,'SmokeRightSocket',[-TL*.02,TW*.47,TH*.64]);

  // Independent remote weapon station.
  const rws=group(turret,'RWSRoot',[-TL*.23,-TW*.06,TH+.18]);
  cyl(rws,.23,.095,m.dark,[0,0,0],'z',12,'RWSBase');box(rws,[.39,.27,.31],m.armor2,[.08,0,.19],'RWSHousing');
  const rwsPitch=group(rws,'RWSGunPitchRoot',[.24,0,.22]);cyl(rwsPitch,.043,.90,m.dark,[.45,0,0],'x',8,'RWSGun');socket(rwsPitch,'RWSMuzzleSocket',[.92,0,0]);
  box(rws,[.13,.15,.14],m.glass,[.15,-.17,.30],'RWSOptic');

  if(cfg.detail==='enhanced'){
    cyl(turret,.018,1.30,m.dark,[-TL*.42,-TW*.28,TH+.57],'z',6,'Antenna_0');
    cyl(turret,.018,1.10,m.dark,[-TL*.40,TW*.28,TH+.50],'z',6,'Antenna_1');
  }
  return turret;
}

function generateAegisMBT(recipe,r,m){
  const cfg=mbtConfig(recipe,r);const root=new THREE.Group();root.name='VehicleRoot';const hull=group(root,'HullRoot');
  buildRunningGear(hull,cfg,m,r);buildHull(hull,cfg,m,r);buildTurret(hull,cfg,m,r);
  socket(hull,'EngineEffectSocket',[-cfg.length*.44,0,cfg.deckZ+.20]);
  root.userData.functionalHierarchy={vehicleRoot:'VehicleRoot',hullRoot:'HullRoot',turretSocket:'TurretSocket',turretRoot:'TurretRoot',gunRoot:'GunPitchRoot',rwsRoot:'RWSRoot',muzzleSocket:'MuzzleSocket'};
  return {root,cfg};
}

// ---- Legacy 0.1 family generators retained until each family receives an Aegis-grade grammar. ----
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
  const ground=cfg.drive==='tracked'?.62:.72;const lowerH=cfg.drive==='tracked'?.52:.55;
  box(g,[cfg.length*.86,cfg.width*.84,lowerH],mats.armor2,[-.08,0,ground+.15],'lowerHull');
  const nose=style==='industrial'?.74:style==='compact'?.58:.50;wedge(g,cfg.length*.78,cfg.width*.76,cfg.height,mats.armor,[.05,0,ground+.28],nose,'upperHull');
  if(style==='angular'){box(g,[cfg.length*.52,.12,cfg.height*.72],mats.accent,[.1,cfg.width*.39,ground+.55],'sideAccentR');box(g,[cfg.length*.52,.12,cfg.height*.72],mats.accent,[.1,-cfg.width*.39,ground+.55],'sideAccentL');}
  return ground+cfg.height;
}
function addBarrel(g,mats,{x=0,y=0,z=2,length=3,radius=.12,thick=.18,name='gun'}={}){cyl(g,radius,length,mats.dark,[x+length/2,y,z],'x',8,name);cyl(g,thick,.34,mats.dark,[x+length+.08,y,z],'x',8,name+'Muzzle');}
function addTurret(g,cfg,mats,r,deckZ,style,weaponScale=1){const tw=cfg.width*(style==='compact'?.48:.56),tl=cfg.length*.31,th=.72;const tx=-cfg.length*.05;if(style==='angular')wedge(g,tl,tw,th,mats.armor2,[tx,0,deckZ+.05],.48,'turret');else box(g,[tl,tw,th],mats.armor2,[tx,0,deckZ+.42],'turret');cyl(g,.34,.16,mats.accent,[tx-.12,0,deckZ+.84],'z',10,'hatch');addBarrel(g,mats,{x:tx+tl*.48,y:0,z:deckZ+.52,length:cfg.length*.48*weaponScale,radius:.105*weaponScale,thick:.16*weaponScale,name:'mainGun'});box(g,[.34,.22,.22],mats.glass,[tx+tl*.08,tw*.33,deckZ+.72],'optic');}
function addTroopModule(g,cfg,mats,r,deckZ){box(g,[cfg.length*.55,cfg.width*.74,.78],mats.armor2,[-cfg.length*.10,0,deckZ+.38],'troopDeck');box(g,[.85,.8,.28],mats.armor,[cfg.length*.18,0,deckZ+.90],'cupola');addBarrel(g,mats,{x:cfg.length*.55*.20,y:0,z:deckZ+1.0,length:.9,radius:.055,thick:.08,name:'mg'});}
function addIfvModule(g,cfg,mats,r,deckZ){const tw=cfg.width*.46;wedge(g,cfg.length*.24,tw,.62,mats.armor2,[.25,0,deckZ+.08],.54,'ifvTurret');addBarrel(g,mats,{x:cfg.length*.17,y:0,z:deckZ+.48,length:cfg.length*.24,radius:.07,thick:.10,name:'autocannon'});box(g,[.28,.20,.25],mats.glass,[.25,tw*.3,deckZ+.62],'sensor');}
function addCab(g,cfg,mats,r,deckZ){const cabX=cfg.length*.19;wedge(g,cfg.length*.36,cfg.width*.72,1.18,mats.armor,[cabX,0,deckZ+.02],.58,'mrapCab');box(g,[.12,cfg.width*.52,.34],mats.glass,[cabX+cfg.length*.18-.04,0,deckZ+.72],'windshield');box(g,[.78,.7,.25],mats.armor2,[cabX-.15,0,deckZ+1.2],'remoteTurret');addBarrel(g,mats,{x:cabX+.16,y:0,z:deckZ+1.32,length:.72,radius:.045,thick:.07,name:'remoteGun'});}
function addCasemate(g,cfg,mats,r,deckZ){const x=-cfg.length*.08;wedge(g,cfg.length*.42,cfg.width*.76,1.25,mats.armor2,[x,0,deckZ+.04],.82,'casemate');addBarrel(g,mats,{x:x+cfg.length*.20,y:0,z:deckZ+.75,length:cfg.length*.67,radius:.14,thick:.22,name:'howitzer'});}
function addRocketPod(g,cfg,mats,r,deckZ){box(g,[cfg.length*.34,cfg.width*.62,.78],mats.dark,[-.42,0,deckZ+1.0],'rocketPod',[0,-.24,0]);for(let row=0;row<2;row++)for(let col=0;col<3;col++){const x=-.05,y=(col-1)*cfg.width*.17,z=deckZ+.83+row*.28;cyl(g,.075,.48,mats.accent,[x,y,z],'x',7,'rocketTube');}}
function addSamRack(g,cfg,mats,r,deckZ){box(g,[cfg.length*.30,cfg.width*.60,.18],mats.armor2,[-.25,0,deckZ+.80],'samRack',[0,-.20,0]);for(let i=0;i<4;i++){const y=(i-1.5)*cfg.width*.16;const z=deckZ+.96+Math.abs(i-1.5)*.02;cyl(g,.09,cfg.length*.38,mats.accent,[.10,y,z],'x',8,'missile');cone(g,.10,.25,mats.accent,[cfg.length*.31,y,z],'x',8,'missileNose');}}
function addAATurret(g,cfg,mats,r,deckZ){box(g,[1.45,cfg.width*.48,.62],mats.armor2,[0,0,deckZ+.40],'aaTurret');for(const y of [-.23,.23])addBarrel(g,mats,{x:.58,y,z:deckZ+.55,length:2.15,radius:.065,thick:.08,name:'aaGun'});cyl(g,.48,.12,mats.glass,[-.40,0,deckZ+1.12],'x',12,'radarDish');}
function addSensor(g,cfg,mats,r,deckZ){box(g,[1.15,1.15,.44],mats.armor2,[.20,0,deckZ+.26],'reconTurret');cyl(g,.07,1.25,mats.dark,[-.20,0,deckZ+1.0],'z',7,'sensorMast');box(g,[.45,.18,.34],mats.glass,[-.20,0,deckZ+1.68],'sensorHead');addBarrel(g,mats,{x:.72,y:0,z:deckZ+.45,length:1.05,radius:.055,thick:.075,name:'reconGun'});}
function addCargo(g,cfg,mats,r,deckZ){const cabX=cfg.length*.28;wedge(g,cfg.length*.27,cfg.width*.78,1.16,mats.armor,[cabX,0,deckZ+.05],.55,'truckCab');box(g,[.10,cfg.width*.56,.34],mats.glass,[cabX+cfg.length*.135-.03,0,deckZ+.75],'windshield');box(g,[cfg.length*.47,cfg.width*.76,.18],mats.armor2,[-cfg.length*.13,0,deckZ+.14],'cargoBed');for(const side of [-1,1])box(g,[cfg.length*.44,.09,.58],mats.armor2,[-cfg.length*.13,side*cfg.width*.36,deckZ+.48],'cargoRail');}
function addDetails(g,cfg,mats,r,deckZ){box(g,[.38,.13,.18],mats.accent,[cfg.length*.30,cfg.width*.28,deckZ+.10],'lightR');box(g,[.38,.13,.18],mats.accent,[cfg.length*.30,-cfg.width*.28,deckZ+.10],'lightL');if(r()>.35)cyl(g,.025,.95,mats.dark,[-cfg.length*.28,cfg.width*.24,deckZ+.72],'z',6,'antenna');if(r()>.55)box(g,[.42,.32,.28],mats.armor2,[-cfg.length*.30,-cfg.width*.26,deckZ+.22],'stowage');}

function generateLegacyVehicle(type,base,recipe,r,m){
  const style=['industrial','angular','compact'].includes(recipe.style)?recipe.style:'angular';const cfg={...base,length:jitter(r,base.length,.075),width:jitter(r,base.width,.055),height:jitter(r,base.height,.09)};
  const g=new THREE.Group();g.name='VehicleRoot';const hull=group(g,'HullRoot');addWheels(hull,cfg,m,r);const deckZ=addChassis(hull,cfg,m,r,style);
  switch(base.module){case 'turret':addTurret(hull,cfg,m,r,deckZ,style,base.weaponScale);break;case 'troop':addTroopModule(hull,cfg,m,r,deckZ,style);break;case 'ifv':addIfvModule(hull,cfg,m,r,deckZ,style);break;case 'cab':addCab(hull,cfg,m,r,deckZ);break;case 'casemate':addCasemate(hull,cfg,m,r,deckZ);break;case 'rocketPod':addRocketPod(hull,cfg,m,r,deckZ);break;case 'samRack':addSamRack(hull,cfg,m,r,deckZ);break;case 'aaTurret':addAATurret(hull,cfg,m,r,deckZ);break;case 'sensor':addSensor(hull,cfg,m,r,deckZ);break;case 'cargo':addCargo(hull,cfg,m,r,deckZ);break;}
  addDetails(hull,cfg,m,r,deckZ);return {root:g,cfg};
}

export function generateLowPolyVehicle(recipe={}){
  const type=VEHICLE_ARCHETYPES[recipe.type]?recipe.type:'mbt';const base=VEHICLE_ARCHETYPES[type];const seed=Number(recipe.seed)||48127;const r=mulberry32(seed);
  const style=['industrial','angular','compact'].includes(recipe.style)?recipe.style:'angular';const paletteName=PALETTES[recipe.palette]?recipe.palette:'olive';const materials=buildMaterials(paletteName);
  const built=type==='mbt'?generateAegisMBT({...recipe,style,palette:paletteName},r,materials):generateLegacyVehicle(type,base,{...recipe,style,palette:paletteName},r,materials);
  const g=built.root;const cfg=built.cfg;const silhouette=type==='mbt'?cfg.silhouette:null;
  const normalizedRecipe={schema:'worldforge.vehicle-generator.v2',version:VEHICLE_GENERATOR_VERSION,type,seed,style,palette:paletteName,detail:type==='mbt'?cfg.detail:undefined,silhouette:silhouette||undefined,roadWheels:type==='mbt'?String(cfg.wheels):undefined};
  g.userData.vehicleRecipe=normalizedRecipe;
  g.userData.vehicleInfo={label:base.label,drive:base.drive,archetype:type,seed,style,palette:paletteName,quality:type==='mbt'?'aegis-grade':'legacy-0.1',silhouette:silhouette||undefined,roadWheels:type==='mbt'?cfg.wheels:base.wheels,nominalLength:+cfg.length.toFixed(2),nominalWidth:+cfg.width.toFixed(2),functionalHierarchy:type==='mbt'?g.userData.functionalHierarchy:undefined};
  return {group:g,recipe:g.userData.vehicleRecipe,info:g.userData.vehicleInfo};
}
