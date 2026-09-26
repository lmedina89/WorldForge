import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { generateScene } from './generators/index.js';
import { normalizeRecipe } from './core/recipe.js';
import { sceneSpecToThree, disposeThreeGroup } from './adapters/three-adapter.js';
import { saveProject, listProjects, getProject, deleteProject } from './storage/project-store.js';
import { WORLDFORGE_VERSION } from './core/schema.js';
import { enrichExistingScene } from './core/production-metadata.js';
import { snapScalar, snapRotationRadians, nearestLevel, nearestEdgeAdjustment, worldTraversalConnections } from './core/placement-tools.js';
import { VehicleBaker, VEHICLE_BAKER_VERSION } from './vehicle/vehicle-baker.js';
import { generateLowPolyVehicle, VEHICLE_GENERATOR_VERSION, VEHICLE_ARCHETYPES } from './vehicle/vehicle-generator.js';

const $=id=>document.getElementById(id);
let mode='building',currentGroup=null,currentSpec=null,selectedPlacementId=null,selectionHelper=null,selectionGuideGroup=null,fieldLevelView='all',characterSprite=null,characterShadow=null,walkDebugGroup=null,characterPos=[0,0,0],characterDir='S',playtestActive=false,walkDebugEnabled=false,followCameraEnabled=true,playtestCameraOffset=new THREE.Vector3(16,-18,12),settlementCharacterSpawnOverride=null;
const panels={building:$('buildingPanel'),prop:$('propPanel'),foliage:$('foliagePanel'),surface:$('surfacePanel'),traversal:$('traversalPanel'),field:$('fieldPanel'),settlement:$('settlementPanel'),vehicle:$('vehiclePanel'),terrain:$('terrainPanel'),landscape:$('landscapePanel')};
const isCompositeMode=()=>mode==='field'||mode==='settlement';

const scene=new THREE.Scene();scene.background=new THREE.Color(0x0d1310);scene.fog=new THREE.Fog(0x0d1310,55,150);
const camera=new THREE.OrthographicCamera(-12,12,8,-8,.1,400);camera.up.set(0,0,1);camera.position.set(15,-18,13);camera.lookAt(0,0,2);
const renderer=new THREE.WebGLRenderer({antialias:false,alpha:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(1.25,devicePixelRatio||1));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;$('canvasHost').appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.target.set(0,0,2);
scene.add(new THREE.AmbientLight(0xbfd0c8,1.15));const sun=new THREE.DirectionalLight(0xffe6bd,2.6);sun.position.set(-12,-16,22);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.MeshStandardMaterial({color:0x536849,roughness:1}));ground.position.z=-.02;ground.receiveShadow=true;scene.add(ground);
const grid=new THREE.GridHelper(80,80,0x34443a,0x243029);grid.rotation.x=Math.PI/2;grid.position.z=.012;scene.add(grid);
const vehicleBaker=new VehicleBaker({scene,camera,renderer,controls});
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
$('version').textContent='v'+WORLDFORGE_VERSION;

function showMode(next){
  mode=next;selectedPlacementId=null;clearSelectionHelper();
  if(mode!=='settlement'&&playtestActive)setPlaytest(false);
  document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.mode===mode));
  Object.entries(panels).forEach(([key,p])=>p.hidden=key!==mode);
  document.querySelectorAll('.proceduralUi').forEach(el=>el.hidden=mode==='vehicle');
  if(currentGroup)currentGroup.visible=mode!=='vehicle';
  vehicleBaker.setActive(mode==='vehicle');
  updateModeEnvironment();
  if($('placementEditorPanel'))$('placementEditorPanel').hidden=!isCompositeMode();
  if(mode!=='settlement'){hideCharacter();settlementCharacterSpawnOverride=null;}
  if(mode==='vehicle'){$('modeLabel').textContent='VEHICLE BAKER';$('seedLabel').textContent='8-DIR';}
  syncPlaytestButtons();
  updateSelectedUi();
}

function syncBuildingEngineUI(){
  const engine=$('buildingEngine')?.value||'1.0.0';
  const modern=['1.1.0','1.2.0','1.3.0'].includes(engine),rpg=['1.2.0','1.3.0'].includes(engine),rpg2=engine==='1.3.0';
  document.querySelectorAll('.modernBuilding select,.modernBuilding input').forEach(el=>el.disabled=!modern);
  document.querySelectorAll('#roof .modernRoof').forEach(opt=>opt.disabled=!modern);
  document.querySelectorAll('.rpgFamily,.rpgStyle,.rpgTemplate,.rpgRoof').forEach(opt=>opt.disabled=!rpg);
  document.querySelectorAll('.rpg2Family,.rpg2Style,.rpg2Template,.rpg2Roof').forEach(opt=>opt.disabled=!rpg2);
  if(!modern&&['crossGable','shed','gambrel','conical','parapet','dome','spire'].includes($('roof').value))$('roof').value='gable';
  if(!rpg&&['conical','parapet','dome','spire'].includes($('roof').value))$('roof').value='gable';
  if(!rpg2&&['dome','spire'].includes($('roof').value))$('roof').value='gable';
  if($('family').selectedOptions[0]?.disabled)$('family').value='shop';
  if($('style').selectedOptions[0]?.disabled)$('style').value='smallWoodTown';
  if($('template').selectedOptions[0]?.disabled)$('template').value='auto';
  $('width').max=rpg2?24:(rpg?20:14);$('depth').max=rpg2?18:(rpg?15:11);$('floors').max=rpg2?8:(rpg?6:4);
}

function readRecipe(){
  const seed=+$('seed').value;
  if(mode==='landscape')return normalizeRecipe({type:'landscape',seed,feature:$('feature').value,size:+$('terrainSize').value,relief:+$('relief').value,roughness:+$('roughness').value,terracing:+$('terracing').value,path:$('path').checked,rocks:$('rocks').checked,gridResolution:+$('gridResolution').value});
  if(mode==='prop')return normalizeRecipe({type:'prop',seed,family:$('propFamily').value,condition:$('propCondition').value,style:$('propStyle').value,variant:$('propVariant').value,scale:+$('propScale').value});
  if(mode==='foliage')return normalizeRecipe({type:'foliage',seed,family:$('foliageFamily').value,biome:$('foliageBiome').value,variant:$('foliageVariant').value,condition:$('foliageCondition').value,scale:+$('foliageScale').value,density:+$('foliageDensity').value,spread:+$('foliageSpread').value});
  if(mode==='traversal')return normalizeRecipe({type:'traversal',seed,family:$('traversalFamily').value,style:$('traversalStyle').value,variant:$('traversalVariant').value,width:+$('traversalWidth').value,length:+$('traversalLength').value,height:+$('traversalHeight').value,rails:$('traversalRails').checked});
  if(mode==='terrain')return normalizeRecipe({type:'terrain',seed,patch:$('terrainPatch').value,size:+$('patchSize').value,roughness:+$('patchRoughness').value,pathWidth:+$('pathWidth').value,wear:+$('wear').value,gridResolution:+$('patchResolution').value});
  if(mode==='surface')return normalizeRecipe({type:'surface',seed,surface:$('surfaceType').value,size:+$('surfaceSize').value,variation:+$('surfaceVariation').value,wear:+$('surfaceWear').value,pathPattern:$('surfacePathPattern').value,pathWidth:+$('surfacePathWidth').value,pathMaterial:$('surfacePathMaterial').value,detailDensity:+$('surfaceDetailDensity').value,edgeBlend:$('surfaceEdgeBlend').checked,gridResolution:+$('surfaceResolution').value});
  if(mode==='field')return normalizeRecipe({type:'field',seed,preset:$('fieldPreset').value,size:+$('fieldSize').value,density:+$('fieldDensity').value,surface:$('fieldSurface').value,buildingEngine:$('fieldBuildingEngine').value,dressing:+$('fieldDressing').value,elevation:+$('fieldElevation').value,placements:null});
  if(mode==='settlement')return normalizeRecipe({type:'settlement',seed,grammar:$('settlementGrammar').value,size:+$('settlementSize').value,buildingCount:+$('settlementBuildingCount').value,density:+$('settlementDensity').value,buildingEngine:$('settlementBuildingEngine').value,biome:$('settlementBiome').value,wealth:$('settlementWealth').value,age:$('settlementAge').value,dressing:+$('settlementDressing').value,elevation:+$('settlementElevation').value,characterPreview:$('characterPreview').checked,characterSpawn:settlementCharacterSpawnOverride||undefined,placements:null});
  return normalizeRecipe({type:'building',engineVersion:$('buildingEngine').value,seed,family:$('family').value,style:$('style').value,material:$('material').value,condition:$('condition').value,width:+$('width').value,depth:+$('depth').value,floors:+$('floors').value,roof:$('roof').value,pitch:+$('pitch').value,template:$('template').value,facade:$('facade').value,wealth:$('wealth').value,age:$('age').value,construction:$('construction').value,features:{chimney:$('chimney').checked,porch:$('porch').checked,sign:$('sign').checked,extension:$('extension').checked}});
}

function writeRecipe(recipe){
  const r=normalizeRecipe(recipe);showMode(r.type);$('seed').value=r.seed;
  if(mode==='building'){
    $('buildingEngine').value=r.engineVersion||'1.0.0';
    for(const [id,key] of [['family','family'],['style','style'],['material','material'],['condition','condition'],['roof','roof']])$(id).value=r[key];
    for(const [id,key] of [['width','width'],['depth','depth'],['floors','floors'],['pitch','pitch']])$(id).value=r[key];
    for(const key of ['chimney','porch','sign','extension'])$(key).checked=!!r.features[key];
    $('template').value=r.template||'auto';$('facade').value=r.facade||'auto';$('wealth').value=r.wealth||'modest';$('age').value=r.age||'mature';$('construction').value=r.construction||'auto';syncBuildingEngineUI();
  } else if(mode==='prop'){
    $('propFamily').value=r.family;$('propCondition').value=r.condition;$('propStyle').value=r.style;$('propVariant').value=r.variant;$('propScale').value=r.scale;
  } else if(mode==='foliage'){
    $('foliageFamily').value=r.family;$('foliageBiome').value=r.biome;$('foliageVariant').value=r.variant;$('foliageCondition').value=r.condition;$('foliageScale').value=r.scale;$('foliageDensity').value=r.density;$('foliageSpread').value=r.spread;
  } else if(mode==='traversal'){
    $('traversalFamily').value=r.family;$('traversalStyle').value=r.style;$('traversalVariant').value=r.variant;$('traversalWidth').value=r.width;$('traversalLength').value=r.length;$('traversalHeight').value=r.height;$('traversalRails').checked=!!r.rails;
  } else if(mode==='terrain'){
    $('terrainPatch').value=r.patch;$('patchSize').value=r.size;$('patchRoughness').value=r.roughness;$('pathWidth').value=r.pathWidth;$('wear').value=r.wear;$('patchResolution').value=r.gridResolution;
  } else if(mode==='surface'){
    $('surfaceType').value=r.surface;$('surfaceSize').value=r.size;$('surfaceVariation').value=r.variation;$('surfaceWear').value=r.wear;$('surfacePathPattern').value=r.pathPattern;$('surfacePathWidth').value=r.pathWidth;$('surfacePathMaterial').value=r.pathMaterial;$('surfaceDetailDensity').value=r.detailDensity;$('surfaceEdgeBlend').checked=!!r.edgeBlend;$('surfaceResolution').value=r.gridResolution;
  } else if(mode==='field'){
    $('fieldPreset').value=r.preset;$('fieldSize').value=r.size;$('fieldDensity').value=r.density;$('fieldSurface').value=r.surface;$('fieldBuildingEngine').value=r.buildingEngine;$('fieldDressing').value=r.dressing;$('fieldElevation').value=r.elevation;
  } else if(mode==='settlement'){
    $('settlementGrammar').value=r.grammar;$('settlementSize').value=r.size;$('settlementBuildingCount').value=r.buildingCount;$('settlementDensity').value=r.density;$('settlementBuildingEngine').value=r.buildingEngine;$('settlementBiome').value=r.biome;$('settlementWealth').value=r.wealth;$('settlementAge').value=r.age;$('settlementDressing').value=r.dressing;$('settlementElevation').value=r.elevation;$('characterPreview').checked=!!r.characterPreview;settlementCharacterSpawnOverride=Array.isArray(r.characterSpawn)?[...r.characterSpawn]:null;
  } else {
    for(const [id,key] of [['feature','feature'],['terrainSize','size'],['relief','relief'],['roughness','roughness'],['terracing','terracing'],['gridResolution','gridResolution']])$(id).value=r[key];$('path').checked=!!r.path;$('rocks').checked=!!r.rocks;
  }
  syncOutputs();renderRecipe(r,{resetCamera:true});
}

function spanFor(recipe){
  if(recipe.type==='landscape')return Math.max(20,recipe.size*.7);
  if(recipe.type==='terrain'||recipe.type==='surface')return Math.max(7,recipe.size*.62);
  if(recipe.type==='field'||recipe.type==='settlement')return Math.max(12,recipe.size*.63);
  if(recipe.type==='prop')return Math.max(3.6,4.2*recipe.scale);
  if(recipe.type==='traversal')return Math.max(5,Math.max(recipe.width||3,recipe.length||8)*.72);
  if(recipe.type==='foliage')return Math.max(4.2,5.2*recipe.scale*recipe.spread);
  if(recipe.type==='building')return Math.max(10,Math.max(recipe.width||6,recipe.depth||5)*.92);
  return 10;
}
function targetHeight(recipe){
  if(recipe.type==='building')return Math.max(2.2,Math.min(5.2,1.2+(recipe.floors||2)*1.15));
  if(recipe.type==='prop')return recipe.family==='well'?1.15:.8;
  if(recipe.type==='traversal')return Math.max(.8,(recipe.height||2.2)*.55);
  if(recipe.type==='foliage')return recipe.family==='tree'?2.3:.65;
  if(recipe.type==='terrain'||recipe.type==='surface')return .15;
  if(recipe.type==='field'||recipe.type==='settlement')return 2.0;
  return 1.5;
}
function setDefaultCamera(recipe){
  if(recipe.type==='terrain'||recipe.type==='surface')camera.position.set(12,-15,14);
  else if(recipe.type==='field'||recipe.type==='settlement')camera.position.set(24,-30,24);
  else if(recipe.type==='prop'||recipe.type==='foliage'||recipe.type==='traversal')camera.position.set(8,-10,7);
  else camera.position.set(15,-18,13);
  controls.target.set(0,0,targetHeight(recipe));camera.lookAt(controls.target);controls.update();
}
function updateModeEnvironment(){
  ground.visible=!['surface','field','settlement','terrain','vehicle'].includes(mode);
  grid.visible=!['surface','field','settlement','vehicle'].includes(mode);
}
function renderRecipe(recipe,{resetCamera=true}={}){
  clearSelectionHelper();
  walkDebugGroup=disposeHelperGroup(walkDebugGroup);
  if(currentGroup){scene.remove(currentGroup);disposeThreeGroup(currentGroup);}
  currentSpec=generateScene(recipe);currentGroup=sceneSpecToThree(currentSpec);scene.add(currentGroup);
  mode=currentSpec.recipe.type;updateModeEnvironment();
  if(mode==='settlement')settlementCharacterSpawnOverride=Array.isArray(currentSpec.recipe.characterSpawn)?[...currentSpec.recipe.characterSpawn]:Array.isArray(currentSpec.metadata?.characterSpawn)?[...currentSpec.metadata.characterSpawn]:settlementCharacterSpawnOverride;
  $('seedLabel').textContent='SEED '+currentSpec.recipe.seed;$('modeLabel').textContent=mode.toUpperCase();
  fitCamera(spanFor(currentSpec.recipe));if(resetCamera)setDefaultCamera(currentSpec.recipe);
  const v=currentSpec.validation,engine=currentSpec.asset?.engine,warn=v.warnings.length?` · ${v.warnings.length} warn`:'';
  $('status').textContent=v.errors.length?`Validation failed: ${v.errors.join('; ')}`:`Generated ${mode} · ${v.stats.nodeCount} nodes · ~${v.stats.approxTriangleCount.toLocaleString()} tris${v.stats.placementCount?` · ${v.stats.placementCount} placements`:''}${engine?` · ${engine.name} ${engine.version}`:''}${warn}`;
  $('validation').textContent=v.errors.length?'ERROR':v.warnings.length?`${v.warnings.length} WARN`:'VALID';$('validation').dataset.state=v.errors.length?'bad':v.warnings.length?'warn':'good';
  if(selectedPlacementId&&!currentSpec.recipe.placements?.some(p=>p.id===selectedPlacementId))selectedPlacementId=null;
  updateSelectionHelper();updateSelectedUi();applyLevelFilter();updateWalkDebugOverlay();
  if(mode==='settlement'&&currentSpec.recipe.characterPreview!==false)resetCharacter();else hideCharacter();
  if(mode!=='settlement'&&playtestActive)setPlaytest(false);
  syncPlaytestButtons();updatePlacementOcclusion();
}
function regenerate(){selectedPlacementId=null;renderRecipe(readRecipe(),{resetCamera:true});}
function fitCamera(span){const aspect=Math.max(.5,$('canvasHost').clientWidth/Math.max(1,$('canvasHost').clientHeight));camera.left=-span*aspect;camera.right=span*aspect;camera.top=span;camera.bottom=-span;camera.updateProjectionMatrix();controls.target.set(0,0,currentSpec?targetHeight(currentSpec.recipe):2.2);}
function setView(v){
  const t=currentSpec?targetHeight(currentSpec.recipe):2.2;controls.target.set(0,0,t);
  if(v==='field')camera.position.set(isCompositeMode()?20:(mode==='prop'||mode==='foliage'||mode==='traversal')?8:15,isCompositeMode()?-24:(mode==='prop'||mode==='foliage'||mode==='traversal')?-10:-18,isCompositeMode()?20:mode==='terrain'||mode==='surface'?14:(mode==='prop'||mode==='foliage'||mode==='traversal')?7:13);
  else if(v==='front')camera.position.set(0,-Math.max(24,spanFor(currentSpec?.recipe||{})*2),(mode==='prop'||mode==='foliage'||mode==='traversal')?2.8:isCompositeMode()?7:4.5);
  else if(v==='side')camera.position.set(Math.max(24,spanFor(currentSpec?.recipe||{})*2),0,(mode==='prop'||mode==='foliage'||mode==='traversal')?2.8:isCompositeMode()?7:4.5);
  else return;
  camera.lookAt(controls.target);controls.update();
}
function disposeHelperGroup(group){
  if(!group)return null;
  scene.remove(group);
  group.traverse(o=>{o.geometry?.dispose?.();if(Array.isArray(o.material))o.material.forEach(m=>m?.dispose?.());else o.material?.dispose?.();});
  return null;
}
function syncPlaytestButtons(){
  const playLabel=playtestActive?'EXIT PLAYTEST':'ENTER PLAYTEST';
  if($('playtestToggle'))$('playtestToggle').textContent=playLabel;
  if($('walkDebugToggle'))$('walkDebugToggle').textContent=`WALK DEBUG: ${walkDebugEnabled?'ON':'OFF'}`;
  if($('playtestHudDebug'))$('playtestHudDebug').textContent=`WALK DEBUG: ${walkDebugEnabled?'ON':'OFF'}`;
  if($('followCameraToggle'))$('followCameraToggle').textContent=`FOLLOW CAMERA: ${followCameraEnabled?'ON':'OFF'}`;
  if($('playtestHudFollow'))$('playtestHudFollow').textContent=`FOLLOW CAMERA: ${followCameraEnabled?'ON':'OFF'}`;
  if($('playtestHud'))$('playtestHud').hidden=!playtestActive;
}
function setPlaytest(active){
  playtestActive=!!active&&mode==='settlement';
  document.body.classList.toggle('playtest',playtestActive);
  syncPlaytestButtons();
  if(playtestActive){
    if(characterSprite?.visible){
      playtestCameraOffset.copy(camera.position).sub(controls.target);
      if(playtestCameraOffset.lengthSq()<1)playtestCameraOffset.set(16,-18,12);
      centerCharacter();
    }
  }
}
function setWalkDebugEnabled(active){walkDebugEnabled=!!active;updateWalkDebugOverlay();syncPlaytestButtons();}
function updateWalkDebugOverlay(){
  walkDebugGroup=disposeHelperGroup(walkDebugGroup);
  if(!walkDebugEnabled||mode!=='settlement'||!currentSpec?.metadata)return;
  const g=new THREE.Group();g.name='WorldForgeWalkDebug';
  for(const z of currentSpec.metadata.walkZones||[]){
    const b=z.bounds||[];if(b.length!==4)continue;
    const w=Math.max(.1,b[2]-b[0]),h=Math.max(.1,b[3]-b[1]);
    const geom=new THREE.PlaneGeometry(w,h);
    const fill=new THREE.Mesh(geom,new THREE.MeshBasicMaterial({color:0x4fbf7f,transparent:true,opacity:.14,depthWrite:false}));
    fill.position.set((b[0]+b[2])/2,(b[1]+b[3])/2,(Number(z.z)||0)+.05);g.add(fill);
    const pts=[[b[0],b[1]],[b[2],b[1]],[b[2],b[3]],[b[0],b[3]],[b[0],b[1]]].map(([x,y])=>new THREE.Vector3(x,y,(Number(z.z)||0)+.075));
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x7ff0ae})));
  }
  for(const t of currentSpec.metadata.walkTransitions||[]){
    const b=t.bounds||[];if(b.length!==4)continue;
    const w=Math.max(.1,b[2]-b[0]),h=Math.max(.1,b[3]-b[1]),cz=((Number(t.z0)||0)+(Number(t.z1)||0))*.5+.08;
    const fill=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:0xffcf5a,transparent:true,opacity:.16,depthWrite:false}));
    fill.position.set((b[0]+b[2])/2,(b[1]+b[3])/2,cz);g.add(fill);
  }
  walkDebugGroup=g;scene.add(g);
}

function clearSelectionHelper(){
  if(selectionHelper){scene.remove(selectionHelper);selectionHelper.geometry?.dispose?.();selectionHelper.material?.dispose?.();selectionHelper=null;}
  if(selectionGuideGroup){scene.remove(selectionGuideGroup);selectionGuideGroup.traverse(o=>{o.geometry?.dispose?.();o.material?.dispose?.();});selectionGuideGroup=null;}
}
function placementRecord(id){return currentSpec?.metadata?.placements?.find(p=>p.id===id)||null;}
function placementObject(id){return currentGroup?.children?.find(o=>o.userData?.placementId===id)||null;}
function updateSelectionHelper(){
  clearSelectionHelper();if(!isCompositeMode()||!selectedPlacementId)return;
  const obj=placementObject(selectedPlacementId),rec=placementRecord(selectedPlacementId);if(!obj||!rec)return;
  const box=new THREE.Box3().setFromObject(obj);if(!box.isEmpty()){selectionHelper=new THREE.Box3Helper(box,0x8ff0b5);selectionHelper.name='WorldForgeSelection';scene.add(selectionHelper);}
  if(!$('fieldShowGuides')?.checked)return;
  selectionGuideGroup=new THREE.Group();selectionGuideGroup.name='WorldForgePlacementGuides';
  const fp=rec.asset?.footprint||{width:1,depth:1},sc=rec.scale||1,w=(fp.width||1)*sc,d=(fp.depth||1)*sc,a=rec.rotation||0,c=Math.cos(a),si=Math.sin(a),z=(rec.position?.[2]||0)+.035;
  const local=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([x,y])=>[x*c-y*si+(rec.position?.[0]||0),x*si+y*c+(rec.position?.[1]||0),z]);
  const footprintGeom=new THREE.BufferGeometry().setFromPoints([...local,local[0]].map(v=>new THREE.Vector3(...v)));selectionGuideGroup.add(new THREE.Line(footprintGeom,new THREE.LineBasicMaterial({color:0xf4d35e})));
  const px=rec.position?.[0]||0,py=rec.position?.[1]||0;const crossPts=[[px-.25,py,z+.02],[px+.25,py,z+.02],[px,py-.25,z+.02],[px,py+.25,z+.02]].map(v=>new THREE.Vector3(...v));
  const crossGeom=new THREE.BufferGeometry().setFromPoints(crossPts);const crossMat=new THREE.LineBasicMaterial({color:0x57c7ff});selectionGuideGroup.add(new THREE.LineSegments(crossGeom,crossMat));
  for(const cn of worldTraversalConnections(rec)){const m=new THREE.Mesh(new THREE.SphereGeometry(.12,8,6),new THREE.MeshBasicMaterial({color:0xff6b6b}));m.position.set(...cn.position);selectionGuideGroup.add(m);}
  scene.add(selectionGuideGroup);
}
function updateSelectedUi(){
  const el=$('selectedAsset');if(!el)return;
  const p=placementRecord(selectedPlacementId);
  el.textContent=p?`${p.label} · ${p.recipe.type}${p.recipe.family?` / ${p.recipe.family}`:''} · xyz ${(p.position?.[0]||0).toFixed(2)}, ${(p.position?.[1]||0).toFixed(2)}, ${(p.position?.[2]||0).toFixed(2)} · seed ${p.recipe.seed}`:'Tap an asset in the field to select it';
  for(const id of ['fieldPosX','fieldPosY','fieldPosZ','fieldRotDeg']){const q=$(id);if(q)q.disabled=!p;}
  if(p){$('fieldPosX').value=(p.position?.[0]||0).toFixed(2);$('fieldPosY').value=(p.position?.[1]||0).toFixed(2);$('fieldPosZ').value=(p.position?.[2]||0).toFixed(2);$('fieldRotDeg').value=((p.rotation||0)*180/Math.PI).toFixed(1);}
  else{for(const id of ['fieldPosX','fieldPosY','fieldPosZ','fieldRotDeg'])if($(id))$(id).value='';}
}
function selectPlacement(id){
  const rec=placementRecord(id);if(!rec||rec.selectable===false)return;
  selectedPlacementId=id;updateSelectionHelper();updateSelectedUi();
}
function cloneJson(v){return JSON.parse(JSON.stringify(v));}
function editField(mutator){
  if(!isCompositeMode()||!currentSpec?.recipe?.placements||!selectedPlacementId)return;
  const r=cloneJson(currentSpec.recipe),p=r.placements.find(x=>x.id===selectedPlacementId);if(!p)return;
  if(mutator(p,r)===false)return;
  renderRecipe(r,{resetCamera:false});
}
function editorStep(){return Math.max(.01,Number($('fieldNudgeStep')?.value)||.25);}
function rotationSnapDeg(){return Math.max(1,Number($('fieldRotationSnap')?.value)||15);}
function nudge(dx,dy){const step=editorStep();editField(p=>{p.position[0]+=dx*step;p.position[1]+=dy*step;});}
function placementVisualLevel(rec){
  if(!rec)return 0;
  const ws=rec.asset?.traversal?.walkSurfaces?.[0];
  const local=ws?.z??ws?.z1??0;
  const z=(rec.position?.[2]||0)+local*(rec.scale||1);
  return z<.65?0:z<3.5?1:2;
}
function applyLevelFilter(){
  if(!isCompositeMode()||!currentGroup)return;
  const groups=currentGroup.userData?.placementGroups;
  if(!groups)return;
  for(const [id,g] of groups.entries()){
    const rec=placementRecord(id);
    const always=rec?.recipe?.type==='surface';
    g.visible=fieldLevelView==='all'||always||placementVisualLevel(rec)===Number(fieldLevelView);
  }
  document.querySelectorAll('[data-level-view]').forEach(b=>b.classList.toggle('active',String(b.dataset.levelView)===String(fieldLevelView)));
}

let pointerDown=null;
renderer.domElement.addEventListener('pointerdown',e=>{pointerDown={x:e.clientX,y:e.clientY};});
renderer.domElement.addEventListener('pointerup',e=>{
  if(!isCompositeMode()||!currentGroup||!pointerDown)return;
  const moved=Math.hypot(e.clientX-pointerDown.x,e.clientY-pointerDown.y);pointerDown=null;if(moved>8)return;
  const rect=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-rect.left)/rect.width)*2-1;pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;raycaster.setFromCamera(pointer,camera);
  const hits=raycaster.intersectObject(currentGroup,true);for(const h of hits){let o=h.object,id=o.userData?.placementId;while(!id&&o.parent&&o!==currentGroup){o=o.parent;id=o.userData?.placementId;}if(id){selectPlacement(id);return;}}
});


function pixelCharacterTexture(dir='S'){
  const c=document.createElement('canvas');c.width=24;c.height=32;const x=c.getContext('2d');x.imageSmoothingEnabled=false;x.clearRect(0,0,24,32);
  const skin='#d6a06c',hair='#3e2a22',shirt='#276b87',trim='#d8c26b',pants='#3b3e52',boot='#2a211e';
  x.fillStyle='rgba(0,0,0,.25)';x.fillRect(7,29,10,2);
  x.fillStyle=boot;x.fillRect(7,25,4,5);x.fillRect(13,25,4,5);
  x.fillStyle=pants;x.fillRect(7,20,10,6);
  x.fillStyle=shirt;x.fillRect(5,12,14,9);x.fillStyle=trim;x.fillRect(5,17,14,2);
  x.fillStyle=skin;x.fillRect(8,5,8,8);x.fillStyle=hair;x.fillRect(7,4,10,4);x.fillRect(7,7,2,4);x.fillRect(15,7,2,4);
  if(['S','SE','SW'].includes(dir)){x.fillStyle='#1b1b1b';x.fillRect(10,8,1,1);x.fillRect(13,8,1,1);}
  if(dir==='N'){x.fillStyle=hair;x.fillRect(8,8,8,5);}
  if(dir==='E'||dir==='NE'||dir==='SE'){x.fillStyle=skin;x.fillRect(16,8,2,2);}
  if(dir==='W'||dir==='NW'||dir==='SW'){x.fillStyle=skin;x.fillRect(6,8,2,2);}
  const tex=new THREE.CanvasTexture(c);tex.magFilter=THREE.NearestFilter;tex.minFilter=THREE.NearestFilter;tex.generateMipmaps=false;return tex;
}
function ensureCharacter(){
  if(characterSprite)return characterSprite;
  const mat=new THREE.SpriteMaterial({map:pixelCharacterTexture(characterDir),transparent:true,alphaTest:.05,depthTest:true,depthWrite:false});
  characterSprite=new THREE.Sprite(mat);characterSprite.name='WorldForgeCharacterPreview';characterSprite.scale.set(1.5,2.05,1);characterSprite.center.set(.5,0);scene.add(characterSprite);
  const shadowMat=new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.22,depthWrite:false});
  characterShadow=new THREE.Mesh(new THREE.CircleGeometry(.26,14),shadowMat);characterShadow.name='WorldForgeCharacterShadow';characterShadow.position.z=.02;scene.add(characterShadow);
  return characterSprite;
}
function hideCharacter(){if(characterSprite)characterSprite.visible=false;if(characterShadow)characterShadow.visible=false;updatePlacementOcclusion();}
function sampleCharacterSpawn(){
  const spawn=currentSpec?.metadata?.characterSpawn||currentSpec?.recipe?.characterSpawn||[0,-3,.12];
  return [Number(spawn[0])||0,Number(spawn[1])||0,Number(spawn[2])||0.12];
}
function sampleCharacterZ(x,y){
  const transitions=currentSpec?.metadata?.walkTransitions||[];
  for(const t of transitions){const b=t.bounds||[];if(b.length===4&&x>=b[0]&&x<=b[2]&&y>=b[1]&&y<=b[3]){const v=t.axis==='x'?x:y,den=(t.to-t.from)||1,q=Math.max(0,Math.min(1,(v-t.from)/den));return t.z0+(t.z1-t.z0)*q;}}
  const zones=currentSpec?.metadata?.walkZones||[];let best=0;
  for(const z of zones){const b=z.bounds||[];if(b.length===4&&x>=b[0]&&x<=b[2]&&y>=b[1]&&y<=b[3])best=Math.max(best,Number(z.z)||0);}
  return best;
}
function characterBlocked(x,y,z){
  const records=currentSpec?.metadata?.placements||[];
  for(const p of records){if(p.recipe?.type!=='building')continue;if(Math.abs((p.position?.[2]||0)-z)>1.2)continue;
    const fp=p.asset?.footprint||{width:1,depth:1},a=p.rotation||0,c=Math.abs(Math.cos(a)),si=Math.abs(Math.sin(a)),w=(fp.width*c+fp.depth*si)*(p.scale||1)*.88,d=(fp.width*si+fp.depth*c)*(p.scale||1)*.88;
    if(Math.abs(x-(p.position?.[0]||0))<w/2&&Math.abs(y-(p.position?.[1]||0))<d/2)return true;
  }return false;
}
function syncCharacterVisual(){
  if(!characterSprite?.visible)return;
  characterSprite.position.set(characterPos[0],characterPos[1],characterPos[2]+.06);
  if(characterShadow){characterShadow.visible=true;characterShadow.position.set(characterPos[0],characterPos[1],characterPos[2]+.02);}
  updatePlacementOcclusion();
}
function resetCharacter(){
  if(mode!=='settlement'||$('characterPreview')?.checked===false){hideCharacter();return;}
  ensureCharacter();const spawn=sampleCharacterSpawn();characterPos=[spawn[0],spawn[1],sampleCharacterZ(spawn[0],spawn[1])];characterSprite.visible=true;syncCharacterVisual();
}
function updateCharacterDirection(dx,dy){
  characterDir=Math.abs(dx)>Math.abs(dy)?(dx>0?'E':'W'):(dy>0?'N':'S');
  if(Math.abs(dx)>.2&&Math.abs(dy)>.2)characterDir=(dy>0?'N':'S')+(dx>0?'E':'W');
  if(characterSprite){const old=characterSprite.material.map;characterSprite.material.map=pixelCharacterTexture(characterDir);characterSprite.material.needsUpdate=true;old?.dispose?.();}
}
function moveCharacter(dx,dy){
  if(mode!=='settlement'||!currentSpec)return;const c=ensureCharacter();if(!c.visible)resetCharacter();
  const step=.48,nx=characterPos[0]+dx*step,ny=characterPos[1]+dy*step,half=(currentSpec.recipe.size||52)*.49;
  if(Math.abs(nx)>half||Math.abs(ny)>half)return;const nz=sampleCharacterZ(nx,ny);if(characterBlocked(nx,ny,nz))return;
  updateCharacterDirection(dx,dy);characterPos=[nx,ny,nz];syncCharacterVisual();
}
function centerCharacter(){if(!characterSprite?.visible)return;controls.target.set(characterPos[0],characterPos[1],characterPos[2]+1);camera.position.set(characterPos[0]+playtestCameraOffset.x,characterPos[1]+playtestCameraOffset.y,characterPos[2]+playtestCameraOffset.z);camera.lookAt(controls.target);controls.update();}
function setCharacterSpawnFromCurrent(){
  if(mode!=='settlement'||!currentSpec)return;
  settlementCharacterSpawnOverride=[Number(characterPos[0].toFixed(2)),Number(characterPos[1].toFixed(2)),Number(characterPos[2].toFixed(2))];
  currentSpec.recipe.characterSpawn=[...settlementCharacterSpawnOverride];
  if(currentSpec.metadata)currentSpec.metadata.characterSpawn=[...settlementCharacterSpawnOverride];
  $('status').textContent=`Character spawn set to ${settlementCharacterSpawnOverride.join(', ')}`;
}
function updatePlacementOcclusion(){
  if(!currentGroup?.userData?.placementGroups)return;
  const groups=currentGroup.userData.placementGroups;
  for(const [id,g] of groups.entries()){
    const rec=placementRecord(id);let target=1;
    if(mode==='settlement'&&characterSprite?.visible&&rec?.recipe?.type==='building'){
      const box=new THREE.Box3().setFromObject(g),cx=(box.min.x+box.max.x)/2,cy=(box.min.y+box.max.y)/2;
      const withinX=characterPos[0]>=box.min.x-.5&&characterPos[0]<=box.max.x+.5;
      const withinY=characterPos[1]>=box.min.y-.5&&characterPos[1]<=box.max.y+.65;
      if(withinX&&withinY&&characterPos[1]>=cy-.35)target=.32;
    }
    g.traverse(o=>{if(!o.material)return;const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){m.transparent=target<.999;m.opacity=target;}});
  }
}

function vehicleAspect(){const host=$('canvasHost');return Math.max(.5,host.clientWidth/Math.max(1,host.clientHeight));}
function updateVehicleUi(info=vehicleBaker.sourceInfo){
  if(!info){$('vehicleSourceName').textContent='No vehicle loaded';$('vehicleStats').textContent='Generate a low-poly vehicle, import a GLB, or load the included BTR benchmark.';return;}
  $('vehicleSourceName').textContent=info.generatedInfo?.label?`${info.generatedInfo.label} · seed ${info.generatedInfo.seed}`:info.name;
  const generated=info.generatedInfo?` · ${info.generatedInfo.style} / ${info.generatedInfo.palette}`:'';
  $('vehicleStats').textContent=`${info.meshCount.toLocaleString()} meshes · ~${info.triangleCount.toLocaleString()} tris${generated} · source ${info.sourceDimensions.x} × ${info.sourceDimensions.y} × ${info.sourceDimensions.z}`;
}
function vehicleForgeRecipe(){return {type:$('vehicleArchetype').value,seed:+$('vehicleSeed').value||48127,style:$('vehicleStyle').value,palette:$('vehiclePalette').value};}
function generateVehicleFromUi(){
  const recipe=vehicleForgeRecipe();const result=generateLowPolyVehicle(recipe);const name=`vf_${recipe.type}_${recipe.seed}.glb`;
  const info=vehicleBaker.installGenerated(result.group,name,{generatedRecipe:result.recipe,generatedInfo:result.info});
  $('vehicleForwardOffset').value='0';vehicleBaker.setForwardOffset(0);setVehicleDirection(+$('vehicleDirection').value||0);vehicleBaker.fitPreview(vehicleAspect());updateVehicleUi(info);
  $('status').textContent=`Vehicle Forge ${VEHICLE_GENERATOR_VERSION} · ${result.info.label} generated · ${info.meshCount} meshes · ~${info.triangleCount.toLocaleString()} tris.`;
}
async function loadVehicleBenchmark(){
  $('status').textContent='Loading included BTR-82 benchmark…';
  try{const info=await vehicleBaker.loadURL('assets/low_poly_btr_82.glb','low_poly_btr_82.glb');$('vehicleForwardOffset').value='-90';updateVehicleUi(info);vehicleBaker.setForwardOffset(-90);vehicleBaker.setDirection(+$('vehicleDirection').value||0);vehicleBaker.fitPreview(vehicleAspect());$('status').textContent=`Vehicle Baker ${VEHICLE_BAKER_VERSION} ready · BTR benchmark loaded · ${info.meshCount} meshes · ~${info.triangleCount.toLocaleString()} tris.`;}
  catch(err){$('status').textContent='Vehicle load failed: '+err.message;}
}
async function activateVehicleMode(){
  showMode('vehicle');
  if(!vehicleBaker.hasModel())generateVehicleFromUi();else{vehicleBaker.shadowCatcher.visible=$('vehicleShadow').checked;vehicleBaker.fitPreview(vehicleAspect());updateVehicleUi();$('status').textContent=`Vehicle Baker ${VEHICLE_BAKER_VERSION} ready.`;}
}
function setVehicleDirection(index){
  index=((Number(index)||0)%8+8)%8;$('vehicleDirection').value=String(index);vehicleBaker.setDirection(index);
  document.querySelectorAll('[data-vehicle-dir]').forEach(b=>b.classList.toggle('active',Number(b.dataset.vehicleDir)===index));
}
function vehicleMetaBlob(){const frame=+$('vehicleFrameSize').value||128;const meta=vehicleBaker.metadata(frame,$('vehicleShadow').checked);return new Blob([JSON.stringify(meta,null,2)],{type:'application/json'});}

function download(blob,name){const a=document.createElement('a');const url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
function recipeName(){return `worldforge_${mode}_${currentSpec?.recipe?.seed||$('seed').value}`;}

$('generate').onclick=regenerate;
$('randomize').onclick=()=>{$('seed').value=crypto.getRandomValues(new Uint32Array(1))[0]%1000000;regenerate();};
$('exportGLB').onclick=()=>{if(!currentGroup)return;new GLTFExporter().parse(currentGroup,r=>download(new Blob([r],{type:'model/gltf-binary'}),recipeName()+'.glb'),e=>$('status').textContent='GLB export failed: '+e,{binary:true,onlyVisible:true});};
$('exportJSON').onclick=()=>download(new Blob([JSON.stringify(currentSpec.recipe,null,2)],{type:'application/json'}),recipeName()+'.recipe.json');
$('exportScene').onclick=()=>download(new Blob([JSON.stringify(currentSpec,null,2)],{type:'application/json'}),recipeName()+'.scene.json');
$('exportAsset').onclick=()=>download(new Blob([JSON.stringify(currentSpec.asset,null,2)],{type:'application/json'}),recipeName()+'.asset.json');
$('exportProduction').onclick=()=>download(new Blob([JSON.stringify(currentSpec.production,null,2)],{type:'application/json'}),recipeName()+'.production.json');
$('upgradeScene').onclick=()=>$('sceneUpgradeFile').click();
$('sceneUpgradeFile').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{const oldSpec=JSON.parse(await file.text());const upgraded=enrichExistingScene(oldSpec);const base=(file.name||'worldforge-scene').replace(/\.scene\.json$|\.json$/i,'');download(new Blob([JSON.stringify(upgraded.production,null,2)],{type:'application/json'}),base+'.production.json');download(new Blob([JSON.stringify(upgraded,null,2)],{type:'application/json'}),base+'.upgraded.scene.json');$('status').textContent=`Upgraded old scene metadata · ${upgraded.production?.sockets?.length??upgraded.production?.placements?.length??0} production records · geometry unchanged.`;}catch(err){$('status').textContent='Scene upgrade failed: '+err.message;}e.target.value='';};
$('exportPNG').onclick=()=>renderer.domElement.toBlob(b=>download(b,recipeName()+'.png'));
$('importRecipe').onclick=()=>$('recipeFile').click();
$('recipeFile').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{writeRecipe(JSON.parse(await file.text()));$('status').textContent='Recipe imported.';}catch(err){$('status').textContent='Invalid recipe: '+err.message;}e.target.value='';};

$('saveProject').onclick=async()=>{if(!currentSpec)return;const name=prompt('Project name',`${mode} ${currentSpec.recipe.seed}`);if(!name)return;const id=`${mode}-${currentSpec.recipe.seed}-${Date.now()}`;await saveProject({id,name,recipe:currentSpec.recipe,updatedAt:new Date().toISOString()});await refreshProjects();$('status').textContent=`Saved ${name} locally in this browser.`;};
$('loadProject').onclick=async()=>{const id=$('projectSelect').value;if(!id)return;const p=await getProject(id);if(p)writeRecipe(p.recipe);};
$('deleteProject').onclick=async()=>{const id=$('projectSelect').value;if(!id)return;await deleteProject(id);await refreshProjects();$('status').textContent='Local project deleted.';};
async function refreshProjects(){try{const items=await listProjects();$('projectSelect').innerHTML='<option value="">Saved projects…</option>'+items.map(p=>`<option value="${p.id}">${escapeHtml(p.name)} · ${p.recipe.type} · ${p.recipe.seed}</option>`).join('');}catch{$('projectSelect').innerHTML='<option value="">Local storage unavailable</option>';}}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}

$('vehicleGenerate').onclick=generateVehicleFromUi;
$('vehicleRandomize').onclick=()=>{$('vehicleSeed').value=crypto.getRandomValues(new Uint32Array(1))[0]%1000000;generateVehicleFromUi();};
$('vehicleArchetype').onchange=generateVehicleFromUi;
$('vehicleStyle').onchange=generateVehicleFromUi;
$('vehiclePalette').onchange=generateVehicleFromUi;
$('vehicleExportRecipe').onclick=()=>{const recipe=vehicleBaker.sourceInfo?.generatedRecipe;if(!recipe)return $('status').textContent='The current vehicle is imported; generate a Vehicle Forge asset first.';download(new Blob([JSON.stringify(recipe,null,2)],{type:'application/json'}),`vehicle_${recipe.type}_${recipe.seed}.recipe.json`);};
$('vehicleExportGLB').onclick=()=>{const obj=vehicleBaker.canonicalObject();if(!obj)return $('status').textContent='Load or generate a vehicle first.';const base=(vehicleBaker.sourceName||'vehicle').replace(/\.(glb|gltf)$/i,'');new GLTFExporter().parse(obj,r=>{download(new Blob([r],{type:'model/gltf-binary'}),`${base}.glb`);$('status').textContent='Vehicle GLB exported.';},e=>$('status').textContent='Vehicle GLB export failed: '+e,{binary:true,onlyVisible:true});};

$('vehicleLoadBenchmark').onclick=loadVehicleBenchmark;
$('vehicleImport').onclick=()=>$('vehicleFile').click();
$('vehicleFile').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;$('status').textContent=`Loading ${file.name}…`;try{const info=await vehicleBaker.loadFile(file);$('vehicleForwardOffset').value='0';updateVehicleUi(info);vehicleBaker.setForwardOffset(0);setVehicleDirection(+$('vehicleDirection').value||0);vehicleBaker.fitPreview(vehicleAspect());$('status').textContent=`Loaded ${file.name} · ${info.meshCount} meshes · ~${info.triangleCount.toLocaleString()} tris. Adjust forward offset if its nose is not aligned.`;}catch(err){$('status').textContent='Vehicle import failed: '+err.message;}e.target.value='';};
$('vehicleDirection').onchange=()=>setVehicleDirection(+$('vehicleDirection').value||0);
$('vehicleForwardOffset').oninput=()=>{vehicleBaker.setForwardOffset(+$('vehicleForwardOffset').value||0);setVehicleDirection(+$('vehicleDirection').value||0);};
$('vehicleShadow').onchange=()=>{vehicleBaker.shadowCatcher.visible=mode==='vehicle'&&vehicleBaker.hasModel()&&$('vehicleShadow').checked;};
$('vehicleResetCamera').onclick=()=>vehicleBaker.fitPreview(vehicleAspect());
$('vehicleExportMeta').onclick=()=>{if(!vehicleBaker.hasModel())return $('status').textContent='Load a GLB vehicle first.';const base=(vehicleBaker.sourceName||'vehicle').replace(/\.(glb|gltf)$/i,'');download(vehicleMetaBlob(),`${base}.vehicle.json`);$('status').textContent='Vehicle metadata exported.';};
document.querySelectorAll('[data-vehicle-dir]').forEach(b=>b.onclick=()=>setVehicleDirection(+b.dataset.vehicleDir));
$('vehicleBake').onclick=async()=>{if(!vehicleBaker.hasModel())return $('status').textContent='Load a GLB vehicle first.';const btn=$('vehicleBake');btn.disabled=true;$('status').textContent='Baking 8 deterministic vehicle directions…';try{const result=await vehicleBaker.bakeSpriteSheet({frameSize:+$('vehicleFrameSize').value||128,includeShadow:$('vehicleShadow').checked});download(result.blob,`${result.baseName}_8dir_${result.metadata.frame.width}px.png`);$('status').textContent=`Baked 8 directions · ${result.metadata.frame.width}px frames · transparent PNG. Use EXPORT META JSON for the matching metadata file.`;vehicleBaker.fitPreview(vehicleAspect());}catch(err){$('status').textContent='Vehicle bake failed: '+err.message;}finally{btn.disabled=false;}};

$('buildingEngine').onchange=()=>{syncBuildingEngineUI();regenerate();};
document.querySelectorAll('.tab').forEach(b=>b.onclick=async()=>{const next=b.dataset.mode;if(next==='vehicle')await activateVehicleMode();else{showMode(next);regenerate();}});
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
document.querySelectorAll('[data-nudge]').forEach(b=>b.onclick=()=>{const [x,y]=b.dataset.nudge.split(',').map(Number);nudge(x,y);});
$('fieldLevelDown').onclick=()=>{const step=editorStep();editField(p=>{if(!p.locked)p.position[2]=(p.position[2]||0)-step;});};
$('fieldLevelUp').onclick=()=>{const step=editorStep();editField(p=>{if(!p.locked)p.position[2]=(p.position[2]||0)+step;});};
$('fieldRotateLeft').onclick=()=>{const step=rotationSnapDeg()*Math.PI/180;editField(p=>{p.rotation=(p.rotation||0)-step;});};
$('fieldRotateRight').onclick=()=>{const step=rotationSnapDeg()*Math.PI/180;editField(p=>{p.rotation=(p.rotation||0)+step;});};
$('fieldApplyTransform').onclick=()=>editField(p=>{p.position=[Number($('fieldPosX').value)||0,Number($('fieldPosY').value)||0,Number($('fieldPosZ').value)||0];p.rotation=(Number($('fieldRotDeg').value)||0)*Math.PI/180;});
$('fieldSnapGrid').onclick=()=>{const step=editorStep();editField(p=>{p.position[0]=snapScalar(p.position?.[0]||0,step);p.position[1]=snapScalar(p.position?.[1]||0,step);});};
$('fieldSnapRotation').onclick=()=>editField(p=>{p.rotation=snapRotationRadians(p.rotation||0,rotationSnapDeg());});
$('fieldSnapLevel').onclick=()=>{const levels=currentSpec?.metadata?.walkGraph?.levels||[0];editField(p=>{p.position[2]=nearestLevel(p.position?.[2]||0,levels);});};
$('fieldSnapGround').onclick=()=>editField(p=>{p.position[2]=0;});
$('fieldSnapEdge').onclick=()=>{const selected=placementRecord(selectedPlacementId),others=(currentSpec?.metadata?.placements||[]).filter(r=>r.id!==selectedPlacementId&&r.selectable!==false&&r.recipe?.type!=='surface'&&r.recipe?.type!=='foliage');const adj=nearestEdgeAdjustment(selected,others,0);if(!adj)return;editField(p=>{if(adj.axis==='x')p.position[0]+=adj.delta;else p.position[1]+=adj.delta;});};
$('fieldShowGuides').onchange=()=>updateSelectionHelper();
$('fieldDuplicate').onclick=()=>editField((p,r)=>{const n=r.placements.filter(x=>x.id.startsWith(p.id+'_copy')).length+1,c=cloneJson(p);c.id=`${p.id}_copy${n}`;c.label=`${p.label} Copy`;c.position[0]+=1;c.position[1]-=1;c.locked=false;c.selectable=true;r.placements.push(c);selectedPlacementId=c.id;});
$('fieldRegenerateAsset').onclick=()=>editField(p=>{p.recipe.seed=((Number(p.recipe.seed)||1)+104729)%1000000;});
$('fieldDeleteAsset').onclick=()=>editField((p,r)=>{if(p.locked)return false;r.placements=r.placements.filter(x=>x.id!==p.id);selectedPlacementId=null;});
$('fieldClearSelection').onclick=()=>{selectedPlacementId=null;updateSelectionHelper();updateSelectedUi();};
$('fieldCenterSelection').onclick=()=>{const obj=placementObject(selectedPlacementId);if(!obj)return;const box=new THREE.Box3().setFromObject(obj),c=new THREE.Vector3();box.getCenter(c);controls.target.copy(c);camera.lookAt(c);controls.update();};
document.querySelectorAll('[data-level-view]').forEach(b=>b.onclick=()=>{fieldLevelView=b.dataset.levelView;applyLevelFilter();updateSelectionHelper();});


$('characterPreview').onchange=()=>{if($('characterPreview').checked)resetCharacter();else hideCharacter();};
$('characterReset').onclick=resetCharacter;$('characterCenter').onclick=centerCharacter;$('characterPadReset').onclick=resetCharacter;
$('playtestToggle').onclick=()=>setPlaytest(!playtestActive);$('playtestExit').onclick=()=>setPlaytest(false);
$('walkDebugToggle').onclick=()=>$('characterPreview').checked?setWalkDebugEnabled(!walkDebugEnabled):null;$('playtestHudDebug').onclick=()=>$('characterPreview').checked?setWalkDebugEnabled(!walkDebugEnabled):null;
$('followCameraToggle').onclick=()=>{followCameraEnabled=!followCameraEnabled;syncPlaytestButtons();};$('playtestHudFollow').onclick=()=>{followCameraEnabled=!followCameraEnabled;syncPlaytestButtons();};
$('characterSetSpawn').onclick=setCharacterSpawnFromCurrent;$('playtestHudSpawn').onclick=setCharacterSpawnFromCurrent;
$('playtestHudReset').onclick=resetCharacter;
document.querySelectorAll('[data-char-move]').forEach(b=>b.onclick=()=>{const [x,y]=b.dataset.charMove.split(',').map(Number);moveCharacter(x,y);});
document.querySelectorAll('[data-play-move]').forEach(b=>b.onclick=()=>{const [x,y]=b.dataset.playMove.split(',').map(Number);moveCharacter(x,y);});
document.querySelectorAll('[data-play-reset]').forEach(b=>b.onclick=resetCharacter);
window.addEventListener('keydown',e=>{if(mode!=='settlement'||['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;const m={ArrowUp:[0,1],w:[0,1],W:[0,1],ArrowDown:[0,-1],s:[0,-1],S:[0,-1],ArrowLeft:[-1,0],a:[-1,0],A:[-1,0],ArrowRight:[1,0],d:[1,0],D:[1,0],q:[-1,1],Q:[-1,1],e:[1,1],E:[1,1],z:[-1,-1],Z:[-1,-1],c:[1,-1],C:[1,-1]}[e.key];if(m){e.preventDefault();moveCharacter(...m);} if(e.key==='p'||e.key==='P'){e.preventDefault();setPlaytest(!playtestActive);} if(e.key==='g'||e.key==='G'){e.preventDefault();setWalkDebugEnabled(!walkDebugEnabled);}});

const outputMap={traversalWidth:'traversalWidthOut',traversalLength:'traversalLengthOut',traversalHeight:'traversalHeightOut',foliageScale:'foliageScaleOut',foliageDensity:'foliageDensityOut',foliageSpread:'foliageSpreadOut',width:'widthOut',depth:'depthOut',floors:'floorsOut',pitch:'pitchOut',terrainSize:'terrainSizeOut',relief:'reliefOut',roughness:'roughnessOut',terracing:'terracingOut',gridResolution:'gridResolutionOut',propScale:'propScaleOut',patchSize:'patchSizeOut',patchRoughness:'patchRoughnessOut',pathWidth:'pathWidthOut',wear:'wearOut',patchResolution:'patchResolutionOut',surfaceSize:'surfaceSizeOut',surfaceVariation:'surfaceVariationOut',surfaceWear:'surfaceWearOut',surfacePathWidth:'surfacePathWidthOut',surfaceDetailDensity:'surfaceDetailDensityOut',surfaceResolution:'surfaceResolutionOut',fieldSize:'fieldSizeOut',fieldDensity:'fieldDensityOut',fieldDressing:'fieldDressingOut',fieldElevation:'fieldElevationOut',settlementSize:'settlementSizeOut',settlementBuildingCount:'settlementBuildingCountOut',settlementDensity:'settlementDensityOut',settlementDressing:'settlementDressingOut',settlementElevation:'settlementElevationOut'};
function syncOutputs(){for(const [id,outId] of Object.entries(outputMap)){const el=$(id),out=$(outId);if(el&&out)out.value=el.value;}}
for(const id of Object.keys(outputMap)){const el=$(id);if(el)el.oninput=()=>syncOutputs();}syncOutputs();
function resize(){const host=$('canvasHost'),w=Math.max(320,Math.floor(host.clientWidth)),h=Math.max(220,Math.floor(host.clientHeight));renderer.setSize(w,h,false);if(mode==='vehicle')vehicleBaker.fitPreview(w/Math.max(1,h));else fitCamera(currentSpec?spanFor(currentSpec.recipe):10);}window.addEventListener('resize',resize);
syncBuildingEngineUI();resize();refreshProjects();regenerate();syncPlaytestButtons();
(function animate(){requestAnimationFrame(animate);if(playtestActive&&followCameraEnabled&&characterSprite?.visible){const target=new THREE.Vector3(characterPos[0],characterPos[1],characterPos[2]+1);controls.target.lerp(target,.16);const desired=target.clone().add(playtestCameraOffset);camera.position.lerp(desired,.14);camera.lookAt(controls.target);}controls.update();renderer.render(scene,camera);})();
