import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { TerrainSampler } from '../src/game-terrain/terrain-sampler.js';
import { TerrainSurfaceGenerator } from '../src/game-terrain/terrain-surface-generator.js';

const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const read=p=>fs.readFileSync(path.join(ROOT,p));
const text=p=>read(p).toString('utf8');
const sha=p=>crypto.createHash('sha256').update(read(p)).digest('hex');

const schema=text('src/core/schema.js'),app=text('src/app.js'),html=text('index.html'),wrapper=text('src/game-terrain/terrain-workbench.js'),v3=text('src/game-terrain/terrain-renderer-v4.js');
const manifest=JSON.parse(text('assets/game-terrain/runtime-sync-manifest.json'));
const map=JSON.parse(text('assets/game-terrain/forgerts_training_ground.json'));

assert.match(schema,/WORLDFORGE_VERSION = '0\.13\.24'/);
assert.match(schema,/gameTerrainWorkbench: '0\.4\.0'/);
assert.match(wrapper,/GAME_TERRAIN_WORKBENCH_VERSION='0\.4\.0'/);
assert.match(wrapper,/FORGERTS_TERRAIN_SOURCE_VERSION='0\.6\.6\.8'/);
assert.match(wrapper,/EXPERIMENTAL_TERRAIN_RENDERER_VERSION='0\.3\.0'/);
assert.match(wrapper,/TerrainRendererV4/);
assert.match(v3,/TerrainSurfaceGenerator/);
assert.match(v3,/uSplat/);
assert.match(v3,/uMacro/);
assert.match(v3,/uWet/);
assert.match(v3,/triNormal/);
assert.ok(fs.existsSync(path.join(ROOT,'assets/terrain/temperate_wetbank.png')));
assert.ok(fs.existsSync(path.join(ROOT,'assets/terrain/temperate_wetbank_normal.png')));
for(const f of ['grass_ground_diff_1k.jpg','grass_ground_nor_gl_1k.png','grass_ground_arm_1k.jpg','brown_mud_leaves_01_diff_1k.jpg','brown_mud_leaves_01_nor_gl_1k.png','brown_mud_leaves_01_arm_1k.jpg','rocks_ground_02_col_1k.jpg','rocks_ground_02_nor_gl_1k.png','rocks_ground_02_arm_1k.jpg','dry_river_pebbles_diff_1k.jpg','dry_river_pebbles_nor_gl_1k.png','dry_river_pebbles_arm_1k.jpg','rocky_terrain_02_diff_1k.jpg'])assert.ok(fs.existsSync(path.join(ROOT,'assets/terrain/polyhaven',f)),f);
assert.match(v3,/uGrassARM/);assert.match(v3,/uHemiIntensity/);assert.match(v3,/rocky_terrain_02_diff_1k/);


for(const id of ['gameTerrainRendererCurrent','gameTerrainRendererExperimental','gameTerrainMacroVariation','gameTerrainNormalStrength','gameTerrainSurfaceContrast','gameTerrainBlendDetail','gameTerrainRoadBlend','gameTerrainBankWetness','gameTerrainSplatCell','gameTerrainMacroCell','gameTerrainCellMeters','gameTerrainPanel','gameTerrainRebuild','gameTerrainViewWide','gameTerrainViewClose','gameTerrainViewGround','gameTerrainViewTop','gameTerrainImport','gameTerrainExport','gameTerrainFile'])assert.match(html,new RegExp(`id="${id}"`));
for(const [p,meta] of Object.entries(manifest.files))assert.equal(sha(p),meta.sha256,`runtime sync hash mismatch: ${p}`);
assert.equal(manifest.files['src/game-terrain/terrain-sampler.js'].sha256,'d88d3456154a7759e078d1945e36e22714afe810171841a3d68f1f63b0b4b50a');
assert.equal(manifest.files['src/game-terrain/terrain-renderer.js'].sha256,'a8d560b49db1652ef5b306b96f66412cd4010480775d0e90e3f7c6d721754c1c');

map.terrain.visual={splatCellMeters:2.0,macroCellMeters:8,roadBlendMeters:8,bankWetness:.82};
const terrain=new TerrainSampler(map),surface=new TerrainSurfaceGenerator(map,terrain);
const splat=surface.buildSplat(),macro=surface.buildMacro();
assert.deepEqual([splat.width,splat.height],[320,240]);
assert.deepEqual([macro.width,macro.height],[80,60]);
assert.equal(splat.data.length,320*240*4);
assert.equal(macro.data.length,80*60*4);
for(const [x,z] of [[0,0],[-205,-35],[0,132],[-145,-176]]){
  const s=surface.sample(x,z),sum=s.grass+s.dirt+s.rock+s.wet;
  assert.ok(Math.abs(sum-1)<1e-6);
  assert.ok(Object.values(s).every(Number.isFinite));
}
assert.ok(surface.sample(-205,-35).dirt>.9,'road core should paint compacted/dirt channel');
assert.ok(surface.sample(0,132).wet>.5,'river edge should paint wet-bank channel');

const ids=[...html.matchAll(/id="([^"]+)"/g)].map(x=>x[1]);
assert.equal(new Set(ids).size,ids.length,'duplicate DOM ids');
const refs=[...app.matchAll(/\$\('([^']+)'\)/g)].map(x=>x[1]);
const missing=[...new Set(refs.filter(x=>!ids.includes(x)))];
assert.deepEqual(missing,[],'app references missing DOM ids');
console.log(JSON.stringify({ok:true,worldforge:'0.13.24',terrainWorkbench:'0.4.0',forgertsSource:'0.6.6.8',runtimeSourceHashesVerified:true,pbrV4:true,splat:[splat.width,splat.height],macro:[macro.width,macro.height]},null,2));
