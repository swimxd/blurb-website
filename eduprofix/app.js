import {assetUrl} from './assets.js';
import {stepOpponent,chooseAnswerLane} from './ai.js';
import {World,gateColors} from './world.js';
import {makeQuestions,answerQuestion,finishRound,shuffle,seededRandom,findCar,isFlagGame,normalizeFlagSession} from './game.js';
import {parseCustomGame,customRecords} from './custom-content.js';
import {stepDriving,gateCrossing,roadHeading} from './physics.js';
import {standingsLayout,compareRacePosition,recordFinish,subjectRank,knownFinishCount} from './ui-rules.js';

const ui=document.querySelector('#ui'),stage=document.querySelector('#game'),canvas=document.querySelector('#scene');
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const imageValue=value=>value.startsWith('&')?`<img class="flag-image" src="${escape(assetUrl(value.slice(1)))}" alt="Flag">`:escape(value);
function message(text){const n=document.querySelector('#notice');n.textContent=text;n.style.display='block';clearTimeout(message.timer);message.timer=setTimeout(()=>n.style.display='none',5500);}
window.addEventListener('error',e=>message(e.message));window.addEventListener('unhandledrejection',e=>message(e.reason?.message||String(e.reason)));
let world;try{world=new World(canvas);}catch(e){ui.innerHTML='<div class="panel" style="margin:120px 50px"><h2>Graphics unavailable</h2><p>Enable hardware acceleration in your browser and reopen EduProfix.</p></div>';throw e;}
const [catalog,records]=await Promise.all(['catalog','records'].map(name=>fetch('/eduprofix/generated/'+name+'.json').then(r=>{if(!r.ok)throw new Error('Run the build before launching');return r.json();})));
let profile;try{profile=JSON.parse(localStorage.getItem('eduprofix.profile.v1'));if(profile&&(!profile.name||!profile.stats))throw new Error('invalid profile');}catch{message('The saved profile could not be loaded. You can create a new player.');profile=null;}
let customText=catalog.customText;
try{const stored=localStorage.getItem('eduprofix.custom.v1');if(stored){const custom=customRecords(parseCustomGame(stored));for(let i=records.length-1;i>=0;i--)if(records[i].id.startsWith('custom'))records.splice(i,1);records.push(...custom);customText=stored;}}catch{message('Your edited custom game could not be loaded; the supplied game is available.');}
let subjects=records.filter(r=>r.type==='0011');let screen='menu',subjectIndex=0,page=0,carIndex=5,selectedGame=null,session=null,paused=false,keys=new Set(),autoLane=0,frameTime=performance.now(),accumulator=0;
try{const saved=JSON.parse(localStorage.getItem('eduprofix.session.v1'));if(saved?.player?.name===profile?.name&&Array.isArray(saved.questions)&&saved.questions.length&&saved.car&&saved.game)session=saved;}catch{message('The saved race could not be restored; your player statistics are still available.');}
function save(){try{const previous=localStorage.getItem('eduprofix.profile.v1');if(previous)localStorage.setItem('eduprofix.profile.backup',previous);localStorage.setItem('eduprofix.profile.v1',JSON.stringify(profile));if(session)localStorage.setItem('eduprofix.session.v1',JSON.stringify(session));else localStorage.removeItem('eduprofix.session.v1');}catch{message('Your browser could not save progress. Allow local storage to keep your player.');}}
function action(id,fn){const el=document.getElementById(id);if(el)el.onclick=()=>Promise.resolve().then(fn).catch(e=>{console.error(e);message(e.message);});}
function resetUI(name,html,keepScene=false){screen=name;stage.dataset.screen=name;paused=false;keys.clear();if(!keepScene){world.clear();canvas.style.visibility='hidden';}ui.innerHTML=html;document.querySelector('#notice').style.display='none';}
function title(){return `<h1 class="name">${escape(profile?.name||'New player')}</h1>`;}
function footer(back='Back'){return `<div class="footer"><button id="back">${back}</button></div>`;}
function rank(points){return subjectRank(records.filter(r=>r.type==='0004'),points);}
function statistics(st){
 const total=st.correct+st.wrong,percent=n=>total?(100*n/total).toFixed(2)+'%':'0.00%';
 return `<div class="stat-line"><span>Questions:</span><span>${total}</span></div><div class="stat-line"><span>Correct:</span><span>${st.correct}</span><span>${percent(st.correct)}</span></div><div class="stat-line"><span>Wrong:</span><span>${st.wrong}</span><span>${percent(st.wrong)}</span></div><div class="stat-line stat-gap"><span>Races played:</span><span>${st.races}</span></div>${[[1,'1st'],[2,'2nd'],[3,'3rd'],[7,'7th'],[8,'last']].map(([place,label])=>{const n=knownFinishCount(st,place);return `<div class="stat-line"><span>Finished ${label}:</span><span>${n??'—'}</span><span>${n===null?'':st.races?Math.round(n/st.races*100)+'%':'0%'}</span></div>`;}).join('')}`;
}
function settings(){
 resetUI('settings',`<h1 class="name">${profile?'Settings':'New player'}</h1><form id="settings" class="panel" style="position:absolute;left:125px;top:150px;width:550px"><label>Name <input name="name" aria-label="Player name" value="${escape(profile?.name||'BestOne')}" maxlength="24" required></label><label>Playing mode <select name="mode" aria-label="Playing mode"><option value="safe">Safe</option><option value="normal">Normal</option><option value="turbo">Turbo</option></select></label><p class="help">Safe: select the answer; the computer drives.<br>Normal: ↑ accelerate · ↓ brake/reverse · ← → steer.<br>Turbo: the same controls with faster cars.</p><button style="margin-top:18px" type="submit">Continue</button></form>`);
 const form=document.querySelector('#settings');form.elements.mode.value=profile?.mode||'normal';
 form.onsubmit=e=>{
  e.preventDefault();const name=form.elements.name.value.trim();if(!name)return;
  profile={...profile,name,mode:form.elements.mode.value,stats:profile?.stats||{correct:0,wrong:0,races:0,wins:0,points:{},finishCounts:{}}};
  if(session){session.player.name=name;if(session.snapshot){session.snapshot.state.player.name=name;const finish=session.snapshot.state.finishSnapshot;if(finish){finish.player.name=name;for(const row of finish.order)if(row.isPlayer)row.name=name;}}}
  save();menu();
 };
}
function menu(){
 const st=profile.stats,levels=subjects.filter(s=>s.id!=='custom').map(s=>rank(st.points[s.id]||0).level),rating=levels.reduce((n,v)=>n+v,0)/levels.length,max=Math.max(3,...levels);
 resetUI('menu',`${title()}<div class="stats panel">${statistics(st)}<p class="rating">Your rating: ${rating.toFixed(2)}</p><div class="bars"><span class="bar-max">${max}</span>${subjects.filter(s=>s.id!=='custom').map((s,i)=>`<i title="${escape(s.EN)}: ${st.points[s.id]||0} points" style="height:${levels[i]/max*100}%"></i>`).join('')}</div></div><div class="menu"><button id="flags">Country flags</button><button id="multi">Multi player</button><button id="settingsBtn">Settings</button></div>${footer('Exit')}${session?'<button id="resume" class="small">Continue game</button>':''}`);
 action('multi',()=>message('Network multiplayer is not yet ported. Single player includes the original computer opponents.'));action('settingsBtn',settings);action('back',()=>message('You can close this browser tab to exit. Your player is saved.'));action('resume',()=>session.phase==='race'&&session.snapshot?startRace(true):session.phase==='results'?results():intro());
 const flags=document.createElement('button');flags.id='single';flags.className='small flag-shortcut';flags.textContent='Other subjects';ui.append(flags);
 action('single',()=>{session=null;save();subjectsScreen();});
 action('flags',()=>{session=null;save();selectedGame=records.find(g=>g.id==='10e1');return carsScreen();});
}
function subjectsScreen(){
 const s=subjects[subjectIndex],points=profile.stats.points[s.id]||0;resetUI('subjects',`<div class="nav-arrows"><button id="prev" class="arrow left" aria-label="Previous subject">◀</button><button id="next" class="arrow right" aria-label="Next subject">▶</button></div><div class="panel subject-name"><h2>${escape(s.EN)}</h2></div><div class="panel subject-info"><p class="minor-title">Player statistics</p>${statistics(profile.stats)}<p class="subject-status">Status: ${escape(rank(points).name)}<br>Points: ${points}</p></div>${footer()}<button id="choose" class="rightfooter">Select</button>`);
 action('prev',()=>{subjectIndex=(subjectIndex+subjects.length-1)%subjects.length;subjectsScreen();});action('next',()=>{subjectIndex=(subjectIndex+1)%subjects.length;subjectsScreen();});action('choose',()=>{page=0;gamesScreen();});action('back',menu);
}
function gamesScreen(){
 const subject=subjects[subjectIndex],games=records.filter(r=>r.type==='0010'&&r.subject===subject.id),points=profile.stats.points[subject.id]||0;
 const status=rank(points);resetUI('games',`${title()}<div class="game-status">${points} ${points===1?'point':'points'} - ${escape(status.name)}<small>${status.needed?`You need ${status.needed} ${status.needed===1?'point':'points'} to upgrade your status.`:escape(subject.EN)}</small></div><div class="list">${games.slice(page*4,page*4+4).map(g=>`<div class="row"><span>${escape(g.EN)}</span><span class="points">+${escape(g.points)}</span><button data-game="${g.id}">Play</button></div>`).join('')}</div>${footer()}<button class="arrow up" id="prevpage" aria-label="Previous games" ${page===0?'disabled':''}>▲</button><button class="arrow down" id="nextpage" aria-label="Next games" ${(page+1)*4>=games.length?'disabled':''}>▼</button>`);
 for(const b of ui.querySelectorAll('[data-game]'))b.onclick=()=>{selectedGame=games.find(g=>g.id===b.dataset.game);carsScreen();};action('back',subjectsScreen);action('prevpage',()=>{page--;gamesScreen();});action('nextpage',()=>{page++;gamesScreen();});
 if(subject.id==='custom'){const button=document.createElement('button');button.id='edit';button.textContent='Edit';button.style.cssText='position:absolute;left:250px;bottom:18px';ui.append(button);action('edit',editCustom);}
}
function editCustom(){
 resetUI('editor',`<h1 class="name">Custom games</h1><textarea aria-label="Custom game text" id="customText" style="position:absolute;left:30px;top:130px;width:740px;height:350px;font:17px monospace;resize:none">${escape(customText)}</textarea>${footer()}<button class="rightfooter" id="saveCustom">Save</button>`);
 action('back',gamesScreen);action('saveCustom',()=>{const value=document.querySelector('#customText').value,custom=customRecords(parseCustomGame(value));localStorage.setItem('eduprofix.custom.v1',value);customText=value;for(let i=records.length-1;i>=0;i--)if(records[i].id.startsWith('custom'))records.splice(i,1);records.push(...custom);subjects=records.filter(r=>r.type==='0011');page=0;gamesScreen();});
}
async function carsScreen(){
 const car=catalog.cars[carIndex],def=profile.mode==='turbo'?car.turboConfig:car;
 resetUI('cars',`<div class="nav-arrows"><button id="prevcar" class="arrow left" aria-label="Previous car">◀</button><button id="nextcar" class="arrow right" aria-label="Next car">▶</button></div><div class="panel car-info"><h2>${escape(car.name)}</h2><p>Max speed: ${(def.max_speed*10).toFixed(2)}<br>Acceleration: ${def.acceleration>=25?'Very Fast':def.acceleration>=15?'Fast':'Normal'}<br>Handling: ${def.max_angle>=.35?'Very good':'Good'}<br>${def.preferred_start===1?'Pole-position<br>':''}${escape(car.desc||'')}</p></div>${footer()}<button id="start" class="rightfooter">Start game</button>`);
 canvas.style.visibility='visible';action('prevcar',()=>{carIndex=(carIndex+catalog.cars.length-1)%catalog.cars.length;return carsScreen();});action('nextcar',()=>{carIndex=(carIndex+1)%catalog.cars.length;return carsScreen();});action('back',()=>isFlagGame(selectedGame.id)?menu():gamesScreen());action('start',()=>{const all=makeQuestions(records,selectedGame.id,1,'EN');if(!all.length)throw new Error('No questions available for this game');const flags=isFlagGame(selectedGame.id),lives=flags?5:4;session={game:selectedGame,car:structuredClone(def),questions:all.slice(0,selectedGame.custom?.count??(flags?15:9)),round:1,player:{name:profile.name,score:0,lives,bonus:0,hint:0,correct:0,wrong:0},opponents:shuffle(catalog.opponents).slice(0,7).map(o=>({...o,score:0,lives,correct:0,wrong:0})),terrain:0};intro();});await world.preview(def);
}
function intro(){
 session.phase='intro';save();
 resetUI('intro',`<h1 class="round-title">Round ${session.round}</h1><p class="study-caption">${escape(session.game.EN)}</p><div class="study-header"><span>Remaining</span><span>% correct</span></div><div class="questions">${session.questions.map((q,i)=>`<div class="question-row ${q.attempts&&q.correctAnswers<q.attempts?'missed':''}" style="opacity:${q.remaining>0?1:.45}"><span>${i+1}.</span><span class="study-prompt">${imageValue(q.prompt)}</span><span>=</span><span class="study-answer">${imageValue(q.answer)}</span><span>${q.remaining}</span><span>${q.attempts?Math.round(q.correctAnswers/q.attempts*100):''}</span></div>`).join('')}</div>${footer('Main menu')}<button id="race" class="rightfooter" aria-label="Start race">Start race</button>`);action('back',menu);action('race',startRace);
}
let state=null,feedbackUntil=0,feedbackText='',raceQueue=[],questionIndex=0,nextGate=32,rng=Math.random;
function currentQuestion(){return raceQueue[questionIndex]??{prompt:'Finish',options:[]};}
function gateSpacing(){return isFlagGame(session.game.id)?48:32;}
function checkpointRace(){
 session.phase='race';session.snapshot={state:structuredClone(state),queueIds:raceQueue.map(q=>q.id),questionIndex,nextGate,autoLane,rngState:rng.state()};Object.assign(session.player,state.player);save();
}
async function startRace(resume=false){
 normalizeFlagSession(session);
 resetUI('loading',`<div class="panel" style="position:absolute;top:250px;left:250px"><h2>Preparing race…</h2></div>`);canvas.style.visibility='visible';
 if(resume&&session.snapshot){
  const snap=session.snapshot;state=structuredClone(snap.state);questionIndex=snap.questionIndex;nextGate=snap.nextGate;rng=seededRandom(snap.rngState);raceQueue=snap.queueIds.map(id=>session.questions.find(q=>q.id===id));
  if(raceQueue.some(q=>!q)||questionIndex>raceQueue.length)throw new Error('The saved race references missing questions.');
 }else{
  rng=seededRandom(session.round*591+173);raceQueue=shuffle(session.questions.filter(q=>q.remaining>0),rng);questionIndex=0;nextGate=isFlagGame(session.game.id)?40:32;
  const grid=session.car.preferred_start===1?-5:session.car.preferred_start===-1?8:0;
  state={player:{...session.player,s:0,x:0,speed:0,steer:0,vx:0,vs:0,stun:0,finishTime:undefined,finishS:undefined,finishOrderS:undefined,heading:roadHeading(0)},opponents:session.opponents.map((o,i)=>({...o,s:grid-Math.floor(i/3)*3,x:(i%3-1)*1.6,speed:0,heading:roadHeading(grid-Math.floor(i/3)*3),steer:0,finishTime:undefined,finishS:undefined,finishOrderS:undefined,pathGate:null,next:nextGate,gate:0,targetLane:null})),elapsed:0,countdown:3};
 }
 // Older saves did not record finish crossings. Preserve their existing order
 // beyond the line; the checkpoint time is an upper bound, not an exact time.
 const restoredLine=isFlagGame(session.game.id)?40+48*(raceQueue.length-1)+24:32*raceQueue.length;
 for(const o of state.opponents)if(o.finishTime==null&&o.s>=restoredLine){o.finishTime=state.elapsed;o.finishS=restoredLine;o.finishOrderS=o.s;}
 if(state.player.heading===undefined){state.player.heading=roadHeading(state.player.s);state.player.steer=0;}
 await world.race(session.car,state.opponents,session.terrain,catalog,session.round);
 screen='race';stage.dataset.screen='race';paused=false;keys.clear();autoLane=resume?(session.snapshot.autoLane??state.player.x):state.player.x;feedbackText='';world.setGate(nextGate,currentQuestion().options);world.updateRace(state,0);drawHUD();if(state.finishRemaining>0)drawFinishOverlay();checkpointRace();
}
function drawHUD(){
 const q=currentQuestion(),p=state.player;
 ui.innerHTML=`<div class="hud"><div class="question">${imageValue(q.prompt)}</div><div class="answers">${q.options.map((a,i)=>`<div role="button" tabindex="0" aria-label="Answer ${i+1}: ${escape(a.startsWith('&')?'flag':a)}" class="answer" data-answer="${i}" style="background:#${gateColors[i].toString(16)}">${imageValue(a)}</div>`).join('')}</div><aside class="sidebar"><div>${questionIndex+1} / ${raceQueue.length}</div><div>Round ${session.round}</div><div id="remaining">${session.questions.reduce((n,q)=>n+q.remaining,0)}</div><div class="standings" id="standings"></div></aside><div class="lives" id="lives" aria-label="Lives"><span>${p.lives}</span></div><div class="speed" id="speed">0</div><div class="timing" id="timing"></div><div class="feedback" id="feedback"></div><div class="countdown" id="countdown" aria-label="Race countdown"></div></div><button class="pause" id="pause">Pause [Esc]</button>`;
 for(const b of ui.querySelectorAll('[data-answer]')){const choose=()=>{autoLane=-2.8+(Number(b.dataset.answer)+.5)*5.6/q.options.length;if(profile.mode!=='safe')message('Drive under this answer’s colored gate using the arrow keys.');};b.onclick=choose;b.onkeydown=e=>{if(e.key==='Enter'||e.key===' ')choose();};}action('pause',togglePause);
 if(isFlagGame(session.game.id)&&profile.mode!=='safe')document.querySelector('.answers').hidden=true;
 if(questionIndex===raceQueue.length)document.querySelector('.sidebar>div').textContent='Finish';
}
function togglePause(){if(screen!=='race')return;paused=!paused;keys.clear();if(paused){checkpointRace();const overlay=document.createElement('div');overlay.id='paused';overlay.className='overlay';overlay.innerHTML='<div class="panel"><h2>Paused</h2><button id="continue">Continue</button><button id="leave">Main menu</button></div>';ui.append(overlay);action('continue',togglePause);action('leave',menu);}else document.querySelector('#paused')?.remove();}
function tick(dt){
 if(screen!=='race'||paused)return;
 if((state.countdown??0)>0){state.countdown=Math.max(0,state.countdown-dt);return;}
 state.elapsed+=dt;const p=state.player,c=session.car,safe=profile.mode==='safe';
 if(state.finishRemaining>0){
  const coast={...c,steering_speed:c.max_speed,max_speed:3,max_speed_grass:2,max_speed_road_side:2.5};
  stepDriving(p,coast,{safe,lane:autoLane,forward:keys.has('ArrowUp'),backward:keys.has('ArrowDown'),steering:(keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0)},dt);
  state.opponents.forEach(o=>stepOpponent(o,{...findCar(catalog,o.car),max_speed:2.5},{targetX:o.pathTargetX??o.x,gateS:o.next},dt));
  state.finishRemaining=Math.max(0,state.finishRemaining-dt);world.updateRace(state,dt);if(state.finishRemaining===0)endRace();return;
 }
 const previous={s:p.s,x:p.x};
 stepDriving(p,c,{safe,lane:autoLane,forward:keys.has('ArrowUp'),backward:keys.has('ArrowDown'),steering:(keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0)},dt);
 for(const [i,o] of state.opponents.entries()){
  const base=findCar(catalog,o.car),def=profile.mode==='turbo'?base.turboConfig:base,speed=def.max_speed;
  const q=raceQueue[o.gate];
  if(q&&o.targetLane==null)o.targetLane=chooseAnswerLane(q,Number(o.answer_probability),rng);
  const beforeAI={s:o.s,x:o.x};
  const targetX=q?-2.8+(o.targetLane+.5)*5.6/q.options.length:(o.pathTargetX??o.x);
  stepOpponent(o,o.finishTime!=null?{...def,max_speed:2.5}:def,{targetX,gateS:o.next,traffic:[p,...state.opponents.filter(other=>other!==o)],cruise:.92},dt);
  const finishLine=isFlagGame(session.game.id)?40+48*(raceQueue.length-1)+24:32*raceQueue.length;
  if(o.finishTime==null&&beforeAI.s<finishLine&&o.s>=finishLine){o.finishTime=state.elapsed-dt+dt*(finishLine-beforeAI.s)/(o.s-beforeAI.s);o.finishS=finishLine;}
  if(o.s>=o.next&&o.gate<raceQueue.length){const q=raceQueue[o.gate],lane=gateCrossing(beforeAI,o,o.next,q.options.length),correct=lane!==null&&lane>=0&&q.options[lane]===q.answer,dummy={remaining:1};answerQuestion(o,dummy,correct,def);o.gate++;o.next+=gateSpacing();o.targetLane=null;}
 }
 if(questionIndex===raceQueue.length){if(p.s>=nextGate&&previous.s<nextGate){beginFinish(state.elapsed-dt+dt*(nextGate-previous.s)/(p.s-previous.s));return;}world.updateRace(state,dt);return;}
 const lane=gateCrossing(previous,p,nextGate,currentQuestion().options.length);
 if(lane!==null){
  const q=currentQuestion(),correct=lane>=0&&q.options[lane]===q.answer;
  answerQuestion(p,q,correct,c);profile.stats[correct?'correct':'wrong']++;feedbackText=correct?'Correct! +10':`Wrong answer · ${q.answer.startsWith('&')?'':q.answer}`;feedbackUntil=state.elapsed+2;
  
  questionIndex++;nextGate+=gateSpacing();
  if(questionIndex>=raceQueue.length){if(!isFlagGame(session.game.id)){beginFinish(state.elapsed-dt+dt*(nextGate-32-previous.s)/(p.s-previous.s));return;}nextGate-=24;}
  world.setGate(nextGate,currentQuestion().options);drawHUD();checkpointRace();
 }
 world.updateRace(state,dt);
}
function updateHUD(){if(screen!=='race')return;const p=state.player;
 const countdown=document.querySelector('#countdown');countdown.hidden=!(state.countdown>0);countdown.textContent=state.countdown>0?Math.ceil(state.countdown):'';
 document.querySelector('#speed').textContent=(p.speed<0?'R ':'')+Math.round(Math.abs(p.speed)*10);document.querySelector('#lives span').textContent=p.lives;
 const racers=[{...p,color:'ffffff00',isPlayer:true},...state.opponents],order=standingsLayout(racers,455);
 document.querySelector('#standings').innerHTML=order.map((o,i)=>`<div class="standing" style="top:${o.top.toFixed(1)}px;color:#${String(o.color||'ffffffff').slice(-6)}">${o.score} ${escape(o.name)}</div>`).join('');
 document.querySelector('#timing').innerHTML=racers.sort(compareRacePosition).map((o,i)=>`<div style="color:#${String(o.color).slice(-6)}">${i+1}. ${escape(o.name)}${o.isPlayer?'':': '+(p.s-o.s).toFixed(2)}</div>`).join('');
 document.querySelector('#feedback').textContent=state.elapsed<feedbackUntil?feedbackText:'';
}
function drawFinishOverlay(){
 document.querySelector('#finishOverlay')?.remove();
 const overlay=document.createElement('div');overlay.id='finishOverlay';overlay.className='finish-overlay';
 overlay.innerHTML='<h2>Finished!</h2><ol>'+state.finishSnapshot.order.map(o=>'<li style="color:#'+String(o.isPlayer?'ffffff00':o.color||'ffffffff').slice(-6)+'">'+escape(o.name)+'</li>').join('')+'</ol>';ui.append(overlay);
}
function beginFinish(time=state.elapsed){
 if(state.finishSnapshot)return;
 const p=state.player;p.finishTime=time;p.finishS=isFlagGame(session.game.id)?nextGate:nextGate-32;
 const order=[{...p,isPlayer:true},...state.opponents.map(o=>({...o}))].sort(compareRacePosition);
 state.finishSnapshot={player:structuredClone(p),opponents:structuredClone(state.opponents),order,place:order.findIndex(o=>o.isPlayer)+1};state.finishRemaining=6;
 const ratio=Math.abs(p.speed)>3?3/Math.abs(p.speed):1;p.speed*=ratio;p.vx*=ratio;p.vs*=ratio;
 drawFinishOverlay();checkpointRace();
}
function endRace(){
 const p=state.finishSnapshot.player,place=state.finishSnapshot.place;
 Object.assign(session.player,p);
 finishRound(session.player,session.questions,place,8,session.car);
 const ranked=[{...session.player,isPlayer:true},...state.finishSnapshot.opponents].sort(compareRacePosition);
 session.lastResults=ranked.map(o=>({name:o.name,isPlayer:!!o.isPlayer}));recordFinish(session.player,place);
 for(let i=0;i<ranked.length;i++)if(!ranked[i].isPlayer)recordFinish(ranked[i],i+1);
 for(let i=0;i<ranked.length;i++)if(!ranked[i].isPlayer)ranked[i].score+=[20,12,8,6,4,2,1,0][i];
 session.opponents=ranked.filter(o=>!o.isPlayer);const overall=[session.player,...session.opponents].sort((a,b)=>b.score-a.score);
 if(overall[0]===session.player)for(const q of session.questions)q.remaining=Math.max(0,q.remaining-1);
 recordFinish(profile.stats,place);profile.stats.races++;if(place===1)profile.stats.wins++;
 const complete=session.questions.every(q=>q.remaining===0);if(complete)profile.stats.points[session.game.subject]=(profile.stats.points[session.game.subject]||0)+Number(session.game.points);
 session.complete=complete;session.place=place;save();results();
}
function results(){
 session.phase='results';delete session.snapshot;save();
 const all=[session.player,...session.opponents].sort((a,b)=>b.score-a.score);
 const last=session.lastResults??[{...session.player,isPlayer:true},...session.opponents].sort(compareRacePosition);
 resetUI('results',`<p class="finish-message">${session.complete?'Game completed! +'+session.game.points+' points':`Ok. You finished ${session.place}${session.place===1?'st':session.place===2?'nd':session.place===3?'rd':'th'}.`}</p><p class="overall-title">Overall standings:</p><table class="results"><thead><tr><th></th><th>Score</th><th>Correct</th><th>1</th><th>2</th><th>3</th><th>Lives</th><th>Speed</th></tr></thead><tbody>${all.map((p,i)=>`<tr class="${p===session.player?'player-result':''}"><td>${i+1}. ${escape(p.name)}</td><td>${p.score}</td><td>${p.correct+p.wrong?(p.correct/(p.correct+p.wrong)*100).toFixed(1):'0.0'}%</td>${[1,2,3].map(n=>`<td>${p.finishCounts?.[n]??0}</td>`).join('')}<td>${p.lives}</td><td>${((p===session.player?session.car:profile.mode==='turbo'?findCar(catalog,p.car).turboConfig:findCar(catalog,p.car)).max_speed*10).toFixed(1)}</td></tr>`).join('')}</tbody></table><div class="last-results"><p>Last round results:</p><ol>${last.map(p=>`<li class="${p.isPlayer?'player-result':''}">${escape(p.name)}</li>`).join('')}</ol></div><div class="upgrade"><p>You can buy ${session.player.bonus} ${session.player.bonus===1?'item':'items'}:</p><button id="lifeup" aria-label="Life +" ${session.player.bonus<1?'disabled':''}>Lives: ${session.player.lives}</button><button id="accelup" aria-label="Acceleration +" ${session.player.bonus<1?'disabled':''}>Acceleration +</button><button id="speedup" aria-label="Speed +" ${session.player.bonus<1?'disabled':''}>Speed: ${(session.car.max_speed*10).toFixed(1)}</button></div>${footer('Main menu')}<button id="nextRound" class="rightfooter arrow right">${session.complete?'Continue':'Next race'}</button>`);
 function buy(field,amount){if(session.player.bonus<1)return;session.player.bonus--;if(field==='lives')session.player.lives+=amount;else session.car[field]+=amount;results();}
 action('speedup',()=>buy('max_speed',session.car.extra_speed??.2));action('accelup',()=>buy('acceleration',session.car.extra_acceleration??.1));action('lifeup',()=>buy('lives',1));action('back',menu);action('nextRound',()=>{if(session.complete){session=null;gamesScreen();}else{session.round++;session.terrain=(session.terrain+1)%4;intro();}});
}
window.addEventListener('keydown',e=>{if(screen==='race'){if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Escape'].includes(e.key))e.preventDefault();if(e.key==='Escape'&&!e.repeat)togglePause();if(!paused)keys.add(e.key);if(/^[1-4]$/.test(e.key)){const count=currentQuestion().options.length,index=Number(e.key)-1;if(index<count)autoLane=-2.8+(index+.5)*5.6/count;}}});window.addEventListener('keyup',e=>keys.delete(e.key));window.addEventListener('blur',()=>{keys.clear();if(screen==='race'&&!paused)togglePause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&screen==='race'&&!paused)togglePause();});
function resize(){const frame=document.querySelector('#frame'),s=Math.min(frame.clientWidth/800,frame.clientHeight/600);stage.style.transform=`scale(${s})`;}
window.addEventListener('resize',resize);resize();document.querySelector('#fullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else document.querySelector('#frame').requestFullscreen();};
function frame(now){const dt=Math.min(.1,(now-frameTime)/1000);frameTime=now;accumulator+=dt;while(accumulator>=1/60){tick(1/60);accumulator-=1/60;}world.render(dt);updateHUD();requestAnimationFrame(frame);}requestAnimationFrame(frame);
if(profile)menu();else settings();
