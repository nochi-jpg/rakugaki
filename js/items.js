// ===== ほうせき・コイン・1日の ながれ・おみせ（SPEC 8・9） =====
(function (RG) {
  'use strict';
  const UI = RG.ui, stage = UI.stage, esc = UI.esc;
  const I = RG.items = {};
  const S = () => RG.app.S, P = () => RG.app.S.player;

  // ---- ほうせきの しゅるい ----
  // ★ 番号は QRに 入るので 変えない（足すときは うしろに）。price＝おみせの ねだん（100＝きほん、200・300＝上位）
  // fx： s＝教科番号の ならび（ダメージ +v）／hp＝HP +／crit＝かいしんりつ +／cmul＝かいしんの ばいりつ +／def＝うける ダメージ −／back＝HPが 半分以下のとき ダメージ +
  // 同じ こうかを かさねたときは 足し算
  const G = (name, mark, price, fx) => ({ name, mark, price, fx });
  RG.GEMS = {
    1: G('こくごの いし', 'こ', 100, { s: [0], v: 0.10 }),
    2: G('さんすうの いし', 'さ', 100, { s: [1], v: 0.10 }),
    3: G('しゃかいの いし', 'し', 100, { s: [2], v: 0.10 }),
    4: G('りかの いし', 'り', 100, { s: [3], v: 0.10 }),
    5: G('えいごの いし', 'え', 100, { s: [4], v: 0.10 }),
    6: G('たいりょくの いし', 'た', 100, { hp: 0.10 }),
    7: G('かいしんの いし', 'か', 100, { crit: 0.05 }),
    8: G('するどい いし', 'す', 100, { cmul: 0.3 }),
    9: G('まもりの いし', 'ま', 100, { def: 0.08 }),
    11: G('こくごと さんすうの いし', 'こさ', 200, { s: [0, 1], v: 0.10 }),
    12: G('さんすうと りかの いし', 'さり', 200, { s: [1, 3], v: 0.10 }),
    13: G('りかと しゃかいの いし', 'りし', 200, { s: [3, 2], v: 0.10 }),
    14: G('しゃかいと えいごの いし', 'しえ', 200, { s: [2, 4], v: 0.10 }),
    15: G('えいごと こくごの いし', 'えこ', 200, { s: [4, 0], v: 0.10 }),
    16: G('おおきな たいりょくの いし', 'た＋', 200, { hp: 0.20 }),
    17: G('おおきな かいしんの いし', 'か＋', 200, { crit: 0.10 }),
    18: G('にじの いし', 'にじ', 300, { s: [0, 1, 2, 3, 4], v: 0.10 }),
    19: G('おおきな まもりの いし', 'ま＋', 300, { def: 0.15 }),
    20: G('ぎゃくてんの いし', 'ぎ', 300, { back: 0.25 }),
  };
  RG.GEM_MAX = 20;
  const pct = v => Math.round(v * 100) + '%';
  // せつめい文（学年で 教科の よび名が 変わる）
  RG.gemText = function (id, grade) {
    const g = RG.GEMS[id]; if (!g) return '';
    const f = g.fx, names = grade <= 2 ? RG.SUBJ4 : RG.SUBJ5;
    if (f.s) {
      if (f.s.length >= 5) return `ぜんぶの きょうかの ダメージ +${pct(f.v)}`;
      const ok = f.s.filter(i => i < names.length).map(i => names[i]);
      return ok.length ? `${ok.join('・')}の ダメージ +${pct(f.v)}` + (ok.length < f.s.length ? '（えいごは 3ねんせいから）' : '') : 'えいごの ダメージが あがる（3ねんせいから つかえるよ）';
    }
    if (f.hp) return `HP +${pct(f.hp)}`;
    if (f.crit) return `かいしんが でやすく なる（+${pct(f.crit)}）`;
    if (f.cmul) return `かいしんの ダメージが 1.5ばい → ${(1.5 + f.cmul).toFixed(1)}ばい`;
    if (f.def) return `うける ダメージ -${pct(f.def)}`;
    if (f.back) return `HPが はんぶん いかの とき、ダメージ +${pct(f.back)}`;
    return '';
  };
  // 白黒の 手書きの ほうせき（中の 文字で しゅるいが わかる）
  RG.gemIcon = function (id) {
    const g = RG.GEMS[id], m = g ? g.mark : '？', fs = m.length > 1 ? 15 : 22;
    return `<svg class="gem" viewBox="0 0 60 60"><g fill="#fff" stroke="#111" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"><path d="M17 8 L44 7 L55 22 L30 54 L5 23 Z"/><path d="M5 23 L55 22 M17 8 L22 22 L30 54 M44 7 L38 22 L30 54" stroke-width="1.6" fill="none"/></g><rect x="13" y="14" width="34" height="20" rx="6" fill="#fff"/><text x="30" y="${m.length > 1 ? 30 : 32}" text-anchor="middle" font-size="${fs}" fill="#111">${m}</text></svg>`;
  };
  // つけている ほうせき（番号の ならび）の こうかを 足しあわせる
  RG.gemFx = function (list, grade) {
    const n = grade <= 2 ? 4 : 5, fx = { subj: [0, 0, 0, 0, 0], hp: 0, crit: 0, cmul: 0, def: 0, back: 0 };
    for (const id of (list || [])) {
      const g = RG.GEMS[id]; if (!g) continue; const f = g.fx;
      if (f.s) f.s.forEach(i => { if (i < n) fx.subj[i] += f.v; });
      for (const k of ['hp', 'crit', 'cmul', 'def', 'back']) if (f[k]) fx[k] += f[k];
    }
    return fx;
  };

  // ---- もちもの ----
  // p.gems＝もっている ほうせきの 番号の ならび（つけている ものも ふくむ）。m.gems＝そのモンスターが つけている 番号（0＝なし）×3
  // かえり値：p.gems と 同じ ならびで、つけている モンスター（なければ null）
  I.owners = function () {
    const p = P(), own = p.gems.map(() => null);
    for (const m of S().mons) {
      m.gems = [0, 1, 2].map(i => (m.gems && m.gems[i]) || 0);
      m.gems.forEach((g, k) => { if (!g) return; const i = p.gems.findIndex((t, j) => t === g && !own[j]); if (i >= 0) own[i] = m; else m.gems[k] = 0; });   // もっていない ほうせきは はずす
    }
    return own;
  };
  const freeOf = t => { const own = I.owners(); return P().gems.filter((g, i) => g === t && !own[i]).length; };
  // ほうせきを 1こ もらう。20こ いっぱいの ときは どれかを すてる（もらった ものを あきらめても よい）
  I.give = async function (t) {
    const p = P();
    if (p.gems.length < RG.GEM_MAX) { p.gems.push(t); RG.app.save(); return true; }
    const own = I.owners();
    const pick = await new Promise(res => UI.modal(`<p class="mtext s">ほうせきが いっぱい（${RG.GEM_MAX}こ）だよ。<br>「${RG.GEMS[t].name}」を もらうなら、すてる ほうせきを えらんでね</p>
      <div class="gpick">${p.gems.map((g, i) => `<button class="btn gcell${own[i] ? ' eq' : ''}" data-a="p" data-i="${i}" title="${RG.GEMS[g].name}">${RG.gemIcon(g)}</button>`).join('')}</div>
      <div class="row c"><button class="btn" data-a="n">もらわない</button></div>`, { p(b) { UI.closeModal(); res(+b.dataset.i); }, n() { UI.closeModal(); res(-1); } }));
    if (pick < 0) return false;
    await discard(pick, true); p.gems.push(t); RG.app.save(); return true;
  };
  async function discard(i, quiet) {
    const p = P(), own = I.owners(), m = own[i];
    if (m) { const k = m.gems.indexOf(p.gems[i]); if (k >= 0) m.gems[k] = 0; }
    p.gems.splice(i, 1); RG.app.save();
    if (m) await UI.tell('この ほうせきを そうびしている モンスターが いたよ。<br>そうびが はずれたよ');
    else if (!quiet) UI.toast('すてたよ');
  }
  // m の わく k に、番号 t の ほうせきを つける（あいている ものが あるとき）
  I.equip = function (m, k, t) { if (freeOf(t) < 1) return false; m.gems[k] = t; RG.app.save(); return true; };
  I.unequip = function (m, k) { m.gems[k] = 0; RG.app.save(); };
  // キャラクター画面の ほうせきの わく（3つ）
  I.slotsHTML = m => `<div class="gslots"><span>ほうせき</span>${[0, 1, 2].map(k => `<button class="btn gcell" data-a="gslot" data-k="${k}">${m.gems && m.gems[k] ? RG.gemIcon(m.gems[k]) : '<i class="plus2">＋</i>'}</button>`).join('')}</div>`;
  // わくを おした：ついていれば 中身を 見て はずす、あいていれば えらんで つける。かわったら true
  I.slotTap = async function (m, k) {
    I.owners(); const p = P(), cur = m.gems[k];
    if (cur) {
      const off = await new Promise(res => UI.modal(`${RG.gemIcon(cur)}<p class="mtext">${RG.GEMS[cur].name}</p><p class="mtext s">${RG.gemText(cur, p.grade)}</p><div class="row c"><button class="btn" data-a="n">とじる</button><button class="btn strong" data-a="y">はずす</button></div>`, { y() { UI.closeModal(); res(true); }, n() { UI.closeModal(); res(false); } }));
      if (off) I.unequip(m, k); return off;
    }
    const types = [...new Set(p.gems)].filter(t => freeOf(t) > 0).sort((a, b) => a - b);
    if (!types.length) { await UI.tell(p.gems.length ? 'あいている ほうせきが ないよ。<br>ほかの モンスターから はずしてね' : 'まだ ほうせきを もっていないよ。<br>れんしゅうで かつか、おみせで かおう'); return false; }
    const t = await new Promise(res => UI.modal(`<p class="mtext s">どの ほうせきを つける？</p><div class="glist">${types.map(t => `<button class="btn grow" data-a="t" data-t="${t}">${RG.gemIcon(t)}<span><b>${RG.GEMS[t].name}</b><em>${RG.gemText(t, p.grade)}</em></span><u>×${freeOf(t)}</u></button>`).slice(0, 8).join('')}</div>
      ${types.length > 8 ? '<p class="note">ほかの ほうせきは「ほうせき」の がめんから つけられるよ</p>' : ''}<div class="row c"><button class="btn" data-a="n">やめる</button></div>`, { t(b) { UI.closeModal(); res(+b.dataset.t); }, n() { UI.closeModal(); res(0); } }));
    if (!t) return false;
    I.equip(m, k, t); return true;
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
    const p = P(), own = I.owners(); if (gsel >= p.gems.length) gsel = Math.max(0, p.gems.length - 1);
    const cells = []; for (let i = 0; i < RG.GEM_MAX; i++) cells.push(i < p.gems.length ? `<button class="btn gcell big${i === gsel ? ' on' : ''}" data-a="sel" data-i="${i}">${RG.gemIcon(p.gems[i])}<em>${own[i] ? esc(own[i].name) : ''}</em></button>` : '<div class="gcell big none box"></div>');
    const t = p.gems[gsel], m = own[gsel];
    UI.show('gems', `<h1 class="ttl">ほうせき</h1><button class="btn backbtn" data-a="back">もどる</button><div class="gcount box">${p.gems.length} / ${RG.GEM_MAX}</div>
      <div class="ggrid">${cells.join('')}</div>
      <div class="gside box">${t ? `${RG.gemIcon(t)}<h3>${RG.GEMS[t].name}</h3><p>${RG.gemText(t, p.grade)}</p><p class="note">${m ? `「${esc(m.name)}」が つけているよ` : 'だれも つけていないよ'}</p>
        <div class="col"><button class="btn strong" data-a="${m ? 'off' : 'on'}">${m ? 'はずす' : 'モンスターに つける'}</button><button class="btn" data-a="del">すてる</button></div>` : '<p class="gnone">まだ ほうせきを<br>もっていないよ。<br>れんしゅうで かつか、<br>おみせで かおう</p>'}</div>`, {
      back() { UI.home(); }, sel(b) { gsel = +b.dataset.i; I.gemScreen(); },
      off() { const k = m.gems.indexOf(t); if (k >= 0) I.unequip(m, k); I.gemScreen(); },
      async on() {
        const mons = S().mons; if (!mons.length) return UI.tell('さきに モンスターを つくろう');
        const i = await new Promise(res => UI.modal(`<p class="mtext s">どの モンスターに つける？</p><div class="row c wrap">${mons.map((x, i) => `<button class="btn mpick" data-a="m" data-i="${i}"><b>${esc(x.name)}</b><em>${x.gems.filter(g => g).length} / 3</em></button>`).join('')}</div><div class="row c"><button class="btn" data-a="n">やめる</button></div>`, { m(b) { UI.closeModal(); res(+b.dataset.i); }, n() { UI.closeModal(); res(-1); } }));
        if (i < 0) return; const x = mons[i], k = x.gems.indexOf(0);
        if (k < 0) return UI.tell(`「${esc(x.name)}」は もう 3つ つけているよ。<br>さきに どれかを はずしてね`);
        I.equip(x, k, t); I.gemScreen();
      },
      async del() { if (await UI.ask(`「${RG.GEMS[t].name}」を すてるよ。もとには もどせないよ`, 'すてる')) { await discard(gsel); I.gemScreen(); } },
    });
  };

  // =============== おみせ ===============
  const EXPAND_PRICE = [0, 0, 50, 100, 150, 200, 300];   // n わく目の ねだん
  const SHAPE_PRICE = 200;
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const byPrice = (price, grade) => Object.keys(RG.GEMS).map(Number).filter(t => RG.GEMS[t].price === price && !(grade <= 2 && RG.GEMS[t].fx.s && RG.GEMS[t].fx.s.every(i => i >= 4)));
  // ほうせきを 1つ ひく。w200・w300＝上位が 出る 確率
  I.rollGem = function (r, grade, w200, w300) { const x = r(), list = byPrice(x < w300 ? 300 : x < w300 + w200 ? 200 : 100, grade); return list[Math.floor(r() * list.length)]; };
  // きょうの 品ぞろえ（8こ）。日付と プレイヤーで 決まる（開きなおしても 同じ）
  I.stock = function () {
    const p = P(); I.rollDay();
    const r = rng(p.day * 7919 + p.id), gems = []; for (let i = 0; i < 8; i++) gems.push(I.rollGem(r, p.grade, 0.2, 0.05));
    const next = RG.SHAPE_ORDER.find(k => !p.shapes.includes(k));
    const st = gems.map(t => ({ kind: 'gem', t, name: RG.GEMS[t].name, text: RG.gemText(t, p.grade), price: RG.GEMS[t].price }));
    if (p.slots < 6) st[6] = { kind: 'slot', name: 'かくちょう', text: `モンスターの わくが ${p.slots + 1}つに ふえる`, price: EXPAND_PRICE[p.slots + 1] };
    if (next) st[7] = { kind: 'shape', k: next, name: `くみたて「${RG.SHAPE_NAMES[next]}」`, text: `「${RG.SHAPE_NAMES[next]}」の からだを つくれるように なる`, price: SHAPE_PRICE };
    return st;
  };
  const TENSHU = `<svg class="tenshu" viewBox="0 0 200 260"><g fill="#fff" stroke="#111" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M40 250 Q36 150 100 150 Q164 150 160 250 Z"/><path d="M70 190 L130 190 L126 250 L74 250 Z"/><circle cx="100" cy="92" r="58"/><path d="M48 70 Q100 8 152 70 Q100 52 48 70 Z"/></g><g fill="#111"><circle cx="80" cy="96" r="5"/><circle cx="120" cy="96" r="5"/></g><path d="M82 118 Q100 134 118 118" fill="none" stroke="#111" stroke-width="4" stroke-linecap="round"/></svg>`;
  I.shop = function (say) {
    const p = P(), st = I.stock();
    UI.show('shop', `<h1 class="ttl">おみせ</h1><button class="btn backbtn" data-a="back">もどる</button><div class="hcoin box">コイン　${p.coins}</div>
      <div class="skeeper">${TENSHU}<div class="box bubble">${say || 'いらっしゃい！<br>しなものは まいにち かわるよ'}</div></div>
      <div class="sgrid">${st.map((it, i) => {
        const sold = p.bought >> i & 1;
        return `<button class="btn scell${sold ? ' sold' : ''}" data-a="it" data-i="${i}">${it.kind === 'gem' ? RG.gemIcon(it.t) : `<i class="sico">${it.kind === 'slot' ? '＋わく' : esc(RG.SHAPE_NAMES[it.k])}</i>`}<b>${sold ? 'うりきれ' : it.price + 'コイン'}</b></button>`;
      }).join('')}</div>`, {
      back() { UI.home(); },
      async it(b) {
        const i = +b.dataset.i, it = st[i]; if (p.bought >> i & 1) return;
        const buy = await new Promise(res => UI.modal(`${it.kind === 'gem' ? RG.gemIcon(it.t) : ''}<p class="mtext">${it.name}</p><p class="mtext s">${it.text}</p><p class="mtext s">${it.price}コイン（もっている コイン：${p.coins}）</p>
          <div class="row c"><button class="btn" data-a="n">やめる</button><button class="btn strong${p.coins < it.price ? ' off' : ''}" data-a="y">かう</button></div>${p.coins < it.price ? '<p class="note">コインが たりないよ</p>' : ''}`, { y() { UI.closeModal(); res(true); }, n() { UI.closeModal(); res(false); } }));
        if (!buy || p.coins < it.price) return;
        if (it.kind === 'gem') { if (!(await I.give(it.t))) return; }
        else if (it.kind === 'slot') p.slots = Math.min(6, p.slots + 1);
        else if (!p.shapes.includes(it.k)) p.shapes.push(it.k);
        p.coins -= it.price; p.bought |= 1 << i; RG.app.save();
        I.shop(it.kind === 'gem' ? 'まいど あり！<br>「ほうせき」や「キャラクター」で つけてね' : it.kind === 'slot' ? 'まいど あり！<br>モンスターを もう 1たい つくれるよ' : `まいど あり！<br>「${RG.SHAPE_NAMES[it.k]}」を つくってみてね`);
      },
    });
  };
})(window.RG);
