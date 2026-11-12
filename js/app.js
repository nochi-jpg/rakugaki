// ===== 画面（タイトル・はじめて設定・ホーム・モンスター・つくる・せってい）と おはなし =====
(function (RG) {
  'use strict';
  const UI = RG.ui, stage = UI.stage, IC = UI.IC, esc = UI.esc;
  const { show, modal, closeModal, ask, tell, toast, guide, pickFile, sfx } = UI;
  const SAVE_KEY = 'rakugaki_save_v1';
  const mk = RG.mkCanvas;

  // ---- セーブ ----
  let S = { v: 1, player: null, mons: [], se: true };
  const CACHE = {};   // モンスターID → {pid: canvas}
  function load() { try { const t = localStorage.getItem(SAVE_KEY); if (t) { const o = JSON.parse(t); if (o && o.v === 1) S = o; } } catch (e) { } S.tips = S.tips || {}; }
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); return true; } catch (e) { toast('ほぞん できなかったよ。PNGで だしておいてね'); return false; } }
  const imgCanvas = url => new Promise(res => { const im = new Image(); im.onload = () => { const c = mk(im.naturalWidth, im.naturalHeight); c.getContext('2d').drawImage(im, 0, 0); res(c); }; im.onerror = () => res(null); im.src = url; });
  async function cacheMon(m) { const o = {}; for (const pid in m.parts) { const c = await imgCanvas(m.parts[pid]); if (c) o[pid] = c; } CACHE[m.id] = o; }
  const getter = UI.getter = m => pid => (CACHE[m.id] || {})[pid] || null;
  const isMine = m => S.player && m.creator.id === S.player.id;
  RG.isOpen = k => !!(S.player && S.player.shapes.includes(k));
  // はじめての ときだけ true（えふでちゃんの せつめいを 1回だけ 出す ため）
  const first = UI.first = key => { if (S.tips[key]) return false; S.tips[key] = 1; save(); return true; };

  // ================= おはなし（せかいかん）=================
  // 「まっしろの くに」：ノートの 中に ある、線だけの せかい。いろが きえて しまったが、
  // 子どもが かいた らくがきには いろが つき、「らくがきモンスター」に なる。まなび（せいかい）が いろの ちからに なる。
  // えふで＝ふでの せいれいで、プレイヤーの あいぼう。「のらくがき」＝くにに すむ、あそびたがりの らくがき（れんしゅうの あいて）。
  const STORY = [
    ['normal', 'やあ！ ここは「まっしろの くに」。\nノートの なかに ある、せん だけの せかい だよ'],
    ['sad', 'むかしは いろで いっぱい だったんだ。\nでも いつのまにか、いろが ぜんぶ きえちゃった…'],
    ['surprise', 'ところがね！ きみが かいた らくがき には、\nちゃんと いろが つくんだ'],
    ['teach', 'いろの ついた らくがきは うごきだして、\n「らくがきモンスター」に なるよ'],
    ['joy', 'モンスターは、きみが もんだいに せいかい するたび\nちからを だす。まなびが いろの ちからに なるんだ！'],
    ['wink', 'わたしは「えふで」。きみの あいぼう だよ。\nいっしょに この くにを いろで いっぱいに しよう！'],
  ];
  const HOME_LINES = [
    ['normal', 'きょうは どの きょうかを れんしゅう する？'],
    ['teach', 'モンスターの いろで、とくいな きょうかが きまるよ'],
    ['wink', 'まちがえても だいじょうぶ。こたえを みて おぼえれば、つぎは せいかい できるよ'],
    ['joy', 'れんしゅうで かつと コインが もらえるよ。おみせも のぞいて みてね'],
    ['think', 'まっしろの くにに、すこしずつ いろが もどって きた きがする…'],
    ['normal', 'ともだちの モンスターの PNGが あれば、たいせん できるよ'],
    ['teach', 'モンスターは PNGで ほぞん しておくと あんしん だよ'],
    ['surprise', 'のらくがきたちが、きみと あそびたがって いるみたい！'],
    ['wink', 'あたらしい モンスターを かくと、きぶんも かわるよ'],
  ];
  const colorLine = () => S.player.grade <= 2 ? 'あかは こくご、あおは さんすう、\nきいろと みどりは せいかつ だよ' : 'あかは こくご、あおは さんすう、きいろは しゃかい、\nみどりは りか、むらさきは えいご だよ';

  // =============== タイトル ===============
  const DECO = `<svg class="deco" viewBox="0 0 1280 720" fill="none" stroke="#111" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <g class="fl a"><path d="M150 120c-20 0-30 14-22 26-16 2-18 24 0 26h70c18-2 18-22 2-26 4-18-16-28-28-18-4-6-12-8-22-8z"/></g>
    <g class="fl b"><path d="M1040 90c-16 0-24 12-18 22-13 2-14 20 0 22h58c15-2 15-18 2-22 3-15-13-23-23-15-4-5-10-7-19-7z"/></g>
    <g class="fl c"><path d="M250 250l5 12 13 2-10 9 3 13-11-7-11 7 3-13-10-9 13-2z"/><path d="M1090 300l4 9 10 1-8 7 3 10-9-5-9 5 3-10-8-7 10-1z"/><path d="M960 180l3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1z"/></g>
    <g><path d="M-10 640c200-14 420 10 640 0s430-12 660 2" stroke-width="4"/>
      <path d="M90 640c2-22-6-34-14-44M104 640c0-26 2-40 10-54M118 640c2-18 10-28 20-34"/><path d="M1130 640c2-22-6-34-14-44M1144 640c0-26 2-40 10-54M1158 640c2-18 10-28 20-34"/>
      <path d="M330 640c0-14-4-22-10-28M342 640c0-16 2-24 8-32"/><path d="M930 642c0-14-4-22-10-28M942 642c0-16 2-24 8-32"/></g></svg>`;
  function title() {
    UI.bgm('title');
    show('title', `${DECO}<div class="tlogo"><span class="tl1">${[...'らくがき'].map((c, i) => `<i style="animation-delay:${i * 90}ms">${c}</i>`).join('')}</span><span class="tl2">学習バトル</span></div>
      <div class="tefude">${UI.efude('joy')}</div>
      <div class="tbtns"><button class="btn huge strong" data-a="go" data-se="decide">${IC.play}<span>はじめる</span></button><button class="btn" data-a="load">${IC.load}<span>データを よみこむ</span></button></div>
      <div class="ver">ver ${RG.VERSION}</div>`, {
      async go() { if (S.player) return home(); await opening(); setupName(); },
      async load() {
        const f = await pickFile(); if (!f) return;
        const p = RG.readPlayerPNG(await RG.fileToCanvas(f));
        if (S.player && !(await ask(`いまの データ（${esc(S.player.name)}）を「${esc(p.name)}」の データに かえるよ。いい？<br><span class="note">モンスターは そのまま のこるよ</span>`))) return;
        S.player = p; S.mons.forEach(m => { m.gem = 0; }); save(); await tell(`「${esc(p.name)}」の データを よみこんだよ。<br><span class="note">モンスターは 1たいずつ PNGから よみこんでね</span>`, 'joy'); home();
      },
    });
  }
  // さいしょの おはなし
  async function opening() {
    UI.bgm('story'); show('story', `${DECO}`, {});
    await UI.talk(STORY);
  }

  // =============== はじめて設定 ===============
  function setupName() {
    const K = { val: '', kata: false };
    K.onChange = () => { document.getElementById('ok').classList.toggle('off', !K.val); };
    show('setup', guide('さいしょに、きみの なまえを おしえてね（6もじまで）', 'normal') + UI.kanaHTML() + `<button class="btn strong off okbtn" id="ok" data-a="ok" data-se="decide">${IC.check}<span>これで きまり</span></button>`,
      Object.assign(UI.kanaActs(K, 6), { ok() { setupGrade(K.val); } }));
  }
  function setupGrade(name, editing) {
    show('grade', (editing ? UI.top('がくねん') : '') + guide(editing ? 'なんねんせいに かえる？' : `${esc(name)}さん、よろしくね！<br>いま なんねんせい？`, 'joy') +
      `<div class="grades">${[1, 2, 3, 4, 5, 6].map(g => `<button class="btn g${editing && S.player.grade === g ? ' on' : ''}" data-a="g" data-g="${g}"><b>${g}</b><span>ねんせい</span></button>`).join('')}</div>`, {
      g(b) {
        const g = +b.dataset.g;
        if (editing) { S.player.grade = g; save(); settings(); return; }
        S.player = { name, id: RG.newId(), grade: g, coins: 0, gems: [], shapes: ['slime'], slots: 1, day: 0, doneA: 0, doneB: 0, bonus: 0, bought: 0, tutorial: false };
        save(); setupKana();
      },
      back() { settings(); },
    });
  }
  // もんだいの もじを えらぶ（あとで せっていで かえられる）
  function setupKana() {
    show('kana', guide('もんだいの もじは、どっちに する？<br>あとで「せってい」で かえられるよ', 'teach') +
      `<div class="faces"><button class="btn fc km" data-a="k" data-v="0">${IC.s0}<b>かんじモード</b><em>ならった かんじを つかう</em><span class="sample">山に のぼる</span></button><button class="btn fc km" data-a="k" data-v="1"><i class="kanaic">あ</i><b>ひらがなモード</b><em>ぜんぶ ひらがなと カタカナ</em><span class="sample">やまに のぼる</span></button></div>`,
      { k(b) { S.kana = b.dataset.v === '1'; save(); tutorialIntro(); } });
  }
  async function tutorialIntro() {
    show('intro', DECO + `<div class="introbox">${UI.efude('teach')}<div class="box bubble big">まずは いっしょに、さいしょの モンスター<br>「スライム」を かいて みよう！</div></div>
      <button class="btn huge strong introbtn" data-a="go" data-se="decide">${IC.pen}<span>かいてみる</span></button>`, { go() { startMake({ shape: 'slime', tutorial: true }); } });
  }

  // =============== ホーム ===============
  let lineNo = -1;
  function home() {
    RG.making = false;
    if (S.player && !S.player.tutorial && !S.mons.length) return tutorialIntro();
    UI.bgm('home');
    const p = S.player, bonus = RG.items.loginBonus(), left = RG.items.left(), gems = RG.gemsOn();
    if (S.fav == null || S.fav >= S.mons.length) S.fav = 0;
    const m = S.mons[S.fav];
    lineNo = (lineNo + 1 + Math.floor(Math.random() * (HOME_LINES.length - 1))) % HOME_LINES.length;
    const line = bonus ? ['joy', 'おかえり！ きょうの ログインボーナス、コイン 100 だよ'] : HOME_LINES[lineNo];
    show('home', `<div class="hbar"><div class="chip who">${IC.monster}<b>${esc(p.name)}</b><span>${p.grade}ねんせい</span></div><div class="hbar-r">${UI.coin(p.coins)}<button class="btn round" data-a="set" aria-label="せってい">${IC.gear}</button></div></div>
      <div class="hstage">${m ? `<canvas id="hm" width="560" height="380" data-a="mon" data-se="flip"></canvas><div class="hmname">${esc(m.name)}</div>` : '<div class="hempty">モンスターが いないよ。<br>「モンスター」で つくろう</div>'}<i class="hground"></i></div>
      <div class="hefude">${UI.efude(line[0])}<div class="box bubble" data-a="line" data-se="flip">${line[1]}</div></div>
      <div class="hmenu">
        <button class="btn mainbtn strong" data-a="prac" data-se="decide">${IC.battle}<span><b>れんしゅう バトル</b><em>${left ? `きょう あと ${left}かい` : 'きょうは ぜんぶ クリア！'}</em></span></button>
        <button class="btn mainbtn" data-a="vs">${IC.friends}<span><b>ともだちと たいせん</b><em>1だいで ふたりで あそぶ</em></span></button>
        <div class="hsub${gems ? '' : ' two'}"><button class="btn sq" data-a="chars">${IC.monster}<span>モンスター</span></button>${gems ? `<button class="btn sq" data-a="gems">${IC.gem}<span>ほうせき</span></button>` : ''}<button class="btn sq" data-a="shop">${IC.shop}<span>おみせ</span></button></div>
      </div>`, {
      chars() { chars(); }, set() { settings(); }, prac() { RG.battle.practice(); }, vs() { RG.battle.versus(); }, gems() { RG.items.gemScreen(); }, shop() { RG.items.shop(); },
      mon() { detail(m, true); },
      line(b) { lineNo = (lineNo + 1) % HOME_LINES.length; const l = HOME_LINES[lineNo]; b.textContent = l[1]; stage.querySelector('.hefude .efude').src = RG.ASSETS.img['efude_' + l[0]]; },
    });
    if (m) RG.play(document.getElementById('hm'), m, getter(m), { maxScale: 1.25 });
    if (bonus) sfx('ok');
    if (first('home')) UI.coach([
      ['[data-a=prac]', 'teach', 'ここで「のらくがき」と れんしゅう バトルが できるよ。かつと コインが もらえるんだ'],
      ['.hstage', 'normal', 'これが きみの モンスター。おすと くわしく みられるよ'],
      ['.hsub', 'normal', 'モンスターを ふやしたり、おみせで かいものを したり できるよ'],
      ['[data-a=prac]', 'joy', 'まずは「れんしゅう バトル」を やってみよう！'],
    ]);
  }

  // =============== モンスター ===============
  function chars() {
    RG.making = false; UI.bgm('home');
    const cards = [];
    for (let i = 0; i < 6; i++) {
      const m = S.mons[i];
      if (m) cards.push(`<button class="btn card" data-a="open" data-i="${i}"><canvas width="340" height="180" data-mon="${i}"></canvas><b>${esc(m.name)}</b>${i === S.fav ? `<i class="favmark">${IC.star}</i>` : ''}</button>`);
      else if (i < S.player.slots) cards.push(`<button class="btn card empty" data-a="make">${IC.plus}<b>あたらしく つくる</b></button>`);
      else cards.push(`<div class="card locked">${IC.lock}<span>おみせの「かくちょう」で ふえるよ</span></div>`);
    }
    show('chars', UI.top('モンスター', `<button class="btn" data-a="imp">${IC.load}<span>PNGを よみこむ</span></button><button class="btn" data-a="all">${IC.save}<span>ぜんぶ ほぞん</span></button>`) +
      `<div class="cards">${cards.join('')}</div>`, {
      back() { home(); }, open(b) { detail(S.mons[+b.dataset.i]); }, make() { pickShape(); }, imp() { importMon(); }, all() { exportAll(); },
    });
    stage.querySelectorAll('canvas[data-mon]').forEach(c => { const m = S.mons[+c.dataset.mon]; RG.drawMon(c.getContext('2d'), m, getter(m), 6, 6, 328, 168, { maxScale: 1 }); });
  }
  async function importMon() {
    const f = await pickFile(); if (!f) return;
    const r = RG.readMonPNG(await RG.fileToCanvas(f)), q = r.mon;
    const old = S.mons.findIndex(m => m.id === q.id);
    if (old >= 0) { if (!(await ask(`「${esc(S.mons[old].name)}」は もう いるよ。うわがき する？`))) return; }
    else if (S.mons.length >= S.player.slots) return tell('わくが いっぱいだよ。<br>どれかを PNGで だしてから にがしてね', 'worry');
    const m = { id: q.id, name: q.name, shape: q.shape, face: q.face, parts: {}, adj: q.adj, free: q.free || {}, motion: q.motion, gem: 0, r5: q.r5, r4: q.r4, creator: q.creator, grade: q.grade, date: q.date };
    for (const pid in r.parts) m.parts[pid] = r.parts[pid].toDataURL('image/png');
    CACHE[m.id] = r.parts;
    if (old >= 0) S.mons[old] = m; else S.mons.push(m);
    save(); sfx('good');
    const notes = [];
    if (r.blurry) notes.push('すこし ぼやけて よみこんだよ');
    if (q.gem) notes.push('ほうせきは はずれたよ');
    if (!isMine(m)) notes.push(`うみのおやは ${esc(m.creator.name)}さん。えは なおせないよ`);
    await tell(`「${esc(m.name)}」が なかまに なったよ！` + (notes.length ? `<br><span class="note">${notes.join('<br>')}</span>` : ''), 'joy');
    chars();
  }
  async function exportAll() {
    if (!S.mons.length) return toast('まだ モンスターが いないよ');
    if (!(await ask(`モンスター ${S.mons.length}たい と プレイヤーデータを PNGで だすよ。<br><span class="note">ほぞんの かくにんが でたら「きょか」してね</span>`, 'だす'))) return;
    for (const m of S.mons) { await RG.download(RG.buildMonPNG(m, getter(m)), fileName(m)); await new Promise(r => setTimeout(r, 500)); }
    await RG.download(RG.buildPlayerPNG(S.player), `rakugaki_player_${S.player.name}.png`);
    toast('ぜんぶ だしたよ');
  }
  const fileName = m => `rakugaki_${m.name}_${(m.id >>> 0).toString(16)}.png`;
  // PNGを 見せて、ほぞんする
  function showPNG(cv, fname, title) {
    return new Promise(res => {
      modal(`<p class="mtext s">${title}</p><img class="pngview savable" alt=""><p class="note">ほぞん できない ときは、がぞうを ながおし（みぎクリック）して ほぞんしてね</p>
        <div class="row c"><button class="btn" data-a="n">とじる</button><button class="btn strong" data-a="y">${IC.save}<span>ほぞんする</span></button></div>`,
        { async y() { await RG.download(cv, fname); toast('ほぞんしたよ'); }, n() { closeModal(); res(); } });
      stage.querySelector('.pngview').src = cv.toDataURL('image/png');
    });
  }
  function statsHTML(m) {
    const n = S.player.grade <= 2 ? 4 : 5;
    return `<div class="stats">${RG.stats(m, S.player.grade).map((s, i) => `<div class="st">${IC['s' + (n === 4 && i > 1 ? i : i)]}<span>${s.name}</span><i><em style="width:${Math.min(100, s.v / 10)}%"></em></i><b>${s.v}</b></div>`).join('')}</div>`;
  }
  function detail(m, fromHome) {
    const mine = isMine(m); RG.items.owners();
    const idx = S.mons.indexOf(m), fav = idx === S.fav;
    show('detail', UI.top(esc(m.name)) +
      `<div class="pstage"><canvas id="pv" width="560" height="440"></canvas><i class="hground"></i></div>
      <div class="dinfo"><p class="dsub">${IC[m.shape] || ''}${RG.SHAPES[m.shape].name}・${RG.SHAPES[m.shape].motions[m.motion] || ''}　うみのおや：${esc(m.creator.name)}</p>${statsHTML(m)}${RG.items.slotsHTML(m)}
      <div class="dbtns"><button class="btn${fav ? ' on' : ''}" data-a="fav">${IC.star}<span>${fav ? 'あいぼう' : 'あいぼうに する'}</span></button><button class="btn${mine ? '' : ' off'}" data-a="edit">${IC.pen}<span>なおす</span></button></div>
      <div class="dbtns"><button class="btn" data-a="png">${IC.save}<span>PNGで だす</span></button><button class="btn" data-a="bye">${IC.bye}<span>にがす</span></button></div>
      ${mine ? '' : '<p class="note">えを なおせるのは うみのおや だけだよ</p>'}</div>`, {
      back() { fromHome ? home() : chars(); },
      async gslot() { if (await RG.items.slotTap(m)) detail(m, fromHome); },
      fav() { S.fav = idx; save(); sfx('good'); detail(m, fromHome); },
      edit() { startMake({ shape: m.shape, edit: m }); },
      async png() { await showPNG(RG.buildMonPNG(m, getter(m)), fileName(m), `「${esc(m.name)}」の PNG`); },
      async bye() {
        if (!(await ask(`「${esc(m.name)}」を にがすよ。もとには もどせないよ。<br><span class="note">さきに PNGで だしておくと、あとで よびだせるよ</span>`, 'にがす'))) return;
        S.mons = S.mons.filter(x => x !== m); delete CACHE[m.id]; S.fav = 0; save(); chars();
      },
    });
    RG.play(document.getElementById('pv'), m, getter(m), { maxScale: 1.3 });
  }

  // =============== モンスターを つくる ===============
  let D = null;   // つくっている とちゅうの データ
  function pickShape() {
    if (S.mons.length >= S.player.slots) return tell('わくが いっぱいだよ', 'worry');
    show('shape', UI.top('からだを えらぶ') + guide('どの からだに する？', 'normal') + `<div class="shapes">` +
      RG.SHAPE_ORDER.map(k => {
        const open = S.player.shapes.includes(k) && RG.SHAPES[k];
        return open ? `<button class="btn shp" data-a="s" data-s="${k}">${IC[k]}<b>${RG.SHAPE_NAMES[k]}</b></button>` : `<div class="shp locked">${IC.lock}<b>${RG.SHAPE_NAMES[k]}</b><span>おみせで かえるよ</span></div>`;
      }).join('') + `</div>`, { back() { chars(); }, s(b) { startMake({ shape: b.dataset.s }); } });
  }
  function startMake(o) {
    const e = o.edit;
    D = { shape: o.shape, tutorial: !!o.tutorial, edit: e || null, face: e ? e.face : 0, adj: e ? JSON.parse(JSON.stringify(e.adj || {})) : {}, motion: e ? e.motion : 0, name: e ? e.name : '', parts: e ? Object.assign({}, CACHE[e.id]) : {}, free: e ? JSON.parse(JSON.stringify(e.free || {})) : {} };
    RG.making = true; UI.bgm('make');
    e ? drawScreen() : pickFace();
  }
  function pickFace() {
    show('face', (D.tutorial ? '' : UI.top('むきを えらぶ')) + guide('モンスターは どっちを むく？<br>やじるしの ほうへ すすむよ', 'teach') +
      `<div class="faces"><button class="btn fc" data-a="f" data-f="1">${IC.left}<b>ひだりむき</b></button><button class="btn fc" data-a="f" data-f="0">${IC.right}<b>みぎむき</b></button></div>`,
      { back() { RG.making = false; pickShape(); }, f(b) { D.face = +b.dataset.f; drawScreen(); } });
  }

  // ---- おえかき ----
  function drawScreen() {
    let parts = RG.usableParts(D);
    // スライムの じゆうパーツ：解禁した体形の パーツを 4つまで
    const kinds = () => D.shape === 'slime' ? Object.keys(RG.FREE_KINDS).filter(k => RG.FREE_KINDS[k].need.some(RG.isOpen)) : [];
    const freeCount = () => Object.keys(D.free).length;
    const plistHTML = () => parts.map(p => `<button class="btn pt" data-a="part" data-p="${p.id}" data-se="flip"><canvas width="100" height="64" data-th="${p.id}"></canvas><b>${p.name}</b><i class="ptmark">${IC.check}</i>${p.req ? '' : '<em>じゆう</em>'}</button>`).join('') +
      (kinds().length && freeCount() < RG.FREE_MAX ? `<button class="btn pt add" data-a="addfree">${IC.plus}<b>パーツを たす</b><em>あと ${RG.FREE_MAX - freeCount()}こ</em></button>` : '');
    // じゆうパーツの しゅるいを えらぶ（slot＝わく番号。すでに ある わくなら「はずす」も 出す）
    const chooseKind = slot => new Promise(res => {
      const has = !!D.free[slot];
      modal(`<p class="mtext s">${has ? 'どの パーツに かえる？' : 'どの パーツを つける？'}</p><div class="kinds">${kinds().map(k => `<button class="btn${has && D.free[slot].k === +k ? ' on' : ''}" data-a="k" data-k="${k}">${RG.FREE_KINDS[k].name}</button>`).join('')}</div>
        <div class="row c">${has ? `<button class="btn" data-a="rm">${IC.trash}<span>はずす</span></button>` : ''}<button class="btn" data-a="n">やめる</button></div>`,
        { k(b) { closeModal(); res(+b.dataset.k); }, rm() { closeModal(); res(-1); }, n() { closeModal(); res(0); } });
    });
    const rebuild = () => { parts = RG.usableParts(D); const pl = stage.querySelector('.plist'); pl.className = 'plist' + (parts.length > 8 ? ' many' : ''); pl.innerHTML = plistHTML(); refresh(); ed.render(); };
    show('draw', `<div class="dhead">${UI.efude('teach')}<div class="box bubble" id="hint"></div><div class="chip dir">${D.face ? IC.left + 'ひだりむき' : 'みぎむき' + IC.right}</div><button class="btn" data-a="quit">${IC.x}<span>やめる</span></button></div>
      <div class="tools">
        <h4>どうぐ</h4>
        <div class="trow"><button class="btn t on" data-a="tool" data-t="pen" data-se="flip">${IC.pen}<span>ペン</span></button><button class="btn t" data-a="tool" data-t="eraser" data-se="flip">${IC.eraser}<span>けしごむ</span></button><button class="btn t" data-a="tool" data-t="fill" data-se="flip">${IC.fill}<span>バケツ</span></button></div>
        <h4>ふとさ</h4>
        <div class="trow">${RG.SIZES.map(([n, px], i) => `<button class="btn t sz${i === 1 ? ' on' : ''}" data-a="size" data-s="${px}" data-se="flip"><i style="width:${[6, 12, 22][i]}px;height:${[6, 12, 22][i]}px"></i><span>${n}</span></button>`).join('')}</div>
        <h4>いろ<button class="lnk" data-a="pal" id="bPal" data-se="flip">${IC.pal}<span id="palTx">もっと いろ</span></button></h4>
        <div class="pal simple" id="pal">${RG.COLORS.map(c => `<button class="sw" data-a="col" data-c="${c[1]}" data-se="place" style="background:${c[1]}" aria-label="${c[0]}"></button>`).join('')}</div>
        <div class="pal pro hide" id="palPro">${RG.PRO.map(c => `<button class="sw" data-a="col" data-c="${c[1]}" data-se="place" style="background:${c[1]}" aria-label="${c[0]}"></button>`).join('')}</div>
        <div class="tbottom">
          <div class="trow"><button class="btn t" data-a="undo" id="bUndo" data-se="flip">${IC.undo}<span>もどす</span></button><button class="btn t" data-a="redo" id="bRedo" data-se="flip">${IC.redo}<span>すすむ</span></button><button class="btn t" data-a="clear">${IC.trash}<span>ぜんけし</span></button></div>
        </div>
      </div>
      <div class="paper"><canvas id="cv"></canvas></div>
      <div class="vrow"><div class="seg"><button class="btn t on" data-a="view" data-v="0" data-se="flip">${IC.single}<span>この パーツ</span></button><button class="btn t" data-a="view" data-v="1" data-se="flip">${IC.multi}<span>ぜんたい</span></button></div>
        <button class="btn t on" data-a="gd" id="bGd" data-se="flip">${IC.guide}<span id="gdTx">ガイド</span></button><button class="btn t" data-a="penonly" id="bPen" data-se="flip">${IC.penonly}<span>ペンだけ</span></button></div>
      <h4 class="plabel">パーツ</h4>
      <div class="plist${parts.length > 8 ? ' many' : ''}">${plistHTML()}</div>
      <button class="btn strong donebtn" data-a="done" data-se="none">${IC.check}<span>かんせい</span></button>`, {
      tool(b) { ed.st.tool = b.dataset.t; mark('[data-a=tool]', b); },
      size(b) { ed.st.size = +b.dataset.s; mark('[data-a=size]', b); },
      col(b) { ed.st.color = b.dataset.c; if (ed.st.tool === 'eraser') { ed.st.tool = 'pen'; mark('[data-a=tool]', stage.querySelector('[data-t=pen]')); } mark('.sw', b); },
      undo() { ed.undo(); }, redo() { ed.redo(); },
      async clear() { if (ed.hasInk(ed.cur) && await ask('この パーツを ぜんぶ けすよ。いい？<br><span class="note">「もどす」で もとに もどせるよ</span>', 'けす')) ed.clear(); },
      penonly(b) { ed.st.penOnly = !ed.st.penOnly; b.classList.toggle('on', ed.st.penOnly); },
      pal() { const pro = document.getElementById('pal').classList.toggle('hide'); document.getElementById('palPro').classList.toggle('hide', !pro); document.getElementById('palTx').textContent = pro ? 'すくなく' : 'もっと いろ'; },
      view(b) { ed.st.gattai = b.dataset.v === '1'; mark('[data-a=view]', b); ed.render(); },
      gd(b) { ed.st.guide = !ed.st.guide; b.classList.toggle('on', ed.st.guide); ed.render(); },
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
        if (miss.length) { sfx('ng'); ed.blink(miss); refresh(); setHint(miss[0].text + '（あかく ひかっている ところ）', 'worry'); return; }
        sfx('good'); D.parts = ed.result(); kumi();
      },
    });
    const mark = (sel, b) => { stage.querySelectorAll(sel).forEach(x => x.classList.remove('on')); if (b) b.classList.add('on'); };
    const ed = new RG.Editor(document.getElementById('cv'), { shape: D.shape, face: D.face, adj: D.adj, free: D.free, sources: D.parts, onChange: () => refresh() });
    RG.ed = ed;
    mark('.sw', stage.querySelector('.sw'));
    let lastHint = '';
    function setHint(t, pose) {
      if (t === lastHint) return; lastHint = t;
      const h = document.getElementById('hint'); h.textContent = t; h.classList.remove('bump'); void h.offsetWidth; h.classList.add('bump');
      stage.querySelector('.dhead .efude').src = RG.ASSETS.img['efude_' + pose];
    }
    function refresh() {
      mark('[data-a=part]', stage.querySelector(`[data-p=${ed.cur}]`));
      document.getElementById('bUndo').classList.toggle('off', !ed.canUndo()); document.getElementById('bRedo').classList.toggle('off', !ed.canRedo());
      for (const p of parts) {
        const c = stage.querySelector(`[data-th=${p.id}]`), x = c.getContext('2d'), src = ed.canvasOf(p.id);
        x.clearRect(0, 0, 100, 64); if (src) { const s = Math.min(100 / p.w, 64 / p.h); x.drawImage(src, (100 - p.w * s) / 2, (64 - p.h * s) / 2, p.w * s, p.h * s); }
        c.parentNode.classList.toggle('has', !!src);
      }
      const miss = ed.check(), cur = RG.partOf(D, ed.cur) || RG.part(D.shape, ed.cur);
      let t, pose = 'teach';
      if (!miss.length) { t = 'いいね！ できたら「かんせい」を おそう。「ぜんたい」で くみあわせも みられるよ'; pose = 'joy'; }
      else if (!ed.hasInk(ed.cur)) t = `「${cur.name}」を かこう。てんせんの なかなら、どんな かたちでも いいよ` + (cur.parent || parts.some(c => c.parent === cur.id) ? '。ちゃいろの まるは つなぎめ。まるの なかにも かいてね' : '');
      else { const m = miss.find(x => x.pid === ed.cur) || miss[0]; t = m.text + (m.pid !== ed.cur ? '（みぎの パーツを おして きりかえよう）' : ''); pose = 'normal'; }
      if (cur.free && !miss.some(x => x.pid === ed.cur)) t = `「${cur.name}」は、つぎの「くみたて」で すきな ばしょに つけられるよ。もういちど おすと、かえたり はずしたり できるよ`;
      setHint(t, pose);
    }
    refresh();
    if (D.tutorial && first('draw')) UI.coach([
      ['.paper', 'teach', 'ここが かみ だよ。てんせんの なかに、モンスターの「からだ」を かこう'],
      ['.tools', 'normal', 'ひだりで どうぐと いろを えらべるよ。バケツは、かこんだ なかを ぬれるんだ'],
      ['.paper', 'teach', 'ちゃいろの まるは「つなぎめ」。まるの なかにも かならず かいてね'],
      ['.plist', 'normal', 'からだが かけたら、ここで「つの」に きりかえて、つのも かこう'],
      ['.donebtn', 'joy', 'ぜんぶ かけたら「かんせい」を おしてね！'],
    ]);
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
    show('kumi', UI.top('くみたて', '', 'えを なおす') + guide(kids.some(p => p.free) ? 'じゆうパーツは、えを なぞって すきな ばしょへ うごかそう' : 'つなぎめを すこし うごかせるよ。このままで よければ「つぎへ」', 'teach') +
      `<div class="pstage kprev"><canvas id="pv" width="640" height="460"></canvas></div>
      <div class="kside"><h4>うごかす パーツ</h4><div class="klist">${kids.map(p => `<button class="btn t kp" data-a="sel" data-p="${p.id}" data-se="flip">${p.name}</button>`).join('')}</div>
        <div class="krow"><div class="pad"><button class="btn t" data-a="mv" data-d="0,-1" data-se="place" style="grid-area:u" aria-label="うえ">${IC.up}</button><button class="btn t" data-a="mv" data-d="-1,0" data-se="place" style="grid-area:l" aria-label="ひだり">${IC.left}</button><button class="btn t" data-a="mv" data-d="1,0" data-se="place" style="grid-area:r" aria-label="みぎ">${IC.right}</button><button class="btn t" data-a="mv" data-d="0,1" data-se="place" style="grid-area:d" aria-label="した">${IC.down}</button></div>
        <div class="kopt"><button class="btn t wide" data-a="z" data-se="flip">${IC.layers}<span id="bz"></span></button><button class="btn t wide" data-a="reset" data-se="flip">${IC.retry}<span>もとに もどす</span></button></div></div>
      </div><button class="btn strong donebtn" data-a="next">${IC.right}<span>つぎへ</span></button>`, {
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
          if (!RG.inkAt(D.parts.body, RG.jx(body, [f.x, f.y], D.face))) { sel = p.id; draw(); return tell(`「${p.name}」が からだから はなれているよ。<br>からだの えの うえに つけてね`, 'worry'); }
        }
        motion();
      },
    });
    // じゆうパーツは、えの 上を なぞって うごかせる
    const pv = document.getElementById('pv'), CW = 640, CH = 460;
    const toBody = e => { const b = pv.getBoundingClientRect(), r = drag.r, cx = (e.clientX - b.left) * CW / b.width, cy = (e.clientY - b.top) * CH / b.height; return [D.face ? r.L.x1 - (cx - r.ox) / r.s : (cx - r.ox) / r.s + r.L.x0, (cy - r.oy) / r.s + r.L.y0]; };
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
      const x = pv.getContext('2d'); x.clearRect(0, 0, CW, CH);
      const r = RG.drawMon(x, D, pid => D.parts[pid] || null, 20, 20, CW - 40, CH - 40, { maxScale: 1.6 });
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
    if (D.tutorial && first('kumi')) UI.talk([['teach', 'つぎは「くみたて」。\nパーツの つなぎめを すこし うごかせるよ'], ['normal', 'このままで よければ、みぎしたの「つぎへ」を おそう']]);
  }
  // ---- モーション（3パターンから えらぶ。5つの うごきを ためせる）----
  function motion() {
    const ms = RG.SHAPES[D.shape].motions;
    show('motion', UI.top('うごき') + guide('どんな うごきに する？ したの ボタンで ためせるよ', 'normal') +
      `<div class="pstage mprev"><canvas id="pv" width="560" height="380"></canvas><i class="hground"></i></div>
      <div class="arow">${RG.ACTIONS.map(a => `<button class="btn t ac${a === 'idle' ? ' on' : ''}" data-a="act" data-k="${a}" data-se="flip">${IC[UI.ACTION_IC[a]]}<span>${RG.ACTION_NAMES[a]}</span></button>`).join('')}</div>
      <div class="mlist"><h4>うごきを えらぶ</h4>${ms.map((n, i) => `<button class="btn mo${i === D.motion ? ' on' : ''}" data-a="m" data-i="${i}" data-se="flip"><i>${i + 1}</i><b>${n}</b></button>`).join('')}</div>
      <button class="btn strong donebtn" data-a="next">${IC.right}<span>つぎへ</span></button>`, {
      back() { kumi(); },
      m(b) { D.motion = +b.dataset.i; pl.motion = D.motion; stage.querySelectorAll('.mo').forEach(x => x.classList.toggle('on', x === b)); setAct('attack'); },
      act(b) { setAct(b.dataset.k); },
      next() { nameMon(); },
    });
    const setAct = k => { pl.set(k); stage.querySelectorAll('.ac').forEach(x => x.classList.toggle('on', x.dataset.k === k)); };
    const pl = RG.play(document.getElementById('pv'), D, pid => D.parts[pid] || null, { onEnd() { stage.querySelectorAll('.ac').forEach(x => x.classList.toggle('on', x.dataset.k === 'idle')); } });
    pl.motion = D.motion; RG.pl = pl;
    if (D.tutorial && first('motion')) UI.talk([['joy', 'つぎは「うごき」！\n3つの なかから すきな うごきを えらぼう']]);
  }
  // ---- なまえ ----
  function nameMon() {
    const K = { val: D.name || '', kata: false };
    K.onChange = () => document.getElementById('ok').classList.toggle('off', !K.val);
    show('setup name', UI.top('なまえ') + guide('モンスターに なまえを つけよう（6もじまで）', 'joy') + UI.kanaHTML() + `<button class="btn strong off okbtn" id="ok" data-a="ok" data-se="none">${IC.check}<span>これで きまり</span></button>`,
      Object.assign(UI.kanaActs(K, 6), { back() { D.name = K.val; motion(); }, ok() { D.name = K.val; finish(); } }));
  }
  const BURST = `<svg class="burst" viewBox="0 0 600 480" fill="none" stroke="#111" stroke-width="4" stroke-linecap="round">${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(k => { const a = k * Math.PI / 6 + 0.2, c = Math.cos(a), n = Math.sin(a), r0 = 190 + (k % 2) * 16, r1 = r0 + 30 + (k % 3) * 10; return `<path d="M${300 + c * r0} ${240 + n * r0 * 0.78}L${300 + c * r1} ${240 + n * r1 * 0.78}"/>`; }).join('')}</svg>`;
  async function finish() {
    const ratio = RG.colorRatio(Object.values(D.parts)), e = D.edit;
    const m = e || { id: RG.newId(), gem: 0, creator: { name: S.player.name, id: S.player.id }, date: RG.today() };
    Object.assign(m, { name: D.name, shape: D.shape, face: D.face, adj: D.adj, free: D.free, motion: D.motion, r5: ratio.r5, r4: ratio.r4, grade: S.player.grade, parts: {} });
    for (const pid in D.parts) m.parts[pid] = D.parts[pid].toDataURL('image/png');
    CACHE[m.id] = D.parts;
    if (!e) S.mons.push(m);
    const wasTut = D.tutorial; if (wasTut) S.player.tutorial = true;
    save(); RG.making = false; D = null; sfx('good'); UI.bgm('home');
    show('done', guide(e ? `「${esc(m.name)}」を なおしたよ！` : `「${esc(m.name)}」が うまれたよ！`, 'joy') +
      `<div class="pstage">${BURST}<canvas id="pv" width="560" height="440"></canvas><i class="hground"></i></div>
      <div class="dinfo"><h2>${esc(m.name)}</h2><p class="dsub">つかった いろで、とくいな きょうかが きまるよ</p>${statsHTML(m)}<div class="dbtns"><button class="btn" data-a="png">${IC.save}<span>PNGで だす</span></button><button class="btn strong" data-a="ok">${IC.check}<span>おわる</span></button></div></div>`, {
      async png() { await showPNG(RG.buildMonPNG(m, getter(m)), fileName(m), `「${esc(m.name)}」の PNG`); }, ok() { wasTut ? home() : chars(); },
    });
    RG.play(document.getElementById('pv'), m, getter(m), { action: 'win', maxScale: 1.3 });
    if (wasTut) await UI.talk([['joy', `やったね！ 「${m.name}」が うまれたよ！`], ['teach', 'つかった いろで、とくいな きょうかが きまるんだ。\n' + colorLine()], ['wink', 'それじゃあ「おわる」を おして、ホームへ いこう！']]);
  }

  // =============== せってい ===============
  let verTap = 0;
  function settings() {
    const p = S.player, sw = (a, on, icon, label, text) => `<button class="btn setrow" data-a="${a}" data-se="flip">${icon}<span><b>${label}</b><em>${text}</em></span><i class="tog${on ? ' on' : ''}"></i></button>`;
    show('settings', UI.top('せってい') + `<div class="setgrid">
        <div class="setcol"><h4>プレイヤー</h4>
          <button class="btn setrow" data-a="grade">${IC.monster}<span><b>${esc(p.name)}</b><em>${p.grade}ねんせい（おすと かえられるよ）</em></span></button>
          ${sw('kana', !S.kana, IC.s0, 'もんだいの もじ', S.kana ? 'ひらがな だけ' : 'ならった かんじを つかう')}
          <h4>おと</h4>
          ${sw('se', S.se, S.se ? IC.sound : IC.mute, 'こうかおん', S.se ? 'あり' : 'なし')}
          ${sw('bgm', S.bgm !== false, IC.music, 'おんがく', S.bgm !== false ? 'あり' : 'なし')}
        </div>
        <div class="setcol"><h4>データ</h4>
          <button class="btn setrow" data-a="pp">${IC.save}<span><b>プレイヤーデータを だす</b><em>コインや ほうせきを PNGに ほぞん</em></span></button>
          <button class="btn setrow" data-a="all">${IC.save}<span><b>ぜんぶ まとめて だす</b><em>モンスターも いっしょに ほぞん</em></span></button>
          <h4>そのほか</h4>
          <button class="btn setrow" data-a="how">${IC.help}<span><b>あそびかた</b><em>えふでの せつめいを もういちど</em></span></button>
          <button class="btn setrow" data-a="jukebox">${IC.music}<span><b>おんがくを きく</b><em>ゲームの きょくを ならせるよ</em></span></button>
          <button class="btn setrow" data-a="credit">${IC.star}<span><b>クレジット</b><em>つかっている そざい</em></span></button>
        </div>
        ${RG.debug ? `<div class="box dbg"><h4>テストよう</h4><div class="dgrid"><button class="btn" data-a="t1">からだ ぜんぶ</button><button class="btn" data-a="t2">わく +1</button><button class="btn" data-a="t4">コイン +1000</button><button class="btn" data-a="t5">きょうを もどす</button><button class="btn" data-a="t6">ほうせき +3</button><button class="btn" data-a="t3">データを けす</button></div></div>` : ''}
      </div><button class="ver" data-a="ver" data-se="none">ver ${RG.VERSION}</button>`, {
      // テストよう：バージョンを 7かい おすと 出る
      ver() { verTap++; if (verTap >= 7) { verTap = 0; RG.debug = !RG.debug; settings(); } },
      t4() { p.coins += 1000; save(); toast('コイン +1000'); },
      t5() { p.day = -1; RG.items.rollDay(); toast('きょうの かいすうと おみせを もどしたよ'); },
      async t6() { for (let i = 0; i < 3; i++) await RG.items.give(RG.items.rollGem(Math.random)); toast('ほうせきを 3こ もらったよ'); },
      back() { home(); }, grade() { setupGrade(p.name, true); },
      async pp() { await showPNG(RG.buildPlayerPNG(p), `rakugaki_player_${p.name}.png`, 'プレイヤーデータの PNG'); },
      all() { return exportAll(); },
      se() { S.se = !S.se; save(); settings(); },
      bgm() { S.bgm = S.bgm === false; save(); UI.bgmRefresh(); settings(); },
      kana() { S.kana = !S.kana; save(); settings(); },
      async how() {
        await UI.talk(STORY.concat([
          ['teach', 'モンスターは「モンスター」の がめんで つくれるよ。\nつかった いろで とくいな きょうかが きまるんだ'],
          ['normal', '「れんしゅう バトル」は 60びょう。\nせいかい するたびに モンスターが こうげき するよ'],
          ['joy', 'かつと コインが もらえる。おみせで あたらしい\n「からだ」や「わく」を かおう！'],
        ]));
      },
      // きょくを ためしに 鳴らす
      jukebox() {
        const names = { title: 'タイトル', story: 'おはなし', home: 'ホーム', make: 'つくる', shop: 'おみせ', solve: 'もんだい', watch: 'バトル', win: 'かち', lose: 'まけ' };
        modal(`<p class="mtext">おんがくを きく</p><div class="kinds">${Object.keys(names).map(k => `<button class="btn" data-a="p" data-k="${k}" data-se="none">${IC.music}<span>${names[k]}</span></button>`).join('')}</div><div class="row c"><button class="btn strong" data-a="n">とじる</button></div>`,
          { p(b) { if (S.bgm === false) return toast('「おんがく」が なしに なっているよ'); UI.bgm(null); UI.bgm(b.dataset.k); stage.querySelectorAll('.kinds .btn').forEach(x => x.classList.toggle('on', x === b)); }, n() { closeModal(); UI.bgm(null); UI.bgm('home'); } });
      },
      credit() {
        modal(`<p class="mtext">クレジット</p><div class="credit"><p><b>え</b>　K.nom（えふで・てんしゅ）</p><p><b>フォント</b>　しねきゃぷしょん（chiphead／ひらがな：雑念の塊）</p><p><b>こうかおん</b>　効果音ラボ</p><p><b>おんがく</b>　オリジナル（チップチューン）</p><p><b>もんだい</b>　まなび4択問題データベース</p><p><b>QRコード</b>　qrcode-generator（Kazuhiko Arase）・jsQR（Cosmo Wolfe）</p></div><div class="row c"><button class="btn strong" data-a="n">とじる</button></div>`, { n() { closeModal(); } });
      },
      t1() { p.shapes = RG.SHAPE_ORDER.slice(); save(); toast('からだを ぜんぶ かいきんしたよ'); },
      t2() { p.slots = Math.min(6, p.slots + 1); save(); toast(`わくが ${p.slots}つに なったよ`); },
      async t3() { if (await ask('データを ぜんぶ けすよ。ほんとうに いい？', 'けす')) { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } S = { v: 1, player: null, mons: [], se: true, tips: {} }; title(); } },
    });
  }

  // ---- はじまり ----
  RG.app = { get S() { return S; }, save, title, home, chars, cacheMon, CACHE };
  UI.home = home; UI.DECO = DECO;
  Object.defineProperty(UI, 'seOn', { get() { return S.se; } });
  (async function () {
    load();
    for (const m of S.mons) await cacheMon(m);
    title();
  })();
})(window.RG);
