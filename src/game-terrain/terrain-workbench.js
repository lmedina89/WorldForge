import * as THREE from 'three';
import { TerrainSampler } from './terrain-sampler.js';
import { StrategicTerrainSampler } from './strategic-terrain-sampler.js';
import { TerrainRenderer } from './terrain-renderer.js';
import { TerrainRendererV5 } from './terrain-renderer-v5.js';

export const GAME_TERRAIN_WORKBENCH_VERSION='0.6.0';
export const FORGERTS_TERRAIN_SOURCE_VERSION='0.6.6.8';
export const EXPERIMENTAL_TERRAIN_RENDERER_VERSION='0.5.0';

const clone=v=>JSON.parse(JSON.stringify(v));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)));

const DEFAULT_VISUAL=Object.freeze({
  cellMeters:4,
  macroVariation:.14,
  normalStrength:.82,
  surfaceContrast:1.00,
  detailMix:.18,
  splatCellMeters:2.0,
  macroCellMeters:8,
  roadBlendMeters:8,
  bankWetness:.82,
  blendDetail:.06,
  wetTileMeters:2.0
});

function disposeObject(root){
  if(!root)return;
  const textures=new Set();
  root.traverse?.(o=>{
    o.geometry?.dispose?.();
    const mats=Array.isArray(o.material)?o.material:(o.material?[o.material]:[]);
    for(const m of mats){
      if(!m)continue;
      for(const key of ['map','normalMap','roughnessMap','metalnessMap','alphaMap','aoMap','emissiveMap'])if(m[key])textures.add(m[key]);
      if(m.uniforms)for(const u of Object.values(m.uniforms))if(u?.value?.isTexture)textures.add(u.value);
      m.dispose?.();
    }
  });
  textures.forEach(t=>t.dispose?.());
}

export class GameTerrainWorkbench{
  constructor({scene,camera,renderer,controls}){
    this.scene=scene;this.camera=camera;this.renderer=renderer;this.controls=controls;
    this.root=new THREE.Group();this.root.name='WorldForgeGameTerrainWorkbench';this.root.visible=false;scene.add(this.root);
    // Game Terrain deliberately stays in ForgeRTS native Y-up coordinates.
    // That keeps shader projection, slope normals and lighting identical to the game path.
    this.runtimeRoot=new THREE.Group();this.runtimeRoot.name='ForgeRTSRuntimeTerrain';this.root.add(this.runtimeRoot);
    this.map=null;this.baselineMap=null;this.terrain=null;this.runtimeRenderer=null;this.info=null;this.loaded=false;this.view='wide';
    this.rendererMode='experimental';this.mapSource='none';this.routeDebug=new THREE.Group();this.routeDebug.name='StrategicRouteValidation';this.runtimeRoot.add(this.routeDebug);this._routesVisible=false;
  }

  setActive(active){this.root.visible=!!active;}
  hasMap(){return !!this.map;}
  getRendererMode(){return this.rendererMode;}
  setRendererMode(mode){this.rendererMode=mode==='current'?'current':'experimental';return this.rebuild();}

  async loadBundled(){
    const res=await fetch('assets/game-terrain/forgerts_training_ground.json',{cache:'no-cache'});
    if(!res.ok)throw new Error(`ForgeRTS map load failed (${res.status})`);
    const map=await res.json();
    this.baselineMap=clone(map);this.map=clone(map);this.mapSource='forgerts';this._ensureVisual();this.loaded=true;
    return this.rebuild();
  }

  async loadShowcase(){
    const res=await fetch('assets/game-terrain/worldforge_curated_battlefield.json',{cache:'no-cache'});
    if(!res.ok)throw new Error(`Curated battlefield load failed (${res.status})`);
    const map=await res.json();this._validateMap(map);
    this.baselineMap=clone(map);this.map=clone(map);this.mapSource='showcase';this._ensureVisual();this.loaded=true;
    return this.rebuild();
  }

  async loadFile(file){
    const map=JSON.parse(await file.text());
    this._validateMap(map);
    this.baselineMap=clone(map);this.map=clone(map);this.mapSource='import';this._ensureVisual();this.loaded=true;
    return this.rebuild();
  }

  _validateMap(map){
    if(!map||typeof map!=='object')throw new Error('Map JSON must be an object.');
    if(!map.size||!Number(map.size.width)||!Number(map.size.depth))throw new Error('Map is missing size.width / size.depth.');
    if(!map.terrain?.heightfield)throw new Error('Map is missing terrain.heightfield.');
    if(!Array.isArray(map.terrain?.materials)||map.terrain.materials.length<3)throw new Error('Map needs grass/dirt/rock terrain materials.');
  }

  _ensureVisual(){
    if(!this.map?.terrain)return;
    this.map.terrain.visual={...DEFAULT_VISUAL,...(this.map.terrain.visual||{})};
  }

  reset(){
    if(!this.baselineMap)return null;
    this.map=clone(this.baselineMap);this._ensureVisual();
    return this.rebuild();
  }

  applySettings(s={}){
    if(!this.map)return;
    const hf=this.map.terrain.heightfield,noise=hf.noise||(hf.noise={}),cliffs=this.map.terrain.cliffs||(this.map.terrain.cliffs={});
    const visual=this.map.terrain.visual||(this.map.terrain.visual={...DEFAULT_VISUAL});
    if(Number.isFinite(+s.seed))this.map.seed=Math.max(1,Math.floor(+s.seed));
    if(Number.isFinite(+s.baseHeight))hf.baseHeight=clamp(s.baseHeight,-20,40);
    if(Number.isFinite(+s.noiseScale))noise.scale=clamp(s.noiseScale,20,400);
    if(Number.isFinite(+s.amplitude))noise.amplitude=clamp(s.amplitude,0,40);
    if(Number.isFinite(+s.octaves))noise.octaves=Math.round(clamp(s.octaves,1,7));
    if(Number.isFinite(+s.persistence))noise.persistence=clamp(s.persistence,.1,.9);
    if(Number.isFinite(+s.cliffStart))cliffs.slopeStartDeg=clamp(s.cliffStart,5,60);
    if(Number.isFinite(+s.cliffFull))cliffs.slopeFullDeg=Math.max(cliffs.slopeStartDeg+1,clamp(s.cliffFull,6,75));
    const byId=Object.fromEntries(this.map.terrain.materials.map(m=>[m.id,m]));
    if(Number.isFinite(+s.grassTile)&&byId.grass)byId.grass.tileMeters=clamp(s.grassTile,2,80);
    if(Number.isFinite(+s.dirtTile)&&byId.dirt)byId.dirt.tileMeters=clamp(s.dirtTile,2,80);
    if(Number.isFinite(+s.rockTile)&&byId.rock)byId.rock.tileMeters=clamp(s.rockTile,2,80);
    if(Number.isFinite(+s.sunIntensity)){this.map.environment=this.map.environment||{};this.map.environment.sunIntensity=clamp(s.sunIntensity,.1,5);}
    if(Number.isFinite(+s.cellMeters))visual.cellMeters=clamp(s.cellMeters,3,6);
    if(Number.isFinite(+s.macroVariation))visual.macroVariation=clamp(s.macroVariation,0,.5);
    if(Number.isFinite(+s.normalStrength))visual.normalStrength=clamp(s.normalStrength,0,1.8);
    if(Number.isFinite(+s.surfaceContrast))visual.surfaceContrast=clamp(s.surfaceContrast,.7,1.5);
    if(Number.isFinite(+s.detailMix))visual.detailMix=clamp(s.detailMix,0,.55);
    if(Number.isFinite(+s.splatCellMeters))visual.splatCellMeters=clamp(s.splatCellMeters,1.5,5);
    if(Number.isFinite(+s.macroCellMeters))visual.macroCellMeters=clamp(s.macroCellMeters,4,24);
    if(Number.isFinite(+s.roadBlendMeters))visual.roadBlendMeters=clamp(s.roadBlendMeters,2,20);
    if(Number.isFinite(+s.bankWetness))visual.bankWetness=clamp(s.bankWetness,0,1);
    if(Number.isFinite(+s.blendDetail))visual.blendDetail=clamp(s.blendDetail,0,.28);
    if(Number.isFinite(+s.wetTileMeters))visual.wetTileMeters=clamp(s.wetTileMeters,4,30);
  }

  async rebuild(){
    if(!this.map)return null;
    this._validateMap(this.map);this._ensureVisual();
    this._disposeRuntime();
    this.terrain=this.map.terrain?.landforms?new StrategicTerrainSampler(this.map):new TerrainSampler(this.map);
    this.runtimeRenderer=this.rendererMode==='current'
      ?new TerrainRenderer({scene:this.runtimeRoot,map:this.map,terrain:this.terrain})
      :new TerrainRendererV5({scene:this.runtimeRoot,map:this.map,terrain:this.terrain,camera:this.camera,renderer:this.renderer});
    await this.runtimeRenderer.build();
    this._buildRouteDebug();
    this._syncPresentationUniforms();
    this._applyVisibility();
    this.info=this._stats();
    return this.info;
  }

  _syncPresentationUniforms(){
    const d=this.map?.environment?.sunDirection||{x:-.55,y:1,z:.32};
    const v=new THREE.Vector3(d.x,d.y,d.z).normalize();
    this.runtimeRoot.traverse(o=>{
      const mats=Array.isArray(o.material)?o.material:(o.material?[o.material]:[]);
      for(const m of mats)if(m?.uniforms?.uSunDir?.value?.copy)m.uniforms.uSunDir.value.copy(v);
    });
  }

  _disposeRuntime(){
    if(this.runtimeRenderer?.textures)for(const t of this.runtimeRenderer.textures.values())t?.dispose?.();
    if(this.runtimeRenderer?.normalTextures)for(const t of this.runtimeRenderer.normalTextures.values())t?.dispose?.();
    if(this.runtimeRenderer?.armTextures)for(const t of this.runtimeRenderer.armTextures.values())t?.dispose?.();
    this.runtimeRenderer?.rockMacroTexture?.dispose?.();
    if(this.runtimeRenderer?.generatedTextures)for(const t of this.runtimeRenderer.generatedTextures)t?.dispose?.();
    for(const c of [...this.runtimeRoot.children]){if(c===this.routeDebug)continue;this.runtimeRoot.remove(c);disposeObject(c);}
    while(this.routeDebug.children.length){const c=this.routeDebug.children.pop();c.geometry?.dispose?.();c.material?.dispose?.();}
    this.runtimeRenderer=null;this.terrain=null;
  }

  _routeStats(){
    const routes=this.map?.navigation?.validationRoutes||[],out=[];
    const sampleStep=6;
    for(const r of routes){
      let maxSlope=0,sum=0,count=0;
      const pts=r.points||[];
      for(let i=0;i<pts.length-1;i++){
        const a=pts[i],b=pts[i+1],L=Math.hypot(b.x-a.x,b.z-a.z),n=Math.max(1,Math.ceil(L/sampleStep));
        for(let j=0;j<=n;j++){
          const q=j/n,x=a.x+(b.x-a.x)*q,z=a.z+(b.z-a.z)*q,s=this.terrain.slopeDeg(x,z,3.5);
          maxSlope=Math.max(maxSlope,s);sum+=s;count++;
        }
      }
      const limit=Number(r.maxSlopeDeg??this.map.navigation?.defaultMaxSlopeDeg??28);
      out.push({id:r.id,label:r.label||r.id,maxSlopeDeg:maxSlope,averageSlopeDeg:count?sum/count:0,limit,valid:maxSlope<=limit});
    }
    return out;
  }

  _buildRouteDebug(){
    while(this.routeDebug.children.length){const c=this.routeDebug.children.pop();c.geometry?.dispose?.();c.material?.dispose?.();}
    const stats=Object.fromEntries(this._routeStats().map(r=>[r.id,r]));
    for(const r of this.map?.navigation?.validationRoutes||[]){
      const pts=[],src=r.points||[];
      for(let i=0;i<src.length-1;i++){
        const a=src[i],b=src[i+1],L=Math.hypot(b.x-a.x,b.z-a.z),n=Math.max(1,Math.ceil(L/7));
        for(let j=0;j<n;j++){const q=j/n,x=a.x+(b.x-a.x)*q,z=a.z+(b.z-a.z)*q;pts.push(new THREE.Vector3(x,this.terrain.heightAt(x,z)+.45,z));}
      }
      if(src.length){const a=src.at(-1);pts.push(new THREE.Vector3(a.x,this.terrain.heightAt(a.x,a.z)+.45,a.z));}
      if(pts.length<2)continue;
      const g=new THREE.BufferGeometry().setFromPoints(pts),ok=stats[r.id]?.valid!==false,m=new THREE.LineBasicMaterial({color:ok?0x59e38b:0xff5a48,transparent:true,opacity:.9,depthTest:false});
      const line=new THREE.Line(g,m);line.name=`RouteValidation:${r.id}`;line.renderOrder=20;this.routeDebug.add(line);
    }
    this.routeDebug.visible=this._routesVisible;
  }

  setRoutesVisible(on){this._routesVisible=!!on;if(this.routeDebug)this.routeDebug.visible=this._routesVisible;}

  _stats(){
    const w=Number(this.map.size.width),d=Number(this.map.size.depth);
    const cell=this.rendererMode==='current'?6:clamp(this.map.terrain.visual?.cellMeters??4,3,6),cols=Math.ceil(w/cell),rows=Math.ceil(d/cell);
    return {
      width:w,depth:d,seed:this.map.seed,cellMeters:cell,rendererMode:this.rendererMode,
      terrainVertices:(cols+1)*(rows+1),terrainTriangles:cols*rows*2,
      roads:(this.map.roads||[]).length,rivers:(this.map.water?.rivers||[]).length,
      materials:(this.map.terrain.materials||[]).map(m=>({id:m.id,tileMeters:m.tileMeters,albedo:m.albedo})),
      visual:clone(this.map.terrain.visual||DEFAULT_VISUAL),
      sourceVersion:FORGERTS_TERRAIN_SOURCE_VERSION,
      experimentalVersion:EXPERIMENTAL_TERRAIN_RENDERER_VERSION,
      surfaceStats:clone(this.runtimeRenderer?.surfaceStats||null),
      samplerMode:this.map.terrain?.landforms?'strategic-landforms':'forgerts-baseline',
      mapSource:this.mapSource,
      routeValidation:this._routeStats()
    };
  }

  exportMap(){return clone(this.map);}

  setWireframe(on){
    this.runtimeRoot.traverse(o=>{const mats=Array.isArray(o.material)?o.material:(o.material?[o.material]:[]);mats.forEach(m=>{if(m)m.wireframe=!!on;});});
  }
  setRoadsVisible(on){this._roadsVisible=!!on;this._applyVisibility();}
  setWaterVisible(on){this._waterVisible=!!on;this._applyVisibility();}
  _applyVisibility(){
    const roads=this._roadsVisible!==false,water=this._waterVisible!==false;
    this.runtimeRoot.traverse(o=>{if(/^Road(?::|Shoulder:)/.test(o.name||''))o.visible=roads;if(/^River:/.test(o.name||''))o.visible=water;});
  }

  setView(view='wide',aspect=1.4){
    if(!this.map)return;
    this.view=view;const w=this.map.size.width,d=this.map.size.depth,max=Math.max(w,d),a=Math.max(.5,Number(aspect)||1.4);
    const setSpan=span=>{this.camera.left=-span*a*.5;this.camera.right=span*a*.5;this.camera.top=span*.5;this.camera.bottom=-span*.5;this.camera.zoom=1;this.camera.updateProjectionMatrix();};
    this.camera.up.set(0,1,0);
    if(view==='top'){
      this.camera.up.set(0,0,-1);setSpan(max*1.02);this.controls.target.set(0,0,0);this.camera.position.set(0,max*.92,0);this.camera.lookAt(0,0,0);
    }else if(view==='close'){
      setSpan(Math.min(max*.32,210));this.controls.target.set(0,8,0);this.camera.position.set(92,72,124);this.camera.lookAt(this.controls.target);
    }else if(view==='ground'){
      setSpan(Math.min(max*.20,135));this.controls.target.set(0,7,55);this.camera.position.set(0,22,-105);this.camera.lookAt(this.controls.target);
    }else{
      setSpan(max*.78);this.controls.target.set(0,4,0);this.camera.position.set(max*.34,max*.36,-max*.42);this.camera.lookAt(this.controls.target);
    }
    this.controls.update();
  }
}
