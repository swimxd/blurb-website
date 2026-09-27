// Playback intent stays separate from media events: an environmental pause
// must never erase a visitor's deliberate pause or restart a completed reel.
export class PlaybackIntent {
  constructor(preferences = {}) {
    this.mode = preferences.reducedMotion || preferences.saveData ? 'paused' : 'auto';
    this.visible = false;
    this.pageVisible = true;
  }
  observe(visible, pageVisible) { this.visible = visible; this.pageVisible = pageVisible; }
  play() { this.mode = 'manual'; }
  pause() { this.mode = 'paused'; }
  finish() { this.mode = 'ended'; }
  block() { this.mode = 'paused'; }
  policy({ reducedMotion = false, saveData = false }) {
    if (this.mode === 'auto' && (reducedMotion || saveData)) this.pause();
  }
  get shouldPlay() {
    return this.visible && this.pageVisible && (this.mode === 'auto' || this.mode === 'manual');
  }
}

export function initHeroPlayer(root) {
  const video = root.querySelector('video');
  const controls = root.querySelector('[data-reel-controls]');
  const playButton = root.querySelector('[data-reel-play]');
  const muteButton = root.querySelector('[data-reel-mute]');
  const soundButton = root.querySelector('[data-reel-sound]');
  const fullscreenButton = root.querySelector('[data-reel-fullscreen]');
  const status = root.querySelector('[data-reel-status]');
  const errorMessage = root.querySelector('[data-reel-error]');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  const preferences = () => ({ reducedMotion: motion.matches, saveData: !!connection?.saveData });
  const intent = new PlaybackIntent(preferences());
  let inView = false;
  let pending = null;
  let attempt = 0;
  let mediaFailed = false;

  video.muted = true;
  video.loop = false;

  const refresh = () => {
    const finished = video.ended || intent.mode === 'ended';
    playButton.textContent = mediaFailed ? 'Retry' : finished ? 'Replay' : video.paused ? 'Play' : 'Pause';
    playButton.setAttribute('aria-label', mediaFailed ? 'Retry the Blurb video' : finished ? 'Replay the Blurb video' : video.paused ? 'Play the Blurb video' : 'Pause the Blurb video');
    muteButton.textContent = video.muted ? 'Sound off' : 'Sound on';
    muteButton.setAttribute('aria-label', video.muted ? 'Turn sound on' : 'Turn sound off');
    muteButton.setAttribute('aria-pressed', String(!video.muted));
    status.textContent = mediaFailed ? 'Video unavailable' : finished ? '29 seconds · Replay any time' : '29 seconds · ' + (video.muted ? 'Sound off' : 'Sound on');
  };

  const apply = (environmentChanged = false) => {
    // Native controls change paused before their queued event is dispatched.
    // Capture that intent before hiding the page/hero changes shouldPlay.
    if (environmentChanged && video.paused && intent.shouldPlay && !video.ended) intent.pause();
    intent.observe(inView, !document.hidden);
    if (!intent.shouldPlay) {
      attempt++;
      pending = null;
      video.pause();
      refresh();
      return;
    }
    if (!video.paused || pending) return;
    video.preload = 'auto';
    const id = ++attempt;
    const result = video.play();
    pending = result;
    Promise.resolve(result).then(() => {
      if (id !== attempt) return;
      pending = null;
      if (!intent.shouldPlay) video.pause();
      refresh();
    }).catch(() => {
      if (id !== attempt) return;
      pending = null;
      intent.block();
      refresh();
      if (!video.error) status.textContent = 'Press Play to watch · 29 seconds';
    });
  };

  const play = (restart = false, withSound = false) => {
    if (mediaFailed || video.error) { mediaFailed = false; errorMessage.hidden = true; video.load(); }
    if (restart || video.ended) video.currentTime = 0;
    if (withSound) video.muted = false;
    intent.play();
    apply();
  };

  playButton.addEventListener('click', () => {
    if (video.paused || video.ended) play();
    else { intent.pause(); apply(); }
  });
  muteButton.addEventListener('click', () => { video.muted = !video.muted; refresh(); });
  soundButton.addEventListener('click', () => play(true, true));
  fullscreenButton.addEventListener('click', async () => {
    // Native controls remain available inside video-only fullscreen.
    video.controls = true;
    try {
      if (video.requestFullscreen) await video.requestFullscreen();
      else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
      else fullscreenButton.hidden = true;
    } catch {
      status.textContent = 'Fullscreen is unavailable. Use the video controls to watch.';
    }
  });
  if (!video.requestFullscreen && !video.webkitEnterFullscreen) fullscreenButton.hidden = true;
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) video.controls = false; });
  video.addEventListener('webkitendfullscreen', () => { video.controls = false; });

  video.addEventListener('play', () => {
    if (video.paused) { refresh(); return; } // a queued event from an earlier attempt
    // A native-control play after a manual pause is explicit visitor intent.
    if (intent.mode === 'paused' || intent.mode === 'ended') intent.play();
    intent.observe(inView, !document.hidden);
    if (!intent.shouldPlay) video.pause();
    refresh();
  });
  video.addEventListener('pause', () => {
    if (video.paused && intent.shouldPlay && !video.ended) intent.pause();
    refresh();
  });
  video.addEventListener('ended', () => { intent.finish(); refresh(); });
  video.addEventListener('volumechange', refresh);
  video.addEventListener('error', event => {
    // A failed <source> does not bubble or necessarily set video.error.
    // Let earlier candidates fall through; the final candidate is terminal.
    if (event.target !== video && event.target !== video.querySelector('source:last-of-type')) return;
    mediaFailed = true;
    intent.block();
    attempt++;
    pending = null;
    video.pause();
    errorMessage.hidden = false;
    refresh();
  }, true);
  video.addEventListener('loadeddata', () => { mediaFailed = false; errorMessage.hidden = true; refresh(); });
  document.addEventListener('visibilitychange', () => apply(true));
  const updatePolicy = () => { intent.policy(preferences()); apply(); };
  motion.addEventListener?.('change', updatePolicy);
  connection?.addEventListener?.('change', updatePolicy);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting && entries[0].intersectionRatio >= .15;
      apply(true);
    }, { threshold: [0, .15] }).observe(video);
  } else {
    // Conservative fallback: keep the poster and native controls until a click.
    intent.block();
    inView = true;
  }
  // Only replace the fallback once all controls and lifecycle listeners exist.
  video.controls = false;
  controls.hidden = false;
  root.classList.add('reel-enhanced');
  refresh();
}

if (typeof document !== 'undefined') {
  for (const root of document.querySelectorAll('[data-hero-player]')) {
    try { initHeroPlayer(root); }
    catch { root.querySelector('video').controls = true; }
  }
}
