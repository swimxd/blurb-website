import {cp,mkdir,readdir,readFile,writeFile,rm,mkdtemp,chmod} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {validateReleasePin} from './release-pin.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=join(root,'dist');
const releases=JSON.parse(await readFile(join(root,'game-releases.json'),'utf8'));
const run=(command,args,cwd,env=process.env)=>execFileSync(command,args,{cwd,env,stdio:'inherit'});
// Only this fixed generated directory is replaced; sources stay in their own repos.
await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});
for(const name of ['404.html','apple-touch-icon.png','favicon.svg','flappy.html','guide.html','hero-player.js','index.html','og-image.png','privacy.html','robots.txt','sitemap.xml','styles.css','support.html','media'])await cp(join(root,name),join(out,name),{recursive:true});
const scratch=await mkdtemp(join(tmpdir(),'blurb-games-'));
try{
 for(const game of releases.games){
  validateReleasePin(game);
  const source=join(scratch,game.route);
  let env={...process.env,GIT_TERMINAL_PROMPT:'0'};
  let remote='https://github.com/'+game.repository+'.git';
  if(process.env[game.deployKeyEnv]){
   const key=join(scratch,game.route+'.key');
   await writeFile(key,Buffer.from(process.env[game.deployKeyEnv],'base64'),{mode:0o600});
   await chmod(key,0o600);
   const hosts=join(scratch,'known_hosts');
   await cp(join(root,'tools/github-known-hosts'),hosts);
   env.GIT_SSH_COMMAND=`ssh -i "${key}" -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile="${hosts}"`;
   remote='git@github.com:'+game.repository+'.git';
  }
  // Local developers may use their existing authenticated Git credential helper.
  run('git',['init',source],root,env);
  run('git',['fetch','--depth=1',remote,game.commit],source,env);
  run('git',['checkout','--detach','FETCH_HEAD'],source,env);
  const actual=execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim();
  if(actual!==game.commit)throw new Error('Fetched game does not match its pinned commit');
  // Do not expose deployment credentials to game build scripts.
  const buildEnv={...process.env,BASE_PATH:'/'+game.route+'/'};
  for(const item of releases.games)delete buildEnv[item.deployKeyEnv];
  delete buildEnv.GIT_SSH_COMMAND;
  run(process.execPath,['--test',...(await readdir(join(source,'tests'))).filter(n=>n.endsWith('.test.mjs')).map(n=>'tests/'+n)],source,buildEnv);
  run(process.execPath,['scripts/build.mjs'],source,buildEnv);
  const metadata=JSON.parse(await readFile(join(source,'dist/build.json'),'utf8'));
  await writeFile(join(source,'dist/build.json'),JSON.stringify({...metadata,commit:actual},null,2));
  await cp(join(source,'dist'),join(out,game.route),{recursive:true});
 }
}finally{await rm(scratch,{recursive:true,force:true});}
console.log('Website assembled from pinned private game repositories.');
