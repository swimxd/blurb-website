import {approachSpeed,roadCenter,roadHeading} from './physics.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
export function chooseAnswerLane(question,probability,rng){
 const correct=Math.max(0,question.options.indexOf(question.answer)),wrong=question.options.map((_,i)=>i).filter(i=>i!==correct);
 return !wrong.length||rng()<probability?correct:wrong[Math.floor(rng()*wrong.length)];
}
// Reconstructed path following: steer into lane changes rather than sliding x.
export function stepOpponent(o,car,{targetX,gateS,traffic=[],cruise=1},dt){
 o.heading??=roadHeading(o.s);o.steer??=0;
 if(o.pathGate!==gateS||o.pathTargetX!==targetX){
  o.pathGate=gateS;o.pathTargetX=targetX;o.pathStartX=o.x;
  o.pathStartS=o.s+6;o.pathEndS=Math.max(o.pathStartS+8,gateS-7);
 }
 const look=Math.max(3,Math.abs(o.speed)*.85),aimS=o.s+look;
 const t=clamp((aimS-o.pathStartS)/(o.pathEndS-o.pathStartS),0,1),smooth=t*t*(3-2*t);
 let aimX=o.pathStartX+(targetX-o.pathStartX)*smooth;
 let targetSpeed=car.max_speed*cruise;
 const ahead=traffic.filter(p=>p.s>o.s&&p.s-o.s<Math.max(3,o.speed*1.3)&&Math.abs(p.x-o.x)<.85).sort((a,b)=>a.s-b.s)[0];
 if(ahead){
  const gap=ahead.s-o.s,lead=Math.max(0,ahead.speed*Math.cos((ahead.heading??roadHeading(ahead.s))-roadHeading(ahead.s)));
  targetSpeed=Math.min(targetSpeed,Math.max(0,lead+(gap-2)*1.3));
  // Pass only with room before the gate and an unoccupied adjacent corridor.
  const side=o.x<=0?1:-1,passing=clamp(o.x+side*1.3,-2.1,2.1);
  if(gateS-o.s>20&&o.speed>1&&traffic.every(p=>Math.abs(p.s-o.s)>5||Math.abs(p.x-passing)>.9))aimX=passing;
 }
 const worldX=roadCenter(o.s)+o.x,dx=roadCenter(aimS)+aimX-worldX;
 const desired=Math.atan2(dx,look),curvature=2*Math.sin(wrap(desired-o.heading))/Math.hypot(dx,look);
 const steer=clamp(Math.atan(1.4*curvature),-.45,.45);
 o.steer+=clamp(steer-o.steer,-dt*1.5,dt*1.5);
 o.speed=approachSpeed(o.speed,targetSpeed,car,dt,targetSpeed<o.speed);
 const yaw=o.speed*Math.tan(o.steer)/1.4*dt,heading=o.heading+yaw/2;
 o.vx=Math.sin(heading)*o.speed;o.vs=Math.cos(heading)*o.speed;
 o.s+=o.vs*dt;o.x=worldX+o.vx*dt-roadCenter(o.s);o.heading+=yaw;
}
