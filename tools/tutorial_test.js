// チュートリアルの テスト：会話と アニメーションを 止めずに、さいしょの おはなし → スライムづくり → ホームの ガイド → おみせ → はじめての バトルの せつめい
// つかいかた：node tools/tutorial_test.js [--canva]
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
  const shot = n => pg.screenshot({ path: `${SHOT}/t_${n}.png` });
  const click = async (x, y) => { await pg.mouse.click(x, y); await pg.waitForTimeout(120); };
  const has = sel => pg.evaluate(s => !!document.querySelector(s), sel);
  // 会話・ガイドを さいごまで おくる。おした 回数を かえす
  // 会話の 文が まどの 下から はみださないかも しらべる（おした あとは 文が ぜんぶ 出ている）
  const talkOver = [];
  const overTalk = () => pg.evaluate(() => { const b = document.querySelector('.talk .talkbox'), p = document.getElementById('tkt'); if (!b || !p || !p.textContent) return ''; const pb = p.getBoundingClientRect().bottom, bb = b.getBoundingClientRect().bottom; return pb > bb - 8 ? p.textContent.slice(0, 16) : ''; });
  const skip = async sel => { let n = 0; while (await has(sel) && n < 30) { const o = await overTalk(); if (o) talkOver.push(o); await click(640, 330); n++; } return n; };
  await pg.waitForTimeout(1500); await shot('title');
  ok(!(await pg.evaluate(() => !!document.querySelector('[data-a="load"]'))), 'タイトル：データの 復元ボタンは ふだんは 出ない');
  ok(await pg.evaluate(() => document.fonts.check('30px cinecaption')), 'フォント「しねきゃぷしょん」が 読みこまれている');
  ok(await pg.evaluate(() => { const A = window.RG.ASSETS; return Object.keys(A.se).length >= 14 && Object.keys(A.img).length === 12 && document.querySelector('.tlogo').naturalWidth === 760; }), '効果音 14こ・絵 12まい（ロゴも）が うめこまれている');
  await pg.hover('[data-a="go"]'); await pg.waitForTimeout(250); await shot('title_hover');
  await pg.click('[data-a="go"]'); await pg.waitForTimeout(1500);
  ok(await has('.talk'), 'さいしょの おはなし：えふでの 会話が 出る'); await shot('story1');
  const bgm = () => pg.evaluate(() => window.RG.chip.playing + ':' + window.RG.chip.count);
  const b0 = await bgm(); await pg.waitForTimeout(700); const b1 = await bgm();
  ok(await pg.evaluate(() => window.RG.chip.check().length === 0), 'BGM：9きょくの 譜面の 長さが 合っている');
  ok(b0.startsWith('story:') && +b1.split(':')[1] > +b0.split(':')[1], `BGM：おはなしの きょくが 鳴りつづける（${b0} → ${b1}）`);
  await click(640, 330); await pg.waitForTimeout(1300); await shot('story2');
  const n1 = await skip('.talk'); await pg.waitForTimeout(600);
  ok(n1 >= 5 && await pg.evaluate(() => window.RG.screen === 'setup'), `おはなしを おくると なまえの 入力へ（${n1}回 おした）`); await shot('name');
  await pg.keyboard.type('yuu'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(600); await shot('grade');
  await pg.click('[data-g="4"]'); await pg.waitForTimeout(700); await shot('kana_mode');
  await pg.click('[data-a="k"][data-v="1"]'); await pg.waitForTimeout(700);
  ok(await pg.evaluate(() => window.RG.app.S.kana === true), 'はじめに「ひらがなモード」を えらべる'); await shot('intro');
  await pg.click('[data-a="go"]'); await pg.waitForTimeout(500); await pg.click('[data-f="0"]'); await pg.waitForTimeout(900);
  ok(await has('.coach .ring'), 'おえかき：はじめては ガイド（かこみ）が 出る'); await shot('coach1');
  await click(640, 360); await pg.waitForTimeout(250); await shot('coach2');
  ok(await pg.evaluate(() => document.getElementById('cct').textContent.includes('「め」')), 'おえかきの ガイド：2つめで「め」を かくように 言う');
  const n2 = 1 + await skip('.coach'); ok(n2 === 6, `ガイドは 6つ（${n2}）`);
  ok(await pg.evaluate(() => document.getElementById('hint').textContent.includes('「め」')), 'おえかき：からだを かく ときの ひとことにも「め」');
  const r = await pg.evaluate(() => { const b = document.getElementById('cv').getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; });
  const blob = async (col, cx, cy, rx, ry) => {
    await pg.click(`.pal:not(.hide) .sw[data-c="${col}"]`); await pg.click('[data-t="pen"]');
    const P = []; for (let i = 0; i <= 24; i++) { const a = i / 24 * 6.2832; P.push([r[0] + (cx + Math.cos(a) * rx) * r[2], r[1] + (cy + Math.sin(a) * ry) * r[3]]); }
    await pg.mouse.move(P[0][0], P[0][1]); await pg.mouse.down(); for (const p of P) await pg.mouse.move(p[0], p[1], { steps: 4 }); await pg.mouse.up();
    await pg.click('[data-t="fill"]'); await pg.mouse.click(r[0] + cx * r[2], r[1] + cy * r[3]);
  };
  await blob('#5ec8ef', 0.5, 0.55, 0.36, 0.36); await pg.click('[data-p="horn"]'); await blob('#e8434b', 0.5, 0.6, 0.12, 0.3);
  await pg.waitForTimeout(300); await shot('draw');
  await pg.click('[data-a="done"]'); await pg.waitForTimeout(900); ok(await has('.talk'), 'くみたて：はじめては せつめいが 出る'); await shot('kumi_talk'); await skip('.talk');
  await pg.click('[data-a="next"]'); await pg.waitForTimeout(900); await shot('motion_talk'); await skip('.talk');
  await pg.click('[data-k="attack"]'); await pg.waitForTimeout(350); await shot('motion');
  await pg.click('[data-a="next"]'); await pg.waitForTimeout(500); await pg.keyboard.type('mizuo'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(1500);
  ok(await has('.talk'), 'かんせい：えふでが いろと きょうかの はなしを する'); await shot('done_talk'); await skip('.talk'); await pg.waitForTimeout(300); await shot('done');
  await pg.click('[data-a="ok"]'); await pg.waitForTimeout(1000);
  ok(await has('.coach') && await pg.evaluate(() => window.RG.screen === 'home'), 'ホーム：はじめては ガイドが 出る'); await shot('home_coach');
  await skip('.coach'); await pg.waitForTimeout(500); await shot('home');
  ok((await bgm()).startsWith('home:'), 'BGM：ホームの きょく');
  await pg.hover('[data-a="chars"]'); await pg.waitForTimeout(200); await shot('home_hover');
  ok(await pg.evaluate(() => { const b = document.querySelector('[data-a="chars"]'); return getComputedStyle(b).transform !== 'none'; }), 'ボタンに カーソルを のせると うごく');
  await pg.click('[data-a="shop"]'); await pg.waitForTimeout(1500);
  ok(await has('.talk.nochar'), 'おみせ：はじめては てんしゅが じこしょうかい する'); await shot('shop_talk'); await skip('.talk');
  ok((await bgm()).startsWith('shop:'), 'BGM：おみせの きょく');
  await pg.click('[data-a="back"]'); await pg.waitForTimeout(300); await pg.click('[data-a="prac"]'); await pg.waitForTimeout(700); await shot('bset');
  await pg.click('[data-a="go"]'); await pg.waitForTimeout(1200);
  ok(await has('.talk'), 'はじめての バトル：あそびかたの せつめいが 出る'); await shot('battle_talk'); await skip('.talk');
  await pg.waitForTimeout(1200); await shot('ready'); await pg.waitForFunction(() => !document.getElementById('qready')); await pg.waitForTimeout(300); await shot('solve');
  ok((await bgm()).startsWith('solve:'), 'BGM：もんだいの きょく');
  // くりかえし：かち（イントロ 2小節＋4小節）を 早送りせずに 12びょう 鳴らして、音が とぎれない
  const lp = await pg.evaluate(async () => { const C = window.RG.chip; window.RG.ui.bgm(null); window.RG.ui.bgm('win'); const c0 = C.count; await new Promise(r => setTimeout(r, 6000)); const c1 = C.count; await new Promise(r => setTimeout(r, 6000)); return [C.playing, c1 - c0, C.count - c1]; });
  ok(lp[0] === 'win' && lp[1] > 40 && lp[2] > 40, `BGM：くりかえして 鳴りつづける（6びょうごとの 音の数 ${lp[1]}・${lp[2]}）`);
  await pg.evaluate(() => { window.RG.app.S.bgm = false; window.RG.ui.bgmRefresh(); }); ok((await bgm()).startsWith('null'), 'BGM：せっていで「なし」に すると 止まる');
  await pg.evaluate(() => { window.RG.app.S.bgm = true; window.RG.ui.bgmRefresh(); });
  // 2回めは 出ない
  await pg.evaluate(() => window.RG.ui.home()); await pg.waitForTimeout(600);
  ok(!(await has('.coach')) && !(await has('.talk')), '2回めの ホームでは ガイドは 出ない');
  ok(!errs.length, 'エラーなし' + (errs.length ? ' → ' + errs.join(' | ') : ''));
  ok(talkOver.length === 0, '会話の 文が まどから はみださない' + (talkOver.length ? '：' + [...new Set(talkOver)].join(' / ') : ''));
  await br.close(); console.log(fails ? `\n${fails}こ しっぱい` : '\nぜんぶ OK'); process.exit(fails ? 1 : 0);
})();
