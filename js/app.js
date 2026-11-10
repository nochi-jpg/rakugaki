// ===== 画面（タイトル・はじめて設定・ホーム・キャラクター・つくる・せってい） =====
(function (RG) {
  'use strict';
  const stage = document.getElementById('stage');
  const SAVE_KEY = 'rakugaki_save_v1';
  const mk = RG.mkCanvas;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---- セーブ ----
  let S = { v: 1, player: null, mons: [], se: true };
  const CACHE = {};   // モンスターID → {pid: canvas}
  function load() { try { const t = localStorage.getItem(SAVE_KEY); if (t) { const o = JSON.parse(t); if (o && o.v === 1) S = o; } } catch (e) { } }
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); return true; } catch (e) { toast('ほぞん できなかったよ。PNGで だしておいてね'); return false; } }
  const imgCanvas = url => new Promise(res => { const im = new Image(); im.onload = () => { const c = mk(im.naturalWidth, im.naturalHeight); c.getContext('2d').drawImage(im, 0, 0); res(c); }; im.onerror = () => res(null); im.src = url; });
  async function cacheMon(m) { const o = {}; for (const pid in m.parts) { const c = await imgCanvas(m.parts[pid]); if (c) o[pid] = c; } CACHE[m.id] = o; }
  const getter = m => pid => (CACHE[m.id] || {})[pid] || null;
  const isMine = m => S.player && m.creator.id === S.player.id;

  // ---- 画面の大きさ（16:9 固定。1280×720 を 拡大縮小）----
  function fit() {
    const s = Math.min(innerWidth / 1280, innerHeight / 720);
    stage.style.transform = `translate(${(innerWidth - 1280 * s) / 2}px,${(innerHeight - 720 * s) / 2}px) scale(${s})`;
  }
  addEventListener('resize', fit); addEventListener('orientationchange', fit); fit();

  // ---- おと ----
  let seAudio = null;
  function se() {
    if (!S.se || !RG.ASSETS || !RG.ASSETS.decide) return;
    try { seAudio = seAudio || new Audio(RG.ASSETS.decide); const a = seAudio.cloneNode(); a.volume = 0.5; a.play().catch(() => { }); } catch (e) { }
  }

  // ---- 画面の 切りかえ ----
  let acts = {};
  function show(cls, html, handlers) {
    stage.className = 'scr-' + cls; stage.innerHTML = html; acts = handlers || {}; RG.screen = cls;
  }
  stage.addEventListener('click', async e => {
    const b = e.target.closest('[data-a]'); if (!b || b.disabled || b.classList.contains('off')) return;
    const f = modalActs ? modalActs[b.dataset.a] : acts[b.dataset.a]; if (!f) return;
    se();
    try { await f(b); } catch (err) { console.error(err); toast(err.message || 'うまく いかなかったよ'); }
  });
  // 事故防止（長おしメニュー・ピンチ・ダブルタップ拡大）
  addEventListener('contextmenu', e => { if (!e.target.closest('.savable')) e.preventDefault(); });
  document.addEventListener('gesturestart', e => e.preventDefault());
  let lastTouch = 0; document.addEventListener('touchend', e => { const n = Date.now(); if (n - lastTouch < 320 && !e.target.closest('input')) e.preventDefault(); lastTouch = n; }, { passive: false });
  addEventListener('beforeunload', e => { if (RG.making) { e.preventDefault(); e.returnValue = ''; } });

  // ---- ふきだし・まど ----
  let modalActs = null;
  function modal(html, handlers) {
    closeModal(); const d = document.createElement('div'); d.className = 'modal'; d.innerHTML = `<div class="box mbox">${html}</div>`;
    stage.appendChild(d); modalActs = handlers || {};
  }
  function closeModal() { const m = stage.querySelector('.modal'); if (m) m.remove(); modalActs = null; }
  const ask = (text, yes, no) => new Promise(res => modal(`<p class="mtext">${text}</p><div class="row c"><button class="btn" data-a="n">${no || 'やめる'}</button><button class="btn strong" data-a="y">${yes || 'はい'}</button></div>`, { y() { closeModal(); res(true); }, n() { closeModal(); res(false); } }));
  const tell = text => new Promise(res => modal(`<p class="mtext">${text}</p><div class="row c"><button class="btn strong" data-a="y">わかった</button></div>`, { y() { closeModal(); res(); } }));
  let toastT = 0;
  function toast(text) {
    let t = stage.querySelector('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast box'; stage.appendChild(t); }
    t.textContent = text; clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 2600);
  }
  // えふでちゃん（かりの 線画。あとで K.nom の絵に 入れかえる）
  const EFUDE = `<svg class="efude" viewBox="0 0 100 120"><g fill="#fff" stroke="#111" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M38 8 L62 8 L60 50 L40 50 Z"/><path d="M36 50 L64 50 L66 62 L34 62 Z"/><path d="M34 62 Q28 86 40 100 Q50 116 54 100 Q74 90 66 62 Z"/></g><g fill="#111"><circle cx="43" cy="78" r="3.4"/><circle cx="58" cy="78" r="3.4"/></g><path d="M45 88 Q51 94 57 88" fill="none" stroke="#111" stroke-width="3" stroke-linecap="round"/></svg>`;
  const guide = text => `<div class="guide">${EFUDE}<div class="box bubble" id="hint">${text}</div></div>`;
  const pickFile = () => new Promise(res => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.style.display = 'none';
    i.onchange = () => { res(i.files[0] || null); i.remove(); }; i.oncancel = () => { res(null); i.remove(); }; document.body.appendChild(i); RG.lastInput = i; i.click();
  });
  // PNGを 見せて、ほぞんする
  function showPNG(cv, fname, title) {
    return new Promise(res => {
      modal(`<p class="mtext s">${title}</p><img class="pngview savable" alt=""><p class="note">ほぞん できない ときは、がぞうを ながおし（みぎクリック）して ほぞんしてね</p>
        <div class="row c"><button class="btn" data-a="n">とじる</button><button class="btn strong" data-a="y">ほぞんする</button></div>`,
        { async y() { await RG.download(cv, fname); toast('ほぞんしたよ'); }, n() { closeModal(); res(); } });
      stage.querySelector('.pngview').src = cv.toDataURL('image/png');
    });
  }
  const fileName = m => `rakugaki_${m.name}_${(m.id >>> 0).toString(16)}.png`;

  // ---- かな入力（ひらがな・カタカナのみ）----
  const K_ROWS = ['あかさたなはまやらわ', 'いきしちにひみ　りを', 'うくすつぬふむゆるん', 'えけせてねへめ　れー', 'おこそとのほもよろ　'];
  const DK_A = 'かきくけこさしすせそたちつてとはひふへほう', DK_B = 'がぎぐげござじずぜぞだぢづでどばびぶべぼゔ';
  const HD_A = 'はひふへほ', HD_B = 'ぱぴぷぺぽ', SM_A = 'あいうえおつやゆよわ', SM_B = 'ぁぃぅぇぉっゃゅょゎ';
  const toKata = s => s.replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60));
  const toHira = s => s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
  function kanaHTML(val) {
    return `<div class="namebox box" id="kval"></div><div class="kana">` +
      K_ROWS.map(r => [...r].map(ch => ch === '　' ? '<i></i>' : `<button class="btn k" data-a="k" data-c="${ch}">${ch}</button>`).join('')).join('') +
      `</div><div class="row kctl"><button class="btn" data-a="kmode" id="kmode">カタカナ</button><button class="btn" data-a="kd">゛</button><button class="btn" data-a="kh">゜</button><button class="btn" data-a="ks">ちいさく</button><button class="btn" data-a="kb">けす</button></div>`;
  }
  function kanaActs(K, max) {
    const draw = () => {
      const v = document.getElementById('kval'); v.innerHTML = [...K.val].map(c => `<b>${c}</b>`).join('') + '<u></u>'.repeat(max - [...K.val].length);
      document.querySelectorAll('.k').forEach(b => { b.textContent = K.kata ? toKata(b.dataset.c) : b.dataset.c; });
      document.getElementById('kmode').textContent = K.kata ? 'ひらがな' : 'カタカナ';
      if (K.onChange) K.onChange();
    };
    const swap = (A, B) => {
      if (!K.val) return; const last = K.val.slice(-1), kata = /[ァ-ヶ]/.test(last), h = toHira(last);
      let i = A.indexOf(h), r = i >= 0 ? B[i] : (i = B.indexOf(h)) >= 0 ? A[i] : null;
      if (!r && A === HD_A && (i = 'ばびぶべぼ'.indexOf(h)) >= 0) r = HD_B[i];
      if (!r && A === DK_A && (i = HD_B.indexOf(h)) >= 0) r = 'ばびぶべぼ'[i];
      if (r) { K.val = K.val.slice(0, -1) + (kata ? toKata(r) : r); draw(); }
    };
    setTimeout(draw, 0);
    return {
      k(b) { if ([...K.val].length >= max) return; K.val += K.kata ? toKata(b.dataset.c) : b.dataset.c; draw(); },
      kmode() { K.kata = !K.kata; draw(); }, kd() { swap(DK_A, DK_B); }, kh() { swap(HD_A, HD_B); }, ks() { swap(SM_A, SM_B); },
      kb() { K.val = K.val.slice(0, -1); draw(); },
    };
  }

  // =============== タイトル ===============
  function title() {
    show('title', `<div class="tlogo"><div class="box tl1">らくがき</div><div class="tl2">学習バトル</div></div>
      <div class="col c tbtns"><button class="btn big strong" data-a="go">はじめる</button><button class="btn" data-a="load">データよみこみ</button></div>
      <div class="ver">ver ${RG.VERSION}</div>`, {
      go() { S.player ? home() : setupName(); },
      async load() {
        const f = await pickFile(); if (!f) return;
        const p = RG.readPlayerPNG(await RG.fileToCanvas(f));
        if (S.player && !(await ask(`いまの データ（${esc(S.player.name)}）を「${esc(p.name)}」の データに かえるよ。いい？<br><span class="note">モンスターは そのまま のこるよ</span>`))) return;
        S.player = p; save(); await tell(`「${esc(p.name)}」の データを よみこんだよ。<br><span class="note">モンスターは 1たいずつ PNGから よみこんでね</span>`); home();
      },
    });
  }

  // =============== はじめて設定 ===============
  function setupName() {
    const K = { val: '', kata: false };
    K.onChange = () => { document.getElementById('ok').classList.toggle('off', !K.val); };
    show('setup', guide('はじめまして！ わたしは えふでちゃん。<br>あなたの なまえを おしえてね（6もじまで）') + kanaHTML() + `<button class="btn strong off okbtn" id="ok" data-a="ok">これで きまり</button>`,
      Object.assign(kanaActs(K, 6), { ok() { setupGrade(K.val); } }));
  }
  function setupGrade(name, editing) {
    show('grade', guide(editing ? 'なんねんせいに かえる？' : `${esc(name)}さん、よろしくね！<br>いま なんねんせい？`) +
      `<div class="grades">${[1, 2, 3, 4, 5, 6].map(g => `<button class="btn big g" data-a="g" data-g="${g}">${g}ねんせい</button>`).join('')}</div>` +
      (editing ? `<button class="btn backbtn" data-a="back">もどる</button>` : ''), {
      g(b) {
        const g = +b.dataset.g;
        if (editing) { S.player.grade = g; save(); settings(); return; }
        S.player = { name, id: RG.newId(), grade: g, coins: 0, gems: [], shapes: ['slime'], slots: 1, day: 0, doneA: 0, doneB: 0, bonus: 0, tutorial: false };
        save(); tutorialIntro();
      },
      back() { settings(); },
    });
  }
  function tutorialIntro() {
    show('intro', guide('この せかいでは、じぶんで かいた モンスターが たたかうよ。<br>まずは いっしょに「スライム」を つくってみよう！') +
      `<button class="btn big strong okbtn" data-a="go">つくってみる</button>`, { go() { startMake({ shape: 'slime', tutorial: true }); } });
  }

  // =============== ホーム ===============
  function home() {
    RG.making = false;
    if (S.player && !S.player.tutorial && !S.mons.length) return tutorialIntro();
    show('home', `<div class="hname box">${esc(S.player.name)}　${S.player.grade}ねんせい</div><div class="hcoin box">コイン　${S.player.coins}</div>
      <div class="hbig"><button class="btn huge" data-a="soon"><b>まいにち れんしゅう</b><span>じゅんびちゅう</span></button><button class="btn huge" data-a="soon"><b>ともだちと たいせん</b><span>じゅんびちゅう</span></button></div>
      <div class="hsmall"><button class="btn" data-a="chars">キャラクター</button><button class="btn" data-a="soon">ほうせき</button><button class="btn" data-a="soon">おみせ</button><button class="btn" data-a="set">せってい</button></div>`, {
      chars() { chars(); }, set() { settings(); }, soon() { toast('ここは いま つくっているよ。もうすこし まってね'); },
    });
  }

  // =============== キャラクター ===============
  function chars() {
    RG.making = false;
    const cards = [];
    for (let i = 0; i < 6; i++) {
      const m = S.mons[i];
      if (m) cards.push(`<button class="btn card" data-a="open" data-i="${i}"><canvas width="340" height="190" data-mon="${i}"></canvas><b>${esc(m.name)}</b></button>`);
      else if (i < S.player.slots) cards.push(`<button class="btn card empty" data-a="make"><span class="plus">＋</span><b>つくる</b></button>`);
      else cards.push(`<div class="card locked box"><b>かくちょう</b><span>おみせで かえるよ</span></div>`);
    }
    show('chars', `<h1 class="ttl">キャラクター</h1><button class="btn backbtn" data-a="back">もどる</button>
      <div class="cards">${cards.join('')}</div>
      <div class="row c foot"><button class="btn" data-a="imp">PNGを よみこむ</button><button class="btn" data-a="all">ぜんぶ まとめて だす</button></div>`, {
      back() { home(); }, open(b) { detail(S.mons[+b.dataset.i]); }, make() { pickShape(); }, imp() { importMon(); }, all() { exportAll(); },
    });
    stage.querySelectorAll('canvas[data-mon]').forEach(c => { const m = S.mons[+c.dataset.mon]; RG.drawMon(c.getContext('2d'), m, getter(m), 6, 6, 328, 178, { maxScale: 1 }); });
  }
  async function importMon() {
    const f = await pickFile(); if (!f) return;
    const r = RG.readMonPNG(await RG.fileToCanvas(f)), q = r.mon;
    const old = S.mons.findIndex(m => m.id === q.id);
    if (old >= 0) { if (!(await ask(`「${esc(S.mons[old].name)}」は もう いるよ。うわがき する？`))) return; }
    else if (S.mons.length >= S.player.slots) return tell('わくが いっぱいだよ。<br>どれかを PNGで だしてから にがしてね');
    const m = { id: q.id, name: q.name, shape: q.shape, face: q.face, parts: {}, adj: q.adj, motion: q.motion, gems: [0, 0, 0], r5: q.r5, r4: q.r4, creator: q.creator, grade: q.grade, date: q.date };
    for (const pid in r.parts) m.parts[pid] = r.parts[pid].toDataURL('image/png');
    CACHE[m.id] = r.parts;
    if (old >= 0) S.mons[old] = m; else S.mons.push(m);
    save();
    const notes = [];
    if (r.blurry) notes.push('すこし ぼやけて よみこんだよ');
    if (q.gems.some(g => g)) notes.push('ほうせきは はずれたよ');
    if (!isMine(m)) notes.push(`うみのおやは ${esc(m.creator.name)}さん。えは なおせないよ`);
    await tell(`「${esc(m.name)}」が なかまに なったよ！` + (notes.length ? `<br><span class="note">${notes.join('<br>')}</span>` : ''));
    chars();
  }
  async function exportAll() {
    if (!S.mons.length) return toast('まだ モンスターが いないよ');
    if (!(await ask(`モンスター ${S.mons.length}たい と プレイヤーデータを PNGで だすよ。<br><span class="note">ほぞんの かくにんが でたら「きょか」してね</span>`, 'だす'))) return;
    for (const m of S.mons) { await RG.download(RG.buildMonPNG(m, getter(m)), fileName(m)); await new Promise(r => setTimeout(r, 500)); }
    await RG.download(RG.buildPlayerPNG(S.player), `rakugaki_player_${S.player.name}.png`);
    toast('ぜんぶ だしたよ');
  }
  function statsHTML(m) {
    return `<div class="stats">${RG.stats(m, S.player.grade).map(s => `<div class="st"><span>${s.name}</span><i><em style="width:${Math.min(100, s.v / 10)}%"></em></i><b>${s.v}</b></div>`).join('')}</div>`;
  }
  function detail(m) {
    const mine = isMine(m);
    show('detail', `<h1 class="ttl">${esc(m.name)}</h1><button class="btn backbtn" data-a="back">もどる</button>
      <div class="box dprev"><canvas id="pv" width="560" height="440"></canvas></div>
      <div class="dinfo"><p>${RG.SHAPES[m.shape].name}・${RG.SHAPES[m.shape].motions[m.motion] || ''}</p><p>うみのおや：${esc(m.creator.name)}（${RG.dayStr(m.date)}）</p>${statsHTML(m)}
      <div class="dbtns"><button class="btn${mine ? '' : ' off'}" data-a="edit">なおす</button><button class="btn strong" data-a="png">PNGで だす</button><button class="btn" data-a="bye">にがす</button></div>
      ${mine ? '' : '<p class="note">えを なおせるのは うみのおや だけだよ</p>'}</div>`, {
      back() { chars(); },
      edit() { startMake({ shape: m.shape, edit: m }); },
      async png() { await showPNG(RG.buildMonPNG(m, getter(m)), fileName(m), `「${esc(m.name)}」の PNG`); },
      async bye() {
        if (!(await ask(`「${esc(m.name)}」を にがすよ。もとには もどせないよ。<br><span class="note">さきに PNGで だしておくと、あとで よびだせるよ</span>`, 'にがす'))) return;
        S.mons = S.mons.filter(x => x !== m); delete CACHE[m.id]; save(); chars();
      },
    });
    RG.drawMon(document.getElementById('pv').getContext('2d'), m, getter(m), 10, 10, 540, 420, { maxScale: 1.4 });
  }

  // =============== キャラクターを つくる ===============
  let D = null;   // つくっている とちゅうの データ
  function pickShape() {
    if (S.mons.length >= S.player.slots) return tell('わくが いっぱいだよ');
    show('shape', guide('どの からだに する？') + `<button class="btn backbtn" data-a="back">もどる</button><div class="shapes">` +
      RG.SHAPE_ORDER.map(k => {
        const open = S.player.shapes.includes(k) && RG.SHAPES[k];
        return open ? `<button class="btn shp" data-a="s" data-s="${k}"><b>${RG.SHAPE_NAMES[k]}</b></button>` : `<div class="shp locked box"><b>${RG.SHAPE_NAMES[k]}</b><span>${RG.SHAPES[k] ? 'おみせで かえるよ' : 'じゅんびちゅう'}</span></div>`;
      }).join('') + `</div>`, { back() { chars(); }, s(b) { startMake({ shape: b.dataset.s }); } });
  }
  function startMake(o) {
    const e = o.edit;
    D = { shape: o.shape, tutorial: !!o.tutorial, edit: e || null, face: e ? e.face : 0, adj: e ? JSON.parse(JSON.stringify(e.adj || {})) : {}, motion: e ? e.motion : 0, name: e ? e.name : '', parts: e ? Object.assign({}, CACHE[e.id]) : {} };
    RG.making = true;
    e ? drawScreen() : pickFace();
  }
  function pickFace() {
    show('face', guide('モンスターは どっちを むく？<br>やじるしの ほうへ すすむよ') + (D.tutorial ? '' : `<button class="btn backbtn" data-a="back">もどる</button>`) +
      `<div class="faces"><button class="btn big fc" data-a="f" data-f="1"><span class="arrow">←</span><b>ひだりむき</b></button><button class="btn big fc" data-a="f" data-f="0"><span class="arrow">→</span><b>みぎむき</b></button></div>`,
      { back() { RG.making = false; pickShape(); }, f(b) { D.face = +b.dataset.f; drawScreen(); } });
  }

  // ---- おえかき ----
  function drawScreen() {
    const parts = RG.usableParts(D.shape);
    show('draw', `<div class="dhead">${EFUDE}<div class="box bubble" id="hint"></div><div class="dir box">${D.face ? '← ひだりむき' : 'みぎむき →'}</div><button class="btn" data-a="quit">やめる</button></div>
      <div class="tools box">
        <div class="trow"><button class="btn t on" data-a="tool" data-t="pen">ペン</button><button class="btn t" data-a="tool" data-t="eraser">けしごむ</button><button class="btn t" data-a="tool" data-t="fill">バケツ</button></div>
        <div class="trow">${RG.SIZES.map(([n, px], i) => `<button class="btn t sz${i === 1 ? ' on' : ''}" data-a="size" data-s="${px}"><i style="width:${[6, 12, 22][i]}px;height:${[6, 12, 22][i]}px"></i><span>${n}</span></button>`).join('')}</div>
        <div class="trow"><button class="btn t" data-a="undo" id="bUndo">もどす</button><button class="btn t" data-a="redo" id="bRedo">すすむ</button><button class="btn t" data-a="clear">ぜんけし</button></div>
        <div class="trow two"><button class="btn t" data-a="penonly" id="bPen">ペンだけ</button><button class="btn t" data-a="pal" id="bPal">プロ</button></div>
        <div class="pal simple" id="pal">${RG.COLORS.map(c => `<button class="sw" data-a="col" data-c="${c[1]}" style="background:${c[1]}" aria-label="${c[0]}"></button>`).join('')}</div>
        <div class="pal pro hide" id="palPro">${RG.PRO.map(c => `<button class="sw" data-a="col" data-c="${c[1]}" style="background:${c[1]}" aria-label="${c[0]}"></button>`).join('')}</div>
      </div>
      <div class="paper box"><canvas id="cv"></canvas></div>
      <div class="vrow"><button class="btn t wide on" data-a="view" data-v="0">たんたい</button><button class="btn t wide" data-a="view" data-v="1">がったい</button><button class="btn t wide on" data-a="gd" id="bGd">ガイド：あり</button></div>
      <div class="plist">${parts.map(p => `<button class="btn pt" data-a="part" data-p="${p.id}"><canvas width="100" height="64" data-th="${p.id}"></canvas><b>${p.name}</b><span>${p.req ? 'ひつよう' : 'じゆう'}</span></button>`).join('')}</div>
      <button class="btn strong donebtn" data-a="done">かんせい</button>`, {
      tool(b) { ed.st.tool = b.dataset.t; mark('[data-a=tool]', b); },
      size(b) { ed.st.size = +b.dataset.s; mark('[data-a=size]', b); },
      col(b) { ed.st.color = b.dataset.c; if (ed.st.tool === 'eraser') { ed.st.tool = 'pen'; mark('[data-a=tool]', stage.querySelector('[data-t=pen]')); } mark('.sw', b); },
      undo() { ed.undo(); }, redo() { ed.redo(); },
      async clear() { if (ed.hasInk(ed.cur) && await ask('この パーツを ぜんぶ けすよ。いい？<br><span class="note">「もどす」で もとに もどせるよ</span>', 'けす')) ed.clear(); },
      penonly(b) { ed.st.penOnly = !ed.st.penOnly; b.classList.toggle('on', ed.st.penOnly); },
      pal(b) { const pro = document.getElementById('pal').classList.toggle('hide'); document.getElementById('palPro').classList.toggle('hide', !pro); b.textContent = pro ? 'シンプル' : 'プロ'; },
      view(b) { ed.st.gattai = b.dataset.v === '1'; mark('[data-a=view]', b); ed.render(); },
      gd(b) { ed.st.guide = !ed.st.guide; b.classList.toggle('on', ed.st.guide); b.textContent = ed.st.guide ? 'ガイド：あり' : 'ガイド：なし'; ed.render(); },
      part(b) { ed.select(b.dataset.p); refresh(); },
      async quit() { if (await ask(D.edit ? 'なおすのを やめる？<br><span class="note">かきたした ところは きえるよ</span>' : 'つくるのを やめる？<br><span class="note">かいた えは きえるよ</span>', 'やめる', 'つづける')) { RG.making = false; D.tutorial ? home() : chars(); } },
      done() {
        const miss = ed.check();
        if (miss.length) { ed.blink(miss); refresh(); document.getElementById('hint').textContent = miss[0].text + '（あかく ひかっている ところ）'; return; }
        D.parts = ed.result(); kumi();
      },
    });
    const mark = (sel, b) => { stage.querySelectorAll(sel).forEach(x => x.classList.remove('on')); if (b) b.classList.add('on'); };
    const ed = new RG.Editor(document.getElementById('cv'), { shape: D.shape, face: D.face, adj: D.adj, sources: D.parts, onChange: () => refresh() });
    RG.ed = ed;
    mark('.sw', stage.querySelector('.sw'));
    function refresh() {
      mark('[data-a=part]', stage.querySelector(`[data-p=${ed.cur}]`));
      document.getElementById('bUndo').classList.toggle('off', !ed.canUndo()); document.getElementById('bRedo').classList.toggle('off', !ed.canRedo());
      for (const p of parts) {
        const c = stage.querySelector(`[data-th=${p.id}]`), x = c.getContext('2d'), src = ed.canvasOf(p.id);
        x.clearRect(0, 0, 100, 64); if (src) { const s = Math.min(100 / p.w, 64 / p.h); x.drawImage(src, (100 - p.w * s) / 2, (64 - p.h * s) / 2, p.w * s, p.h * s); }
        c.parentNode.classList.toggle('has', !!src);
      }
      const miss = ed.check(), cur = RG.part(D.shape, ed.cur);
      let t;
      if (!miss.length) t = 'いいね！ できたら「かんせい」を おそう。「がったい」で ぜんたいも みられるよ';
      else if (!ed.hasInk(ed.cur)) t = `「${cur.name}」を かこう。はいいろの てんせんの なかなら、どんな かたちでも いいよ` + (cur.parent || parts.some(c => c.parent === cur.id) ? '。ちゃいろの まるは つなぎめ。まるの なかにも かいてね' : '');
      else { const m = miss.find(x => x.pid === ed.cur) || miss[0]; t = m.text + (m.pid !== ed.cur ? '（みぎの ボタンで パーツを きりかえよう）' : ''); }
      document.getElementById('hint').textContent = t;
    }
    refresh();
  }

  // ---- くみたて ----
  function kumi() {
    const kids = RG.usableParts(D.shape).filter(p => p.parent && D.parts[p.id]);
    let sel = kids[0] ? kids[0].id : null;
    const A = pid => (D.adj[pid] = D.adj[pid] || [0, 0, RG.part(D.shape, pid).z]);
    show('kumi', guide('つなぎめを すこし うごかせるよ。<br>このままで よければ「つぎへ」') + `<button class="btn backbtn" data-a="back">えを なおす</button>
      <div class="box kprev"><canvas id="pv" width="640" height="500"></canvas></div>
      <div class="kside"><div class="klist">${kids.map(p => `<button class="btn t kp" data-a="sel" data-p="${p.id}">${p.name}</button>`).join('')}</div>
        <div class="pad"><button class="btn t" data-a="mv" data-d="0,-1" style="grid-area:u">うえ</button><button class="btn t" data-a="mv" data-d="-1,0" style="grid-area:l">ひだり</button><button class="btn t" data-a="mv" data-d="1,0" style="grid-area:r">みぎ</button><button class="btn t" data-a="mv" data-d="0,1" style="grid-area:d">した</button></div>
        <div class="row"><button class="btn t wide" data-a="z" id="bz"></button><button class="btn t wide" data-a="reset">もとに もどす</button></div>
      </div><button class="btn strong donebtn" data-a="next">つぎへ</button>`, {
      back() { drawScreen(); },
      sel(b) { sel = b.dataset.p; draw(); },
      mv(b) {
        if (!sel) return; const [dx, dy] = b.dataset.d.split(',').map(Number), a = A(sel), M = RG.ADJ_MAX;
        a[0] = Math.max(-M, Math.min(M, a[0] + dx * 2 * (D.face ? -1 : 1))); a[1] = Math.max(-M, Math.min(M, a[1] + dy * 2)); draw();
      },
      z() { if (!sel) return; const a = A(sel); a[2] = a[2] ? 0 : 1; draw(); },
      reset() { if (!sel) return; D.adj[sel] = [0, 0, RG.part(D.shape, sel).z]; draw(); },
      next() { motion(); },
    });
    function draw() {
      const c = document.getElementById('pv'), x = c.getContext('2d'); x.clearRect(0, 0, 640, 500);
      const r = RG.drawMon(x, D, pid => D.parts[pid] || null, 20, 20, 600, 460, { maxScale: 1.6 });
      stage.querySelectorAll('.kp').forEach(b => b.classList.toggle('on', b.dataset.p === sel));
      const bz = document.getElementById('bz');
      if (!sel) { bz.textContent = 'かさなり'; return; }
      const p = RG.part(D.shape, sel), par = RG.part(D.shape, p.parent), a = A(sel);
      bz.textContent = a[2] ? `${par.name}の まえ` : `${par.name}の うしろ`;
      const o = r.L.order.find(q => q.p.id === sel), jx = o.x + p.cj[0], jy = o.y + p.cj[1];
      const sx = r.ox + (D.face ? r.L.x1 - jx : jx - r.L.x0) * r.s, sy = r.oy + (jy - r.L.y0) * r.s;
      x.setLineDash([7, 5]); x.lineWidth = 3; x.strokeStyle = '#8a5a2b'; x.beginPath(); x.arc(sx, sy, RG.JR * r.s, 0, Math.PI * 2); x.stroke(); x.setLineDash([]);
    }
    draw();
  }
  // ---- モーション（うごきは 手順2で つく。いまは えらぶだけ）----
  function motion() {
    const ms = RG.SHAPES[D.shape].motions;
    show('motion', guide('どんな うごきに する？') + `<button class="btn backbtn" data-a="back">もどる</button>
      <div class="box mprev"><canvas id="pv" width="520" height="420"></canvas></div>
      <div class="mlist">${ms.map((n, i) => `<button class="btn big mo${i === D.motion ? ' on' : ''}" data-a="m" data-i="${i}">${n}</button>`).join('')}<p class="note">うごきは つぎの こうしんで つくよ</p></div>
      <button class="btn strong donebtn" data-a="next">つぎへ</button>`, {
      back() { kumi(); }, m(b) { D.motion = +b.dataset.i; stage.querySelectorAll('.mo').forEach(x => x.classList.toggle('on', x === b)); }, next() { nameMon(); },
    });
    RG.drawMon(document.getElementById('pv').getContext('2d'), D, pid => D.parts[pid] || null, 10, 10, 500, 400, { maxScale: 1.4 });
  }
  // ---- なまえ ----
  function nameMon() {
    const K = { val: D.name || '', kata: false };
    K.onChange = () => document.getElementById('ok').classList.toggle('off', !K.val);
    show('setup name', guide('なまえを つけよう（6もじまで）') + `<button class="btn backbtn" data-a="back">もどる</button>` + kanaHTML() + `<button class="btn strong off okbtn" id="ok" data-a="ok">これで きまり</button>`,
      Object.assign(kanaActs(K, 6), { back() { D.name = K.val; motion(); }, ok() { D.name = K.val; finish(); } }));
  }
  function finish() {
    const ratio = RG.colorRatio(Object.values(D.parts)), e = D.edit;
    const m = e || { id: RG.newId(), gems: [0, 0, 0], creator: { name: S.player.name, id: S.player.id }, date: RG.today() };
    Object.assign(m, { name: D.name, shape: D.shape, face: D.face, adj: D.adj, motion: D.motion, r5: ratio.r5, r4: ratio.r4, grade: S.player.grade, parts: {} });
    for (const pid in D.parts) m.parts[pid] = D.parts[pid].toDataURL('image/png');
    CACHE[m.id] = D.parts;
    if (!e) S.mons.push(m);
    const wasTut = D.tutorial; if (wasTut) S.player.tutorial = true;
    save(); RG.making = false; D = null;
    show('done', guide(wasTut ? `「${esc(m.name)}」が うまれたよ！<br>つかった いろで、とくいな きょうかが きまるんだ` : `「${esc(m.name)}」が できたよ！`) +
      `<div class="box dprev"><canvas id="pv" width="560" height="440"></canvas></div>
      <div class="dinfo"><h2>${esc(m.name)}</h2>${statsHTML(m)}<div class="dbtns"><button class="btn" data-a="png">PNGで だす</button><button class="btn strong" data-a="ok">おわる</button></div></div>`, {
      async png() { await showPNG(RG.buildMonPNG(m, getter(m)), fileName(m), `「${esc(m.name)}」の PNG`); }, ok() { wasTut ? home() : chars(); },
    });
    RG.drawMon(document.getElementById('pv').getContext('2d'), m, getter(m), 10, 10, 540, 420, { maxScale: 1.4 });
  }

  // =============== せってい ===============
  function settings() {
    const p = S.player;
    show('settings', `<h1 class="ttl">せってい</h1><button class="btn backbtn" data-a="back">もどる</button>
      <div class="setgrid">
        <div class="box sc"><h3>プレイヤー</h3><p>${esc(p.name)}　${p.grade}ねんせい</p><div class="row"><button class="btn" data-a="grade">がくねんを かえる</button></div></div>
        <div class="box sc"><h3>データ</h3><div class="col"><button class="btn" data-a="pp">プレイヤーデータを PNGで だす</button><button class="btn" data-a="all">ぜんぶ まとめて だす</button></div></div>
        <div class="box sc"><h3>おと</h3><div class="row"><button class="btn" data-a="se">${S.se ? 'こうかおん：あり' : 'こうかおん：なし'}</button></div></div>
        <div class="box sc"><h3>テストよう（あとで けす）</h3><div class="col"><button class="btn" data-a="t1">よつあしを かいきん</button><button class="btn" data-a="t2">わくを 1つ ふやす</button><button class="btn" data-a="t3">データを ぜんぶ けす</button></div></div>
      </div><div class="ver">ver ${RG.VERSION}</div>`, {
      back() { home(); }, grade() { setupGrade(p.name, true); },
      async pp() { await showPNG(RG.buildPlayerPNG(p), `rakugaki_player_${p.name}.png`, 'プレイヤーデータの PNG'); },
      all() { return exportAll(); },
      se() { S.se = !S.se; save(); settings(); },
      t1() { if (!p.shapes.includes('yotsu')) p.shapes.push('yotsu'); save(); toast('よつあしを かいきんしたよ'); },
      t2() { p.slots = Math.min(6, p.slots + 1); save(); toast(`わくが ${p.slots}つに なったよ`); },
      async t3() { if (await ask('データを ぜんぶ けすよ。ほんとうに いい？', 'けす')) { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } S = { v: 1, player: null, mons: [], se: true }; title(); } },
    });
  }

  // ---- はじまり ----
  RG.app = { get S() { return S; }, save, title, home, chars, cacheMon, CACHE };
  (async function () {
    load();
    for (const m of S.mons) await cacheMon(m);
    title();
  })();
})(window.RG);
