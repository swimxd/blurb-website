import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {assetUrl} from '../eduprofix/assets.js';
test('EduProfix assets stay under the game route, including the requested flags',async()=>{
 for(const reference of ['data\\vlajky\\Iran_5729.png','custom/flags/palestine.png','models/back/backgrnd.bmp']){
  const url=assetUrl(reference);assert.ok(url.startsWith('/eduprofix/'));assert.ok((await stat(new URL('..'+url,import.meta.url))).isFile());
 }
});
test('static export contains the game and both flag countries, without a server runtime',async()=>{
 const records=JSON.parse(await readFile(new URL('../eduprofix/generated/records.json',import.meta.url),'utf8'));
 assert.ok(records.some(r=>r.type==='1009'&&r.EN==='Iran'));assert.ok(records.some(r=>r.type==='1009'&&r.EN==='Palestine'));
 await assert.rejects(stat(new URL('../eduprofix/runtime/node.exe',import.meta.url)));
 const html=await readFile(new URL('../eduprofix/index.html',import.meta.url),'utf8');assert.match(html,/src="app.js"/);
});
