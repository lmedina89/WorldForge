import json, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
try:
    import trimesh
except Exception:
    trimesh=None
ROOT='/mnt/data/worldforge-v0.9.0/examples'

def box_geom(size):
    x,y,z=[v/2 for v in size]
    v=np.array([[-x,-y,-z],[x,-y,-z],[x,y,-z],[-x,y,-z],[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]],float)
    f=np.array([[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]],int)
    return v,f

def dodeca_geom(radius):
    if trimesh is not None:
        m=trimesh.creation.icosphere(subdivisions=1,radius=radius);return np.asarray(m.vertices,float),np.asarray(m.faces,int)
    v=np.array([[radius,0,0],[-radius,0,0],[0,radius,0],[0,-radius,0],[0,0,radius],[0,0,-radius]],float)
    f=np.array([[0,2,4],[2,1,4],[1,3,4],[3,0,4],[2,0,5],[1,2,5],[3,1,5],[0,3,5]])
    return v,f

def R(rx,ry,rz):
    cx,sx=math.cos(rx),math.sin(rx);cy,sy=math.cos(ry),math.sin(ry);cz,sz=math.cos(rz),math.sin(rz)
    return np.array([[cz,-sz,0],[sz,cz,0],[0,0,1]])@np.array([[cy,0,sy],[0,1,0],[-sy,0,cy]])@np.array([[1,0,0],[0,cx,-sx],[0,sx,cx]])

def parse(spec):
    mats=spec['materials'];tris=[];allv=[]
    for n in spec['nodes']:
        if n['kind']=='box':v,f=box_geom(n['size'])
        elif n['kind']=='mesh':v=np.array(n['vertices'],float);f=np.array(n['faces'],int)
        elif n['kind']=='dodecahedron':v,f=dodeca_geom(n['radius'])
        else:continue
        sc=np.array(n.get('scale',[1,1,1]),float);rot=n.get('rotation',[0,0,0]);pos=np.array(n.get('position',[0,0,0]),float)
        v=(v*sc)@R(*rot).T+pos;allv.append(v)
        c=mats[n['material']].get('color','#fff').lstrip('#');
        if len(c)==3:c=''.join(ch*2 for ch in c)
        col=np.array([int(c[i:i+2],16) for i in (0,2,4)]+[255],np.uint8)
        for face in f:tris.append((v[face],col))
    return tris,np.vstack(allv) if allv else np.zeros((1,3))

def render(path,out,size=(360,280),field=False):
    spec=json.load(open(path));tris,verts=parse(spec);mins,maxs=verts.min(0),verts.max(0);center=(mins+maxs)/2;center[2]=max(.7,(mins[2]+maxs[2])*.43)
    cam=center+np.array([21,-25,20] if field else [12,-15,10],float)
    fwd=center-cam;fwd/=np.linalg.norm(fwd);right=np.cross(fwd,[0,0,1.]);right/=np.linalg.norm(right);up=np.cross(right,fwd);up/=np.linalg.norm(up)
    rel=verts-center;px=rel@right;py=rel@up;spanx=max(.1,px.max()-px.min());spany=max(.1,py.max()-py.min());W,H=size
    scale=min((W-34)/spanx,(H-38)/spany)*(.91 if field else .86);cx=W/2-(px.max()+px.min())*scale/2;cy=H/2+(py.max()+py.min())*scale/2+3
    rgba=np.zeros((H,W,4),np.uint8);depth=np.full((H,W),1e18,float);mask=np.zeros((H,W),bool);light=np.array([5,-7,10.]);light/=np.linalg.norm(light)
    for tri,col in tris:
        p=np.stack([cx+((tri-center)@right)*scale,cy-((tri-center)@up)*scale],1);zs=(tri-cam)@fwd
        x0=max(0,int(np.floor(p[:,0].min())));x1=min(W-1,int(np.ceil(p[:,0].max())));y0=max(0,int(np.floor(p[:,1].min())));y1=min(H-1,int(np.ceil(p[:,1].max())))
        if x1<x0 or y1<y0:continue
        a,b,c=p;den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
        if abs(den)<1e-9:continue
        yy,xx=np.mgrid[y0:y1+1,x0:x1+1];w1=((b[1]-c[1])*(xx-c[0])+(c[0]-b[0])*(yy-c[1]))/den;w2=((c[1]-a[1])*(xx-c[0])+(a[0]-c[0])*(yy-c[1]))/den;w3=1-w1-w2
        inside=(w1>=-1e-7)&(w2>=-1e-7)&(w3>=-1e-7);z=w1*zs[0]+w2*zs[1]+w3*zs[2];reg=depth[y0:y1+1,x0:x1+1];vis=inside&(z<reg)
        if not vis.any():continue
        n=np.cross(tri[1]-tri[0],tri[2]-tri[0]);ln=np.linalg.norm(n)
        if ln:n/=ln
        bright=.58+.42*max(0,float(np.dot(n,light))) if ln else .75;rgb=np.clip(col[:3].astype(float)*bright,0,255).astype(np.uint8);rgba[y0:y1+1,x0:x1+1][vis]=[*rgb,255];reg[vis]=z[vis];mask[y0:y1+1,x0:x1+1][vis]=True
    mi=Image.fromarray((mask*255).astype('uint8'));edge=(np.array(mi.filter(ImageFilter.MaxFilter(3)))>0)&(~mask);rgba[edge]=[28,28,26,255]
    obj=Image.fromarray(rgba,'RGBA');bg=Image.new('RGBA',(W,H),(157,183,112,255));sh=Image.new('RGBA',(W,H),(0,0,0,0));sd=ImageDraw.Draw(sh);sd.ellipse((W*.15,H*.70,W*.85,H*.92),fill=(0,0,0,44));sh=sh.filter(ImageFilter.GaussianBlur(8));bg.alpha_composite(sh);bg.alpha_composite(obj);bg.save(out)

def gallery(folder,items,labels,out,cols,size=(360,280),field=False):
    for item in items:render(f'{folder}/{item}.scene.json',f'{folder}/{item}.png',size=size,field=field)
    cellw,cellh=size[0],size[1]+28;rows=math.ceil(len(items)/cols);g=Image.new('RGB',(cols*cellw,rows*cellh),(157,183,112));d=ImageDraw.Draw(g)
    for i,item in enumerate(items):
        im=Image.open(f'{folder}/{item}.png').convert('RGB');x=(i%cols)*cellw;y=(i//cols)*cellh;g.paste(im,(x,y+26));d.text((x+8,y+8),labels[item],fill=(245,245,235))
    g.save(out)

folder=f'{ROOT}/elevation-gallery';items=['stoneBridge','woodBridge','stoneStairs','earthSlope','cliff','terrace','retainingWall','ropeBridge'];labels={
'stoneBridge':'STONE BRIDGE','woodBridge':'WOOD BRIDGE','stoneStairs':'STONE STAIRS','earthSlope':'EARTH SLOPE','cliff':'CLIFF / LEDGE','terrace':'RAISED TERRACE','retainingWall':'RETAINING WALL','ropeBridge':'ROPE BRIDGE'}
gallery(folder,items,labels,f'{folder}/elevation_gallery.png',4)
folder=f'{ROOT}/elevated-field-gallery';items=['mountainVillagePath','stoneBridgeCrossing','cliffsideTownLane','castleGateApproach'];labels={x:x.replace('mountainVillagePath','MOUNTAIN VILLAGE PATH').replace('stoneBridgeCrossing','STONE BRIDGE CROSSING').replace('cliffsideTownLane','CLIFFSIDE TOWN LANE').replace('castleGateApproach','CASTLE GATE APPROACH') for x in items}
gallery(folder,items,labels,f'{folder}/elevated_field_gallery.png',2,size=(560,390),field=True)
print(f'{ROOT}/elevation-gallery/elevation_gallery.png');print(f'{ROOT}/elevated-field-gallery/elevated_field_gallery.png')
