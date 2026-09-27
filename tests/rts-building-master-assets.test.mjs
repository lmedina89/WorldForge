import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const lib=fs.readFileSync(path.join(root,'src/rts/rts-asset-library.js'),'utf8');
const forge=fs.readFileSync(path.join(root,'src/building/building-forge.js'),'utf8');
const skirmish=fs.readFileSync(path.join(root,'src/rts/skirmish-test.js'),'utf8');
const defs=fs.readFileSync(path.join(root,'src/rts/data/rts-definitions.js'),'utf8');
const app=fs.readFileSync(path.join(root,'src/app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

for(const rel of [
  'assets/buildings/aegis_tactical_command_post_v21.glb',
  'assets/buildings/aegis_field_power_node_v1.glb',
  'assets/buildings/aegis_field_refinery_v2.glb',
  'assets/buildings/aegis_command_nexus_hq_v13.glb',
  'assets/buildings/aegis_grid_bastion_power_plant_v1.glb'
]) assert.ok(fs.statSync(path.join(root,rel)).size>10000,`${rel} missing/too small`);

for(const id of ['tacticalCommandPost','fieldPowerNode','fieldRefinery','commandNexus','gridBastion'])assert.match(lib,new RegExp(id));
assert.match(lib,/skirmishDefault:true/);
assert.match(lib,/classification:'civilian'/);
assert.match(lib,/WF_TEAM_PRIMARY/);
assert.match(lib,/FACTION_PALETTES/);
assert.match(forge,/BUILDING_FORGE_VERSION='0\.3\.0'/);
assert.match(forge,/this\.assetId='tacticalCommandPost'/);
assert.match(defs,/masterAsset:'tacticalCommandPost'/);
assert.match(defs,/masterAsset:'fieldPowerNode'/);
assert.match(defs,/masterAsset:'fieldRefinery'/);
assert.match(defs,/starterUnit:'aegisHarvester'/);
assert.match(skirmish,/configuredMasterId=def\?\.masterAsset/);
assert.match(skirmish,/SKIRMISH_VERSION='0\.5\.0'/);
assert.match(app,/skirmishSpawnHarvester/);
assert.match(html,/BUILDING FORGE 0\.3/);
assert.match(html,/Tactical Command Post · v2\.1/);
assert.match(html,/Field Power Node · v1\.0/);
assert.match(html,/Field Refinery · v2\.0/);
assert.match(html,/Civilian \/ neutral masters/);
assert.match(html,/id="skirmishSpawnHmmwv"/);
assert.match(html,/id="skirmishSpawnTalon"/);
assert.match(html,/id="skirmishSpawnHarvester"/);
console.log(JSON.stringify({ok:true,masterBuildings:5,militaryDefaults:3,civilianMasters:2,palettes:5,skirmishMasterReplacement:true}));
