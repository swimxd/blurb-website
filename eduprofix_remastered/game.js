// Source data and documented scoring are recovered. Selection/AI/track timing
// remain a reconstruction; see recovery/FIDELITY.md for unresolved parity.
export function seededRandom(seed){const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};next.state=()=>seed;return next;}
export function shuffle(values,rng=Math.random){const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function findCar(catalog,id){return catalog.cars.find(c=>c.name.toLowerCase()===id.toLowerCase()||c.source.split('/').at(-1).replace('.auto','').toLowerCase()===id.toLowerCase())||catalog.cars[0];}
export const isFlagGame=id=>id==='10e1'||id==='10e2';
export function normalizeFlagSession(session){
 if(!isFlagGame(session.game.id))return;
 for(const q of session.questions){const wrong=q.options.find(a=>a!==q.answer);q.options=[...new Set(q.options)].filter(a=>a===q.answer||a===wrong);}
}
export function makeQuestions(records,gameId,difficulty=1,language='EN',rng=Math.random){
 // Focused two-gate edition requested by the user. Keep original country names,
 // flag images and population cutoff, without guessing the legacy AnswerCount code.
 if(isFlagGame(gameId)){
  const countries=records.filter(r=>r.type==='1009'&&r.PNG?.startsWith('&')&&(r[language]||r.EN)&&(r.flagGameInclude||(r.statObyv&&(gameId==='10e2'||Number(r.statObyv)>5000000))));
  return shuffle(countries.map(row=>{
   const wrong=shuffle(countries.filter(r=>r.PNG!==row.PNG),rng)[0].PNG;
   return {id:gameId+':'+row.id,recordId:row.id,prompt:row[language]||row.EN,answer:row.PNG,remaining:4,options:shuffle([row.PNG,wrong],rng)};
  }),rng);
 }
 const custom=records.find(r=>r.id===gameId)?.custom;
 if(custom)return shuffle(custom.questions.map((q,i)=>({id:gameId+':'+i,prompt:q.prompt,answer:q.answer,description:'',caption:'',remaining:custom.counter,options:shuffle([q.answer,...shuffle([...new Set(q.wrong.filter(w=>w!==q.answer))],rng).slice(0,3)],rng)})),rng);
 const byId=new Map(records.map(r=>[r.id,r]));
 const field=(row,key)=>row[key.replaceAll('LANG',language)]||row[key.replaceAll('LANG','EN')]||'';
 function resolve(value,depth=0){if(depth>8)return '';if(/^#[0-9a-f]{4}$/i.test(value)){const row=byId.get(value.slice(1));return row?resolve(row[language]||row.EN||'',depth+1):'';}return value;}
 function matches(row,condition){return !condition||condition.split('&').every(part=>{
  const m=part.match(/^(#?)@(.+?)(!=|>=|<=|=|>|<)(.*)$/);if(!m)throw new Error('Unsupported condition: '+part);
  let left=field(row,m[2]),right=m[4];if(m[1]||['>','<','>=','<='].includes(m[3])){left=Number(left);right=Number(right);}
  return ({'=':()=>left===right,'!=':()=>left!==right,'>':()=>left>right,'<':()=>left<right,'>=':()=>left>=right,'<=':()=>left<=right})[m[3]]();
 });}
 const allRules=records.filter(r=>r.type==='0005'&&r.game===gameId);
 const level=Math.min(difficulty,Math.max(...allRules.map(r=>Number(r.difficulty)||0)));
 let rules=allRules.filter(r=>Number(r.difficulty)===level||r.difficulty==='0');if(!rules.length)rules=allRules.slice(0,1);
 const result=[];
 for(const rule of rules){
  const pool=records.filter(r=>r.type===rule.datatype&&matches(r,rule.condition));
  const alternatives=pool.map(r=>resolve(field(r,rule.answer))).filter(Boolean);
  for(const row of pool){
   const answer=resolve(field(row,rule.answer));if(!answer)continue;
   const supplied=field(row,rule.wrongs||'').split(';').map(v=>resolve(v)).filter(v=>v&&v!==answer);
   const wrong=shuffle([...new Set([...supplied,...alternatives.filter(a=>a!==answer)])],rng).slice(0,3);
   if(!wrong.length&&Number.isFinite(Number(answer))){for(const delta of [-1,1,2])wrong.push(String(Number(answer)+delta));}
   if(!wrong.length)continue;
   const prompt=resolve(field(row,rule.question))||rule[language+'quest']||rule.ENquest||'Choose the correct spelling';
   result.push({id:rule.id+':'+row.id,ruleId:rule.id,recordId:row.id,prompt,answer,description:resolve(field(row,rule.desc||'')),caption:rule[language+'quest']||rule.ENquest||'',remaining:Number(rule.counter)||4,options:shuffle([answer,...wrong.slice(0,1+Math.floor(rng()*2))],rng)});
  }
 }
 return shuffle(result,rng);
}
export function answerQuestion(player,question,correct,car){
 question.attempts=(question.attempts??0)+1;question.correctAnswers=(question.correctAnswers??0)+Number(correct);
 if(correct){player.score+=10;player.correct++;question.remaining=Math.max(0,question.remaining-1);}
 else {player.wrong++;question.remaining+=2;player.score-=10;if(player.lives>0)player.lives=Math.max(0,player.lives-(car.lives_on_wrong_answer??1));else player.score-=car.score_on_wrong_answer??10;
  // Strong momentum loss, with steering and throttle still available.
  player.speed=(player.speed??0)*.22;if(player.vx!==undefined)player.vx*=.22;if(player.vs!==undefined)player.vs*=.22;player.stun=0;
 }
}
export function finishRound(player,questions,place,total,car){
 player.score+=[20,12,8,6,4,2,1,0][Math.min(place-1,7)];
 if(place===total)for(const q of questions)q.remaining++;
 for(const value of car.add_on_finish??[]){const [rank,field,amount]=value.split(',');if(Number(rank)===0||Number(rank)===place||Number(rank)===place-total-1)player[field]=(player[field]??0)+Number(amount);}
}
