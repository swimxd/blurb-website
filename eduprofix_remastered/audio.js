// Synthesized locally; no downloaded tracks or audio autoplay before a gesture.
export class RaceAudio{
 async start(){
  try{
   if(!this.ctx){const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(!C)return;this.ctx=new C();const c=this.ctx;this.engine=c.createOscillator();this.engine.type='triangle';this.engineGain=c.createGain();this.engineGain.gain.value=0;this.engine.connect(this.engineGain).connect(c.destination);this.engine.start();
    const buffer=c.createBuffer(1,c.sampleRate*3,c.sampleRate),data=buffer.getChannelData(0);let prior=0;for(let i=0;i<data.length;i++){prior=(prior+Math.random()*.08-.04)*.98;data[i]=prior;}this.wind=c.createBufferSource();this.wind.buffer=buffer;this.wind.loop=true;const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=700;this.ambientGain=c.createGain();this.ambientGain.gain.value=0;this.wind.connect(filter).connect(this.ambientGain).connect(c.destination);this.wind.start();
   }await this.ctx.resume();
  }catch{/* The game remains playable when browser audio is unavailable. */}
 }
 update(speed,throttle,options,running){if(!this.ctx)return;const t=this.ctx.currentTime;this.engine.frequency.setTargetAtTime(42+Math.abs(speed)*5,t,.1);this.engineGain.gain.setTargetAtTime(running?options.engineVolume*(throttle?.11:.055):0,t,.08);this.ambientGain.gain.setTargetAtTime(running?options.ambientVolume*(.2+Math.abs(speed)*.009):0,t,.2);}
 silence(){if(!this.ctx)return;this.engineGain.gain.setTargetAtTime(0,this.ctx.currentTime,.03);this.ambientGain.gain.setTargetAtTime(0,this.ctx.currentTime,.03);}
}
