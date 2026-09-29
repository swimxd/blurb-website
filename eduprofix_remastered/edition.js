export function editionFromLocation(location,remembered){
 const explicit=new URLSearchParams(location.search).get('edition');
 if(explicit==='classic'||explicit==='remastered')return explicit;
 if(location.pathname.includes('/eduprofix_remastered'))return 'remastered';
 if(location.pathname.includes('/eduprofix'))return 'classic';
 return remembered==='remastered'?'remastered':'classic';
}
export function storageKeys(edition){const prefix=edition==='remastered'?'eduprofix.remastered':'eduprofix';return {profile:prefix+'.profile.v1',session:prefix+'.session.v1',backup:prefix+'.profile.backup',custom:prefix+'.custom.v1'};}
export function editionLink(edition,location){return location.pathname.includes('/eduprofix')?(edition==='remastered'?'/eduprofix_remastered/':'/eduprofix/'):'?edition='+edition;}
export const defaultOptions={sensitivity:1,cameraMotion:.65,engineVolume:.16,ambientVolume:.12,quality:'high',hints:true};
export function optionsFor(profile){const o=profile?.options??{},limit=(key,min,max)=>Number.isFinite(Number(o[key]))?Math.max(min,Math.min(max,Number(o[key]))):defaultOptions[key];return {sensitivity:limit('sensitivity',.55,1.45),cameraMotion:limit('cameraMotion',0,1),engineVolume:limit('engineVolume',0,1),ambientVolume:limit('ambientVolume',0,1),quality:o.quality==='low'?'low':'high',hints:o.hints!==false};}
