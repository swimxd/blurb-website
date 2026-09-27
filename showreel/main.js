/* Blurb v6 — 29.4s product reel. Deterministic: window.renderAt(t) draws the frame at time t (seconds). */
(async function () {
  gsap.registerPlugin(DrawSVGPlugin);
  const fonts = ['400 20px "JetBrains Mono"', '500 20px "JetBrains Mono"', '700 20px "JetBrains Mono"', '700 20px Nunito', '800 20px Nunito', '900 20px Nunito', '400 20px "Noto Sans"', '500 20px "Noto Sans"',
    '600 20px "Noto Sans"', '700 20px "Noto Sans"', '400 20px "Noto Serif"', '500 20px "Noto Serif"'];
  await Promise.all(fonts.map(f => document.fonts.load(f)));
  const srcs = ['assets/maya.png', ...[0, 1, 2, 3, 4, 5].map(i => `assets/grain${i}.png`), ...['discord', 'gmessages', 'teams', 'signal', 'telegram', 'whatsapp'].map(n => `assets/app_${n}.png`)];
  window._keep = await Promise.all(srcs.map(async s => { const im = new Image(); im.src = s; await im.decode(); return im; }));
  build();
  window.READY = true;
})();

function build() {
  const CX = 960, CY = 540;
  const stage = document.getElementById('stage');
  const tl = gsap.timeline({ paused: true });
  window.TL = tl;

  function el(tag, cls, parent, css, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (css) Object.assign(e.style, css);
    if (html != null) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  }
  const px = v => v + 'px';
  const SPARK = `<svg viewBox="0 0 100 100" class="spark"><use href="#star4" transform="translate(61 57) scale(39)" fill="url(#sg)"/><use href="#star4" transform="translate(21 22) scale(17)" fill="url(#sg)"/><use href="#star4" transform="translate(23 81) scale(10)" fill="url(#sg)"/></svg>`;

  // logo geometry (favicon rects, scaled 1.3 about centre) in a 300px box
  const LOGO = { x: 56.11, y: [92.22, 135.56, 178.89], w: [187.78, 137.22, 86.67], h: 28.89 };
  function logoBars(cx, cy, s) { // stage-space rects of the three bars for an icon centred at cx,cy with scale s
    return [0, 1, 2].map(g => ({
      left: cx + (LOGO.x - 150) * s, top: cy + (LOGO.y[g] - 150) * s,
      width: LOGO.w[g] * s, height: LOGO.h * s, borderRadius: LOGO.h * s / 2
    }));
  }

  /* ---------------- layers ---------------- */
  const bgDark = el('div', 'layer bg-dark', stage);
  const dust = el('div', 'layer', stage);
  const bgCream = el('div', 'layer bg-cream', stage);
  const blobDefs = [
    { x: 380, y: 250, s: 1100, c: 'rgba(214,218,255,.95)' },
    { x: 1560, y: 860, s: 1200, c: 'rgba(230,222,205,.95)' },
    { x: 1500, y: 180, s: 900, c: 'rgba(255,255,255,.85)' },
    { x: 260, y: 940, s: 900, c: 'rgba(222,224,255,.7)' }];
  const blobs = blobDefs.map(b => el('div', 'blob', bgCream, {
    width: px(b.s), height: px(b.s), left: px(b.x - b.s / 2), top: px(b.y - b.s / 2), filter: 'none',
    background: `radial-gradient(circle at 50% 50%, ${b.c} 0%, rgba(243,239,230,0) 62%)`
  }));
  const camera = el('div', 'layer', stage, { transformOrigin: '960px 540px' });
  const sceneA = el('div', 'layer persp', camera);
  const sceneC = el('div', 'layer', camera);
  const d2 = el('div', 'layer persp', camera, { opacity: 0 });
  const d3 = el('div', 'layer persp', camera, { opacity: 0 });
  const d4 = el('div', 'layer persp', camera, { opacity: 0 });
  const d5 = el('div', 'layer persp', camera, { opacity: 0 });
  const d6 = el('div', 'layer', camera, { opacity: 0 });
  const fxBack = el('div', 'layer', camera);
  const sceneB = el('div', 'layer', camera);
  const iconL = el('div', 'layer', camera);
  const fxFront = el('div', 'layer', camera);
  const wipeL = el('div', 'layer', stage);
  const grain = el('div', 'layer grain', stage);
  el('div', 'layer vignette', stage);

  // dust motes for the dark opening
  const motes = [];
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 24; i++) {
    const s = 2 + rnd() * 4;
    motes.push({
      e: el('div', 'abs', dust, { width: px(s), height: px(s), borderRadius: '50%', background: '#b9c3ff', opacity: (0.08 + rnd() * 0.16).toFixed(2) }),
      x: rnd() * 1920, y: rnd() * 1080, v: 10 + rnd() * 40, ph: rnd() * 6.28, z: 0.4 + rnd()
    });
  }

  /* ============ SCENE A — the noise (0 → 4s) ============ */
  const T = [0, 1, 2, 3, 4, 5, 6, 7].map(i => 0.5 + i * 0.25);   // eighth notes @120bpm

  // intro ping
  const idot = el('div', 'abs', sceneA, { width: '22px', height: '22px', borderRadius: '50%', background: '#c9d0ff', left: '949px', top: '529px', boxShadow: '0 0 34px 8px rgba(120,140,255,.6)' });
  const iring = el('div', 'ring', sceneA, { width: '22px', height: '22px', left: '949px', top: '529px', borderWidth: '3px', borderColor: '#b9c3ff' });
  gsap.set([idot, iring], { scale: 0 });
  tl.fromTo(idot, { scale: 0 }, { scale: 1, duration: .35, ease: 'power3.out', immediateRender: false }, 0.06);
  tl.fromTo(iring, { scale: 1, opacity: .9 }, { scale: 11, opacity: 0, duration: .8, ease: 'expo.out', immediateRender: false }, 0.12);
  tl.to(idot, { scale: 0, duration: .1, ease: 'power2.in' }, 0.42);

  // odometer counter
  const counter = el('div', 'counter', sceneA, { opacity: 0 });
  const digits = el('div', 'digits', counter);
  for (let d = 0; d <= 8; d++) el('div', 'digit', digits, null, String(d));
  const clabel = el('div', 'clabel', sceneA, { top: '955px', opacity: 0 }, 'NEW MESSAGES');
  tl.fromTo(counter, { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration: 1.0, ease: 'power2.out', immediateRender: false }, 0.18);
  tl.fromTo(clabel, { opacity: 0, letterSpacing: '.9em' }, { opacity: 1, letterSpacing: '.42em', duration: .8, ease: 'expo.out', immediateRender: false }, 0.3);
  T.forEach((t, i) => tl.to(digits, { y: -760 * (i + 1), duration: .42, ease: 'power3.inOut' }, t));

  // BEFORE card geometry (stage space)
  const BW = 780, BPAD = 32;
  const BH = 26 + 30 + 6 + 38 + 4 + 7 * 46 + 42 + 30;
  const bx = CX - BW / 2, by = CY - BH / 2;
  const lineTop = k => by + 104 + k * 46;

  const bbg = el('div', 'bbg', sceneA, { left: px(bx), top: px(by), width: px(BW), height: px(BH), opacity: 0 });

  const msgs = ['Still on for dinner tonight?', 'Booked Lucia’s for 7', 'They just called, 7 is gone', 'Moved us to 7:45, same place',
    'Jonah’s coming, so four of us', 'Can you grab the birthday card?', 'It’s for Priya, keep it quiet', 'Parking’s bad, maybe take the tram'];
  const place = [[-450, -262, -6], [440, -300, 5], [-505, 175, 4], [468, 196, -5], [-40, -386, 2], [44, 352, -3], [-320, -18, -7], [345, -48, 6]];

  const cards = msgs.map((m, i) => {
    const c = el('div', 'ncard', sceneA, { opacity: 0, padding: '0' });
    const inn = el('div', null, c, { position: 'relative', padding: '24px 32px 28px' }); // filter lives here (Chrome drops filtered 3D layers)
    const bg = el('div', 'nbg', inn);
    const head = el('div', 'nhead', inn, null, '<span class="gdot"></span>Messages · now');
    const title = el('div', 'ntitle', inn, null, 'Maya Ortiz');
    const body = el('div', 'nbody', inn, null, m);
    const av = el('img', 'nav', inn); av.src = 'assets/maya.png';
    const dim = el('div', 'dim', inn);
    return { c, inn, bg, head, title, body, av, dim, w: c.offsetWidth, h: c.offsetHeight, bl: body.offsetLeft, bt: body.offsetTop };
  });

  const bhead = el('div', 'bhead nhead', sceneA, { left: px(bx + BPAD), top: px(by + 26), opacity: 0 }, '<span class="gdot"></span>Messages · now');
  const btitle = el('div', 'btitle', sceneA, { left: px(bx + BPAD), top: px(by + 62), font: "600 28px/38px 'Noto Sans'", color: '#1b1b21', opacity: 0 }, 'Maya Ortiz');
  const bav = el('img', 'bav', sceneA, { left: px(bx + BW - 26 - 72), top: px(by + 22), width: '72px', height: '72px', borderRadius: '50%', opacity: 0 }); bav.src = 'assets/maya.png';
  const blines = msgs.map((m, k) => el('div', 'bline', sceneA, { left: px(bx + BPAD), top: px(lineTop(k)), opacity: 0 }, m));
  const lineW = blines.map(l => l.getBoundingClientRect().width);
  const titleW = btitle.getBoundingClientRect().width;
  const tbar = el('div', 'bar', sceneA, { left: px(bx + BPAD), top: px(by + 62 + 9), width: px(titleW), height: '20px', borderRadius: '10px', background: '#bdbac4' });
  const bars = blines.map((l, k) => el('div', 'bar', sceneA, { left: px(bx + BPAD), top: px(lineTop(k) + 13), width: px(lineW[k]), height: '16px' }));
  gsap.set([tbar, ...bars], { scaleX: 0 });

  // arrivals
  cards.forEach((cd, i) => {
    const [dx, dy, r] = place[i];
    const a = Math.atan2(dy, dx), s = dx > 0 ? 1 : -1;
    gsap.set(cd.c, { xPercent: -50, yPercent: -50, x: CX + dx, y: CY + dy, rotation: r, transformOrigin: '50% 50%' });
    // soft drift-in (no slam): small outward offset, gentle settle
    tl.fromTo(cd.c, { opacity: 0 }, { opacity: 1, duration: .32, ease: 'power1.out', immediateRender: false }, T[i]);
    tl.fromTo(cd.c, { x: CX + dx + Math.cos(a) * 120, y: CY + dy + Math.sin(a) * 90 + 30, z: 110, rotation: r + 5 * s, rotationX: 7, rotationY: -8 * s },
      { x: CX + dx, y: CY + dy, z: 0, rotation: r, rotationX: 0, rotationY: 0, duration: .8, ease: 'power3.out', immediateRender: false }, T[i]);
    for (let j = i + 1; j < 8; j++) {
      const n = j - i;
      tl.to(cd.c, { z: -70 * n, duration: .6, ease: 'power2.out' }, T[j] + .05);
      tl.to(cd.inn, { filter: `blur(${Math.min(3, 0.45 * n).toFixed(2)}px)`, duration: .6, ease: 'power2.out' }, T[j] + .05);
      tl.to(cd.dim, { opacity: Math.min(.4, .06 * n), duration: .6, ease: 'power2.out' }, T[j] + .05);
    }
  });

  // converge into one card (2.5 → 3.0)
  cards.forEach((cd, i) => {
    const tx = bx + BPAD - cd.bl + cd.w / 2, ty = lineTop(i) - cd.bt + cd.h / 2;
    tl.to(cd.c, { x: tx, y: ty, z: 0, rotation: 0, rotationX: 0, rotationY: 0, duration: .5, ease: 'expo.inOut' }, 2.5 + (7 - i) * 0.008);
    tl.to(cd.inn, { filter: 'blur(0px)', duration: .4, ease: 'power2.inOut' }, 2.5);
    tl.to(cd.dim, { opacity: 0, duration: .3 }, 2.5);
    tl.to([cd.bg, cd.head, cd.title, cd.av], { opacity: 0, duration: .18, ease: 'power1.in' }, 2.74);
  });
  tl.to([counter, clabel], { opacity: 0, scale: .92, duration: .4, ease: 'power2.in' }, 2.45);
  tl.fromTo(bbg, { opacity: 0, scale: .97 }, { opacity: 1, scale: 1, duration: .28, ease: 'power2.out', immediateRender: false }, 2.72);
  tl.fromTo([bhead, btitle, bav], { opacity: 0 }, { opacity: 1, duration: .2, immediateRender: false }, 2.8);
  tl.set(blines, { opacity: 1 }, 3.0);
  tl.set(cards.map(c => c.c), { opacity: 0 }, 3.0);

  // text → skeleton bars (3.0 → 3.3)
  tl.to(tbar, { scaleX: 1, duration: .24, ease: 'power3.inOut' }, 2.98);
  tl.fromTo(btitle, { clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 100%)', duration: .24, ease: 'power3.inOut', immediateRender: false }, 2.98);
  blines.forEach((l, k) => {
    tl.to(bars[k], { scaleX: 1, duration: .24, ease: 'power3.inOut' }, 3.02 + k * .028);
    tl.fromTo(l, { clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 100%)', duration: .24, ease: 'power3.inOut', immediateRender: false }, 3.02 + k * .028);
  });
  tl.to(bhead, { opacity: 0, x: -24, duration: .25, ease: 'power2.in' }, 3.0);
  tl.to(bav, { scale: 0, duration: .3, ease: 'power2.in' }, 3.04);

  // card → app icon morph (3.28 → 3.97)
  const ICON_S0 = 0.86;
  const tgt = logoBars(CX, CY, ICON_S0);
  const IS = 300 * ICON_S0;
  tl.to(bbg, { left: bx - 12, top: by - 9, width: BW + 24, height: BH + 18, duration: .16, ease: 'power2.out' }, 3.28);
  tl.to(bbg, { left: CX - IS / 2, top: CY - IS / 2, width: IS, height: IS, borderRadius: 83 * ICON_S0, duration: .52, ease: 'expo.inOut' }, 3.44);
  tl.to(bbg, { backgroundColor: '#4355b9', boxShadow: '0 30px 70px rgba(67,85,185,.45)', duration: .3, ease: 'power1.in' }, 3.64);
  const groupOf = [0, 0, 0, 1, 1, 1, 2, 2];
  [tbar, ...bars].forEach((b, k) => {
    const g = k === 0 ? 0 : groupOf[k - 1];
    const order = Math.abs(k - 4.5);
    tl.to(b, { ...tgt[g], backgroundColor: '#ffffff', duration: .5, ease: 'expo.inOut' }, 3.4 + order * .012);
  });

  /* ---------- the icon (lives on from 3.97) ---------- */
  const icon = el('div', 'icon', iconL, { opacity: 0, boxShadow: '0 30px 70px rgba(67,85,185,.45), 0 8px 18px rgba(67,85,185,.25)' });
  const ibars = [0, 1, 2].map(g => el('div', 'ibar', icon, { left: px(LOGO.x), top: px(LOGO.y[g]), width: px(LOGO.w[g]) }));
  const sheen = el('div', 'sheen', icon); const sheenI = el('i', null, sheen);
  gsap.set(icon, { xPercent: -50, yPercent: -50, x: CX, y: CY, scale: ICON_S0 });
  gsap.set(ibars, { transformOrigin: '0% 50%' });
  tl.set(icon, { opacity: 1 }, 3.97);
  tl.set([bbg, tbar, ...bars, btitle, ...blines], { opacity: 0 }, 3.97);
  tl.fromTo(icon, { scale: ICON_S0 }, { scale: 1, duration: .5, ease: 'power3.out', immediateRender: false }, 4.0);

  /* ---------- impact (4.0) ---------- */
  tl.fromTo(bgCream, { clipPath: 'circle(130px at 960px 540px)' }, { clipPath: 'circle(1180px at 960px 540px)', duration: 1.0, ease: 'expo.out', immediateRender: false }, 4.0);
  tl.set([bgDark, dust], { opacity: 0 }, 5.1);
  function ring(parent, t, r0, r1, color, bw0, bw1, dur) {
    const r = el('div', 'ring', parent, { borderColor: color, opacity: 0 });
    tl.fromTo(r, { width: r0 * 2, height: r0 * 2, x: CX - r0, y: CY - r0, opacity: .38, borderWidth: bw0 },
      { width: r1 * 2, height: r1 * 2, x: CX - r1, y: CY - r1, opacity: 0, borderWidth: bw1, duration: dur, ease: 'expo.out', immediateRender: false }, t);
    return r;
  }
  ring(fxBack, 4.0, 130, 1180, '#4355b9', 4, 1, 1.0);


  /* ============ SCENE B — lockup (4.4 → 5.8) ============ */
  function wordmark(size) {
    const w = el('div', 'wm', sceneB, { fontSize: px(size) });
    const cs = 'Blurb'.split('').map(ch => { const m = el('span', 'm', w); return el('span', 'c', m, null, ch); });
    return { w, cs, width: w.getBoundingClientRect().width, height: w.getBoundingClientRect().height };
  }
  function tagline(html, top, size) {
    const t = el('div', 'tag', sceneB, { top: px(top), fontSize: px(size) }, html);
    const ws = [...t.querySelectorAll('.w')];
    gsap.set(ws, { opacity: 0 });
    return { t, ws };
  }
  const TAG = '<span class="w">Long</span> <span class="w">chats.</span> <span class="w" style="color:#4355b9">One</span> <span class="w" style="color:#4355b9">short</span> <span class="w" style="color:#4355b9">summary.</span>';

  const wm1 = wordmark(230);
  const L1 = { icon: 250, gap: 58, y: 488 };
  const tot1 = L1.icon + L1.gap + wm1.width;
  const ix1 = CX - tot1 / 2 + L1.icon / 2;
  gsap.set(wm1.w, { x: CX - tot1 / 2 + L1.icon + L1.gap, y: L1.y - wm1.height * 0.54 });
  gsap.set(wm1.cs, { yPercent: 118 });
  const tag1 = tagline(TAG, 660, 66);

  tl.to(icon, { x: ix1, y: L1.y, scale: L1.icon / 300, duration: .75, ease: 'expo.inOut' }, 4.5);
  tl.fromTo(wm1.cs, { yPercent: 118, rotation: 12 }, { yPercent: 0, rotation: 0, duration: .75, ease: 'expo.out', stagger: .045, immediateRender: false }, 4.88);
  tl.fromTo(tag1.ws, { opacity: 0, y: 54, filter: 'blur(12px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: .6, ease: 'expo.out', stagger: .06, immediateRender: false }, 5.0);
  // exit
  tl.to(wm1.cs, { yPercent: -118, opacity: 0, duration: .32, ease: 'power3.in', stagger: .03 }, 5.72);
  tl.to(tag1.ws, { opacity: 0, y: -40, filter: 'blur(8px)', duration: .28, ease: 'power2.in', stagger: .025 }, 5.7);

  /* ============ SCENE C — the summary (5.8 → 8.0) ============ */
  const sgrp = el('div', 'sgrp', sceneC);
  const sgin = el('div', 'sgin', sgrp, { opacity: 0 });
  const sframe = el('div', 'sframe', sgin);
  const scard = el('div', 'scard', sframe);
  const shead = el('div', 'shead', scard);
  const glyph = el('div', 'glyph', shead);
  [[0, 34], [7.85, 24.8], [15.7, 15.7]].forEach(([t, w]) => el('i', null, glyph, { top: px(t), width: px(w) }));
  const sheadBl = el('span', 'bl', shead, null, 'Blurb');
  const sheadRest = el('span', null, shead, { marginLeft: '10px' }, '· Messages · now');
  const stitle = el('div', 'stitle', scard, null, 'Maya Ortiz');
  const tokens = [['Dinner'], ['at'], ['Lucia’s'], ['moved'], ['to'], ['7:45', 0], ['for'], ['four', 1, ';'], ['grab'], ['Priya’s', 2], ['birthday', 2], ['card', 2], ['and'], ['maybe'], ['take'], ['the'], ['tram', 3, '.']];
  const sbody = el('div', 'sbody', scard);
  const sparkWrap = el('span', 'w', sbody, null, SPARK);
  sbody.appendChild(document.createTextNode(''));
  const wordEls = [], marks = [[], [], [], []], hlText = [[], [], [], []];
  tokens.forEach(([w, h, p]) => {
    const s = el('span', 'w', sbody);
    if (h != null) {
      const hw = el('span', 'hlw', s); const mk = el('i', 'mk', hw); hw.appendChild(document.createTextNode(w));
      marks[h].push(mk); hlText[h].push(hw);
      if (p) s.appendChild(document.createTextNode(p));
    } else s.textContent = w;
    sbody.appendChild(document.createTextNode(' '));
    wordEls.push(s);
  });
  const sav = el('img', 'sav', scard); sav.src = 'assets/maya.png';
  const sorig = el('div', 'sorig', scard);
  const sorigIn = el('div', 'sorig-in', sorig);
  const olines = msgs.map(m => el('div', 'oline', sorigIn, null, `“${m}”`));

  // measure (collapsed + expanded)
  const FW = sframe.offsetWidth;
  const hC = sframe.offsetHeight;
  sorig.style.height = 'auto';
  const hOrig = sorig.offsetHeight;
  const hE = sframe.offsetHeight;
  const bodyTop = sbody.offsetTop + scard.offsetTop, bodyH = sbody.offsetHeight;
  const origTop = sorig.offsetTop + scard.offsetTop + 30, origH = hOrig - 30;
  sorig.style.height = '0px';
  const SCX = 1330;
  const sx0 = SCX - FW / 2, sy0 = CY - hC / 2;
  gsap.set(sgrp, { x: sx0, y: sy0 });
  const gr = glyph.getBoundingClientRect(), st = stage.getBoundingClientRect();
  const gcx = gr.left - st.left + gr.width / 2, gcy = gr.top - st.top + gr.height / 2;
  gsap.set(sgin, { transformOrigin: `${gcx - sx0}px ${gcy - sy0}px` });
  gsap.set(glyph, { opacity: 0 });
  gsap.set([sheadBl, sheadRest, stitle], { opacity: 0 });
  gsap.set(sav, { scale: 0 });
  gsap.set(sparkWrap, { scale: 0 });
  gsap.set(wordEls, { opacity: 0 });
  gsap.set(olines, { opacity: 0 });

  // icon → header glyph
  tl.to(icon, { x: gcx, y: gcy, scale: 34 / LOGO.w[0], rotation: 0, duration: .58, ease: 'expo.inOut' }, 5.74);
  tl.to(icon, { backgroundColor: 'rgba(67,85,185,0)', boxShadow: '0 0px 0px rgba(67,85,185,0), 0 0px 0px rgba(67,85,185,0)', duration: .3, ease: 'power1.in' }, 5.98);
  tl.to(ibars, { backgroundColor: '#4355b9', duration: .3, ease: 'power1.in' }, 5.98);
  tl.fromTo(sgin, { scale: 0, opacity: 1 }, { scale: 1, duration: .7, ease: 'expo.out', immediateRender: false }, 6.14);
  tl.set(sgin, { opacity: 1 }, 6.14);
  tl.set(glyph, { opacity: 1 }, 6.8);
  tl.set(icon, { opacity: 0 }, 6.8);
  tl.fromTo([sheadBl, sheadRest], { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: .45, ease: 'expo.out', stagger: .06, immediateRender: false }, 6.32);
  tl.fromTo(stitle, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .45, ease: 'expo.out', immediateRender: false }, 6.36);
  tl.fromTo(sav, { scale: 0, rotation: -30 }, { scale: 1, rotation: 0, duration: .6, ease: 'power3.out', immediateRender: false }, 6.36);
  tl.fromTo(sparkWrap, { scale: 0, rotation: -120 }, { scale: 1, rotation: 0, duration: .6, ease: 'power3.out', immediateRender: false }, 6.44);
  tl.fromTo(wordEls, { opacity: 0, y: 26, filter: 'blur(6px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: .45, ease: 'expo.out', stagger: .026, immediateRender: false }, 6.48);

  // highlights (7.45 → 8.0) — group 0..3
  const hlT = [7.46, 7.58, 7.7, 7.86];
  marks.forEach((ms, g) => {
    ms.forEach((mk, j) => tl.to(mk, { scaleX: 1, duration: .16, ease: 'power2.out' }, hlT[g] + j * .07));
    tl.to(hlText[g], { color: '#00105c', duration: .15 }, hlT[g]);
  });

  /* ---------- left headlines ---------- */
  function headline(parent, lines, sub, topPx, center) {
    const b = el('div', 'hl-block', parent, center ? { left: '0px', width: '1920px', textAlign: 'center' } : null);
    const ins = lines.map(l => { const m = el('div', 'hl-line', b); return el('span', 'hl-in ' + (l.cls || ''), m, l.css || null, l.html); });
    const s = sub ? el('div', 'hl-sub', b, center ? { maxWidth: 'none' } : null, sub) : null;
    if (center) ins.forEach(i => i.style.transformOrigin = '50% 100%');
    const h = b.offsetHeight;
    b.style.top = px(topPx != null ? topPx : CY - h / 2 - 6);
    gsap.set(ins, { yPercent: 115 });
    if (s) gsap.set(s, { opacity: 0 });
    return {
      b, ins, s,
      in(t) {
        tl.fromTo(ins, { yPercent: 115, rotation: 3 }, { yPercent: 0, rotation: 0, duration: .8, ease: 'power4.out', stagger: .09, immediateRender: false }, t);
        if (s) tl.fromTo(s, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: .6, ease: 'power3.out', immediateRender: false }, t + .2);
      },
      out(t) {
        tl.to(ins, { yPercent: -150, duration: .34, ease: 'power3.in', stagger: .045 }, t);
        if (s) tl.to(s, { opacity: 0, y: -12, duration: .25, ease: 'power2.in' }, t);
      }
    };
  }
  const hC1 = headline(sceneC, [{ html: '8 messages.', css: { color: '#9a98a3' } }, { html: '<span style="color:#4355b9">1</span> sentence.' }], null);
  hC1.ins[1].style.fontSize = '104px';
  hC1.ins[0].style.fontSize = '84px';
  hC1.b.style.top = px(CY - hC1.b.offsetHeight / 2 - 10);
  const strike = el('div', 'abs', hC1.ins[0], { left: '-6px', right: '-6px', width: 'auto', top: '52%', height: '9px', borderRadius: '5px', background: '#4355b9', transformOrigin: '0 50%', transform: 'scaleX(0)' });
  hC1.ins[0].style.position = 'relative';
  tl.fromTo(hC1.ins[0], { yPercent: 115, rotation: 6 }, { yPercent: 0, rotation: 0, duration: .75, ease: 'expo.out', immediateRender: false }, 6.5);
  tl.to(strike, { scaleX: 1, duration: .32, ease: 'power3.inOut' }, 7.18);
  tl.to(hC1.ins[0], { color: '#b9b7c0', duration: .3 }, 7.2);
  tl.fromTo(hC1.ins[1], { yPercent: 115, rotation: 6 }, { yPercent: 0, rotation: 0, duration: .75, ease: 'expo.out', immediateRender: false }, 7.36);
  hC1.out(7.94);

  /* ============ D1 — details on expand (8.0 → 10.0) ============ */
  const hD1 = headline(sceneC, [{ html: 'The gist first.' }, { html: 'Details on expand.', cls: 'accent' }], 'Expand a summary to read the original messages.');
  hD1.in(8.08);
  const SE = 0.8, SCX2 = 1392;
  tl.to(sgrp, { x: SCX2 - SE * FW / 2, y: CY - SE * hE / 2, scale: SE, duration: .8, ease: 'expo.inOut' }, 7.98);
  tl.to(sorig, { height: hOrig, duration: .8, ease: 'expo.inOut' }, 7.98);
  tl.fromTo(olines, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: .5, ease: 'expo.out', stagger: .045, immediateRender: false }, 8.22);
  // slow push while the viewer reads (scale about the card centre)
  const SE2 = 0.83;
  tl.to(sgrp, { x: SCX2 - SE2 * FW / 2, y: CY - SE2 * hE / 2, scale: SE2, duration: 1.22, ease: 'sine.inOut' }, 8.78);
  // brackets
  const bx0 = FW + 26;
  const brk1 = el('div', 'brk', sgin, { left: px(bx0), top: px(bodyTop), height: px(bodyH) });
  const brk2 = el('div', 'brk', sgin, { left: px(bx0), top: px(origTop), height: px(origH) });
  const lb1 = el('div', 'brk-l', sgin, null, 'SUMMARY');
  const lb2 = el('div', 'brk-l', sgin, null, '“ ORIGINALS ”');
  [[lb1, bodyTop, bodyH], [lb2, origTop, origH]].forEach(([l, t, h]) => {
    const w = l.offsetWidth;
    Object.assign(l.style, { left: px(bx0 + 18 + 18 + 20), top: px(t + h / 2 - w / 2), transform: 'rotate(90deg)', transformOrigin: '0 0', opacity: 0 });
  });
  gsap.set([brk1, brk2], { scaleY: 0 });
  tl.to(brk1, { scaleY: 1, duration: .5, ease: 'expo.out' }, 8.6);
  tl.to(brk2, { scaleY: 1, duration: .55, ease: 'expo.out' }, 8.72);
  tl.to(lb1, { opacity: 1, duration: .35 }, 8.66);
  tl.to(lb2, { opacity: 1, duration: .35 }, 8.78);

  /* ============ wipes ============ */
  function wipe(tm, dir, colors) {
    const bs = [0, 1, 2].map(k => el('div', 'wbar', wipeL, { top: px(k * 360), background: colors[k], width: '0px', left: '-400px' }));
    bs.forEach((b, k) => {
      const d = k * .035;
      if (dir > 0) {
        tl.fromTo(b, { left: -220, width: 0 }, { left: -220, width: 2360, duration: .3, ease: 'power3.in', immediateRender: false }, tm - .37 + d);
        tl.to(b, { left: 2140, width: 0, duration: .42, ease: 'power3.out' }, tm + .01 + d);
      } else {
        tl.fromTo(b, { left: 2140, width: 0 }, { left: -220, width: 2360, duration: .3, ease: 'power3.in', immediateRender: false }, tm - .37 + d);
        tl.to(b, { width: 0, duration: .42, ease: 'power3.out' }, tm + .01 + d);
      }
    });
  }
  const W1 = 10.0, W2 = 12.0;
  wipe(W1, 1, ['#4355b9', '#3747a6', '#2b3a91']);
  wipe(W2, -1, ['#1d2230', '#4355b9', '#b9c3ff']);
  tl.set(sceneC, { opacity: 0 }, W1);
  tl.set(d2, { opacity: 1 }, W1);
  tl.set(d2, { opacity: 0 }, W2);
  tl.set(d3, { opacity: 1 }, W2);

  /* ---------- phone screens ---------- */
  const PX = 1390;
  function panel(parent) {
    const pw = el('div', 'pwrap', parent);
    const sc = el('div', 'screen', pw);
    const ct = el('div', 'content', sc);
    gsap.set(pw, { x: PX, y: CY, rotationY: -13, rotationX: 5 });
    return { pw, sc, ct };
  }
  function panelIn(p, t, items, hold) {
    tl.fromTo(p.pw, { x: PX + 160, rotationY: -26, rotationX: 8, z: -120 }, { x: PX, rotationY: -5, rotationX: 2, z: 0, duration: 1.0, ease: 'expo.out', immediateRender: false }, t);
    // gentle continuous drift for the rest of the shot
    tl.to(p.pw, { x: PX - 22, rotationY: -2, rotationX: 1, duration: hold - 1.0, ease: 'sine.inOut' }, t + 1.0);
    if (items) tl.fromTo(items, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: .6, ease: 'expo.out', stagger: .045, immediateRender: false }, t + .05);
  }
  function toggle(parent, on) {
    const g = el('div', 'tg', parent); const k = el('div', 'tk', g);
    if (on) setToggle(g, k, true);
    return { g, k };
  }
  function setToggle(g, k, on) {
    gsap.set(g, on ? { backgroundColor: '#4355b9', borderColor: '#4355b9' } : {});
    gsap.set(k, on ? { left: 40, width: 34, height: 34, marginTop: -17, backgroundColor: '#ffffff' } : {});
  }
  function toggleOn(tg, t) {
    tl.to(tg.g, { backgroundColor: '#4355b9', borderColor: '#4355b9', duration: .2, ease: 'power1.out' }, t);
    tl.to(tg.k, { left: 40, width: 34, height: 34, marginTop: -17, backgroundColor: '#ffffff', duration: .34, ease: 'power3.out' }, t);
  }

  // D2 — apps (10.0 → 12.0)
  const p2 = panel(d2);
  const h2 = el('div', 'row', p2.ct, { gap: '30px', alignItems: 'baseline' }, '<span class="back">Back</span><span class="ptitle">Apps</span>');
  const desc2 = el('div', 'pdesc', p2.ct, { marginTop: '26px' }, 'Pick the chats Blurb should sum up.');
  const search = el('div', 'search', p2.ct, { marginTop: '26px', height: '76px' }, 'Search apps');
  const apps = [['Discord', 'discord', false], ['Google Messages', 'gmessages', true], ['Microsoft Teams', 'teams', false],
    ['Signal', 'signal', true], ['Telegram', 'telegram', false], ['WhatsApp', 'whatsapp', true]];
  const appRows = [], appTg = [];
  const list2 = el('div', null, p2.ct, { marginTop: '14px' });
  apps.forEach(([n, key, on]) => {
    const r = el('div', 'approw', list2, { height: '94px' });
    el('div', 'aic', r, null, `<img src="assets/app_${key}.png" alt="">`);
    el('div', 'aname', r, null, n);
    appTg.push({ ...toggle(r, false), on });
    appRows.push(r);
  });
  panelIn(p2, W1, [h2, desc2, search, ...appRows], 2.0);
  const TOG = [10.55, 10.8, 11.05];
  appTg.filter(tg => tg.on).forEach((tg, i) => toggleOn(tg, TOG[i]));
  const tm = el('div', 'tmnote', d2, null, 'Google Messages, Signal, Discord, Microsoft Teams, Telegram and WhatsApp are trademarks of their respective owners. Blurb is not affiliated with or endorsed by them.');
  tl.fromTo(tm, { opacity: 0 }, { opacity: 1, duration: .6, ease: 'power2.out', immediateRender: false }, W1 + .35);
  const hD2 = headline(d2, [{ html: 'Choose which apps' }, { html: 'get summarized.', cls: 'accent' }], 'Google Messages, Signal, WhatsApp, Discord, Teams and Telegram.');
  hD2.in(W1 + .08);

  // D3 — processing (12.0 → 14.0)
  const p3 = panel(d3);
  const h3 = el('div', 'row', p3.ct, { gap: '30px', alignItems: 'baseline' }, '<span class="back">Back</span><span class="ptitle">Processing</span>');
  function rcard(parent, t, d, mt) {
    const c = el('div', 'rcard', parent, { marginTop: px(mt) });
    el('div', 't', c, null, t); el('div', 'd', c, null, d);
    const sel = el('div', 'rsel', c); const rd = el('div', 'rd', c); const dot = el('div', 'rdd', rd);
    return { c, sel, rd, dot };
  }
  const rc1 = rcard(p3.ct, 'On-device', 'Offline after download. Lower summary quality.', 40);
  const rc2 = rcard(p3.ct, 'Cloud', 'Better summaries. Needs internet and an API key.', 22);
  gsap.set(rc2.sel, { opacity: 1 }); gsap.set(rc2.rd, { borderColor: '#4355b9' }); gsap.set(rc2.dot, { scale: 1 });
  const fb = el('div', 'pdesc', p3.ct, { marginTop: '30px', fontSize: '24px' }, 'Text stays on this phone unless you turn on cloud fallback.');
  const mlabel = el('div', 'lbl', p3.ct, { marginTop: '34px' }, 'On-device model');
  const mcard = el('div', 'rcard', p3.ct, { marginTop: '18px', paddingRight: '30px', borderColor: '#4355b9', borderWidth: '3px' });
  el('div', 't', mcard, null, 'Gemma 4 E2B · 2.6 GB');
  el('div', 'd', mcard, null, 'Smaller download and lower memory use.');
  const prog = el('div', 'prog', mcard); const pfill = el('div', 'pfill', prog);
  const pmeta = el('div', 'pmeta', mcard);
  const pTxt = el('span', null, pmeta, null, 'Downloading… 0%');
  const pOk = el('span', null, pmeta, { display: 'flex', alignItems: 'center', gap: '8px', opacity: 0 },
    '<svg width="26" height="26" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#4355b9"/><path d="M7 12.5l3.2 3.2L17 9" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>Ready');
  // side icons (phone + cloud), drawn on
  const sidePhone = el('div', 'sideic', p3.pw, { left: '360px', top: px(-440 + 46 + 70 + 40 + 40) },
    '<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#4355b9" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/></svg>');
  const sideCloud = el('div', 'sideic', p3.pw, { left: '356px', top: px(-440 + 46 + 70 + 40 + 190 + 44) },
    '<svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#4355b9" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18h10a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.2 9.6 4.2 4.2 0 0 0 7 18z"/></svg>');
  const phonePaths = sidePhone.querySelectorAll('rect,path'), cloudPaths = sideCloud.querySelectorAll('path');
  gsap.set([...phonePaths], { drawSVG: '0%' });
  panelIn(p3, W2, [h3, rc1.c, rc2.c, fb, mlabel, mcard], 1.95);
  tl.fromTo([...cloudPaths], { drawSVG: '0%' }, { drawSVG: '100%', duration: .5, ease: 'power2.inOut', immediateRender: false }, W2 + .12);
  // switch selection → on-device
  const SW = 12.55;
  tl.to(sideCloud, { opacity: .35, duration: .3 }, SW + .02);
  tl.to(rc2.sel, { opacity: 0, duration: .2 }, SW);
  tl.to(rc2.dot, { scale: 0, duration: .18, ease: 'power2.in' }, SW);
  tl.to(rc2.rd, { borderColor: '#46464f', duration: .2 }, SW);
  tl.fromTo(rc1.sel, { opacity: 0, scale: 1.03 }, { opacity: 1, scale: 1, duration: .4, ease: 'expo.out', immediateRender: false }, SW + .04);
  tl.to(rc1.rd, { borderColor: '#4355b9', duration: .2 }, SW + .04);
  tl.fromTo(rc1.dot, { scale: 0 }, { scale: 1, duration: .4, ease: 'power3.out', immediateRender: false }, SW + .06);
  tl.fromTo([...phonePaths], { drawSVG: '0%' }, { drawSVG: '100%', duration: .45, ease: 'power2.inOut', immediateRender: false }, SW + .02);
  // download progress
  const P0 = 12.78, P1 = 13.45;
  tl.fromTo(pfill, { scaleX: 0 }, { scaleX: 1, duration: P1 - P0, ease: 'power1.inOut', immediateRender: false }, P0);
  tl.to(pTxt, { opacity: 0, duration: .1 }, P1);
  tl.fromTo(pOk, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: .3, ease: 'power3.out', immediateRender: false }, P1 + .02);
  const hD3 = headline(d3, [{ html: 'Pick on-device.', cls: 'accent' }], 'Gemma 4 E2B (2.6 GB) or E4B (3.7 GB). Offline after that.');
  hD3.in(W2 + .08);

  /* ============ D6 — privacy flow (old time 14.0 → 17.6) ============ */
  const F0 = 14.0;
  tl.set(d6, { opacity: 1 }, F0);
  // match cut: the Processing screen shrinks into the phone at the centre
  const PH = { cx: CX, cy: 668, w: 300, h: 480 };
  hD3.out(F0);
  tl.to(p3.ct, { opacity: 0, duration: .25, ease: 'power1.in' }, F0 + .02);
  tl.to([sidePhone, sideCloud], { opacity: 0, duration: .2 }, F0);
  tl.to(p3.pw, { x: PH.cx, y: PH.cy, rotationY: 0, rotationX: 0, z: 0, duration: .7, ease: 'expo.inOut' }, F0);
  tl.to(p3.sc, { left: -PH.w / 2, top: -PH.h / 2, width: PH.w, height: PH.h, borderRadius: 44, duration: .7, ease: 'expo.inOut' }, F0);

  // flat diagram layer
  const phone = el('div', 'screen', d6, { left: px(PH.cx - PH.w / 2), top: px(PH.cy - PH.h / 2), width: px(PH.w), height: px(PH.h), borderRadius: '44px', opacity: 0 });
  const odPill = el('div', 'abs', phone, { left: '50%', top: '34px', transform: 'translateX(-50%)', padding: '9px 18px', borderRadius: '20px', background: '#dee0ff', color: '#00105c', font: "600 20px/1 'Noto Sans'", whiteSpace: 'nowrap', opacity: 0 }, 'On-device');
  const chipW = el('div', 'abs', phone, { left: '0px', top: '0px', width: px(PH.w), height: px(PH.h), opacity: 0 });
  chipW.innerHTML = `<svg width="${PH.w}" height="${PH.h}" viewBox="0 0 ${PH.w} ${PH.h}">
    <circle cx="150" cy="232" r="104" fill="none" stroke="#e6e4f2" stroke-width="7"/>
    <circle class="ring" cx="150" cy="232" r="104" fill="none" stroke="#4355b9" stroke-width="7" stroke-linecap="round" transform="rotate(-90 150 232)"/>
    <g fill="#b9c3ff">${[0, 1, 2, 3].map(k => `<rect x="${112 + k * 22}" y="152" width="10" height="16" rx="4"/><rect x="${112 + k * 22}" y="296" width="10" height="16" rx="4"/><rect x="70" y="${194 + k * 22}" width="16" height="10" rx="4"/><rect x="214" y="${194 + k * 22}" width="16" height="10" rx="4"/>`).join('')}</g>
    <rect class="chip" x="84" y="166" width="132" height="132" rx="28" fill="#4355b9"/>
    <rect x="100" y="182" width="100" height="100" rx="18" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2"/>
    <text x="150" y="228" text-anchor="middle" font-family="Nunito" font-weight="800" font-size="30" fill="#fff">Gemma</text>
    <text x="150" y="262" text-anchor="middle" font-family="Nunito" font-weight="800" font-size="30" fill="#fff">4</text>
  </svg>`;
  const ringArc = chipW.querySelector('.ring'), chipRect = chipW.querySelector('.chip');
  const phoneCap = el('div', 'abs', phone, { left: '0px', width: px(PH.w), top: '372px', textAlign: 'center', font: "400 21px/1.35 'Noto Sans'", color: '#5d5d68', opacity: 0 }, 'Summarizing<br>on this phone');
  gsap.set(ringArc, { drawSVG: '0%' });
  const spec1 = el('div', 'abs', d6, { left: '0px', width: '1920px', top: px(PH.cy + PH.h / 2 + 26), textAlign: 'center', font: "600 25px/1.2 'Noto Sans'", color: '#1d2230', opacity: 0 }, 'Gemma 4 E2B or E4B');
  const spec2 = el('div', 'abs', d6, { left: '0px', width: '1920px', top: px(PH.cy + PH.h / 2 + 62), textAlign: 'center', font: "400 22px/1.2 'Noto Sans'", color: '#5d5d68', opacity: 0 }, 'LiteRT-LM &nbsp;·&nbsp; GPU &nbsp;·&nbsp; offline after download');

  // left: Maya's notification (the incoming messages)
  function miniCard(cx, w, inner) {
    const c = el('div', 'ncard2', d6, { position: 'absolute', left: px(cx - w / 2), top: '0px', width: px(w), marginTop: '0px', opacity: 0 }, inner);
    c.style.top = px(PH.cy - c.offsetHeight / 2);
    return c;
  }
  const leftCard = miniCard(396, 420, `<div class="nh2"><div><span class="gdot" style="width:18px;height:18px"></span>Messages · now</div></div>
    <div class="nt2">Maya Ortiz</div><img src="assets/maya.png" class="nav2" style="background:none">
    <div class="nl2" style="font-size:25px;line-height:38px">Still on for dinner tonight?</div>
    <div class="nl2" style="font-size:25px;line-height:38px">Booked Lucia’s for 7</div>
    <div class="nl2" style="font-size:25px;line-height:38px">They just called, 7 is gone</div>
    <div style="margin-top:12px;display:inline-block;padding:7px 14px;border-radius:16px;background:#ecebf3;font:500 19px/1 'Noto Sans';color:#5d5d68">+5 more messages</div>`);
  // right: the Blurb summary
  const rightCard = miniCard(1528, 440, `<div class="nh2"><div><i class="glyph" style="width:28px;height:17px"><i style="top:0;width:28px;height:4.3px"></i><i style="top:6.4px;width:20.4px;height:4.3px"></i><i style="top:12.9px;width:12.9px;height:4.3px"></i></i><span style="color:#4355b9">Blurb</span><span>· Messages · now</span></div></div>
    <div class="nt2">Maya Ortiz</div><img src="assets/maya.png" class="nav2" style="background:none">
    <div class="sum2" style="font-size:26px;line-height:38px"></div>`);
  rightCard.style.overflow = 'hidden';
  const rSum = rightCard.querySelector('.sum2');
  const rSpark = el('span', 'w', rSum, null, SPARK); rSum.appendChild(document.createTextNode(' '));
  const rWords = 'Dinner at Lucia’s moved to 7:45 for four; grab Priya’s birthday card and maybe take the tram.'.split(' ').map(w => { const e = el('span', 'w', rSum, null, w); rSum.appendChild(document.createTextNode(' ')); return e; });
  rightCard.style.top = px(PH.cy - rightCard.offsetHeight / 2);
  const rHead = [...rightCard.children].filter(c => !c.classList.contains('sum2'));

  // connectors + optional cloud (dimmed)
  const svgNS = 'http://www.w3.org/2000/svg';
  const conn = document.createElementNS(svgNS, 'svg');
  conn.setAttribute('width', 1920); conn.setAttribute('height', 1080);
  Object.assign(conn.style, { position: 'absolute', left: 0, top: 0, overflow: 'visible' });
  d6.insertBefore(conn, d6.firstChild);
  const L1x0 = 396 + 210 + 14, L1x1 = PH.cx - PH.w / 2 - 14, L2x0 = PH.cx + PH.w / 2 + 14, L2x1 = 1528 - 220 - 14;
  conn.innerHTML = `
    <path class="t1" d="M${L1x0} ${PH.cy} L${L1x1} ${PH.cy}" stroke="#dee0ff" stroke-width="12" stroke-linecap="round" fill="none"/>
    <path class="p1" d="M${L1x0} ${PH.cy} L${L1x1} ${PH.cy}" stroke="#4355b9" stroke-width="3.5" stroke-linecap="round" fill="none"/>
    <path class="t2" d="M${L2x0} ${PH.cy} L${L2x1} ${PH.cy}" stroke="#dee0ff" stroke-width="12" stroke-linecap="round" fill="none"/>
    <path class="p2" d="M${L2x0} ${PH.cy} L${L2x1} ${PH.cy}" stroke="#4355b9" stroke-width="3.5" stroke-linecap="round" fill="none"/>
    <path class="pc" d="M${PH.cx + PH.w / 2 - 20} ${PH.cy - PH.h / 2 + 34} C 1200 392, 1340 372, 1476 382" stroke="#b3b0bd" stroke-width="3" stroke-dasharray="7 10" stroke-linecap="round" fill="none"/>`;
  const [cT1, cP1, cT2, cP2, pc] = ['.t1', '.p1', '.t2', '.p2', '.pc'].map(q => conn.querySelector(q));
  gsap.set([cT1, cP1, cT2, cP2], { drawSVG: '0%' });
  gsap.set(pc, { opacity: 0 });
  const cloud = el('div', 'abs', d6, { left: '1466px', top: '330px', width: '120px', opacity: 0, textAlign: 'center' },
    `<svg width="92" height="92" viewBox="0 0 24 24" fill="none" stroke="#a9a6b3" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2.2 2.2"><path d="M7 18h10a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.2 9.6 4.2 4.2 0 0 0 7 18z"/></svg>
     <div style="font:500 20px/1.25 'Noto Sans';color:#8a8794;margin-top:0px;white-space:nowrap;margin-left:-40px;width:200px">Cloud · optional</div>`);
  const offPill = el('div', 'abs', d6, { left: '1262px', top: '366px', padding: '7px 14px', borderRadius: '16px', background: '#ecebf3', font: "600 18px/1 'Noto Sans'", color: '#62626c', opacity: 0 }, 'Off');
  const dots = [0, 1, 2, 3, 4, 5, 6, 7].map(() => el('div', 'abs', d6, { width: '14px', height: '14px', marginLeft: '-7px', marginTop: '-7px', borderRadius: '50%', background: '#4355b9', opacity: 0, boxShadow: '0 0 0 5px rgba(67,85,185,.14)' }));
  const pulse2 = el('div', 'abs', d6, { width: '18px', height: '18px', marginLeft: '-9px', marginTop: '-9px', borderRadius: '50%', background: '#4355b9', opacity: 0, boxShadow: '0 0 0 6px rgba(67,85,185,.16)' });

  const hF = headline(d6, [{ html: 'Your messages' }, { html: 'stay on your phone.', cls: 'accent' }], 'With on-device processing and cloud fallback off, message text stays on your phone.', 92, true);

  // measure the summary's text lines (stage coords) for the outro bars
  const stR = stage.getBoundingClientRect();
  const wrr = [rSpark, ...rWords].map(w => w.getBoundingClientRect());
  const ltops = [...new Set(wrr.map(r => Math.round(r.top)))].sort((a, b) => a - b);
  const rLines = ltops.map(tp => {
    const rs = wrr.filter(r => Math.round(r.top) === tp);
    const l = Math.min(...rs.map(r => r.left)), rt = Math.max(...rs.map(r => r.right));
    return { left: l - stR.left, top: tp - stR.top + 7, width: rt - l, height: rs[0].height - 14 };
  });
  const rCardRect = { left: rightCard.offsetLeft, top: rightCard.offsetTop, width: rightCard.offsetWidth, height: rightCard.offsetHeight };

  // --- timeline ---
  tl.set(phone, { opacity: 1 }, F0 + .72);
  tl.set(d3, { opacity: 0 }, F0 + .72);
  hF.in(F0 + .3);
  tl.fromTo(leftCard, { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: .7, ease: 'power3.out', immediateRender: false }, F0 + .72);
  tl.fromTo(odPill, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: .45, ease: 'power2.out', immediateRender: false }, F0 + .78);
  tl.fromTo(chipW, { opacity: 0, scale: .94 }, { opacity: 1, scale: 1, duration: .6, ease: 'power3.out', immediateRender: false }, F0 + .82);
  tl.to(phoneCap, { opacity: 1, duration: .5 }, F0 + 1.0);
  tl.to(cT1, { drawSVG: '100%', duration: .5, ease: 'power2.inOut' }, F0 + 1.02);
  tl.to(cP1, { drawSVG: '100%', duration: .5, ease: 'power2.inOut' }, F0 + 1.03);
  const D0 = F0 + 1.38;
  dots.forEach((d, i) => {
    const t = D0 + i * .06;
    tl.fromTo(d, { left: L1x0, top: PH.cy, opacity: 0, scale: .6 }, { left: L1x1 + 30, top: PH.cy, duration: .46, ease: 'power1.inOut', immediateRender: false }, t);
    tl.to(d, { opacity: 1, scale: 1, duration: .12 }, t);
    tl.to(d, { opacity: 0, scale: .4, duration: .12, ease: 'power1.in' }, t + .34);
  });
  tl.to(ringArc, { drawSVG: '100%', duration: .9, ease: 'power1.inOut' }, D0 + .12);
  tl.to(chipRect, { attr: { fill: '#3a4cb0' }, duration: .15, yoyo: true, repeat: 5, ease: 'sine.inOut' }, D0 + .2);
  tl.fromTo([spec1, spec2], { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .6, ease: 'power2.out', stagger: .1, immediateRender: false }, F0 + 1.5);
  tl.to(cT2, { drawSVG: '100%', duration: .42, ease: 'power2.inOut' }, D0 + .74);
  tl.to(cP2, { drawSVG: '100%', duration: .42, ease: 'power2.inOut' }, D0 + .78);
  tl.fromTo(pulse2, { left: L2x0, top: PH.cy, opacity: 0 }, { left: L2x1, top: PH.cy, duration: .4, ease: 'power1.inOut', immediateRender: false }, D0 + .8);
  tl.to(pulse2, { opacity: 1, duration: .1 }, D0 + .8);
  tl.to(pulse2, { opacity: 0, duration: .12 }, D0 + 1.12);
  const SUM = D0 + 1.12;  // ≈ 16.5
  gsap.set([rSpark, ...rWords], { opacity: 0 });
  tl.fromTo(rightCard, { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: .7, ease: 'power3.out', immediateRender: false }, SUM - .1);
  tl.fromTo(rSpark, { opacity: 0, scale: .4, rotation: -60 }, { opacity: 1, scale: 1, rotation: 0, duration: .6, ease: 'power3.out', immediateRender: false }, SUM + .1);
  tl.fromTo(rWords, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .5, ease: 'power3.out', stagger: .022, immediateRender: false }, SUM + .14);
  tl.to(pc, { opacity: 1, duration: .5 }, F0 + 2.55);
  tl.fromTo(cloud, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .5, ease: 'power2.out', immediateRender: false }, F0 + 2.6);
  tl.fromTo(offPill, { opacity: 0, scale: .8 }, { opacity: 1, scale: 1, duration: .4, ease: 'power3.out', immediateRender: false }, F0 + 2.75);

  /* ============ E — outro (old 17.45 → 21.1) ============ */
  // the summary card glides to the centre; its lines become the three logo bars
  const O0 = 17.45;
  hF.out(O0);
  tl.to([leftCard, phone, spec1, spec2, conn, cloud, offPill], { opacity: 0, duration: .35, ease: 'power1.in' }, O0);
  // bars live inside the card so they travel with it (card has overflow:hidden)
  const rbars = rLines.map(r => el('div', 'bar', rightCard, { left: px(r.left - rCardRect.left), top: px(r.top - rCardRect.top), width: px(r.width), height: px(r.height), borderRadius: px(r.height / 2), background: '#d9d6ce' }));
  gsap.set(rbars, { scaleX: 0 });
  rbars.forEach((b, i) => tl.to(b, { scaleX: 1, duration: .16, ease: 'power3.inOut' }, O0 + .02 + i * .03));
  tl.to([rSpark, ...rWords], { opacity: 0, duration: .12 }, O0 + .06);
  tl.to(rHead, { opacity: 0, duration: .14 }, O0 + .02);
  const M0 = 17.6, MD = .49;
  const IS2 = 300 * ICON_S0;
  gsap.set(rightCard, { x: 0 });
  tl.to(rightCard, { left: CX - IS2 / 2, top: CY - IS2 / 2, width: IS2, height: IS2, padding: 0, borderRadius: 83 * ICON_S0, backgroundColor: '#4355b9',
    boxShadow: '0 30px 70px rgba(67,85,185,.45), 0 8px 18px rgba(67,85,185,.25)', duration: MD, ease: 'expo.inOut' }, M0);
  const tgt2 = logoBars(IS2 / 2, IS2 / 2, ICON_S0); // card-local
  rbars.forEach((b, i) => tl.to(b, { ...tgt2[Math.min(i, 2)], backgroundColor: '#ffffff', duration: MD - .04, ease: 'expo.inOut' }, M0 + i * .015));
  const SWAP = M0 + MD + .005;
  tl.set(d6, { opacity: 0 }, SWAP);
  tl.set(icon, { opacity: 1, x: CX, y: CY, scale: ICON_S0, rotation: 0, backgroundColor: '#4355b9', boxShadow: '0 30px 70px rgba(67,85,185,.45), 0 8px 18px rgba(67,85,185,.25)' }, SWAP);
  tl.set(ibars, { backgroundColor: '#ffffff' }, SWAP);
  const HIT = 18.1;
  // smooth, non-overshooting expansion — finishes before the next move starts (no overlapping scale tweens)
  const POP = .55;
  tl.fromTo(icon, { scale: ICON_S0 }, { scale: 1, duration: POP, ease: 'power3.out', immediateRender: false }, HIT);
  ring(fxBack, HIT, 150, 900, '#4355b9', 4, 1, 1.1);

  // final lockup
  const wm2 = wordmark(200);
  const L2 = { icon: 214, gap: 50, y: 452 };
  const tot2 = L2.icon + L2.gap + wm2.width;
  const ix2 = CX - tot2 / 2 + L2.icon / 2;
  gsap.set(wm2.w, { x: CX - tot2 / 2 + L2.icon + L2.gap, y: L2.y - wm2.height * 0.54 });
  gsap.set(wm2.cs, { yPercent: 118 });
  const tag2 = tagline(TAG, 606, 62);
  const sub2 = el('div', 'sub', sceneB, { top: '704px', opacity: 0 }, 'Message notifications, summarized.&nbsp;&nbsp;<span style="color:#b3aea3">·</span>&nbsp;&nbsp;For Android');
  const MV = HIT + POP; // 15.05
  tl.to(icon, { x: ix2, y: L2.y, scale: L2.icon / 300, duration: .75, ease: 'power3.inOut' }, MV);
  tl.fromTo(wm2.cs, { yPercent: 118, rotation: 12 }, { yPercent: 0, rotation: 0, duration: .8, ease: 'expo.out', stagger: .045, immediateRender: false }, MV + .52);
  tl.fromTo(tag2.ws, { opacity: 0, y: 50, filter: 'blur(12px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: .7, ease: 'expo.out', stagger: .06, immediateRender: false }, MV + .75);
  tl.fromTo(sub2, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .7, ease: 'power3.out', immediateRender: false }, MV + 1.1);
  // sheen + "summarizing" bar wave
  tl.fromTo(sheenI, { left: '-60%' }, { left: '140%', duration: .8, ease: 'power2.inOut', immediateRender: false }, MV + 1.25);
  tl.to(ibars, { scaleX: .9, duration: .28, ease: 'sine.inOut', stagger: .09, yoyo: true, repeat: 1 }, MV + 1.45);
  const END = HIT + 3.0;

  gsap.set([...marks.flat(), pfill, strike], { scaleX: 0, transformOrigin: '0% 50%' });
  gsap.set([rc1.dot], { scale: 0 });

  /* ============ procedural layer ============ */
  const impulses = []; // no camera shake anywhere
  const ease = {
    inOut: x => -(Math.cos(Math.PI * x) - 1) / 2,
    expoOut: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x),
    outSine: x => Math.sin(x * Math.PI / 2),
  };
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  function seg(t, t0, t1, v0, v1, f) { return v0 + (v1 - v0) * f(clamp((t - t0) / (t1 - t0))); }
  function zoomAt(t) {
    if (t < 4.0) return seg(t, 0.3, 3.3, 1, 1.03, ease.inOut);
    if (t < HIT - .5) return seg(t, 4.0, 5.0, 1.03, 1.0, ease.inOut) + seg(t, 5.0, 13.9, 0, .01, ease.inOut);
    if (t < HIT) return seg(t, HIT - .5, HIT, 1.01, 1.0, ease.inOut);
    return seg(t, HIT + .3, END, 1.0, 1.015, ease.inOut);
  }
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

  function proc(t, tNew) {
    let sx = 0, sy = 0, sr = 0;
    for (const [t0, a, k] of impulses) {
      const dt = t - t0;
      if (dt >= 0 && dt < 1.5) {
        const e = a * (1 - Math.exp(-dt / .012)) * Math.exp(-dt * k); // smooth onset (no one-frame jolt)
        sx += e * Math.sin(dt * 58 + t0 * 7.1); sy += e * Math.cos(dt * 49 + t0 * 3.3); sr += e * .035 * Math.sin(dt * 41 + t0);
      }
    }
    camera.style.transform = `translate(${sx.toFixed(2)}px,${sy.toFixed(2)}px) rotate(${sr.toFixed(3)}deg) scale(${zoomAt(t).toFixed(4)})`;
    // ambient layers run on real (new) time
    const tr = t; t = tNew;
    // grain: new pattern every output frame (60fps)
    const f = Math.round(t * 60);
    grain.style.backgroundImage = `url(assets/grain${f % 6}.png)`;
    grain.style.backgroundPosition = `${Math.floor(hash(f) * 256)}px ${Math.floor(hash(f + 37) * 256)}px`;
    grain.style.opacity = t < 4.8 ? '.5' : '.375';
    // cream blobs drift
    blobs.forEach((b, i) => {
      b.style.transform = `translate(${(Math.sin(t * .35 + i * 1.7) * 35).toFixed(1)}px,${(Math.cos(t * .28 + i * 2.3) * 27.5).toFixed(1)}px)`;
    });
    // dust
    if (t < 5.2) motes.forEach(m => {
      const y = ((m.y - t * m.v * m.z) % 1080 + 1080) % 1080;
      const x = m.x + Math.sin(t * .7 + m.ph) * 14;
      m.e.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
    });
    // download percentage (timeline time)
    const pct = Math.round(clamp((tr - P0) / (P1 - P0)) * 100);
    pTxt.textContent = `Downloading… ${pct}%`;
  }

  // ---- smooth retiming: output time (new) → timeline time (old), monotone cubic (PCHIP) ----
  const KN = [0, 0.6, 2.7, 3.6, 4.8, 5.4, 7.2, 7.8, 9.6, 10.8, 12.0, 13.8, 14.4, 16.8, 17.4, 18.9, 19.8, 24.6, 25.2, 29.4];
  const KO = [0, 0.5, 2.25, 3.0, 4.0, 4.5, 5.72, 6.14, 7.46, 7.94, 8.8, 10.0, 10.55, 12.0, 12.55, 13.45, 14.0, 17.6, 18.1, 21.1];
  const warp = (() => {
    const n = KN.length, h = [], m = [], d = new Array(n);
    for (let i = 0; i < n - 1; i++) { h[i] = KN[i + 1] - KN[i]; m[i] = (KO[i + 1] - KO[i]) / h[i]; }
    d[0] = m[0]; d[n - 1] = m[n - 2];
    for (let i = 1; i < n - 1; i++) {
      if (m[i - 1] * m[i] <= 0) d[i] = 0;
      else { const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; d[i] = (w1 + w2) / (w1 / m[i - 1] + w2 / m[i]); }
    }
    return x => {
      if (x <= KN[0]) return KO[0] + (x - KN[0]) * d[0];
      if (x >= KN[n - 1]) return KO[n - 1] + (x - KN[n - 1]) * d[n - 1];
      let i = 0; while (x > KN[i + 1]) i++;
      const t = (x - KN[i]) / h[i], t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * KO[i] + (t3 - 2 * t2 + t) * h[i] * d[i] + (-2 * t3 + 3 * t2) * KO[i + 1] + (t3 - t2) * h[i] * d[i + 1];
    };
  })();
  window.WARP = warp;
  window.DURATION = KN[KN.length - 1];
  window.renderAt = tNew => { const t = Math.max(0, warp(tNew)); tl.seek(t, false); proc(t, tNew); };
  window.renderAt(0);
}
