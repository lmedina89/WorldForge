import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function makeStripGeometry(points,width,terrain,yOffset=0){
  const positions=[],uvs=[],indices=[];let run=0;
  for(let i=0;i<points.length;i++){
    const p=points[i],prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)];
    const tx=next.x-prev.x,tz=next.z-prev.z,len=Math.hypot(tx,tz)||1,nx=-tz/len,nz=tx/len;
    if(i>0)run+=Math.hypot(p.x-points[i-1].x,p.z-points[i-1].z);
    const lx=p.x+nx*width*.5,lz=p.z+nz*width*.5,rx=p.x-nx*width*.5,rz=p.z-nz*width*.5;
    positions.push(lx,terrain.heightAt(lx,lz)+yOffset,lz, rx,terrain.heightAt(rx,rz)+yOffset,rz);
    uvs.push(0,run/8, 1,run/8);
    if(i<points.length-1){const a=i*2,b=a+1,c=a+2,d=a+3;indices.push(a,c,b,b,c,d);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;
}

function samplePolyline(points,step=4){
  if(points.length<2)return points;
  const out=[];
  for(let i=0;i<points.length-1;i++){
    const a=points[i],b=points[i+1],d=Math.hypot(b.x-a.x,b.z-a.z),n=Math.max(1,Math.ceil(d/step));
    for(let j=0;j<n;j++){const t=j/n;out.push({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});}
  }
  out.push({...points.at(-1)});return out;
}

function inferredNormalPath(albedo=''){
  return /\.png(?:\?.*)?$/i.test(albedo)?albedo.replace(/\.png(\?.*)?$/i,'_normal.png$1'):null;
}

function flatNormalTexture(){
  const data=new Uint8Array([128,128,255,255]);
  const t=new THREE.DataTexture(data,1,1,THREE.RGBAFormat);t.needsUpdate=true;t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}

export class ExperimentalTerrainRenderer{
  constructor({scene,map,terrain,camera=null}){
    this.scene=scene;this.map=map;this.terrain=terrain;this.camera=camera;
    this.textureLoader=new THREE.TextureLoader();this.textures=new Map();this.normalTextures=new Map();
    this.visual=map.terrain?.visual||{};
  }

  async _loadTexture(path,{color=false,optional=false}={}){
    if(!path)return optional?null:Promise.reject(new Error('Missing texture path'));
    try{
      const t=await this.textureLoader.loadAsync(path);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;
      if(color)t.colorSpace=THREE.SRGBColorSpace;
      return t;
    }catch(err){if(optional)return null;throw err;}
  }

  async build(){
    const materials=this.map.terrain.materials||[];
    await Promise.all(materials.map(async m=>{
      const t=await this._loadTexture(m.albedo,{color:true});this.textures.set(m.id,t);
      const np=m.normal||inferredNormalPath(m.albedo);const nt=await this._loadTexture(np,{optional:true});this.normalTextures.set(m.id,nt||flatNormalTexture());
    }));
    this.ground=this._buildTerrainMesh();this.scene.add(this.ground);
    await this._buildRoads();this._buildWater();
    return this.ground;
  }

  _buildTerrainMesh(){
    const w=this.map.size.width,d=this.map.size.depth;
    const cell=clamp(this.visual.cellMeters??4,3,6),cols=Math.ceil(w/cell),rows=Math.ceil(d/cell);
    const geo=new THREE.PlaneGeometry(w,d,cols,rows);geo.rotateX(-Math.PI/2);
    const pos=geo.attributes.position,weights=new Float32Array(pos.count*3),worldUv=new Float32Array(pos.count*2);
    for(let i=0;i<pos.count;i++){
      const x=pos.getX(i),z=pos.getZ(i),y=this.terrain.heightAt(x,z),sw=this.terrain.materialWeights(x,z);
      pos.setY(i,y);weights[i*3]=sw.grass;weights[i*3+1]=sw.dirt;weights[i*3+2]=sw.rock;worldUv[i*2]=x;worldUv[i*2+1]=z;
    }
    geo.setAttribute('aSplat',new THREE.BufferAttribute(weights,3));geo.setAttribute('aWorldUv',new THREE.BufferAttribute(worldUv,2));geo.computeVertexNormals();
    const mats=Object.fromEntries((this.map.terrain.materials||[]).map(m=>[m.id,m]));
    const env=this.map.environment||{},sunDir=env.sunDirection||{x:-.55,y:1,z:.32};
    const mat=new THREE.ShaderMaterial({
      uniforms:{
        uGrass:{value:this.textures.get('grass')},uDirt:{value:this.textures.get('dirt')},uRock:{value:this.textures.get('rock')},
        uGrassN:{value:this.normalTextures.get('grass')},uDirtN:{value:this.normalTextures.get('dirt')},uRockN:{value:this.normalTextures.get('rock')},
        uGrassTile:{value:mats.grass?.tileMeters??18},uDirtTile:{value:mats.dirt?.tileMeters??14},uRockTile:{value:mats.rock?.tileMeters??12},
        uGrassRough:{value:mats.grass?.roughness??.95},uDirtRough:{value:mats.dirt?.roughness??.98},uRockRough:{value:mats.rock?.roughness??.88},
        uMacroStrength:{value:clamp(this.visual.macroVariation??.20,0,.5)},uNormalStrength:{value:clamp(this.visual.normalStrength??.85,0,1.8)},
        uSurfaceContrast:{value:clamp(this.visual.surfaceContrast??1.08,.7,1.5)},uDetailMix:{value:clamp(this.visual.detailMix??.28,0,.55)},
        uSunDir:{value:new THREE.Vector3(sunDir.x,sunDir.y,sunDir.z).normalize()},uSunColor:{value:new THREE.Color(env.sunColor||'#fff2d5')},uSunIntensity:{value:env.sunIntensity??2.0},
        uAmbient:{value:new THREE.Color(env.hemisphereSky||'#cad8df')},uGroundAmbient:{value:new THREE.Color(env.hemisphereGround||'#3f4638')},
        uCameraPos:{value:this.camera?.position||new THREE.Vector3(0,100,150)}
      },
      vertexShader:`
        attribute vec3 aSplat; attribute vec2 aWorldUv;
        varying vec3 vSplat; varying vec2 vWorldUv; varying vec3 vNormalW; varying vec3 vWorldPos;
        void main(){
          vSplat=aSplat;vWorldUv=aWorldUv;vNormalW=normalize(mat3(modelMatrix)*normal);
          vec4 wp=modelMatrix*vec4(position,1.0);vWorldPos=wp.xyz;
          gl_Position=projectionMatrix*viewMatrix*wp;
        }
      `,
      fragmentShader:`
        uniform sampler2D uGrass;uniform sampler2D uDirt;uniform sampler2D uRock;
        uniform sampler2D uGrassN;uniform sampler2D uDirtN;uniform sampler2D uRockN;
        uniform float uGrassTile;uniform float uDirtTile;uniform float uRockTile;
        uniform float uGrassRough;uniform float uDirtRough;uniform float uRockRough;
        uniform float uMacroStrength;uniform float uNormalStrength;uniform float uSurfaceContrast;uniform float uDetailMix;
        uniform vec3 uSunDir;uniform vec3 uSunColor;uniform float uSunIntensity;uniform vec3 uAmbient;uniform vec3 uGroundAmbient;uniform vec3 uCameraPos;
        varying vec3 vSplat;varying vec2 vWorldUv;varying vec3 vNormalW;varying vec3 vWorldPos;

        float macroNoise(vec2 p){
          float a=sin(p.x*.031+sin(p.y*.011)*1.7);
          float b=sin(p.y*.027-p.x*.009+1.1);
          float c=sin((p.x+p.y)*.015-2.3);
          return clamp(.5+(a*b*.26+c*.12),0.0,1.0);
        }
        vec2 rotUv(vec2 uv){return mat2(.8,-.6,.6,.8)*uv;}
        vec3 detile(sampler2D tex,vec2 uv,float macro){
          vec3 a=texture2D(tex,uv).rgb;
          vec3 b=texture2D(tex,rotUv(uv*.73)+vec2(.37,.11)).rgb;
          float m=clamp(uDetailMix+macro*.18,0.0,.55);
          return mix(a,b,m);
        }
        vec3 triplanarRock(vec3 wp,vec3 n,float tile){
          vec3 an=pow(abs(n),vec3(4.0));an/=max(an.x+an.y+an.z,.0001);
          vec3 x=texture2D(uRock,wp.zy/tile).rgb;
          vec3 y=texture2D(uRock,wp.xz/tile).rgb;
          vec3 z=texture2D(uRock,wp.xy/tile).rgb;
          return x*an.x+y*an.y+z*an.z;
        }
        vec3 unpackN(vec3 c){return normalize(c*2.0-1.0);}

        void main(){
          vec3 w=max(vSplat,vec3(0.0));w/=max(dot(w,vec3(1.0)),0.0001);
          vec3 geomN=normalize(vNormalW);
          float macro=macroNoise(vWorldUv);
          vec3 grass=detile(uGrass,vWorldUv/uGrassTile,macro);
          vec3 dirt=detile(uDirt,vWorldUv/uDirtTile,1.0-macro);
          vec3 rock=triplanarRock(vWorldPos,geomN,uRockTile);

          grass*=mix(vec3(.91,.94,.88),vec3(1.06,1.04,.96),macro);
          dirt*=mix(vec3(.92,.89,.84),vec3(1.05,1.01,.94),macro);
          rock*=mix(vec3(.94,.95,.93),vec3(1.04,1.035,1.01),macro);
          vec3 base=grass*w.x+dirt*w.y+rock*w.z;
          base*=1.0+(macro-.5)*2.0*uMacroStrength;
          base=clamp((base-.5)*uSurfaceContrast+.5,0.0,1.0);

          vec3 ng=unpackN(texture2D(uGrassN,vWorldUv/uGrassTile*1.45).rgb);
          vec3 nd=unpackN(texture2D(uDirtN,vWorldUv/uDirtTile*1.45).rgb);
          vec3 nr=unpackN(texture2D(uRockN,vWorldUv/uRockTile*1.30).rgb);
          vec3 tn=normalize(ng*w.x+nd*w.y+nr*w.z);
          vec3 detailDelta=vec3(tn.x,(tn.z-1.0)*.32,tn.y);
          float dist=distance(vWorldPos,uCameraPos);
          float detailFade=1.0-smoothstep(95.0,310.0,dist);
          vec3 n=normalize(geomN+detailDelta*uNormalStrength*detailFade*.72);

          float ndl=max(dot(n,uSunDir),0.0);
          float wrap=max((dot(n,uSunDir)+.14)/1.14,0.0);
          float up=clamp(n.y*.5+.5,0.0,1.0);
          vec3 hemi=mix(uGroundAmbient,uAmbient,up)*.46;
          float slopeShade=mix(.88,1.0,smoothstep(.34,.96,geomN.y));
          vec3 diffuse=base*(hemi+uSunColor*(ndl*.52+wrap*.18)*uSunIntensity)*slopeShade;

          float rough=clamp(uGrassRough*w.x+uDirtRough*w.y+uRockRough*w.z+(macro-.5)*.05,.55,1.0);
          vec3 v=normalize(uCameraPos-vWorldPos),h=normalize(v+uSunDir);
          float spec=pow(max(dot(n,h),0.0),mix(34.0,7.0,rough))*(1.0-rough)*.14*uSunIntensity;
          vec3 lit=diffuse+uSunColor*spec;
          gl_FragColor=vec4(lit,1.0);
        }
      `
    });
    const mesh=new THREE.Mesh(geo,mat);mesh.userData.ground=true;mesh.userData.experimentalTerrain=true;mesh.name='TerrainHeightfieldExperimental';return mesh;
  }

  async _roadTexture(path,{normal=false}={}){
    const key=(normal?'normal:':'color:')+path;
    if(this.textures.has(key))return this.textures.get(key);
    const t=await this._loadTexture(path,{color:!normal,optional:normal});
    if(t)this.textures.set(key,t);return t;
  }

  async _buildRoads(){
    for(const road of this.map.roads||[]){
      const pts=samplePolyline(road.points||[],3.0);if(pts.length<2)continue;
      if(road.shoulder){
        const tex=await this._roadTexture(road.shoulder),normal=await this._roadTexture(inferredNormalPath(road.shoulder),{normal:true});
        const mat=new THREE.MeshStandardMaterial({map:tex,normalMap:normal||null,normalScale:new THREE.Vector2(.55,.55),roughness:.98,metalness:0,color:new THREE.Color('#f1eee5')});
        const mesh=new THREE.Mesh(makeStripGeometry(pts,(road.width??8)+(road.shoulderWidth??4)*2,this.terrain,.018),mat);mesh.name=`RoadShoulder:${road.id}`;this.scene.add(mesh);
      }
      if(road.surface){
        const tex=await this._roadTexture(road.surface),normal=await this._roadTexture(inferredNormalPath(road.surface),{normal:true});
        const mat=new THREE.MeshStandardMaterial({map:tex,normalMap:normal||null,normalScale:new THREE.Vector2(.42,.42),roughness:.89,metalness:.015,color:new THREE.Color('#f5f4f0')});
        const mesh=new THREE.Mesh(makeStripGeometry(pts,road.width??8,this.terrain,.040),mat);mesh.name=`Road:${road.id}`;this.scene.add(mesh);
      }
    }
  }

  _buildWater(){
    for(const river of this.map.water?.rivers||[]){
      const pts=samplePolyline(river.points||[],3.0);if(pts.length<2)continue;
      const positions=[],indices=[];
      for(let i=0;i<pts.length;i++){
        const p=pts[i],prev=pts[Math.max(0,i-1)],next=pts[Math.min(pts.length-1,i+1)],tx=next.x-prev.x,tz=next.z-prev.z,len=Math.hypot(tx,tz)||1,nx=-tz/len,nz=tx/len,w=(river.width??18)*.5,y=(river.waterLevel??0)+.035;
        positions.push(p.x+nx*w,y,p.z+nz*w,p.x-nx*w,y,p.z-nz*w);if(i<pts.length-1){const a=i*2,b=a+1,c=a+2,d=a+3;indices.push(a,c,b,b,c,d);}
      }
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
      const m=new THREE.MeshPhysicalMaterial({color:new THREE.Color(river.color||'#496f75'),transparent:true,opacity:.80,roughness:.19,metalness:.02,clearcoat:.32,clearcoatRoughness:.22,side:THREE.DoubleSide,depthWrite:false});
      const mesh=new THREE.Mesh(g,m);mesh.name=`River:${river.id}`;this.scene.add(mesh);
    }
  }
}
