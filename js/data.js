// ===== らくがき学習バトル：きまりごと（体形テンプレート・パレット・色→教科） =====
window.RG = window.RG || {};
(function (RG) {
  'use strict';
  RG.VERSION = '0.6.0';
  RG.JR = 24;            // 関節の丸の半径
  RG.ADJ_MAX = 20;       // くみたてで ずらせる はば（関節の丸の中まで）
  RG.GUIDE_IN = 6;       // ガイド（描ける範囲）は わくの 6px 内がわ
  RG.PNG_W = 1280; RG.PNG_H = 720;
  RG.QR_SEAT = [1056, 496, 208];        // モンスターPNGの QRの席（x, y, 一辺）
  RG.PREVIEW_SEAT = [780, 240, 260, 240]; // くみたてた すがた（見るだけ。データではない）
  RG.FRAME_COLOR = '#ff00ff';           // 予約色：わく
  RG.JOINT_COLOR = '#00ffff';           // 予約色：関節の めじるし

  // 体形テンプレート。座標は「みぎむき」で書く（ひだりむきは 左右を うらがえす）
  // seat＝PNGの中の席／parent＝つながる相手／pj＝相手がわの関節／cj＝自分がわの関節／z＝1:相手より手前 0:奥
  // ★ PNGの形式を こわさないため、parts の 順番と seat は あとから 変えない（足すときは うしろに）
  RG.SHAPES = {
    slime: {
      no: 0, name: 'スライム',
      parts: [
        { id: 'body', name: 'からだ', w: 320, h: 240, seat: [240, 20], req: true },
        { id: 'horn', name: 'つの', w: 160, h: 160, seat: [580, 20], req: true, parent: 'body', pj: [160, 56], cj: [80, 126], z: 1 },
        // じゆうパーツ（4つまで）。しゅるい・つける位置は モンスターごとに ちがう（m.free）。ここの pj は はじめの位置
        { id: 'free1', free: 1, name: 'じゆう1', w: 160, h: 160, seat: [760, 20], parent: 'body', pj: [86, 150], cj: [80, 126], z: 1 },
        { id: 'free2', free: 2, name: 'じゆう2', w: 160, h: 160, seat: [940, 20], parent: 'body', pj: [234, 150], cj: [80, 126], z: 1 },
        { id: 'free3', free: 3, name: 'じゆう3', w: 160, h: 160, seat: [20, 280], parent: 'body', pj: [104, 84], cj: [80, 126], z: 1 },
        { id: 'free4', free: 4, name: 'じゆう4', w: 160, h: 160, seat: [200, 280], parent: 'body', pj: [216, 84], cj: [80, 126], z: 1 },
      ],
      motions: ['ぷるぷる', 'ぽよーん', 'とろーり'],
    },
    yotsu: {
      no: 1, name: 'よつあし', preview: [840, 244, 200, 236],
      parts: [
        { id: 'body', name: 'どう', w: 320, h: 240, seat: [240, 20], req: true },
        { id: 'face', name: 'かお', w: 240, h: 240, seat: [580, 20], req: true, parent: 'body', pj: [262, 72], cj: [62, 178], z: 1 },
        { id: 'fore1', name: 'まえあし1', w: 120, h: 200, seat: [300, 280], req: true, parent: 'body', pj: [212, 182], cj: [60, 38], z: 1 },
        { id: 'fore2', name: 'まえあし2', w: 120, h: 200, seat: [440, 280], req: true, parent: 'body', pj: [260, 170], cj: [60, 38], z: 0 },
        { id: 'hind1', name: 'うしろあし1', w: 120, h: 200, seat: [20, 280], req: true, parent: 'body', pj: [70, 182], cj: [60, 38], z: 1 },
        { id: 'hind2', name: 'うしろあし2', w: 120, h: 200, seat: [160, 280], req: true, parent: 'body', pj: [118, 170], cj: [60, 38], z: 0 },
        { id: 'tail', name: 'しっぽ', w: 200, h: 200, seat: [20, 40], parent: 'body', pj: [56, 80], cj: [150, 150], z: 0 },
        { id: 'ear', name: 'みみ', w: 120, h: 120, seat: [1100, 20], parent: 'face', pj: [96, 52], cj: [60, 86], z: 1 },
        // とり・さかなを 解禁すると 描ける
        { id: 'wing', name: 'はね', w: 240, h: 200, seat: [840, 20], parent: 'body', pj: [150, 60], cj: [60, 150], z: 1, locked: 'tori' },
        { id: 'fin', name: 'ひれ', w: 160, h: 160, seat: [580, 280], parent: 'body', pj: [150, 40], cj: [80, 126], z: 0, locked: 'sakana' },
      ],
      motions: ['ぴょんぴょん', 'どっしり', 'すばしっこい'],
    },
    // ---- ここから下：PNGの席は 上の段（y=20・高さ240まで）と 下の段（y=280・高さ200まで）に ならべる ----
    tori: {
      no: 2, name: 'とり', preview: [700, 280, 330, 210],
      parts: [
        { id: 'body', name: 'どう', w: 320, h: 240, seat: [20, 20], req: true },
        { id: 'face', name: 'かお', w: 240, h: 240, seat: [360, 20], req: true, parent: 'body', pj: [240, 62], cj: [70, 180], z: 1 },
        { id: 'wing1', name: 'はね1', w: 240, h: 200, seat: [620, 20], req: true, parent: 'body', pj: [172, 96], cj: [196, 52], z: 1 },
        { id: 'wing2', name: 'はね2', w: 240, h: 200, seat: [880, 20], req: true, parent: 'body', pj: [150, 88], cj: [196, 52], z: 0 },
        { id: 'leg1', name: 'あし1', w: 120, h: 200, seat: [20, 280], req: true, parent: 'body', pj: [178, 200], cj: [60, 38], z: 1 },
        { id: 'leg2', name: 'あし2', w: 120, h: 200, seat: [160, 280], req: true, parent: 'body', pj: [134, 196], cj: [60, 38], z: 0 },
        { id: 'tail', name: 'しっぽ', w: 200, h: 200, seat: [300, 280], parent: 'body', pj: [52, 150], cj: [160, 100], z: 0 },
        { id: 'crest', name: 'とさか', w: 160, h: 160, seat: [520, 280], parent: 'face', pj: [110, 50], cj: [80, 126], z: 1 },
      ],
      motions: ['ぱたぱた', 'ひゅーん', 'とことこ'],
    },
    sakana: {
      no: 3, name: 'さかな', preview: [220, 280, 500, 210],
      parts: [
        { id: 'body', name: 'どう', w: 320, h: 240, seat: [20, 20], req: true },
        { id: 'face', name: 'かお', w: 240, h: 240, seat: [360, 20], req: true, parent: 'body', pj: [272, 120], cj: [50, 120], z: 1 },
        { id: 'tailfin', name: 'おびれ', w: 200, h: 200, seat: [620, 20], req: true, parent: 'body', pj: [46, 120], cj: [160, 100], z: 0 },
        { id: 'dorsal', name: 'せびれ', w: 160, h: 160, seat: [840, 20], parent: 'body', pj: [160, 46], cj: [80, 126], z: 0 },
        { id: 'pect1', name: 'むなびれ1', w: 160, h: 160, seat: [1020, 20], parent: 'body', pj: [192, 168], cj: [100, 40], z: 1 },
        { id: 'pect2', name: 'むなびれ2', w: 160, h: 160, seat: [20, 280], parent: 'body', pj: [218, 162], cj: [100, 40], z: 0 },
      ],
      motions: ['すいすい', 'ぴちぴち', 'ゆらゆら'],
    },
    ekitai: {
      no: 4, name: 'えきたい', preview: [220, 280, 500, 210],
      parts: [
        { id: 'low', name: 'からだした', w: 320, h: 240, seat: [360, 20], req: true },
        { id: 'up', name: 'からだうえ', w: 320, h: 240, seat: [20, 20], req: true, parent: 'low', pj: [160, 52], cj: [160, 200], z: 1 },
        { id: 'arm1', name: 'うで1', w: 120, h: 200, seat: [700, 20], parent: 'up', pj: [252, 124], cj: [60, 38], z: 1 },
        { id: 'arm2', name: 'うで2', w: 120, h: 200, seat: [840, 20], parent: 'up', pj: [68, 124], cj: [60, 38], z: 0 },
      ],
      motions: ['どろどろ', 'ぷくぷく', 'ざぶーん'],
    },
    robot: {
      no: 5, name: 'ロボット', preview: [320, 280, 420, 210],
      parts: [
        { id: 'body', name: 'どう', w: 320, h: 240, seat: [20, 20], req: true },
        { id: 'head', name: 'あたま', w: 240, h: 240, seat: [360, 20], req: true, parent: 'body', pj: [160, 46], cj: [120, 200], z: 1 },
        { id: 'arm1', name: 'うで1', w: 120, h: 200, seat: [620, 20], req: true, parent: 'body', pj: [218, 84], cj: [60, 38], z: 1 },
        { id: 'arm2', name: 'うで2', w: 120, h: 200, seat: [760, 20], req: true, parent: 'body', pj: [102, 84], cj: [60, 38], z: 0 },
        { id: 'leg1', name: 'あし1', w: 120, h: 200, seat: [20, 280], req: true, parent: 'body', pj: [200, 200], cj: [60, 38], z: 1 },
        { id: 'leg2', name: 'あし2', w: 120, h: 200, seat: [160, 280], req: true, parent: 'body', pj: [120, 200], cj: [60, 38], z: 0 },
        { id: 'antenna', name: 'アンテナ', w: 160, h: 160, seat: [900, 20], parent: 'head', pj: [120, 46], cj: [80, 126], z: 1 },
        { id: 'back', name: 'せなか', w: 160, h: 160, seat: [1080, 20], parent: 'body', pj: [62, 96], cj: [122, 80], z: 0 },
      ],
      motions: ['がしゃん', 'うぃーん', 'ぴこぴこ'],
    },
    nisoku: {
      no: 6, name: 'にそく', preview: [760, 280, 280, 210],
      parts: [
        { id: 'body', name: 'どう', w: 320, h: 240, seat: [20, 20], req: true },
        { id: 'head', name: 'あたま', w: 240, h: 240, seat: [360, 20], req: true, parent: 'body', pj: [166, 46], cj: [112, 200], z: 1 },
        { id: 'arm1', name: 'うで1', w: 120, h: 200, seat: [620, 20], req: true, parent: 'body', pj: [214, 84], cj: [60, 38], z: 1 },
        { id: 'arm2', name: 'うで2', w: 120, h: 200, seat: [760, 20], req: true, parent: 'body', pj: [112, 84], cj: [60, 38], z: 0 },
        { id: 'leg1', name: 'あし1', w: 120, h: 200, seat: [20, 280], req: true, parent: 'body', pj: [196, 200], cj: [60, 38], z: 1 },
        { id: 'leg2', name: 'あし2', w: 120, h: 200, seat: [160, 280], req: true, parent: 'body', pj: [126, 200], cj: [60, 38], z: 0 },
        { id: 'tail', name: 'しっぽ', w: 200, h: 200, seat: [900, 20], parent: 'body', pj: [60, 172], cj: [160, 60], z: 0 },
        { id: 'ear', name: 'みみ', w: 120, h: 120, seat: [1120, 20], parent: 'head', pj: [92, 52], cj: [60, 86], z: 1 },
        { id: 'wing', name: 'はね', w: 240, h: 200, seat: [300, 280], parent: 'body', pj: [116, 84], cj: [196, 52], z: 0, locked: 'tori' },
        { id: 'fin', name: 'ひれ', w: 160, h: 160, seat: [560, 280], parent: 'body', pj: [70, 112], cj: [122, 80], z: 0, locked: 'sakana' },
      ],
      motions: ['てくてく', 'どすどす', 'しゅっしゅっ'],
    },
  };
  RG.SHAPE_ORDER = ['slime', 'yotsu', 'tori', 'sakana', 'ekitai', 'robot', 'nisoku'];
  RG.SHAPE_NAMES = { slime: 'スライム', yotsu: 'よつあし', tori: 'とり', sakana: 'さかな', ekitai: 'えきたい', robot: 'ロボット', nisoku: 'にそく' };
  RG.shapeByNo = no => Object.keys(RG.SHAPES).find(k => RG.SHAPES[k].no === no);
  RG.part = (shape, pid) => RG.SHAPES[shape].parts.find(p => p.id === pid);
  // いま 描ける パーツ（席だけの パーツは のぞく）
  // スライムの じゆうパーツの しゅるい。need＝その体形を 解禁すると 使える／cj＝パーツがわの つなぎめ／mo＝うごきかた
  // ★ 番号は QRに 入るので 変えない（足すときは うしろに）
  RG.FREE_KINDS = {
    1: { name: 'あし', need: ['yotsu', 'nisoku'], cj: [80, 34], mo: 'limb' },
    2: { name: 'しっぽ', need: ['yotsu'], cj: [126, 84], mo: 'tail' },
    3: { name: 'みみ', need: ['yotsu'], cj: [80, 126], mo: 'ear' },
    4: { name: 'はね', need: ['tori'], cj: [126, 50], mo: 'wing' },
    5: { name: 'とさか', need: ['tori'], cj: [80, 126], mo: 'ear' },
    6: { name: 'ひれ', need: ['sakana'], cj: [80, 126], mo: 'fin' },
    7: { name: 'とろけるうで', need: ['ekitai'], cj: [80, 34], mo: 'drip' },
    8: { name: 'アンテナ', need: ['robot'], cj: [80, 126], mo: 'antenna' },
    9: { name: 'うで', need: ['robot', 'nisoku'], cj: [80, 34], mo: 'limb' },
  };
  RG.FREE_MAX = 4;
  // そのモンスターの パーツ一覧（じゆうパーツは m.free の 中身で しゅるい・位置を 決める。つけていない じゆうパーツは ふくまない）
  RG.partsFor = function (m) {
    const out = [];
    for (const p of RG.SHAPES[m.shape].parts) {
      if (!p.free) { out.push(p); continue; }
      const f = m.free && m.free[p.free]; if (!f) continue;
      const K = RG.FREE_KINDS[f.k] || RG.FREE_KINDS[3];
      out.push(Object.assign({}, p, { name: K.name, cj: K.cj, pj: [f.x, f.y], z: f.z ? 1 : 0, mo: K.mo }));
    }
    return out;
  };
  RG.partOf = (m, pid) => RG.partsFor(m).find(p => p.id === pid);
  // いま 描ける パーツ（解禁していない体形の パーツは のぞく）。RG.isOpen＝その体形を 解禁しているか（app.js）
  RG.usableParts = m => RG.partsFor(typeof m === 'string' ? { shape: m } : m).filter(p => !p.locked || (RG.isOpen && RG.isOpen(p.locked)));

  // ---- パレット（お絵描きリレーと同じ）。予約色（#ff00ff・#00ffff）は 入れない ----
  RG.COLORS = [
    ['くろ', '#23213a'], ['グレー', '#9a98a8'], ['あか', '#e8434b'], ['ピンク', '#f28bb6'],
    ['オレンジ', '#f59331'], ['はだいろ', '#f6cfa6'], ['きいろ', '#f7cc2e'], ['みどり', '#3db66b'],
    ['みずいろ', '#5ec8ef'], ['あお', '#3a6fe0'], ['むらさき', '#8e55d0'], ['ちゃいろ', '#9a6235'],
  ];
  function hsl2hex(h, sat, l) {
    sat /= 100; l /= 100;
    const k = n => (n + h / 30) % 12, a = sat * Math.min(l, 1 - l);
    const f = n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
    return '#' + [f(0), f(8), f(4)].map(v => v.toString(16).padStart(2, '0')).join('');
  }
  const PRO = [];
  [['しろ', '#ffffff'], ['グレー1', '#d9d9de'], ['グレー2', '#a9a8b4'], ['グレー3', '#75738a'], ['グレー4', '#4a4862'], ['くろ', '#23213a']].forEach(c => PRO.push(c));
  [['あか', 355], ['オレンジ', 28], ['きいろ', 50], ['みどり', 135], ['あお', 215], ['むらさき', 275]].forEach(([n, h]) => {
    [88, 76, 63, 50, 38, 26].forEach((l, i) => PRO.push([n + (i + 1), hsl2hex(h, h === 50 ? 92 : 82, l)]));
  });
  [['ちゃ1', '#fde3cc'], ['ちゃ2', '#f6cfa6'], ['ちゃ3', '#e0a878'], ['ちゃ4', '#b97a4a'], ['ちゃ5', '#8a5530'], ['ちゃ6', '#5c3820']].forEach(c => PRO.push(c));
  RG.PRO = PRO;
  RG.SIZES = [['ほそい', 3], ['ふつう', 7], ['ふとい', 16]];
  RG.hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  RG.ALL_RGB = [...RG.COLORS, ...PRO].map(c => RG.hexRgb(c[1]));

  // ---- 色 → 教科（SPEC 5-6）----
  // 5教科：国語=赤 / 算数=青 / 社会=黄 / 理科=緑 / 英語=紫。 1・2年：こくご / さんすう / せいかつ1(黄) / せいかつ2(緑)
  RG.SUBJ5 = ['国語', '算数', '社会', '理科', '英語'];
  RG.SUBJ4 = ['こくご', 'さんすう', 'せいかつ1', 'せいかつ2'];
  // 色相の めじるし（度）と 教科の番号
  const ANCH5 = [[0, 0], [55, 2], [135, 3], [215, 1], [275, 4], [360, 0]];
  const ANCH4 = [[0, 0], [55, 2], [135, 3], [215, 1], [360, 0]];
  function split(h, anch, out) {
    for (let i = 0; i < anch.length - 1; i++) {
      const [a, sa] = anch[i], [b, sb] = anch[i + 1];
      if (h >= a && h <= b) {
        // めじるしの近く（はばの15%）は その教科に 全部。あいだは 近さで 分ける
        const t = Math.max(0, Math.min(1, ((h - a) / (b - a) - 0.15) / 0.7));
        out[sa] += 1 - t; out[sb] += t; return;
      }
    }
  }
  // パーツのキャンバスたちから 色の割合（千分率）を 出す。色みのない色（黒・白・灰）は 数えない
  RG.colorRatio = function (canvases) {
    const s5 = [0, 0, 0, 0, 0], s4 = [0, 0, 0, 0];
    for (const cv of canvases) {
      if (!cv) continue;
      const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 128) continue;
        const r = d[i], g = d[i + 1], b = d[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b), c = mx - mn;
        if (c < 51) continue;
        let h = mx === r ? ((g - b) / c) % 6 : mx === g ? (b - r) / c + 2 : (r - g) / c + 4;
        h = (h * 60 + 360) % 360;
        split(h, ANCH5, s5); split(h, ANCH4, s4);
      }
    }
    return { r5: permille(s5), r4: permille(s4) };
  };
  function permille(a) {
    const sum = a.reduce((x, y) => x + y, 0);
    if (!sum) return a.map(() => 0);
    const o = a.map(v => Math.floor(v * 1000 / sum));
    let rest = 1000 - o.reduce((x, y) => x + y, 0), i = o.indexOf(Math.max(...o));
    o[i] += rest; return o;
  }
  // 学年に合わせた 属性値（合計1000）。色みなしは 等分
  RG.stats = function (mon, grade) {
    const four = grade <= 2, r = four ? mon.r4 : mon.r5, names = four ? RG.SUBJ4 : RG.SUBJ5;
    const sum = r.reduce((x, y) => x + y, 0);
    const v = sum ? r : names.map(() => 1000 / names.length);
    return names.map((n, i) => ({ name: n, v: Math.round(v[i]) }));
  };

  // ---- くみたて（パーツの ならべかた）----
  // かえり値：描く順の [{p, x, y}]（みぎむきの座標。どうの左上が 0,0）と 全体の はんい
  RG.layout = function (m, has) {
    const parts = RG.partsFor(m), adj = m.adj, pos = {}, order = [], byId = id => parts.find(q => q.id === id);
    const place = p => {
      if (pos[p.id]) return pos[p.id];
      if (!p.parent) return (pos[p.id] = [0, 0]);
      const pp = place(byId(p.parent)), a = (!p.free && adj && adj[p.id]) || [0, 0];
      return (pos[p.id] = [pp[0] + p.pj[0] + a[0] - p.cj[0], pp[1] + p.pj[1] + a[1] - p.cj[1]]);
    };
    const zOf = p => { const a = !p.free && adj && adj[p.id]; return a && a[2] != null ? a[2] : p.z; };
    const emit = p => {
      const kids = parts.filter(c => c.parent === p.id && (!has || has(c.id)));
      kids.filter(c => !zOf(c)).forEach(emit);
      if (!has || has(p.id)) order.push({ p, x: place(p)[0], y: place(p)[1] });
      kids.filter(c => zOf(c)).forEach(emit);
    };
    parts.filter(p => !p.parent).forEach(emit);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    order.forEach(o => { x0 = Math.min(x0, o.x); y0 = Math.min(y0, o.y); x1 = Math.max(x1, o.x + o.p.w); y1 = Math.max(y1, o.y + o.p.h); });
    return { order, x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
  };
  // モンスターを 描く。get(pid)＝そのパーツのキャンバス。box に おさまるように。
  // opt.flip＝左右反転して表示／opt.pose＝うごき（RG.pose の かえり値）／opt.maxScale
  // みぎむきの座標で 組み立て、ひだりむきの絵は 全体を うらがえして 描く（回転も いっしょに うらがえる）
  RG.drawMon = function (ctx, m, get, bx, by, bw, bh, opt) {
    opt = opt || {};
    const has = pid => !!get(pid), L = RG.layout(m, has);
    if (!L.order.length) return null;
    const s = Math.min(bw / L.w, bh / L.h, opt.maxScale || 9), left = m.face === 1, pose = opt.pose || null;
    const ox = bx + (bw - L.w * s) / 2, oy = opt.bottom ? by + bh - L.h * s : by + (bh - L.h * s) / 2, parts = RG.partsFor(m);   // opt.bottom＝足もとを わくの 下に そろえる
    const zOf = p => { const a = !p.free && m.adj && m.adj[p.id]; return a && a[2] != null ? a[2] : p.z; };
    ctx.save();
    if (opt.flip) { ctx.translate(bx * 2 + bw, 0); ctx.scale(-1, 1); }
    ctx.translate(ox, oy); ctx.scale(s, s);
    if (left) { ctx.translate(L.w, 0); ctx.scale(-1, 1); }
    ctx.translate(-L.x0, -L.y0);
    const draw = p => {
      ctx.save();
      if (p.parent) {
        const a = (!p.free && m.adj && m.adj[p.id]) || [0, 0];
        ctx.translate(p.pj[0] + a[0], p.pj[1] + a[1]);
        if (pose && pose.parts[p.id]) ctx.rotate(pose.parts[p.id]);
        ctx.translate(-p.cj[0], -p.cj[1]);
      } else if (pose) {
        // からだ全体：足もとを じくに のびちぢみ・かたむき
        const px = p.w / 2, py = p.h * 0.92;
        ctx.translate(pose.dx + px, pose.dy + py); ctx.rotate(pose.rot); ctx.scale(pose.sx, pose.sy); ctx.translate(-px, -py);
      }
      const kids = parts.filter(c => c.parent === p.id && has(c.id));
      kids.filter(c => !zOf(c)).forEach(draw);
      if (has(p.id)) {
        if (left) { ctx.save(); ctx.translate(p.w, 0); ctx.scale(-1, 1); ctx.drawImage(get(p.id), 0, 0); ctx.restore(); }
        else ctx.drawImage(get(p.id), 0, 0);
      }
      kids.filter(c => zOf(c)).forEach(draw);
      ctx.restore();
    };
    parts.filter(p => !p.parent).forEach(draw);
    ctx.restore();
    return { s, ox, oy, L };
  };
  // むきに 合わせた 関節の位置
  RG.jx = (p, pt, face) => face === 1 ? [p.w - pt[0], pt[1]] : pt;
})(window.RG);
