# Blurb v6 — editable showreel

29.4 seconds · 1920 × 1080 · 60 fps · original 96 BPM warm electronic pulse · no voiceover.

This is the supplied v5 animation, refined for the Blurb landing-page hero. Notification gathering, logo morphs, summary highlights, expansion, app selection, model download and the on-device message flow retain their original order and timing. UI easing is smooth, logo star bursts are removed, rings are simplified, and grain / background movement are reduced. Feature headlines use Noto Sans; the Blurb wordmark is unchanged.

The “Download once.” headline is removed. Privacy copy reads: “With on-device processing and cloud fallback off, message text stays on your phone.” Product reference: swimxd/blurb beta at 7b09cd326570f6caaae3414a6af1736cd0004b1b.

## Requirements

- Node.js 22 or newer and npm.
- Python 3.11 or newer; install the small dependency list below.
- FFmpeg and ffprobe on PATH, or set FFMPEG_PATH and FFPROBE_PATH to their executable paths.
- A Playwright Chromium installation. An installed Microsoft Edge is used automatically when bundled Chromium is absent. Set BROWSER_CHANNEL=chrome or BROWSER_PATH to use a different Chromium binary.

Commands below run from this showreel directory. No absolute workstation paths or global npm modules are required.

```sh
npm ci
npx playwright install chromium
python -m pip install -r requirements.txt
```

The browser download is optional if using installed Edge. The source and renderer stay local; rendering does not call a public API.

## Preview / proofs

```sh
npm run preview
node proof.cjs
```

The stage is available at http://127.0.0.1:4174. It is deliberately paused for deterministic rendering. window.renderAt(seconds) seeks forward through the reel; reload before seeking backward. proof.cjs writes nine PNG scene proofs and a storyboard to out/.

## Full render

```sh
python audio.py
python export.py --audio-only
npm run motion
npm run render
node proof.cjs
python export.py --output-dir /absolute/path/to/deliverables
```

On Windows, executable overrides can be set in PowerShell:

```powershell
$env:FFMPEG_PATH = 'C:\Tools\ffmpeg\bin\ffmpeg.exe'
$env:FFPROBE_PATH = 'C:\Tools\ffmpeg\bin\ffprobe.exe'
```

Use the paths of your own installation. npm run draft makes a 960 × 540 / 30 fps picture-only draft, without motion blur, for quick editorial checks.

motion_pass.js measures movement at 480 × 270, then render2.js uses the resulting 2–16 adaptive samples with a 180° shutter. Every browser capture is lossless PNG, decoded to RGB. Samples are averaged in linear light before the high-quality H.264 picture encode (CRF 14). The renderer advances strictly forward so text measurements and timeline state remain consistent.

Long renders can be split at frame boundaries:
```sh
node render2.js out/part-a.mp4 0 729 out/motion.json
node render2.js out/part-b.mp4 729 1764 out/motion.json
```
Create out/concat.txt with two lines, `file 'part-a.mp4'` and `file 'part-b.mp4'`, then concatenate with FFmpeg:
```sh
ffmpeg -f concat -safe 1 -i out/concat.txt -c copy -movflags +faststart out/picture.mp4
```
Render sections pre-roll the same source timeline before capturing their first frame. Keep the source and motion plan unchanged across sections.

## Audio

audio.py creates an original deterministic score from soft synth layers, a rounded low pulse, soft offbeat chord pulses, brushed filtered texture and restrained chapter washes. There are no UI cues, bells, claps, bright arpeggios or impact booms. The summary highlights and app switches have no individual sound.

The included audio/ directory contains the music stem, transition-wash stem, mastered score and measured loudness. Regeneration writes to out/ and does not overwrite these reference files. Transition wash centers are at 4.8, 13.8, 16.8 and 24.6 seconds. Music runs at 96 BPM against the fixed 29.4-second output timeline.

export.py uses two-pass loudness normalization targeting −20 LUFS integrated and a −1.5 dBTP ceiling. It measures the finished AAC files as well as the WAV and fails if media integrity, dimensions, frame rate, duration or the web size budgets are wrong.

## Exports

- Blurb_showreel_v6_1080p60.mp4 — high-quality H.264 master with 256 kbps AAC.
- Blurb_showreel_v6_web_1080p60.mp4 — two-pass 1080p60, under 12 MiB.
- Blurb_showreel_v6_web_720p60.mp4 — two-pass 720p60, under 6 MiB.
- Blurb_showreel_v6_poster.webp — summary scene at 10.65 seconds.
- Blurb_showreel_v6_soundtrack.wav — 48 kHz / 24-bit stereo.
- media-verification.json — machine-readable encoding and loudness evidence.

Web copies are also written to ../media/ for the website. Both web encodes use H.264 yuv420p / BT.709, AAC stereo and MP4 faststart.

## Source map

- main.js — GSAP animation and deterministic procedural layers; the existing PCHIP time map is retained.
- index.html — 1920 × 1080 stage, styling and locally installed fonts.
- render-runtime.cjs / server.cjs — local stage server and lossless capture runtime.
- motion_pass.js / render2.js — adaptive blur plan and frame renderer.
- proof.cjs — scene proof images.
- audio.py / export.py — original score, mastering and delivery encodes.
- package_source.py — portable source ZIP including reference audio.
- assets/ — supplied v5 graphics and textures.
- package-lock.json / requirements.txt — declared dependencies.

Run `python package_source.py /absolute/path/to/source.zip` after the reference audio is present. node_modules, render intermediates and caches are excluded.

## Rights and hosting

Original Blurb graphics and supplied v5 assets retain their existing ownership; this package does not relicense them. The new music is synthesized locally, with no stock recordings. Font packages carry their own SIL Open Font Licenses; other dependencies retain their own licenses in node_modules after npm ci.

The website's .assetsignore excludes showreel/, tests/ and tools/. Only finished media/ assets and public website files belong in hosting. Do not publish the editable source or render tooling as static assets. Publishing website main is a separate approval step.
