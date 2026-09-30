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
function nearestFeature(x,z,items=[],predicate=null){
  let best=null;
  for(const item of items){
    if(predicate&&!predicate(item))continue;
    const pts=item.points||[];
    for(let i=0;i<pts.length-1;i++){
      const n=segNearest(x,z,pts[i],pts[i+1]);
      if(!best||n.distance<best.distance)best={...n,item};
    }
  }
  return best;
}
function byte(v){return Math.round(clamp(v,0,1)*255);}
function rectProtection(x,z,item){
  const hw=Math.max(0,(item.width??0)*.5),hd=Math.max(0,(item.depth??0)*.5),dx=Math.max(Math.abs(x-(item.x??0))-hw,0),dz=Math.max(Math.abs(z-(item.z??0))-hd,0);
  if(dx===0&&dz===0)return 1;
  const feather=Math.max(0,item.feather??0);if(feather<=0)return 0;
  return 1-smoothstep(0,feather,Math.hypot(dx,dz));
}
function ellipseZoneWeight(seed,x,z,zone,index){
  const rx=Math.max(1,zone.radiusX??zone.radius??100),rz=Math.max(1,zone.radiusZ??zone.radius??100),dx=x-(zone.x??0),dz=z-(zone.z??0);
  let q=Math.sqrt((dx*dx)/(rx*rx)+(dz*dz)/(rz*rz));
  const feather=Math.max(1,zone.feather??Math.min(rx,rz)*.22),f=feather/Math.min(rx,rz),noise=fbm(seed+9301+index*211,x,z,175,3,.56);
  q+=noise*(zone.edgeNoise??.25)*f*1.35;
  return 1-smoothstep(Math.max(0,1-f),1+f,q);
}

export class TerrainSurfaceGenerator{
  constructor(map,terrain){this.map=map;this.terrain=terrain;this.seed=map.seed??1;this.visual=map.terrain?.visual||{};this.biomeZones=map.terrain?.biomeZones||[];this.protectedRects=map.world?.protectedRects||[];}

  _protection(x,z){let p=0;for(const r of this.protectedRects)p=Math.max(p,rectProtection(x,z,r));return p;}
  _featureAllowed(item,x,z){return !(item?.expansionOnly&&this._protection(x,z)>=.999999);}
  _road(x,z){return nearestFeature(x,z,this.map.roads||[],item=>this._featureAllowed(item,x,z));}
  _river(x,z){return nearestFeature(x,z,this.map.water?.rivers||[],item=>this._featureAllowed(item,x,z));}

  _biome(x,z){
    if(!this.biomeZones.length)return null;
    const outside=1-this._protection(x,z);if(outside<=0)return null;
    let sw=0,grass=0,dirt=0,rock=0,wet=0,tr=0,tg=0,tb=0;
    for(let i=0;i<this.biomeZones.length;i++){
      const zone=this.biomeZones[i],w=ellipseZoneWeight(this.seed,x,z,zone,i)*outside;if(w<=.0001)continue;
      const b=zone.materialBias||{},t=zone.macroTint||[1,1,1];sw+=w;
      grass+=w*(b.grass??0);dirt+=w*(b.dirt??0);rock+=w*(b.rock??0);wet+=w*(b.wet??0);
      tr+=w*((t[0]??1)-1);tg+=w*((t[1]??1)-1);tb+=w*((t[2]??1)-1);
    }
    if(sw<=.0001)return null;
    const norm=sw>1?1/sw:1;
    return {grass:grass*norm,dirt:dirt*norm,rock:rock*norm,wet:wet*norm,tint:[1+tr*norm,1+tg*norm,1+tb*norm],weight:clamp(sw,0,1)};
  }

  sample(x,z){
    const cliff=this.map.terrain?.cliffs||{};
    const slope=this.terrain.slopeDeg(x,z,2.5);
    const rockBase=smoothstep(cliff.slopeStartDeg??23,cliff.slopeFullDeg??36,slope);

    const roadHit=this._road(x,z);
    let road=0,roadCore=0;
    if(roadHit){
      const r=roadHit.item,half=(r.width??8)*.5,shoulder=r.shoulderWidth??4,blend=this.visual.roadBlendMeters??8;
      const fw=roadHit.item.expansionOnly?1-this._protection(x,z):1;
      road=(1-smoothstep(half+shoulder*.20,half+shoulder+blend*.55,roadHit.distance))*fw;
      roadCore=(1-smoothstep(Math.max(0,half-1.0),half+1.4,roadHit.distance))*fw;
    }

    const riverHit=this._river(x,z);
    let wet=0,riverSoil=0,moisture=0;
    if(riverHit){
      const r=riverHit.item,half=(r.width??18)*.5,bank=r.bankWidth??12,wetness=this.visual.bankWetness??.82;
      const fw=riverHit.item.expansionOnly?1-this._protection(x,z):1;
      moisture=(1-smoothstep(half+bank*.25,half+bank*3.6,riverHit.distance))*fw;
      wet=(1-smoothstep(half+.5,half+bank*.78,riverHit.distance))*wetness*fw;
      riverSoil=(1-smoothstep(half+bank*.40,half+bank*1.65,riverHit.distance))*(1-wet*.72)*fw;
    }

    const broad=fbm(this.seed+8101,x,z,92,3,.55)*.5+.5;
    const medium=fbm(this.seed+1907,x,z,34,3,.52)*.5+.5;
    const exposure=fbm(this.seed+4409,x,z,170,2,.55)*.5+.5;

    let rock=clamp(rockBase*(.88+medium*.20),0,1);
    const dryBare=smoothstep(.57,.86,medium*.58+exposure*.42)*(1-moisture*.55);
    let dirt=clamp(.018 + dryBare*.28 + Math.max(0,exposure-.64)*.12,0,.46);
    dirt=clamp(dirt + road*.72 + riverSoil*.48,0,1);
    wet=clamp(wet*(1-rock*.88),0,1);
    rock=clamp(rock*(1-roadCore*.72)*(1-wet*.55),0,1);

    // Roads and wet banks deliberately suppress grass, while broad noise only
    // breaks up the remaining natural cover instead of choosing the material alone.
    let grass=clamp(1-dirt-rock-wet,0,1);
    grass*=clamp(1.00+(broad-.5)*.16+moisture*.18-road*.40-riverSoil*.16,.22,1.12);
    dirt=clamp(dirt + (1-grass-rock-wet)*.22,0,1);

    // Greater Iron Valley biome masks only bias the same four V8/V9 source materials.
    // Feature transitions still win: roads and wet banks are never painted back over.
    const bio=this._biome(x,z);
    if(bio){
      const natural=clamp(1-road*.92-wet*.72,0,1);
      grass=Math.max(0,grass+bio.grass*natural);dirt=Math.max(0,dirt+bio.dirt*natural);rock=Math.max(0,rock+bio.rock*natural);wet=Math.max(0,wet+bio.wet*natural);
    }

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
    const bio=this._biome(x,z);if(bio){r*=bio.tint[0];g*=bio.tint[1];b*=bio.tint[2];}
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
