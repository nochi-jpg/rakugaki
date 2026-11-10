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
  RG.isOpen = k => !!(S.player && S.player.shapes.includes(k));

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

  // おえかき中の キーボード：Ctrl+Z＝もどす、Ctrl+Y・Ctrl+Shift+Z＝すすむ
  addEventListener('keydown', e => {
    if (RG.screen !== 'draw' || !RG.ed || stage.querySelector('.modal') || !(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); RG.ed.undo(); }
    else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); RG.ed.redo(); }
  });

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

  // ---- アイコン（お絵描きリレーと 同じ 線画）----
  const svg = (d, w) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2.4}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const IC = {
    pen: svg('<path d="M4 20l1.2-4.6L16 4.6a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8z"/><path d="M14 6.6l3.4 3.4"/>'),
    eraser: svg('<path d="M8.5 20H20"/><path d="M5.2 15.8l9.6-9.6a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8L12 19.1a3 3 0 0 1-4.2 0l-2.6-2.6a.5.5 0 0 1 0-.7z"/><path d="M9.5 11.5l5 5"/>'),
    fill: svg('<path d="M10.2 3.8l8 8-6.6 6.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8z"/><path d="M4.2 11.6h13.6"/><path d="M8 5.6L6.2 3.8"/><path d="M20.5 15.5c.9 1.3 1.4 2.2 1.4 2.9a1.4 1.4 0 0 1-2.8 0c0-.7.5-1.6 1.4-2.9z"/>'),
    undo: svg('<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>', 2.6),
    redo: svg('<path d="M15 14l5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>', 2.6),
    clear: svg('<path d="M4 7h16"/><path d="M9 7V4.5h6V7"/><path d="M6.5 7l1 13h9l1-13"/><path d="M10 11v5.5M14 11v5.5"/>'),
    penonly: svg('<path d="M12 3v11"/><path d="M9 14h6l-3 7z"/><path d="M9.5 3h5"/>'),
    pal: svg('<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 2-1 1.6-2.1-.5-1.3.3-2.4 1.7-2.4h1.9a3.3 3.3 0 0 0 3.3-3.3C20.500 7.600 16.700 3.500 12 3.500z"/><circle cx="8" cy="11" r=".9"/><circle cx="11" cy="7.500" r=".9"/><circle cx="15.500" cy="8.500" r=".9"/>'),
    single: svg('<rect x="6" y="6" width="12" height="12" rx="2"/>'),
    multi: svg('<rect x="3.500" y="9" width="8" height="8" rx="1.500"/><rect x="12.500" y="5" width="8" height="8" rx="1.500"/><path d="M11.500 12h1"/>'),
    guide: svg('<rect x="4" y="4" width="16" height="16" rx="3" stroke-dasharray="3 3"/><circle cx="12" cy="12" r="3"/>'),
  };

  // ---- かな入力（ひらがな・カタカナのみ。画面のボタンでも キーボードでも）----
  // ローマ字 → かな（日本語入力が オフのとき用）
  const ROMA = (() => {
    const t = { a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お', '-': 'ー', nn: 'ん', wa: 'わ', wo: 'を', ya: 'や', yu: 'ゆ', yo: 'よ', shi: 'し', chi: 'ち', tsu: 'つ', fu: 'ふ', ji: 'じ', vu: 'ゔ',
      sha: 'しゃ', shu: 'しゅ', sho: 'しょ', cha: 'ちゃ', chu: 'ちゅ', cho: 'ちょ', ja: 'じゃ', ju: 'じゅ', jo: 'じょ',
      xa: 'ぁ', xi: 'ぃ', xu: 'ぅ', xe: 'ぇ', xo: 'ぉ', la: 'ぁ', li: 'ぃ', lu: 'ぅ', le: 'ぇ', lo: 'ぉ', xtu: 'っ', ltu: 'っ', xya: 'ゃ', xyu: 'ゅ', xyo: 'ょ' };
    const rows = { k: 'かきくけこ', s: 'さしすせそ', t: 'たちつてと', n: 'なにぬねの', h: 'はひふへほ', m: 'まみむめも', r: 'らりるれろ', g: 'がぎぐげご', z: 'ざじずぜぞ', d: 'だぢづでど', b: 'ばびぶべぼ', p: 'ぱぴぷぺぽ' };
    for (const c in rows) { [...'aiueo'].forEach((v, i) => { t[c + v] = rows[c][i]; }); [['a', 'ゃ'], ['u', 'ゅ'], ['o', 'ょ']].forEach(([v, y]) => { t[c + 'y' + v] = rows[c][1] + y; }); }
    return t;
  })();
  // 入力された文字を ひらがな・カタカナ だけに する。さいごの 打ちかけの ローマ字は のこす
  function kanaFilter(raw, kata) {
    let out = '', i = 0; const str = raw.toLowerCase().replace(/[Ａ-Ｚａ-ｚ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/[ｰ－―‐]/g, 'ー');
    const conv = k => (kata ? toKata(k) : k);
    while (i < str.length) {
      const c = str[i];
      if (/[ぁ-ゖァ-ヶー]/.test(c)) { out += c; i++; continue; }
      if (!/[a-z\-]/.test(c)) { i++; continue; }
      let hit = false;
      for (const n of [3, 2, 1]) { const k = ROMA[str.substr(i, n)]; if (k && str.substr(i, n).length === n) { out += conv(k); i += n; hit = true; break; } }
      if (hit) continue;
      const nx = str[i + 1];
      if (c === 'n' && nx && !/[aiueoyn]/.test(nx)) { out += conv('ん'); i++; continue; }
      if (nx && c === nx && /[kstnhmrgzdbpcjfwy]/.test(c) && c !== 'n') { out += conv('っ'); i++; continue; }
      // 打ちかけ（つづきが まだ ない）は のこす。つづきが あるのに かなに ならない文字は すてる
      const rest = str.slice(i); if (/^[a-z]{1,3}$/.test(rest)) return { kana: out, pend: rest };
      i++;
    }
    return { kana: out, pend: '' };
  }
  const K_ROWS = ['あかさたなはまやらわ', 'いきしちにひみ　りを', 'うくすつぬふむゆるん', 'えけせてねへめ　れー', 'おこそとのほもよろ　'];
  const DK_A = 'かきくけこさしすせそたちつてとはひふへほう', DK_B = 'がぎぐげござじずぜぞだぢづでどばびぶべぼゔ';
  const HD_A = 'はひふへほ', HD_B = 'ぱぴぷぺぽ', SM_A = 'あいうえおつやゆよわ', SM_B = 'ぁぃぅぇぉっゃゅょゎ';
  const toKata = s => s.replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60));
  const toHira = s => s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
  function kanaHTML(val) {
    return `<div class="namebox box"><input id="kin" type="text" inputmode="kana" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="なまえ"></div><div class="kana">` +
      K_ROWS.map(r => [...r].map(ch => ch === '　' ? '<i></i>' : `<button class="btn k" data-a="k" data-c="${ch}">${ch}</button>`).join('')).join('') +
      `</div><div class="row kctl"><button class="btn" data-a="kmode" id="kmode">カタカナ</button><button class="btn" data-a="kd">゛</button><button class="btn" data-a="kh">゜</button><button class="btn" data-a="ks">ちいさく</button><button class="btn" data-a="kb">けす</button></div>`;
  }
  function kanaActs(K, max) {
    let composing = false;
    const draw = keepInput => {
      const inp = document.getElementById('kin'); if (!inp) return;
      if (!keepInput) inp.value = K.val;
      document.querySelectorAll('.k').forEach(b => { b.textContent = K.kata ? toKata(b.dataset.c) : b.dataset.c; });
      document.getElementById('kmode').textContent = K.kata ? 'ひらがな' : 'カタカナ';
      if (K.onChange) K.onChange();
    };
    // キーボード入力：日本語入力の とちゅう（変換中）は さわらない
    const fromInput = () => {
      const inp = document.getElementById('kin'), r = kanaFilter(inp.value, K.kata);
      K.val = [...r.kana].slice(0, max).join('');
      const v = K.val + ([...K.val].length < max ? r.pend : '');
      if (inp.value !== v) inp.value = v;
      draw(true);
    };
    setTimeout(() => {
      const inp = document.getElementById('kin'); if (!inp) return;
      inp.addEventListener('compositionstart', () => { composing = true; });
      inp.addEventListener('compositionend', () => { composing = false; fromInput(); });
      inp.addEventListener('input', () => { if (!composing) fromInput(); });
      inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !composing && !e.isComposing) { e.preventDefault(); inp.value += ' '; fromInput(); inp.value = K.val; const ok = document.getElementById('ok'); if (ok && !ok.classList.contains('off')) ok.click(); } });
      inp.addEventListener('blur', () => { if (!composing) { inp.value += ' '; fromInput(); inp.value = K.val; } });   // うちかけの「n」は「ん」に
      // キーボードが つながっている 端末では、そのまま 打ちはじめられるように
      if (matchMedia('(hover: hover) and (pointer: fine)').matches) inp.focus();
    }, 0);
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
        S.player = p; S.mons.forEach(m => { m.gems = [0, 0, 0]; }); save(); await tell(`「${esc(p.name)}」の データを よみこんだよ。<br><span class="note">モンスターは 1たいずつ PNGから よみこんでね</span>`); home();
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
        S.player = { name, id: RG.newId(), grade: g, coins: 0, gems: [], shapes: ['slime'], slots: 1, day: 0, doneA: 0, doneB: 0, bonus: 0, bought: 0, tutorial: false };
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
    const bonus = RG.items.loginBonus();
    show('home', `<div class="hname box">${esc(S.player.name)}　${S.player.grade}ねんせい</div><div class="hcoin box">コイン　${S.player.coins}</div>
      <div class="hbig"><button class="btn huge" data-a="prac"><b>まいにち れんしゅう</b><span>きょうの のこり ${RG.items.left()}かい</span></button><button class="btn huge" data-a="vs"><b>ともだちと たいせん</b><span>1だいで ふたりで あそぶ</span></button></div>
      <div class="hsmall"><button class="btn" data-a="chars">キャラクター</button><button class="btn" data-a="gems">ほうせき</button><button class="btn" data-a="shop">おみせ</button><button class="btn" data-a="set">せってい</button></div>`, {
      chars() { chars(); }, set() { settings(); }, prac() { RG.battle.practice(); }, vs() { RG.battle.versus(); }, gems() { RG.items.gemScreen(); }, shop() { RG.items.shop(); },
    });
    if (bonus) toast('ログインボーナス！ コイン +100');
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
    const m = { id: q.id, name: q.name, shape: q.shape, face: q.face, parts: {}, adj: q.adj, free: q.free || {}, motion: q.motion, gems: [0, 0, 0], r5: q.r5, r4: q.r4, creator: q.creator, grade: q.grade, date: q.date };
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
    const mine = isMine(m); RG.items.owners();
    show('detail', `<h1 class="ttl">${esc(m.name)}</h1><button class="btn backbtn" data-a="back">もどる</button>
      <div class="box dprev"><canvas id="pv" width="560" height="440"></canvas></div>
      <div class="dinfo"><p>${RG.SHAPES[m.shape].name}・${RG.SHAPES[m.shape].motions[m.motion] || ''}</p><p>うみのおや：${esc(m.creator.name)}（${RG.dayStr(m.date)}）</p>${statsHTML(m)}${RG.items.slotsHTML(m)}
      <div class="dbtns"><button class="btn${mine ? '' : ' off'}" data-a="edit">なおす</button><button class="btn strong" data-a="png">PNGで だす</button><button class="btn" data-a="bye">にがす</button></div>
      ${mine ? '' : '<p class="note">えを なおせるのは うみのおや だけだよ</p>'}</div>`, {
      back() { chars(); },
      async gslot(b) { if (await RG.items.slotTap(m, +b.dataset.k)) detail(m); },
      edit() { startMake({ shape: m.shape, edit: m }); },
      async png() { await showPNG(RG.buildMonPNG(m, getter(m)), fileName(m), `「${esc(m.name)}」の PNG`); },
      async bye() {
        if (!(await ask(`「${esc(m.name)}」を にがすよ。もとには もどせないよ。<br><span class="note">さきに PNGで だしておくと、あとで よびだせるよ</span>`, 'にがす'))) return;
        S.mons = S.mons.filter(x => x !== m); delete CACHE[m.id]; save(); chars();
      },
    });
    RG.play(document.getElementById('pv'), m, getter(m));
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
    D = { shape: o.shape, tutorial: !!o.tutorial, edit: e || null, face: e ? e.face : 0, adj: e ? JSON.parse(JSON.stringify(e.adj || {})) : {}, motion: e ? e.motion : 0, name: e ? e.name : '', parts: e ? Object.assign({}, CACHE[e.id]) : {}, free: e ? JSON.parse(JSON.stringify(e.free || {})) : {} };
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
    let parts = RG.usableParts(D);
    // スライムの じゆうパーツ：解禁した体形の パーツを 4つまで
    const kinds = () => D.shape === 'slime' ? Object.keys(RG.FREE_KINDS).filter(k => RG.FREE_KINDS[k].need.some(RG.isOpen)) : [];
    const freeCount = () => Object.keys(D.free).length;
    const plistHTML = () => parts.map(p => `<button class="btn pt" data-a="part" data-p="${p.id}"><canvas width="100" height="64" data-th="${p.id}"></canvas><b>${p.name}</b><span>${p.req ? 'ひつよう' : 'じゆう'}</span></button>`).join('') +
      (kinds().length && freeCount() < RG.FREE_MAX ? `<button class="btn pt add" data-a="addfree"><i class="plus2">＋</i><b>パーツを たす</b><em>あと ${RG.FREE_MAX - freeCount()}こ</em></button>` : '');
    // じゆうパーツの しゅるいを えらぶ（slot＝わく番号。すでに ある わくなら「はずす」も 出す）
    const chooseKind = slot => new Promise(res => {
      const has = !!D.free[slot];
      modal(`<p class="mtext s">${has ? 'どの パーツに かえる？' : 'どの パーツを つける？'}</p><div class="kinds">${kinds().map(k => `<button class="btn${has && D.free[slot].k === +k ? ' on' : ''}" data-a="k" data-k="${k}">${RG.FREE_KINDS[k].name}</button>`).join('')}</div>
        <div class="row c">${has ? '<button class="btn" data-a="rm">はずす</button>' : ''}<button class="btn" data-a="n">やめる</button></div>`,
        { k(b) { closeModal(); res(+b.dataset.k); }, rm() { closeModal(); res(-1); }, n() { closeModal(); res(0); } });
    });
    const rebuild = () => { parts = RG.usableParts(D); const pl = stage.querySelector('.plist'); pl.className = 'plist' + (parts.length > 8 ? ' many' : ''); pl.innerHTML = plistHTML(); refresh(); ed.render(); };
    show('draw', `<div class="dhead">${EFUDE}<div class="box bubble" id="hint"></div><div class="dir box">${D.face ? '← ひだりむき' : 'みぎむき →'}</div><button class="btn" data-a="quit">やめる</button></div>
      <div class="tools box">
        <div class="trow"><button class="btn t on" data-a="tool" data-t="pen">${IC.pen}<span>ペン</span></button><button class="btn t" data-a="tool" data-t="eraser">${IC.eraser}<span>けしごむ</span></button><button class="btn t" data-a="tool" data-t="fill">${IC.fill}<span>バケツ</span></button></div>
        <div class="trow">${RG.SIZES.map(([n, px], i) => `<button class="btn t sz${i === 1 ? ' on' : ''}" data-a="size" data-s="${px}"><i style="width:${[6, 12, 22][i]}px;height:${[6, 12, 22][i]}px"></i><span>${n}</span></button>`).join('')}</div>
        <div class="trow"><button class="btn t" data-a="undo" id="bUndo">${IC.undo}<span>もどす</span></button><button class="btn t" data-a="redo" id="bRedo">${IC.redo}<span>すすむ</span></button><button class="btn t" data-a="clear">${IC.clear}<span>ぜんけし</span></button></div>
        <div class="trow two"><button class="btn t" data-a="penonly" id="bPen">${IC.penonly}<span>ペンだけ</span></button><button class="btn t" data-a="pal" id="bPal">${IC.pal}<span id="palTx">プロのいろ</span></button></div>
        <div class="pal simple" id="pal">${RG.COLORS.map(c => `<button class="sw" data-a="col" data-c="${c[1]}" style="background:${c[1]}" aria-label="${c[0]}"></button>`).join('')}</div>
        <div class="pal pro hide" id="palPro">${RG.PRO.map(c => `<button class="sw" data-a="col" data-c="${c[1]}" style="background:${c[1]}" aria-label="${c[0]}"></button>`).join('')}</div>
      </div>
      <div class="paper box"><canvas id="cv"></canvas></div>
      <div class="vrow"><button class="btn t wide on" data-a="view" data-v="0">${IC.single}<span>たんたい</span></button><button class="btn t wide" data-a="view" data-v="1">${IC.multi}<span>がったい</span></button><button class="btn t wide on" data-a="gd" id="bGd">${IC.guide}<span id="gdTx">ガイド：あり</span></button></div>
      <div class="plist${parts.length > 8 ? ' many' : ''}">${plistHTML()}</div>
      <button class="btn strong donebtn" data-a="done">かんせい</button>`, {
      tool(b) { ed.st.tool = b.dataset.t; mark('[data-a=tool]', b); },
      size(b) { ed.st.size = +b.dataset.s; mark('[data-a=size]', b); },
      col(b) { ed.st.color = b.dataset.c; if (ed.st.tool === 'eraser') { ed.st.tool = 'pen'; mark('[data-a=tool]', stage.querySelector('[data-t=pen]')); } mark('.sw', b); },
      undo() { ed.undo(); }, redo() { ed.redo(); },
      async clear() { if (ed.hasInk(ed.cur) && await ask('この パーツを ぜんぶ けすよ。いい？<br><span class="note">「もどす」で もとに もどせるよ</span>', 'けす')) ed.clear(); },
      penonly(b) { ed.st.penOnly = !ed.st.penOnly; b.classList.toggle('on', ed.st.penOnly); },
      pal(b) { const pro = document.getElementById('pal').classList.toggle('hide'); document.getElementById('palPro').classList.toggle('hide', !pro); document.getElementById('palTx').textContent = pro ? 'シンプル' : 'プロのいろ'; },
      view(b) { ed.st.gattai = b.dataset.v === '1'; mark('[data-a=view]', b); ed.render(); },
      gd(b) { ed.st.guide = !ed.st.guide; b.classList.toggle('on', ed.st.guide); document.getElementById('gdTx').textContent = ed.st.guide ? 'ガイド：あり' : 'ガイド：なし'; ed.render(); },
      async part(b) {
        const pid = b.dataset.p, tp = RG.part(D.shape, pid);
        // えらんである じゆうパーツを もういちど おすと、しゅるいを かえる・はずす
        if (tp.free && pid === ed.cur) {
          const k = await chooseKind(tp.free);
          if (k > 0) { D.free[tp.free].k = k; rebuild(); }
          else if (k < 0 && (!ed.hasInk(pid) || await ask('この パーツを はずすよ。かいた えも きえるよ。いい？', 'はずす'))) { delete D.free[tp.free]; ed.wipe(pid); ed.select('body'); rebuild(); }
          return;
        }
        ed.select(pid); refresh();
      },
      async addfree() {
        let slot = 1; while (D.free[slot]) slot++;
        const k = await chooseKind(slot); if (k <= 0) return;
        const tp = RG.SHAPES[D.shape].parts.find(p => p.free === slot);
        D.free[slot] = { k, x: tp.pj[0], y: tp.pj[1], z: 1 }; ed.select(tp.id); rebuild();
      },
      async quit() { if (await ask(D.edit ? 'なおすのを やめる？<br><span class="note">かきたした ところは きえるよ</span>' : 'つくるのを やめる？<br><span class="note">かいた えは きえるよ</span>', 'やめる', 'つづける')) { RG.making = false; D.tutorial ? home() : chars(); } },
      done() {
        const miss = ed.check();
        if (miss.length) { ed.blink(miss); refresh(); document.getElementById('hint').textContent = miss[0].text + '（あかく ひかっている ところ）'; return; }
        D.parts = ed.result(); kumi();
      },
    });
    const mark = (sel, b) => { stage.querySelectorAll(sel).forEach(x => x.classList.remove('on')); if (b) b.classList.add('on'); };
    const ed = new RG.Editor(document.getElementById('cv'), { shape: D.shape, face: D.face, adj: D.adj, free: D.free, sources: D.parts, onChange: () => refresh() });
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
      const miss = ed.check(), cur = RG.partOf(D, ed.cur) || RG.part(D.shape, ed.cur);
      let t;
      if (!miss.length) t = 'いいね！ できたら「かんせい」を おそう。「がったい」で ぜんたいも みられるよ';
      else if (!ed.hasInk(ed.cur)) t = `「${cur.name}」を かこう。はいいろの てんせんの なかなら、どんな かたちでも いいよ` + (cur.parent || parts.some(c => c.parent === cur.id) ? '。ちゃいろの まるは つなぎめ。まるの なかにも かいてね' : '');
      else { const m = miss.find(x => x.pid === ed.cur) || miss[0]; t = m.text + (m.pid !== ed.cur ? '（みぎの ボタンで パーツを きりかえよう）' : ''); }
      if (cur.free && !miss.some(x => x.pid === ed.cur)) t = `「${cur.name}」は、つぎの「くみたて」で すきな ばしょに つけられるよ。もういちど おすと、かえたり はずしたり できるよ`;
      document.getElementById('hint').textContent = t;
    }
    refresh();
  }

  // ---- くみたて ----
  function kumi() {
    // かかなかった じゆうパーツは はずす
    for (const k of Object.keys(D.free)) if (!D.parts['free' + k]) delete D.free[k];
    const kids = RG.usableParts(D).filter(p => p.parent && D.parts[p.id]);
    let sel = kids[0] ? kids[0].id : null, last = null, drag = null;
    const A = pid => (D.adj[pid] = D.adj[pid] || [0, 0, RG.part(D.shape, pid).z]);
    const F = pid => { const tp = RG.part(D.shape, pid); return tp && tp.free ? D.free[tp.free] : null; };
    const clampF = f => { f.x = Math.max(30, Math.min(290, Math.round(f.x))); f.y = Math.max(30, Math.min(210, Math.round(f.y))); };
    show('kumi', guide(kids.some(p => p.free) ? 'じゆうパーツは、えを なぞって すきな ばしょへ うごかそう。<br>よければ「つぎへ」' : 'つなぎめを すこし うごかせるよ。<br>このままで よければ「つぎへ」') + `<button class="btn backbtn" data-a="back">えを なおす</button>
      <div class="box kprev"><canvas id="pv" width="640" height="500"></canvas></div>
      <div class="kside"><div class="klist">${kids.map(p => `<button class="btn t kp" data-a="sel" data-p="${p.id}">${p.name}</button>`).join('')}</div>
        <div class="pad"><button class="btn t" data-a="mv" data-d="0,-1" style="grid-area:u">うえ</button><button class="btn t" data-a="mv" data-d="-1,0" style="grid-area:l">ひだり</button><button class="btn t" data-a="mv" data-d="1,0" style="grid-area:r">みぎ</button><button class="btn t" data-a="mv" data-d="0,1" style="grid-area:d">した</button></div>
        <div class="row"><button class="btn t wide" data-a="z" id="bz"></button><button class="btn t wide" data-a="reset">もとに もどす</button></div>
      </div><button class="btn strong donebtn" data-a="next">つぎへ</button>`, {
      back() { drawScreen(); },
      sel(b) { sel = b.dataset.p; draw(); },
      mv(b) {
        if (!sel) return; const [dx, dy] = b.dataset.d.split(',').map(Number), f = F(sel);
        if (f) { f.x += dx * 8 * (D.face ? -1 : 1); f.y += dy * 8; clampF(f); draw(); return; }
        const a = A(sel), M = RG.ADJ_MAX;
        a[0] = Math.max(-M, Math.min(M, a[0] + dx * 2 * (D.face ? -1 : 1))); a[1] = Math.max(-M, Math.min(M, a[1] + dy * 2)); draw();
      },
      z() { if (!sel) return; const f = F(sel); if (f) { f.z = f.z ? 0 : 1; draw(); return; } const a = A(sel); a[2] = a[2] ? 0 : 1; draw(); },
      reset() { if (!sel) return; const f = F(sel), tp = RG.part(D.shape, sel); if (f) { f.x = tp.pj[0]; f.y = tp.pj[1]; f.z = 1; } else D.adj[sel] = [0, 0, tp.z]; draw(); },
      async next() {
        // じゆうパーツは からだの えの 上に つける
        const body = RG.part(D.shape, 'body');
        for (const p of kids.filter(q => q.free)) {
          const f = F(p.id);
          if (!RG.inkAt(D.parts.body, RG.jx(body, [f.x, f.y], D.face))) { sel = p.id; draw(); return tell(`「${p.name}」が からだから はなれているよ。<br>からだの えの うえに つけてね`); }
        }
        motion();
      },
    });
    // じゆうパーツは、えの 上を なぞって うごかせる
    const pv = document.getElementById('pv');
    const toBody = e => { const b = pv.getBoundingClientRect(), r = drag.r, cx = (e.clientX - b.left) * 640 / b.width, cy = (e.clientY - b.top) * 500 / b.height; return [D.face ? r.L.x1 - (cx - r.ox) / r.s : (cx - r.ox) / r.s + r.L.x0, (cy - r.oy) / r.s + r.L.y0]; };
    pv.addEventListener('pointerdown', e => {
      if (!sel || !F(sel) || !last) return; e.preventDefault();
      drag = { id: e.pointerId, r: last }; const p0 = toBody(e), f = F(sel); drag.off = [f.x - p0[0], f.y - p0[1]];
      // つなぎめから 遠い所を さわったら、そこへ とぶ
      if (Math.hypot(drag.off[0], drag.off[1]) > 90) { drag.off = [0, 0]; f.x = p0[0]; f.y = p0[1]; clampF(f); draw(); }
      try { pv.setPointerCapture(e.pointerId); } catch (_) { }
    });
    pv.addEventListener('pointermove', e => { if (!drag || e.pointerId !== drag.id) return; const p = toBody(e), f = F(sel); f.x = p[0] + drag.off[0]; f.y = p[1] + drag.off[1]; clampF(f); draw(); });
    const endDrag = e => { if (drag && e.pointerId === drag.id) drag = null; };
    pv.addEventListener('pointerup', endDrag); pv.addEventListener('pointercancel', endDrag);
    function draw() {
      const c = document.getElementById('pv'), x = c.getContext('2d'); x.clearRect(0, 0, 640, 500);
      const r = RG.drawMon(x, D, pid => D.parts[pid] || null, 20, 20, 600, 460, { maxScale: 1.6 });
      last = r;
      stage.querySelectorAll('.kp').forEach(b => b.classList.toggle('on', b.dataset.p === sel));
      const bz = document.getElementById('bz');
      if (!sel) { bz.textContent = 'かさなり'; return; }
      const p = RG.partOf(D, sel), par = RG.partOf(D, p.parent), zf = p.free ? p.z : A(sel)[2];
      bz.textContent = zf ? `${par.name}の まえ` : `${par.name}の うしろ`;
      const o = r.L.order.find(q => q.p.id === sel), jx = o.x + p.cj[0], jy = o.y + p.cj[1];
      const sx = r.ox + (D.face ? r.L.x1 - jx : jx - r.L.x0) * r.s, sy = r.oy + (jy - r.L.y0) * r.s;
      x.setLineDash([7, 5]); x.lineWidth = 3; x.strokeStyle = '#8a5a2b'; x.beginPath(); x.arc(sx, sy, RG.JR * r.s, 0, Math.PI * 2); x.stroke(); x.setLineDash([]);
    }
    draw();
  }
  // ---- モーション（3パターンから えらぶ。5つの うごきを ためせる）----
  function motion() {
    const ms = RG.SHAPES[D.shape].motions;
    show('motion', guide('どんな うごきに する？<br>したの ボタンで うごきを ためせるよ') + `<button class="btn backbtn" data-a="back">もどる</button>
      <div class="box mprev"><canvas id="pv" width="560" height="400"></canvas></div>
      <div class="arow">${RG.ACTIONS.map(a => `<button class="btn t wide ac${a === 'idle' ? ' on' : ''}" data-a="act" data-k="${a}">${RG.ACTION_NAMES[a]}</button>`).join('')}</div>
      <div class="mlist">${ms.map((n, i) => `<button class="btn big mo${i === D.motion ? ' on' : ''}" data-a="m" data-i="${i}">${n}</button>`).join('')}</div>
      <button class="btn strong donebtn" data-a="next">つぎへ</button>`, {
      back() { kumi(); },
      m(b) { D.motion = +b.dataset.i; pl.motion = D.motion; stage.querySelectorAll('.mo').forEach(x => x.classList.toggle('on', x === b)); setAct('idle'); },
      act(b) { setAct(b.dataset.k); },
      next() { nameMon(); },
    });
    const setAct = k => { pl.set(k); stage.querySelectorAll('.ac').forEach(x => x.classList.toggle('on', x.dataset.k === k)); };
    const pl = RG.play(document.getElementById('pv'), D, pid => D.parts[pid] || null, { onEnd() { stage.querySelectorAll('.ac').forEach(x => x.classList.toggle('on', x.dataset.k === 'idle')); } });
    pl.motion = D.motion; RG.pl = pl;
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
    Object.assign(m, { name: D.name, shape: D.shape, face: D.face, adj: D.adj, free: D.free, motion: D.motion, r5: ratio.r5, r4: ratio.r4, grade: S.player.grade, parts: {} });
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
    RG.play(document.getElementById('pv'), m, getter(m), { action: 'win' });
  }

  // =============== せってい ===============
  let verTap = 0;
  function settings() {
    const p = S.player;
    show('settings', `<h1 class="ttl">せってい</h1><button class="btn backbtn" data-a="back">もどる</button>
      <div class="setgrid">
        <div class="box sc"><h3>プレイヤー</h3><p>${esc(p.name)}　${p.grade}ねんせい</p><div class="row"><button class="btn" data-a="grade">がくねんを かえる</button></div></div>
        <div class="box sc"><h3>データ</h3><div class="col"><button class="btn" data-a="pp">プレイヤーデータを PNGで だす</button><button class="btn" data-a="all">ぜんぶ まとめて だす</button></div></div>
        <div class="box sc"><h3>おと</h3><div class="row"><button class="btn" data-a="se">${S.se ? 'こうかおん：あり' : 'こうかおん：なし'}</button></div></div>
        ${RG.debug ? `<div class="box sc dbg"><h3>テストよう</h3><div class="dgrid"><button class="btn" data-a="t1">からだ ぜんぶ</button><button class="btn" data-a="t2">わく +1</button><button class="btn" data-a="t4">コイン +1000</button><button class="btn" data-a="t5">きょうを もどす</button><button class="btn" data-a="t6">ほうせき +3</button><button class="btn" data-a="t3">データを けす</button></div></div>` : ''}
      </div><button class="ver" data-a="ver">ver ${RG.VERSION}</button>`, {
      // テストよう：バージョンを 7かい おすと 出る
      ver() { verTap++; if (verTap >= 7) { verTap = 0; RG.debug = !RG.debug; settings(); } },
      t4() { p.coins += 1000; save(); toast('コイン +1000'); },
      t5() { p.day = -1; RG.items.rollDay(); toast('きょうの かいすうと おみせを もどしたよ'); },
      async t6() { for (let i = 0; i < 3; i++) await RG.items.give(RG.items.rollGem(Math.random, p.grade, 0.3, 0.1)); toast('ほうせきを 3こ もらったよ'); },
      back() { home(); }, grade() { setupGrade(p.name, true); },
      async pp() { await showPNG(RG.buildPlayerPNG(p), `rakugaki_player_${p.name}.png`, 'プレイヤーデータの PNG'); },
      all() { return exportAll(); },
      se() { S.se = !S.se; save(); settings(); },
      t1() { p.shapes = RG.SHAPE_ORDER.slice(); save(); toast('からだを ぜんぶ かいきんしたよ'); },
      t2() { p.slots = Math.min(6, p.slots + 1); save(); toast(`わくが ${p.slots}つに なったよ`); },
      async t3() { if (await ask('データを ぜんぶ けすよ。ほんとうに いい？', 'けす')) { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } S = { v: 1, player: null, mons: [], se: true }; title(); } },
    });
  }

  // ---- はじまり ----
  RG.app = { get S() { return S; }, save, title, home, chars, cacheMon, CACHE };
  // ほかの ファイル（battle.js）から 使う 部品
  RG.ui = { stage, show, modal, closeModal, ask, tell, toast, guide, esc, pickFile, getter, home, EFUDE, get seOn() { return S.se; } };
  (async function () {
    load();
    for (const m of S.mons) await cacheMon(m);
    title();
  })();
})(window.RG);
