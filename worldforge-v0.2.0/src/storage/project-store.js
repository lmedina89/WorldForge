const DB_NAME='WorldForgeDB';
const DB_VERSION=1;
const STORE='projects';

function openDb(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id'});};
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
}

export async function saveProject(project){
  const db=await openDb();
  return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(project);tx.oncomplete=()=>resolve(project);tx.onerror=()=>reject(tx.error);});
}
export async function listProjects(){
  const db=await openDb();
  return new Promise((resolve,reject)=>{const req=db.transaction(STORE,'readonly').objectStore(STORE).getAll();req.onsuccess=()=>resolve(req.result.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));req.onerror=()=>reject(req.error);});
}
export async function getProject(id){
  const db=await openDb();
  return new Promise((resolve,reject)=>{const req=db.transaction(STORE,'readonly').objectStore(STORE).get(id);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);});
}
export async function deleteProject(id){
  const db=await openDb();
  return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
}
