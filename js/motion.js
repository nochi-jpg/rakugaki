// ===== モーション（体形ごとに 3パターン × たいき・こうげき・ダメージ・かち・まけ） =====
// 関節を じくにした パーツの回転 と、からだ全体の うごき（上下・前後・のびちぢみ・かたむき）で 動かす。見た目だけ
// 角度は「度」で書く（みぎむき。＋は 時計まわり＝前に たおれる）。dx の ＋は 前（進む方向）
(function (RG) {
  'use strict';
  const PI = Math.PI, sin = Math.sin, abs = Math.abs;
  const cl = v => Math.max(0, Math.min(1, v));
  const hill = (t, a, b) => (t <= a || t >= b) ? 0 : sin(PI * (t - a) / (b - a));   // a〜b の あいだ だけ ふくらむ山
  const ease = u => u * u * (3 - 2 * u);
  RG.ACTIONS = ['idle', 'attack', 'damage', 'win', 'lose'];
  RG.ACTION_NAMES = { idle: 'たいき', attack: 'こうげき', damage: 'ダメージ', win: 'かち', lose: 'まけ' };

  // ---- よつあし ----
  const yDamage = k => t => { const u = cl(t / 0.5), a = sin(PI * u); return { dx: -46 * a * k + 5 * sin(t * 70) * (1 - u), rot: -11 * a, P: { face: -20 * a, tail: 24 * a, ear: -28 * a, fore1: 16 * a, fore2: 22 * a, hind1: -10 * a, hind2: -6 * a } }; };
  const yLose = d => t => { const u = ease(cl(t / d)); return { dy: 30 * u, sy: 1 - 0.08 * u, P: { face: 36 * u, fore1: -72 * u, fore2: -62 * u, hind1: 72 * u, hind2: 62 * u, tail: 38 * u, ear: 34 * u } }; };
  const YOTSU = [
    { // ぴょんぴょん：はねて たいあたり
      dur: { attack: 0.75, damage: 0.5, lose: 0.9 },
      idle(t) { const h = abs(sin(t * PI * 1.5)); return { dy: -20 * h, sy: 1 + 0.03 * h, sx: 1 - 0.02 * h, P: { face: -5 * h, fore1: -16 * h, fore2: -9 * h, hind1: 16 * h, hind2: 9 * h, tail: -8 + 20 * h, ear: -14 * h } }; },
      attack(t) { const u = cl(t / 0.75), a = sin(PI * u), h = abs(sin(2 * PI * u)); return { dx: 170 * a, dy: -75 * h, rot: 13 * sin(2 * PI * u), P: { face: 10 * a, fore1: -38 * h, fore2: -30 * h, hind1: 40 * h, hind2: 32 * h, tail: -30 * a, ear: -20 * h } }; },
      damage: yDamage(1),
      win(t) { const w = t * PI * 2.4, h = abs(sin(w)); return { dy: -56 * h, rot: -7 * sin(w), P: { face: -10 * h, fore1: -40 * h, fore2: -28 * h, hind1: 22 * h, hind2: 14 * h, tail: 30 * sin(t * 16), ear: -18 * h } }; },
      lose: yLose(0.9),
    },
    { // どっしり：ゆっくり ずつき
      dur: { attack: 1.0, damage: 0.5, lose: 1.2 },
      idle(t) { const b = sin(t * 2.0); return { sy: 1 + 0.022 * b, sx: 1 - 0.012 * b, P: { face: 3 * b, tail: 9 * sin(t * 1.4), ear: 3 * sin(t * 2 + 1) } }; },
      attack(t) { const u = cl(t / 1.0), back = hill(u, 0, 0.5), hit = hill(u, 0.42, 1); return { dx: -34 * back + 110 * hit, rot: -7 * back + 9 * hit, P: { face: -18 * back + 46 * hit, fore1: 10 * back - 22 * hit, fore2: 8 * back - 18 * hit, hind1: -8 * back + 20 * hit, hind2: -6 * back + 16 * hit, tail: -12 * hit, ear: 12 * back - 16 * hit } }; },
      damage: yDamage(0.6),
      win(t) { const b = abs(sin(t * PI * 1.1)); return { dy: -14 * b, rot: -9 * b, sy: 1 + 0.03 * b, P: { face: -22 * b, fore1: -30 * b, fore2: -22 * b, tail: 16 * sin(t * 5), ear: -8 * b } }; },
      lose: yLose(1.2),
    },
    { // すばしっこい：こきざみに ひっかく
      dur: { attack: 0.6, damage: 0.45, lose: 0.7 },
      idle(t) { const q = sin(t * 12); return { dx: 6 * sin(t * 6), dy: -3 * abs(q), P: { fore1: 13 * q, fore2: -13 * q, hind1: -13 * q, hind2: 13 * q, tail: 16 * sin(t * 10), ear: 6 * sin(t * 9), face: 3 * sin(t * 6) } }; },
      attack(t) { const u = cl(t / 0.6), a = Math.pow(sin(PI * u), 0.6), c = sin(t * 42) * hill(u, 0.15, 0.9); return { dx: 190 * a, dy: -8 * a, rot: 7 * a, P: { fore1: -20 * a + 58 * c, fore2: -20 * a - 58 * c, hind1: 26 * a, hind2: 18 * a, face: 8 * a + 6 * c, tail: -34 * a, ear: -12 * a } }; },
      damage: yDamage(1.3),
      win(t) { const q = sin(t * 15), h = abs(sin(t * PI * 3)); return { dx: 22 * sin(t * 5), dy: -26 * h, P: { fore1: 22 * q, fore2: -22 * q, hind1: -22 * q, hind2: 22 * q, tail: 34 * sin(t * 18), ear: 12 * q, face: -6 * h } }; },
      lose: yLose(0.7),
    },
  ];

  // ---- スライム ----
  const sDamage = t => { const u = cl(t / 0.5), a = sin(PI * u); return { dx: -34 * a + 5 * sin(t * 70) * (1 - u), sy: 1 - 0.24 * a, sx: 1 + 0.2 * a, P: { horn: -30 * a } }; };
  const sLose = d => t => { const u = ease(cl(t / d)); return { sy: 1 - 0.5 * u, sx: 1 + 0.4 * u, P: { horn: 74 * u } }; };
  const SLIME = [
    { // ぷるぷる
      dur: { attack: 0.65, damage: 0.5, lose: 0.9 },
      idle(t) { const e = 0.45 + 0.55 * abs(sin(t * 1.3)), q = sin(t * 15) * e; return { sx: 1 + 0.035 * q, sy: 1 - 0.035 * q, P: { horn: 9 * q } }; },
      attack(t) { const u = cl(t / 0.65), back = hill(u, 0, 0.4), a = hill(u, 0.3, 1); return { dx: -22 * back + 150 * a, sx: 1 - 0.1 * back + 0.26 * a, sy: 1 + 0.08 * back - 0.16 * a, rot: 6 * a, P: { horn: -18 * back + 30 * a } }; },
      damage: sDamage,
      win(t) { const h = abs(sin(t * PI * 2.2)), q = sin(t * 22); return { dy: -44 * h, sx: 1 + 0.05 * q - 0.05 * h, sy: 1 - 0.05 * q + 0.08 * h, P: { horn: 16 * q } }; },
      lose: sLose(0.9),
    },
    { // ぽよーん
      dur: { attack: 0.9, damage: 0.5, lose: 1.0 },
      idle(t) { const w = t * PI * 1.05, h = abs(sin(w)); return { dy: -40 * h, sy: 0.88 + 0.26 * h, sx: 1.1 - 0.17 * h, P: { horn: 12 - 22 * h } }; },
      attack(t) { const u = cl(t / 0.9), a = sin(PI * u), up = hill(u, 0, 0.62), land = hill(u, 0.55, 0.85); return { dx: 150 * a, dy: -150 * up, sy: 1 + 0.2 * up - 0.34 * land, sx: 1 - 0.12 * up + 0.3 * land, P: { horn: -16 * up + 30 * land } }; },
      damage: sDamage,
      win(t) { const w = t * PI * 1.6, h = abs(sin(w)); return { dy: -84 * h, sy: 0.84 + 0.36 * h, sx: 1.12 - 0.22 * h, rot: 5 * sin(w), P: { horn: 16 - 30 * h } }; },
      lose: sLose(1.0),
    },
    { // とろーり
      dur: { attack: 1.0, damage: 0.5, lose: 1.4 },
      idle(t) { const k = 0.5 + 0.5 * sin(t * 1.5); return { sy: 1 - 0.2 * k, sx: 1 + 0.18 * k, P: { horn: 26 * k } }; },
      attack(t) { const u = cl(t / 1.0), flat = hill(u, 0, 0.6), spring = hill(u, 0.5, 1); return { dx: 70 * flat + 110 * spring, sy: 1 - 0.4 * flat + 0.22 * spring, sx: 1 + 0.42 * flat - 0.1 * spring, P: { horn: 44 * flat - 22 * spring } }; },
      damage: sDamage,
      win(t) { const k = 0.5 + 0.5 * sin(t * 4); return { sy: 0.8 + 0.42 * k, sx: 1.16 - 0.26 * k, dy: -10 * k, P: { horn: 24 - 44 * k } }; },
      lose: sLose(1.4),
    },
  ];
  const TABLE = { yotsu: YOTSU, slime: SLIME };
  const D2R = PI / 180;

  // 1回で おわる うごき の ながさ（びょう）。たいき・かち は くりかえし（0）
  RG.motionDur = function (shape, motion, action) {
    const M = (TABLE[shape] || [])[motion] || (TABLE[shape] || [])[0];
    return (M && M.dur[action]) || 0;
  };
  // t びょう めの ポーズ。かえり値：{dx, dy, rot, sx, sy, parts:{pid: ラジアン}}
  RG.pose = function (shape, motion, action, t) {
    const M = (TABLE[shape] || [])[motion] || (TABLE[shape] || [])[0];
    const o = M && M[action] ? M[action](t) : {}, parts = {};
    for (const k in (o.P || {})) parts[k] = o.P[k] * D2R;
    return { dx: o.dx || 0, dy: o.dy || 0, rot: (o.rot || 0) * D2R, sx: o.sx == null ? 1 : o.sx, sy: o.sy == null ? 1 : o.sy, parts };
  };

  // キャンバスの上で 動かしつづける。かえり値：{ set(action), stop() }
  // こうげき・ダメージは おわったら たいきに もどる。まけは たおれたまま
  RG.play = function (canvas, m, get, opt) {
    opt = opt || {};
    const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
    let action = opt.action || 'idle', t0 = performance.now(), dead = false, raf = 0;
    const C = {
      motion: m.motion || 0,
      set(a) { action = a; t0 = performance.now(); },
      stop() { dead = true; cancelAnimationFrame(raf); },
    };
    const tick = now => {
      if (dead) return;
      if (!canvas.isConnected) { dead = true; return; }
      let t = (now - t0) / 1000;
      const d = RG.motionDur(m.shape, C.motion, action);
      if (d && t > d + (action === 'lose' ? 1e9 : 0.05)) { action = 'idle'; t0 = now; t = 0; if (opt.onEnd) opt.onEnd(); }
      ctx.clearRect(0, 0, W, H);
      // うごく ぶんの よゆうを とって 中央より 少し うしろ・下に おく
      RG.drawMon(ctx, m, get, W * ((m.face === 1) !== !!opt.flip ? 0.26 : 0.14), H * 0.24, W * 0.6, H * 0.72, { maxScale: opt.maxScale || 1.2, pose: RG.pose(m.shape, C.motion, action, t), flip: opt.flip });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return C;
  };
})(window.RG);
