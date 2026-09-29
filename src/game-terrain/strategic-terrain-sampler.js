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

export class StrategicTerrainSampler extends TerrainSampler{
  constructor(map){
    super(map);
    this.landforms=map.terrain?.landforms||{};
    this._valleys=(this.landforms.valleys||[]).map(v=>({...v,_path:preparePath(v.points||[])}));
    this._ramps=(this.landforms.ramps||[]).map(v=>({...v,_path:preparePath(v.points||[])}));
  }

  rawHeightAt(x,z){
    let h=super.rawHeightAt(x,z);

    // Long mountain masses first. They form the large composition, then playable
    // authored shelves/valleys overwrite them where required.
    for(const ridge of this.landforms.ridges||[])h+=ridgeContribution(x,z,ridge);

    // Carve broad valley floors before terraces and ramps. These are intentional
    // strategic corridors, not random noise depressions.
    for(const valley of this._valleys){
      if(!valley._path.segs.length)continue;
      const hit=nearestPath(x,z,valley._path),half=Math.max(2,(valley.width??55)*.5),bank=Math.max(2,valley.bankWidth??30);
      if(hit.distance>=half+bank)continue;
      const w=1-smoothstep(half,half+bank,hit.distance),start=valley.startHeight??valley.floorHeight??0,end=valley.endHeight??start;
      const target=lerp(start,end,hit.ratio)+(valley.camber??0)*(1-clamp(hit.distance/half,0,1));
      h=lerp(h,target,w*clamp(valley.strength??.98,0,1));
    }

    // Plateaus/terraces create the unmistakable C&C elevated flat combat shelves.
    for(const p of this.landforms.plateaus||[]){
      const w=ellipseBlend(x,z,p);if(w<=0)continue;
      h=lerp(h,p.height??h,w*clamp(p.strength??1,0,1));
    }

    // Base pads are deliberately flatter and slightly wider than structures so
    // production buildings/vehicle exits always sit on stable ground.
    for(const p of this.landforms.pads||[]){
      const w=ellipseBlend(x,z,p);if(w<=0)continue;
      h=lerp(h,p.height??h,w*clamp(p.strength??1,0,1));
    }

    // Ramps are last in authored landforms. Their linear grade cuts cleanly through
    // plateau/cliff edges and guarantees a driveable connection between elevations.
    for(const ramp of this._ramps){
      if(!ramp._path.segs.length)continue;
      const hit=nearestPath(x,z,ramp._path),half=Math.max(2,(ramp.width??24)*.5),shoulder=Math.max(2,ramp.shoulder??14);
      if(hit.distance>=half+shoulder)continue;
      const w=1-smoothstep(half,half+shoulder,hit.distance),target=lerp(ramp.startHeight??0,ramp.endHeight??0,hit.ratio);
      h=lerp(h,target,w*clamp(ramp.strength??1,0,1));
    }
    return h;
  }
}
