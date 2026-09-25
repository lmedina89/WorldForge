function finite(v, fallback=0){ const n=Number(v); return Number.isFinite(n)?n:fallback; }

export function snapScalar(value, step=0.25){
  step=Math.max(0.0001,Math.abs(finite(step,0.25)));
  return Math.round(finite(value,0)/step)*step;
}

export function snapRotationRadians(value, degrees=15){
  const step=Math.max(1,Math.abs(finite(degrees,15)))*Math.PI/180;
  return Math.round(finite(value,0)/step)*step;
}

export function nearestLevel(value, levels=[0]){
  const z=finite(value,0), valid=(levels||[]).map(v=>finite(v,NaN)).filter(Number.isFinite);
  if(!valid.length)return 0;
  return valid.reduce((best,v)=>Math.abs(v-z)<Math.abs(best-z)?v:best,valid[0]);
}

export function placementAabb(record){
  if(!record)return {minX:0,maxX:0,minY:0,maxY:0,width:0,depth:0};
  const fp=record.asset?.footprint||record.footprint||{width:1,depth:1};
  const a=finite(record.rotation,0), c=Math.abs(Math.cos(a)), s=Math.abs(Math.sin(a)), sc=Math.max(.0001,Math.abs(finite(record.scale,1)));
  const fw=Math.max(.01,finite(fp.width,1)), fd=Math.max(.01,finite(fp.depth,1));
  const width=(fw*c+fd*s)*sc, depth=(fw*s+fd*c)*sc;
  const p=record.position||[0,0,0], x=finite(p[0],0), y=finite(p[1],0);
  return {minX:x-width/2,maxX:x+width/2,minY:y-depth/2,maxY:y+depth/2,width,depth};
}

export function snapPlacementToGrid(placement, step=0.25){
  const p=[...(placement.position||[0,0,0])];
  p[0]=snapScalar(p[0],step); p[1]=snapScalar(p[1],step);
  return {...placement,position:p};
}

export function snapPlacementToLevel(placement, levels=[0]){
  const p=[...(placement.position||[0,0,0])];
  p[2]=nearestLevel(p[2],levels);
  return {...placement,position:p};
}

export function nearestEdgeAdjustment(selectedRecord, otherRecords=[], gap=0){
  if(!selectedRecord)return null;
  const a=placementAabb(selectedRecord), sx=(a.minX+a.maxX)/2, sy=(a.minY+a.maxY)/2;
  let best=null;
  for(const r of otherRecords){
    if(!r||r.id===selectedRecord.id||r.selectable===false||r.recipe?.type==='surface')continue;
    const b=placementAabb(r), tx=(b.minX+b.maxX)/2, ty=(b.minY+b.maxY)/2;
    const centerDist=Math.hypot(tx-sx,ty-sy);
    const candidates=[
      {axis:'x',delta:(b.minX-gap)-a.maxX,label:'right→left'},
      {axis:'x',delta:(b.maxX+gap)-a.minX,label:'left→right'},
      {axis:'y',delta:(b.minY-gap)-a.maxY,label:'top→bottom'},
      {axis:'y',delta:(b.maxY+gap)-a.minY,label:'bottom→top'}
    ];
    for(const c of candidates){
      const score=Math.abs(c.delta)+centerDist*.08;
      if(!best||score<best.score)best={...c,score,targetId:r.id,targetLabel:r.label||r.id};
    }
  }
  return best;
}

export function applyEdgeAdjustment(placement, adjustment){
  if(!adjustment)return placement;
  const p=[...(placement.position||[0,0,0])];
  if(adjustment.axis==='x')p[0]+=adjustment.delta;
  else p[1]+=adjustment.delta;
  return {...placement,position:p};
}

export function worldTraversalConnections(record){
  const t=record?.asset?.traversal, out=[];
  if(!t)return out;
  const ang=finite(record.rotation,0), sc=finite(record.scale,1), c=Math.cos(ang), s=Math.sin(ang), base=record.position||[0,0,0];
  for(const cn of t.connections||[]){
    const q=cn.position||[0,0,0], x=finite(q[0],0)*sc, y=finite(q[1],0)*sc, z=finite(q[2],0)*sc;
    out.push({...cn,position:[x*c-y*s+finite(base[0],0),x*s+y*c+finite(base[1],0),z+finite(base[2],0)]});
  }
  return out;
}
