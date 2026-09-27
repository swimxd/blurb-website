// Planar speed, steering and velocity response ported from 0x403990.
// See recovery/DRIVING.md for addresses, constants and the remaining 3D differences.
// heading is a world-space angle: zero travels along +s, pi/2 toward +worldX.
// x remains a road-relative coordinate for gates and existing save files.
export const roadCenter=s=>Math.sin(s/57)*3+Math.sin(s/131)*6;
export const roadHeading=s=>Math.atan(Math.cos(s/57)*3/57+Math.cos(s/131)*6/131);
export const roadHeight=s=>Math.sin(s/37)*1.1+Math.sin(s/83)*1.8;
export const terrainHeight=(s,x)=>roadHeight(s)+(Math.abs(x)<=3?0:(Math.sin(s*.087+x*.27)*1.7+Math.cos(x*.18)*2)*Math.min(1,(Math.abs(x)-3)/11));
const approach=(value,target,amount)=>value<target?Math.min(target,value+amount):Math.max(target,value-amount);
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export function approachSpeed(speed,target,car,dt,brake=false){
 const rate=brake||speed*target<0?2.5*(1+1/(car.weight??1)):(car.acceleration??20)*.1*Math.min(1,Math.abs(target-speed)*.2);
 const next=approach(speed,target,rate*dt);
 return target===0&&Math.abs(next)<.005?0:next;
}
export function stepDriving(p,c,input,dt){
 // Original routine recursively processes chunks of at most 10 milliseconds.
 while(dt>1e-9){const step=Math.min(dt,.01);drivingStep(p,c,input,step);dt-=step;}
}
function drivingStep(p,c,input,dt){
 p.heading??=roadHeading(p.s);p.steer??=0;
 p.vx??=Math.sin(p.heading)*p.speed;p.vs??=Math.cos(p.heading)*p.speed;
 p.stun=0; // Retire the old saved hard-stop penalty.
 const oldS=p.s,oldWorldX=roadCenter(p.s)+p.x;
 const top=Math.abs(p.x)>3.3?(c.max_speed_grass??1.5):Math.abs(p.x)>2.65?(c.max_speed_road_side??2.5):(c.max_speed??10);
 if(input.safe){
  p.speed=approachSpeed(p.speed,input.backward?0:top,c,dt,!!input.backward);
  p.s+=p.speed*dt;
  p.x=approach(p.x,clamp(input.lane??0,-2.7,2.7),Math.abs(p.speed)*.65*dt);
  p.heading=p.speed?Math.atan2(roadCenter(p.s)+p.x-oldWorldX,p.s-oldS):p.heading;
  p.vx=(roadCenter(p.s)+p.x-oldWorldX)/dt;p.vs=(p.s-oldS)/dt;
  p.steer=0;
  return;
 }
 const forward=!!input.forward,backward=!!input.backward;
 const direction=Number(forward)-Number(backward);
 const maxSpeed=c.steering_speed??c.max_speed??10,command=clamp(input.steering??0,-1,1)*(c.max_angle??.35);
 const steeringTarget=command*(1-p.speed/maxSpeed*.8);
 const steeringRate=(2*maxSpeed-p.speed)*.05*(p.steer*command>0?1.5:3);
 p.steer=approach(p.steer,steeringTarget,steeringRate*dt);
 const target=direction>0?top:direction<0?-Math.min(top,c.max_speed_backwards??3):0;
 p.speed=approachSpeed(p.speed,target,c,dt,forward&&backward);
 const response=(80+5*(c.weight??1))*.1*dt;
 p.vx=approach(p.vx,Math.sin(p.heading)*p.speed,response);
 p.vs=approach(p.vs,Math.cos(p.heading)*p.speed,response);
 p.heading+=p.steer*p.speed*dt;
 p.s+=p.vs*dt;
 p.x=oldWorldX+p.vx*dt-roadCenter(p.s);
}
// null: no forward crossing; -1: crossed outside the answer flags.
export function gateCrossing(previous,p,s,count){
 if(previous.s>=s||p.s<s)return null;
 const t=(s-previous.s)/(p.s-previous.s);
 const x=roadCenter(previous.s)+previous.x+t*(roadCenter(p.s)+p.x-roadCenter(previous.s)-previous.x)-roadCenter(s);
 return Math.abs(x)>2.8?-1:clamp(Math.floor((x+2.8)/5.6*count),0,count-1);
}
