// ===== ほうせき・コイン・1日の ながれ・おみせ（SPEC 8・9） =====
(function (RG) {
  'use strict';
  const UI = RG.ui, stage = UI.stage, esc = UI.esc;
  const I = RG.items = {};
  const S = () => RG.app.S, P = () => RG.app.S.player;

  // ---- ほうせき（SPEC 8。ver 0.6.0 で 作りなおし）----
  // ほうせき＝しゅるい（kind）＋ つよさ a（＋1〜＋10）＋ ふたつめの つよさ b（ふくごうの いし だけ）。＋1 で 1%
  // 番号（id）＝ kind×121 ＋ a×11 ＋ b。★ kind の 番号は QRに 入るので 変えない（足すときは うしろに）
  const AB = ['こく', 'さん', 'しゃ', 'りか', 'えい'], FULL = ['こくご', 'さんすう', 'しゃかい', 'りか', 'えいご'], MK = ['こ', 'さ', 'し', 'り', 'え'];
  const KIND = {};
  FULL.forEach((n, i) => { KIND[1 + i] = { type: 's', s: [i], base: n + 'の', mark: MK[i] }; });
  KIND[6] = { type: 'crit', base: 'かいしんの', mark: 'か' };
  KIND[7] = { type: 'hp', base: 'たいりょくの', mark: 'た' };
  KIND[8] = { type: 'def', base: 'まもりの', mark: 'ま' };
  KIND[9] = { type: 'cmul', base: 'するどい', mark: 'す' };
  KIND[10] = { type: 'back', base: 'ぎゃくてんの', mark: 'ぎ' };
  KIND[11] = { type: 'rainbow', base: 'にじの', mark: 'にじ', max: 4 };
  { let k = 12; for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) KIND[k++] = { type: 'ss', s: [i, j], base: AB[i] + AB[j] + 'の', mark: MK[i] + MK[j], two: true }; }   // 国算社理英の順（「さんこく」は ない）
  FULL.forEach((n, i) => { KIND[22 + i] = { type: 'shp', s: [i], base: AB[i] + 'たいの', mark: MK[i] + 'た', two: true }; });
  FULL.forEach((n, i) => { KIND[27 + i] = { type: 'sdef', s: [i], base: AB[i] + 'まもの', mark: MK[i] + 'ま', two: true }; });
  RG.GEM_MAX = 20;
  RG.gemId = (kind, a, b) => kind * 121 + a * 11 + (b || 0);
  // 番号 → 中身。おかしな番号は null
  RG.gem = function (id) {
    const kind = Math.floor(id / 121), a = Math.floor(id % 121 / 11), b = id % 11, K = KIND[kind];
    if (!K || a < 1 || a > (K.max || 10) || (K.two ? b < 1 : b !== 0)) return null;
    const N = RG.SUBJ5, lv = '＋' + a + (K.two ? '＋' + b : '');
    const total = K.type === 'rainbow' ? a * 5 : a + b;         // 合計値（にじは 5教科ぶん）。ねだんと 出やすさを 決める
    const fx = { subj: [0, 0, 0, 0, 0], hp: 0, crit: 0, cmul: 0, def: 0, back: 0 }; let text;
    if (K.type === 's') { fx.subj[K.s[0]] = a / 100; text = `${N[K.s[0]]}の ダメージ +${a}%`; }
    else if (K.type === 'ss') { fx.subj[K.s[0]] = a / 100; fx.subj[K.s[1]] = b / 100; text = `${N[K.s[0]]}の ダメージ +${a}%、${N[K.s[1]]}の ダメージ +${b}%`; }
    else if (K.type === 'shp') { fx.subj[K.s[0]] = a / 100; fx.hp = b / 100; text = `${N[K.s[0]]}の ダメージ +${a}%、HP +${b}%`; }
    else if (K.type === 'sdef') { fx.subj[K.s[0]] = a / 100; fx.def = b / 100; text = `${N[K.s[0]]}の ダメージ +${a}%、うける ダメージ -${b}%`; }
    else if (K.type === 'crit') { fx.crit = a / 100; text = `かいしんが でやすく なる（+${a}%）`; }
    else if (K.type === 'hp') { fx.hp = a / 100; text = `HP +${a}%`; }
    else if (K.type === 'def') { fx.def = a / 100; text = `うける ダメージ -${a}%`; }
    else if (K.type === 'cmul') { fx.cmul = a * 0.03; text = `かいしんの ダメージ 1.5ばい → ${(1.5 + a * 0.03).toFixed(2)}ばい`; }
    else if (K.type === 'back') { fx.back = (10 + a) / 100; text = `HPが はんぶん いかの とき、ダメージ +${10 + a}%`; }
    else { fx.subj = fx.subj.map(() => a / 100); text = `ぜんぶの きょうかの ダメージ +${a}%`; }
    return { id, kind, a, b, name: K.base + ' いし' + lv, mark: K.mark, lv, total, price: total * 50, text, fx };
  };
  RG.gemName = id => { const g = RG.gem(id); return g ? g.name : ''; };
  RG.gemText = id => { const g = RG.gem(id); return g ? g.text : ''; };
  // ほうせきは 3年生から（1・2年生モードでは つかえない）
  RG.gemsOn = () => !!(P() && P().grade >= 3);
  // ---- ほうせきの 色：ふちの 線と 中の 文字だけ 色を つける（中は ぬらない）----
  // 教科は モンスターの 属性と 同じ色（国語＝赤・算数＝青・社会＝黄・理科＝緑・英語＝紫）、ほかは 教科で 使っていない 色
  // 社会の 黄色は 白の 上で 見えにくいので、少し こくした 黄色（#e0aa00）を 使う
  RG.GEM_COLORS = { s: ['#e8434b', '#3a6fe0', '#e0aa00', '#3db66b', '#8e55d0'], hp: '#f28bb6', def: '#9a6235', back: '#9a98a8', crit: '#f59331', cmul: '#5ec8ef' };
  // かえり値：[左の色, 右の色]（1色の いしは おなじ色 2つ。にじは 'rainbow'）
  RG.gemColors = function (id) {
    const g = RG.gem(id); if (!g) return ['#111', '#111'];
    const K = KIND[g.kind], C = RG.GEM_COLORS;
    if (K.type === 'rainbow') return 'rainbow';
    if (K.type === 's') return [C.s[K.s[0]], C.s[K.s[0]]];
    if (K.type === 'ss') return [C.s[K.s[0]], C.s[K.s[1]]];
    if (K.type === 'shp') return [C.s[K.s[0]], C.hp];
    if (K.type === 'sdef') return [C.s[K.s[0]], C.def];
    return [C[K.type], C[K.type]];
  };
  // 手書きの ほうせき。中の ひらがなで しゅるい、下の 数字で つよさが わかる。
  // 2つの こうかが ある いしは、まんなかより 左が 1つめの 色、右が 2つめの 色（文字も 1文字めと 2文字めで 色を かえる）
  let gemUid = 0;
  const GEM_LINE = '<path d="M17 5 L44 4 L55 18 L30 48 L5 19 Z"/><path d="M5 19 L55 18 M17 5 L22 18 L30 48 M44 4 L38 18 L30 48" stroke-width="1.6"/>';
  RG.gemIcon = function (id) {
    const g = RG.gem(id), m = g ? g.mark : '？', two = m.length > 1, fs = two ? 15 : 22, ty = two ? 25 : 27, col = RG.gemColors(id), u = 'gm' + (++gemUid);
    let defs = '', line, text;
    const body = stroke => `<g fill="none" stroke="${stroke}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">${GEM_LINE}</g>`;
    if (col === 'rainbow') {
      const st = RG.GEM_COLORS.s.map((c, i) => `<stop offset="${i * 25}%" stop-color="${c}"/>`).join('');
      defs = `<linearGradient id="${u}" x1="0" y1="0" x2="1" y2="0">${st}</linearGradient>`;
      line = body(`url(#${u})`); text = `<text x="30" y="${ty}" text-anchor="middle" font-size="${fs}" fill="url(#${u})">${m}</text>`;
    } else if (col[0] !== col[1]) {
      defs = `<clipPath id="${u}l"><rect x="0" y="0" width="30" height="50"/></clipPath><clipPath id="${u}r"><rect x="30" y="0" width="30" height="50"/></clipPath>`;
      line = `<g clip-path="url(#${u}l)">${body(col[0])}</g><g clip-path="url(#${u}r)">${body(col[1])}</g>`;
      text = `<text x="30" y="${ty}" text-anchor="middle" font-size="${fs}"><tspan fill="${col[0]}">${m[0]}</tspan><tspan fill="${col[1]}">${m.slice(1)}</tspan></text>`;
    } else { line = body(col[0]); text = `<text x="30" y="${ty}" text-anchor="middle" font-size="${fs}" fill="${col[0]}">${m}</text>`; }
    // 文字の うしろだけ 白くして、ほうせきの 線が 文字に かさならないように する（ほうせきの 中は ぬらない）
    const lv = g ? g.lv : '', lfs = lv.length > 5 ? 11.5 : lv.length > 3 ? 13.5 : 15;
    return `<svg class="gem" viewBox="0 0 60 66"><defs>${defs}</defs>${line}<rect x="13" y="10" width="34" height="19" rx="6" fill="#fff"/>${text}<text x="30" y="64" text-anchor="middle" font-size="${lfs}" fill="#111">${lv}</text></svg>`;
  };
  // つけている ほうせきの こうか。1・2年生は こうかなし
  const NOFX = { subj: [0, 0, 0, 0, 0], hp: 0, crit: 0, cmul: 0, def: 0, back: 0 };
  RG.gemFx = function (id, grade) { const g = grade >= 3 && id ? RG.gem(id) : null; return g ? g.fx : NOFX; };

  // ---- 出やすさ：合計値が 大きいほど 出にくい（20＝0.05、19＝0.1 … 10＝11、9＝12 … 1＝20 の わりあい）----
  const WEIGHT = { 20: 0.05, 19: 0.1, 18: 0.2, 17: 0.4, 16: 0.8, 15: 1.3, 14: 2, 13: 6, 12: 8, 11: 10, 10: 11, 9: 12, 8: 13, 7: 14, 6: 15, 5: 16, 4: 17, 3: 18, 2: 19, 1: 20 };
  const BY_TOTAL = {};
  for (const k in KIND) { const K = KIND[k]; for (let a = 1; a <= (K.max || 10); a++) for (let b = K.two ? 1 : 0; b <= (K.two ? 10 : 0); b++) { const g = RG.gem(RG.gemId(+k, a, b)); (BY_TOTAL[g.total] = BY_TOTAL[g.total] || []).push(g.id); } }
  const WSUM = Object.values(WEIGHT).reduce((x, y) => x + y, 0);
  I.WEIGHT = WEIGHT; I.BY_TOTAL = BY_TOTAL; I.WSUM = WSUM;
  // ほうせきを 1つ ひく（r＝0〜1の 乱数を 返す 関数）。まず 合計値を 決め、その 合計値の いしから 1つ
  I.rollGem = function (r) {
    let x = r() * WSUM, total = 1;
    for (let t = 20; t >= 1; t--) { x -= WEIGHT[t]; if (x < 0) { total = t; break; } }
    const list = BY_TOTAL[total]; return list[Math.floor(r() * list.length)];
  };
  // n回 ひいて、合計値が いちばん 大きいもの（つよい あいてほど いいものが 出やすい）
  I.rollBest = function (r, n) { let best = 0; for (let i = 0; i < n; i++) { const t = I.rollGem(r); if (!best || RG.gem(t).total > RG.gem(best).total) best = t; } return best; };

  // ---- もちもの ----
  // p.gems＝もっている ほうせきの 番号の ならび（つけている ものも ふくむ）。m.gem＝そのモンスターが つけている 番号（0＝なし。1たいに 1つ）
  // かえり値：p.gems と 同じ ならびで、つけている モンスター（なければ null）
  I.owners = function () {
    const p = P(); p.gems = (p.gems || []).filter(t => RG.gem(t));        // 前の 形式の ほうせき（ver 0.5.0）は なくなる
    const own = p.gems.map(() => null);
    for (const m of S().mons) {
      delete m.gems; m.gem = RG.gem(m.gem) ? m.gem : 0;
      if (!m.gem) continue;
      const i = p.gems.findIndex((t, j) => t === m.gem && !own[j]); if (i >= 0) own[i] = m; else m.gem = 0;   // もっていない ほうせきは はずす
    }
    return own;
  };
  const freeOf = t => { const own = I.owners(); return P().gems.filter((g, i) => g === t && !own[i]).length; };
  // ほうせきを 1こ もらう。20こ いっぱいの ときは どれかを すてる（もらった ものを あきらめても よい）
  I.give = async function (t) {
    const p = P();
    if (p.gems.length < RG.GEM_MAX) { p.gems.push(t); RG.app.save(); return true; }
    const own = I.owners();
    const pick = await new Promise(res => UI.modal(`<p class="mtext s">ほうせきが いっぱい（${RG.GEM_MAX}こ）だよ。<br>「${RG.gemName(t)}」を もらうなら、すてる ほうせきを えらんでね</p>
      <div class="gpick">${p.gems.map((g, i) => `<button class="btn gcell${own[i] ? ' eq' : ''}" data-a="p" data-i="${i}" title="${RG.gemName(g)}">${RG.gemIcon(g)}</button>`).join('')}</div>
      <div class="row c"><button class="btn" data-a="n">もらわない</button></div>`, { p(b) { UI.closeModal(); res(+b.dataset.i); }, n() { UI.closeModal(); res(-1); } }));
    if (pick < 0) return false;
    await discard(pick, true); p.gems.push(t); RG.app.save(); return true;
  };
  async function discard(i, quiet) {
    const p = P(), own = I.owners(), m = own[i];
    if (m) m.gem = 0;
    p.gems.splice(i, 1); RG.app.save();
    if (m) await UI.tell('この ほうせきを そうびしている モンスターが いたよ。<br>そうびが はずれたよ');
    else if (!quiet) UI.toast('すてたよ');
  }
  // m に 番号 t の ほうせきを つける（あいている ものが あるとき。前の ほうせきは はずれる）
  I.equip = function (m, t) { if (freeOf(t) < 1) return false; m.gem = t; RG.app.save(); return true; };
  I.unequip = function (m) { m.gem = 0; RG.app.save(); };
  // キャラクター画面の ほうせきの わく（1つ）。1・2年生は 出さない
  I.slotsHTML = m => !RG.gemsOn() ? '' : `<div class="gslots"><span>ほうせき</span><button class="btn gcell" data-a="gslot">${m.gem ? RG.gemIcon(m.gem) : '<i class="plus2">＋</i>'}</button><em>${m.gem ? RG.gemName(m.gem) : 'つけていない'}</em></div>`;
  // わくを おした：ついていれば 中身を 見て はずす、あいていれば えらんで つける。かわったら true
  I.slotTap = async function (m) {
    I.owners(); const p = P(), cur = m.gem;
    if (cur) {
      const off = await new Promise(res => UI.modal(`${RG.gemIcon(cur)}<p class="mtext">${RG.gemName(cur)}</p><p class="mtext s">${RG.gemText(cur)}</p><div class="row c"><button class="btn" data-a="n">とじる</button><button class="btn strong" data-a="y">はずす</button></div>`, { y() { UI.closeModal(); res(true); }, n() { UI.closeModal(); res(false); } }));
      if (off) I.unequip(m); return off;
    }
    const types = [...new Set(p.gems)].filter(t => freeOf(t) > 0).sort((a, b) => a - b);
    if (!types.length) { await UI.tell(p.gems.length ? 'あいている ほうせきが ないよ。<br>ほかの モンスターから はずしてね' : 'まだ ほうせきを もっていないよ。<br>れんしゅうで かつか、おみせで かおう'); return false; }
    const t = await new Promise(res => UI.modal(`<p class="mtext s">どの ほうせきを つける？</p><div class="glist">${types.map(t => `<button class="btn grow" data-a="t" data-t="${t}">${RG.gemIcon(t)}<span><b>${RG.gemName(t)}</b><em>${RG.gemText(t)}</em></span><u>×${freeOf(t)}</u></button>`).slice(0, 8).join('')}</div>
      ${types.length > 8 ? '<p class="note">ほかの ほうせきは「ほうせき」の がめんから つけられるよ</p>' : ''}<div class="row c"><button class="btn" data-a="n">やめる</button></div>`, { t(b) { UI.closeModal(); res(+b.dataset.t); }, n() { UI.closeModal(); res(0); } }));
    if (!t) return false;
    I.equip(m, t); return true;
  };

  // ---- 1日の ながれ ----
  // 日付の 切りかえは 朝5時（その端末の 時計）
  I.dayNow = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000 - 5 * 3600000) / 86400000);
  I.rollDay = function () {
    const p = P(), d = I.dayNow();
    if (p.gems == null) p.gems = [];
    if (p.day !== d) { p.day = d; p.doneA = 0; p.doneB = 0; p.bonus = 0; p.bought = 0; RG.app.save(); }
  };
  // ログインボーナス（1日1回 100コイン）。もらえたら true
  I.loginBonus = function () {
    const p = P(); I.rollDay();
    if (p.bonus || !p.tutorial) return false;
    p.bonus = 1; p.coins += 100; RG.app.save(); return true;
  };
  // きょうの れんしゅうの のこり回数（モードA 1回＋モードB 教科ごとに 1回）
  I.left = function () {
    const p = P(), n = p.grade <= 2 ? 4 : 5; let b = 0; for (let i = 0; i < n; i++) if (!(p.doneB >> i & 1)) b++;
    return (p.doneA ? 0 : 1) + b;
  };

  // =============== ほうせきの がめん ===============
  let gsel = 0;
  I.gemScreen = function () {
    if (!RG.gemsOn()) return UI.tell('ほうせきは 3ねんせいから つかえるよ');
    const p = P(), own = I.owners(); if (gsel >= p.gems.length) gsel = Math.max(0, p.gems.length - 1);
    const cells = []; for (let i = 0; i < RG.GEM_MAX; i++) cells.push(i < p.gems.length ? `<button class="btn gcell big${i === gsel ? ' on' : ''}" data-a="sel" data-i="${i}">${RG.gemIcon(p.gems[i])}<em>${own[i] ? esc(own[i].name) : ''}</em></button>` : '<div class="gcell big none box"></div>');
    const t = p.gems[gsel], m = own[gsel];
    UI.show('gems', `<h1 class="ttl">ほうせき</h1><button class="btn backbtn" data-a="back">もどる</button><div class="gcount box">${p.gems.length} / ${RG.GEM_MAX}</div>
      <div class="ggrid">${cells.join('')}</div>
      <div class="gside box">${t ? `${RG.gemIcon(t)}<h3>${RG.gemName(t)}</h3><p>${RG.gemText(t)}</p><p class="note">${m ? `「${esc(m.name)}」が つけているよ` : 'だれも つけていないよ'}</p>
        <div class="col"><button class="btn strong" data-a="${m ? 'off' : 'on'}">${m ? 'はずす' : 'モンスターに つける'}</button><button class="btn" data-a="del">すてる</button></div>` : '<p class="gnone">まだ ほうせきを<br>もっていないよ。<br>れんしゅうで かつか、<br>おみせで かおう</p>'}</div>`, {
      back() { UI.home(); }, sel(b) { gsel = +b.dataset.i; I.gemScreen(); },
      off() { I.unequip(m); I.gemScreen(); },
      async on() {
        const mons = S().mons; if (!mons.length) return UI.tell('さきに モンスターを つくろう');
        const i = await new Promise(res => UI.modal(`<p class="mtext s">どの モンスターに つける？</p><div class="row c wrap">${mons.map((x, i) => `<button class="btn mpick" data-a="m" data-i="${i}"><b>${esc(x.name)}</b><em>${x.gem ? 'いまの いしと いれかえ' : 'つけていない'}</em></button>`).join('')}</div><div class="row c"><button class="btn" data-a="n">やめる</button></div>`, { m(b) { UI.closeModal(); res(+b.dataset.i); }, n() { UI.closeModal(); res(-1); } }));
        if (i < 0) return; I.equip(mons[i], t); I.gemScreen();
      },
      async del() { if (await UI.ask(`「${RG.gemName(t)}」を すてるよ。もとには もどせないよ`, 'すてる')) { await discard(gsel); I.gemScreen(); } },
    });
  };

  // =============== おみせ ===============
  const EXPAND_PRICE = [0, 0, 50, 100, 150, 200, 300];   // n わく目の ねだん
  const SHAPE_PRICE = 200;
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // きょうの 品ぞろえ。日付と プレイヤーで 決まる（開きなおしても 同じ）。かえり値の i＝わくの番号（買ったかどうかの きろくに 使う）
  // 3年生から：ほうせき6＋かくちょう＋くみたて。1・2年生：かくちょうと くみたて だけ
  I.stock = function () {
    const p = P(); I.rollDay();
    const r = rng(p.day * 7919 + p.id), gems = []; for (let i = 0; i < 8; i++) gems.push(I.rollGem(r));
    const next = RG.SHAPE_ORDER.find(k => !p.shapes.includes(k)), st = [];
    const gemItem = (t, i) => { const g = RG.gem(t); return { i, kind: 'gem', t, name: g.name, text: g.text, price: g.price }; };
    if (RG.gemsOn()) for (let i = 0; i < 6; i++) st.push(gemItem(gems[i], i));
    if (p.slots < 6) st.push({ i: 6, kind: 'slot', name: 'かくちょう', text: `モンスターの わくが ${p.slots + 1}つに ふえる`, price: EXPAND_PRICE[p.slots + 1] });
    else if (RG.gemsOn()) st.push(gemItem(gems[6], 6));
    if (next) st.push({ i: 7, kind: 'shape', k: next, name: `くみたて「${RG.SHAPE_NAMES[next]}」`, text: `「${RG.SHAPE_NAMES[next]}」の からだを つくれるように なる`, price: SHAPE_PRICE });
    else if (RG.gemsOn()) st.push(gemItem(gems[7], 7));
    return st;
  };
  // てんしゅ（K.nom の 線画）。かったときだけ えがお
  const tenshu = smile => `<img class="tenshu" alt="てんしゅ" src="${(RG.ASSETS && RG.ASSETS[smile ? 'tenshuSmile' : 'tenshu']) || ''}">`;
  I.shop = function (say) {
    const p = P(), st = I.stock();
    UI.show('shop', `<h1 class="ttl">おみせ</h1><button class="btn backbtn" data-a="back">もどる</button><div class="hcoin box">コイン　${p.coins}</div>
      <div class="skeeper">${tenshu(!!say)}<div class="box bubble">${say || (st.length ? 'いらっしゃい！<br>しなものは まいにち かわるよ' : 'きょうは もう うるものが ないよ。<br>また きてね')}</div></div>
      <div class="sgrid">${st.map((it, n) => {
        const sold = p.bought >> it.i & 1;
        return `<button class="btn scell${sold ? ' sold' : ''}" data-a="it" data-i="${n}">${it.kind === 'gem' ? RG.gemIcon(it.t) : `<i class="sico">${it.kind === 'slot' ? '＋わく' : esc(RG.SHAPE_NAMES[it.k])}</i>`}<b>${sold ? 'うりきれ' : it.price + 'コイン'}</b></button>`;
      }).join('')}</div>`, {
      back() { UI.home(); },
      async it(b) {
        const it = st[+b.dataset.i], i = it.i; if (p.bought >> i & 1) return;
        const buy = await new Promise(res => UI.modal(`${it.kind === 'gem' ? RG.gemIcon(it.t) : ''}<p class="mtext">${it.name}</p><p class="mtext s">${it.text}</p><p class="mtext s">${it.price}コイン（もっている コイン：${p.coins}）</p>
          <div class="row c"><button class="btn" data-a="n">やめる</button><button class="btn strong${p.coins < it.price ? ' off' : ''}" data-a="y">かう</button></div>${p.coins < it.price ? '<p class="note">コインが たりないよ</p>' : ''}`, { y() { UI.closeModal(); res(true); }, n() { UI.closeModal(); res(false); } }));
        if (!buy || p.coins < it.price) return;
        if (it.kind === 'gem') { if (!(await I.give(it.t))) return; }
        else if (it.kind === 'slot') p.slots = Math.min(6, p.slots + 1);
        else if (!p.shapes.includes(it.k)) p.shapes.push(it.k);
        p.coins -= it.price; p.bought |= 1 << i; RG.app.save();
        I.shop(it.kind === 'gem' ? 'まいど あり～！<br>「ほうせき」や「キャラクター」で つけてね' : it.kind === 'slot' ? 'まいど あり～！<br>モンスターを もう 1たい つくれるよ' : `まいど あり～！<br>「${RG.SHAPE_NAMES[it.k]}」を つくってみてね`);
      },
    });
  };
})(window.RG);
