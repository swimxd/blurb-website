export function parseCustomGame(text){
 const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/);const subject=lines.shift()?.trim();if(!subject)throw new Error('The first line must name the subject.');
 const games=[];let game;
 for(let i=0;i<lines.length;i++){
  const line=lines[i].trim();if(!line||line.startsWith('//'))continue;
  if(line.startsWith('#game ')){game={name:line.slice(6).trim(),count:9,counter:4,points:1,repeat:false,questions:[]};games.push(game);continue;}
  if(!game)throw new Error(`Expected #game on line ${i+2}`);
  if(line.startsWith('#')){const m=line.match(/^#(count|counter|points|repeat)\s+(.+)$/);if(!m)throw new Error(`Unknown directive on line ${i+2}`);if(m[1]==='repeat'){if(!['true','false'].includes(m[2]))throw new Error(`Invalid repeat on line ${i+2}`);game.repeat=m[2]==='true';}else{const value=Number(m[2]);if(!Number.isInteger(value)||value<1||value>10000)throw new Error(`Invalid ${m[1]} on line ${i+2}`);game[m[1]]=value;}continue;}
  const m=line.match(/^(.+?)=(.+?)\s*\[([^\]]*)\]\s*$/);if(!m)throw new Error(`Invalid question on line ${i+2}; use question=answer [wrong answer]`);
  const wrong=m[3].split(';').map(x=>x.trim()).filter(Boolean);if(!wrong.length)throw new Error(`Missing wrong answer on line ${i+2}`);
  game.questions.push({prompt:m[1].trim(),answer:m[2].trim(),wrong});
 }
 if(!games.length||games.some(g=>!g.questions.length))throw new Error('Each game must contain at least one question.');return {subject,games};
}
export function customRecords(data){
 return [{id:'custom',type:'0011',EN:data.subject},...data.games.map((g,i)=>({id:'custom-'+i,type:'0010',subject:'custom',EN:g.name,points:String(g.points),custom:g}))];
}
