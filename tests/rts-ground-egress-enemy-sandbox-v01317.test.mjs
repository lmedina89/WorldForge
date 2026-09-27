import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const schema=fs.readFileSync(path.join(root,'src/core/schema.js'),'utf8');
const sk=fs.readFileSync(path.join(root,'src/rts/skirmish-test.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

assert.match(schema,/WORLDFORGE_VERSION = '0\.13\.19'/);
assert.match(schema,/skirmish: '0\.7\.6'/);
assert.match(schema,/rtsMapForge: '0\.2\.9'/);
assert.match(sk,/SKIRMISH_VERSION='0\.7\.6'/);

for(const phrase of [
  '_startControlledEgress',
  '_unitFullyOutsideBuilding',
  '_tryControlledEgressMove',
  'controlledEgress',
  'ignoreUnits',
  'ignoreBuildingIds:[building.id]',
  "clearance=Math.min(fp[0],fp[1])*.44+.28",
  '_spawnEnemySandboxBase',
  '_spawnEnemyBuilding',
  '_spawnEnemySupport',
  '_spawnEnemyRifleman',
  'applyUnitFactionPalette',
  'GUARDIAN_TURRET_WEAPON',
  "ENEMY_CommandPost",
  "ENEMY_VehicleFactory",
  "ENEMY_Guardian_Left",
  "ENEMY_Guardian_Right",
  "owner:'enemy'",
  "Hostile ${RTS_BUILDINGS",
  "['target','unit','building'].includes(target.kind)"
]) assert.ok(sk.includes(phrase),`missing v0.13.19 feature: ${phrase}`);

assert.match(sk,/_startControlledEgress\(e,factory,corridor,rally/);
assert.match(sk,/move\.controlledEgress\?this\._tryControlledEgressMove/);
assert.match(sk,/target\.components\.owner===e\.components\.owner/);
assert.match(sk,/hostile Guardian Turrets are active/);
assert.match(html,/SKIRMISH LAB 0\.7\.6/);
assert.match(html,/premade opposing-start enemy forward base/);
assert.match(html,/controlled spawn → exit → exterior-staging deployment/);

console.log(JSON.stringify({
  ok:true,
  worldforge:'0.13.19',
  skirmish:'0.7.6',
  mapForge:'0.2.9',
  controlledFactoryEgress:true,
  refineryEgress:true,
  reducedRouteInflation:true,
  runtimeEnemyFactionVariants:true,
  premadeEnemyBase:true,
  activeGuardianTurrets:true,
  attackableEnemyBuildings:true
},null,2));
