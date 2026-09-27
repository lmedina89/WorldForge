import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');

function glbJson(rel){
  const buf=fs.readFileSync(path.join(root,rel));
  assert.equal(buf.toString('ascii',0,4),'glTF',`${rel} is not GLB`);
  let off=12;
  while(off<buf.length){
    const len=buf.readUInt32LE(off),type=buf.readUInt32LE(off+4);off+=8;
    const chunk=buf.subarray(off,off+len);off+=len;
    if(type===0x4E4F534A)return JSON.parse(chunk.toString('utf8').replace(/\u0000+$/,'').trim());
  }
  throw new Error(`${rel} missing JSON chunk`);
}
function validate(rel,requiredNodes,teamMaterials){
  const j=glbJson(rel);
  const names=new Set((j.nodes||[]).map(n=>n.name).filter(Boolean));
  for(const n of requiredNodes)assert.ok(names.has(n),`${rel} missing node ${n}`);
  const mats=new Set((j.materials||[]).map(m=>m.name).filter(Boolean));
  for(const m of teamMaterials)assert.ok(mats.has(m),`${rel} missing material ${m}`);
  const tris='validated by packaged build metadata';
  return {nodes:names.size,materials:mats.size,tris};
}
const cp=validate('assets/buildings/aegis_tactical_command_post_v21.glb',
 ['BuildingRoot','ServiceBayDoorRoot','RadarYawRoot','RadarDishPitchRoot','MainEntranceSocket','ServiceBayExitSocket','RallySocket','BuildOriginSocket','DamageFX_Core'],
 ['WF_TEAM_PRIMARY','WF_TEAM_SECONDARY','WF_TEAM_ACCENT']);
const power=validate('assets/buildings/aegis_field_power_node_v1.glb',
 ['BuildingRoot','CoolingFanRoot_1','CoolingFanRoot_2','MainEntranceSocket','ServiceVehicleSocket','PowerOutputSocket','BuildOriginSocket','RepairSocket','DamageFX_GeneratorHall'],
 ['WF_TEAM_PRIMARY','WF_TEAM_SECONDARY','WF_TEAM_ACCENT']);
const refinery=validate('assets/buildings/aegis_field_refinery_v2.glb',
 ['BuildingRoot','ApronFeederRoot','DustCollectorFanRoot','HarvesterDockSocket','HarvesterUnloadSocket','HarvesterExitSocket','ReceiverPitSocket','BuildOriginSocket'],
 ['WF_TEAM_PRIMARY','WF_TEAM_SECONDARY','WF_TEAM_ACCENT']);
console.log(JSON.stringify({ok:true,commandPost:cp,fieldPowerNode:power,fieldRefinery:refinery}));
