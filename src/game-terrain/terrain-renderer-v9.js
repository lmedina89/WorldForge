import * as THREE from 'three';
import { TerrainRendererV8 } from './terrain-renderer-v8.js';

function makeStripGeometry(points,width,terrain,yOffset=0,uvTileMeters=8){
  const positions=[],uvs=[],indices=[];let run=0;
  for(let i=0;i<points.length;i++){
    const p=points[i],prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)];
    const tx=next.x-prev.x,tz=next.z-prev.z,len=Math.hypot(tx,tz)||1,nx=-tz/len,nz=tx/len;
    if(i>0)run+=Math.hypot(p.x-points[i-1].x,p.z-points[i-1].z);
    const lx=p.x+nx*width*.5,lz=p.z+nz*width*.5,rx=p.x-nx*width*.5,rz=p.z-nz*width*.5;
    positions.push(lx,terrain.heightAt(lx,lz)+yOffset,lz,rx,terrain.heightAt(rx,rz)+yOffset,rz);
    uvs.push(0,run/uvTileMeters,1,run/uvTileMeters);
    if(i<points.length-1){const a=i*2,b=a+1,c=a+2,d=a+3;indices.push(a,c,b,b,c,d);}
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  g.setIndex(indices);g.computeVertexNormals();return g;
}

function samplePolyline(points,step=3){
  if(points.length<2)return points;const out=[];
  for(let i=0;i<points.length-1;i++){
    const a=points[i],b=points[i+1],d=Math.hypot(b.x-a.x,b.z-a.z),n=Math.max(1,Math.ceil(d/step));
    for(let j=0;j<n;j++){const t=j/n;out.push({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});}
  }
  out.push({...points.at(-1)});return out;
}

function inferredNormalPath(albedo=''){
  return /\.png(?:\?.*)?$/i.test(albedo)?albedo.replace(/\.png(\?.*)?$/i,'_normal.png$1'):null;
}

function roadAlphaTexture(){
  const a=[0,48,150,238,255,255,238,150,48,0],data=new Uint8Array(a.length*4);
  for(let i=0;i<a.length;i++){data[i*4]=255;data[i*4+1]=a[i];data[i*4+2]=255;data[i*4+3]=255;}
  const t=new THREE.DataTexture(data,a.length,1,THREE.RGBAFormat);
  t.needsUpdate=true;t.wrapS=THREE.ClampToEdgeWrapping;t.wrapT=THREE.RepeatWrapping;
  t.magFilter=t.minFilter=THREE.LinearFilter;t.generateMipmaps=false;return t;
}

export class TerrainRendererV9 extends TerrainRendererV8{
  _roadCoreMaterial(tex,normal){
    const mat=new THREE.MeshStandardMaterial({
      map:tex,
      normalMap:normal||null,
      normalScale:new THREE.Vector2(.14,.14),
      roughness:.98,
      metalness:0,
      color:new THREE.Color('#ffffff'),
      // Keep the core in the transparent draw queue so it renders after the feathered
      // shoulder, but make every road-core pixel fully opaque. This prevents overlapping
      // bends / junctions from accumulating alpha into the dark blotches seen in V8.
      transparent:true,
      opacity:1,
      depthWrite:false,
      polygonOffset:true,
      polygonOffsetFactor:-2,
      polygonOffsetUnits:-2
    });
    mat.name='RoadCoreV9CompactedDirt';
    return mat;
  }

  async _buildRoads(){
    const alpha=roadAlphaTexture();this.generatedTextures.push(alpha);
    let count=0;
    for(const road of this.map.roads||[]){
      const pts=samplePolyline(road.points||[],2.5);if(pts.length<2)continue;
      if(road.shoulder){
        const tex=await this._roadTexture(road.shoulder),normal=await this._roadTexture(inferredNormalPath(road.shoulder),{normal:true});
        const mat=this._roadMaterial(tex,normal,{shoulder:true});mat.alphaMap=alpha;
        const mesh=new THREE.Mesh(makeStripGeometry(pts,(road.width??8)+(road.shoulderWidth??4)*2,this.terrain,.055,8),mat);
        mesh.name=`RoadShoulder:${road.id}`;mesh.renderOrder=3;this.scene.add(mesh);
      }
      if(road.surface){
        // Road appearance is renderer-only: do not rewrite ForgeRTS or authored map data.
        // Existing asphalt-designated roads receive the recovered compacted-earth presentation
        // only inside the WorldForge V9 preview.
        const surfacePath=road.surface==='assets/terrain/road_asphalt.png'?'assets/terrain/road_compacted_dirt.png':road.surface;
        const tex=await this._roadTexture(surfacePath),normal=await this._roadTexture(inferredNormalPath(surfacePath),{normal:true});
        const mat=this._roadCoreMaterial(tex,normal);
        // Preserve authored road centerlines and widths exactly. Only the material path,
        // UV scale and alpha behavior change in V9.
        const mesh=new THREE.Mesh(makeStripGeometry(pts,road.width??8,this.terrain,.082,16),mat);
        mesh.name=`Road:${road.id}`;mesh.renderOrder=4;this.scene.add(mesh);count++;
      }
    }
    if(this.surfaceStats)this.surfaceStats.roadPresentation={
      version:'V9 road recovery',
      core:'compacted dirt/gravel',
      authoredWidthsPreserved:true,
      shoulderFeatherPreserved:true,
      coreAlphaAccumulation:false,
      coreUvTileMeters:16,
      roads:count
    };
  }
}
