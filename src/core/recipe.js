import { DEFAULT_BUILDING, DEFAULT_LANDSCAPE, DEFAULT_PROP, DEFAULT_TERRAIN, RECIPE_SCHEMA, WORLDFORGE_VERSION, ENGINE_VERSIONS } from './schema.js';
import { clamp } from './rng.js';

const BUILDING_FAMILIES = new Set(['cottage','house','shop','inn','shack','barn','warehouse','peasantHouse','farmhouse','smithy','chapel','stable','guildHall','merchantHouse','watchtower','gatehouse','keep','castleWall','barracks','watermill','windmill','dock','dockWarehouse','temple','mageTower','ruinedFort','desertHouse','desertMarket','mineEntrance','cityGate','sewerEntrance','townHall']);
const BUILDING_STYLES = new Set(['smallWoodTown','mountain','stoneTown','industrial','abandonedEdge','oldRpgVillage','rusticVillage','frontierTown','fortifiedStone','castleKeep','monastery','riverVillage','harborTown','highTemple','arcane','ancientRuins','desertTown','miningTown','grandCity','sewerworks']);
const MATERIALS = new Set(['auto','wood','timberPlaster','stone','brick','metal']);
const CONDITIONS = new Set(['clean','worn','abandoned']);
const ROOFS_V10 = new Set(['gable','hip','flat']);
const ROOFS_V11 = new Set(['gable','hip','flat','crossGable','shed','gambrel']);
const ROOFS_V12 = new Set(['gable','hip','flat','crossGable','shed','gambrel','conical','parapet']);
const ROOFS_V13 = new Set([...ROOFS_V12,'dome','spire']);
const BUILDING_ENGINES = new Set(['1.0.0','1.1.0','1.2.0','1.3.0']);
const TEMPLATES = new Set(['auto','compact','wideFront','lWing','sideWing','twinWing','stepped','tallNarrow','shopfront','workshop','courtyardFront','hearthHouse','longhouse','smithyYard','chapelNave','guildHall','squareTower','roundTower','twinSquareGate','twinRoundGate','keepBlock','wallSegment','barracksHall','waterMillHouse','windmillTower','dockPier','dockWarehouse','templeHall','mageSpire','ruinedFort','adobeCourtyard','desertBazaar','minePortal','grandCityGate','sewerPortal','civicHall']);
const FACADES = new Set(['auto','symmetric','asymmetric','storefront','rural','workshop']);
const WEALTH = new Set(['poor','modest','prosperous']);
const AGES = new Set(['new','mature','old']);
const CONSTRUCTION = new Set(['auto','uniform','stoneBase','brickBase']);
const FEATURES = new Set(['ridge','mesa','ravine']);
const PROP_FAMILIES = new Set(['well','fence','signpost','supplies']);
const PROP_STYLES = new Set(['village','mountain','stone','rough']);
const PROP_VARIANTS = new Set(['auto','stone','wood','roofed','straight','corner','gate','broken','single','cluster']);
const TERRAIN_PATCHES = new Set(['grass','dirt','path','wornVillage']);

function finiteNumber(v, fallback) { const n = Number(v); return Number.isFinite(n) ? n : fallback; }
function legacyBuildingEngine(input){
  if(input.engineVersion && BUILDING_ENGINES.has(input.engineVersion)) return input.engineVersion;
  // Recipes created before WorldForge 0.4 predate Building Engine 1.1. Preserve them automatically.
  const gv=String(input.generatorVersion||'');
  if(/^0\.[0-3](?:\.|$)/.test(gv)) return ENGINE_VERSIONS.building;
  if(/^0\.4(?:\.|$)/.test(gv)) return '1.1.0';
  if(/^0\.5(?:\.|$)/.test(gv)) return '1.2.0';
  return DEFAULT_BUILDING.engineVersion;
}

export function normalizeRecipe(input = {}) {
  const type = ['building','landscape','prop','terrain'].includes(input.type) ? input.type : 'building';
  if (type === 'landscape') {
    const d=DEFAULT_LANDSCAPE; return {schema:RECIPE_SCHEMA,generatorVersion:WORLDFORGE_VERSION,engineVersion:input.engineVersion||ENGINE_VERSIONS.landscape,type,seed:Math.trunc(finiteNumber(input.seed,d.seed)),feature:FEATURES.has(input.feature)?input.feature:d.feature,size:clamp(finiteNumber(input.size,d.size),18,80),relief:clamp(finiteNumber(input.relief,d.relief),1,24),roughness:clamp(finiteNumber(input.roughness,d.roughness),0,1),terracing:clamp(finiteNumber(input.terracing,d.terracing),0,1),path:input.path??d.path,rocks:input.rocks??d.rocks,gridResolution:Math.trunc(clamp(finiteNumber(input.gridResolution,d.gridResolution),24,128))};
  }
  if(type === 'prop'){
    const d=DEFAULT_PROP; return {schema:RECIPE_SCHEMA,generatorVersion:WORLDFORGE_VERSION,engineVersion:input.engineVersion||ENGINE_VERSIONS.prop,type,seed:Math.trunc(finiteNumber(input.seed,d.seed)),family:PROP_FAMILIES.has(input.family)?input.family:d.family,style:PROP_STYLES.has(input.style)?input.style:d.style,condition:CONDITIONS.has(input.condition)?input.condition:d.condition,scale:clamp(finiteNumber(input.scale,d.scale),.5,2.5),variant:PROP_VARIANTS.has(input.variant)?input.variant:d.variant};
  }
  if(type === 'terrain'){
    const d=DEFAULT_TERRAIN; return {schema:RECIPE_SCHEMA,generatorVersion:WORLDFORGE_VERSION,engineVersion:input.engineVersion||ENGINE_VERSIONS.terrain,type,seed:Math.trunc(finiteNumber(input.seed,d.seed)),patch:TERRAIN_PATCHES.has(input.patch)?input.patch:d.patch,size:clamp(finiteNumber(input.size,d.size),6,40),roughness:clamp(finiteNumber(input.roughness,d.roughness),0,1),pathWidth:clamp(finiteNumber(input.pathWidth,d.pathWidth),.8,6),wear:clamp(finiteNumber(input.wear,d.wear),0,1),gridResolution:Math.trunc(clamp(finiteNumber(input.gridResolution,d.gridResolution),12,72))};
  }

  const d=DEFAULT_BUILDING, features=input.features||{}, engineVersion=legacyBuildingEngine(input), modern=['1.1.0','1.2.0','1.3.0'].includes(engineVersion), rpg=['1.2.0','1.3.0'].includes(engineVersion), rpg2=engineVersion==='1.3.0';
  const roofs=rpg2?ROOFS_V13:(rpg?ROOFS_V12:(modern?ROOFS_V11:ROOFS_V10));
  const base={
    schema:RECIPE_SCHEMA,generatorVersion:WORLDFORGE_VERSION,engineVersion,type,
    seed:Math.trunc(finiteNumber(input.seed,d.seed)),family:BUILDING_FAMILIES.has(input.family)?input.family:d.family,
    style:BUILDING_STYLES.has(input.style)?input.style:d.style,material:MATERIALS.has(input.material)?input.material:d.material,
    condition:CONDITIONS.has(input.condition)?input.condition:d.condition,width:clamp(finiteNumber(input.width,d.width),3.25,rpg2?24:(rpg?20:14)),depth:clamp(finiteNumber(input.depth,d.depth),2.75,rpg2?18:(rpg?15:11)),
    floors:Math.trunc(clamp(finiteNumber(input.floors,d.floors),1,rpg2?8:(rpg?6:4))),roof:roofs.has(input.roof)?input.roof:d.roof,pitch:clamp(finiteNumber(input.pitch,d.pitch),15,65),
    features:{chimney:features.chimney??d.features.chimney,porch:features.porch??d.features.porch,sign:features.sign??d.features.sign,extension:features.extension??d.features.extension}
  };
  if(modern){
    base.template=TEMPLATES.has(input.template)?input.template:d.template;
    base.facade=FACADES.has(input.facade)?input.facade:d.facade;
    base.wealth=WEALTH.has(input.wealth)?input.wealth:d.wealth;
    base.age=AGES.has(input.age)?input.age:d.age;
    base.construction=CONSTRUCTION.has(input.construction)?input.construction:d.construction;
  }
  return base;
}

export function validateRecipe(recipe) {
  const r=normalizeRecipe(recipe), warnings=[];
  if(r.type==='building'){
    if(r.family==='shack'&&r.floors>2)warnings.push('Shacks are normally one or two floors.');
    if(r.family==='barn'&&r.features.sign)warnings.push('Barn sign is unusual but allowed.');
    if(r.roof==='flat'&&r.pitch!==15)warnings.push('Roof pitch is ignored for flat roofs.');
    if(r.engineVersion==='1.0.0'&&['crossGable','shed','gambrel','conical','parapet'].includes(recipe.roof))warnings.push('Building Engine 1.0 supports gable, hip and flat roofs only.');
    const rpgFamilies=new Set(['peasantHouse','farmhouse','smithy','chapel','stable','guildHall','merchantHouse','watchtower','gatehouse','keep','castleWall','barracks','watermill','windmill','dock','dockWarehouse','temple','mageTower','ruinedFort','desertHouse','desertMarket','mineEntrance','cityGate','sewerEntrance','townHall']);
    if(r.engineVersion!=='1.2.0'&&rpgFamilies.has(r.family))warnings.push('This RPG family is designed for Building Engine 1.2.');
  }
  if(r.type==='prop'&&r.family==='fence'&&r.scale>2)warnings.push('Very large fence scale may not match field proportions.');
  return {recipe:r,warnings};
}
