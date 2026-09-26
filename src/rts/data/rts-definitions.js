export const RTS_DEFINITIONS_VERSION='0.1.0';


export const BUILDING_DEFINITIONS=Object.freeze({
  constructionYard:Object.freeze({id:'constructionYard',label:'Construction Yard',cost:0,hp:2200,footprint:[24,20],powerUse:0,powerSupply:0,buildRadius:125,category:'core'}),
  powerPlant:Object.freeze({id:'powerPlant',label:'Power Plant',cost:500,hp:900,footprint:[18,14],powerUse:0,powerSupply:100,category:'power'}),
  refinery:Object.freeze({id:'refinery',label:'Refinery',cost:900,hp:1250,footprint:[24,18],powerUse:18,powerSupply:0,category:'economy'}),
  barracks:Object.freeze({id:'barracks',label:'Barracks',cost:650,hp:900,footprint:[17,12],powerUse:10,powerSupply:0,category:'production'}),
  vehicleFactory:Object.freeze({id:'vehicleFactory',label:'Vehicle Factory',cost:1200,hp:1700,footprint:[30,23],powerUse:30,powerSupply:0,category:'production'}),
  gunTurret:Object.freeze({id:'gunTurret',label:'Gun Turret',cost:600,hp:700,footprint:[9,9],powerUse:12,powerSupply:0,category:'defense'})
});

export const LOCOMOTORS=Object.freeze({
  trackedHeavy:Object.freeze({id:'trackedHeavy',movementClass:'tracked',maxSpeed:18,reverseSpeed:8,turnRate:1.0,maxSlopeDeg:32,roadCostMultiplier:.82,roughCostMultiplier:1.18}),
  wheeledLight:Object.freeze({id:'wheeledLight',movementClass:'wheeled',maxSpeed:26,reverseSpeed:9,turnRate:1.25,maxSlopeDeg:22,roadCostMultiplier:.62,roughCostMultiplier:1.9}),
  helicopter:Object.freeze({id:'helicopter',movementClass:'air',maxSpeed:42,reverseSpeed:12,turnRate:1.45,preferredAltitude:28,climbRate:12,descentRate:10})
});

export const WEAPONS=Object.freeze({
  aegis120mm:Object.freeze({id:'aegis120mm',label:'Aegis 120 mm',reloadSeconds:1.05,projectileSpeed:175,gravity:9.8,damage:320,lifeSeconds:4.5,targetClasses:['ground'],muzzleSocket:'MuzzleSocket'})
});

export const UNIT_DEFINITIONS=Object.freeze({
  aegisMbt:Object.freeze({id:'aegisMbt',label:'Aegis-X MBT',asset:'assets/aegis_x_mbt_v2.glb',maxHp:1200,locomotor:'trackedHeavy',primaryWeapon:'aegis120mm',collisionRadius:4.8}),
  aegisHmmwv:Object.freeze({id:'aegisHmmwv',label:'Aegis HMMWV-50',asset:'assets/aegis_hmmwv50_v2.glb',maxHp:540,locomotor:'wheeledLight',collisionRadius:3.2}),
  aegisTalon:Object.freeze({id:'aegisTalon',label:'Aegis Talon AH-X',asset:'assets/aegis_talon_ahx.glb',maxHp:720,locomotor:'helicopter',collisionRadius:5.5})
});
