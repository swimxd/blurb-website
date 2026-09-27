// Local browser QA fixtures; never published. Regenerate after HTML/CSS changes.
import fs from 'node:fs';
const source = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('styles.css', 'utf8');
fs.mkdirSync('tests/browser', { recursive: true });
for (const theme of ['light', 'dark']) {
  fs.writeFileSync('tests/browser/' + theme + '.css', css.replace('@media (prefers-color-scheme: dark)', theme === 'dark' ? '@media all' : '@media not all'));
}
const harness = `
const options = new URLSearchParams(location.search);
const mode = options.get('mode') || 'normal';
const theme = options.get('theme') || 'dark';
document.querySelector('link[rel="stylesheet"]').href = 'tests/browser/' + theme + '.css';
const originalMatchMedia = window.matchMedia.bind(window);
if (mode === 'reduced') {
  window.matchMedia = query => {
    if (!query.includes('prefers-reduced-motion')) return originalMatchMedia(query);
    const result = new EventTarget(); result.matches = true; result.media = query; return result;
  };
}
if (mode === 'save') Object.defineProperty(navigator, 'connection', { value: { saveData: true, addEventListener() {} }, configurable: true });
if (mode === 'blocked') {
  const play = HTMLMediaElement.prototype.play;
  let first = true;
  HTMLMediaElement.prototype.play = function() {
    if (first) { first = false; return Promise.reject(new DOMException('QA autoplay denial', 'NotAllowedError')); }
    return play.call(this);
  };
}
window.addEventListener('DOMContentLoaded', async () => {
  const video = document.querySelector('video');
  if (mode === 'failure') for (const source of video.querySelectorAll('source')) source.src = 'media/qa-missing.mp4';
  if (mode !== 'native') await import('../../hero-player.js');
  const panel = document.createElement('aside');
  panel.style.cssText = 'position:fixed;bottom:8px;right:8px;z-index:50;max-width:310px;padding:8px;background:#fff;color:#111;font:12px/1.4 monospace;border:1px solid #555';
  const label = document.createElement('div');
  label.textContent = 'Local QA · ' + mode + ' · ' + theme;
  const state = document.createElement('output'); state.id = 'qa-state';
  const hidden = document.createElement('button');
  hidden.textContent = 'Simulate hidden tab';
  let isHidden = false;
  hidden.onclick = () => {
    isHidden = !isHidden;
    Object.defineProperty(document, 'hidden', { get: () => isHidden, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    hidden.textContent = isHidden ? 'Restore visible tab' : 'Simulate hidden tab';
  };
  const dismiss = document.createElement('button'); dismiss.textContent = 'Hide QA panel';
  dismiss.onclick = () => { panel.hidden = true; };
  panel.append(label, state, document.createElement('br'), hidden, dismiss); document.body.append(panel);
  if (options.has('capture')) panel.style.display = 'none';
  setInterval(() => {
    state.textContent = JSON.stringify({ time: +video.currentTime.toFixed(2), paused: video.paused, muted: video.muted, ended: video.ended, ready: video.readyState, controls: video.controls, source: video.currentSrc.split('/').pop(), hidden: document.hidden, fullscreen: !!document.fullscreenElement, width: video.clientWidth, height: video.clientHeight, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth });
  }, 200);
});
`;
fs.writeFileSync('tests/browser/harness.js', harness);
fs.writeFileSync('tests/browser/index.html', source.replace('<head>', '<head>\n<base href="/">').replace('<script type="module" src="hero-player.js"></script>', '<script src="tests/browser/harness.js"></script>'));
console.log('Browser QA: http://127.0.0.1:4173/tests/browser/?mode=normal&theme=dark');
