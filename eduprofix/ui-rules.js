export function compareRacePosition(a,b){
 if(a.finishTime!=null||b.finishTime!=null){if(a.finishTime==null)return 1;if(b.finishTime==null)return -1;return a.finishTime-b.finishTime||(b.finishOrderS??0)-(a.finishOrderS??0);}
 return b.s-a.s;
}
// Reference-style spacing, derived from actual track gaps rather than scores.
export function standingsLayout(players,height){
 const rows=[...players].sort(compareRacePosition),leader=rows[0],progress=p=>p.finishS??p.s;
 const layout=rows.map(p=>({...p,gap:Math.max(0,progress(leader)-progress(p))})),span=Math.max(1,...layout.map(p=>p.gap));
 for(let i=0;i<layout.length;i++)layout[i].top=Math.max(layout[i].gap/span*height,i?layout[i-1].top+22:0);
 if(layout.at(-1)?.top>height){layout.at(-1).top=height;for(let i=layout.length-2;i>=0;i--)layout[i].top=Math.min(layout[i].top,layout[i+1].top-22);}
 return layout;
}
export function recordFinish(player,place){
 if(!player.finishCounts){player.finishHistoryIncomplete=(player.races??player.wins??0)>0;player.finishCounts={1:player.wins??0};}
 player.finishCounts[place]=(player.finishCounts[place]??0)+1;
}
export function knownFinishCount(player,place){
 if(place===1)return player.finishCounts?.[1]??player.wins??0;
 return !player.finishCounts||player.finishHistoryIncomplete?null:player.finishCounts[place]??0;
}
export function subjectRank(ranks,points){
 const index=ranks.findIndex(r=>r.limit===''||points<=Number(r.limit));const i=index<0?ranks.length-1:index,row=ranks[i];
 return {name:row?.EN??'Beginner',level:i+1,needed:row?.limit===''?0:Math.max(0,Number(row?.limit??1)+1-points)};
}
