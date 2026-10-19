import * as T from './vendor/three.module.js';
import {clamp,inBuilding} from './physics.js';

const CELL=128;
function seedOf(id){let n=2166136261;for(const c of String(id)){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return (n>>>0)/4294967296;}
/** Tree positions are surveyed coordinates. Only absent dimensions and mesh shapes are estimated. */
export function treeDimensions(row){
 const seed=seedOf(row[0]),h=Number(row[3]),c=Number(row[4]),circ=Number(row[5]);
 const height=clamp(h>0?h:9+seed*7,2,45);
 return {height,radius:clamp(c>0?c/2:height*.26, .6,12),trunkRadius:clamp(circ>0?circ/(200*Math.PI):height*.022,.07,1.4),seed,conifer:row[6]===1};
}
export class TreeIndex{
 constructor(rows,toLocal){this.cells=new Map();this.size=0;const ids=new Set();for(const row of rows){if(!Array.isArray(row)||row.length<7||ids.has(row[0])||!Number.isFinite(row[1])||!Number.isFinite(row[2]))continue;const [x,z]=toLocal([row[1],row[2]]);if(!Number.isFinite(x)||!Number.isFinite(z))continue;ids.add(row[0]);const t={id:row[0],x,z,...treeDimensions(row)},key=this.key(x,z);if(!this.cells.has(key))this.cells.set(key,[]);this.cells.get(key).push(t);this.size++;}}
 key(x,z){return Math.floor(x/CELL)+':'+Math.floor(z/CELL);}
 nearby(x,z,radius,limit=Infinity){const out=[],r2=radius*radius;for(let a=Math.floor((x-radius)/CELL);a<=Math.floor((x+radius)/CELL);a++)for(let b=Math.floor((z-radius)/CELL);b<=Math.floor((z+radius)/CELL);b++)for(const t of this.cells.get(a+':'+b)||[]){const d=(t.x-x)**2+(t.z-z)**2;if(d<=r2)out.push({tree:t,d});}out.sort((a,b)=>a.d-b.d);return out.slice(0,limit).map(o=>o.tree);}
}
export function trunkCollider(t){const rings=[[]],r=t.trunkRadius;for(let i=0;i<=12;i++){const a=i*Math.PI/6;rings[0].push([t.x+Math.cos(a)*r,t.z+Math.sin(a)*r]);}return {rings,minX:t.x-r,maxX:t.x+r,minZ:t.z-r,maxZ:t.z+r,height:t.height,treeId:t.id};}
function insideSolid(t,buildings){return buildings.some(b=>t.x>=b.minX&&t.x<=b.maxX&&t.z>=b.minZ&&t.z<=b.maxZ&&inBuilding(t.x,t.z,b.rings));}
export class TreeWorld{
 constructor(scene,{maxTrees=2400,radius=480}={}){
  this.maxTrees=maxTrees;this.radius=radius;this.index=null;this.visible=[];this.colliders=[];this.lastX=Infinity;this.lastZ=Infinity;this.lastBuildings=-1;this.ready=false;
  this.group=new T.Group();this.group.name='Real Berlin tree locations';scene.add(this.group);
  const trunkGeo=new T.CylinderGeometry(.73,1,1,7);trunkGeo.translate(0,.5,0);
  const crownGeo=new T.IcosahedronGeometry(1,1),coneGeo=new T.ConeGeometry(1,1,9);coneGeo.translate(0,.5,0);
  this.trunkMaterial=new T.MeshLambertMaterial({color:'#79604b',flatShading:true});this.leafMaterial=new T.MeshLambertMaterial({color:'#ffffff',flatShading:true});this.needleMaterial=new T.MeshLambertMaterial({color:'#38634f',flatShading:true});
  this.trunks=this.makeMesh(trunkGeo,this.trunkMaterial,maxTrees);this.crowns=this.makeMesh(crownGeo,this.leafMaterial,maxTrees*2);this.conifers=this.makeMesh(coneGeo,this.needleMaterial,maxTrees*3);
  this.transform=new T.Object3D();this.color=new T.Color();this.night=true;
 }
 makeMesh(geometry,material,capacity){const mesh=new T.InstancedMesh(geometry,material,capacity);mesh.count=0;mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);this.group.add(mesh);return mesh;}
 setData(data,toLocal){if(data.version!==1||!Array.isArray(data.trees)||data.trees.length===0)throw new Error('Tree snapshot is empty or unsupported');this.index=new TreeIndex(data.trees,toLocal);this.metadata=data;this.ready=true;this.lastX=Infinity;}
 setNight(n){this.night=n;this.leafMaterial.color.set(n?'#b5c5ad':'#ffffff');this.trunkMaterial.color.set(n?'#625648':'#79604b');this.needleMaterial.color.set(n?'#315a4b':'#38634f');}
 place(mesh,index,x,y,z,sx,sy,sz,angle=0){const o=this.transform;o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.rotation.set(0,angle,0);o.updateMatrix();mesh.setMatrixAt(index,o.matrix);}
 update(x,z,buildings=[],force=false){
  if(!this.ready)return false;
  if(!force&&Math.hypot(x-this.lastX,z-this.lastZ)<18&&this.lastBuildings===buildings.length)return false;
  this.lastX=x;this.lastZ=z;this.lastBuildings=buildings.length;
  this.visible=this.index.nearby(x,z,this.radius,this.maxTrees+200).filter(t=>!insideSolid(t,buildings)).slice(0,this.maxTrees);
  let ti=0,ci=0,ni=0;const shades=['#688644','#819246','#a58e43','#557d50','#8b984c'];
  for(const t of this.visible){const h=t.height,r=t.radius,angle=t.seed*Math.PI*2;
   this.place(this.trunks,ti++,t.x,.015,t.z,t.trunkRadius,h*.62,t.trunkRadius,angle);
   if(t.conifer){for(let k=0;k<3;k++)this.place(this.conifers,ni++,t.x,h*(.24+.195*k),t.z,r*(1-.22*k),h*(.55-.095*k),r*(1-.22*k),angle);}
   else{const canopyHeight=h*.62;this.place(this.crowns,ci,t.x,h-canopyHeight*.5,t.z,r*.88,canopyHeight*.5,r,angle);this.color.set(shades[Math.floor(t.seed*shades.length)]);this.crowns.setColorAt(ci++,this.color);
    this.place(this.crowns,ci,t.x+Math.cos(angle)*r*.32,h*.67,t.z+Math.sin(angle)*r*.32,r*.72,h*.24,r*.72,angle+1);this.color.multiplyScalar(.92);this.crowns.setColorAt(ci++,this.color);
   }
  }
  this.trunks.count=ti;this.crowns.count=ci;this.conifers.count=ni;
  for(const m of [this.trunks,this.crowns,this.conifers]){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;}
  // The render set is capped. Physics uses every registered trunk close enough to reach before the next refresh.
  this.colliders=this.index.nearby(x,z,100).filter(t=>!insideSolid(t,buildings)).map(trunkCollider);
  return true;
 }
 dispose(){this.group.parent?.remove(this.group);for(const m of [this.trunks,this.crowns,this.conifers]){m.geometry.dispose();m.dispose();}this.trunkMaterial.dispose();this.leafMaterial.dispose();this.needleMaterial.dispose();}
}
