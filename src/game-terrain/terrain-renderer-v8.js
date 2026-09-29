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
  const a=[0,48,150,238,255,255,238,150,48,0],data=new Uint8Array(a.length*4);
  for(let i=0;i<a.length;i++){data[i*4]=255;data[i*4+1]=a[i];data[i*4+2]=255;data[i*4+3]=255;}
  const t=new THREE.DataTexture(data,a.length,1,THREE.RGBAFormat);t.needsUpdate=true;t.wrapS=THREE.ClampToEdgeWrapping;t.wrapT=THREE.RepeatWrapping;t.magFilter=t.minFilter=THREE.LinearFilter;t.generateMipmaps=false;return t;
}

export class TerrainRendererV8{
  constructor({scene,map,terrain,camera=null,renderer=null}){
    this.scene=scene;this.map=map;this.terrain=terrain;this.camera=camera;this.renderer=renderer;this.visual=map.terrain?.visual||{};
    this.textureLoader=new THREE.TextureLoader();this.textures=new Map();this.normalTextures=new Map();this.armTextures=new Map();this.surfaceGenerator=new TerrainSurfaceGenerator(map,terrain);this.generatedTextures=[];
  }

  async _loadTexture(path,{color=false,optional=false}={}){
    if(!path)return optional?null:Promise.reject(new Error('Missing texture path'));
    try{
      const t=await this.textureLoader.loadAsync(path);t.wrapS=t.wrapT=THREE.RepeatWrapping;
      t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;
      const maxAniso=this.renderer?.capabilities?.getMaxAnisotropy?.()??4;t.anisotropy=Math.min(8,maxAniso);
      if(color)t.colorSpace=THREE.SRGBColorSpace;return t;
    }catch(err){if(optional)return null;throw err;}
  }

  async build(){
    const set=this.visual.pbrMaterials||{};
    // Poly Haven source photographs stay authoritative.  The larger overview tile is
    // deliberate: 1-3 m albedo tiling collapses into a flat/aliased color at RTS camera
    // distance. Physical-scale tiling is retained separately for normal/ARM detail.
    const fallback={
      grass:{albedo:'assets/terrain/polyhaven/grass_ground_diff_1k.jpg',normal:'assets/terrain/polyhaven/grass_ground_nor_gl_1k.png',arm:'assets/terrain/polyhaven/grass_ground_arm_1k.jpg',tileMeters:2.5,overviewTileMeters:18},
      dirt:{albedo:'assets/terrain/polyhaven/brown_mud_leaves_01_diff_1k.jpg',normal:'assets/terrain/polyhaven/brown_mud_leaves_01_nor_gl_1k.png',arm:'assets/terrain/polyhaven/brown_mud_leaves_01_arm_1k.jpg',tileMeters:1.3,overviewTileMeters:14},
      rock:{albedo:'assets/terrain/polyhaven/rocks_ground_02_col_1k.jpg',normal:'assets/terrain/polyhaven/rocks_ground_02_nor_gl_1k.png',arm:'assets/terrain/polyhaven/rocks_ground_02_arm_1k.jpg',tileMeters:2.0,overviewTileMeters:12},
      wet:{albedo:'assets/terrain/polyhaven/dry_river_pebbles_diff_1k.jpg',normal:'assets/terrain/polyhaven/dry_river_pebbles_nor_gl_1k.png',arm:'assets/terrain/polyhaven/dry_river_pebbles_arm_1k.jpg',tileMeters:2.0,overviewTileMeters:10},
      rockMacro:{albedo:'assets/terrain/polyhaven/rocky_terrain_02_diff_1k.jpg',tileMeters:110}
    };
    this.pbr={};
    for(const id of ['grass','dirt','rock','wet']){
      const cfg={...fallback[id],...(set[id]||{})};
      // Existing map pbrMaterials.tileMeters continues to mean physical detail scale.
      // overviewTileMeters is intentionally independent and defaults to RTS-readable scale.
      cfg.overviewTileMeters=Number(set[id]?.overviewTileMeters??fallback[id].overviewTileMeters);
      this.pbr[id]=cfg;
      this.textures.set(id,await this._loadTexture(cfg.albedo,{color:true}));
      this.normalTextures.set(id,await this._loadTexture(cfg.normal,{optional:true})||flatNormalTexture());
      this.armTextures.set(id,await this._loadTexture(cfg.arm,{optional:true})||null);
    }
    this.pbr.rockMacro={...fallback.rockMacro,...(set.rockMacro||{})};
    this.rockMacroTexture=await this._loadTexture(this.pbr.rockMacro.albedo,{color:true,optional:true})||this.textures.get('rock');
    const splat=this.surfaceGenerator.buildSplat(this.visual.splatCellMeters??2.0),macro=this.surfaceGenerator.buildMacro(this.visual.macroCellMeters??8);
    this.splatTexture=dataTexture(splat);this.macroTexture=dataTexture(macro);this.generatedTextures.push(this.splatTexture,this.macroTexture);
    this.surfaceStats={splatWidth:splat.width,splatHeight:splat.height,splatCellMeters:splat.cellMeters,macroWidth:macro.width,macroHeight:macro.height,macroCellMeters:macro.cellMeters,pbr:true,materialSet:'Poly Haven 1K CC0 direct-source albedo + physical normal detail',overviewTiles:Object.fromEntries(['grass','dirt','rock','wet'].map(id=>[id,this.pbr[id].overviewTileMeters]))};
    this.ground=this._buildTerrainMesh(macro);this.scene.add(this.ground);await this._buildRoads();this._buildWater();return this.ground;
  }

  _buildTerrainMesh(macroInfo){
    const w=this.map.size.width,d=this.map.size.depth,cell=clamp(this.visual.cellMeters??4,3,6),cols=Math.ceil(w/cell),rows=Math.ceil(d/cell);
    const geo=new THREE.PlaneGeometry(w,d,cols,rows);geo.rotateX(-Math.PI/2);const pos=geo.attributes.position;
    for(let i=0;i<pos.count;i++)pos.setY(i,this.terrain.heightAt(pos.getX(i),pos.getZ(i)));
    geo.computeVertexNormals();
    const env=this.map.environment||{},sunDir=env.sunDirection||{x:-.55,y:1,z:.32},matCfg=this.pbr;
    const mat=new THREE.ShaderMaterial({
      uniforms:{
        uSplat:{value:this.splatTexture},uMacro:{value:this.macroTexture},uMapSize:{value:new THREE.Vector2(w,d)},uMacroDecode:{value:new THREE.Vector2(macroInfo.decodeMin??.72,macroInfo.decodeMax??1.28)},
        uGrass:{value:this.textures.get('grass')},uDirt:{value:this.textures.get('dirt')},uRock:{value:this.textures.get('rock')},uWet:{value:this.textures.get('wet')},uRockMacro:{value:this.rockMacroTexture},
        uGrassN:{value:this.normalTextures.get('grass')},uDirtN:{value:this.normalTextures.get('dirt')},uRockN:{value:this.normalTextures.get('rock')},uWetN:{value:this.normalTextures.get('wet')},
        uGrassARM:{value:this.armTextures.get('grass')},uDirtARM:{value:this.armTextures.get('dirt')},uRockARM:{value:this.armTextures.get('rock')},uWetARM:{value:this.armTextures.get('wet')},
        uGrassTile:{value:matCfg.grass.overviewTileMeters},uDirtTile:{value:matCfg.dirt.overviewTileMeters},uRockTile:{value:matCfg.rock.overviewTileMeters},uWetTile:{value:matCfg.wet.overviewTileMeters},uRockMacroTile:{value:matCfg.rockMacro.tileMeters??110},
        uGrassDetailTile:{value:matCfg.grass.tileMeters??2.5},uDirtDetailTile:{value:matCfg.dirt.tileMeters??1.3},uRockDetailTile:{value:matCfg.rock.tileMeters??2.0},uWetDetailTile:{value:matCfg.wet.tileMeters??2.0},
        uNormalStrength:{value:clamp(this.visual.normalStrength??.72,0,1.8)},uSurfaceContrast:{value:clamp(this.visual.surfaceContrast??1.02,.7,1.5)},uMacroStrength:{value:clamp(this.visual.macroVariation??.10,0,.5)},
        uSunDir:{value:new THREE.Vector3(sunDir.x,sunDir.y,sunDir.z).normalize()},uSunColor:{value:new THREE.Color(env.sunColor||'#fff3dd')},uSunIntensity:{value:env.sunIntensity??2.0},uHemiIntensity:{value:env.hemisphereIntensity??1.0},
        uAmbient:{value:new THREE.Color(env.hemisphereSky||'#c4d1d4')},uGroundAmbient:{value:new THREE.Color(env.hemisphereGround||'#394238')},uCameraPos:{value:this.camera?.position||new THREE.Vector3(0,100,150)},
        uGrassTint:{value:new THREE.Color(this.visual.rtsPalette?.grass||'#5e784e')},uDirtTint:{value:new THREE.Color(this.visual.rtsPalette?.dirt||'#7b6549')},uRockTint:{value:new THREE.Color(this.visual.rtsPalette?.rock||'#73756e')},uWetTint:{value:new THREE.Color(this.visual.rtsPalette?.wet||'#625b50')}
      },
      vertexShader:`
        varying vec2 vMapUv;varying vec2 vWorldUv;varying vec3 vNormalW;varying vec3 vWorldPos;uniform vec2 uMapSize;
        void main(){vec4 wp=modelMatrix*vec4(position,1.0);vWorldPos=wp.xyz;vWorldUv=wp.xz;vMapUv=vec2(position.x/uMapSize.x+.5,position.z/uMapSize.y+.5);vNormalW=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*wp;}
      `,
      fragmentShader:`
        uniform sampler2D uSplat;uniform sampler2D uMacro;uniform sampler2D uGrass;uniform sampler2D uDirt;uniform sampler2D uRock;uniform sampler2D uWet;uniform sampler2D uRockMacro;
        uniform sampler2D uGrassN;uniform sampler2D uDirtN;uniform sampler2D uRockN;uniform sampler2D uWetN;uniform sampler2D uGrassARM;uniform sampler2D uDirtARM;uniform sampler2D uRockARM;uniform sampler2D uWetARM;
        uniform float uGrassTile;uniform float uDirtTile;uniform float uRockTile;uniform float uWetTile;uniform float uRockMacroTile;uniform float uGrassDetailTile;uniform float uDirtDetailTile;uniform float uRockDetailTile;uniform float uWetDetailTile;
        uniform float uNormalStrength;uniform float uSurfaceContrast;uniform float uMacroStrength;uniform vec2 uMacroDecode;uniform vec3 uSunDir;uniform vec3 uSunColor;uniform float uSunIntensity;uniform float uHemiIntensity;uniform vec3 uAmbient;uniform vec3 uGroundAmbient;uniform vec3 uCameraPos;
        uniform vec3 uGrassTint;uniform vec3 uDirtTint;uniform vec3 uRockTint;uniform vec3 uWetTint;varying vec2 vMapUv;varying vec2 vWorldUv;varying vec3 vNormalW;varying vec3 vWorldPos;
        float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}
        vec2 altUv(vec2 uv,float phase){float s=.61+.025*sin(phase);return uv*s+vec2(11.73+phase*1.37,6.19-phase*.71);}
        vec3 sourceColor(sampler2D tex,vec2 uv,float phase){vec3 a=texture2D(tex,uv).rgb,b=texture2D(tex,altUv(uv,phase)).rgb;return mix(a,b,.14);}
        vec3 restrainedTint(vec3 src,vec3 tint,float amount){float l=max(lum(src),.025),tl=max(lum(tint),.025);vec3 paletteLum=clamp(tint*(l/tl),0.0,1.0);return mix(src,paletteLum,amount);}
        vec3 unpackN(vec3 c){return normalize(c*2.0-1.0);}
        vec3 triRaw(sampler2D tex,vec3 wp,vec3 n,float tile){vec3 an=pow(abs(n),vec3(5.0));an/=max(an.x+an.y+an.z,.0001);return texture2D(tex,wp.zy/tile).rgb*an.x+texture2D(tex,wp.xz/tile).rgb*an.y+texture2D(tex,wp.xy/tile).rgb*an.z;}
        vec3 triNormal(sampler2D tex,vec3 wp,vec3 n,float tile){vec3 an=pow(abs(n),vec3(5.0));an/=max(an.x+an.y+an.z,.0001);vec3 tx=unpackN(texture2D(tex,wp.zy/tile).rgb),ty=unpackN(texture2D(tex,wp.xz/tile).rgb),tz=unpackN(texture2D(tex,wp.xy/tile).rgb);vec3 nx=vec3(tx.z*sign(n.x),tx.y,tx.x),ny=vec3(ty.x,ty.z*sign(n.y),ty.y),nz=vec3(tz.x,tz.y,tz.z*sign(n.z));return normalize(nx*an.x+ny*an.y+nz*an.z);}
        vec3 horizNormal(sampler2D tex,vec2 uv){vec3 t=unpackN(texture2D(tex,uv).rgb);return normalize(vec3(t.x,t.z,t.y));}
        void main(){
          vec4 w=max(texture2D(uSplat,vMapUv),vec4(0.0));w/=max(dot(w,vec4(1.0)),.0001);vec3 geomN=normalize(vNormalW);float dist=distance(vWorldPos,uCameraPos);
          vec3 grass=restrainedTint(sourceColor(uGrass,vWorldUv/uGrassTile,1.3),uGrassTint,.20);vec3 dirt=restrainedTint(sourceColor(uDirt,vWorldUv/uDirtTile,3.7),uDirtTint,.06);vec3 rock=restrainedTint(triRaw(uRock,vWorldPos,geomN,uRockTile),uRockTint,.04);vec3 wet=restrainedTint(sourceColor(uWet,vWorldUv/uWetTile,5.9),uWetTint,.05);
          float rockMacroLum=lum(texture2D(uRockMacro,vWorldUv/uRockMacroTile).rgb);rock*=mix(.95,1.05,smoothstep(.18,.82,rockMacroLum));
          vec3 macroRaw=texture2D(uMacro,vMapUv).rgb;vec3 macro=mix(vec3(uMacroDecode.x),vec3(uMacroDecode.y),macroRaw);macro=mix(vec3(1.0),macro,clamp(uMacroStrength/.22,0.0,1.0));
          vec3 base=(grass*w.r+dirt*w.g+rock*w.b+wet*w.a)*macro;base=clamp((base-.5)*uSurfaceContrast+.5,0.0,1.0);
          vec3 ng=horizNormal(uGrassN,vWorldUv/uGrassDetailTile),nd=horizNormal(uDirtN,vWorldUv/uDirtDetailTile),nr=triNormal(uRockN,vWorldPos,geomN,uRockDetailTile),nw=horizNormal(uWetN,vWorldUv/uWetDetailTile);
          vec3 detailN=normalize(ng*w.r+nd*w.g+nr*w.b+nw*w.a);float nFade=1.0-smoothstep(90.0,360.0,dist);vec3 n=normalize(mix(geomN,detailN,clamp(uNormalStrength*nFade*.78,0.0,.86)));
          vec3 ag=texture2D(uGrassARM,vWorldUv/uGrassDetailTile).rgb,ad=texture2D(uDirtARM,vWorldUv/uDirtDetailTile).rgb,ar=triRaw(uRockARM,vWorldPos,geomN,uRockDetailTile),aw=texture2D(uWetARM,vWorldUv/uWetDetailTile).rgb;
          float ao=clamp(ag.r*w.r+ad.r*w.g+ar.r*w.b+aw.r*w.a,.55,1.0),rough=clamp(ag.g*w.r+ad.g*w.g+ar.g*w.b+aw.g*w.a,.50,1.0);
          float ndl=max(dot(n,uSunDir),0.0),wrap=max((dot(n,uSunDir)+.34)/1.34,0.0),up=clamp(n.y*.5+.5,0.0,1.0);vec3 hemi=mix(uGroundAmbient,uAmbient,up)*(.52*uHemiIntensity);
          vec3 diffuse=base*(vec3(.12)+hemi+uSunColor*(ndl*.28+wrap*.12)*uSunIntensity)*mix(.90,1.0,ao);vec3 v=normalize(uCameraPos-vWorldPos),hh=normalize(v+uSunDir);float spec=pow(max(dot(n,hh),0.0),mix(42.0,12.0,rough))*(1.0-rough)*.035*uSunIntensity;
          gl_FragColor=vec4(diffuse+uSunColor*spec,1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `
    });
    const mesh=new THREE.Mesh(geo,mat);mesh.name='TerrainHeightfieldPBRV8';mesh.userData.ground=true;mesh.userData.terrainRendererV8=true;return mesh;
  }

  async _roadTexture(path,{normal=false}={}){
    const key=(normal?'normal:':'color:')+path;if(this.textures.has(key))return this.textures.get(key);
    const t=await this._loadTexture(path,{color:!normal,optional:normal});if(t)this.textures.set(key,t);return t;
  }
  _roadMaterial(tex,normal,{shoulder=false}={}){
    return new THREE.MeshStandardMaterial({map:tex,normalMap:normal||null,normalScale:new THREE.Vector2(shoulder?.18:.24,shoulder?.18:.24),roughness:shoulder?1:.92,metalness:0,color:new THREE.Color(shoulder?'#f4eee3':'#ffffff'),transparent:true,alphaTest:.025,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,emissive:new THREE.Color(shoulder?'#17120d':'#242424'),emissiveMap:tex,emissiveIntensity:shoulder?.18:.24});
  }
  async _buildRoads(){
    const alpha=roadAlphaTexture();this.generatedTextures.push(alpha);
    for(const road of this.map.roads||[]){
      const pts=samplePolyline(road.points||[],2.5);if(pts.length<2)continue;
      if(road.shoulder){
        const tex=await this._roadTexture(road.shoulder),normal=await this._roadTexture(inferredNormalPath(road.shoulder),{normal:true});const mat=this._roadMaterial(tex,normal,{shoulder:true});mat.alphaMap=alpha;
        const mesh=new THREE.Mesh(makeStripGeometry(pts,(road.width??8)+(road.shoulderWidth??4)*2,this.terrain,.055),mat);mesh.name=`RoadShoulder:${road.id}`;mesh.renderOrder=3;this.scene.add(mesh);
      }
      if(road.surface){
        const tex=await this._roadTexture(road.surface),normal=await this._roadTexture(inferredNormalPath(road.surface),{normal:true});const mat=this._roadMaterial(tex,normal);mat.alphaMap=alpha;
        const mesh=new THREE.Mesh(makeStripGeometry(pts,road.width??8,this.terrain,.095),mat);mesh.name=`Road:${road.id}`;mesh.renderOrder=4;this.scene.add(mesh);
      }
    }
  }

  _buildWater(){
    for(const river of this.map.water?.rivers||[]){
      const pts=samplePolyline(river.points||[],2.5);if(pts.length<2)continue;const positions=[],indices=[];
      for(let i=0;i<pts.length;i++){
        const p=pts[i],prev=pts[Math.max(0,i-1)],next=pts[Math.min(pts.length-1,i+1)],tx=next.x-prev.x,tz=next.z-prev.z,len=Math.hypot(tx,tz)||1,nx=-tz/len,nz=tx/len,w=(river.width??18)*.5,y=(river.waterLevel??0)+.08;
        positions.push(p.x+nx*w,y,p.z+nz*w,p.x-nx*w,y,p.z-nz*w);if(i<pts.length-1){const a=i*2,b=a+1,c=a+2,d=a+3;indices.push(a,c,b,b,c,d);}
      }
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
      const m=new THREE.MeshPhysicalMaterial({color:new THREE.Color(river.color||'#496f75'),transparent:true,opacity:.84,roughness:.28,metalness:.01,clearcoat:.20,clearcoatRoughness:.28,side:THREE.DoubleSide,depthWrite:false});
      const mesh=new THREE.Mesh(g,m);mesh.name=`River:${river.id}`;mesh.renderOrder=2;this.scene.add(mesh);
    }
  }
}
