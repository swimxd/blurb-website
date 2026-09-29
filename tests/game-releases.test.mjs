import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';

test('both public game routes come from the exact private repository pins',async()=>{
 const {games}=JSON.parse(await readFile(new URL('../game-releases.json',import.meta.url),'utf8'));
 assert.deepEqual(games.map(g=>g.route).sort(),['eduprofix','eduprofix_remastered']);
 for(const game of games){
  const build=JSON.parse(await readFile(new URL(`../dist/${game.route}/build.json`,import.meta.url),'utf8'));
  assert.equal(build.repository,game.repository);
  assert.equal(build.commit,game.commit);
  assert.equal(build.base,`/${game.route}/`);
  for(const privatePath of ['.git','tests','scripts','game.config.json'])await assert.rejects(stat(new URL(`../dist/${game.route}/${privatePath}`,import.meta.url)),{code:'ENOENT'});
 }
 for(const privatePath of ['tools','tests','game-releases.json'])await assert.rejects(stat(new URL(`../dist/${privatePath}`,import.meta.url)),{code:'ENOENT'});
});
