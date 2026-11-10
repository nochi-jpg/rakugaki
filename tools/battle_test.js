// バトルの テスト：じゆうパーツ つきの スライムを 作る → CPU戦 → 対人戦。時間は 早送り（RG.timeScale）
// つかいかた：node tools/battle_test.js [--canva]
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const ROOT = path.resolve(__dirname, '..');
const url = 'file://' + path.join(ROOT, process.argv.includes('--canva') ? 'dist/rakugaki_canva.html' : 'index.html');
const SHOT = process.env.SHOT_DIR || '/tmp/rakugaki_shots'; fs.mkdirSync(SHOT, { recursive: true });
let fails = 0; const ok = (c, msg) => { console.log((c ? 'OK   ' : 'FAIL ') + msg); if (!c) fails++; };
(async () => {
  const br = await chromium.launch(), pg = await br.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.goto(url); await pg.evaluate(() => localStorage.clear()); await pg.reload();
  let n = 0;
  const shot = async name => {
    await pg.screenshot({ path: `${SHOT}/b${String(++n).padStart(2, '0')}_${name}.png` });
    const bad = await pg.evaluate(() => {
      const st = document.getElementById('stage').getBoundingClientRect(), out = [];
      document.querySelectorAll('#stage *').forEach(e => {
        if (e.closest('svg') && e.tagName !== 'svg') return;
        const r = e.getBoundingClientRect(); if (!r.width || !r.height || e.closest('.hide')) return;
        if (r.left < st.left - 1 || r.top < st.top - 1 || r.right > st.right + 1 || r.bottom > st.bottom + 1) out.push('外: ' + e.tagName + '#' + e.id + '.' + e.className + ' ' + (e.textContent || '').slice(0, 12) + ' ' + [r.left, r.top, r.right, r.bottom].map(Math.round));
        if (e.matches('.btn,.bubble,.box') && !e.matches('.seek,.qtime') && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1)) out.push('はみだし: ' + e.className + ' ' + (e.textContent || '').slice(0, 14));
      });
      const bs = [...document.querySelectorAll('#stage .btn')].filter(b => !b.closest('.modal') === !document.querySelector('.modal') && !b.closest('.hide'));
      for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
        const a = bs[i].getBoundingClientRect(), b = bs[j].getBoundingClientRect();
        if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) out.push('かぶり: ' + bs[i].textContent.slice(0, 8) + ' × ' + bs[j].textContent.slice(0, 8));
      }
      return out;
    });
    ok(!bad.length, `画面 ${name}` + (bad.length ? ' → ' + bad.join(' / ') : ''));
  };
  const tap = async sel => { await pg.click(sel); await pg.waitForTimeout(50); };
  const act = a => tap(`[data-a="${a}"]`);
  const kana = async s => { for (const ch of s) await tap(`.k[data-c="${ch}"]`); };
  const strokeOn = async (sel, pts) => {
    const r = await pg.evaluate(s => { const b = document.querySelector(s).getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; }, sel);
    const P = pts.map(([x, y]) => [r[0] + x * r[2], r[1] + y * r[3]]);
    await pg.mouse.move(P[0][0], P[0][1]); await pg.mouse.down();
    for (const p of P.slice(1)) await pg.mouse.move(p[0], p[1], { steps: 6 });
    await pg.mouse.up();
  };
  const blob = async (color, cx, cy, rx, ry) => {
    await tap(`.pal:not(.hide) .sw[data-c="${color}"]`); await tap('[data-t="pen"]');
    const pts = []; for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 2; pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
    await strokeOn('#cv', pts); await tap('[data-t="fill"]'); await strokeOn('#cv', [[cx, cy], [cx, cy]]);
  };
  // ---- はじめて設定 → チュートリアルの スライム ----
  await act('go'); await kana('たろう'); await act('ok'); await tap('[data-g="5"]'); await act('go'); await tap('[data-f="0"]');
  await blob('#3a6fe0', 0.5, 0.55, 0.36, 0.36); await tap('[data-p="horn"]'); await blob('#f7cc2e', 0.5, 0.6, 0.12, 0.3);
  ok(await pg.evaluate(() => !document.querySelector('[data-a="addfree"]')), 'じゆうパーツ：なにも 解禁していないと「パーツを たす」は 出ない');
  await act('done'); await act('next'); await act('next'); await kana('すらお'); await act('ok'); await act('ok');
  // ---- ぜんぶ 解禁して、じゆうパーツ つきの スライム ----
  await act('set'); await act('t1'); await act('t2'); await act('back'); await act('chars');
  await tap('[data-a="make"]'); await tap('[data-s="slime"]'); await tap('[data-f="1"]');
  await blob('#e8434b', 0.5, 0.55, 0.38, 0.38); await tap('[data-p="horn"]'); await blob('#f59331', 0.5, 0.6, 0.12, 0.3);
  await act('addfree'); await shot('free_choose'); await tap('.kinds [data-k="1"]');
  await blob('#8e55d0', 0.5, 0.45, 0.14, 0.34); await shot('free_draw');
  await act('addfree'); await tap('.kinds [data-k="4"]'); await blob('#3db66b', 0.55, 0.45, 0.3, 0.2);
  await act('addfree'); await tap('.kinds [data-k="9"]');                       // かかない → くみたてで はずれる
  await tap('[data-v="1"]'); await shot('free_gattai');
  await act('done'); await pg.waitForTimeout(100);
  ok(await pg.evaluate(() => window.RG.screen === 'kumi'), 'じゆうパーツ：くみたてへ');
  // えの 上を なぞって うごかす
  await tap('.kp[data-p="free2"]');
  const before = await pg.evaluate(() => JSON.stringify(window.RG.app.S && 0) || 0);
  await strokeOn('#pv', [[0.5, 0.55], [0.42, 0.5], [0.4, 0.46]]);
  await shot('free_kumi');
  await act('next'); await pg.waitForTimeout(100);
  if (await pg.evaluate(() => !!document.querySelector('.modal'))) { await act('y'); await act('reset'); await act('next'); }
  await tap('[data-k="attack"]'); await pg.waitForTimeout(200); await shot('free_motion');
  await act('next'); await kana('ふりい'); await act('ok');
  const fr = await pg.evaluate(async () => {
    const RG = window.RG, m = RG.app.S.mons[1], get = pid => RG.app.CACHE[m.id][pid] || null, png = RG.buildMonPNG(m, get);
    const im = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = png.toDataURL('image/png'); });
    const c = RG.mkCanvas(1280, 720); c.getContext('2d').drawImage(im, 0, 0);
    const r = RG.readMonPNG(c);
    return { free: JSON.stringify(m.free), back: JSON.stringify(r.mon.free), parts: Object.keys(r.parts).sort().join(','), blurry: r.blurry, url: png.toDataURL('image/png'), bytes: RG.encodeMon(m).length };
  });
  fs.writeFileSync(`${SHOT}/slime_free.png`, Buffer.from(fr.url.split(',')[1], 'base64'));
  ok(fr.free === fr.back && fr.parts === 'body,free1,free2,horn' && !fr.blurry, `じゆうパーツ：PNGを 読みなおして 元どおり（${fr.back}・QR ${fr.bytes}バイト）`);
  await shot('free_done'); await act('ok'); await act('back');

  // ---- CPU戦（時間を 20倍に 早送り）----
  await pg.evaluate(() => { window.RG.timeScale = 20; });
  await act('prac'); await shot('bset');
  await tap('[data-a="mode"][data-v="B"]'); await tap('[data-a="subj"][data-v="1"]'); await tap('[data-a="grade"][data-v="2"]'); await shot('bset_b');
  await tap('[data-a="grade"][data-v="5"]'); await tap('[data-a="mode"][data-v="A"]'); await tap('[data-a="cpu"][data-v="0"]'); await tap('[data-a="mon"][data-v="1"]');
  await act('go');
  await pg.waitForFunction(() => !document.getElementById('qready') && window.RG.battle._q);
  await pg.evaluate(() => { window.RG.timeScale = 1; });
  await shot('solve');
  // 1問 まちがえる → 3びょう まつ
  await pg.evaluate(() => { const q = window.RG.battle._q; document.querySelector(`.qc[data-i="${(q.ans + 1) % 4}"]`).click(); });
  await pg.waitForTimeout(150); await shot('solve_wrong');
  ok(await pg.evaluate(() => !document.getElementById('qlock').classList.contains('hide')), 'まちがえると 3びょう こたえられない');
  await pg.evaluate(() => { window.RG.timeScale = 20; });
  await pg.waitForFunction(() => document.getElementById('qlock') && document.getElementById('qlock').classList.contains('hide'));
  // いろいろな 問題を 出して、文字の はみだしを しらべる
  const over = await pg.evaluate(() => {
    const RG = window.RG, bad = [], tx = document.getElementById('qtext'), box = tx.parentNode, qc = [...document.querySelectorAll('.qc')];
    for (const q of RG.QDB) {
      tx.textContent = q[3]; tx.className = q[3].length > 44 ? 'l3' : q[3].length > 24 ? 'l2' : '';
      if (box.scrollHeight > box.clientHeight + 1 || box.scrollWidth > box.clientWidth + 1) bad.push('問: ' + q[3].slice(0, 20));
      q[4].forEach((c, k) => { const b = qc[k]; b.textContent = c; b.className = 'btn qc' + (c.length > 26 ? ' l3' : c.length > 13 ? ' l2' : ''); if (b.scrollHeight > b.clientHeight + 1 || b.scrollWidth > b.clientWidth + 1) bad.push('選: ' + c.slice(0, 20)); });
    }
    return bad;
  });
  ok(!over.length, `問題 ${await pg.evaluate(() => window.RG.QDB.length)}問：問題文・選択肢が はみださない` + (over.length ? ` → ${over.length}こ：` + over.slice(0, 5).join(' / ') : ''));
  // せいかいを おしつづける
  const answer = async () => { for (;;) { const r = await pg.evaluate(() => { if (window.RG.screen !== 'solve') return 'end'; const q = window.RG.battle._q, b = document.querySelector(`.qc[data-i="${q.ans}"]`); if (b && !document.getElementById('qready')) b.click(); return ''; }); if (r) break; await pg.waitForTimeout(40); } };
  await answer();
  await pg.waitForFunction(() => window.RG.screen === 'watch'); await pg.evaluate(() => { window.RG.timeScale = 3; });
  await pg.waitForTimeout(1500); await shot('watch'); await act('spd');
  await pg.evaluate(() => { window.RG.timeScale = 20; });
  await pg.waitForFunction(() => !document.getElementById('bend').classList.contains('hide'), null, { timeout: 60000 }); await shot('watch_end');
  await pg.waitForFunction(() => window.RG.screen === 'result', null, { timeout: 30000 }); await pg.waitForTimeout(300); await shot('result');
  ok(await pg.evaluate(() => /かち|まけ|ひきわけ/.test(document.querySelector('.rhead').textContent)), 'CPU戦：けっかが 出る（' + await pg.evaluate(() => document.querySelector('.rhead').textContent) + '）');
  await act('home');

  // ---- 対人戦：あいての PNG（おなじ学年）を よみこむ ----
  await act('vs'); await shot('vset');
  const [fc] = await Promise.all([pg.waitForEvent('filechooser'), act('load')]);
  await fc.setFiles(`${SHOT}/slime_free.png`); await pg.waitForSelector('#vf'); await shot('vset_loaded');
  await tap('[data-a="mode"][data-v="B"]'); await act('go');
  await tap('.modal [data-i="0"]'); await shot('vs_subject'); await tap('.modal [data-i="1"]');
  await act('y');                                   // 「まずは 〜の ばん」
  await pg.waitForFunction(() => !document.getElementById('qready') && window.RG.screen === 'solve'); await answer();
  await pg.waitForFunction(() => window.RG.screen === 'pass'); await shot('vs_pass'); await act('go');
  await pg.waitForFunction(() => !document.getElementById('qready') && window.RG.screen === 'solve');
  await pg.evaluate(() => { window.RG.timeScale = 60; });
  await pg.waitForSelector('.modal', { timeout: 30000 }); await act('y');   // 「ふたりで がめんを みよう」
  await pg.waitForFunction(() => window.RG.screen === 'result', null, { timeout: 90000 }); await pg.waitForTimeout(300); await shot('vs_result');
  ok(await pg.evaluate(() => /たろうの かち/.test(document.querySelector('.rhead').textContent)), '対人戦：たくさん こたえた ほうが かつ（' + await pg.evaluate(() => document.querySelector('.rhead').textContent) + '）');
  // 学年が ちがう PNGは ことわる
  await act('home'); await pg.evaluate(() => { window.RG.timeScale = 1; window.RG.app.S.player.grade = 4; });
  await act('vs'); const [fc2] = await Promise.all([pg.waitForEvent('filechooser'), act('load')]);
  await fc2.setFiles(`${SHOT}/slime_free.png`); await pg.waitForSelector('.modal');
  ok(await pg.evaluate(() => document.querySelector('.modal .mtext').textContent.includes('がくねんが ちがう')), '対人戦：学年が ちがうと たいせん できない'); await shot('vs_grade');
  // ダメージの 計算
  const sim = await pg.evaluate(() => { const RG = window.RG, st = [{ v: 1000 }, { v: 0 }]; const r = RG.battle.simulate([{ stats: st, hits: [{ t: 1, s: 0 }, { t: 2, s: 1 }] }, { stats: st, hits: [] }]); return r.events.map(e => e.dmg + (e.crit ? 'c' : '')); });
  ok(/^(120|180c),(80|120c)$/.test(sim.join(',')), 'ダメージ：属性値1000で 120、0で 80（会心は 1.5倍）→ ' + sim.join(','));
  ok(!errs.length, 'エラーなし' + (errs.length ? ' → ' + errs.join(' | ') : ''));
  await br.close(); console.log(fails ? `\n${fails}こ しっぱい` : '\nぜんぶ OK'); process.exit(fails ? 1 : 0);
})();
