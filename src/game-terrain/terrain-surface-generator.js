const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const smoothstep=(a,b,x)=>{const t=clamp((x-a)/(b-a||1),0,1);return t*t*(3-2*t);};

function hash2(seed,x,z){
  let h=(seed|0)^Math.imul((x|0),0x45d9f3b)^Math.imul((z|0),0x27d4eb2d);
  h=Math.imul(h^(h>>>16),0x45d9f3b);h=Math.imul(h^(h>>>16),0x45d9f3b);h^=h>>>16;
  return (h>>>0)/4294967295;
}
function valueNoise(seed,x,z,scale){
  const fx=x/scale,fz=z/scale,x0=Math.floor(fx),z0=Math.floor(fz),tx=fx-x0,tz=fz-z0;
  const sx=tx*tx*(3-2*tx),sz=tz*tz*(3-2*tz);
  const a=hash2(seed,x0,z0),b=hash2(seed,x0+1,z0),c=hash2(seed,x0,z0+1),d=hash2(seed,x0+1,z0+1);
  return lerp(lerp(a,b,sx),lerp(c,d,sx),sz)*2-1;
}
function fbm(seed,x,z,scale,octaves=3,persistence=.5){
  let sum=0,norm=0,a=1,s=scale;
  for(let i=0;i<octaves;i++){sum+=valueNoise(seed+i*127,x,z,s)*a;norm+=a;a*=persistence;s*=.5;}
  return norm?sum/norm:0;
}
function segNearest(px,pz,a,b){
  const vx=b.x-a.x,vz=b.z-a.z,wx=px-a.x,wz=pz-a.z,vv=vx*vx+vz*vz||1,t=clamp((wx*vx+wz*vz)/vv,0,1);
  const x=a.x+vx*t,z=a.z+vz*t;return {x,z,t,distance:Math.hypot(px-x,pz-z)};
}
function nearestFeature(x,z,items=[]){
  let best=null;
  for(const item of items){
    const pts=item.points||[];
    for(let i=0;i<pts.length-1;i++){
      const n=segNearest(x,z,pts[i],pts[i+1]);
      if(!best||n.distance<best.distance)best={...n,item};
    }
  }
  return best;
}
function byte(v){return Math.round(clamp(v,0,1)*255);}

export class TerrainSurfaceGenerator{
  constructor(map,terrain){this.map=map;this.terrain=terrain;this.seed=map.seed??1;this.visual=map.terrain?.visual||{};}

  _road(x,z){return nearestFeature(x,z,this.map.roads||[]);}
  _river(x,z){return nearestFeature(x,z,this.map.water?.rivers||[]);}

  sample(x,z){
    const cliff=this.map.terrain?.cliffs||{};
    const slope=this.terrain.slopeDeg(x,z,2.5);
    const rockBase=smoothstep(cliff.slopeStartDeg??23,cliff.slopeFullDeg??36,slope);

    const roadHit=this._road(x,z);
    let road=0,roadCore=0;
    if(roadHit){
      const r=roadHit.item,half=(r.width??8)*.5,shoulder=r.shoulderWidth??4,blend=this.visual.roadBlendMeters??8;
      road=1-smoothstep(half+shoulder*.35,half+shoulder+blend,roadHit.distance);
      roadCore=1-smoothstep(Math.max(0,half-1.0),half+1.4,roadHit.distance);
    }

    const riverHit=this._river(x,z);
    let wet=0,riverSoil=0,moisture=0;
    if(riverHit){
      const r=riverHit.item,half=(r.width??18)*.5,bank=r.bankWidth??12,wetness=this.visual.bankWetness??.82;
      moisture=1-smoothstep(half+bank*.25,half+bank*3.6,riverHit.distance);
      wet=(1-smoothstep(half+.5,half+bank*.78,riverHit.distance))*wetness;
      riverSoil=(1-smoothstep(half+bank*.40,half+bank*1.65,riverHit.distance))*(1-wet*.72);
    }

    const broad=fbm(this.seed+8101,x,z,92,3,.55)*.5+.5;
    const medium=fbm(this.seed+1907,x,z,34,3,.52)*.5+.5;
    const exposure=fbm(this.seed+4409,x,z,170,2,.55)*.5+.5;

    let rock=clamp(rockBase*(.88+medium*.20),0,1);
    const dryBare=smoothstep(.57,.86,medium*.58+exposure*.42)*(1-moisture*.55);
    let dirt=clamp(.025 + dryBare*.50 + Math.max(0,exposure-.60)*.18,0,.58);
    dirt=clamp(dirt + road*.86 + riverSoil*.54,0,1);
    wet=clamp(wet*(1-rock*.88),0,1);
    rock=clamp(rock*(1-roadCore*.72)*(1-wet*.55),0,1);

    // Roads and wet banks deliberately suppress grass, while broad noise only
    // breaks up the remaining natural cover instead of choosing the material alone.
    let grass=clamp(1-dirt-rock-wet,0,1);
    grass*=clamp(.94+(broad-.5)*.20+moisture*.16-road*.42-riverSoil*.20,.18,1.10);
    dirt=clamp(dirt + (1-grass-rock-wet)*.22,0,1);

    const sum=grass+dirt+rock+wet||1;
    return {grass:grass/sum,dirt:dirt/sum,rock:rock/sum,wet:wet/sum,road,roadCore,moisture,slope};
  }

  macroTint(x,z){
    const dry=fbm(this.seed+3109,x,z,145,3,.56)*.5+.5;
    const lush=fbm(this.seed+7717,x,z,88,3,.53)*.5+.5;
    const low=fbm(this.seed+1223,x,z,210,2,.58)*.5+.5;
    const s=this.sample(x,z),m=s.moisture;
    // Neutral multiplier is 1.0. This creates coherent green/dry/cool regions
    // without shader sine waves or per-triangle color shifts.
    let r=1+(dry-.5)*.085-(lush-.5)*.045-m*.030+(low-.5)*.018;
    let g=1-(dry-.5)*.050+(lush-.5)*.080+m*.018+(low-.5)*.012;
    let b=1-(dry-.5)*.080+(lush-.5)*.024+m*.040-(low-.5)*.010;
    return [clamp(r,.76,1.24),clamp(g,.76,1.24),clamp(b,.76,1.24),clamp(m,0,1)];
  }

  buildSplat(cellMeters=this.visual.splatCellMeters??2.5){
    const w=this.map.size.width,d=this.map.size.depth,cols=Math.max(2,Math.ceil(w/cellMeters)),rows=Math.max(2,Math.ceil(d/cellMeters));
    const data=new Uint8Array(cols*rows*4);
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
      const x=-w*.5+(i+.5)/cols*w,z=-d*.5+(j+.5)/rows*d,s=this.sample(x,z),k=(j*cols+i)*4;
      data[k]=byte(s.grass);data[k+1]=byte(s.dirt);data[k+2]=byte(s.rock);data[k+3]=byte(s.wet);
    }
    return {width:cols,height:rows,data,cellMeters};
  }

  buildMacro(cellMeters=this.visual.macroCellMeters??8){
    const w=this.map.size.width,d=this.map.size.depth,cols=Math.max(2,Math.ceil(w/cellMeters)),rows=Math.max(2,Math.ceil(d/cellMeters));
    const data=new Uint8Array(cols*rows*4),lo=.72,hi=1.28;
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
      const x=-w*.5+(i+.5)/cols*w,z=-d*.5+(j+.5)/rows*d,t=this.macroTint(x,z),k=(j*cols+i)*4;
      data[k]=byte((t[0]-lo)/(hi-lo));data[k+1]=byte((t[1]-lo)/(hi-lo));data[k+2]=byte((t[2]-lo)/(hi-lo));data[k+3]=byte(t[3]);
    }
    return {width:cols,height:rows,data,cellMeters,decodeMin:lo,decodeMax:hi};
  }
}
