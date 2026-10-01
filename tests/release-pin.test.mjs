import test from 'node:test';
import assert from 'node:assert/strict';
import {validateReleasePin} from '../tools/release-pin.mjs';

test('private game release pins bind each repository to its own route and secret',()=>{
 const pairs=[['eduprofix','eduprofix','EDUPROFIX'],['world-game','eduprofix_remastered','WORLD_GAME'],['eduprofix-mod','eduprofix_mod','EDUPROFIX_MOD']];
 for(const [repo,route,prefix] of pairs){
  const pin={repository:'swimxd/'+repo,route,deployKeyEnv:prefix+'_DEPLOY_KEY_B64',commit:'a'.repeat(40)};
  assert.doesNotThrow(()=>validateReleasePin(pin));
  assert.throws(()=>validateReleasePin({...pin,commit:'main'}),/Invalid game release pin/);
  assert.throws(()=>validateReleasePin({...pin,route:'../'+route}),/Invalid game release pin/);
  assert.throws(()=>validateReleasePin({...pin,deployKeyEnv:'OTHER_SECRET'}),/Invalid game release pin/);
  assert.throws(()=>validateReleasePin({...pin,repository:'swimxd/unrelated'}),/Invalid game release pin/);
 }
 assert.throws(()=>validateReleasePin({repository:'swimxd/eduprofix',route:'eduprofix_mod',deployKeyEnv:'EDUPROFIX_DEPLOY_KEY_B64',commit:'a'.repeat(40)}),/Invalid game release pin/);
});
