export class FactionState{
  constructor(id,{credits=0,powerSupply=0,powerUse=0}={}){this.id=String(id);this.credits=credits;this.powerSupply=powerSupply;this.powerUse=powerUse;this.ownedEntityIds=new Set();}
  canAfford(amount){return this.credits>=Math.max(0,amount||0);}
  spend(amount){amount=Math.max(0,amount||0);if(!this.canAfford(amount))return false;this.credits-=amount;return true;}
  credit(amount){this.credits+=Math.max(0,amount||0);return this.credits;}
  addPower({supply=0,use=0}={}){this.powerSupply+=supply||0;this.powerUse+=use||0;}
  get powerNet(){return this.powerSupply-this.powerUse;}
  get powerFraction(){return this.powerUse<=0?1:Math.max(0,this.powerSupply/this.powerUse);}
  own(entityId){this.ownedEntityIds.add(Number(entityId));}
  disown(entityId){this.ownedEntityIds.delete(Number(entityId));}
  snapshot(){return {id:this.id,credits:this.credits,powerSupply:this.powerSupply,powerUse:this.powerUse,powerNet:this.powerNet,powerFraction:this.powerFraction,ownedEntityIds:[...this.ownedEntityIds].sort((a,b)=>a-b)};}
}
