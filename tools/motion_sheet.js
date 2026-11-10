// モーションの コマを ならべた 画像を 作る（見た目の 確認用）。node tools/motion_sheet.js → SHOT_DIR/motion_<体形>.png
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const SHOT = process.env.SHOT_DIR || '/tmp/rakugaki_shots'; fs.mkdirSync(SHOT, { recursive: true });
(async () => {
  const br = await chromium.launch(), pg = await br.newPage();
  await pg.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  const only = process.argv[2];
  for (const [shape, face] of [['yotsu', 0], ['slime', 0], ['yotsu', 1], ['tori', 0], ['sakana', 0], ['ekitai', 0], ['robot', 0], ['nisoku', 0], ['nisoku', 1]].filter(x => !only || x[0] === only)) {
    const url = await pg.evaluate(([shape, face]) => {
      window.RG.isOpen = () => true; const RG = window.RG, pal = ['#e8434b', '#8e55d0', '#6a3fa8', '#f59331', '#c9741f', '#3db66b', '#f28bb6', '#f7cc2e', '#5ec8ef', '#9a6235'], cols = { body: '#3a6fe0', face: '#e8434b', fore1: '#8e55d0', fore2: '#6a3fa8', hind1: '#f59331', hind2: '#c9741f', tail: '#3db66b', ear: '#f28bb6', horn: '#f7cc2e' }, C = {};
      let ci = 0; for (const p of RG.usableParts(shape)) {
        if (!cols[p.id] || (shape !== 'yotsu' && shape !== 'slime')) cols[p.id] = p.parent ? pal[ci++ % pal.length] : '#3a6fe0';
        const c = RG.mkCanvas(p.w, p.h), x = c.getContext('2d'); x.fillStyle = cols[p.id];
        // 関節を 通る だえん（むきに 合わせて うらがえす）
        const js = []; if (p.cj) js.push(p.cj); RG.usableParts(shape).filter(k => k.parent === p.id).forEach(k => js.push(k.pj));
        if (face) { x.translate(p.w, 0); x.scale(-1, 1); }
        if (!p.parent) { x.beginPath(); x.ellipse(p.w / 2, p.h / 2, p.w * 0.44, p.h * 0.36, 0, 0, 7); x.fill(); }
        else { const j = p.cj, cx = p.w / 2, cy = p.h / 2; x.lineCap = 'round'; x.strokeStyle = cols[p.id]; x.lineWidth = Math.min(p.w, p.h) * 0.42; x.beginPath(); x.moveTo(j[0], j[1]); x.lineTo(cx + (cx - j[0]) * 0.5, cy + (cy - j[1]) * 0.5); x.stroke(); }
        if (p.id === 'face' || p.id === 'head' || p.id === 'up') { x.fillStyle = '#fff'; x.beginPath(); x.arc(p.w * 0.66, p.h * 0.42, 14, 0, 7); x.fill(); x.fillStyle = '#111'; x.beginPath(); x.arc(p.w * 0.69, p.h * 0.42, 7, 0, 7); x.fill(); }
        C[p.id] = c;
      }
      const m = { shape, face, adj: {}, motion: 0 }, N = 7, cw = 230, ch = 170, rows = 15;
      const out = RG.mkCanvas(cw * N + 150, ch * rows), o = out.getContext('2d'); o.fillStyle = '#fff'; o.fillRect(0, 0, out.width, out.height);
      let r = 0;
      for (let mo = 0; mo < 3; mo++) for (const a of RG.ACTIONS) {
        const d = RG.motionDur(shape, mo, a) || 1.4;
        o.fillStyle = '#111'; o.font = '18px sans-serif'; o.fillText(RG.SHAPES[shape].motions[mo], 6, r * ch + 70); o.fillText(RG.ACTION_NAMES[a] + ' ' + d + 's', 6, r * ch + 96);
        for (let i = 0; i < N; i++) {
          const bx = 150 + i * cw; o.strokeStyle = '#ddd'; o.strokeRect(bx, r * ch, cw, ch);
          o.save(); o.beginPath(); o.rect(bx, r * ch, cw, ch); o.clip();
          RG.drawMon(o, m, pid => C[pid] || null, bx + cw * (face ? 0.4 : 0.1), r * ch + ch * 0.36, cw * 0.5, ch * 0.6, { pose: RG.pose(shape, mo, a, d * i / (N - 1)) });
          o.restore();
        }
        r++;
      }
      return out.toDataURL('image/png');
    }, [shape, face]);
    fs.writeFileSync(`${SHOT}/motion_${shape}${face ? '_left' : ''}.png`, Buffer.from(url.split(',')[1], 'base64'));
  }
  await br.close(); console.log('できた：' + SHOT);
})();
