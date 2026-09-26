const deepClone=value=>value==null?value:JSON.parse(JSON.stringify(value));

export class EntityStore{
  constructor(){this.reset();}
  reset(){this.nextId=1;this.entities=new Map();}
  create(kind,components={}){
    const id=this.nextId++;
    const entity={id,kind:String(kind||'entity'),alive:true,components:deepClone(components)};
    this.entities.set(id,entity);
    return entity;
  }
  get(id){return this.entities.get(Number(id))||null;}
  has(id){return this.entities.has(Number(id));}
  destroy(id){const e=this.get(id);if(!e)return false;e.alive=false;this.entities.delete(e.id);return true;}
  values(){return [...this.entities.values()];}
  count(){return this.entities.size;}
  snapshot(){return this.values().sort((a,b)=>a.id-b.id).map(deepClone);}
}
