import {currentTrack} from './tracks.js';
import {createRemasteredEnvironment} from './remastered-world.js';
import * as THREE from './vendor/three.module.js';
import {loadModel,loadCar,texture} from './models.js';
import {seededRandom,findCar} from './game.js';
import {roadCenter,roadHeight,roadHeading,terrainHeight} from './physics.js';
export const gateColors=[0x5659ed,0x45cc75,0xdf6464,0xe8c948];
export {roadCenter,roadHeight};
export function worldPosition(s,x=0,y=0){return new THREE.Vector3(roadCenter(s)+x,roadHeight(s)+y,-s);}
export class World {
 constructor(canvas){
  this.width=800;this.height=600;this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});this.renderer.setSize(800,600,false);this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  this.camera=new THREE.PerspectiveCamera(55,800/600,.05,400);this.scene=new THREE.Scene();this.mode='empty';this.time=0;this.gates=[];
 }
 resize(width,height=600){this.width=width;this.height=height;this.renderer.setSize(width,height,false);this.camera.clearViewOffset();this.camera.aspect=width/height;if(this.mode==='preview')this.updatePreview(0);this.camera.updateProjectionMatrix();}
 clear(){this.dust?.material.map?.dispose();this.dust=null;this.environment?.dispose();this.environment=null;this.sky=null;this.scene.traverse(o=>{if(o.isMesh||o.isPoints){o.geometry.dispose();for(const m of (Array.isArray(o.material)?o.material:[o.material]))m.dispose();}});this.scene.clear();this.scene.background=null;this.scene.fog=null;this.gates=[];this.previewCar=null;this.playerCar=null;this.mode='empty';}
 light(){this.scene.add(new THREE.AmbientLight(0xffffff,1.45));const sun=new THREE.DirectionalLight(0xffffff,1.9);sun.position.set(-30,60,25);this.scene.add(sun);}
 async preview(car){
  const token=this.token=Symbol();this.clear();this.light();const model=await loadCar(car);if(this.token!==token)return;
  this.scene.add(model);this.previewCar=model;this.mode='preview';
  this.camera.fov=55;this.camera.aspect=this.width/this.height;this.camera.updateProjectionMatrix();
  const box=new THREE.Box3().setFromObject(model),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
  this.previewCenter=center;this.previewRadius=Math.max(size.x,size.y,size.z)*1.55;this.updatePreview(0);
 }
 updatePreview(dt){if(!this.previewCar)return;this.time+=dt;const c=this.previewCenter,r=this.previewRadius;
  this.camera.position.set(c.x+Math.cos(this.time*.35)*r,c.y+r*.65,c.z+Math.sin(this.time*.35)*r);this.camera.lookAt(c);
  // Shift the preview left to leave space for original-style vehicle information.
  this.camera.setViewOffset(this.width,this.height,210,0,this.width,this.height);
 }
 async race(car,opponents,terrainIndex,catalog,round){
  this.token=Symbol();this.clear();this.cameraHeading=null;this.camera.clearViewOffset();this.camera.fov=48;this.camera.aspect=this.width/this.height;this.camera.updateProjectionMatrix();
  this.remastered=!!currentTrack();this.renderer.setPixelRatio(Math.min(devicePixelRatio,this.remastered?(this.options?.quality==='low'?1:1.5):2));this.resize(this.width,this.height);this.light();if(this.remastered){this.environment=createRemasteredEnvironment(this.scene,currentTrack().id,{quality:this.options?.quality||'high'});this.environment.update(0,0,0,0);}else{this.scene.background=new THREE.Color(0xb2bde3);this.scene.fog=new THREE.Fog(0xb2bde3,95,240);
  const rng=seededRandom(round*137+47);
  this.terrain=catalog.terrains[terrainIndex];this.terrainMeshes=[];this.terrainKey=null;this.updateTerrain(0,0);
  const sky=await loadModel('models/sky/sky.e3o');const skyBox=new THREE.Box3().setFromObject(sky),skySize=skyBox.getSize(new THREE.Vector3());sky.scale.multiplyScalar(250/Math.max(skySize.x,skySize.y,skySize.z));sky.position.y=10;sky.traverse(o=>{if(o.isMesh){o.material.fog=false;o.material.depthWrite=false;o.renderOrder=-1;}});this.scene.add(sky);this.sky=sky;
  const environments=[['stromy/normal/strom','stromy/pahyl/pahyl','mlyn/mlyn'],['stromy/pahyl/pahyl'],['stromy/snowed/snowed','chatka/chatka','veza/veza'],['stromy/kaktus/kaktus','stromy/palma/palma','mesita/mesita']];
  const scenery=await Promise.all(environments[terrainIndex].map(p=>loadModel('models/world/'+p+'.e3o')));
  for(let i=0;i<140;i++){const model=scenery[Math.floor(rng()*scenery.length)].clone(true),s=i*3.7,x=(rng()>.5?1:-1)*(5+rng()*26);model.position.set(roadCenter(s)+x,terrainHeight(s,x),-s);this.scene.add(model);}
  }
  this.playerCar=await loadCar(car);this.scene.add(this.playerCar);
  this.opponentCars=await Promise.all(opponents.map(async o=>{const def=findCar(catalog,o.car),model=await loadCar(def);model.userData.rideHeight=def.wheel_size*(def.scale??1);this.scene.add(model);return model;}));
  this.playerCar.userData.rideHeight=car.wheel_size*(car.scale??1);
  if(this.remastered){for(const model of [this.playerCar,...this.opponentCars]){const shadow=new THREE.Mesh(new THREE.CircleGeometry(.55,24),new THREE.MeshBasicMaterial({color:0x18222b,transparent:true,opacity:.19,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.scale.y=1.75;shadow.position.y=(-model.userData.rideHeight+.015)/(model.scale.y||1);model.add(shadow);}}
  if(this.remastered){const sprite=document.createElement('canvas');sprite.width=sprite.height=32;const ctx=sprite.getContext('2d'),g=ctx.createRadialGradient(16,16,0,16,16,16);g.addColorStop(0,'rgba(255,255,255,.5)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,32,32);const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(72).fill(-1000),3));this.dust=new THREE.Points(geo,new THREE.PointsMaterial({map:new THREE.CanvasTexture(sprite),size:.25,color:0xe7d4ac,transparent:true,opacity:.3,depthWrite:false}));this.dust.frustumCulled=false;this.scene.add(this.dust);this.dustIndex=0;this.dustTime=0;}
  this.mode='race';
 }
 updateTerrain(distance,lateral){
  if(this.environment)return;
  // Keep ground on both sides of the car, including behind the starting grid.
  const centerS=Math.floor(distance/64)*64,centerX=Math.round(lateral/60)*60,key=centerS+':'+centerX;
  if(this.terrainKey===key)return;this.terrainKey=key;
  for(const mesh of this.terrainMeshes){this.scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();}this.terrainMeshes=[];
  const rp=[],ru=[],gp=[],gu=[],pos=(s,x,h)=>[roadCenter(s)+x,h,-s];
  function quad(p,u,a,b,c,d,uv){for(const i of [0,1,2,0,2,3]){p.push(...[a,b,c,d][i]);u.push(...uv[i]);}}
  for(let s=centerS-256;s<centerS+320;s+=2){
   quad(rp,ru,pos(s,-2.8,roadHeight(s)),pos(s+2,-2.8,roadHeight(s+2)),pos(s+2,2.8,roadHeight(s+2)),pos(s,2.8,roadHeight(s)),[[0,s/6],[0,(s+2)/6],[1,(s+2)/6],[1,s/6]]);
   for(let x=centerX-120;x<centerX+120;x+=3){const h=(s,x)=>terrainHeight(s,x)-.025;
    quad(gp,gu,pos(s,x,h(s,x)),pos(s+2,x,h(s+2,x)),pos(s+2,x+3,h(s+2,x+3)),pos(s,x+3,h(s,x+3)),[[x/18,s/18],[x/18,(s+2)/18],[(x+3)/18,(s+2)/18],[(x+3)/18,s/18]]);
   }
  }
  for(const [p,u,map] of [[rp,ru,this.terrain.cestaTexture],[gp,gu,this.terrain.mapaTexture]]){
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(u,2));geo.computeVertexNormals();
   const mesh=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({map:texture(map),side:THREE.DoubleSide}));this.scene.add(mesh);this.terrainMeshes.push(mesh);
  }
 }
 setGate(s,options){
  const flags=options.length>0&&options.every(a=>a.startsWith('&')),finish=options.length===0;
  if(!flags&&!finish){for(const object of this.gates)this.disposeGate(object);this.gates=[];}
  const gate=new THREE.Group();gate.position.copy(worldPosition(s));gate.userData.distance=s;gate.userData.answers=[...options];gate.userData.flags=flags;
  if(finish)options=['Finish'];
  for(let i=0;i<options.length;i++){
   const width=5.6/options.length,x=-2.8+width*(i+.5);
   let map=flags?texture(options[i].slice(1)):null;
   if(finish){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=80;const ctx=canvas.getContext('2d');ctx.fillStyle='#555269';ctx.fillRect(0,0,512,80);ctx.fillStyle='white';ctx.font='bold 60px Arial';ctx.textAlign='center';ctx.fillText('Finish',256,62);map=new THREE.CanvasTexture(canvas);}
   const banner=new THREE.Mesh(new THREE.PlaneGeometry(width-.08,flags?1.45:.48,flags?16:1,flags?6:1),new THREE.MeshBasicMaterial({map,color:map?0xffffff:gateColors[i],side:THREE.DoubleSide,transparent:!finish,opacity:flags?.88:.86}));
   banner.position.set(x,flags?1.62:1.9,0);banner.userData.flag=flags;banner.userData.ownedTexture=finish;gate.add(banner);
   const post=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,2.4,5),new THREE.MeshLambertMaterial({color:flags?gateColors[i]:0xdddde2}));post.position.set(x-width/2,1.2,0);gate.add(post);
  }
  const endPost=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,2.4,5),new THREE.MeshLambertMaterial({color:0xdddde2}));endPost.position.set(2.8,1.2,0);gate.add(endPost);
  this.scene.add(gate);this.gates.push(gate);
 }
 disposeGate(object){this.scene.remove(object);object.traverse(o=>{if(o.isMesh){o.geometry.dispose();if(o.userData.ownedTexture)o.material.map?.dispose();o.material.dispose();}});}
 updateRace(state,dt){
  if(!this.playerCar)return;const p=state.player;
  if(this.environment)this.environment.update(p.s,p.x,dt,state.elapsed);else this.updateTerrain(p.s,p.x);
  const heading=p.heading??roadHeading(p.s),sin=Math.sin(heading),cos=Math.cos(heading),worldX=roadCenter(p.s)+p.x;
  if(this.dust){const positions=this.dust.geometry.attributes.position;this.dustTime+=dt;for(let i=0;i<positions.count;i++)if(positions.getY(i)>-999)positions.setY(i,positions.getY(i)+dt*.12);if(this.dustTime>.06){this.dustTime=0;const i=this.dustIndex++%positions.count,emit=Math.abs(p.x)>2.75&&Math.abs(p.speed)>1;positions.setXYZ(i,worldX-sin*.6+Math.sin(i*9)*.18,emit?terrainHeight(p.s,p.x)+.12:-1000,-p.s+cos*.6);}positions.needsUpdate=true;}
  const height=(forward,right=0)=>{const s=p.s+cos*forward-sin*right,x=worldX+sin*forward+cos*right-roadCenter(s);return terrainHeight(s,x);};
  const y=height(0),grade=height(.5)-height(-.5);
  this.playerCar.position.set(worldX,y+this.playerCar.userData.rideHeight,-p.s);
  if(this.remastered&&this.playerCar.userData.body){const body=this.playerCar.userData.body;body.rotation.z+=(Math.max(-.04,Math.min(.04,-(p.steer||0)*Math.abs(p.speed)*.025))-body.rotation.z)*(1-Math.exp(-7*dt));body.position.y=Math.sin(state.elapsed*8)*Math.min(.007,Math.abs(p.speed)*.001);}
  this.playerCar.rotation.order='YXZ';this.playerCar.rotation.set(Math.atan(grade),-heading,Math.atan(height(0,.5)-height(0,-.5)));
  for(const w of this.playerCar.userData.wheels){w.rotation.y=w.position.z<0?-(p.steer??0):0;w.children[0].rotation.x-=p.speed*dt/(this.playerCar.userData.rideHeight||.1);}
  state.opponents.forEach((o,i)=>{const m=this.opponentCars[i];m.position.copy(worldPosition(o.s,o.x,m.userData.rideHeight));m.rotation.y=-(o.heading??roadHeading(o.s));m.rotation.x=Math.atan2(roadHeight(o.s+1)-roadHeight(o.s),1);for(const w of m.userData.wheels){w.rotation.y=w.position.z<0?-(o.steer??0):0;w.children[0].rotation.x-=o.speed*dt/(m.userData.rideHeight||.1);}});
  this.cameraHeading??=heading;const delta=Math.atan2(Math.sin(heading-this.cameraHeading),Math.cos(heading-this.cameraHeading));this.cameraHeading+=delta*(1-Math.exp(-(this.remastered?5+10*(1-(this.options?.cameraMotion??.65)):5)*dt));
  const follow=this.remastered?2.9:2.2,lift=this.remastered?1.45:1.2,viewSin=Math.sin(this.cameraHeading),viewCos=Math.cos(this.cameraHeading),cameraS=p.s-viewCos*follow,cameraX=worldX-viewSin*follow;
  this.camera.position.set(cameraX,Math.max(y+lift,terrainHeight(cameraS,cameraX-roadCenter(cameraS))+.65),-cameraS);
  this.camera.lookAt(worldX+viewSin*3,y+grade*3-.3,-p.s-viewCos*3);if(this.sky)this.sky.position.set(worldX,10,-p.s);
  this.gates=this.gates.filter(g=>{if(g.userData.distance<p.s-12){this.disposeGate(g);return false;}return true;});
  for(const gate of this.gates)for(const banner of gate.children.filter(o=>o.userData.flag)){
   const positions=banner.geometry.attributes.position;
   for(let i=0;i<positions.count;i++)positions.setZ(i,Math.sin(positions.getX(i)*3+state.elapsed*3)*.045);
   positions.needsUpdate=true;
  }
 }
 render(dt){if(this.mode==='preview')this.updatePreview(dt);this.renderer.setViewport(0,0,this.width,this.height);this.renderer.setScissorTest(false);this.renderer.render(this.scene,this.camera);}
}
