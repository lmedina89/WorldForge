export const RTS_DEFINITIONS_VERSION='0.5.0';


export const BUILDING_DEFINITIONS=Object.freeze({
  constructionYard:Object.freeze({id:'constructionYard',label:'Tactical Command Post',cost:0,hp:3200,footprint:[32,24],powerUse:0,powerSupply:0,buildRadius:165,category:'core',masterAsset:'tacticalCommandPost'}),
  powerPlant:Object.freeze({id:'powerPlant',label:'Field Power Node',cost:500,hp:1200,footprint:[24,21],powerUse:0,powerSupply:100,category:'power',masterAsset:'fieldPowerNode'}),
  refinery:Object.freeze({id:'refinery',label:'Field Refinery',cost:900,hp:1400,footprint:[34,26],powerUse:24,powerSupply:0,category:'economy',masterAsset:'fieldRefinery',starterUnit:'aegisHarvester'}),
  barracks:Object.freeze({id:'barracks',label:'Field Barracks',cost:650,hp:1100,footprint:[19,13],powerUse:10,powerSupply:0,category:'production',masterAsset:'fieldBarracks'}),
  vehicleFactory:Object.freeze({id:'vehicleFactory',label:'Vehicle Factory',cost:1200,hp:1700,footprint:[30,23],powerUse:30,powerSupply:0,category:'production'}),
  gunTurret:Object.freeze({id:'gunTurret',label:'Gun Turret',cost:600,hp:700,footprint:[9,9],powerUse:12,powerSupply:0,category:'defense'})
});

export const LOCOMOTORS=Object.freeze({
  trackedHeavy:Object.freeze({id:'trackedHeavy',movementClass:'tracked',maxSpeed:18,reverseSpeed:8,turnRate:1.0,maxSlopeDeg:32,roadCostMultiplier:.82,roughCostMultiplier:1.18}),
  wheeledLight:Object.freeze({id:'wheeledLight',movementClass:'wheeled',maxSpeed:26,reverseSpeed:9,turnRate:1.25,maxSlopeDeg:22,roadCostMultiplier:.62,roughCostMultiplier:1.9}),
  wheeledHeavy:Object.freeze({id:'wheeledHeavy',movementClass:'wheeled',maxSpeed:10.5,reverseSpeed:4.5,turnRate:.78,maxSlopeDeg:22,roadCostMultiplier:.78,roughCostMultiplier:1.15}),
  infantryLight:Object.freeze({id:'infantryLight',movementClass:'infantry',maxSpeed:5.6,reverseSpeed:2.4,turnRate:5.8,maxSlopeDeg:42,roadCostMultiplier:.86,roughCostMultiplier:1.12}),
  helicopter:Object.freeze({id:'helicopter',movementClass:'air',maxSpeed:42,reverseSpeed:12,turnRate:1.45,preferredAltitude:28,climbRate:12,descentRate:10})
});

export const WEAPONS=Object.freeze({
  aegis120mm:Object.freeze({id:'aegis120mm',label:'Aegis 120 mm',reloadSeconds:1.05,projectileSpeed:175,gravity:9.8,damage:320,lifeSeconds:4.5,targetClasses:['ground'],muzzleSocket:'MuzzleSocket'}),
  aegisRifle:Object.freeze({id:'aegisRifle',label:'Aegis Service Rifle',reloadSeconds:.72,damage:26,range:58,targetClasses:['ground'],muzzleSocket:'MuzzleFlash'})
});

export const UNIT_DEFINITIONS=Object.freeze({
  aegisMbt:Object.freeze({id:'aegisMbt',label:'Aegis-X MBT',asset:'assets/aegis_x_mbt_v2.glb',maxHp:1200,locomotor:'trackedHeavy',primaryWeapon:'aegis120mm',collisionRadius:4.8}),
  aegisHmmwv:Object.freeze({id:'aegisHmmwv',label:'Aegis HMMWV-50',asset:'assets/aegis_hmmwv50_v2.glb',maxHp:540,locomotor:'wheeledLight',collisionRadius:3.2}),
  aegisTalon:Object.freeze({id:'aegisTalon',label:'Aegis Talon AH-X',asset:'assets/aegis_talon_ahx.glb',maxHp:720,locomotor:'helicopter',collisionRadius:5.5}),
  aegisHarvester:Object.freeze({id:'aegisHarvester',label:'Aegis Field Harvester',asset:'assets/aegis_field_harvester_v2.glb',maxHp:900,locomotor:'wheeledHeavy',collisionRadius:4.3,resourceCapacity:1200,dockAlignSocket:'RefineryDockAlignSocket'}),
  aegisRifleman:Object.freeze({id:'aegisRifleman',label:'Aegis Rifleman',asset:'assets/infantry/aegis_rifleman_v03.glb',maxHp:120,locomotor:'infantryLight',primaryWeapon:'aegisRifle',collisionRadius:.55,cost:120,buildSeconds:1.8,walkClip:'CombatWalk',fireClip:'AimFire'})
});
