import assert from 'node:assert/strict';
import { FixedStepClock } from '../src/rts/sim/fixed-step-clock.js';
import { RTSSimulation, RTS_SIMULATION_VERSION, RTS_SNAPSHOT_SCHEMA } from '../src/rts/sim/rts-simulation.js';
import { COMMAND_SOURCES } from '../src/rts/sim/command-bus.js';
import { LOCOMOTORS, WEAPONS, UNIT_DEFINITIONS, BUILDING_DEFINITIONS } from '../src/rts/data/rts-definitions.js';
import { RTS_COMMANDS } from '../src/rts/sim/rts-commands.js';

const clock=new FixedStepClock({hz:30});let steps=0;clock.advance(1/60,()=>steps++);assert.equal(steps,0);clock.advance(1/60,()=>steps++);assert.equal(steps,1);assert.equal(clock.tick,1);assert.equal(clock.fixedDelta,1/30);

function buildRun(){
  const sim=new RTSSimulation({hz:30,seed:48127});const player=sim.createFaction('player',{credits:5000});const tank=sim.createEntity('unit',{transform:{x:0,y:0,z:0,heading:0},health:{current:1200,max:1200},input:{forward:false},locomotor:{...LOCOMOTORS.trackedHeavy},weapon:{id:WEAPONS.aegis120mm.id,cooldown:0}},'player');
  sim.onCommand('MOVE_TEST',(cmd)=>{const e=sim.entities.get(cmd.payload.entityId);e.components.input.forward=!!cmd.payload.on;});
  sim.addSystem('move',(dt)=>{const e=sim.entities.get(tank.id);if(e.components.input.forward)e.components.transform.x+=e.components.locomotor.maxSpeed*dt;});
  sim.issueCommand('MOVE_TEST',{entityId:tank.id,on:true},{source:COMMAND_SOURCES.PLAYER,delayTicks:1});
  for(let i=0;i<30;i++)sim.advance(1/30);
  return {sim,player,tank};
}
const a=buildRun(),b=buildRun();assert.equal(RTS_SIMULATION_VERSION,'0.1.0');assert.equal(a.tank.id,1);assert.equal(a.sim.clock.tick,30);assert.ok(a.tank.components.transform.x>17&&a.tank.components.transform.x<19);assert.equal(a.sim.stateHash(),b.sim.stateHash());assert.equal(a.sim.snapshot().schema,RTS_SNAPSHOT_SCHEMA);assert.equal(a.player.credits,5000);assert.deepEqual(a.sim.commands.recent(1)[0].type,'MOVE_TEST');

a.sim.setPaused(true);const pausedTick=a.sim.clock.tick;a.sim.advance(1);assert.equal(a.sim.clock.tick,pausedTick);a.sim.stepOnce();assert.equal(a.sim.clock.tick,pausedTick+1);

assert.equal(RTS_COMMANDS.MOVE,'MOVE');assert.equal(RTS_COMMANDS.BUILD,'BUILD');assert.equal(BUILDING_DEFINITIONS.vehicleFactory.category,'production');
assert.equal(UNIT_DEFINITIONS.aegisMbt.locomotor,'trackedHeavy');assert.equal(UNIT_DEFINITIONS.aegisHmmwv.locomotor,'wheeledLight');assert.equal(UNIT_DEFINITIONS.aegisTalon.locomotor,'helicopter');assert.equal(LOCOMOTORS.helicopter.movementClass,'air');assert.equal(WEAPONS.aegis120mm.muzzleSocket,'MuzzleSocket');
console.log(JSON.stringify({ok:true,simulation:RTS_SIMULATION_VERSION,tick:a.sim.clock.tick,hash:a.sim.stateHash(),unitDefs:Object.keys(UNIT_DEFINITIONS).length}));
