import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const RTS_ASSET_LIBRARY_VERSION='0.4.0';

export const FACTION_PALETTES=Object.freeze({
  aegis:Object.freeze({id:'aegis',label:'Aegis Olive',base:'#777b70',primary:'#60704f',secondary:'#39483c',accent:'#c9a54b'}),
  desert:Object.freeze({id:'desert',label:'Desert Tan',base:'#91856c',primary:'#806b47',secondary:'#584a35',accent:'#d1ad57'}),
  crimson:Object.freeze({id:'crimson',label:'Crimson',base:'#696865',primary:'#7b3431',secondary:'#3f2b2a',accent:'#c99842'}),
  slate:Object.freeze({id:'slate',label:'Slate Blue',base:'#626b70',primary:'#3e6272',secondary:'#293f49',accent:'#91b3bd'}),
  blackops:Object.freeze({id:'blackops',label:'Black Ops',base:'#424846',primary:'#252e2c',secondary:'#59645e',accent:'#a96044'})
});

export const MASTER_BUILDINGS=Object.freeze({
  tacticalCommandPost:Object.freeze({
    id:'tacticalCommandPost',label:'Aegis Tactical Command Post',role:'constructionYard',classification:'military',version:'2.1',asset:'assets/buildings/aegis_tactical_command_post_v21.glb',
    footprint:[31.6,23.925],height:18.6,skirmishDefault:true,
    slots:Object.freeze({
      base:['WF_NEUTRAL_ARMOR_LIGHT'],
      primary:['WF_TEAM_PRIMARY'],
      secondary:['WF_TEAM_SECONDARY'],
      accent:['WF_TEAM_ACCENT']
    }),
    requiredNodes:['BuildingRoot','ServiceBayDoorRoot','RadarYawRoot','RadarDishPitchRoot','MainEntranceSocket','ServiceBayExitSocket','RallySocket','BuildOriginSocket','PowerSocket','DamageFX_Core']
  }),
  fieldPowerNode:Object.freeze({
    id:'fieldPowerNode',label:'Aegis Field Power Node',role:'powerPlant',classification:'military',version:'1.0',asset:'assets/buildings/aegis_field_power_node_v1.glb',
    footprint:[24.1,20.74],height:13.995,skirmishDefault:true,
    slots:Object.freeze({
      base:['Military_Concrete_Dark'],
      primary:['WF_TEAM_PRIMARY'],
      secondary:['WF_TEAM_SECONDARY'],
      accent:['WF_TEAM_ACCENT']
    }),
    requiredNodes:['BuildingRoot','CoolingFanRoot_1','CoolingFanRoot_2','MainEntranceSocket','ServiceVehicleSocket','PowerOutputSocket','BuildOriginSocket','RepairSocket','DamageFX_GeneratorHall']
  }),
  fieldRefinery:Object.freeze({
    id:'fieldRefinery',label:'Aegis Field Refinery',role:'refinery',classification:'military',version:'2.0',asset:'assets/buildings/aegis_field_refinery_v2.glb',
    footprint:[34,26],height:15.21,skirmishDefault:true,
    slots:Object.freeze({
      base:[],
      primary:['WF_TEAM_PRIMARY'],
      secondary:['WF_TEAM_SECONDARY'],
      accent:['WF_TEAM_ACCENT']
    }),
    requiredNodes:['BuildingRoot','ApronFeederRoot','DustCollectorFanRoot','DockSignalRoot','HarvesterQueueSocket','HarvesterApproachSocket','HarvesterDockSocket','HarvesterUnloadSocket','HarvesterExitSocket','HarvesterRallySocket','ReceiverPitSocket','OreFlowFXSocket','DustFXSocket','MainEntranceSocket','PowerInputSocket','RepairSocket','ResourceOutputSocket','BuildOriginSocket']
  }),
  fieldBarracks:Object.freeze({
    id:'fieldBarracks',label:'Aegis Field Barracks',role:'barracks',classification:'military',version:'0.2.3',asset:'assets/buildings/aegis_field_barracks_v023.glb',
    footprint:[18.15,12.95],height:8.01,skirmishDefault:true,
    slots:Object.freeze({
      base:['WF_BASE_ARMOR'],
      primary:['WF_TEAM_PRIMARY'],
      secondary:['WF_TEAM_SECONDARY'],
      accent:['WF_TEAM_ACCENT']
    }),
    requiredNodes:['FieldBarracksRoot','WF_SPAWN_INFANTRY','WF_ENTRY','WF_EXIT_PATH_0','WF_EXIT_PATH_1','WF_EXIT_PATH_2','WF_RALLY','WF_CONSTRUCTION','WF_DAMAGE_CENTER']
  }),
  commandNexus:Object.freeze({
    id:'commandNexus',label:'Civilian Helicopter Operations Station',role:'neutralHeliStation',classification:'civilian',version:'1.3',asset:'assets/buildings/aegis_command_nexus_hq_v13.glb',
    footprint:[52.8,41.2],height:24.31,skirmishDefault:false,
    slots:Object.freeze({
      base:['Concrete_Armor','Concrete_Dark'],
      primary:['Command_Red'],
      secondary:['Aegis_Olive'],
      accent:['Marking_White']
    }),
    requiredNodes:['BuildingRoot','VehicleBayDoorRoot','RadarYawRoot','RadarDishPitchRoot','MainEntranceSocket','VehicleBayExitSocket','RallySocket','BuildOriginSocket']
  }),
  gridBastion:Object.freeze({
    id:'gridBastion',label:'Civilian Regional Power Station',role:'neutralPowerStation',classification:'civilian',version:'1.0',asset:'assets/buildings/aegis_grid_bastion_power_plant_v1.glb',
    footprint:[38.9,35.5],height:16.61,skirmishDefault:false,
    slots:Object.freeze({
      base:['Military_Concrete','Military_Concrete_Dark'],
      primary:['WF_TEAM_PRIMARY'],
      secondary:['WF_TEAM_SECONDARY','Military_Olive_Neutral'],
      accent:['WF_TEAM_ACCENT']
    }),
    requiredNodes:['BuildingRoot','CoolingFanRoot_1','CoolingFanRoot_2','CoolingFanRoot_3','CoolingFanRoot_4','MainEntranceSocket','PowerOutputSocket','BuildOriginSocket']
  })
});

const cache=new Map();
const defaultLoader=new GLTFLoader();

function colorValue(v,fallback){try{return new THREE.Color(v||fallback);}catch{return new THREE.Color(fallback);}}
function slotForMaterial(name='',def){for(const [slot,names] of Object.entries(def?.slots||{}))if(names.includes(name))return slot;return null;}

export function resolveFactionPalette(preset='aegis',overrides={}){
  const base=FACTION_PALETTES[preset]||FACTION_PALETTES.aegis;
  return {
    id:base.id,label:base.label,
    base:overrides.base||base.base,
    primary:overrides.primary||base.primary,
    secondary:overrides.secondary||base.secondary,
    accent:overrides.accent||base.accent
  };
}

export function cloneSceneMaterials(root){
  const materialCache=new Map();
  root.traverse(o=>{
    if(!o.material)return;
    const cloneOne=m=>{
      if(materialCache.has(m.uuid))return materialCache.get(m.uuid);
      const c=m.clone();materialCache.set(m.uuid,c);return c;
    };
    o.material=Array.isArray(o.material)?o.material.map(cloneOne):cloneOne(o.material);
  });
  return root;
}

export function applyBuildingPalette(root,assetDef,preset='aegis',overrides={}){
  const p=resolveFactionPalette(preset,overrides),changed=new Set();
  root.traverse(o=>{
    const mats=Array.isArray(o.material)?o.material:(o.material?[o.material]:[]);
    for(const m of mats){
      if(changed.has(m.uuid))continue;
      const slot=slotForMaterial(m.name,assetDef);if(!slot)continue;
      const target=colorValue(p[slot],'#777777');
      if(m.color)m.color.copy(target);
      // Preserve the authored PBR response; only faction color changes.
      changed.add(m.uuid);m.needsUpdate=true;
      m.userData={...(m.userData||{}),worldForgeFactionSlot:slot,worldForgeFaction:p.id};
    }
  });
  root.userData={...(root.userData||{}),worldForgeFactionPalette:p};
  return p;
}

export function inspectRTSAsset(root){
  const materials=new Set(),nodes=[],sockets=[],roots=[];let meshCount=0,triangleCount=0;
  root.traverse(o=>{
    if(o.name){nodes.push(o.name);if(/Socket$/i.test(o.name)||/FX_/i.test(o.name)||/FXSocket/i.test(o.name))sockets.push(o.name);if(/Root(_\d+)?$/i.test(o.name))roots.push(o.name);}
    if(o.isMesh&&o.geometry){meshCount++;triangleCount+=o.geometry.index?Math.floor(o.geometry.index.count/3):Math.floor((o.geometry.attributes?.position?.count||0)/3);const mats=Array.isArray(o.material)?o.material:[o.material];mats.filter(Boolean).forEach(m=>materials.add(m.name||'unnamed'));}
  });
  const box=new THREE.Box3().setFromObject(root),size=new THREE.Vector3();box.getSize(size);
  return {meshCount,triangleCount,materials:[...materials].sort(),nodes,sockets:[...new Set(sockets)].sort(),functionalRoots:[...new Set(roots)].sort(),dimensions:{x:+size.x.toFixed(3),y:+size.y.toFixed(3),z:+size.z.toFixed(3)}};
}

async function sourceFor(assetId,loader=defaultLoader){
  const def=MASTER_BUILDINGS[assetId];if(!def)throw new Error(`Unknown master building: ${assetId}`);
  if(!cache.has(assetId))cache.set(assetId,loader.loadAsync(def.asset));
  return {def,gltf:await cache.get(assetId)};
}

export async function instantiateMasterBuilding(assetId,{palette='aegis',colors={},loader=defaultLoader}={}){
  const {def,gltf}=await sourceFor(assetId,loader);
  const source=cloneSceneMaterials(gltf.scene.clone(true));
  source.traverse(o=>{if(o.isMesh){if(o.geometry)o.geometry=o.geometry.clone();o.castShadow=true;o.receiveShadow=true;}});
  const applied=applyBuildingPalette(source,def,palette,colors);
  const info=inspectRTSAsset(source);
  const missing=def.requiredNodes.filter(n=>!source.getObjectByName(n));
  source.userData={...(source.userData||{}),worldForgeMasterAsset:def.id,worldForgeRole:def.role,worldForgeMasterVersion:def.version,worldForgeFactionPalette:applied};
  return {group:source,definition:def,info:{...info,assetId:def.id,label:def.label,role:def.role,version:def.version,missingRequiredNodes:missing,palette:applied}};
}

export function masterBuildingForRole(role){
  const matches=Object.values(MASTER_BUILDINGS).filter(x=>x.role===role);
  return matches.find(x=>x.skirmishDefault)||matches[0]||null;
}
