import * as THREE from './vendor/three.module.js';

// These bonus cars share the recovered game's rules and upgrade vocabulary.
// Their meshes are independent of the preserved model and texture files.
function definition(remasteredId,name,desc,stats,turbo){
 const base={remasteredId,name,desc,source:`remastered/${remasteredId}.auto`,scale:.5,
  wheel_size:.2,wheel_width:.93,wheel_depth:1.28,wheel_suspension_up:.04,wheel_suspension_down:.06,
  model_width:1.05,model_depth:2,max_speed_backwards:3,max_angle:.33,weight:2,
  extra_speed:.3,extra_acceleration:.1,ignore_obstacles:'no',buy_ratio:1,
  lives_on_wrong_answer:1,score_on_wrong_answer:10,preferred_start:0,add_on_finish:['0,bonus,1'],...stats};
 return {...base,turboConfig:{...base,...turbo,add_on_finish:[...base.add_on_finish]}};
}

export const remasteredCars=[
 definition('rally','Rally Hatchback','A nimble little hatchback with lively acceleration.',
  {max_speed:9.4,max_speed_road_side:5,max_speed_grass:3.7,acceleration:22,max_angle:.35,weight:1.5,wheel_depth:1.22},
  {max_speed:17,max_speed_road_side:11,max_speed_grass:8,acceleration:31}),
 definition('van','Delivery Van','Steady handling, a roomy cab and parcels to deliver.',
  {max_speed:8,max_speed_road_side:4,max_speed_grass:2.8,acceleration:12,max_angle:.3,weight:4,wheel_depth:1.32},
  {max_speed:14,max_speed_road_side:9,max_speed_grass:6.5,acceleration:24}),
 definition('pickup','Farm Pickup','Sure-footed on the roadside, with a wooden load bed.',
  {max_speed:8.6,max_speed_road_side:6,max_speed_grass:5,acceleration:17,max_angle:.34,weight:3,wheel_size:.21,wheel_depth:1.38,model_depth:2.15},
  {max_speed:15.5,max_speed_road_side:12,max_speed_grass:10,acceleration:27}),
 definition('streamliner','Streamliner','A long, low touring car built for the open road.',
  {max_speed:10,max_speed_road_side:4.4,max_speed_grass:2.7,acceleration:19,max_angle:.31,weight:2.5,wheel_width:.96,wheel_depth:1.45,model_depth:2.35},
  {max_speed:18,max_speed_road_side:10,max_speed_grass:7,acceleration:29}),
];

function material(name,color,options={}){
 const result=new THREE.MeshStandardMaterial({color,roughness:.66,metalness:0,flatShading:true,...options});result.name=name;return result;
}
function palette(paint,accent){
 return {
  paint:material('paint',paint,{roughness:.4,metalness:.08}),
  accent:material('accent',accent,{roughness:.46}),
  cream:material('ivory',0xf5e3bd),chrome:material('chrome',0xc2ced0,{metalness:.68,roughness:.3}),
  dark:material('rubber',0x202b31),tire:material('tire',0x172129,{roughness:.95}),
  glass:material('glass',0x9cd8dd,{transparent:true,opacity:.5,roughness:.18,metalness:.1,depthWrite:false,side:THREE.DoubleSide}),
  light:material('headlight',0xffe7a1,{emissive:0xffda7b,emissiveIntensity:.28}),
  red:material('tail-light',0xc7483d,{emissive:0xac241c,emissiveIntensity:.18}),
  amber:material('indicator',0xe99237),seat:material('upholstery',0x704e3d),
  skin:material('driver',0xe9b085),shirt:material('driver-shirt',0xe5d4ad),
  wood:material('wood',0xb98243),woodDark:material('wood-edge',0x6f4e32),
 };
}
function mesh(parent,name,geometry,mat,x=0,y=0,z=0){
 const object=new THREE.Mesh(geometry,mat);object.name=name;object.position.set(x,y,z);object.castShadow=true;object.receiveShadow=true;parent.add(object);return object;
}
const box=(p,n,w,h,d,m,x=0,y=0,z=0)=>mesh(p,n,new THREE.BoxGeometry(w,h,d),m,x,y,z);
function sphere(p,n,r,m,x,y,z,sx=1,sy=1,sz=1){const o=mesh(p,n,new THREE.SphereGeometry(r,10,6),m,x,y,z);o.scale.set(sx,sy,sz);return o;}
function cylinder(p,n,r,depth,m,x,y,z,axis='z',segments=12){
 const o=mesh(p,n,new THREE.CylinderGeometry(r,r,depth,segments),m,x,y,z);
 if(axis==='z')o.rotation.x=Math.PI/2;if(axis==='x')o.rotation.z=Math.PI/2;return o;
}
function rod(p,n,a,b,r,m){
 const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),delta=vb.clone().sub(va);
 const o=mesh(p,n,new THREE.CylinderGeometry(r,r,delta.length(),6),m);o.position.copy(va.add(vb).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return o;
}
function panel(p,n,points,m){
 const vertices=[];for(let i=1;i<points.length-1;i++)for(const v of [points[0],points[i],points[i+1]])vertices.push(...v);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();return mesh(p,n,g,m);
}
function profile(p,n,points,width,m,bevel=.012){
 const shape=new THREE.Shape();points.forEach(([z,y],i)=>i?shape.lineTo(-z,y):shape.moveTo(-z,y));shape.closePath();
 const g=new THREE.ExtrudeGeometry(shape,{depth:width,steps:1,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:1,curveSegments:1});
 g.translate(0,0,-width/2);g.rotateY(Math.PI/2);return mesh(p,n,g,m);
}
function hull(p,m,{front=-.98,rear=.98,width=.89,top=.4,axle=.64,radius=.235}={}){
 const points=[[front,.15],[front+.08,top-.07],[front+.27,top],[rear-.15,top],[rear,top-.06],[rear,.03]];
 for(const z of [axle,-axle]){
  points.push([z+radius,.03]);
  for(let i=0;i<=10;i++){const angle=i*Math.PI/10;points.push([z+Math.cos(angle)*radius,.015+Math.sin(angle)*radius]);}
 }
 points.push([front,.03]);return profile(p,'sculpted body',points,width,m,.014);
}
function arch(p,m,x,z,radius=.24,width=.042){
 const g=new THREE.RingGeometry(radius,radius+width,12,1,0,Math.PI);g.rotateY(Math.PI/2);
 // Rotation places the ring in YZ while preserving its upper semicircle.
 return mesh(p,'wheel arch',g,m,x,.014,z);
}
function fenders(p,m,def){
 const double=m.clone();double.side=THREE.DoubleSide;
 for(const x of [-1,1])for(const z of [-1,1])arch(p,double,x*(def.wheel_width/2-.004),z*def.wheel_depth/2,def.wheel_size+.028,.045);
}
function lamp(p,mat,x,y,z,r=.083){
 cylinder(p,'headlamp bezel',r+.018,.042,mat.chrome,x,y,z);
 cylinder(p,'headlamp lens',r,.048,mat.light,x,y,z-.006);
}
function trim(p,m,{front=-1,rear=1,width=.88,y=.12}={}){
 for(const z of [front,rear]){
  box(p,'bumper',width,.07,.09,m.chrome,0,y,z);
  for(const x of [-width*.35,width*.35])box(p,'bumper overrider',.035,.115,.106,m.dark,x,y+.015,z);
  box(p,'number plate',.22,.075,.012,m.cream,0,y+.12,z+(z<0?-.044:.044));
 }
 for(const x of [-1,1]){
  box(p,'tail lamp',.095,.085,.035,m.red,x*width*.4,.29,rear-.025);
  box(p,'front indicator',.062,.038,.026,m.amber,x*width*.43,.27,front-.006);
 }
}
function grille(p,m,z,y=.3,width=.42,height=.16){
 box(p,'recessed grille',width,height,.04,m.dark,0,y,z);
 for(let i=0;i<5;i++)box(p,'grille bars',width-.035,.012,.047,m.chrome,0,y-height*.35+i*height*.175,z-.006);
}
function mirrors(p,m,x,y,z){
 for(const sign of [-1,1]){
  rod(p,'mirror arm',[sign*(x-.05),y-.04,z],[sign*(x+.025),y,z],.012,m.chrome);
  box(p,'mirror shell',.055,.07,.09,m.paint,sign*(x+.05),y,z);
  box(p,'mirror silver',.059,.058,.007,m.chrome,sign*(x+.05),y,z+.047);
 }
}
function cabin(p,m,{front=-.38,frontTop=-.16,rear=.57,rearTop=.36,bottom=.41,top=.91,width=.79,roofWidth=.64,split=.11}={}){
 const x=width/2,rx=roofWidth/2;
 const windshield=[[-x,bottom,front],[x,bottom,front],[rx,top-.035,frontTop],[-rx,top-.035,frontTop]];
 panel(p,'windscreen',windshield,m.glass);
 panel(p,'rear window',[[-x,bottom,rear],[-rx,top-.035,rearTop],[rx,top-.035,rearTop],[x,bottom,rear]],m.glass);
 for(const sign of [-1,1]){
  const corners=[[sign*x,bottom,front],[sign*x,bottom,rear],[sign*rx,top-.035,rearTop],[sign*rx,top-.035,frontTop]];
  panel(p,'side glazing',corners,m.glass);
  for(let i=0;i<4;i++)rod(p,'window frame',corners[i],corners[(i+1)%4],i===0?.018:.024,i===0?m.chrome:m.paint);
  rod(p,'door pillar',[sign*x,bottom,split],[sign*rx,top-.035,split],.019,m.paint);
  box(p,'door handle',.025,.022,.105,m.chrome,sign*(x+.014),bottom-.045,split+.1);
 }
 for(const z of [frontTop,rearTop])rod(p,'roof end',[-rx,top-.026,z],[rx,top-.026,z],.026,m.accent);
 profile(p,'roof',[[frontTop-.018,top-.03],[frontTop+.04,top+.04],[rearTop-.045,top+.055],[rearTop+.025,top-.025]],roofWidth,m.accent,.018);
 for(const sign of [-1,1])rod(p,'windscreen wiper',[sign*.16,bottom+.02,front-.008],[sign*.05,bottom+.13,front+.045],.008,m.dark);
 box(p,'dashboard',width-.1,.08,.15,m.dark,0,bottom-.012,front+.085);
 return {front,bottom,top,width};
}
function interior(p,m,{z=.08,floor=.29,head=.74,seatWidth=.24,cap=m.accent}={}){
 for(const x of [-.2,.2]){
  box(p,'seat cushion',seatWidth,.075,.27,m.seat,x,floor+.03,z+.055);
  const back=box(p,'seat back',seatWidth,.24,.065,m.seat,x,floor+.155,z+.19);back.rotation.x=-.12;
 }
 box(p,'driver torso',.17,.18,.11,m.shirt,-.2,head-.2,z+.025);
 sphere(p,'driver head',.068,m.skin,-.2,head,z,1,1.12,.95);
 sphere(p,'driver cap',.073,cap,-.2,head+.045,z,1,.55,1);
 box(p,'cap peak',.115,.016,.073,cap,-.2,head+.042,z-.055);
 const wheel=mesh(p,'steering wheel',new THREE.TorusGeometry(.067,.011,5,12),m.dark,-.2,head-.19,z-.17);wheel.rotation.x=-.32;
 for(const sign of [-1,1]){
  rod(p,'driver sleeve',[-.2+sign*.075,head-.16,z],[-.2+sign*.064,head-.19,z-.155],.025,m.shirt);
  sphere(p,'driver hand',.025,m.skin,-.2+sign*.064,head-.19,z-.17);
 }
}

function rally(p,m,def){
 hull(p,m.paint,{front:-.99,rear:.91,top:.42,axle:def.wheel_depth/2});fenders(p,m.dark,def);
 profile(p,'sloping bonnet',[[-.92,.355],[-.82,.438],[-.4,.46],[-.34,.39]],.79,m.paint);
 for(const x of [-.17,.17]){
  const stripe=box(p,'bonnet racing stripe',.074,.005,.4,m.cream,x,.462,-.61);stripe.rotation.x=-.052;
  const roofStripe=box(p,'roof racing stripe',.073,.004,.52,m.paint,x,.98,.16);roofStripe.rotation.x=-.027;
 }
 cabin(p,m,{front:-.4,frontTop:-.15,rear:.72,rearTop:.49,bottom:.44,top:.91,split:.14});
 interior(p,m,{z:.05,head:.77});
 trim(p,m,{front:-1.015,rear:.935,width:.9});grille(p,m,-.998,.29,.39,.135);
 for(const x of [-.34,.34])lamp(p,m,x,.35,-.982,.07);
 for(const x of [-.17,.17])lamp(p,m,x,.225,-1.071,.065);
 for(const sign of [-1,1]){
  cylinder(p,'rally roundel',.112,.009,m.cream,sign*.46,.34,.075,'x',16);
  box(p,'roundel stripe',.011,.115,.027,m.dark,sign*.469,.34,.06);
  box(p,'side sill',.035,.055,1.44,m.dark,sign*.455,.07,0);
  box(p,'mud flap',.13,.15,.025,m.dark,sign*.465,-.045,.84);
  box(p,'spoiler bracket',.04,.105,.04,m.dark,sign*.28,.52,.8);
 }
 box(p,'rear spoiler',.91,.048,.14,m.accent,0,.59,.83);
 mirrors(p,m,.45,.59,-.31);
}

function van(p,m,def){
 hull(p,m.paint,{front:-1,rear:1.02,top:.48,width:.9,axle:def.wheel_depth/2});fenders(p,m.accent,def);
 // The cargo compartment has chamfered corners and a curved shoulder profile.
 profile(p,'delivery body',[[.03,.42],[.03,1.005],[.12,1.11],[.84,1.11],[1.005,1],[1.005,.42]],.86,m.accent,.027);
 cabin(p,m,{front:-.78,frontTop:-.55,rear:.05,rearTop:.04,bottom:.5,top:1.045,width:.84,roofWidth:.73,split:-.12});
 interior(p,m,{z:-.35,floor:.34,head:.87});
 profile(p,'short rounded bonnet',[[-1,.35],[-.92,.5],[-.79,.53],[-.69,.44]],.79,m.paint,.026);
 trim(p,m,{front:-1.035,rear:1.052,width:.95});grille(p,m,-1.025,.33,.43,.18);
 for(const x of [-.355,.355])lamp(p,m,x,.4,-.993,.08);
 for(const sign of [-1,1]){
  box(p,'delivery stripe',.015,.115,.89,m.paint,sign*.458,.655,.51);
  cylinder(p,'delivery seal',.145,.012,m.paint,sign*.453,.865,.5,'x',16);
  box(p,'parcel emblem',.018,.115,.14,m.cream,sign*.464,.87,.5);
  box(p,'parcel ribbon',.02,.122,.022,m.amber,sign*.476,.87,.5);
  box(p,'cab step',.13,.045,.41,m.chrome,sign*.45,.035,-.3);
 }
 for(const x of [-.21,.21]){
  box(p,'rear door panel',.365,.63,.018,m.paint,x,.68,1.029);
  box(p,'rear door window',.26,.22,.024,m.glass,x,.85,1.042);
  box(p,'rear door latch',.025,.09,.032,m.chrome,x*.23,.58,1.051);
  for(const y of [.46,.89])box(p,'rear door hinge',.058,.034,.026,m.chrome,x*1.7,y,1.046);
 }
 for(const x of [-.34,.34]){
  rod(p,'roof rack rail',[x,1.21,.14],[x,1.21,.87],.018,m.chrome);
  for(const z of [.22,.78])rod(p,'roof rack leg',[x,1.105,z],[x,1.21,z],.014,m.chrome);
 }
 for(const z of [.22,.5,.78])rod(p,'roof rack crossbar',[-.35,1.18,z],[.35,1.18,z],.016,m.chrome);
 box(p,'large parcel',.41,.19,.34,m.wood,-.08,1.29,.53);
 box(p,'parcel binding',.044,.196,.348,m.cream,-.08,1.29,.53);
 box(p,'small parcel',.24,.14,.28,m.seat,.17,1.265,.54);
 box(p,'small parcel binding',.246,.146,.037,m.cream,.17,1.265,.54);
 mirrors(p,m,.48,.68,-.66);
}

function pickup(p,m,def){
 hull(p,m.paint,{front:-1.1,rear:1.05,top:.37,width:.87,axle:def.wheel_depth/2,radius:.245});fenders(p,m.paint,def);
 profile(p,'long bonnet',[[-1.075,.29],[-.99,.455],[-.46,.48],[-.35,.38]],.78,m.paint,.026);
 rod(p,'bonnet centre strip',[0,.476,-.99],[0,.5,-.43],.012,m.chrome);
 cabin(p,m,{front:-.46,frontTop:-.29,rear:.26,rearTop:.23,bottom:.43,top:.96,width:.8,roofWidth:.69,split:.1});
 interior(p,m,{z:-.06,head:.79});
 box(p,'cab back',.81,.25,.048,m.paint,0,.34,.265);
 trim(p,m,{front:-1.128,rear:1.086,width:.9});grille(p,m,-1.106,.33,.37,.25);
 for(const x of [-.32,.32])lamp(p,m,x,.36,-1.085,.088);
 // Open timber bed, with visible floorboards, corner irons and a tailgate.
 for(let x=-.32;x<.4;x+=.16)box(p,'bed floor plank',.147,.045,.73,m.wood,x,.35,.664);
 for(const sign of [-1,1]){
  box(p,'bed rail',.06,.2,.81,m.paint,sign*.425,.44,.66);
  for(const y of [.57,.7])box(p,'wood bed slat',.035,.075,.75,m.wood,sign*.422,y,.67);
  for(const z of [.32,.95])box(p,'bed upright',.055,.37,.048,m.woodDark,sign*.425,.565,z);
  box(p,'running board',.115,.048,.53,m.dark,sign*.446,.06,-.02);
  for(let z=-.94;z<-.58;z+=.065)box(p,'bonnet ventilation',.012,.056,.017,m.dark,sign*.407,.39,z);
 }
 for(const y of [.43,.57,.7])box(p,'tailgate board',.78,.078,.033,m.wood,0,y,1.036);
 for(const x of [-.3,.3])box(p,'tailgate strap',.035,.34,.021,m.chrome,x,.56,1.059);
 box(p,'produce crate',.29,.22,.29,m.woodDark,-.17,.485,.66);
 for(const y of [.43,.52])for(const x of [-.326,-.014])box(p,'crate slat',.024,.061,.315,m.wood,x,y,.66);
 for(const x of [-.26,-.12])for(const z of [.57,.73])sphere(p,'harvest apple',.061,m.red,x,.59,z);
 sphere(p,'grain sack',.15,m.cream,.18,.49,.77,.8,1.05,1);
 cylinder(p,'sack tie',.045,.042,m.woodDark,.18,.638,.77,'y',8);
 mirrors(p,m,.455,.62,-.38);
}

function streamliner(p,m,def){
 hull(p,m.paint,{front:-1.22,rear:1.13,top:.38,width:.87,axle:def.wheel_depth/2});
 const archChrome=m.chrome.clone();archChrome.side=THREE.DoubleSide;
 // Swept fenders and a tapering tail give this car a different, lower silhouette.
 for(const sign of [-1,1]){
  const fender=profile(p,'swept fender',[[-1.12,.12],[-1.04,.31],[-.83,.39],[-.54,.32],[-.3,.12],[.43,.15],[.6,.34],[.86,.35],[1.1,.13],[1.1,.03],[-1.12,.03]],.19,m.accent,.026);fender.position.x=sign*.43;
  arch(p,archChrome,sign*.535,-def.wheel_depth/2,.222,.015);
  arch(p,archChrome,sign*.535,def.wheel_depth/2,.222,.015);
  rod(p,'long side moulding',[sign*.454,.25,-1.09],[sign*.454,.25,1.05],.013,m.chrome);
  for(let z=-.94;z<-.51;z+=.075)box(p,'bonnet louvre',.014,.059,.023,m.chrome,sign*.387,.39,z);
 }
 profile(p,'tapered bonnet',[[-1.21,.29],[-1.07,.46],[-.61,.53],[-.35,.48],[-.3,.38]],.72,m.paint,.025);
 profile(p,'fastback tail',[[.38,.37],[.36,.64],[.61,.67],[.88,.55],[1.14,.29],[1.1,.2]],.72,m.paint,.024);
 cabin(p,m,{front:-.43,frontTop:-.19,rear:.54,rearTop:.25,bottom:.45,top:.84,width:.74,roofWidth:.58,split:.19});
 interior(p,m,{z:.05,floor:.28,head:.71,cap:m.cream});
 rod(p,'bonnet brightwork',[0,.481,-1.075],[0,.554,-.5],.015,m.chrome);
 sphere(p,'bonnet ornament',.027,m.chrome,0,.535,-.99,.65,1,2);
 trim(p,m,{front:-1.25,rear:1.18,width:.91,y:.1});
 grille(p,m,-1.232,.3,.23,.27);
 for(const x of [-.39,.39])lamp(p,m,x,.31,-1.13,.084);
 for(const sign of [-1,1]){
  box(p,'rear fin trim',.02,.075,.25,m.chrome,sign*.32,.475,.84);
  cylinder(p,'fuel cap',.036,.015,m.chrome,sign*.402,.38,.56,'x');
 }
 box(p,'rear luggage handle',.16,.021,.023,m.chrome,0,.436,1.024);
 mirrors(p,m,.42,.57,-.37);
}

function wheels(car,def,m){
 const result=[];
 for(const sign of [-1,1])for(const end of [-1,1]){
  const pivot=new THREE.Group(),carrier=new THREE.Group();pivot.name=end<0?'front wheel pivot':'rear wheel pivot';carrier.name='rolling wheel';
  pivot.position.set(sign*def.wheel_width/2,0,end*def.wheel_depth/2);pivot.add(carrier);car.add(pivot);result.push(pivot);
  const radius=def.wheel_size;
  cylinder(carrier,'tire',radius,.135,m.tire,0,0,0,'x',16);
  for(const side of [-1,1]){
   cylinder(carrier,'tire shoulder',radius*.88,.009,m.dark,side*.069,0,0,'x',16);
   cylinder(carrier,'steel wheel',radius*.62,.012,m.cream,side*.076,0,0,'x',12);
   cylinder(carrier,'hubcap',radius*.37,.02,m.chrome,side*.084,0,0,'x',10);
   for(let i=0;i<5;i++){
    const a=i*Math.PI*2/5;cylinder(carrier,'wheel vent',.017,.014,m.dark,side*.083,Math.sin(a)*radius*.48,Math.cos(a)*radius*.48,'x',5);
   }
  }
  batch(carrier);
 }
 return result;
}

// Bake static detail into material batches. Cars can remain detailed even in an
// eight-car field; only the body and each axle carrier need dynamic transforms.
function batch(group){
 group.updateMatrixWorld(true);
 const inverse=new THREE.Matrix4().copy(group.matrixWorld).invert(),batches=new Map();
 group.traverse(object=>{
  if(!object.isMesh)return;
  const geometry=(object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone());
  geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,object.matrixWorld));
  const key=object.material;if(!batches.has(key))batches.set(key,{positions:[],normals:[]});
  const b=batches.get(key);b.positions.push(...geometry.attributes.position.array);b.normals.push(...geometry.attributes.normal.array);
  geometry.dispose();object.geometry.dispose();
 });
 group.clear();
 for(const [mat,data] of batches){
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(data.normals,3));
  mesh(group,mat.name,geometry,mat);
 }
}

const builders={rally,van,pickup,streamliner};
const colors={rally:[0xd96239,0xf4dfb4],van:[0x287d88,0xf0dcb4],pickup:[0x567848,0xefd7a5],streamliner:[0x344c6a,0xc79b64]};
export function createRemasteredCar(def){
 const build=builders[def.remasteredId];if(!build)throw new Error(`Unknown remastered car: ${def.remasteredId}`);
 const car=new THREE.Group(),body=new THREE.Group(),m=palette(...colors[def.remasteredId]);
 car.name=def.name;body.name='suspended body';car.add(body);
 build(body,m,def);batch(body);
 car.userData.body=body;car.userData.wheels=wheels(car,def,m);car.userData.remasteredId=def.remasteredId;
 car.scale.setScalar(def.scale??1);return car;
}
