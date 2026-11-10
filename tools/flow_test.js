// 通しテスト：はじめて設定 → スライム（チュートリアル）→ PNG出力・読みこみ → よつあし。画面のはみだしも しらべる
// つかいかた：node tools/flow_test.js [--canva]   （スクリーンショットは /tmp か SHOT_DIR に）
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const ROOT = path.resolve(__dirname, '..');
const page_url = 'file://' + path.join(ROOT, process.argv.includes('--canva') ? 'dist/rakugaki_canva.html' : 'index.html');
const SHOT = process.env.SHOT_DIR || '/tmp/rakugaki_shots';
fs.mkdirSync(SHOT, { recursive: true });
let fails = 0; const ok = (c, msg) => { console.log((c ? 'OK   ' : 'FAIL ') + msg); if (!c) fails++; };

(async () => {
  const br = await chromium.launch();
  const pg = await br.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.goto(page_url); await pg.evaluate(() => localStorage.clear()); await pg.reload();
  let n = 0;
  const shot = async name => {
    await pg.screenshot({ path: `${SHOT}/${String(++n).padStart(2, '0')}_${name}.png` });
    // はみだしチェック：画面の外に出た部品・文字が はみだした ボタン
    const bad = await pg.evaluate(() => {
      const st = document.getElementById('stage').getBoundingClientRect(), out = [];
      document.querySelectorAll('#stage *').forEach(e => {
        if (e.closest('svg') && e.tagName !== 'svg') return;
        const r = e.getBoundingClientRect(); if (!r.width || !r.height) return;
        if (r.left < st.left - 1 || r.top < st.top - 1 || r.right > st.right + 1 || r.bottom > st.bottom + 1) out.push('外: ' + e.className + ' ' + (e.textContent || '').slice(0, 12));
        if (e.matches('.btn,.bubble,.box') && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1)) out.push('はみだし: ' + e.className + ' ' + (e.textContent || '').slice(0, 14));
      });
      // ボタンどうしの かぶり
      const bs = [...document.querySelectorAll('#stage .btn')].filter(b => !b.closest('.modal') === !document.querySelector('.modal'));
      for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
        const a = bs[i].getBoundingClientRect(), b = bs[j].getBoundingClientRect();
        if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) out.push('かぶり: ' + bs[i].textContent.slice(0, 8) + ' × ' + bs[j].textContent.slice(0, 8));
      }
      return out;
    });
    ok(!bad.length, `画面 ${name}` + (bad.length ? ' → ' + bad.join(' / ') : ''));
  };
  const tap = async sel => { await pg.click(sel); await pg.waitForTimeout(60); };
  const act = a => tap(`[data-a="${a}"]`);
  const kana = async s => { for (const ch of s) await tap(`.k[data-c="${ch}"]`); };
  // 紙の上を なぞる（紙の座標 0〜1 で 指定）
  const strokeOn = async pts => {
    const r = await pg.evaluate(() => { const b = document.getElementById('cv').getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; });
    const P = pts.map(([x, y]) => [r[0] + x * r[2], r[1] + y * r[3]]);
    await pg.mouse.move(P[0][0], P[0][1]); await pg.mouse.down();
    for (const p of P.slice(1)) await pg.mouse.move(p[0], p[1], { steps: 6 });
    await pg.mouse.up();
  };
  // いまのパーツに 丸を かいて ぬる。関節の丸も 通る（cx,cy,rx,ry は 紙の 0〜1）
  const blob = async (color, cx, cy, rx, ry) => {
    await tap(`.pal:not(.hide) .sw[data-c="${color}"]`); await tap('[data-t="pen"]');
    const pts = []; for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 2; pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
    await strokeOn(pts); await tap('[data-t="fill"]'); await strokeOn([[cx, cy], [cx, cy]]);
  };

  await shot('title');
  await act('go'); await kana('たろう'); await shot('setup_name');
  await act('ok'); await shot('grade'); await tap('[data-g="3"]'); await shot('intro');
  await act('go'); await shot('face'); await tap('[data-f="0"]');
  await shot('draw_empty');
  // かんせいを 早まって おす → 点滅で 教える
  await act('done'); await pg.waitForTimeout(60); await shot('draw_missing');
  await pg.waitForTimeout(2700);
  await blob('#3db66b', 0.5, 0.55, 0.36, 0.36); await shot('draw_body');
  // Ctrl+Z・Ctrl+Y
  const ink = () => pg.evaluate(() => window.RG.ed.hasInk('body'));
  await pg.keyboard.press('Control+z'); await pg.keyboard.press('Control+z');
  ok(!(await ink()), 'Ctrl+Z で もどる');
  await pg.keyboard.press('Control+y'); await pg.keyboard.press('Control+Shift+z');
  ok(await ink(), 'Ctrl+Y・Ctrl+Shift+Z で すすむ');
  // バケツ：近い色の線で かこんだ所だけ ぬれる（プロのいろ：みどり4 の上に みどり5 で かこむ）
  await act('pal');
  await blob('#17e84b', 0.5, 0.55, 0.36, 0.36);
  await tap('.pal:not(.hide) .sw[data-c="#11b039"]'); await tap('[data-t="pen"]');
  { const pts = []; for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 2; pts.push([0.5 + Math.cos(a) * 0.12, 0.6 + Math.sin(a) * 0.12]); } await strokeOn(pts); }
  await tap('.pal:not(.hide) .sw[data-c="#f6cfa6"]'); await tap('[data-t="fill"]'); await strokeOn([[0.5, 0.6], [0.5, 0.6]]);
  const px = await pg.evaluate(() => { const c = window.RG.ed.canvasOf('body').getContext('2d'), g = (x, y) => [...c.getImageData(x, y, 1, 1).data].join(','); return { inside: g(160, 143), outside: g(160, 60), ring: g(160, 143 - 53) }; });
  ok(px.inside === '246,207,166,255' && px.outside === '23,232,75,255', `バケツ：かこんだ中だけ ぬれる（中 ${px.inside}・外 ${px.outside}）`);
  await shot('draw_fill_enclosed'); await act('pal');
  await tap('[data-p="horn"]'); await blob('#f7cc2e', 0.5, 0.6, 0.12, 0.3); await shot('draw_horn');
  await tap('[data-v="1"]'); await shot('draw_gattai'); await tap('[data-v="0"]');
  await act('pal'); await shot('draw_pro'); await act('pal');
  await act('done'); await shot('kumi');
  await tap('[data-d="0,-1"]'); await tap('[data-d="1,0"]'); await act('z'); await shot('kumi_moved'); await act('z');
  await act('next'); await shot('motion'); await tap('[data-i="1"]');
  for (const k of ['attack', 'damage', 'win', 'lose']) { await tap(`[data-k="${k}"]`); await pg.waitForTimeout(250); }
  await shot('motion_lose'); await act('next');
  await pg.keyboard.type('pururin'); await shot('name');
  await pg.keyboard.press('Enter');
  ok(await pg.evaluate(() => window.RG.screen === 'done' && window.RG.app.S.mons[0].name === 'ぷるりん'), 'キーボード（ローマ字）で なまえ入力 → Enter で きまり');
  await shot('done');
  await act('png'); await pg.waitForTimeout(200); await shot('png_modal'); await act('n');
  await act('ok'); await shot('home');
  await act('chars'); await shot('chars'); await tap('[data-a="open"]'); await shot('detail');
  await act('back'); await act('back'); await act('set'); await shot('settings');
  await act('t1'); await act('t2'); await pg.waitForTimeout(100);

  // ---- PNG：そのまま／JPEG／縮小JPEG で 読みなおす ----
  const res = await pg.evaluate(async () => {
    const RG = window.RG, S = RG.app.S, m = S.mons[0], get = pid => RG.app.CACHE[m.id][pid] || null;
    const png = RG.buildMonPNG(m, get), out = {};
    const diff = (a, b) => {   // 透明・不透明の ちがいの割合 と、色の ずれ（不透明な所の平均）
      const da = a.getContext('2d').getImageData(0, 0, a.width, a.height).data, db = b.getContext('2d').getImageData(0, 0, b.width, b.height).data;
      let am = 0, cd = 0, cn = 0, op = 0;
      for (let i = 0; i < da.length; i += 4) {
        const oa = da[i + 3] > 127, ob = db[i + 3] > 127; if (oa) op++;
        if (oa !== ob) am++; else if (oa) { cd += Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]); cn++; }
      }
      return { alphaMiss: am / Math.max(1, op), color: cn ? cd / cn / 3 : 0 };
    };
    const viaImg = url => new Promise(r => { const im = new Image(); im.onload = () => { const c = RG.mkCanvas(im.naturalWidth, im.naturalHeight); c.getContext('2d').drawImage(im, 0, 0); r(c); }; im.src = url; });
    const jpeg = async (scale, q, bg, pad) => {
      const c = RG.mkCanvas(Math.round(1280 * scale) + (pad || 0) * 2, Math.round(720 * scale) + (pad || 0) * 2), x = c.getContext('2d');
      x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height); x.drawImage(png, pad || 0, pad || 0, Math.round(1280 * scale), Math.round(720 * scale));
      return viaImg(c.toDataURL('image/jpeg', q));
    };
    const run = async (name, cv) => {
      try {
        const r = RG.readMonPNG(cv), d = {};
        for (const pid in m.parts) d[pid] = r.parts[pid] ? diff(get(pid), r.parts[pid]) : null;
        out[name] = { blurry: r.blurry, name: r.mon.name, d };
      } catch (e) { out[name] = { err: e.message }; }
    };
    await run('png', await viaImg(png.toDataURL('image/png')));
    await run('jpeg_white', await jpeg(1, 0.8, '#fff'));
    await run('jpeg_black', await jpeg(1, 0.8, '#000'));
    await run('jpeg_small', await jpeg(0.6, 0.7, '#fff'));
    await run('jpeg_padded', await jpeg(0.8, 0.8, '#fff', 30));
    const half = RG.mkCanvas(640, 360); half.getContext('2d').drawImage(png, 0, 0, 640, 360);
    await run('png_half', await viaImg(half.toDataURL('image/png')));
    out.pngUrl = png.toDataURL('image/png'); out.jpgUrl = (await jpeg(0.6, 0.7, '#fff')).toDataURL('image/png');
    out.player = RG.readPlayerPNG(RG.buildPlayerPNG(S.player)).name;
    return out;
  });
  fs.writeFileSync(`${SHOT}/mon.png`, Buffer.from(res.pngUrl.split(',')[1], 'base64'));
  fs.writeFileSync(`${SHOT}/mon_small_jpeg.png`, Buffer.from(res.jpgUrl.split(',')[1], 'base64'));
  ok(res.player === 'たろう', 'プレイヤーPNGの 読みなおし');
  for (const k of ['png', 'jpeg_white', 'jpeg_black', 'jpeg_small', 'jpeg_padded', 'png_half']) {
    const r = res[k];
    if (r.err) { ok(false, `${k}: ${r.err}`); continue; }
    const worstA = Math.max(...Object.values(r.d).map(d => d ? d.alphaMiss : 1)), worstC = Math.max(...Object.values(r.d).map(d => d ? d.color : 99));
    const limA = k === 'png' ? 0 : /small|padded/.test(k) ? 0.10 : 0.05, limC = k === 'png' ? 0.01 : 6;   // 小さい つの では、ふちが 1ピクセル ずれると 約7%
    ok(r.name === 'ぷるりん' && r.blurry === (k !== 'png') && worstA <= limA && worstC <= limC, `${k}: 形のずれ ${(worstA * 100).toFixed(2)}%・色のずれ ${worstC.toFixed(2)}`);
  }

  // ---- ファイルから 読みこむ（うわがき）----
  await act('back'); await act('chars');
  const [fc] = await Promise.all([pg.waitForEvent('filechooser'), act('imp')]);
  await fc.setFiles(`${SHOT}/mon_small_jpeg.png`);
  await pg.waitForSelector('.modal'); await shot('import_overwrite'); await act('y');
  await pg.waitForFunction(() => document.querySelector('.modal .mtext') && document.querySelector('.modal .mtext').textContent.includes('なかま'));
  await shot('import_done'); await act('y'); await shot('chars_after_import');

  // ---- よつあし（ひだりむき）----
  await tap('[data-a="make"]'); await shot('shape'); await tap('[data-s="yotsu"]'); await tap('[data-f="1"]');
  const J = await pg.evaluate(() => { const RG = window.RG, o = {}; RG.usableParts('yotsu').forEach(p => { o[p.id] = { w: p.w, h: p.h }; }); return o; });
  // パーツの中を ほぼ いっぱいに ぬる（関節は かならず 通る）
  for (const [pid, col] of [['body', '#3a6fe0'], ['face', '#e8434b'], ['fore1', '#8e55d0'], ['fore2', '#8e55d0'], ['hind1', '#f59331'], ['hind2', '#f59331'], ['tail', '#3db66b'], ['ear', '#f28bb6']]) {
    await tap(`[data-p="${pid}"]`);
    const b = await pg.evaluate(pid => { const RG = window.RG, p = RG.part('yotsu', pid), s = Math.min(696 / p.w, 516 / p.h); return [p.w * s / 720, p.h * s / 540]; }, pid);
    await blob(col, 0.5, 0.5, b[0] * 0.40, b[1] * 0.40);
    if (pid === 'body') await shot('yotsu_body');
  }
  await tap('[data-v="1"]'); await shot('yotsu_gattai');
  await act('done'); await pg.waitForTimeout(100);
  ok(await pg.evaluate(() => window.RG.screen === 'kumi'), 'よつあし：関節チェックを 通って くみたてへ');
  await shot('yotsu_kumi'); await tap('.kp[data-p="tail"]'); await act('z'); await shot('yotsu_kumi_tail');
  await act('next'); await shot('yotsu_motion'); await act('next'); await kana('わんこ'); await act('ok'); await shot('yotsu_done');
  const st = await pg.evaluate(() => { const RG = window.RG, m = RG.app.S.mons[1]; return { r5: m.r5, face: m.face, bytes: RG.encodeMon(m).length, url: RG.buildMonPNG(m, pid => RG.app.CACHE[m.id][pid] || null).toDataURL() }; });
  fs.writeFileSync(`${SHOT}/yotsu.png`, Buffer.from(st.url.split(',')[1], 'base64'));
  ok(st.face === 1 && st.r5.reduce((a, b) => a + b, 0) === 1000, `よつあし：色の割合 ${st.r5.join(',')}（合計1000）・QR ${st.bytes}バイト`);
  await act('ok'); await shot('chars_two');

  // ---- のこりの 5体形：ぜんぶの パーツを 描いて、くみたて → モーション → PNGの 読みなおし ----
  await pg.evaluate(() => { window.RG.app.S.player.slots = 3; window.RG.app.save(); }); await act('back'); await act('chars');
  let fi = 0;
  for (const shape of ['tori', 'sakana', 'ekitai', 'robot', 'nisoku']) {
    await tap('[data-a="make"]'); await tap(`[data-s="${shape}"]`); await tap(`[data-f="${fi++ % 2}"]`);
    const ids = await pg.evaluate(sh => window.RG.usableParts(sh).map(p => p.id), shape);
    const cols = ['#3a6fe0', '#e8434b', '#8e55d0', '#f59331', '#3db66b', '#f28bb6', '#f7cc2e', '#5ec8ef', '#9a6235', '#9a98a8'];
    for (let i = 0; i < ids.length; i++) {
      await tap(`[data-p="${ids[i]}"]`);
      const b = await pg.evaluate(([sh, pid]) => { const p = window.RG.part(sh, pid), s = Math.min(696 / p.w, 516 / p.h); return [p.w * s / 720, p.h * s / 540]; }, [shape, ids[i]]);
      await blob(cols[i], 0.5, 0.5, b[0] * 0.40, b[1] * 0.40);
    }
    await tap('[data-v="1"]'); await shot(shape + '_gattai');
    await act('done'); await pg.waitForTimeout(100);
    ok(await pg.evaluate(() => window.RG.screen === 'kumi'), `${shape}：パーツ ${ids.length}こ。関節チェックを 通って くみたてへ`);
    await shot(shape + '_kumi'); await act('next');
    await tap('[data-k="attack"]'); await pg.waitForTimeout(300); await shot(shape + '_motion');
    await tap('[data-i="2"]'); await tap('[data-k="lose"]'); await pg.waitForTimeout(200);
    await act('next'); await kana('てすと'); await act('ok'); await shot(shape + '_done');
    const rt = await pg.evaluate(async () => {
      const RG = window.RG, m = RG.app.S.mons[2], get = pid => RG.app.CACHE[m.id][pid] || null, png = RG.buildMonPNG(m, get);
      const im = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = png.toDataURL('image/png'); });
      const c = RG.mkCanvas(1280, 720); c.getContext('2d').drawImage(im, 0, 0);
      const r = RG.readMonPNG(c); let same = !r.blurry && r.mon.shape === m.shape && Object.keys(r.parts).length === Object.keys(m.parts).length;
      for (const pid in r.parts) { const a = get(pid).getContext('2d').getImageData(0, 0, get(pid).width, get(pid).height).data, b = r.parts[pid].getContext('2d').getImageData(0, 0, get(pid).width, get(pid).height).data; for (let i = 0; i < a.length; i += 4) if ((a[i + 3] > 127) !== (b[i + 3] > 127)) { same = false; break; } }
      return { same, bytes: RG.encodeMon(m).length, url: png.toDataURL('image/png') };
    });
    fs.writeFileSync(`${SHOT}/${shape}.png`, Buffer.from(rt.url.split(',')[1], 'base64'));
    ok(rt.same, `${shape}：PNGを 読みなおして 元どおり（QR ${rt.bytes}バイト）`);
    await act('ok'); await tap('[data-a="open"][data-i="2"]'); await act('bye'); await act('y');
  }
  await pg.evaluate(() => { window.RG.app.S.player.slots = 2; window.RG.app.save(); });
  // 再読みこみしても 残っているか
  await pg.reload(); await act('go'); await act('chars');
  ok(await pg.evaluate(() => window.RG.app.S.mons.length === 2), 'セーブ：再読みこみ後も 2たい いる');
  // うみのおや でない人は なおせない
  await pg.evaluate(() => { window.RG.app.S.mons[0].creator.id = 12345; });
  await tap('[data-a="open"]'); ok(await pg.evaluate(() => document.querySelector('[data-a="edit"]').classList.contains('off')), 'うみのおや でないと「なおす」が おせない'); await shot('detail_not_mine');
  ok(!errs.length, 'エラーなし' + (errs.length ? ' → ' + errs.join(' | ') : ''));
  await br.close();
  console.log(fails ? `\n${fails}こ しっぱい` : '\nぜんぶ OK');
  process.exit(fails ? 1 : 0);
})();
