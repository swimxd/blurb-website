import * as THREE from './vendor/three.module.js';
import {roadCenter,roadHeight,terrainHeight} from './physics.js';

// All scenery is generated locally. Five small, deterministic chunks bound both
// geometry and draw calls, including when a driver reverses or restores a save.
const CHUNK=128;
const THEMES={
 valley:{sky:0x7fbfe0,horizon:0xf3e9c7,fog:0xcad9be,grass:[0x82ad59,0x91b867,0xa5bd6b,0x72a34f,0xb2bd70],road:0x787c77,shoulder:0xc1bd8c,seed:31},
 alpine:{sky:0x80b6d6,horizon:0xe9ebd7,fog:0xc8d9d8,grass:[0x8ca77c,0x77946b,0xadc19a,0x93aa85,0xc1cbae],road:0x747e81,shoulder:0xb6b6a2,seed:73},
 harbour:{sky:0x77c4df,horizon:0xffe9c8,fog:0xc9e4df,grass:[0xa7be89,0xa9c69e,0xbdc59b,0x9db27d,0xd0c5a0],road:0x849395,shoulder:0xe0d5bb,seed:131},
 desert:{sky:0x91c9de,horizon:0xffddae,fog:0xefcba1,grass:[0xdfb36f,0xeac185,0xf1cd93,0xd9a766,0xe7bc7b],road:0xa99077,shoulder:0xf3d39d,seed:193},
};
function random(seed){let a=seed|0;return()=>{a=(a+0x6d2b79f5)|0;let t=Math.imul(a^a>>>15,1|a);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
function roofGeometry(){
 const g=new THREE.BufferGeometry();
 const v=[[-.5,0,-.5],[.5,0,-.5],[0,.65,-.5],[-.5,0,.5],[.5,0,.5],[0,.65,.5]];
 const faces=[[0,2,1],[3,4,5],[0,3,5],[0,5,2],[2,5,4],[2,4,1],[0,1,4],[0,4,3]];
 g.setAttribute('position',new THREE.Float32BufferAttribute(faces.flatMap(f=>f.flatMap(i=>v[i])),3));g.computeVertexNormals();return g;
}
function leafGeometry(){
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,.3,-.15,-.55,0,-.42,-1,0,0,0,0,-.42,-1,-.3,-.15,-.55],3));g.computeVertexNormals();return g;
}
function sailGeometry(){
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,0,0,0,1,0],3));g.computeVertexNormals();return g;
}

export function createRemasteredEnvironment(scene,mapId,{quality='high'}={}){
 const id=THEMES[mapId]?mapId:'valley',theme=THEMES[id],low=quality==='low';
 const group=new THREE.Group();group.name=`remastered-${id}`;scene.add(group);
 const previousBackground=scene.background,previousFog=scene.fog;
 const background=new THREE.Color(theme.sky),fog=new THREE.Fog(theme.fog,low?85:115,low?225:280);
 scene.background=background;scene.fog=fog;
 const ownedGeometries=new Set(),ownedMaterials=new Set(),chunks=new Map();
 const ownGeometry=g=>(ownedGeometries.add(g),g),ownMaterial=m=>(ownedMaterials.add(m),m);
 const geometries={
  box:ownGeometry(new THREE.BoxGeometry(1,1,1)),
  cylinder:ownGeometry(new THREE.CylinderGeometry(1,1,1,8)),
  taper:ownGeometry(new THREE.CylinderGeometry(.68,1,1,10)),
  cone:ownGeometry(new THREE.ConeGeometry(1,1,9)),
  crown:ownGeometry(new THREE.IcosahedronGeometry(1,1)),
  rock:ownGeometry(new THREE.IcosahedronGeometry(1,0)),
  roof:ownGeometry(roofGeometry()),
  leaf:ownGeometry(leafGeometry()),
  sail:ownGeometry(sailGeometry()),
  shadow:ownGeometry(new THREE.CircleGeometry(1,16)),
  ring:ownGeometry(new THREE.TorusGeometry(1,.055,4,16)),
 };
 const solid=ownMaterial(new THREE.MeshLambertMaterial({color:0xffffff,flatShading:true,side:THREE.DoubleSide}));
 const shadowMaterial=ownMaterial(new THREE.MeshBasicMaterial({color:0x304044,transparent:true,opacity:.12,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));
 const groundMaterial=ownMaterial(new THREE.MeshLambertMaterial({vertexColors:true}));
 const waterMaterial=ownMaterial(new THREE.MeshPhongMaterial({color:0x58bbc3,shininess:65,specular:0xa5e1dd,transparent:true,opacity:.9}));
 const roadMaterial=ownMaterial(new THREE.MeshLambertMaterial({color:theme.road}));
 const shoulderMaterial=ownMaterial(new THREE.MeshLambertMaterial({color:theme.shoulder}));
 const markingMaterial=ownMaterial(new THREE.MeshLambertMaterial({color:id==='desert'?0xf6ddb7:0xf4edcf}));
 const temp=new THREE.Object3D(),color=new THREE.Color();
 let disposed=false,currentChunk=null;

 // A batch builder also supplies a local coordinate system for each landmark.
 function builder(parent){
  const buckets=new Map(),anchorRotation=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0);let anchor={x:0,y:0,z:0,a:0,k:1};
  function origin(x,y,z,a=0,k=1){anchor={x,y,z,a,k};anchorRotation.setFromAxisAngle(up,a);}
  function at(s,x,a=0,k=1){origin(roadCenter(s)+x,terrainHeight(s,x),-s,a,k);}
  function part(type,tint,x,y,z,sx=1,sy=sx,sz=sx,rx=0,ry=0,rz=0){
   const {x:ax,y:ay,z:az,a,k}=anchor,c=Math.cos(a),s=Math.sin(a);
   temp.position.set(ax+k*(x*c+z*s),ay+y*k,az+k*(-x*s+z*c));
   temp.rotation.set(rx,ry,rz);temp.quaternion.premultiply(anchorRotation);temp.scale.set(sx*k,sy*k,sz*k);temp.updateMatrix();
   if(!buckets.has(type))buckets.set(type,[]);buckets.get(type).push({matrix:temp.matrix.clone(),tint});
  }
  function finish(material=solid){
   for(const [type,list] of buckets){
    const mesh=new THREE.InstancedMesh(geometries[type],type==='shadow'?shadowMaterial:material,list.length);
    for(let i=0;i<list.length;i++){mesh.setMatrixAt(i,list[i].matrix);if(type!=='shadow')mesh.setColorAt(i,color.setHex(list[i].tint));}
    mesh.name=`${id}-${type}-batch`;mesh.castShadow=type!=='shadow';mesh.receiveShadow=type!=='shadow';
    if(type==='shadow')mesh.renderOrder=1;mesh.computeBoundingSphere();parent.add(mesh);
   }
  }
  function shadow(x,z,rx,rz=rx){part('shadow',0xffffff,x,.045,z,rx,rz,1,-Math.PI/2);}
  return{part,origin,at,finish,shadow};
 }

 function broadleaf(b,s,x,k,rng,fruit=false){
  b.at(s,x,rng()*6.28,k);b.shadow(.35,.2,1.5);
  b.part('taper',0x886c46,0,1.05,0,.24,2.1,.24,.03,0,.07);
  for(const [px,py,pz,size,tint] of [[0,2.95,0,1.45,0x6c983f],[-.9,2.6,.12,1.15,0x83aa4e],[.95,2.75,.24,1.2,0x92b555],[.1,3.65,-.3,1.0,0xa1bd61]])b.part('crown',tint,px,py,pz,size,size*.9,size);
  if(fruit)for(let j=0;j<7;j++){const a=j*2.4;b.part('crown',j%2?0xdf9861:0xc85d46,Math.sin(a)*1.18,2.65+(j%3)*.32,Math.cos(a)*1.16,.12,.13,.12);}
 }
 function pine(b,s,x,k,rng){
  b.at(s,x,rng()*6.28,k);b.shadow(.3,.2,1.5);
  b.part('cylinder',0x806c59,0,1.5,0,.17,3,.17);
  const greens=id==='alpine'?[0x3f7768,0x4c8b79,0x6a9d84]:[0x4c8357,0x699b63,0x82ac70];
  for(let n=0;n<3;n++)b.part('cone',greens[n],0,2+n*1.15,0,1.7-n*.43,2.9-n*.32,1.7-n*.43);
  if(id==='alpine'&&x>23)for(let n=0;n<3;n++)b.part('cone',0xe4ece1,0,2.98+n*1.03,0,.9-n*.25,1.4-n*.15,.9-n*.25);
 }
 function palm(b,s,x,k,rng){
  b.at(s,x,rng()*6.28,k);b.shadow(.3,0,1.8);
  for(let n=0;n<5;n++)b.part('taper',n%2?0xa78350:0xb7955f,n*.10,n*.65+.3,0,.22-n*.013,.74,.22-n*.013,0,0,-.14);
  b.part('crown',0x617a3e,.45,3.45,0,.42,.28,.42);
  for(let n=0;n<8;n++)b.part('leaf',n%2?0x729d52:0x487d50,.45,3.6,0,2.5,2.5,2.5,-.12,n*Math.PI/4,0);
  for(let n=0;n<3;n++)b.part('crown',0x967047,.45+Math.sin(n*2)*.2,3.25,Math.cos(n*2)*.2,.14,.18,.14);
 }
 function shrub(b,s,x,rng){
  b.at(s,x,rng()*6.28,.7+rng()*.5);b.shadow(0,0,.7);
  b.part('crown',id==='desert'?0x949c56:0x80a666,0,.35,0,.8,.6,.65);
  b.part('crown',id==='desert'?0xb3ab64:0xa0bb77,.48,.25,.1,.48,.4,.45);
 }
 function flowers(b,s,x,rng){
  b.at(s,x);const tint=[0xf2d263,0xe8d8a8,0xc495bf,0xe5aa8d][Math.floor(rng()*4)];
  for(let n=0;n<(low?5:10);n++){const px=(rng()-.5)*2.5,pz=(rng()-.5)*2.3,h=.18+rng()*.22;b.part('box',0x729c58,px,h/2,pz,.035,h,.035);b.part('crown',tint,px,h,pz,.12,.065,.12);}
 }
 function house(b,s,x,k,rng,kind=id){
  b.at(s,x,x<0?.18:-.18,k);b.shadow(.5,0,3.3,2.8);
  const wall=kind==='harbour'?[0xf2c4a9,0xdce2c9,0xe4cf97,0xb8d4d1,0xe8b0a2][Math.floor(rng()*5)]:kind==='alpine'?0xbc976f:0xf0ddad;
  const roof=kind==='alpine'?0x67594f:kind==='harbour'?0xc67858:0xad6950;
  b.part('box',0xaaa997,0,-.45,0,4.2,1.9,3.6);
  b.part('box',wall,0,1.9,0,4,3.3,3.4);
  if(kind==='harbour')b.part('box',0xf6e5c4,0,3.2,0,4.15,.18,3.55);
  b.part('roof',roof,0,3.48,0,4.65,2.3,4.05);
  b.part('box',0xc4ad8b,1.05,4.45,-.5,.55,1.8,.5);
  b.part('box',0x786052,1.05,5.34,-.5,.68,.13,.65);
  b.part('box',0x705941,0,.85,1.735,.68,1.6,.05);
  b.part('box',0xd4b986,0,.85,1.78,.48,1.36,.025);
  b.part('crown',0xf1d596,.18,.9,1.82,.045,.045,.045);
  for(const xx of [-1.24,1.24])for(const yy of [1.1,2.65]){
   b.part('box',0xf4e5c7,xx,yy,1.735,.8,.85,.09);
   b.part('box',0x547c80,xx,yy,1.796,.59,.66,.025);
   b.part('box',0xf0dfb9,xx,yy,1.825,.045,.67,.025);
   b.part('box',0xf0dfb9,xx,yy,1.825,.6,.045,.025);
   for(const dx of [-.53,.53])b.part('box',kind==='harbour'?0x5d9390:0x7a8969,xx+dx,yy,1.75,.22,.8,.08);
  }
  for(const xx of [-2.025,2.025])for(const zz of [-.8,.8]){b.part('box',0xf2dfb8,xx,1.7,zz,.07,.92,.79);b.part('box',0x64818a,xx*1.01,1.7,zz,.03,.72,.59);}
  if(kind==='alpine'){
   b.part('box',0x7e6753,0,2.45,2.13,4.3,.15,.9);
   for(let n=0;n<9;n++)b.part('box',0x8f7258,-2+n*.5,2.83,2.53,.08,.7,.08);
   b.part('box',0x967b61,0,3.18,2.53,4.25,.1,.12);
   b.part('roof',0xe5ebdf,0,4.27,0,2.35,1.09,4.08);
   for(const xx of [-1.92,1.92])b.part('box',0x8c745b,xx,1.85,1.78,.12,3.5,.12);
  }else{
   for(const xx of [-1.22,1.22]){b.part('box',0xb47757,xx,.64,1.96,.9,.22,.38);for(let j=0;j<4;j++)b.part('crown',j%2?0xd77c87:0x87a65d,xx-.3+j*.2,.83,1.97,.17,.15,.16);}
   b.part('roof',0xc5865e,0,1.92,2.09,1.5,.5,1.0);
  }
 }
 function fence(b,s,x,length=24){
  for(let t=0;t<=length;t+=3){const at=s+t;b.at(at,x);b.part('box',0xc4b78b,0,.57,0,.14,1.14,.14);b.part('cone',0xe2d4a8,0,1.16,0,.105,.16,.105);if(t<length)for(const h of [.42,.88])b.part('box',0xdfcfa0,0,h,-1.5,.09,.10,3.1);}
 }
 function windmill(b,chunk,s,x,k=1){
  b.at(s,x,0,k);b.shadow(.8,.4,3.2);
  b.part('taper',0xe4d5ac,0,3.0,0,1.45,6,1.45);b.part('cone',0x8f6652,0,6.55,0,1.27,1.6,1.27);
  for(const y of [1.15,3.7]){b.part('box',0x877c69,0,y,1.2,.48,.67,.09);b.part('box',0x47777c,0,y,1.26,.30,.46,.02);}
  b.part('cylinder',0x83694e,0,4.2,0,1.7,.18,1.7);
  for(let n=0;n<12;n++){const a=n*Math.PI/6;b.part('box',0x7e6c53,Math.sin(a)*1.55,4.58,Math.cos(a)*1.55,.06,.74,.06);}
  b.part('ring',0xa08b65,0,4.9,0,1.56,1.56,1.56,Math.PI/2);
  const rotor=new THREE.Group();rotor.name='windmill-sails';rotor.position.set(roadCenter(s)+x,terrainHeight(s,x)+5.5*k,-s+1.38*k);rotor.scale.setScalar(k);
  const sails=builder(rotor);sails.part('cylinder',0x9c7952,0,0,.04,.22,.45,.22,Math.PI/2);
  for(let n=0;n<4;n++){
   const a=n*Math.PI/2,c=Math.cos(a),sn=Math.sin(a);
   sails.part('box',0x8b7251,-sn*1.75,c*1.75,0,.1,3.7,.1,0,0,a);
   sails.part('box',0xf0e2b6,-sn*2.25+c*.25,c*2.25+sn*.25,.04,.53,2.15,.045,0,0,a);
   for(let j=0;j<5;j++)sails.part('box',0xc0ab7f,-sn*(1.3+j*.43)+c*.25,c*(1.3+j*.43)+sn*.25,.075,.55,.035,.025,0,0,a);
  }
  sails.finish();chunk.add(rotor);chunk.userData.rotors.push(rotor);
 }
 function stoneBridge(b,s,x){
  // A small footbridge beside the carriageway, leaving every answer lane clear.
  b.at(s,x,Math.PI/2);b.shadow(.3,0,4,2);
  b.part('box',0xb7b99d,0,1.45,0,7.2,.48,2.25);
  for(const xx of [-2.6,2.6])b.part('box',0xa1aa99,xx,.6,0,1.3,1.7,2.15);
  for(const zz of [-1.04,1.04]){
   b.part('box',0xb8bdab,0,2.1,zz,7.15,.55,.32);
   b.part('box',0xd0ceb2,0,2.42,zz,7.35,.13,.43);
   for(let n=0;n<9;n++)b.part('box',n%2?0xa2ad9a:0xc1c2a8,-3.16+n*.79,1.9,zz,.68,.45,.35);
  }
  b.part('box',0x69b6b7,0,.15,0,2.2,.035,12);
 }
 function lighthouse(b,s,x){
  b.at(s,x);b.shadow(.4,0,3.1);
  b.part('cylinder',0xd7c8a9,0,.35,0,2.6,.7,2.6);
  b.part('taper',0xf3ead3,0,4.6,0,1.35,8.5,1.35);
  for(const y of [2.2,5.3])b.part('taper',0xcc7766,0,y,0,1.4-y*.045,1.2,1.4-y*.045);
  b.part('cylinder',0x547b7c,0,9.0,0,1.45,.26,1.45);
  b.part('cylinder',0xb9ddd2,0,9.72,0,.89,1.25,.89);
  for(let n=0;n<8;n++){const a=n*Math.PI/4;b.part('box',0x647f7d,Math.sin(a)*.84,9.76,Math.cos(a)*.84,.08,1.35,.08);}
  b.part('cone',0x718384,0,10.67,0,1.28,.95,1.28);
  b.part('crown',0xf9d884,0,9.7,0,.42,.58,.42);
  b.part('box',0x526c69,0,.83,1.32,.65,1.35,.08);
  for(const y of [3.2,6.65])b.part('box',0x668a8b,0,y,1.15,.32,.65,.1);
 }
 function boat(b,s,x,rng){
  b.origin(roadCenter(s)+x,roadHeight(s)-1.4,-s,.5+rng()*.7);
  b.part('crown',0xf3dfb6,0,.1,0,1.1,.38,2.4);
  b.part('crown',rng()>.5?0xd68c72:0x67969d,0,-.07,0,1.13,.3,2.42);
  b.part('box',0xaa8465,0,.38,0,.96,.1,2.8);
  b.part('cylinder',0xa38b6d,0,2.7,0,.065,5,.065);
  b.part('sail',0xf8edd1,.07,1.17,1.13,2.2,3.6,1,0,Math.PI/2);
  b.part('box',0xf1c183,0,1.15,0,.055,.075,2.6);
 }
 function sandstoneArch(b,s,x,k,rng){
  b.at(s,x,rng()*.5-.25,k);b.shadow(0,0,4.8,2.1);
  for(const sign of [-1,1]){
   b.part('rock',0xbf8357,sign*2.7,1.6,0,1.55,2.5,1.4);
   b.part('rock',0xd99e65,sign*2.55,3.6,.1,1.05,2.45,1.05);
   b.part('rock',0xe5b67b,sign*1.7,5.1,0,1.2,1.4,1.1,0,0,-sign*.55);
  }
  b.part('rock',0xe9bd84,0,5.95,0,2.3,.86,1.05);
 }
 function market(b,s,x,rng){
  b.at(s,x,x<0?.35:-.35);b.shadow(0,0,2.7,2.2);
  b.part('box',0xe5bd86,0,1.6,0,3.8,3.2,3.5);
  b.part('box',0xf2d9a4,0,3.3,0,4.05,.25,3.7);
  for(const xx of [-1.65,1.65])b.part('box',0xeccd97,xx,3.68,0,.35,.75,3.65);
  b.part('box',0x837b66,0,.9,1.77,.75,1.8,.04);
  for(const xx of [-1.1,1.1]){b.part('box',0x9c9672,xx,1.9,1.77,.57,.72,.04);b.part('box',0x719896,xx,1.9,1.8,.36,.51,.04);}
  for(let n=0;n<5;n++)b.part('box',n%2?0xe6d2a5:0xc88369,-1.4+n*.7,2.0,2.75,.70,.08,1.7,.13);
  for(const xx of [-1.8,1.8])b.part('cylinder',0xa58a62,xx,1,3.4,.045,2,.045);
  b.part('box',0xae8159,0,.65,3.03,3.35,.18,.9);
  for(let n=0;n<5;n++){b.part('cylinder',0xb98861,-1.25+n*.62,.95,3.04,.26,.48,.26);b.part('crown',rng()>.5?0xd9b759:0xc27752,-1.25+n*.62,1.20,3.04,.22,.13,.22);}
 }

 function makeSurface(chunk,start){
  const positions=[],colors=[],road=[],shoulder=[],marks=[],water=[];
  const xs=[-160,-115,-80,-55,-37,-24,-16,-10,-6,-3.4,-2.8,0,2.8,3.4,6,10,16,24,37,55,80,115,160];
  const palettes=theme.grass.map(c=>new THREE.Color(c));
  function point(s,x,lift=0){return[roadCenter(s)+x,terrainHeight(s,x)+lift,-s];}
  function quad(target,a,b,c,d){target.push(...a,...c,...b,...a,...d,...c);}
  function strip(target,s,next,left,right,lift){quad(target,[roadCenter(s)+left,roadHeight(s)+lift,-s],[roadCenter(next)+left,roadHeight(next)+lift,-next],[roadCenter(next)+right,roadHeight(next)+lift,-next],[roadCenter(s)+right,roadHeight(s)+lift,-s]);}
  for(let s=start;s<start+CHUNK;s+=4){
   for(let j=0;j<xs.length-1;j++){
    const x=xs[j],nx=xs[j+1];let a=point(s,x,-.035),b=point(s+4,x,-.035),c=point(s+4,nx,-.035),d=point(s,nx,-.035);
    if(id==='harbour')for(const p of [a,b,c,d]){const offset=p[0]-roadCenter(-p[2]);if(offset>16)p[1]=Math.min(p[1],roadHeight(-p[2])-Math.min(3,(offset-16)*.35));}
    quad(positions,a,b,c,d);
    const field=Math.floor((s+Math.sin(x*.11)*16)/27)+Math.floor(x/19)*3,index=((field%palettes.length)+palettes.length)%palettes.length;
    const tint=palettes[index].clone();if(id==='harbour'&&x>=10)tint.setHex(x<24?0xe1d2aa:0x92beb3);
    const light=1+Math.sin(s*.09+x*.1)*.028;tint.multiplyScalar(light);
    for(let n=0;n<6;n++)colors.push(tint.r,tint.g,tint.b);
   }
   strip(road,s,s+4,-2.8,2.8,.025);strip(shoulder,s,s+4,-3.4,-2.8,.012);strip(shoulder,s,s+4,2.8,3.4,.012);
   for(const side of [-1,1])strip(marks,s,s+4,side*2.54-.025,side*2.54+.025,.035);
   if((s%8+8)%8===0)strip(marks,s,s+2.7,-.035,.035,.038);
   if(id==='harbour'){
    const y=roadHeight(s)-1.7,ny=roadHeight(s+4)-1.7;
    quad(water,[roadCenter(s)+21,y,-s],[roadCenter(s+4)+21,ny,-s-4],[roadCenter(s+4)+160,ny,-s-4],[roadCenter(s)+160,y,-s]);
   }
  }
  for(const [name,data,material] of [['ground',positions,groundMaterial],['road',road,roadMaterial],['shoulder',shoulder,shoulderMaterial],['markings',marks,markingMaterial],['water',water,waterMaterial]]){
   if(!data.length)continue;
   const geometry=ownGeometry(new THREE.BufferGeometry());geometry.setAttribute('position',new THREE.Float32BufferAttribute(data,3));
   if(name==='ground')geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
   const mesh=new THREE.Mesh(geometry,material);mesh.name=`${id}-${name}`;mesh.userData.surface=name;mesh.receiveShadow=true;chunk.add(mesh);chunk.userData.geometries.push(geometry);
   if(name==='water')chunk.userData.water=mesh;
  }
 }

 function makeChunk(key){
  const start=key*CHUNK,rng=random(theme.seed+Math.imul(key,19349663));
  const chunk=new THREE.Group();chunk.name=`${id}-chunk-${key}`;chunk.userData={geometries:[],rotors:[]};
  makeSurface(chunk,start);const b=builder(chunk);
  // Close verge detail gives speed cues, while larger compositions sit safely
  // outside the road. The central strip is always free for the quiz gates.
  for(let s=start+3;s<start+CHUNK;s+=8){
   for(const sign of [-1,1]){
    b.at(s,sign*3.75);b.part('box',0xece4c9,0,.33,0,.09,.66,.10);b.part('box',id==='desert'?0xc69265:0x758882,0,.5,.055,.095,.13,.025);
    if(id==='harbour'&&sign>0)continue;
    if(rng()>.4)shrub(b,s+rng()*4,sign*(4.5+rng()*1.7),rng);
    if(id==='valley'&&rng()>.2)flowers(b,s,sign*(4.0+rng()*1.5),rng);
   }
  }
  if(id==='valley'){
   for(let n=0;n<(low?18:28);n++){const s=start+rng()*CHUNK,x=(n%2?1:-1)*(9+rng()*32);broadleaf(b,s,x,.75+rng()*.9,rng,n%3===0);}
   windmill(b,chunk,start+32,-12,1.06);windmill(b,chunk,start+103,24,.8);
   house(b,start+73,12,1.1,rng);house(b,start+94,16,.7,rng);
   fence(b,start+10,-6.4,30);fence(b,start+59,6.5,24);
   for(let row=0;row<3;row++)for(let n=0;n<4;n++)broadleaf(b,start+70+n*6,-10-row*5,.64,rng,true);
   stoneBridge(b,start+116,-11);
   for(let n=0;n<6;n++){b.at(start+5+n*17,30+rng()*14);b.part('cylinder',0xd1b974,0,.6,0,.65,1.2,.65,Math.PI/2);b.part('ring',0xae9b62,0,.6,.6,.5,.5,.5);}
  }else if(id==='alpine'){
   for(let n=0;n<(low?25:43);n++){const s=start+rng()*CHUNK,x=(n%2?1:-1)*(7+rng()*38);pine(b,s,x,.68+rng()*.95,rng);}
   house(b,start+27,-11,.95,rng);house(b,start+92,14,1.2,rng);house(b,start+102,22,.7,rng);
   fence(b,start+75,6.8,24);
   for(let n=0;n<16;n++){const s=start+rng()*CHUNK,x=(n%2?1:-1)*(7+rng()*28);b.at(s,x);const k=.5+rng()*1.9;b.shadow(.1,0,k);b.part('rock',n%3?0x9da99e:0xc6cfbd,0,k*.35,0,k,k*.7,k*.78);}
   b.at(start+51,-6.1);b.part('box',0xa58f6d,0,1.15,0,.13,2.3,.13);b.part('box',0xe0ca92,0,1.91,0,1.8,.36,.10);b.part('box',0x9fa878,.16,1.41,.04,1.5,.29,.1);
  }else if(id==='harbour'){
   for(let n=0;n<5;n++)house(b,start+12+n*24,-9-rng()*4,.85+rng()*.36,rng);
   for(let n=0;n<11;n++)palm(b,start+3+n*12,n%3===0?11:-5.5,.85+rng()*.4,rng);
   lighthouse(b,start+85,18.5);
   for(let n=0;n<4;n++)boat(b,start+15+n*31,34+rng()*22,rng);
   for(let s=start+2;s<start+CHUNK;s+=4){
    b.at(s,8);b.part('cylinder',0xb6c6b1,0,.65,0,.08,1.3,.08);b.part('crown',0xece2bb,0,1.33,0,.13,.13,.13);b.part('box',0xe0d8b7,0,.82,-2,.065,.07,4.1);
    b.at(s,15);b.part('rock',0xc9c3a8,0,.35,0,1.2,.9,1.3);
   }
   b.origin(roadCenter(start+42)+25,roadHeight(start+42)-.7,-start-42);b.part('box',0xb69c77,0,0,0,16,.2,2.2);
   for(let n=0;n<7;n++){b.part('box',0x846f53,-7+n*2.3,-.65,0,.25,1.7,2.0);b.part('box',0xd3b992,-7+n*2.3,.11,0,.12,.035,2.2);}
   for(let n=0;n<(low?10:23);n++){b.origin(roadCenter(start)+30+rng()*85,roadHeight(start)-1.65,-start-rng()*CHUNK);b.part('box',0xb4e0d4,0,.05,0,1.5+rng()*4,.025,.04);}
  }else{
   for(let n=0;n<13;n++){const s=start+rng()*CHUNK,x=(n%2?1:-1)*(7+rng()*24);b.at(s,x);b.shadow(.3,0,1.0);b.part('rock',n%3?0xcf995f:0xe9b77b,0,.3,0,.6+rng(),.4+rng()*.6,.5+rng());}
   sandstoneArch(b,start+47,-17,1.5,rng);sandstoneArch(b,start+113,31,.8,rng);
   market(b,start+16,-10,rng);market(b,start+25,-15,rng);
   for(let n=0;n<10;n++)palm(b,start+75+Math.sin(n*2.4)*11,16+Math.cos(n*2.4)*7,.85+rng()*.4,rng);
   b.at(start+75,16);b.part('shadow',0xffffff,0,.045,0,7,10,1,-Math.PI/2);
   // The oasis follows the local ground and remains well away from the road.
   const pond=[],pondPoint=a=>{const ps=start+75+Math.sin(a)*8.5,px=16+Math.cos(a)*5.8;return[roadCenter(ps)+px,terrainHeight(ps,px)+.09,-ps];};
   const pondCenter=[roadCenter(start+75)+16,terrainHeight(start+75,16)+.09,-start-75];
   for(let n=0;n<32;n++)pond.push(...pondCenter,...pondPoint(n*Math.PI/16),...pondPoint((n+1)*Math.PI/16));
   const pondGeometry=ownGeometry(new THREE.BufferGeometry());pondGeometry.setAttribute('position',new THREE.Float32BufferAttribute(pond,3));pondGeometry.computeVertexNormals();
   const oasis=new THREE.Mesh(pondGeometry,waterMaterial);oasis.name='oasis';chunk.add(oasis);chunk.userData.geometries.push(pondGeometry);
   for(let n=0;n<16;n++)shrub(b,start+55+rng()*43,8+rng()*19,rng);
   for(let n=0;n<6;n++){b.at(start+7+n*21,-7-rng()*9);b.part('taper',0x9aac79,0,.8,0,.25,1.6,.25);b.part('taper',0xb4bc8c,.3,1.0,0,.15,.65,.15,0,0,-.5);}
  }
  b.finish();group.add(chunk);chunks.set(key,chunk);return chunk;
 }

 const sky=new THREE.Group();sky.name='painted-sky';group.add(sky);
 const skyGeometry=ownGeometry(new THREE.SphereGeometry(345,32,16));
 const skyColors=[],topColor=new THREE.Color(theme.sky),horizonColor=new THREE.Color(theme.horizon),v=skyGeometry.attributes.position;
 for(let n=0;n<v.count;n++){color.copy(horizonColor).lerp(topColor,clamp((v.getY(n)+12)/200,0,1));skyColors.push(color.r,color.g,color.b);}
 skyGeometry.setAttribute('color',new THREE.Float32BufferAttribute(skyColors,3));
 const skyMaterial=ownMaterial(new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,depthWrite:false,fog:false})),dome=new THREE.Mesh(skyGeometry,skyMaterial);dome.renderOrder=-1000;sky.add(dome);
 const sunMaterial=ownMaterial(new THREE.MeshBasicMaterial({color:0xffedba,fog:false})),sun=new THREE.Mesh(geometries.crown,sunMaterial);sun.position.set(-130,145,-195);sun.scale.setScalar(10);sky.add(sun);
 const cloudGroup=new THREE.Group();cloudGroup.name='slow-clouds';sky.add(cloudGroup);const clouds=builder(cloudGroup),cloudRng=random(913);
 for(let n=0;n<12;n++){
  const a=n*.66,r=150+cloudRng()*55;clouds.origin(Math.sin(a)*r,42+cloudRng()*28,Math.cos(a)*r);
  for(let j=0;j<4;j++)clouds.part('crown',j===0?0xf0efd9:0xfff9e6,j*6,Math.sin(j*2)*2,0,9+j%2*2,3.7+j%2*1.8,6);
 }
 const cloudMaterial=ownMaterial(new THREE.MeshLambertMaterial({color:0xffffff,emissive:0xb3bbb9,emissiveIntensity:.3,flatShading:true}));
 clouds.finish(cloudMaterial);cloudGroup.traverse(o=>{o.castShadow=false;o.receiveShadow=false;});
 const horizon=builder(sky),distantRng=random(theme.seed);
 for(let n=0;n<20;n++){
  const a=n/20*Math.PI*2,x=Math.sin(a)*245,z=Math.cos(a)*245;
  const tall=id==='alpine',dry=id==='desert',height=tall?40+distantRng()*46:dry?13+distantRng()*16:12+distantRng()*23;
  horizon.origin(x,-8,z,a);horizon.part(tall?'cone':'crown',tall?0x93aea9:dry?0xd7ab7d:id==='harbour'?0x97bdb0:0x92b27d,0,height*.15,0,36+distantRng()*24,height,28+distantRng()*20);
  if(tall)horizon.part('cone',0xe9eee1,0,height*.47,0,13+distantRng()*6,height*.36,12+distantRng()*5);
 }
 horizon.finish();sky.traverse(o=>{o.castShadow=false;o.receiveShadow=false;});

 function removeChunk(key,chunk){
  group.remove(chunk);for(const geometry of chunk.userData.geometries){geometry.dispose();ownedGeometries.delete(geometry);}
  chunk.traverse(o=>{if(o.isInstancedMesh)o.dispose();});chunks.delete(key);
 }
 function update(s=0,x=0,dt=0,time=0){
  if(disposed)return;
  const next=Math.floor(s/CHUNK);
  if(next!==currentChunk){
   for(const [key,chunk] of chunks)if(key<next-2||key>next+2)removeChunk(key,chunk);
   for(let key=next-2;key<=next+2;key++)if(!chunks.has(key))makeChunk(key);currentChunk=next;
  }
  sky.position.set(roadCenter(s)+x,0,-s);cloudGroup.rotation.y=time*.0016;
  for(const chunk of chunks.values()){
   for(const rotor of chunk.userData.rotors)rotor.rotation.z=time*.31+rotor.position.z*.012;
   if(chunk.userData.water)chunk.userData.water.position.y=Math.sin(time*.7)*.035;
  }
 }
 function dispose(){
  if(disposed)return;disposed=true;scene.remove(group);
  group.traverse(o=>{if(o.isInstancedMesh)o.dispose();});
  for(const geometry of ownedGeometries)geometry.dispose();for(const material of ownedMaterials)material.dispose();
  ownedGeometries.clear();ownedMaterials.clear();chunks.clear();group.clear();
  if(scene.background===background)scene.background=previousBackground;if(scene.fog===fog)scene.fog=previousFog;
 }
 update();
 return{group,mapId:id,update,dispose};
}
