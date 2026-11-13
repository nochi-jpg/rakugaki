// ===== UIの 土台：画面の 切りかえ・おと・アイコン・まど・えふでちゃんの 会話と ガイド・かな入力 =====
(function (RG) {
  'use strict';
  const stage = document.getElementById('stage');
  const UI = RG.ui = { stage };
  const S = () => (RG.app ? RG.app.S : { se: true });
  const esc = UI.esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const wait = UI.wait = ms => new Promise(r => setTimeout(r, ms / (RG.timeScale || 1)));

  // ---- 画面の大きさ（16:9 固定。1280×720 を 拡大縮小）----
  let scale = 1;
  function fit() {
    scale = Math.min(innerWidth / 1280, innerHeight / 720);
    stage.style.transform = `translate(${(innerWidth - 1280 * scale) / 2}px,${(innerHeight - 720 * scale) / 2}px) scale(${scale})`;
  }
  addEventListener('resize', fit); addEventListener('orientationchange', fit); fit();
  // がめんの 座標（クライアント）→ ステージの 座標（1280×720）
  const toStage = UI.toStage = (x, y) => { const r = stage.getBoundingClientRect(); return [(x - r.left) / scale, (y - r.top) / scale]; };

  // ---- おと：効果音（js/assets.js に うめこみ）と BGM（assets/bgm/ に ファイルを 置くと 鳴る）----
  const pool = {};
  UI.sfx = function (name, o) {
    if (!S().se) return;
    const src = RG.ASSETS && RG.ASSETS.se && RG.ASSETS.se[name]; if (!src) return;
    const list = pool[name] = pool[name] || [];
    let a = list.find(x => x.paused || x.ended);
    if (!a) { if (list.length >= 5) a = list[0]; else { a = new Audio(src); list.push(a); } }
    try { a.currentTime = 0; } catch (e) { }
    a.volume = Math.min(1, (o && o.vol) || 0.55); a.playbackRate = (o && o.rate) || 1;
    const p = a.play(); if (p && p.catch) p.catch(() => { });
  };
  // ---- BGM ----
  // ふつうは 内蔵の チップチューン（js/bgm.js。譜面データを その場で 鳴らすので 容量を 使わない）。
  // assets/bgm/<名前>.mp3 を 置くと、その曲だけ ファイルの 音に さしかえる（docs/BGM.md）
  const BGM_FALLBACK = { story: 'title', make: 'home', shop: 'home', watch: 'solve', lose: 'win' }, BGM_ONCE = ['win', 'lose'];
  const BGM_VOL = { solve: 0.34, make: 0.36, story: 0.42 };       // 考える 場面は 小さめ
  let bgm = null, bgmName = null, bgmPending = null;
  function bgmStop() {
    if (bgm) { const a = bgm, v0 = a.volume, t0 = performance.now(); bgm = null; const f = () => { const t = Math.min(1, (performance.now() - t0) / 400); a.volume = v0 * (1 - t); t < 1 ? requestAnimationFrame(f) : a.pause(); }; f(); }
    if (RG.chip) RG.chip.stop();
  }
  function bgmStart(name) {
    const files = (RG.ASSETS && RG.ASSETS.bgm) || {}, chip = RG.chip;
    let n = name; for (let k = 0; n && !files[n] && !(chip && chip.TRACKS[n]) && k < 3; k++) n = BGM_FALLBACK[n];
    if (!n) return;
    if (files[n]) { bgm = new Audio(files[n]); bgm.loop = !BGM_ONCE.includes(name); bgm.volume = 0.35; const p = bgm.play(); if (p && p.catch) p.catch(() => { bgmPending = name; }); return; }
    // チップチューン：さいしょに がめんを さわる 前は 鳴らせないので、さわったときに 鳴らす
    // （さわった すぐ あとは 音の じゅんびが まだの ことが あるので、すこし 待って たしかめなおす）
    if (!chip.ready()) {
      chip.unlock(); bgmPending = name; let tries = 0;
      const again = () => { if (bgmPending !== name || bgmName !== name) return; if (chip.ready()) { bgmPending = null; chip.play(n, BGM_VOL[n] || 0.5); } else if (++tries < 15) setTimeout(again, 100); };
      setTimeout(again, 100); return;
    }
    chip.play(n, BGM_VOL[n] || 0.5);
  }
  // BGMを かえる（同じ曲なら そのまま）。null で 止める
  UI.bgm = function (name) {
    if (name === bgmName) return; bgmName = name || null; bgmPending = null;
    bgmStop();
    if (!name || S().bgm === false || RG.noBgm) return;
    bgmStart(name);
  };
  UI.bgmRefresh = () => { const n = bgmName; bgmName = null; bgmStop(); UI.bgm(n); };
  const bgmRetry = () => { if (!bgmPending) return; const n = bgmPending; bgmPending = null; setTimeout(() => { if (bgmName === n) { bgmStop(); bgmStart(n); } }, 60); };
  addEventListener('pointerdown', bgmRetry, true); addEventListener('keydown', bgmRetry, true);

  // ---- アイコン（白黒の 線画。24×24）----
  const svg = (d, w) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2.3}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const dot = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r || 1}" fill="currentColor" stroke="none"/>`;
  const IC = UI.IC = {
    // おえかき（お絵描きリレーと 同じ）
    pen: svg('<path d="M4 20l1.2-4.6L16 4.6a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8z"/><path d="M14 6.6l3.4 3.4"/>'),
    eraser: svg('<path d="M8.5 20H20"/><path d="M5.2 15.8l9.6-9.6a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8L12 19.1a3 3 0 0 1-4.2 0l-2.6-2.6a.5.5 0 0 1 0-.7z"/><path d="M9.5 11.5l5 5"/>'),
    fill: svg('<path d="M10.2 3.8l8 8-6.6 6.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8z"/><path d="M4.2 11.6h13.6"/><path d="M8 5.6L6.2 3.8"/><path d="M20.5 15.5c.9 1.3 1.4 2.2 1.4 2.9a1.4 1.4 0 0 1-2.8 0c0-.7.5-1.6 1.4-2.9z"/>'),
    undo: svg('<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>', 2.6),
    redo: svg('<path d="M15 14l5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>', 2.6),
    trash: svg('<path d="M4 7h16"/><path d="M9 7V4.5h6V7"/><path d="M6.5 7l1 13h9l1-13"/><path d="M10 11v5.5M14 11v5.5"/>'),
    penonly: svg('<path d="M12 3v11"/><path d="M9 14h6l-3 7z"/><path d="M9.5 3h5"/>'),
    pal: svg('<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 2-1 1.6-2.1-.5-1.3.3-2.4 1.7-2.4h1.9a3.3 3.3 0 0 0 3.3-3.3c0-5.500-3.800-9.200-8.500-9.200z"/>' + dot(8, 11) + dot(11, 7.5) + dot(15.5, 8.5)),
    single: svg('<rect x="6" y="6" width="12" height="12" rx="2"/>'),
    multi: svg('<rect x="3.5" y="9" width="8" height="8" rx="1.5"/><rect x="12.500" y="5" width="8" height="8" rx="1.5"/><path d="M11.500 12h1"/>'),
    guide: svg('<rect x="4" y="4" width="16" height="16" rx="3" stroke-dasharray="3 3"/><circle cx="12" cy="12" r="3"/>'),
    // メニュー
    back: svg('<path d="M10.5 5L4 12l6.500 7"/><path d="M4.500 12H20"/>', 2.8),
    gear: svg('<circle cx="12" cy="12" r="3.2"/><path d="M12 2.500v3M12 18.500v3M2.500 12h3M18.500 12h3M5.300 5.300l2.100 2.100M16.600 16.600l2.100 2.100M5.300 18.700l2.100-2.100M16.600 7.400l2.100-2.100"/><circle cx="12" cy="12" r="6.800"/>'),
    battle: svg('<path d="M4.500 4.500l10 10M12 17l5-5M16 16l3.500 3.500"/><path d="M19.500 4.500l-10 10M12 17l-5-5M8 16l-3.500 3.500"/>', 2.5),
    friends: svg('<circle cx="8" cy="8" r="3.200"/><circle cx="17" cy="9.200" r="2.600"/><path d="M2.500 19.500c.4-3.600 2.600-5.400 5.500-5.400s5.100 1.800 5.500 5.400"/><path d="M15 14.400c3.400-.5 5.900 1.200 6.500 5.100"/>'),
    monster: svg('<path d="M4.200 19c-1.300-6.400 1.600-11.300 7.800-11.300s9.100 4.900 7.800 11.300z"/><path d="M10.300 7.800L12 3.500l1.700 4.300"/><path d="M9.800 16.200c1.400 1 3 1 4.400 0"/>' + dot(9.3, 13, 1.1) + dot(14.7, 13, 1.1)),
    gem: svg('<path d="M7 4h10l4 5.200L12 20.500 3 9.200z"/><path d="M3 9.200h18M9.500 4L8 9.200l4 11.300 4-11.300L14.500 4"/>', 2),
    shop: svg('<path d="M4 9.200L5.600 4h12.800L20 9.200"/><path d="M4 9.200c0 1.600 1.200 2.700 2.700 2.700s2.600-1.100 2.600-2.700c0 1.600 1.200 2.700 2.700 2.700s2.700-1.100 2.700-2.700c0 1.600 1.100 2.700 2.600 2.700S20 10.800 20 9.200"/><path d="M5.500 12v8h13v-8"/><path d="M10 20v-4.500h4V20"/>', 2),
    coin: svg('<circle cx="12" cy="12" r="8.500"/><path d="M12 7.500l1.300 2.800 3 .4-2.200 2.100.6 3-2.700-1.500-2.700 1.500.6-3-2.200-2.100 3-.4z"/>', 2),
    plus: svg('<path d="M12 5v14M5 12h14"/>', 3),
    check: svg('<path d="M4.500 12.500l5 5L19.500 7"/>', 3.2),
    x: svg('<path d="M6 6l12 12M18 6L6 18"/>', 3),
    lock: svg('<rect x="5.500" y="10.500" width="13" height="9.500" rx="2.200"/><path d="M8.500 10.500V8a3.500 3.500 0 0 1 7 0v2.500"/>' + dot(12, 15.2, 1.2)),
    save: svg('<path d="M12 4v11"/><path d="M7.500 10.500L12 15l4.500-4.500"/><path d="M4.500 19.500h15"/>', 2.6),
    load: svg('<path d="M12 15V4"/><path d="M7.500 8.500L12 4l4.500 4.500"/><path d="M4.500 19.500h15"/>', 2.6),
    play: svg('<path d="M8 5v14l11.500-7z"/>', 2.6),
    home: svg('<path d="M3.500 11.500L12 4l8.500 7.500"/><path d="M6 10v10h12V10"/><path d="M10 20v-5h4v5"/>'),
    retry: svg('<path d="M19.500 12a7.500 7.500 0 1 1-2.400-5.500"/><path d="M19.500 4v5h-5"/>', 2.6),
    bye: svg('<path d="M13.500 4.500H6v15h7.500"/><path d="M10.500 12H20"/><path d="M16.500 8.500L20 12l-3.500 3.500"/>'),
    help: svg('<circle cx="12" cy="12" r="8.500"/><path d="M9.300 9.500a2.800 2.800 0 1 1 4.200 2.400c-.9.600-1.500 1.100-1.500 2.300"/>' + dot(12, 17.3, 1.1)),
    sound: svg('<path d="M4 9.500h3.500L12 5v14l-4.500-4.500H4z"/><path d="M15.500 9a4 4 0 0 1 0 6"/><path d="M18 6.500a7.500 7.500 0 0 1 0 11"/>'),
    mute: svg('<path d="M4 9.500h3.500L12 5v14l-4.500-4.500H4z"/><path d="M16 9.500l5 5M21 9.500l-5 5"/>'),
    music: svg('<path d="M9 18V6l10-2v12"/><circle cx="6.500" cy="18" r="2.500"/><circle cx="16.500" cy="16" r="2.500"/>'),
    speed: svg('<path d="M4.500 6l7 6-7 6z"/><path d="M12.500 6l7 6-7 6z"/>', 2.4),
    star: svg('<path d="M12 3.500l2.600 5.400 5.900.8-4.300 4.100 1 5.900L12 16.900l-5.200 2.800 1-5.900L3.500 9.700l5.900-.8z"/>'),
    clock: svg('<circle cx="12" cy="12.500" r="8"/><path d="M12 8v4.500l3 2"/><path d="M9.500 2.500h5"/>'),
    heart: svg('<path d="M12 20s-7.500-4.600-7.500-10A4.200 4.200 0 0 1 12 7.500 4.200 4.200 0 0 1 19.500 10c0 5.400-7.500 10-7.500 10z"/>'),
    layers: svg('<path d="M12 4l8.500 4.500L12 13 3.500 8.500z"/><path d="M4.500 12.500L12 16.500l7.500-4"/><path d="M4.500 16l7.500 4 7.500-4"/>'),
    up: svg('<path d="M12 19V5M6 11l6-6 6 6"/>', 3), down: svg('<path d="M12 5v14M6 13l6 6 6-6"/>', 3),
    left: svg('<path d="M19 12H5M11 6l-6 6 6 6"/>', 3), right: svg('<path d="M5 12h14M13 6l6 6-6 6"/>', 3),
    // きょうか
    dice: svg('<rect x="4.500" y="4.500" width="15" height="15" rx="3.500"/>' + dot(9, 9, 1.2) + dot(15, 15, 1.2) + dot(15, 9, 1.2) + dot(9, 15, 1.2) + dot(12, 12, 1.2)),
    s0: svg('<path d="M4 5.800c2.600-1.100 5.500-1 8 .6 2.500-1.600 5.400-1.700 8-.6v12.700c-2.600-1.100-5.500-1-8 .6-2.500-1.600-5.400-1.700-8-.6z"/><path d="M12 6.400v12.700"/>'),
    s1: svg('<path d="M5 8h5M7.500 5.500v5M14 8h5M5.500 15l4 4M9.500 15l-4 4M14 15.200h5M14 18.800h5"/>', 2.5),
    s2: svg('<circle cx="12" cy="12" r="8.500"/><path d="M3.500 12h17"/><path d="M12 3.500c3.200 3.400 3.200 13.600 0 17M12 3.500c-3.200 3.400-3.200 13.600 0 17"/>', 2),
    s3: svg('<path d="M9.500 3.500h5"/><path d="M10.500 3.500v6l-5 9a1.500 1.500 0 0 0 1.300 2.300h10.400a1.500 1.500 0 0 0 1.300-2.300l-5-9v-6"/><path d="M8 15.500h8"/>'),
    s4: svg('<path d="M3.500 18.500L7.800 6l4.300 12.500M5.200 14.200h5.200"/><path d="M14.500 6v12.500M14.500 13c3.800-2.300 6.300.2 6.200 2.800-.1 2.700-3 4-6.200 2.200"/>', 2.3),
    // からだの かたち
    slime: svg('<path d="M4 19c-1.500-5 1.200-9.500 5.500-10.500C10 5 11 3.500 12 3.500s2 1.500 2.500 5C18.800 9.500 21.500 14 20 19z"/>' + dot(9.5, 14.5, 1.1) + dot(14.5, 14.5, 1.1)),
    yotsu: svg('<path d="M4 9.500c2-1.500 4-1 5.500.5h6c.5-2 2-3.500 4.500-3l-1 2.500 1.500 1.500-2 1.500v7M15.500 13v7M9 13v7M5.500 12v8"/><path d="M4 9.500L2.500 7"/>', 2.2),
    tori: svg('<path d="M5 13c0-4 3-7 7-7 2.500 0 4 1 4.500 2.500L20 9.500l-3.300 1.300C16.500 14.500 14 17 10.500 17 7.500 17 5 15.500 5 13z"/><path d="M5 13L2.500 15M9.500 17v3.500M12.500 16.800v3.700"/>' + dot(14, 9.5, 1), 2.2),
    sakana: svg('<path d="M3.500 12c3-4.500 9-5.500 13-1.500L20.500 7v10l-4-3.500c-4 4-10 3-13-1.500z"/>' + dot(7.5, 11, 1), 2.2),
    ekitai: svg('<path d="M12 3.500c3.500 4.500 6 7.500 6 11a6 6 0 0 1-12 0c0-3.500 2.500-6.500 6-11z"/><path d="M9.500 15.500c.5 1.300 1.500 2 2.800 2"/>', 2.2),
    robot: svg('<rect x="6" y="8" width="12" height="9" rx="2"/><path d="M12 8V4.500M9 17v3.500M15 17v3.500M6 11.500H3.500M18 11.500h2.500"/>' + dot(12, 3.8, 1.2) + dot(9.5, 12, 1.1) + dot(14.5, 12, 1.1), 2.2),
    nisoku: svg('<circle cx="12" cy="6" r="3"/><path d="M12 9v6.500M7 11.500h10M12 15.500L8.500 20.500M12 15.500l3.500 5"/>', 2.3),
  };
  UI.ic = n => IC[n] || '';
  // モンスターの うごき・こうどうの アイコン
  UI.ACTION_IC = { idle: 'heart', attack: 'battle', damage: 'x', win: 'star', lose: 'down' };

  // ---- 画面の 切りかえ ----
  let acts = {}, modalActs = null;
  UI.show = function (cls, html, handlers) {
    UI.closeCoach();
    stage.className = 'scr-' + cls.split(' ').join(' scr-') + (RG.noAnim ? ' noanim' : ''); stage.innerHTML = '<div class="paper-bg"></div>' + html; acts = handlers || {}; modalActs = null; RG.screen = cls.split(' ')[0];
    // 中身を 上から じゅんに ふわっと 出す
    let i = 0; for (const el of stage.children) { if (el.classList.contains('paper-bg')) continue; el.classList.add('enter'); el.style.animationDelay = Math.min(i++, 9) * 45 + 'ms'; }
  };
  const press = b => { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); };
  stage.addEventListener('click', async e => {
    if (talkNext) { e.stopPropagation(); talkNext(); return; }
    const b = e.target.closest('[data-a]'); if (!b || b.disabled || b.classList.contains('off')) return;
    const f = modalActs ? modalActs[b.dataset.a] : acts[b.dataset.a]; if (!f) return;
    if (b.dataset.se !== 'none') UI.sfx(b.dataset.se || 'tap');
    press(b);
    try { await f(b); } catch (err) { console.error(err); UI.toast(err.message || 'うまく いかなかったよ'); }
  });
  // マウスが のったときの 小さな音（マウスだけ）
  let lastHover = null;
  stage.addEventListener('pointerover', e => {
    if (e.pointerType !== 'mouse') return;
    const b = e.target.closest('.btn,.sw'); if (!b || b === lastHover || b.classList.contains('off')) { if (!b) lastHover = null; return; }
    lastHover = b; UI.sfx('hover', { vol: 0.18, rate: 1.25 });
  });
  // おした ところに インクの はね
  stage.addEventListener('pointerdown', e => {
    if (!e.target.closest('.btn,.sw') || e.target.closest('.off')) return;
    const [x, y] = toStage(e.clientX, e.clientY), s = document.createElement('i');
    s.className = 'spark'; s.style.left = x + 'px'; s.style.top = y + 'px';
    s.innerHTML = '<svg viewBox="-20 -20 40 40"><g stroke="#111" stroke-width="2.6" stroke-linecap="round">' + [0, 1, 2, 3, 4, 5, 6, 7].map(k => { const a = k * Math.PI / 4 + 0.3, c = Math.cos(a), n = Math.sin(a); return `<path d="M${c * 9} ${n * 9}L${c * 17} ${n * 17}"/>`; }).join('') + '</g></svg>';
    stage.appendChild(s); setTimeout(() => s.remove(), 450);
  });
  // 事故防止（長おしメニュー・ピンチ・ダブルタップ拡大）
  addEventListener('contextmenu', e => { if (!e.target.closest('.savable')) e.preventDefault(); });
  document.addEventListener('gesturestart', e => e.preventDefault());
  let lastTouch = 0; document.addEventListener('touchend', e => { const n = Date.now(); if (n - lastTouch < 320 && !e.target.closest('input')) e.preventDefault(); lastTouch = n; }, { passive: false });
  addEventListener('beforeunload', e => { if (RG.making) { e.preventDefault(); e.returnValue = ''; } });

  // ---- まど・おしらせ ----
  UI.modal = function (html, handlers, cls) {
    UI.closeModal(); const d = document.createElement('div'); d.className = 'modal'; d.innerHTML = `<div class="box mbox ${cls || ''}">${html}</div>`;
    stage.appendChild(d); modalActs = handlers || {}; UI.sfx('slide', { vol: 0.3 });
  };
  UI.closeModal = function () { const m = stage.querySelector('.modal'); if (m) m.remove(); modalActs = null; };
  UI.ask = (text, yes, no) => new Promise(res => UI.modal(`<p class="mtext">${text}</p><div class="row c"><button class="btn" data-a="n">${no || 'やめる'}</button><button class="btn strong" data-a="y">${yes || 'はい'}</button></div>`, { y() { UI.closeModal(); res(true); }, n() { UI.closeModal(); res(false); } }));
  UI.tell = (text, pose) => new Promise(res => UI.modal(`${pose ? UI.efude(pose, 'mefude') : ''}<p class="mtext">${text}</p><div class="row c"><button class="btn strong" data-a="y">${IC.check}わかった</button></div>`, { y() { UI.closeModal(); res(); } }, pose ? 'withefude' : ''));
  let toastT = 0;
  UI.toast = function (text) {
    let t = stage.querySelector('.toast'); if (t) t.remove();
    t = document.createElement('div'); t.className = 'toast box'; stage.appendChild(t);
    t.textContent = text; clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 2800);
  };
  UI.pickFile = () => new Promise(res => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.style.display = 'none';
    i.onchange = () => { res(i.files[0] || null); i.remove(); }; i.oncancel = () => { res(null); i.remove(); }; document.body.appendChild(i); RG.lastInput = i; i.click();
  });

  // ---- 部品 ----
  // 上の バー：もどる ボタン・タイトル・右がわの 中身
  UI.top = (title, right, backLabel) => `<div class="top">${backLabel === false ? '<span></span>' : `<button class="btn back" data-a="back" data-se="flip">${IC.back}<span>${backLabel || 'もどる'}</span></button>`}<h1>${title}</h1><div class="topr">${right || ''}</div></div>`;
  UI.coin = n => `<div class="chip coin">${IC.coin}<b>${n}</b></div>`;
  // えふでちゃん（K.nom の絵）。pose＝normal / joy / angry / sad / surprise / worry / think / wink / teach
  UI.efude = (pose, cls) => `<img class="efude ${cls || ''}" alt="えふでちゃん" draggable="false" src="${(RG.ASSETS && RG.ASSETS.img && RG.ASSETS.img['efude_' + (pose || 'normal')]) || ''}">`;
  // がめんの 上に 出る、えふでちゃんの ひとこと（つくる がめん などの 案内）
  UI.guide = (text, pose) => `<div class="guide">${UI.efude(pose || 'teach')}<div class="box bubble" id="hint">${text}</div></div>`;

  // ---- えふでちゃんの 会話（がめんの 下に 出る。おすと つぎへ）----
  // lines＝[[ポーズ, 文], ...]。RG.noTalk が true のときは とばす（テスト用）
  let talkNext = null;
  UI.talk = function (lines, who) {
    if (RG.noTalk || !lines || !lines.length) return Promise.resolve();
    return new Promise(res => {
      const d = document.createElement('div'); d.className = 'talk';
      d.innerHTML = `<div class="talkchar" id="tkc"></div><div class="box talkbox"><b class="talkname">${who || 'えふで'}</b><p id="tkt"></p><i class="talknext">${IC.down}</i></div>`;
      stage.appendChild(d);
      let i = 0, typing = 0, full = '';
      // ぎょうがえ（\n・<br>）は、とちゅうでも さいごまで 出したときも 同じに する
      const html = t => esc(t.replace(/<br>/g, '\n')).replace(/\n/g, '<br>');
      const put = () => {
        const [pose, text] = lines[i]; full = text;
        const keeper = who === 'てんしゅ' && stage.querySelector('.tenshu');
        if (keeper) { keeper.src = RG.ASSETS.img['tenshu_' + pose] || keeper.src; d.classList.add('nochar'); }
        else document.getElementById('tkc').innerHTML = UI.efude(pose);
        const el = document.getElementById('tkt'); el.innerHTML = ''; d.classList.remove('done');
        // 1文字ずつ 出す
        const chars = [...text.replace(/<br>/g, '\n')]; let n = 0; clearInterval(typing);
        typing = setInterval(() => {
          n += 1; el.innerHTML = html(chars.slice(0, n).join(''));
          if (n % 3 === 1) UI.sfx('place', { vol: 0.12, rate: 1.5 });
          if (n >= chars.length) { clearInterval(typing); typing = 0; d.classList.add('done'); }
        }, 34 / (RG.timeScale || 1));
      };
      talkNext = () => {
        if (typing) { clearInterval(typing); typing = 0; document.getElementById('tkt').innerHTML = html(full); d.classList.add('done'); return; }
        UI.sfx('flip', { vol: 0.4 });
        if (++i >= lines.length) { talkNext = null; d.remove(); res(); return; }
        put();
      };
      put();
    });
  };
  // ---- ガイド（がめんの ボタンなどを かこんで、えふでちゃんが せつめいする）----
  // steps＝[[セレクタ, ポーズ, 文], ...]。セレクタが 見つからない ものは とばす
  UI.closeCoach = function () { const c = stage.querySelector('.coach'); if (c) c.remove(); if (talkNext && talkNext.coach) talkNext = null; };
  UI.coach = function (steps) {
    if (RG.noTalk) return Promise.resolve();
    return new Promise(res => {
      const d = document.createElement('div'); d.className = 'coach';
      d.innerHTML = `<i class="ring"></i><div class="coachtalk"><span id="cce"></span><div class="box bubble"><p id="cct"></p><i class="talknext">${IC.down}</i></div></div>`;
      stage.appendChild(d);
      let i = -1;
      const next = () => {
        let t = null;
        while (++i < steps.length) { t = steps[i][0] ? stage.querySelector(steps[i][0]) : stage; if (t) break; }
        if (i >= steps.length) { d.remove(); talkNext = null; res(); return; }
        const r = t.getBoundingClientRect(), [x0, y0] = toStage(r.left, r.top), w = r.width / scale, h = r.height / scale, ring = d.querySelector('.ring');
        const whole = t === stage; ring.style.display = whole ? 'none' : 'block'; d.classList.toggle('whole', whole);
        Object.assign(ring.style, { left: x0 - 10 + 'px', top: y0 - 10 + 'px', width: w + 20 + 'px', height: h + 20 + 'px' });
        document.getElementById('cce').innerHTML = UI.efude(steps[i][1]); document.getElementById('cct').innerHTML = steps[i][2];
        // えふでちゃんは、かこんだ ところと かさならない がわに 出す
        const tk = d.querySelector('.coachtalk'); tk.classList.toggle('up', !whole && y0 + h / 2 > 380);
        UI.sfx('flip', { vol: 0.4 });
      };
      talkNext = next; talkNext.coach = true; next();
    });
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
  const toKata = s => s.replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60));
  const toHira = s => s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
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
  UI.kanaHTML = function () {
    return `<div class="namebox box"><input id="kin" type="text" inputmode="kana" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="なまえ"></div><span class="namehint">キーボードでも うてるよ</span><div class="kana">` +
      K_ROWS.map(r => [...r].map(ch => ch === '　' ? '<i></i>' : `<button class="btn k" data-a="k" data-c="${ch}" data-se="place">${ch}</button>`).join('')).join('') +
      `</div><div class="kctl"><button class="btn" data-a="kmode" id="kmode" data-se="flip">カタカナ</button><button class="btn" data-a="kd" data-se="place">゛</button><button class="btn" data-a="kh" data-se="place">゜</button><button class="btn" data-a="ks" data-se="place">ちいさく</button><button class="btn" data-a="kb" data-se="flip">${IC.back}けす</button></div>`;
  };
  UI.kanaActs = function (K, max) {
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
  };

  // おえかき中の キーボード：Ctrl+Z＝もどす、Ctrl+Y・Ctrl+Shift+Z＝すすむ
  addEventListener('keydown', e => {
    if (RG.screen !== 'draw' || !RG.ed || stage.querySelector('.modal') || !(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); RG.ed.undo(); }
    else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); RG.ed.redo(); }
  });
})(window.RG);
