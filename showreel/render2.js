// Deterministic forward-only renderer. PNG captures, linear-light sample averaging.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { openStage } = require('./render-runtime.cjs');
(async () => {
  const [output = 'out/picture.mp4', first = '0', last = '1764', planFile] = process.argv.slice(2);
  const draft = process.argv.includes('--draft');
  const fps = draft ? 30 : 60, width = draft ? 960 : 1920, height = width * 9 / 16;
  const start = Number(first), end = Number(last);
  const plan = draft ? null : JSON.parse(fs.readFileSync(planFile || 'out/motion.json', 'utf8'));
  const stage = await openStage(width, height);
  let ff;
  try {
    const duration = await stage.page.evaluate(() => window.DURATION);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || end > Math.round(duration * fps))
      throw new Error('Invalid frame range');
    if (plan && (plan.fps !== fps || plan.duration !== duration || plan.samples.length !== Math.round(duration * fps)))
      throw new Error('Motion plan does not match the reel');
    fs.mkdirSync(path.dirname(output), { recursive: true });
    const encoder = process.env.FFMPEG_PATH || 'ffmpeg';
    ff = spawn(encoder, ['-y', '-hide_banner', '-loglevel', 'error',
      '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', width + 'x' + height, '-r', String(fps), '-i', '-',
      '-vf', 'scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p',
      '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
      '-c:v', 'libx264', '-preset', draft ? 'veryfast' : 'medium', '-crf', draft ? '22' : '14',
      '-movflags', '+faststart', '-an', output], { stdio: ['pipe', 'ignore', 'pipe'] });
    let encoderError = '', encoderFailure;
    ff.stderr.on('data', d => { encoderError += d; });
    ff.on('error', e => { encoderFailure = e; });
    ff.stdin.on('error', e => { encoderFailure = e; });
    const done = new Promise((resolve, reject) => {
      ff.on('error', reject);
      ff.on('close', code => code === 0 ? resolve() : reject(new Error(encoderError || 'Encoder exited ' + code)));
    });
    done.catch(() => {}); // observed again after input closes
    let current = 0;
    for (let t = 0; t < Math.max(0, (start - .25) / fps); t += 1 / fps)
      await stage.page.evaluate(time => window.renderAt(time), t);
    const linear = Uint32Array.from({ length: 256 }, (_, i) => {
      const v = i / 255; return Math.round((v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4) * 65535);
    });
    const encoded = Uint8Array.from({ length: 65536 }, (_, i) => {
      const v = i / 65535; return Math.round(255 * (v <= .0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - .055));
    });
    const accumulator = new Uint32Array(width * height * 3);
    const outputFrame = Buffer.alloc(accumulator.length);
    const started = Date.now();
    for (let f = start; f < end; f++) {
      const count = draft ? 1 : plan.samples[f];
      accumulator.fill(0);
      for (let sample = 0; sample < count; sample++) {
        let t = count === 1 ? f / fps : (f - .25 + .5 * sample / (count - 1)) / fps;
        t = Math.max(current, Math.min(duration, t)); current = t;
        await stage.page.evaluate(time => window.renderAt(time), t);
        const raw = await sharp(await stage.capture()).removeAlpha().raw().toBuffer();
        if (raw.length !== accumulator.length) throw new Error('Unexpected capture size');
        if (count === 1) raw.copy(outputFrame);
        else for (let i = 0; i < raw.length; i++) accumulator[i] += linear[raw[i]];
      }
      if (count > 1) for (let i = 0; i < outputFrame.length; i++) outputFrame[i] = encoded[Math.round(accumulator[i] / count)];
      if (encoderFailure) throw encoderFailure;
      if (!ff.stdin.write(outputFrame)) await once(ff.stdin, 'drain');
      if (f % 60 === 0) console.log('frame', f, '/', end, 'samples', count, 'seconds', Math.round((Date.now() - started) / 1000));
    }
    if (stage.errors.length) throw new Error(stage.errors.join('\n'));
    ff.stdin.end(); await done;
    console.log('Rendered:', output);
  } finally { if (ff && ff.exitCode === null) ff.kill(); await stage.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
