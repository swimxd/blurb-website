import assert from 'node:assert/strict';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const root = new URL('../', import.meta.url);
const origin = new URL(process.argv[2]);
assert.ok(origin.protocol === 'https:' && (origin.hostname === 'blurb.fyi' || origin.hostname.endsWith('.workers.dev')));
const {games} = JSON.parse(await readFile(new URL('game-releases.json', root), 'utf8'));
const get = async relative => {
  const response = await fetch(new URL(relative, origin));
  assert.equal(response.status, 200, relative);
  return Buffer.from(await response.arrayBuffer());
};
const builds = [];
for (const game of games) {
  const build = JSON.parse(await get(`${game.route}/build.json`));
  assert.equal(build.repository, game.repository);
  assert.equal(build.commit, game.commit);
  assert.equal(build.base, `/${game.route}/`);
  builds.push(build);
}
const route = 'eduprofix_mod/';
const remote = JSON.parse(await get(route + 'asset-manifest.json'));
const expected = JSON.parse(await readFile(new URL('dist/' + route + 'asset-manifest.json', root), 'utf8'));
const localFiles = new Map(expected.files.map(file => [file.path, file]));
assert.equal(remote.files.length, expected.files.length);
assert.deepEqual(remote.files.map(file => file.path).sort(), expected.files.map(file => file.path).sort());
const dynamic = new Set(['build.json', 'generated/native-assets.json']);
let cursor = 0, verified = 0;
await Promise.all(Array.from({length: 8}, async () => {
  while (cursor < remote.files.length) {
    const file = remote.files[cursor++], local = localFiles.get(file.path);
    assert.ok(local, file.path);
    assert.ok(file.bytes <= 25 * 1024 * 1024, file.path);
    if (!dynamic.has(file.path)) assert.equal(file.sha256, local.sha256, file.path + ' pinned export');
    const bytes = await get(route + file.path);
    assert.equal(bytes.length, file.bytes, file.path);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, file.path);
    if (file.path === 'generated/native-assets.json') {
      const actualInputs = JSON.parse(bytes), expectedInputs = JSON.parse(await readFile(new URL('dist/' + route + file.path, root)));
      delete actualInputs.builtAt; delete expectedInputs.builtAt;
      assert.deepEqual(actualInputs, expectedInputs);
    }
    verified++;
  }
}));
const report = {verifiedAt: new Date().toISOString(), origin: origin.href, builds, modFilesVerified: verified,
  maxAssetBytes: remote.maxAssetBytes, hashScope: 'Every served Mod file checked against its manifest; non-timestamp content matched the pinned local export',
  gameplayVerified: false};
await mkdir(new URL('.wrangler/', root), {recursive: true});
await writeFile(new URL('.wrangler/release-verification.json', root), JSON.stringify(report, null, 2));
console.log(JSON.stringify({origin: origin.href, builds: builds.map(b => ({repository:b.repository,commit:b.commit})), modFilesVerified:verified, maxAssetBytes:remote.maxAssetBytes}));
