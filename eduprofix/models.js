import * as THREE from './vendor/three.module.js';
import {assetUrl} from './assets.js';
import {createRemasteredCar} from './remastered-cars.js';
const dataCache=new Map(), textureCache=new Map();
const loader=new THREE.TextureLoader();
export function texture(path){
 path=path.replaceAll('\\','/');
 if(!textureCache.has(path)){
  const t=loader.load(assetUrl(path),undefined,undefined,e=>console.error('Texture failed',path,e));
  t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;
  textureCache.set(path,t);
 }
 return textureCache.get(path);
}
export async function loadModel(path){
 path=path.replaceAll('\\','/');
 if(!dataCache.has(path))dataCache.set(path,fetch('/eduprofix/generated/'+path+'.json').then(r=>{if(!r.ok)throw new Error(`Missing model ${path}`);return r.json();}));
 const data=await dataCache.get(path),attrs=new Map(data.attributes.map(a=>[a.id,a])),materials=new Map();
 for(const a of data.attributes.filter(a=>a.type===1)) materials.set(a.id,new THREE.MeshLambertMaterial({color:a.colors[0]&0xffffff,map:a.texturePath?texture(a.texturePath):null,side:THREE.DoubleSide,alphaTest:0.3}));
 function node(source,inherited=new Map()){
  const group=new THREE.Group();group.matrixAutoUpdate=false;group.matrix.fromArray(source.matrix);
  const refs=new Map(inherited);for(const id of source.refs){const a=attrs.get(id);if(!a)throw new Error(`Unknown attribute ${id}`);refs.set(a.type,a);}
  const verts=refs.get(4)?.values,uvs=refs.get(3)?.values,normals=refs.get(2)?.values,faces=refs.get(6)?.faces;
  if(verts&&faces){
   const batches=new Map();
   for(const face of faces){
    const material=face.refs.map(id=>attrs.get(id)).find(a=>a.type===1)?.id??refs.get(1)?.id;
    if(!batches.has(material))batches.set(material,{p:[],uv:[],n:[]});const b=batches.get(material);
    for(let i=1;i<face.corners.length-1;i++)for(const c of [face.corners[0],face.corners[i],face.corners[i+1]]){
     const v=verts[c.vertex];if(!v)throw new Error(`Invalid vertex ${c.vertex} in ${path}`);b.p.push(...v);
     const uv=uvs?.[c.uv]??[0,0];b.uv.push(uv[0],1-uv[1]);
     if(normals&&c.normal!==null)b.n.push(...normals[c.normal]);
    }
   }
   for(const [id,b] of batches){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(b.uv,2));if(b.n.length===b.p.length)geo.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));else geo.computeVertexNormals();group.add(new THREE.Mesh(geo,materials.get(id)??new THREE.MeshLambertMaterial({color:0xaaaaaa,side:THREE.DoubleSide})));}
  }
  for(const child of source.children)group.add(node(child,refs));return group;
 }
 // Direct3D left-handed coordinates to the renderer's right-handed world.
 const result=new THREE.Group();result.scale.z=-1;result.add(node(data.root));return result;
}
export async function loadCar(definition){
 if(definition.remasteredId)return createRemasteredCar(definition);
 const group=new THREE.Group(),body=await loadModel('models/'+definition.model);
 // Converted vehicle bodies face +Z; driving and the front axle use -Z.
 // Keep this local to cars: rotating the simulation root also reverses steering.
 body.rotation.y=Math.PI;group.add(body);
 const wheels=[];
 for(const x of [-1,1])for(const z of [-1,1]){
  const pivot=new THREE.Group(),wheel=await loadModel('models/'+definition.wheel);
  const box=new THREE.Box3().setFromObject(wheel),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  const radius=Math.max(size.y,size.z)/2,scale=definition.wheel_size/(radius||1);
  const carrier=new THREE.Group();carrier.add(wheel);wheel.position.sub(center);carrier.scale.setScalar(scale);pivot.add(carrier);
  pivot.position.set(x*definition.wheel_width/2,0,z*definition.wheel_depth/2);group.add(pivot);wheels.push(pivot);
 }
 group.scale.setScalar(definition.scale??1);group.userData.wheels=wheels;return group;
}
