export const tracks=[
 {id:'valley',name:'Windmill Valley',subtitle:'Orchards, stone bridges & rolling fields',color:'#7eab64',sky:'#c6e5ee',length:1400,knots:[[0,0,0],[110,4,1],[240,17,2.5],[370,6,.5],[520,-12,1.7],[670,-17,3],[820,2,.6],[1000,19,2],[1190,6,1],[1400,0,0]]},
 {id:'alpine',name:'Alpine Post Road',subtitle:'Pine forests & snowy mountain peaks',color:'#6f9b95',sky:'#c9e4f5',length:1400,knots:[[0,0,0],[130,-8,2],[275,-24,4],[410,-12,3],[570,12,5],[720,24,3],[870,10,1],[1050,-14,3],[1220,-9,1],[1400,0,0]]},
 {id:'harbour',name:'Harbour Road',subtitle:'Seaside villages & a lighthouse on the bay',color:'#6daebc',sky:'#c5e9f1',length:1400,knots:[[0,0,0],[160,5,.5],[310,25,1.2],[470,33,.4],[630,18,.8],[790,-5,1.8],[940,-18,.3],[1110,-10,1],[1260,-3,.6],[1400,0,0]]},
 {id:'desert',name:'Desert Caravan',subtitle:'Golden dunes, sandstone arches & an oasis',color:'#cd9d68',sky:'#f4dbc0',length:1400,knots:[[0,0,0],[180,-6,1],[360,-18,2],[550,-4,.5],[710,18,1.5],[880,25,3],[1030,9,1],[1210,-7,2],[1400,0,0]]}
];
let active=null;
let distances=null;
export function selectTrack(id){active=tracks.find(t=>t.id===id)??null;distances=null;return active;}
export function currentTrack(){return active;}
function sample(s,axis){
 const k=active.knots,n=k.length-1,L=active.length,t=((s%L)+L)%L;
 let i=0;while(i<n-1&&t>k[i+1][0])i++;
 const a=k[i],b=k[i+1],prev=i?k[i-1]:[k[n-1][0]-L,...k[n-1].slice(1)],next=i+2<=n?k[i+2]:[k[1][0]+L,...k[1].slice(1)];
 const span=b[0]-a[0],u=(t-a[0])/span,m0=(b[axis]-prev[axis])/(b[0]-prev[0])*span,m1=(next[axis]-a[axis])/(next[0]-a[0])*span;
 return (2*u**3-3*u*u+1)*a[axis]+(u**3-2*u*u+u)*m0+(-2*u**3+3*u*u)*b[axis]+(u**3-u*u)*m1;
}
export function trackCenter(s){return active?sample(s,1):Math.sin(s/57)*3+Math.sin(s/131)*6;}
export function trackHeight(s){return active?sample(s,2):Math.sin(s/37)*1.1+Math.sin(s/83)*1.8;}
export function trackHeading(s){return active?Math.atan((trackCenter(s+.05)-trackCenter(s-.05))/.1):Math.atan(Math.cos(s/57)*3/57+Math.cos(s/131)*6/131);}
export function trackTerrain(s,x){
 const h=trackHeight(s);if(Math.abs(x)<=3)return h;
 const rise=Math.min(1,(Math.abs(x)-3)/11);
 if(!active)return h+(Math.sin(s*.087+x*.27)*1.7+Math.cos(x*.18)*2)*rise;
 if(active.id==='harbour'&&x>5)return h-Math.min(5,(x-5)*.15)*rise;
 const scale=active.id==='alpine'?2.8:active.id==='desert'?1.6:1;
 return h+(Math.sin(s*.025+x*.07)*2+Math.cos(x*.09)*1.4)*rise*scale;
}
// Unwrapped distance along the route, including elevation; never nearest-point
// projections, so reversing cannot jump to a different part of the course.
export function trackDistance(s){
 if(!active)return s;
 if(!distances){distances=[0];for(let i=1;i<=active.length;i++)distances[i]=distances[i-1]+Math.hypot(1,trackCenter(i)-trackCenter(i-1),trackHeight(i)-trackHeight(i-1));}
 const lap=Math.floor(s/active.length),local=s-lap*active.length,i=Math.floor(local);
 return lap*distances.at(-1)+distances[i]+(distances[i+1]-distances[i])*(local-i);
}
