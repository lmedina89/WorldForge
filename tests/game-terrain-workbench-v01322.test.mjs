import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { TerrainSampler } from '../src/game-terrain/terrain-sampler.js';

const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const read=p=>fs.readFileSync(path.join(ROOT,p));
const text=p=>read(p).toString('utf8');
const sha=p=>crypto.createHash('sha256').update(read(p)).digest('hex');

const schema=text('src/core/schema.js'),app=text('src/app.js'),html=text('index.html'),wrapper=text('src/game-terrain/terrain-workbench.js');
const manifest=JSON.parse(text('assets/game-terrain/runtime-sync-manifest.json'));
const map=JSON.parse(text('assets/game-terrain/forgerts_training_ground.json'));

assert.match(schema,/WORLDFORGE_VERSION = '0\.13\.22'/);
assert.match(schema,/gameTerrainWorkbench: '0\.2\.0'/);
assert.match(app,/GameTerrainWorkbench/);
assert.match(app,/activateGameTerrainMode/);
assert.match(app,/rebuildGameTerrain/);
assert.match(wrapper,/FORGERTS_TERRAIN_SOURCE_VERSION='0\.6\.6\.8'/);
assert.match(wrapper,/EXPERIMENTAL_TERRAIN_RENDERER_VERSION='0\.1\.0'/);
assert.match(wrapper,/ExperimentalTerrainRenderer/);
assert.ok(fs.existsSync(path.join(ROOT,'src/game-terrain/terrain-renderer-v2.js')));
for(const n of ['temperate_grass_normal.png','temperate_dirt_normal.png','temperate_rock_normal.png','road_asphalt_normal.png','road_shoulders_normal.png'])assert.ok(fs.existsSync(path.join(ROOT,'assets/terrain',n)));
for(const id of ['gameTerrainRendererCurrent','gameTerrainRendererExperimental','gameTerrainMacroVariation','gameTerrainNormalStrength','gameTerrainSurfaceContrast','gameTerrainDetailMix','gameTerrainCellMeters','gameTerrainPanel','gameTerrainRebuild','gameTerrainViewWide','gameTerrainViewClose','gameTerrainViewGround','gameTerrainViewTop','gameTerrainImport','gameTerrainExport','gameTerrainFile'])assert.match(html,new RegExp(`id="${id}"`));
for(const [p,meta] of Object.entries(manifest.files))assert.equal(sha(p),meta.sha256,`runtime sync hash mismatch: ${p}`);
assert.equal(manifest.files['src/game-terrain/terrain-sampler.js'].sha256,'d88d3456154a7759e078d1945e36e22714afe810171841a3d68f1f63b0b4b50a');
assert.equal(manifest.files['src/game-terrain/terrain-renderer.js'].sha256,'a8d560b49db1652ef5b306b96f66412cd4010480775d0e90e3f7c6d721754c1c');

const terrain=new TerrainSampler(map);
for(const [x,z] of [[0,0],[-150,-170],[120,40],[250,-20]]){
  const h=terrain.heightAt(x,z),s=terrain.slopeDeg(x,z),w=terrain.materialWeights(x,z);
  assert.ok(Number.isFinite(h)&&Number.isFinite(s));
  assert.ok(Math.abs((w.grass+w.dirt+w.rock)-1)<1e-6);
}
const ids=[...html.matchAll(/id="([^"]+)"/g)].map(x=>x[1]);
assert.equal(new Set(ids).size,ids.length,'duplicate DOM ids');
const refs=[...app.matchAll(/\$\('([^']+)'\)/g)].map(x=>x[1]);
const missing=[...new Set(refs.filter(x=>!ids.includes(x)))];
assert.deepEqual(missing,[],'app references missing DOM ids');
console.log(JSON.stringify({ok:true,worldforge:'0.13.22',terrainWorkbench:'0.2.0',forgertsSource:'0.6.6.8',runtimeSourceHashesVerified:true,experimentalRenderer:true,gameMapFormat:true},null,2));
