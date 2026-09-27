// Display overrides also apply to flags stored in existing race saves.
export function assetUrl(path){
 path=path.replaceAll('\\','/');
 if(path==='data/vlajky/Iran_5729.png')return '/eduprofix/custom/flags/iran-lion-sun.png';
 return path.startsWith('custom/')?'/eduprofix/custom/'+path.slice(7):'/eduprofix/assets/'+path;
}
