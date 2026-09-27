import test from 'node:test';
import assert from 'node:assert/strict';
import { initHeroPlayer } from '../hero-player.js';

// Media events are queued by browsers. This small DOM adapter keeps that queue
// explicit so a tab/viewport change can happen between a native action and its event.
class Element extends EventTarget {
  hidden = false;
  textContent = '';
  classList = { add() {} };
  attributes = {};
  setAttribute(name, value) { this.attributes[name] = value; }
}
class Video extends Element {
  paused = true;
  ended = false;
  muted = true;
  controls = true;
  currentTime = 0;
  error = null;
  events = [];
  playCalls = 0;
  play() { this.playCalls++; this.paused = false; this.events.push('play'); return Promise.resolve(); }
  pause() { if (!this.paused) { this.paused = true; this.events.push('pause'); } }
  querySelector() { return null; }
  flush() { while (this.events.length) this.dispatchEvent(new Event(this.events.shift())); }
}
function fixture() {
  const video = new Video(), root = new Element(), document = new Element();
  const buttons = Object.fromEntries(['controls', 'play', 'mute', 'sound', 'fullscreen', 'status', 'error'].map(name => [name, new Element()]));
  root.querySelector = selector => selector === 'video' ? video : buttons[selector.slice(11, -1)];
  document.hidden = false;
  const motion = new Element(); motion.matches = false;
  let intersection;
  class Observer { constructor(callback) { intersection = callback; } observe() {} }
  const originals = new Map(['window', 'document', 'navigator', 'IntersectionObserver'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  for (const [name, value] of Object.entries({ window: { matchMedia: () => motion, IntersectionObserver: Observer }, document, navigator: {}, IntersectionObserver: Observer }))
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  initHeroPlayer(root);
  return {
    video, buttons,
    enter: () => intersection([{ isIntersecting: true, intersectionRatio: 1 }]),
    leave: () => intersection([{ isIntersecting: false, intersectionRatio: 0 }]),
    hidden(value) { document.hidden = value; document.dispatchEvent(new Event('visibilitychange')); },
    close() { for (const [name, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; } }
  };
}
test('a queued native pause survives a tab switch before its event arrives', async () => {
  const f = fixture();
  try {
    f.enter(); await Promise.resolve(); f.video.flush();
    f.video.pause(); // native control changes the media property synchronously
    f.hidden(true); // visibility is delivered before the queued pause event
    f.video.flush();
    f.hidden(false); await Promise.resolve();
    assert.equal(f.video.playCalls, 1, 'a native pause must not resume on tab return');
    assert.equal(f.video.paused, true);
  } finally { f.close(); }
});
test('a stale play event cannot erase a pause from the custom button', async () => {
  const f = fixture();
  try {
    f.enter();
    f.buttons.play.dispatchEvent(new Event('click'));
    f.video.flush(); // the original play event arrives after the deliberate pause
    f.leave(); f.enter(); await Promise.resolve();
    assert.equal(f.video.playCalls, 1);
    assert.equal(f.video.paused, true);
  } finally { f.close(); }
});
test('an environmental pause still resumes through the actual controller', async () => {
  const f = fixture();
  try {
    f.enter(); await Promise.resolve(); f.video.flush();
    f.hidden(true); f.video.flush();
    assert.equal(f.video.paused, true);
    f.hidden(false); await Promise.resolve(); f.video.flush();
    assert.equal(f.video.playCalls, 2);
    assert.equal(f.video.paused, false);
  } finally { f.close(); }
});
