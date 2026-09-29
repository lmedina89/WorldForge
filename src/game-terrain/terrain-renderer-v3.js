import * as THREE from 'three';
import { TerrainSurfaceGenerator } from './terrain-surface-generator.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function makeStripGeometry(points,width,terrain,yOffset=0){
  const positions=[],uvs=[],indices=[];let run=0;
  for(let i=0;i<points.length;i++){
    const p=points[i],prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)];
    const tx=next.x-prev.x,tz=next.z-prev.z,len=Math.hypot(tx,tz)||1,nx=-tz/len,nz=tx/len;
    if(i>0)run+=Math.hypot(p.x-points[i-1].x,p.z-points[i-1].z);
    const lx=p.x+nx*width*.5,lz=p.z+nz*width*.5,rx=p.x-nx*width*.5,rz=p.z-nz*width*.5;
    positions.push(lx,terrain.heightAt(lx,lz)+yOffset,lz,rx,terrain.heightAt(rx,rz)+yOffset,rz);
    uvs.push(0,run/8,1,run/8);
    if(i<points.length-1){const a=i*2,b=a+1,c=a+2,d=a+3;indices.push(a,c,b,b,c,d);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;
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
function flatNormalTexture(){
  const data=new Uint8Array([128,128,255,255]);const t=new THREE.DataTexture(data,1,1,THREE.RGBAFormat);
  t.needsUpdate=true;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=t.minFilter=THREE.LinearFilter;return t;
}
function dataTexture({data,width,height},repeat=false){
  const t=new THREE.DataTexture(data,width,height,THREE.RGBAFormat,THREE.UnsignedByteType);
  t.needsUpdate=true;t.flipY=false;t.wrapS=t.wrapT=repeat?THREE.RepeatWrapping:THREE.ClampToEdgeWrapping;
  t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearFilter;t.generateMipmaps=false;return t;
}
function roadAlphaTexture(){
  const a=[0,72,210,255,255,210,72,0],data=new Uint8Array(a.length*4);
  for(let i=0;i<a.length;i++){data[i*4]=255;data[i*4+1]=a[i];data[i*4+2]=255;data[i*4+3]=255;}
  const t=new THREE.DataTexture(data,a.length,1,THREE.RGBAFormat);t.needsUpdate=true;t.wrapS=THREE.ClampToEdgeWrapping;t.wrapT=THREE.RepeatWrapping;t.magFilter=t.minFilter=THREE.LinearFilter;t.generateMipmaps=false;return t;
}

export class TerrainRendererV3{
  constructor({scene,map,terrain,camera=null}){
    this.scene=scene;this.map=map;this.terrain=terrain;this.camera=camera;this.visual=map.terrain?.visual||{};
    this.textureLoader=new THREE.TextureLoader();this.textures=new Map();this.normalTextures=new Map();this.surfaceGenerator=new TerrainSurfaceGenerator(map,terrain);
    this.generatedTextures=[];
  }

  async _loadTexture(path,{color=false,optional=false}={}){
    if(!path)return optional?null:Promise.reject(new Error('Missing texture path'));
    try{
      const t=await this.textureLoader.loadAsync(path);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;
      if(color)t.colorSpace=THREE.SRGBColorSpace;return t;
    }catch(err){if(optional)return null;throw err;}
  }

  async build(){
    const materials=this.map.terrain.materials||[];
    await Promise.all(materials.map(async m=>{
      const t=await this._loadTexture(m.albedo,{color:true});this.textures.set(m.id,t);
      const nt=await this._loadTexture(m.normal||inferredNormalPath(m.albedo),{optional:true});this.normalTextures.set(m.id,nt||flatNormalTexture());
    }));
    const wetAlbedo=this.visual.wetAlbedo||'assets/terrain/temperate_wetbank.png',wetNormal=this.visual.wetNormal||'assets/terrain/temperate_wetbank_normal.png';
    this.wetTexture=await this._loadTexture(wetAlbedo,{color:true,optional:true})||this.textures.get('dirt');
    this.wetNormalTexture=await this._loadTexture(wetNormal,{optional:true})||this.normalTextures.get('dirt');
    const splat=this.surfaceGenerator.buildSplat(this.visual.splatCellMeters??2.5),macro=this.surfaceGenerator.buildMacro(this.visual.macroCellMeters??8);
    this.splatTexture=dataTexture(splat);this.macroTexture=dataTexture(macro);this.generatedTextures.push(this.splatTexture,this.macroTexture);
    this.surfaceStats={splatWidth:splat.width,splatHeight:splat.height,splatCellMeters:splat.cellMeters,macroWidth:macro.width,macroHeight:macro.height,macroCellMeters:macro.cellMeters};
    this.ground=this._buildTerrainMesh(macro);this.scene.add(this.ground);
    await this._buildRoads();this._buildWater();return this.ground;
  }

  _buildTerrainMesh(macroInfo){
    const w=this.map.size.width,d=this.map.size.depth,cell=clamp(this.visual.cellMeters??4,3,6),cols=Math.ceil(w/cell),rows=Math.ceil(d/cell);
    const geo=new THREE.PlaneGeometry(w,d,cols,rows);geo.rotateX(-Math.PI/2);const pos=geo.attributes.position;
    for(let i=0;i<pos.count;i++)pos.setY(i,this.terrain.heightAt(pos.getX(i),pos.getZ(i)));
    geo.computeVertexNormals();
    const mats=Object.fromEntries((this.map.terrain.materials||[]).map(m=>[m.id,m]));
    const env=this.map.environment||{},sunDir=env.sunDirection||{x:-.55,y:1,z:.32};
    const wetTile=this.visual.wetTileMeters??11;
    const mat=new THREE.ShaderMaterial({
      uniforms:{
        uSplat:{value:this.splatTexture},uMacro:{value:this.macroTexture},uMapSize:{value:new THREE.Vector2(w,d)},uMacroDecode:{value:new THREE.Vector2(macroInfo.decodeMin??.72,macroInfo.decodeMax??1.28)},
        uGrass:{value:this.textures.get('grass')},uDirt:{value:this.textures.get('dirt')},uRock:{value:this.textures.get('rock')},uWet:{value:this.wetTexture},
        uGrassN:{value:this.normalTextures.get('grass')},uDirtN:{value:this.normalTextures.get('dirt')},uRockN:{value:this.normalTextures.get('rock')},uWetN:{value:this.wetNormalTexture},
        uGrassTile:{value:mats.grass?.tileMeters??18},uDirtTile:{value:mats.dirt?.tileMeters??14},uRockTile:{value:mats.rock?.tileMeters??12},uWetTile:{value:wetTile},
        uGrassRough:{value:mats.grass?.roughness??.95},uDirtRough:{value:mats.dirt?.roughness??.98},uRockRough:{value:mats.rock?.roughness??.88},uWetRough:{value:.76},
        uNormalStrength:{value:clamp(this.visual.normalStrength??.95,0,1.8)},uSurfaceContrast:{value:clamp(this.visual.surfaceContrast??1.06,.7,1.5)},
        uDetailMix:{value:clamp(this.visual.detailMix??.22,0,.55)},uBlendDetail:{value:clamp(this.visual.blendDetail??.12,0,.28)},uMacroStrength:{value:clamp(this.visual.macroVariation??.22,0,.5)},
        uSunDir:{value:new THREE.Vector3(sunDir.x,sunDir.y,sunDir.z).normalize()},uSunColor:{value:new THREE.Color(env.sunColor||'#fff3dd')},uSunIntensity:{value:env.sunIntensity??2.0},
        uAmbient:{value:new THREE.Color(env.hemisphereSky||'#c4d1d4')},uGroundAmbient:{value:new THREE.Color(env.hemisphereGround||'#394238')},uCameraPos:{value:this.camera?.position||new THREE.Vector3(0,100,150)}
      },
      vertexShader:`
        varying vec2 vMapUv;varying vec2 vWorldUv;varying vec3 vNormalW;varying vec3 vWorldPos;
        uniform vec2 uMapSize;
        void main(){
          vec4 wp=modelMatrix*vec4(position,1.0);vWorldPos=wp.xyz;vWorldUv=wp.xz;
          vMapUv=vec2(position.x/uMapSize.x+.5,position.z/uMapSize.y+.5);
          vNormalW=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*wp;
        }
      `,
      fragmentShader:`
        uniform sampler2D uSplat;uniform sampler2D uMacro;uniform sampler2D uGrass;uniform sampler2D uDirt;uniform sampler2D uRock;uniform sampler2D uWet;
        uniform sampler2D uGrassN;uniform sampler2D uDirtN;uniform sampler2D uRockN;uniform sampler2D uWetN;
        uniform float uGrassTile;uniform float uDirtTile;uniform float uRockTile;uniform float uWetTile;
        uniform float uGrassRough;uniform float uDirtRough;uniform float uRockRough;uniform float uWetRough;
        uniform float uNormalStrength;uniform float uSurfaceContrast;uniform float uDetailMix;uniform float uBlendDetail;uniform float uMacroStrength;
        uniform vec2 uMacroDecode;uniform vec3 uSunDir;uniform vec3 uSunColor;uniform float uSunIntensity;uniform vec3 uAmbient;uniform vec3 uGroundAmbient;uniform vec3 uCameraPos;
        varying vec2 vMapUv;varying vec2 vWorldUv;varying vec3 vNormalW;varying vec3 vWorldPos;
        vec2 rotUv(vec2 uv){return mat2(.8,-.6,.6,.8)*uv;}
        float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}
        vec3 unpackN(vec3 c){return normalize(c*2.0-1.0);}
        vec3 detile(sampler2D tex,vec2 uv,float mixAmt){vec3 a=texture2D(tex,uv).rgb;vec3 b=texture2D(tex,rotUv(uv*.71)+vec2(.37,.11)).rgb;return mix(a,b,mixAmt);}
        vec3 triColor(sampler2D tex,vec3 wp,vec3 n,float tile){vec3 an=pow(abs(n),vec3(4.0));an/=max(an.x+an.y+an.z,.0001);return texture2D(tex,wp.zy/tile).rgb*an.x+texture2D(tex,wp.xz/tile).rgb*an.y+texture2D(tex,wp.xy/tile).rgb*an.z;}
        vec3 triNormal(sampler2D tex,vec3 wp,vec3 n,float tile){
          vec3 an=pow(abs(n),vec3(4.0));an/=max(an.x+an.y+an.z,.0001);
          vec3 tx=unpackN(texture2D(tex,wp.zy/tile).rgb),ty=unpackN(texture2D(tex,wp.xz/tile).rgb),tz=unpackN(texture2D(tex,wp.xy/tile).rgb);
          vec3 nx=vec3(tx.z*sign(n.x),tx.y,tx.x),ny=vec3(ty.x,ty.z*sign(n.y),ty.y),nz=vec3(tz.x,tz.y,tz.z*sign(n.z));
          return normalize(nx*an.x+ny*an.y+nz*an.z);
        }
        void main(){
          vec4 w=max(texture2D(uSplat,vMapUv),vec4(0.0));w/=max(dot(w,vec4(1.0)),.0001);
          vec3 geomN=normalize(vNormalW);float dm=uDetailMix;
          vec3 grass=detile(uGrass,vWorldUv/uGrassTile,dm);
          vec3 dirt=detile(uDirt,vWorldUv/uDirtTile,dm*.82);
          vec3 rock=triColor(uRock,vWorldPos,geomN,uRockTile);
          vec3 wet=detile(uWet,vWorldUv/uWetTile,dm*.65);

          // Micro-height-assisted blend gives irregular material boundaries while the
          // distribution texture remains the authoritative large-scale mask.
          vec4 h=vec4(lum(grass),lum(dirt),lum(rock),lum(wet));float havg=dot(h,w);
          w=max(w+(h-havg)*uBlendDetail,vec4(0.0));w/=max(dot(w,vec4(1.0)),.0001);

          vec3 macroRaw=texture2D(uMacro,vMapUv).rgb;vec3 macro=mix(vec3(uMacroDecode.x),vec3(uMacroDecode.y),macroRaw);
          macro=mix(vec3(1.0),macro,clamp(uMacroStrength/.22,0.0,1.8));
          vec3 base=(grass*w.r+dirt*w.g+rock*w.b+wet*w.a)*macro;
          // Temperate palette correction: slightly cooler/greener grass, warmer soil,
          // neutral rock, darker damp bank. This is material-aware rather than global tint.
          base*=vec3(1.0);
          base=clamp((base-.5)*uSurfaceContrast+.5,0.0,1.0);

          vec3 ng=unpackN(texture2D(uGrassN,vWorldUv/uGrassTile*1.35).rgb);ng=normalize(vec3(ng.x,ng.z,ng.y));
          vec3 nd=unpackN(texture2D(uDirtN,vWorldUv/uDirtTile*1.35).rgb);nd=normalize(vec3(nd.x,nd.z,nd.y));
          vec3 nr=triNormal(uRockN,vWorldPos,geomN,uRockTile*1.18);
          vec3 nw=unpackN(texture2D(uWetN,vWorldUv/uWetTile*1.22).rgb);nw=normalize(vec3(nw.x,nw.z,nw.y));
          vec3 detailN=normalize(ng*w.r+nd*w.g+nr*w.b+nw*w.a);
          float dist=distance(vWorldPos,uCameraPos),fade=1.0-smoothstep(110.0,340.0,dist);
          vec3 n=normalize(mix(geomN,detailN,clamp(uNormalStrength*fade*.62,0.0,.92)));

          float ndl=max(dot(n,uSunDir),0.0),wrap=max((dot(n,uSunDir)+.18)/1.18,0.0),up=clamp(n.y*.5+.5,0.0,1.0);
          vec3 hemi=mix(uGroundAmbient,uAmbient,up)*.40;float slopeShade=mix(.84,1.0,smoothstep(.25,.98,geomN.y));
          vec3 diffuse=base*(hemi+uSunColor*(ndl*.47+wrap*.16)*uSunIntensity)*slopeShade;
          float rough=clamp(uGrassRough*w.r+uDirtRough*w.g+uRockRough*w.b+uWetRough*w.a,.55,1.0);
          vec3 v=normalize(uCameraPos-vWorldPos),hh=normalize(v+uSunDir);float spec=pow(max(dot(n,hh),0.0),mix(36.0,8.0,rough))*(1.0-rough)*.13*uSunIntensity;
          gl_FragColor=vec4(diffuse+uSunColor*spec,1.0);
        }
      `
    });
    const mesh=new THREE.Mesh(geo,mat);mesh.name='TerrainHeightfieldSplatV3';mesh.userData.ground=true;mesh.userData.terrainRendererV3=true;return mesh;
  }

  async _roadTexture(path,{normal=false}={}){
    const key=(normal?'normal:':'color:')+path;if(this.textures.has(key))return this.textures.get(key);
    const t=await this._loadTexture(path,{color:!normal,optional:normal});if(t)this.textures.set(key,t);return t;
  }

  async _buildRoads(){
    const alpha=roadAlphaTexture();this.generatedTextures.push(alpha);
    for(const road of this.map.roads||[]){
      const pts=samplePolyline(road.points||[],2.5);if(pts.length<2||!road.surface)continue;
      const tex=await this._roadTexture(road.surface),normal=await this._roadTexture(inferredNormalPath(road.surface),{normal:true});
      const mat=new THREE.MeshStandardMaterial({map:tex,normalMap:normal||null,normalScale:new THREE.Vector2(.45,.45),alphaMap:alpha,transparent:true,alphaTest:.025,roughness:.91,metalness:.01,color:new THREE.Color('#ded8ca'),depthWrite:true});
      const mesh=new THREE.Mesh(makeStripGeometry(pts,(road.width??8)+1.8,this.terrain,.035),mat);mesh.name=`Road:${road.id}`;mesh.renderOrder=2;this.scene.add(mesh);
    }
  }

  _buildWater(){
    for(const river of this.map.water?.rivers||[]){
      const pts=samplePolyline(river.points||[],2.5);if(pts.length<2)continue;const positions=[],indices=[];
      for(let i=0;i<pts.length;i++){
        const p=pts[i],prev=pts[Math.max(0,i-1)],next=pts[Math.min(pts.length-1,i+1)],tx=next.x-prev.x,tz=next.z-prev.z,len=Math.hypot(tx,tz)||1,nx=-tz/len,nz=tx/len,w=(river.width??18)*.5,y=(river.waterLevel??0)+.035;
        positions.push(p.x+nx*w,y,p.z+nz*w,p.x-nx*w,y,p.z-nz*w);if(i<pts.length-1){const a=i*2,b=a+1,c=a+2,d=a+3;indices.push(a,c,b,b,c,d);}
      }
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
      const m=new THREE.MeshPhysicalMaterial({color:new THREE.Color(river.color||'#496f75'),transparent:true,opacity:.82,roughness:.22,metalness:.01,clearcoat:.26,clearcoatRoughness:.24,side:THREE.DoubleSide,depthWrite:false});
      const mesh=new THREE.Mesh(g,m);mesh.name=`River:${river.id}`;mesh.renderOrder=3;this.scene.add(mesh);
    }
  }
}
