import assert from 'node:assert/strict';
import fs from 'node:fs';
import { StrategicTerrainSampler } from '../src/game-terrain/strategic-terrain-sampler.js';

const map=JSON.parse(fs.readFileSync(new URL('../assets/game-terrain/worldforge_curated_battlefield.json',import.meta.url),'utf8'));
assert.equal(map.id,'worldforge_curated_battlefield');
assert.equal(map.terrain.landforms.profile,'curated-strategic-battlefield-v1');
assert.ok(map.terrain.landforms.plateaus.length>=7);
assert.ok(map.terrain.landforms.ramps.length>=8);
assert.ok(map.terrain.landforms.valleys.length>=3);
assert.ok(map.terrain.landforms.ridges.length>=4);
assert.ok(map.roads.length>=6);

const terrain=new StrategicTerrainSampler(map);
const sampleRoute=(route,step=8)=>{
  let max=0;
  for(let i=0;i<route.points.length-1;i++){
    const a=route.points[i],b=route.points[i+1],L=Math.hypot(b.x-a.x,b.z-a.z),n=Math.max(1,Math.ceil(L/step));
    for(let j=0;j<=n;j++){
      const q=j/n,x=a.x+(b.x-a.x)*q,z=a.z+(b.z-a.z)*q;
      max=Math.max(max,terrain.slopeDeg(x,z,4));
    }
  }
  return max;
};
const routeAudit=[];
for(const r of map.navigation.validationRoutes){
  const maxSlope=sampleRoute(r);
  routeAudit.push({id:r.id,maxSlope:+maxSlope.toFixed(2),limit:r.maxSlopeDeg});
  assert.ok(maxSlope<=r.maxSlopeDeg,`${r.id} max slope ${maxSlope.toFixed(2)} exceeds ${r.maxSlopeDeg}`);
}

// Key shelves should read as meaningful elevation tiers.
const westHigh=terrain.heightAt(-300,-55),westMid=terrain.heightAt(-205,5),valley=terrain.heightAt(0,44),mesa=terrain.heightAt(0,-112);
assert.ok(westHigh>24 && westHigh<30,`west base shelf ${westHigh}`);
assert.ok(westMid>14 && westMid<20,`west mid terrace ${westMid}`);
assert.ok(valley<10,`main valley ${valley}`);
assert.ok(mesa>29 && mesa<35,`central mesa ${mesa}`);
assert.ok(mesa-westMid>10,'mesa must materially exceed mid terrace');
assert.ok(westMid-valley>5,'mid terrace must materially exceed valley');

console.log(JSON.stringify({ok:true,worldforge:'0.13.27',terrainWorkbench:'0.7.0',showcase:map.name,routeAudit,tiers:{westHigh:+westHigh.toFixed(2),westMid:+westMid.toFixed(2),valley:+valley.toFixed(2),mesa:+mesa.toFixed(2)}},null,2));
