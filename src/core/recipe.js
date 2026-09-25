import { DEFAULT_BUILDING, DEFAULT_LANDSCAPE, DEFAULT_PROP, DEFAULT_TERRAIN, DEFAULT_SURFACE, DEFAULT_TRAVERSAL, DEFAULT_FOLIAGE, DEFAULT_FIELD, DEFAULT_SETTLEMENT, RECIPE_SCHEMA, WORLDFORGE_VERSION, ENGINE_VERSIONS } from './schema.js';
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
const SURFACES = new Set(['grass','dirt','wornVillage','stone','cobblestone','mud','sand','rocky']);
const SURFACE_PATHS = new Set(['none','straight','curve','tee','cross','plaza']);
const SURFACE_PATH_MATERIALS = new Set(['dirt','stone','cobblestone','sand']);
const FIELD_PRESETS = new Set(['villageWellSquare','ruralHouseLane','marketCorner','castleCourtyard','castleGateApproach','mountainPath','mountainVillagePath','stoneBridgeCrossing','cliffsideTownLane','mineEntranceClearing','desertMarket','docksideLane']);
const FIELD_SURFACES = new Set(['auto',...SURFACES]);
const FOLIAGE_FAMILIES = new Set(['tree','shrub','flowers','crops','stump','fallenLog','vines','rockCluster','reeds']);
const FOLIAGE_BIOMES = new Set(['temperate','forest','mountain','farmland','swamp','desert','ruins']);
const FOLIAGE_VARIANTS = new Set(['auto','oak','pine','birch','fruit','palm','mixed']);
const FOLIAGE_CONDITIONS = new Set(['healthy','dry','dead']);
const TRAVERSAL_FAMILIES = new Set(['bridge','stairs','slope','cliff','terrace','retainingWall']);
const TRAVERSAL_STYLES = new Set(['stone','wood','earth','rope']);
const TRAVERSAL_VARIANTS = new Set(['auto','straight','arched','suspension','broken','rough']);
const FIELD_ENGINES = new Set(['0.1.0','0.2.0','0.3.0']);
const SETTLEMENT_GRAMMARS = new Set(['ringVillage','crossroadsVillage','hillsideVillage']);
const SETTLEMENT_BIOMES = new Set(['temperate','mountain','farmland']);

function finiteNumber(v, fallback) { const n = Number(v); return Number.isFinite(n) ? n : fallback; }
function legacyBuildingEngine(input){
  if(input.engineVersion && BUILDING_ENGINES.has(input.engineVersion)) return input.engineVersion;
  const gv=String(input.generatorVersion||'');
  if(/^0\.[0-3](?:\.|$)/.test(gv)) return ENGINE_VERSIONS.building;
  if(/^0\.4(?:\.|$)/.test(gv)) return '1.1.0';
  if(/^0\.5(?:\.|$)/.test(gv)) return '1.2.0';
  return DEFAULT_BUILDING.engineVersion;
}

function legacyFieldEngine(input){
  if(input.engineVersion && FIELD_ENGINES.has(input.engineVersion)) return input.engineVersion;
  const gv=String(input.generatorVersion||'');
  if(/^0\.[0-7](?:\.|$)/.test(gv)) return '0.1.0';
  if(/^0\.8(?:\.|$)/.test(gv)) return '0.2.0';
  return DEFAULT_FIELD.engineVersion;
}

function normalizePlacement(p,index=0){
  if(!p || typeof p!=='object') return null;
  const recipe = p.recipe && typeof p.recipe==='object' ? p.recipe : null;
  if(!recipe) return null;
  const pos=Array.isArray(p.position)?p.position:[0,0,0];
  return {
    id:String(p.id||`asset-${index}`),
    label:String(p.label||recipe.family||recipe.type||`Asset ${index+1}`),
    recipe,
    position:[finiteNumber(pos[0],0),finiteNumber(pos[1],0),finiteNumber(pos[2],0)],
    rotation:finiteNumber(p.rotation,0),
    scale:clamp(finiteNumber(p.scale,1),.25,4),
    locked:!!p.locked,
    selectable:p.selectable!==false,
    allowOverlap:!!p.allowOverlap,
    ...(p.meta&&typeof p.meta==='object'?{meta:p.meta}:{})
  };
}

export function normalizeRecipe(input = {}) {
  const type = ['building','landscape','prop','terrain','surface','traversal','foliage','field','settlement'].includes(input.type) ? input.type : 'building';
  if (type === 'landscape') {
    const d=DEFAULT_LANDSCAPE; return {schema:RECIPE_SCHEMA,generatorVersion:WORLDFORGE_VERSION,engineVersion:input.engineVersion||ENGINE_VERSIONS.landscape,type,seed:Math.trunc(finiteNumber(input.seed,d.seed)),feature:FEATURES.has(input.feature)?input.feature:d.feature,size:clamp(finiteNumber(input.size,d.size),18,80),relief:clamp(finiteNumber(input.relief,d.relief),1,24),roughness:clamp(finiteNumber(input.roughness,d.roughness),0,1),terracing:clamp(finiteNumber(input.terracing,d.terracing),0,1),path:input.path??d.path,rocks:input.rocks??d.rocks,gridResolution:Math.trunc(clamp(finiteNumber(input.gridResolution,d.gridResolution),24,128))};
  }
  if(type === 'prop'){
    const d=DEFAULT_PROP; return {schema:RECIPE_SCHEMA,generatorVersion:WORLDFORGE_VERSION,engineVersion:input.engineVersion||ENGINE_VERSIONS.prop,type,seed:Math.trunc(finiteNumber(input.seed,d.seed)),family:PROP_FAMILIES.has(input.family)?input.family:d.family,style:PROP_STYLES.has(input.style)?input.style:d.style,condition:CONDITIONS.has(input.condition)?input.condition:d.condition,scale:clamp(finiteNumber(input.scale,d.scale),.5,2.5),variant:PROP_VARIANTS.has(input.variant)?input.variant:d.variant};
  }
  if(type === 'terrain'){
    const d=DEFAULT_TERRAIN; return {schema:RECIPE_SCHEMA,generatorVersion:WORLDFORGE_VERSION,engineVersion:input.engineVersion||ENGINE_VERSIONS.terrain,type,seed:Math.trunc(finiteNumber(input.seed,d.seed)),patch:TERRAIN_PATCHES.has(input.patch)?input.patch:d.patch,size:clamp(finiteNumber(input.size,d.size),6,40),roughness:clamp(finiteNumber(input.roughness,d.roughness),0,1),pathWidth:clamp(finiteNumber(input.pathWidth,d.pathWidth),.8,6),wear:clamp(finiteNumber(input.wear,d.wear),0,1),gridResolution:Math.trunc(clamp(finiteNumber(input.gridResolution,d.gridResolution),12,72))};
  }
  if(type === 'surface'){
    const d=DEFAULT_SURFACE; return {schema:RECIPE_SCHEMA,generatorVersion:WORLDFORGE_VERSION,engineVersion:input.engineVersion||ENGINE_VERSIONS.surface,type,seed:Math.trunc(finiteNumber(input.seed,d.seed)),surface:SURFACES.has(input.surface)?input.surface:d.surface,size:clamp(finiteNumber(input.size,d.size),8,64),variation:clamp(finiteNumber(input.variation,d.variation),0,1),wear:clamp(finiteNumber(input.wear,d.wear),0,1),pathPattern:SURFACE_PATHS.has(input.pathPattern)?input.pathPattern:d.pathPattern,pathWidth:clamp(finiteNumber(input.pathWidth,d.pathWidth),.8,8),pathMaterial:SURFACE_PATH_MATERIALS.has(input.pathMaterial)?input.pathMaterial:d.pathMaterial,detailDensity:clamp(finiteNumber(input.detailDensity,d.detailDensity),0,1),edgeBlend:input.edgeBlend??d.edgeBlend,gridResolution:Math.trunc(clamp(finiteNumber(input.gridResolution,d.gridResolution),16,96))};
  }
  if(type === 'traversal'){
    const d=DEFAULT_TRAVERSAL;
    return {schema:RECIPE_SCHEMA,generatorVersion:WORLDFORGE_VERSION,engineVersion:input.engineVersion||ENGINE_VERSIONS.traversal,type,seed:Math.trunc(finiteNumber(input.seed,d.seed)),family:TRAVERSAL_FAMILIES.has(input.family)?input.family:d.family,style:TRAVERSAL_STYLES.has(input.style)?input.style:d.style,variant:TRAVERSAL_VARIANTS.has(input.variant)?input.variant:d.variant,width:clamp(finiteNumber(input.width,d.width),1.2,18),length:clamp(finiteNumber(input.length,d.length),2,30),height:clamp(finiteNumber(input.height,d.height),.35,8),rails:input.rails??d.rails};
  }
  if(type === 'foliage'){
    const d=DEFAULT_FOLIAGE;
    return {schema:RECIPE_SCHEMA,generatorVersion:WORLDFORGE_VERSION,engineVersion:input.engineVersion||ENGINE_VERSIONS.foliage,type,seed:Math.trunc(finiteNumber(input.seed,d.seed)),family:FOLIAGE_FAMILIES.has(input.family)?input.family:d.family,biome:FOLIAGE_BIOMES.has(input.biome)?input.biome:d.biome,variant:FOLIAGE_VARIANTS.has(input.variant)?input.variant:d.variant,condition:FOLIAGE_CONDITIONS.has(input.condition)?input.condition:d.condition,scale:clamp(finiteNumber(input.scale,d.scale),.4,2.5),density:clamp(finiteNumber(input.density,d.density),0,1),spread:clamp(finiteNumber(input.spread,d.spread),.35,2.5)};
  }
  if(type === 'field'){
    const d=DEFAULT_FIELD;
    const placements=Array.isArray(input.placements)?input.placements.map(normalizePlacement).filter(Boolean):null;
    return {schema:RECIPE_SCHEMA,generatorVersion:WORLDFORGE_VERSION,engineVersion:legacyFieldEngine(input),type,seed:Math.trunc(finiteNumber(input.seed,d.seed)),preset:FIELD_PRESETS.has(input.preset)?input.preset:d.preset,size:clamp(finiteNumber(input.size,d.size),26,64),density:clamp(finiteNumber(input.density,d.density),0,1),surface:FIELD_SURFACES.has(input.surface)?input.surface:d.surface,buildingEngine:BUILDING_ENGINES.has(input.buildingEngine)?input.buildingEngine:d.buildingEngine,dressing:clamp(finiteNumber(input.dressing,d.dressing),0,1),elevation:clamp(finiteNumber(input.elevation,d.elevation),0,1),placements};
  }
  if(type === 'settlement'){
    const d=DEFAULT_SETTLEMENT;
    const placements=Array.isArray(input.placements)?input.placements.map(normalizePlacement).filter(Boolean):null;
    const characterSpawn=Array.isArray(input.characterSpawn)&&input.characterSpawn.length>=3?[finiteNumber(input.characterSpawn[0],d.characterSpawn?.[0]??0),finiteNumber(input.characterSpawn[1],d.characterSpawn?.[1]??0),finiteNumber(input.characterSpawn[2],d.characterSpawn?.[2]??0.12)]:d.characterSpawn;
    return {schema:RECIPE_SCHEMA,generatorVersion:WORLDFORGE_VERSION,engineVersion:input.engineVersion||ENGINE_VERSIONS.settlement,type,seed:Math.trunc(finiteNumber(input.seed,d.seed)),grammar:SETTLEMENT_GRAMMARS.has(input.grammar)?input.grammar:d.grammar,size:clamp(finiteNumber(input.size,d.size),36,84),buildingCount:Math.trunc(clamp(finiteNumber(input.buildingCount,d.buildingCount),10,32)),density:clamp(finiteNumber(input.density,d.density),0.25,1),buildingEngine:BUILDING_ENGINES.has(input.buildingEngine)?input.buildingEngine:d.buildingEngine,biome:SETTLEMENT_BIOMES.has(input.biome)?input.biome:d.biome,wealth:WEALTH.has(input.wealth)?input.wealth:d.wealth,age:AGES.has(input.age)?input.age:d.age,dressing:clamp(finiteNumber(input.dressing,d.dressing),0,1),elevation:clamp(finiteNumber(input.elevation,d.elevation),0,1),characterPreview:input.characterPreview??d.characterPreview,characterSpawn,placements};
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
  }
  if(r.type==='prop'&&r.family==='fence'&&r.scale>2)warnings.push('Very large fence scale may not match field proportions.');
  if(r.type==='foliage'&&r.family==='tree'&&r.scale>2)warnings.push('Very large trees may be heavy or dominate small fields.');
  if(r.type==='traversal'&&r.family==='bridge'&&r.height<1.1)warnings.push('Low bridge clearance may not support pass-under traversal.');
  if(r.type==='field'&&r.placements&&r.placements.length>80)warnings.push('Large field placement count may be heavy on mobile.');
  if(r.type==='settlement'&&r.buildingCount>26)warnings.push('Very large settlements may be heavy on mobile.');
  return {recipe:r,warnings};
}
