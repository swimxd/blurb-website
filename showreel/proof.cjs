const fs = require('node:fs');
const sharp = require('sharp');
const { openStage } = require('./render-runtime.cjs');
(async () => {
  const stage = await openStage();
  try {
    fs.mkdirSync('out', { recursive: true });
    const times = [3.2, 5.0, 6.6, 10.65, 12.2, 15.2, 18.2, 23.6, 28.9];
    let current = 0;
    const tiles = [];
    for (let i = 0; i < times.length; i++) {
      await stage.page.evaluate(([a,b]) => { for (let t=a; t<b; t+=1/60) window.renderAt(t); window.renderAt(b); }, [current, times[i]]);
      current = times[i];
      const png = await stage.capture();
      fs.writeFileSync('out/frame-' + times[i] + '.png', png);
      const small = await sharp(png).resize(640,360).toBuffer();
      tiles.push({ input: small, left: (i%3)*640, top: Math.floor(i/3)*360 });
    }
    await sharp({ create: { width: 1920, height: 1080, channels: 3, background: '#111' } }).composite(tiles).png().toFile('out/storyboard.png');
    console.log(JSON.stringify({duration: await stage.page.evaluate(() => window.DURATION), frames: times, errors:stage.errors}));
    if (stage.errors.length) process.exitCode = 1;
  } finally { await stage.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
