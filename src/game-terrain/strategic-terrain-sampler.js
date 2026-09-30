import { TerrainSampler } from './terrain-sampler.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const smoothstep=(a,b,x)=>{const t=clamp((x-a)/(b-a||1),0,1);return t*t*(3-2*t);};

function segNearest(px,pz,a,b){
  const vx=b.x-a.x,vz=b.z-a.z,wx=px-a.x,wz=pz-a.z,vv=vx*vx+vz*vz||1;
  const t=clamp((wx*vx+wz*vz)/vv,0,1),x=a.x+vx*t,z=a.z+vz*t;
  return {x,z,t,distance:Math.hypot(px-x,pz-z),length:Math.sqrt(vv)};
}

function preparePath(points=[]){
  const segs=[];let total=0;
  for(let i=0;i<points.length-1;i++){
    const a=points[i],b=points[i+1],length=Math.hypot(b.x-a.x,b.z-a.z);
    segs.push({a,b,length,start:total});total+=length;
  }
  return {points,segs,total:Math.max(total,1)};
}

function nearestPath(px,pz,path){
  let best=null;
  for(const s of path.segs){
    const n=segNearest(px,pz,s.a,s.b),along=s.start+n.t*s.length;
    if(!best||n.distance<best.distance)best={...n,along,total:path.total,ratio:along/path.total};
  }
  return best;
}

function ellipseBlend(x,z,item){
  const rx=Math.max(1,item.radiusX??item.radius??40),rz=Math.max(1,item.radiusZ??item.radius??40);
  const ang=(item.angleDeg??0)*Math.PI/180,c=Math.cos(ang),s=Math.sin(ang),dx=x-item.x,dz=z-item.z;
  const lx=dx*c+dz*s,lz=-dx*s+dz*c,q=Math.sqrt((lx*lx)/(rx*rx)+(lz*lz)/(rz*rz));
  const feather=Math.max(1,item.feather??Math.min(rx,rz)*.18),f=feather/Math.min(rx,rz);
  return 1-smoothstep(Math.max(0,1-f),1+f,q);
}

function ridgeContribution(x,z,item){
  const angle=(item.angleDeg??0)*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),dx=x-item.x,dz=z-item.z;
  const lx=dx*c+dz*s,lz=-dx*s+dz*c,length=Math.max(1,item.length??200),width=Math.max(1,item.width??50);
  const along=Math.abs(lx)/(length*.5),taper=1-smoothstep(.76,1.02,along);
  const cross=Math.exp(-Math.pow(Math.abs(lz)/(width*.52),2));
  let passFactor=1;
  for(const p of item.passes||[]){
    const d=Math.hypot(x-p.x,z-p.z),r=Math.max(1,p.radius??40),hole=(1-smoothstep(r*.30,r,d))*clamp(p.strength??1,0,1);
    passFactor*=1-hole;
  }
  return (item.height??0)*taper*cross*passFactor;
}

function rectProtection(x,z,item){
  const hw=Math.max(0,(item.width??0)*.5),hd=Math.max(0,(item.depth??0)*.5),dx=Math.max(Math.abs(x-(item.x??0))-hw,0),dz=Math.max(Math.abs(z-(item.z??0))-hd,0);
  if(dx===0&&dz===0)return 1;
  const feather=Math.max(0,item.feather??0);if(feather<=0)return 0;
  return 1-smoothstep(0,feather,Math.hypot(dx,dz));
}

export class StrategicTerrainSampler extends TerrainSampler{
  constructor(map){
    super(map);
    this.landforms=map.terrain?.landforms||{};
    this._valleys=(this.landforms.valleys||[]).map(v=>({...v,_path:preparePath(v.points||[])}));
    this._ramps=(this.landforms.ramps||[]).map(v=>({...v,_path:preparePath(v.points||[])}));
    this.expansion=this.landforms.expansion||{};
    this._expValleys=(this.expansion.valleys||[]).map(v=>({...v,_path:preparePath(v.points||[])}));
    this._expRamps=(this.expansion.ramps||[]).map(v=>({...v,_path:preparePath(v.points||[])}));
    this._protectedRects=map.world?.protectedRects||[];
  }

  protectionAt(x,z){
    let p=0;for(const r of this._protectedRects)p=Math.max(p,rectProtection(x,z,r));return p;
  }

  _nearestTyped(x,z,items,key,predicate=null){
    let best=null;
    for(const item of items||[]){
      if(predicate&&!predicate(item))continue;
      const pts=item.points||[];
      for(let i=0;i<pts.length-1;i++){
        const n=segNearest(x,z,pts[i],pts[i+1]);
        if(!best||n.distance<best.distance)best={...n,[key]:item,a:pts[i],b:pts[i+1]};
      }
    }
    return best;
  }

  _nearestRoad(x,z){return this._nearestTyped(x,z,this.map.roads||[],'road');}
  _nearestRiver(x,z){return this._nearestTyped(x,z,this.map.water?.rivers||[],'river');}

  heightAt(x,z){
    let h=this.rawHeightAt(x,z);

    // Apply legacy river/road grading exactly as before. Expansion-only infrastructure
    // is a second layer whose terrain deformation fades in outside protected rectangles.
    const legacyRiver=this._nearestTyped(x,z,this.map.water?.rivers||[],'river',r=>!r.expansionOnly);
    if(legacyRiver){
      const r=legacyRiver.river,half=(r.width??18)/2,bank=r.bankWidth??12;
      if(legacyRiver.distance<half+bank){
        const water=r.waterLevel??0,depth=r.depth??4,channel=water-depth,edgeT=smoothstep(half,half+bank,legacyRiver.distance),target=lerp(channel,h,edgeT);
        h=Math.min(h,target);
      }
    }
    const ew=1-this.protectionAt(x,z);
    if(ew>0){
      const expRiver=this._nearestTyped(x,z,this.map.water?.rivers||[],'river',r=>!!r.expansionOnly);
      if(expRiver){
        const r=expRiver.river,half=(r.width??18)/2,bank=r.bankWidth??12;
        if(expRiver.distance<half+bank){
          const water=r.waterLevel??0,depth=r.depth??4,channel=water-depth,edgeT=smoothstep(half,half+bank,expRiver.distance),target=Math.min(h,lerp(channel,h,edgeT));
          h=lerp(h,target,ew);
        }
      }
    }

    const legacyRoad=this._nearestTyped(x,z,this.map.roads||[],'road',r=>!r.expansionOnly);
    if(legacyRoad){
      const road=legacyRoad.road,half=(road.width??9)/2,shoulder=road.shoulderWidth??5;
      if(legacyRoad.distance<half+shoulder){
        const ah=this.rawHeightAt(legacyRoad.a.x,legacyRoad.a.z),bh=this.rawHeightAt(legacyRoad.b.x,legacyRoad.b.z),grade=lerp(ah,bh,legacyRoad.t)+(road.gradeOffset??0),edge=smoothstep(half,half+shoulder,legacyRoad.distance);
        h=lerp(grade,h,edge);
      }
    }
    if(ew>0){
      const expRoad=this._nearestTyped(x,z,this.map.roads||[],'road',r=>!!r.expansionOnly);
      if(expRoad){
        const road=expRoad.road,half=(road.width??9)/2,shoulder=road.shoulderWidth??5;
        if(expRoad.distance<half+shoulder){
          const ah=this.rawHeightAt(expRoad.a.x,expRoad.a.z),bh=this.rawHeightAt(expRoad.b.x,expRoad.b.z),grade=lerp(ah,bh,expRoad.t)+(road.gradeOffset??0),edge=smoothstep(half,half+shoulder,expRoad.distance),target=lerp(grade,h,edge);
          h=lerp(h,target,ew);
        }
      }
    }
    return h;
  }

  rawHeightAt(x,z){
    let h=super.rawHeightAt(x,z);

    // Original Iron Valley authored landforms. This block intentionally remains
    // behavior-compatible with v0.13.30 so the protected benchmark does not move.
    for(const ridge of this.landforms.ridges||[])h+=ridgeContribution(x,z,ridge);

    for(const valley of this._valleys){
      if(!valley._path.segs.length)continue;
      const hit=nearestPath(x,z,valley._path),half=Math.max(2,(valley.width??55)*.5),bank=Math.max(2,valley.bankWidth??30);
      if(hit.distance>=half+bank)continue;
      const w=1-smoothstep(half,half+bank,hit.distance),start=valley.startHeight??valley.floorHeight??0,end=valley.endHeight??start;
      const target=lerp(start,end,hit.ratio)+(valley.camber??0)*(1-clamp(hit.distance/half,0,1));
      h=lerp(h,target,w*clamp(valley.strength??.98,0,1));
    }

    for(const p of this.landforms.plateaus||[]){
      const w=ellipseBlend(x,z,p);if(w<=0)continue;
      h=lerp(h,p.height??h,w*clamp(p.strength??1,0,1));
    }

    for(const p of this.landforms.pads||[]){
      const w=ellipseBlend(x,z,p);if(w<=0)continue;
      h=lerp(h,p.height??h,w*clamp(p.strength??1,0,1));
    }

    for(const ramp of this._ramps){
      if(!ramp._path.segs.length)continue;
      const hit=nearestPath(x,z,ramp._path),half=Math.max(2,(ramp.width??24)*.5),shoulder=Math.max(2,ramp.shoulder??14);
      if(hit.distance>=half+shoulder)continue;
      const w=1-smoothstep(half,half+shoulder,hit.distance),target=lerp(ramp.startHeight??0,ramp.endHeight??0,hit.ratio);
      h=lerp(h,target,w*clamp(ramp.strength??1,0,1));
    }

    // Greater Iron Valley is an additive layer. Expansion influence is exactly zero
    // inside protected world rectangles and fades in outside them, so the current
    // 768x576 Iron Valley core remains an unchanged reference inside the larger world.
    if(!this.expansion||!Object.keys(this.expansion).length)return h;
    const ew=1-this.protectionAt(x,z);if(ew<=0)return h;

    for(const ridge of this.expansion.ridges||[])h+=ridgeContribution(x,z,ridge)*ew;

    for(const valley of this._expValleys){
      if(!valley._path.segs.length)continue;
      const hit=nearestPath(x,z,valley._path),half=Math.max(2,(valley.width??55)*.5),bank=Math.max(2,valley.bankWidth??30);
      if(hit.distance>=half+bank)continue;
      const w=(1-smoothstep(half,half+bank,hit.distance))*ew,start=valley.startHeight??valley.floorHeight??0,end=valley.endHeight??start;
      const target=lerp(start,end,hit.ratio)+(valley.camber??0)*(1-clamp(hit.distance/half,0,1));
      h=lerp(h,target,w*clamp(valley.strength??.98,0,1));
    }

    for(const p of this.expansion.plateaus||[]){
      const w=ellipseBlend(x,z,p)*ew;if(w<=0)continue;
      h=lerp(h,p.height??h,w*clamp(p.strength??1,0,1));
    }

    for(const p of this.expansion.pads||[]){
      const w=ellipseBlend(x,z,p)*ew;if(w<=0)continue;
      h=lerp(h,p.height??h,w*clamp(p.strength??1,0,1));
    }

    for(const ramp of this._expRamps){
      if(!ramp._path.segs.length)continue;
      const hit=nearestPath(x,z,ramp._path),half=Math.max(2,(ramp.width??24)*.5),shoulder=Math.max(2,ramp.shoulder??14);
      if(hit.distance>=half+shoulder)continue;
      const w=(1-smoothstep(half,half+shoulder,hit.distance))*ew,target=lerp(ramp.startHeight??0,ramp.endHeight??0,hit.ratio);
      h=lerp(h,target,w*clamp(ramp.strength??1,0,1));
    }
    return h;
  }
}
