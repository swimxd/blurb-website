// Lossless low-resolution forward-only analysis of the 180-degree shutter.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const { openStage } = require('./render-runtime.cjs');
(async () => {
  const output = process.argv[2] || 'out/motion.json';
  const fps = 60, shutter = .5, stage = await openStage(480, 270);
  try {
    const duration = await stage.page.evaluate(() => window.DURATION);
    const frames = Math.round(duration * fps), samples = [];
    const capture = async time => {
      await stage.page.evaluate(t => window.renderAt(t), time);
      return sharp(await stage.capture()).greyscale().raw().toBuffer();
    };
    for (let f = 0; f < frames; f++) {
      const a = await capture(Math.max(0, (f - shutter / 2) / fps));
      const b = await capture(Math.min(duration, (f + shutter / 2) / fps));
      const histogram = new Uint32Array(256);
      for (let i = 0; i < a.length; i++) histogram[Math.abs(a[i] - b[i])]++;
      const percentile = fraction => {
        let total = 0;
        for (let value = 255; value >= 0; value--) {
          total += histogram[value]; if (total >= a.length * fraction) return value;
        }
        return 0;
      };
      samples.push(f === 0 ? 1 : Math.max(2, Math.min(16, Math.ceil(1.5 + Math.max(percentile(.01), percentile(.001) / 2) / 13))));
      if (f % 120 === 0) console.log('motion', f, '/', frames);
    }
    if (stage.errors.length) throw new Error(stage.errors.join('\n'));
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify({ fps, duration, shutter, samples }));
    console.log('Motion analysis complete. Samples:', samples.reduce((a,b) => a+b,0));
  } finally { await stage.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
