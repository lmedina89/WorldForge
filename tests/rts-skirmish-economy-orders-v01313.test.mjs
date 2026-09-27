import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { RTS_COMMANDS } from '../src/rts/sim/rts-commands.js';
import { RTS_DEFINITIONS_VERSION, UNIT_DEFINITIONS } from '../src/rts/data/rts-definitions.js';

const root=path.resolve(import.meta.dirname,'..');
const schema=fs.readFileSync(path.join(root,'src/core/schema.js'),'utf8');
const sk=fs.readFileSync(path.join(root,'src/rts/skirmish-test.js'),'utf8');
const map=fs.readFileSync(path.join(root,'src/rts-map/rts-map-forge.js'),'utf8');
const app=fs.readFileSync(path.join(root,'src/app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

assert.match(schema,/WORLDFORGE_VERSION = '0\.13\.19'/);
assert.match(schema,/rtsMapForge: '0\.2\.9'/);
assert.match(schema,/skirmish: '0\.7\.6'/);
assert.equal(RTS_DEFINITIONS_VERSION,'0.6.1');
assert.equal(RTS_COMMANDS.HARVEST,'HARVEST');
assert.equal(RTS_COMMANDS.RETURN_CARGO,'RETURN_CARGO');
assert.equal(UNIT_DEFINITIONS.aegisHarvester.resourceCapacity,1200);
assert.equal(UNIT_DEFINITIONS.aegisHarvester.harvestRate,120);
assert.equal(UNIT_DEFINITIONS.aegisHarvester.unloadRate,600);
assert.equal(UNIT_DEFINITIONS.aegisHarvester.creditPerUnit,1);

assert.match(sk,/SKIRMISH_VERSION='0\.7\.6'/);
for(const phrase of [
  '_registerResourceFields()',
  '_handleMoveCommand(cmd)',
  '_handleHarvestCommand(cmd)',
  '_systemHarvesterEconomy(dt)',
  '_beginReturnCargo(harvester)',
  'playerFaction?.credit(value)',
  'selectedEntityIds',
  '_makeSelectedUnitMarker()',
  'mapForge.findPath',
  'worldForgeResourceInstances'
]) assert.ok(sk.includes(phrase),`missing economy/order feature: ${phrase}`);
assert.match(sk,/RTS_COMMANDS\.HARVEST/);
assert.match(sk,/RTS_COMMANDS\.MOVE/);
assert.match(sk,/CARGO/);

assert.match(map,/RTS_MAP_FORGE_VERSION='0\.2\.9'/);
assert.match(map,/findPath\(fromX,fromY,toX,toY,kind='tracked'\)/);
assert.match(map,/setResourceFieldFraction\(zoneId,fraction=1\)/);
assert.match(map,/resourceInstanceSets/);
assert.match(map,/remainingCapacity/);
assert.match(app,/selectedUnitType==='aegisHarvester'/);
assert.match(html,/Tap a friendly unit to select it/);

console.log(JSON.stringify({ok:true,worldforge:'0.13.19',skirmish:'0.7.6',mapForge:'0.2.9',definitions:'0.6.1',selection:true,routedMovement:true,harvesterEconomy:true,depletion:true,refineryUnload:true}));
