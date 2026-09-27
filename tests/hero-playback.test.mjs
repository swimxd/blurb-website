import test from 'node:test';
import assert from 'node:assert/strict';
import { PlaybackIntent } from '../hero-player.js';

test('autoplay starts only when the video and page are visible', () => {
  const intent = new PlaybackIntent();
  assert.equal(intent.shouldPlay, false);
  intent.observe(true, true);
  assert.equal(intent.shouldPlay, true);
  intent.observe(true, false);
  assert.equal(intent.shouldPlay, false);
  intent.observe(true, true);
  assert.equal(intent.shouldPlay, true);
});

for (const preference of ['reducedMotion', 'saveData']) {
  test(`${preference} prevents autoplay but permits explicit playback`, () => {
    const intent = new PlaybackIntent({ [preference]: true });
    intent.observe(true, true);
    assert.equal(intent.shouldPlay, false);
    intent.play();
    assert.equal(intent.shouldPlay, true);
  });
}

test('a deliberate pause survives leaving and returning to the hero', () => {
  const intent = new PlaybackIntent();
  intent.observe(true, true);
  assert.equal(intent.shouldPlay, true);
  intent.pause();
  intent.observe(false, false);
  intent.observe(true, true);
  assert.equal(intent.shouldPlay, false);
  intent.play();
  assert.equal(intent.shouldPlay, true);
});

test('a completed reel stays finished until the visitor replays', () => {
  const intent = new PlaybackIntent();
  intent.observe(true, true);
  intent.finish();
  intent.observe(false, true);
  intent.observe(true, true);
  assert.equal(intent.shouldPlay, false);
  intent.play();
  assert.equal(intent.shouldPlay, true);
});

test('blocked autoplay does not retry as the visitor scrolls', () => {
  const intent = new PlaybackIntent();
  intent.observe(true, true);
  intent.block();
  intent.observe(false, true);
  intent.observe(true, true);
  assert.equal(intent.shouldPlay, false);
  intent.play();
  assert.equal(intent.shouldPlay, true);
});

test('a new motion preference stops automatic playback, not explicit playback', () => {
  const intent = new PlaybackIntent();
  intent.observe(true, true);
  intent.policy({ reducedMotion: true });
  assert.equal(intent.shouldPlay, false);
  intent.play();
  intent.policy({ reducedMotion: true });
  assert.equal(intent.shouldPlay, true);
});

test('explicit playback also pauses offscreen and resumes on return', () => {
  const intent = new PlaybackIntent({ saveData: true });
  intent.play();
  intent.observe(false, true);
  assert.equal(intent.shouldPlay, false);
  intent.observe(true, true);
  assert.equal(intent.shouldPlay, true);
});
