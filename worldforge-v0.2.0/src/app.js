import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { generateScene } from './generators/index.js';
import { normalizeRecipe } from './core/recipe.js';
import { sceneSpecToThree, disposeThreeGroup } from './adapters/three-adapter.js';
import { saveProject, listProjects, getProject, deleteProject } from './storage/project-store.js';
import { WORLDFORGE_VERSION } from './core/schema.js';

const $=id=>document.getElementById(id);
let mode='building', currentGroup=null, currentSpec=null;

const scene=new THREE.Scene();scene.background=new THREE.Color(0x0d1310);scene.fog=new THREE.Fog(0x0d1310,45,115);
const camera=new THREE.OrthographicCamera(-12,12,8,-8,.1,300);camera.position.set(15,-18,13);camera.lookAt(0,0,2);
const renderer=new THREE.WebGLRenderer({antialias:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(1.25,devicePixelRatio||1));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;$('canvasHost').appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.target.set(0,0,2);
scene.add(new THREE.HemisphereLight(0xcfe0ff,0x4e4a3f,1.3));const sun=new THREE.DirectionalLight(0xffe6bd,2.6);sun.position.set(-12,-16,22);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.MeshStandardMaterial({color:0x536849,roughness:1}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);const grid=new THREE.GridHelper(80,80,0x34443a,0x243029);grid.position.y=.01;scene.add(grid);
$('version').textContent='v'+WORLDFORGE_VERSION;

function readRecipe(){
  if(mode==='landscape')return normalizeRecipe({type:'landscape',seed:+$('seed').value,feature:$('feature').value,size:+$('terrainSize').value,relief:+$('relief').value,roughness:+$('roughness').value,terracing:+$('terracing').value,path:$('path').checked,rocks:$('rocks').checked,gridResolution:+$('gridResolution').value});
  return normalizeRecipe({type:'building',seed:+$('seed').value,family:$('family').value,style:$('style').value,material:$('material').value,condition:$('condition').value,width:+$('width').value,depth:+$('depth').value,floors:+$('floors').value,roof:$('roof').value,pitch:+$('pitch').value,features:{chimney:$('chimney').checked,porch:$('porch').checked,sign:$('sign').checked,extension:$('extension').checked}});
}

function writeRecipe(recipe){
  const r=normalizeRecipe(recipe);mode=r.type;document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.mode===mode));$('buildingPanel').hidden=mode!=='building';$('landscapePanel').hidden=mode!=='landscape';$('seed').value=r.seed;
  if(mode==='building'){for(const [id,key] of [['family','family'],['style','style'],['material','material'],['condition','condition'],['roof','roof']])$(id).value=r[key];for(const [id,key] of [['width','width'],['depth','depth'],['floors','floors'],['pitch','pitch']])$(id).value=r[key];for(const key of ['chimney','porch','sign','extension'])$(key).checked=!!r.features[key];}
  else{for(const [id,key] of [['feature','feature'],['terrainSize','size'],['relief','relief'],['roughness','roughness'],['terracing','terracing'],['gridResolution','gridResolution']])$(id).value=r[key];$('path').checked=!!r.path;$('rocks').checked=!!r.rocks;}
  syncOutputs();regenerate();
}

function regenerate(){
  if(currentGroup){scene.remove(currentGroup);disposeThreeGroup(currentGroup);}
  const recipe=readRecipe();currentSpec=generateScene(recipe);currentGroup=sceneSpecToThree(currentSpec);scene.add(currentGroup);$('seedLabel').textContent='SEED '+recipe.seed;$('modeLabel').textContent=mode.toUpperCase();fitCamera(mode==='landscape'?Math.max(20,recipe.size*.7):10);
  const v=currentSpec.validation;$('status').textContent=v.errors.length?`Validation failed: ${v.errors.join('; ')}`:`Generated ${mode} · ${v.stats.nodeCount} nodes · ~${v.stats.approxTriangleCount.toLocaleString()} tris`;
  $('validation').textContent=v.errors.length?'ERROR':v.warnings.length?`${v.warnings.length} WARN`:'VALID';$('validation').dataset.state=v.errors.length?'bad':v.warnings.length?'warn':'good';
}
function fitCamera(span){const aspect=Math.max(.5,$('canvasHost').clientWidth/Math.max(1,$('canvasHost').clientHeight));camera.left=-span*aspect;camera.right=span*aspect;camera.top=span;camera.bottom=-span;camera.updateProjectionMatrix();controls.target.set(0,0,mode==='building'?2.2:1.5);}
function setView(v){if(v==='field')camera.position.set(15,-18,13);else if(v==='front')camera.position.set(0,-24,4.5);else if(v==='side')camera.position.set(24,0,4.5);else return;camera.lookAt(controls.target);controls.update();}
function download(blob,name){const a=document.createElement('a');const url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
function recipeName(){return `worldforge_${mode}_${currentSpec?.recipe?.seed||$('seed').value}`;}

$('generate').onclick=regenerate;
$('randomize').onclick=()=>{$('seed').value=crypto.getRandomValues(new Uint32Array(1))[0]%1000000;regenerate();};
$('exportGLB').onclick=()=>{if(!currentGroup)return;new GLTFExporter().parse(currentGroup,r=>download(new Blob([r],{type:'model/gltf-binary'}),recipeName()+'.glb'),e=>$('status').textContent='GLB export failed: '+e,{binary:true,onlyVisible:true});};
$('exportJSON').onclick=()=>download(new Blob([JSON.stringify(currentSpec.recipe,null,2)],{type:'application/json'}),recipeName()+'.recipe.json');
$('exportScene').onclick=()=>download(new Blob([JSON.stringify(currentSpec,null,2)],{type:'application/json'}),recipeName()+'.scene.json');
$('exportPNG').onclick=()=>renderer.domElement.toBlob(b=>download(b,recipeName()+'.png'));
$('importRecipe').onclick=()=>$('recipeFile').click();
$('recipeFile').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{writeRecipe(JSON.parse(await file.text()));$('status').textContent='Recipe imported.';}catch(err){$('status').textContent='Invalid recipe: '+err.message;}e.target.value='';};

$('saveProject').onclick=async()=>{if(!currentSpec)return;const name=prompt('Project name',`${mode} ${currentSpec.recipe.seed}`);if(!name)return;const id=`${mode}-${currentSpec.recipe.seed}-${Date.now()}`;await saveProject({id,name,recipe:currentSpec.recipe,updatedAt:new Date().toISOString()});await refreshProjects();$('status').textContent=`Saved ${name} locally in this browser.`;};
$('loadProject').onclick=async()=>{const id=$('projectSelect').value;if(!id)return;const p=await getProject(id);if(p)writeRecipe(p.recipe);};
$('deleteProject').onclick=async()=>{const id=$('projectSelect').value;if(!id)return;await deleteProject(id);await refreshProjects();$('status').textContent='Local project deleted.';};
async function refreshProjects(){try{const items=await listProjects();$('projectSelect').innerHTML='<option value="">Saved projects…</option>'+items.map(p=>`<option value="${p.id}">${escapeHtml(p.name)} · ${p.recipe.type} · ${p.recipe.seed}</option>`).join('');}catch{$('projectSelect').innerHTML='<option value="">Local storage unavailable</option>';}}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}

document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===b));$('buildingPanel').hidden=mode!=='building';$('landscapePanel').hidden=mode!=='landscape';regenerate();});
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
const outputMap={width:'widthOut',depth:'depthOut',floors:'floorsOut',pitch:'pitchOut',terrainSize:'terrainSizeOut',relief:'reliefOut',roughness:'roughnessOut',terracing:'terracingOut',gridResolution:'gridResolutionOut'};
function syncOutputs(){for(const [id,outId] of Object.entries(outputMap)){const el=$(id),out=$(outId);if(el&&out)out.value=el.value;}}
for(const id of Object.keys(outputMap)){const el=$(id);if(el)el.oninput=()=>{syncOutputs();};}syncOutputs();
function resize(){const host=$('canvasHost'),w=Math.max(320,Math.floor(host.clientWidth)),h=Math.max(220,Math.floor(host.clientHeight));renderer.setSize(w,h,false);fitCamera(mode==='landscape'?Math.max(20,+$('terrainSize').value*.7):10);}window.addEventListener('resize',resize);resize();refreshProjects();regenerate();
(function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);})();
