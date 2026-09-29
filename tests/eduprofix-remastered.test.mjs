import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {assetUrl} from '../eduprofix_remastered/assets.js';
import {remasteredCars} from '../eduprofix_remastered/remastered-cars.js';
import {tracks} from '../eduprofix_remastered/tracks.js';
import {editionFromLocation,storageKeys} from '../eduprofix_remastered/edition.js';
test('the standalone bonus route loads its assets and defaults to Remastered',async()=>{
 assert.equal(editionFromLocation({pathname:'/eduprofix_remastered/',search:''},'classic'),'remastered');
 for(const name of ['data/vlajky/Iran_5729.png','custom/flags/palestine.png','models/back/backgrnd.bmp']){const url=assetUrl(name);assert.ok(url.startsWith('/eduprofix_remastered/'));assert.ok((await stat(new URL('..'+url,import.meta.url))).isFile());}
 const build=JSON.parse(await readFile(new URL('../eduprofix_remastered/build.json',import.meta.url)));assert.equal(build.edition,'remastered');assert.equal(build.base,'/eduprofix_remastered/');
});
test('bonus content is immediately available and saves cannot overwrite Classic',()=>{
 assert.equal(tracks.length,4);assert.equal(remasteredCars.length,4);assert.equal(new Set(remasteredCars.map(c=>c.remasteredId)).size,4);
 assert.equal(storageKeys('classic').session,'eduprofix.session.v1');assert.notEqual(storageKeys('classic').profile,storageKeys('remastered').profile);
});
