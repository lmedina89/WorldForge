export const COMMAND_SOURCES=Object.freeze({PLAYER:'player',AI:'ai',SCRIPT:'script',SYSTEM:'system'});

const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));

export class CommandBus{
  constructor({maxLog=96}={}){this.maxLog=maxLog;this.reset();}
  reset(){this.nextSequence=1;this.queue=[];this.log=[];}
  enqueue(type,payload={}, {source=COMMAND_SOURCES.PLAYER,executeTick=0}={}){
    const command={sequence:this.nextSequence++,type:String(type),source:String(source),executeTick:Math.max(0,executeTick|0),payload:clone(payload)};
    this.queue.push(command);
    this.queue.sort((a,b)=>a.executeTick-b.executeTick||a.sequence-b.sequence);
    return command;
  }
  drain(tick){
    const ready=[];let i=0;
    while(i<this.queue.length&&this.queue[i].executeTick<=tick){ready.push(this.queue[i]);i++;}
    if(i)this.queue.splice(0,i);
    for(const c of ready){this.log.push({...clone(c),executedTick:tick});if(this.log.length>this.maxLog)this.log.shift();}
    return ready;
  }
  recent(limit=8){return this.log.slice(-Math.max(0,limit|0)).map(clone);}
  pending(){return this.queue.map(clone);}
}
