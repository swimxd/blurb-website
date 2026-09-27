const { chromium } = require('playwright');
const fs = require('node:fs');
const { serve } = require('./server.cjs');
async function openStage(width = 1920, height = 1080) {
  const { server, url } = await serve(__dirname);
  const options = { headless: true, args: ['--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb'] };
  if (process.env.BROWSER_PATH) options.executablePath = process.env.BROWSER_PATH;
  else if (process.env.BROWSER_CHANNEL) options.channel = process.env.BROWSER_CHANNEL;
  else if (!fs.existsSync(chromium.executablePath())) options.channel = 'msedge';
  let browser;
  try {
    browser = await chromium.launch(options);
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', response => { if (response.status() >= 400) errors.push(response.url() + ': ' + response.status()); });
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForFunction(() => window.READY === true, null, { timeout: 30000 });
    if (errors.length) throw new Error(errors.join('\n'));
    // Layout measurements are made at the native stage size before scaling.
    await page.evaluate(scale => {
      const stage = document.getElementById('stage');
      stage.style.transformOrigin = '0 0';
      stage.style.transform = 'scale(' + scale + ')';
    }, width / 1920);
    await page.setViewportSize({ width, height });
    // This is a deterministic offline render: fonts/assets are ready and the
    // timeline is paused. Capture the committed surface without UI-action
    // stability waits. optimizeForSpeed changes PNG compression, not pixels.
    const captureSession = await page.context().newCDPSession(page);
    const capture = async () => Buffer.from((await captureSession.send('Page.captureScreenshot', {
      format: 'png', captureBeyondViewport: false, optimizeForSpeed: true
    })).data, 'base64');
    return { page, capture, errors, close: async () => { await browser.close(); await new Promise(r => server.close(r)); } };
  } catch (error) {
    if (browser) await browser.close();
    server.close();
    throw error;
  }
}
module.exports = { openStage };
