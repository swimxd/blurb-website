import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';

test('the Mod route exports the pinned browser release with verified hosting assets', async () => {
  const root = new URL('../dist/eduprofix_mod/', import.meta.url);
  const build = JSON.parse(await readFile(new URL('build.json', root), 'utf8'));
  assert.equal(build.repository, 'swimxd/eduprofix-mod');
  assert.equal(build.base, '/eduprofix_mod/');
  assert.equal(build.edition, 'mod');
  assert.equal(build.target, 'browser-fallback');
  const releases = JSON.parse(await readFile(new URL('../game-releases.json', import.meta.url), 'utf8'));
  assert.equal(build.commit, releases.games.find(game => game.route === 'eduprofix_mod').commit);
  const manifest = JSON.parse(await readFile(new URL('asset-manifest.json', root), 'utf8'));
  assert.ok(manifest.files.length > 400);
  for (const file of manifest.files) {
    assert.ok(file.bytes <= 25 * 1024 * 1024, file.path);
    const bytes = await readFile(new URL(file.path, root));
    assert.equal(bytes.length, file.bytes, file.path);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, file.path);
  }
  for (const privatePath of ['Original', 'Game', 'runtime', 'players', 'evidence', '.git']) {
    await assert.rejects(stat(new URL(privatePath, root)), {code: 'ENOENT'});
  }
  const credits = await readFile(new URL('music/CREDITS.md', root), 'utf8');
  for (const title of ['Deliberate Thought', 'Killing Time', 'Blipotron']) assert.ok(credits.includes(title));
  const catalog = JSON.parse(await readFile(new URL('generated/catalog.json', root), 'utf8'));
  assert.equal(catalog.cars.length, 10);
  for (const name of ['Rally Hatchback', 'Delivery Van', 'Farm Pickup', 'Streamliner']) assert.ok(catalog.cars.some(car => car.name === name), name);
});
