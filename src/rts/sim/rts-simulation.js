import { FixedStepClock, DEFAULT_SIM_HZ } from './fixed-step-clock.js';
import { EntityStore } from './entity-store.js';
import { CommandBus, COMMAND_SOURCES } from './command-bus.js';
import { FactionState } from './faction-state.js';
import { rngFromSeed } from '../../core/rng.js';

export const RTS_SIMULATION_VERSION='0.1.0';
export const RTS_SNAPSHOT_SCHEMA='worldforge.rts-snapshot.v1';

function stableStringify(value){
  if(value===null||typeof value!=='object')return JSON.stringify(value);
  if(Array.isArray(value))return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}
function fnv1a(text){let h=0x811c9dc5;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,0x01000193);}return (h>>>0).toString(16).padStart(8,'0');}

export class RTSSimulation{
  constructor({hz=DEFAULT_SIM_HZ,seed=1}={}){
    this.clock=new FixedStepClock({hz});this.entities=new EntityStore();this.commands=new CommandBus();this.factions=new Map();this.commandHandlers=new Map();this.systems=[];this.seed=seed|0;this.random=rngFromSeed(this.seed);this.lastExecutedCommands=[];
  }
  reset({seed=this.seed}={}){this.seed=seed|0;this.random=rngFromSeed(this.seed);this.clock.reset();this.entities.reset();this.commands.reset();this.factions.clear();this.lastExecutedCommands=[];}
  createFaction(id,options={}){const f=new FactionState(id,options);this.factions.set(String(id),f);return f;}
  getFaction(id){return this.factions.get(String(id))||null;}
  createEntity(kind,components={},ownerId=null){const e=this.entities.create(kind,components);if(ownerId!=null)this.getFaction(ownerId)?.own(e.id);return e;}
  destroyEntity(id){for(const f of this.factions.values())f.disown(id);return this.entities.destroy(id);}
  onCommand(type,handler){this.commandHandlers.set(String(type),handler);return this;}
  addSystem(name,update,{priority=0}={}){this.systems.push({name:String(name),priority,update});this.systems.sort((a,b)=>a.priority-b.priority||a.name.localeCompare(b.name));return this;}
  issueCommand(type,payload={}, {source=COMMAND_SOURCES.PLAYER,delayTicks=1}={}){return this.commands.enqueue(type,payload,{source,executeTick:this.clock.tick+Math.max(0,delayTicks|0)});}
  _step(dt,tick){
    this.lastExecutedCommands=this.commands.drain(tick);
    for(const command of this.lastExecutedCommands)this.commandHandlers.get(command.type)?.(command,this);
    for(const system of this.systems)system.update(dt,tick,this);
  }
  advance(realDt){return this.clock.advance(realDt,(dt,tick)=>this._step(dt,tick));}
  stepOnce(){return this.clock.stepOnce((dt,tick)=>this._step(dt,tick));}
  setPaused(paused){this.clock.setPaused(paused);}
  get paused(){return this.clock.paused;}
  snapshot(){
    return {schema:RTS_SNAPSHOT_SCHEMA,simulationVersion:RTS_SIMULATION_VERSION,seed:this.seed,tick:this.clock.tick,hz:this.clock.hz,factions:[...this.factions.values()].sort((a,b)=>a.id.localeCompare(b.id)).map(f=>f.snapshot()),entities:this.entities.snapshot(),pendingCommands:this.commands.pending()};
  }
  stateHash(){return fnv1a(stableStringify(this.snapshot()));}
}
