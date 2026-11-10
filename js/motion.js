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
  // ---- とり（はね：＋で 上がる／あし：－で 前へ／かお：＋で 下を むく）----
  const tDamage = t => { const u = cl(t / 0.5), a = sin(PI * u); return { dx: -42 * a + 5 * sin(t * 70) * (1 - u), rot: -12 * a, P: { face: -20 * a, wing1: 46 * a, wing2: 38 * a, leg1: 14 * a, leg2: 20 * a, tail: 22 * a, crest: -26 * a } }; };
  const tLose = d => t => { const u = ease(cl(t / d)); return { dy: 6 * u, rot: 76 * u, P: { face: -34 * u, wing1: -44 * u, wing2: 36 * u, leg1: 40 * u, leg2: 58 * u, tail: -24 * u, crest: 30 * u } }; };   // 前に ぱたんと たおれる
  const TORI = [
    { // ぱたぱた：はばたいて つつく
      dur: { attack: 0.7, damage: 0.5, lose: 0.9 },
      idle(t) { const f = sin(t * 10); return { dy: -10 + 5 * f, P: { wing1: 8 + 26 * f, wing2: 8 + 22 * f, face: 3 * sin(t * 3), tail: 6 * f, leg1: 8, leg2: 12, crest: 5 * f } }; },
      attack(t) { const u = cl(t / 0.7), a = sin(PI * u), peck = hill(u, 0.32, 0.72), f = sin(t * 32); return { dx: 165 * a, dy: -14 * a, rot: 8 * a, P: { face: 44 * peck, wing1: 10 + 34 * f, wing2: 10 + 28 * f, tail: -16 * a, leg1: 20 * a, leg2: 26 * a, crest: -14 * peck } }; },
      damage: tDamage,
      win(t) { const f = sin(t * 14), h = abs(sin(t * PI * 1.8)); return { dy: -46 * h, P: { wing1: 20 + 40 * f, wing2: 20 + 34 * f, face: -12 * h, tail: 14 * f, leg1: 10 * h, leg2: 16 * h, crest: 10 * f } }; },
      lose: tLose(0.9),
    },
    { // ひゅーん：とびあがって きゅうこうか
      dur: { attack: 1.0, damage: 0.5, lose: 1.0 },
      idle(t) { const b = sin(t * 2.2); return { dy: -4 * abs(b), P: { wing1: 6 * b, wing2: 5 * b, face: 4 * b, tail: 8 * sin(t * 1.6), crest: 4 * b } }; },
      attack(t) { const u = cl(t / 1.0), up = hill(u, 0, 0.66), dive = hill(u, 0.36, 0.86), f = sin(t * 26) * hill(u, 0, 0.45); return { dx: 175 * hill(u, 0.22, 1), dy: -150 * up, rot: -14 * hill(u, 0, 0.4) + 34 * dive, P: { wing1: 30 * f + 52 * dive, wing2: 26 * f + 46 * dive, face: 18 * dive, tail: 24 * dive, leg1: 34 * up, leg2: 40 * up, crest: -18 * dive } }; },
      damage: tDamage,
      win(t) { const k = 0.5 + 0.5 * sin(t * 3); return { dy: -30 - 26 * k, rot: -6 * sin(t * 3), P: { wing1: 46 * sin(t * 12), wing2: 40 * sin(t * 12), face: -10 * k, tail: 10 * sin(t * 6), leg1: 20, leg2: 26 } }; },
      lose: tLose(1.0),
    },
    { // とことこ：はしって キック
      dur: { attack: 0.65, damage: 0.45, lose: 0.8 },
      idle(t) { const q = sin(t * 9); return { dy: -4 * abs(q), P: { leg1: 18 * q, leg2: -18 * q, face: 6 * sin(t * 9 + 1), wing1: 4 * q, wing2: -4 * q, tail: 8 * q, crest: 6 * q } }; },
      attack(t) { const u = cl(t / 0.65), a = Math.pow(sin(PI * u), 0.7), run = sin(t * 38) * (1 - hill(u, 0.3, 0.8)), kick = hill(u, 0.34, 0.78); return { dx: 185 * a, dy: -22 * kick, rot: -14 * kick, P: { leg1: 40 * run - 82 * kick, leg2: -40 * run + 20 * kick, face: -10 * kick, wing1: 30 * kick, wing2: 26 * kick, tail: -20 * a, crest: -10 * kick } }; },
      damage: tDamage,
      win(t) { const q = sin(t * 13), h = abs(sin(t * PI * 2.6)); return { dy: -24 * h, dx: 16 * sin(t * 4), P: { leg1: 26 * q, leg2: -26 * q, wing1: 30 * h, wing2: 26 * h, face: -8 * h, tail: 16 * q, crest: 10 * q } }; },
      lose: tLose(0.8),
    },
  ];

  // ---- さかな（うかんで およぐ。おびれ：±で ふる）----
  const fDamage = t => { const u = cl(t / 0.5), a = sin(PI * u); return { dx: -44 * a + 5 * sin(t * 70) * (1 - u), dy: -10 * a, rot: -20 * a, P: { face: -14 * a, tailfin: 32 * a, dorsal: -22 * a, pect1: 40 * a, pect2: 34 * a } }; };
  const fLose = d => t => { const u = ease(cl(t / d)); return { rot: 180 * u, dy: -200 * u - 14 * sin(PI * u), P: { face: 8 * u, tailfin: 24 * u, dorsal: 20 * u, pect1: -50 * u, pect2: -42 * u } }; };
  const SAKANA = [
    { // すいすい：およいで たいあたり
      dur: { attack: 0.75, damage: 0.5, lose: 1.1 },
      idle(t) { const w = sin(t * 6); return { dy: -18 + 8 * sin(t * 2), rot: 3 * sin(t * 6 + 1), P: { tailfin: 24 * w, pect1: 16 * sin(t * 3), pect2: 12 * sin(t * 3 + 1), dorsal: 4 * w, face: 2 * sin(t * 6 + 2) } }; },
      attack(t) { const u = cl(t / 0.75), back = hill(u, 0, 0.36), a = hill(u, 0.26, 1), w = sin(t * 34); return { dx: -36 * back + 200 * a, dy: -18, rot: 6 * a, P: { tailfin: 44 * w, pect1: 40 * a, pect2: 34 * a, dorsal: -10 * a, face: 6 * a } }; },
      damage: fDamage,
      win(t) { const h = abs(sin(t * PI * 1.7)); return { dy: -18 - 62 * h, rot: 16 * sin(t * PI * 3.4), P: { tailfin: 36 * sin(t * 16), pect1: 30 * h, pect2: 24 * h, dorsal: 8 * sin(t * 8) } }; },
      lose: fLose(1.1),
    },
    { // ぴちぴち：はねて しっぽビンタ
      dur: { attack: 0.85, damage: 0.5, lose: 0.9 },
      idle(t) { const h = abs(sin(t * 5.5)); return { dy: -22 * h, rot: 10 * sin(t * 11), P: { tailfin: 32 * sin(t * 11), pect1: 20 * h, pect2: 16 * h, dorsal: 8 * sin(t * 11), face: -6 * h } }; },
      attack(t) { const u = cl(t / 0.85), a = sin(PI * u), spin = ease(cl((u - 0.22) / 0.5)); return { dx: 165 * a, dy: -18 - 70 * hill(u, 0.1, 0.8), rot: 360 * spin, P: { tailfin: 50 * sin(t * 24), pect1: 36 * a, pect2: 30 * a, dorsal: -12 * a } }; },
      damage: fDamage,
      win(t) { const h = abs(sin(t * PI * 2.6)); return { dy: -50 * h, rot: 14 * sin(t * 16), P: { tailfin: 40 * sin(t * 20), pect1: 34 * h, pect2: 28 * h, dorsal: 12 * sin(t * 16), face: -8 * h } }; },
      lose: fLose(0.9),
    },
    { // ゆらゆら：ゆっくり かみつく
      dur: { attack: 1.1, damage: 0.5, lose: 1.5 },
      idle(t) { const w = sin(t * 1.3); return { dy: -18 + 14 * w, rot: 4 * sin(t * 1.3 + 1), P: { tailfin: 15 * sin(t * 2.6), pect1: 12 * sin(t * 1.6), pect2: 10 * sin(t * 1.6 + 1), dorsal: 5 * w, face: 3 * w } }; },
      attack(t) { const u = cl(t / 1.1), open = hill(u, 0.08, 0.6), bite = hill(u, 0.56, 0.82); return { dx: 140 * hill(u, 0.3, 1), dy: -18, rot: -6 * open + 8 * bite, P: { face: -28 * open + 26 * bite, tailfin: 26 * sin(t * 12) * hill(u, 0.3, 1), pect1: 24 * open, pect2: 20 * open, dorsal: -8 * bite } }; },
      damage: fDamage,
      win(t) { const w = sin(t * 2.6); return { dy: -30 + 16 * w, rot: 8 * w, P: { tailfin: 28 * sin(t * 5.2), pect1: 26 * w, pect2: 22 * w, dorsal: 8 * w, face: -6 * w } }; },
      lose: fLose(1.5),
    },
  ];

  // ---- えきたい（low＝した、up＝うえ。うで：－で 前へ）----
  const eDamage = t => { const u = cl(t / 0.5), a = sin(PI * u); return { dx: -34 * a + 5 * sin(t * 70) * (1 - u), sy: 1 - 0.24 * a, sx: 1 + 0.2 * a, P: { up: -26 * a, arm1: 44 * a, arm2: -40 * a } }; };
  const eLose = d => t => { const u = ease(cl(t / d)); return { sy: 1 - 0.5 * u, sx: 1 + 0.38 * u, P: { up: 62 * u, arm1: 60 * u, arm2: -56 * u } }; };
  const EKITAI = [
    { // どろどろ：のびて たたく
      dur: { attack: 0.9, damage: 0.5, lose: 1.3 },
      idle(t) { const k = sin(t * 2); return { sx: 1 + 0.06 * k, sy: 1 - 0.06 * k, P: { up: 7 * sin(t * 2 + 1), arm1: 10 * sin(t * 2.5), arm2: -10 * sin(t * 2.5 + 0.6) } }; },
      attack(t) { const u = cl(t / 0.9), back = hill(u, 0, 0.42), hit = hill(u, 0.3, 0.9); return { dx: 100 * hit, sx: 1 + 0.2 * hit, sy: 1 - 0.1 * hit, P: { up: -16 * back + 38 * hit, arm1: 60 * back - 150 * hit, arm2: 20 * hit } }; },
      damage: eDamage,
      win(t) { const k = 0.5 + 0.5 * sin(t * 4); return { sy: 1 + 0.2 * k, sx: 1 - 0.1 * k, P: { up: 10 * sin(t * 4), arm1: -150 + 20 * sin(t * 9), arm2: 150 - 20 * sin(t * 9) } }; },
      lose: eLose(1.3),
    },
    { // ぷくぷく：ふくらんで はじける
      dur: { attack: 0.85, damage: 0.5, lose: 1.0 },
      idle(t) { const h = abs(sin(t * 3)); return { sy: 1 + 0.09 * h, sx: 1 - 0.04 * h, dy: -6 * h, P: { up: -4 * h, arm1: 14 * sin(t * 6), arm2: -14 * sin(t * 6) } }; },
      attack(t) { const u = cl(t / 0.85), puff = hill(u, 0, 0.62), pop = hill(u, 0.48, 1); return { dx: 180 * pop, dy: -30 * pop, sx: 1 + 0.34 * puff - 0.16 * pop, sy: 1 + 0.34 * puff - 0.1 * pop, P: { up: -10 * puff + 24 * pop, arm1: -40 * puff - 60 * pop, arm2: 40 * puff + 40 * pop } }; },
      damage: eDamage,
      win(t) { const h = abs(sin(t * PI * 2)); return { dy: -50 * h, sy: 0.9 + 0.24 * h, sx: 1.08 - 0.16 * h, P: { up: 8 * sin(t * 12), arm1: -120 * h, arm2: 120 * h } }; },
      lose: eLose(1.0),
    },
    { // ざぶーん：なみに なって おしよせる
      dur: { attack: 1.05, damage: 0.5, lose: 1.4 },
      idle(t) { const w = t * 1.8; return { dx: 10 * sin(w), rot: 5 * sin(w), P: { up: 13 * sin(w - 0.6), arm1: 18 * sin(w - 1.2), arm2: 16 * sin(w - 1.5) } }; },
      attack(t) { const u = cl(t / 1.05), back = hill(u, 0, 0.45), wave = hill(u, 0.34, 1); return { dx: -54 * back + 210 * wave, rot: -10 * back + 22 * hill(u, 0.34, 0.9), sy: 1 + 0.16 * back - 0.14 * wave, sx: 1 - 0.08 * back + 0.2 * wave, P: { up: -18 * back + 42 * wave, arm1: 30 * back - 70 * wave, arm2: 24 * back - 56 * wave } }; },
      damage: eDamage,
      win(t) { const w = t * 3.6; return { dx: 22 * sin(w), rot: 9 * sin(w), sy: 1 + 0.08 * sin(w * 2), P: { up: 20 * sin(w - 0.6), arm1: -110 + 30 * sin(w - 1.2), arm2: 110 + 30 * sin(w - 1.2) } }; },
      lose: eLose(1.4),
    },
  ];

  // ---- ロボット（かくかく うごく）----
  const st = (v, n) => Math.round(v * n) / n;      // だんだんに して かくかく させる
  const rDamage = t => { const u = cl(t / 0.5), a = st(sin(PI * u), 4); return { dx: -42 * a + 6 * sin(t * 80) * (1 - u), rot: -10 * a, P: { head: -22 * a, arm1: 34 * a, arm2: 40 * a, leg1: 12 * a, leg2: 16 * a, antenna: -44 * a, back: 14 * a } }; };
  const rLose = d => t => { const u = st(ease(cl(t / d)), 6); return { dy: 34 * u, rot: 7 * u, P: { head: 52 * u, arm1: 28 * u, arm2: -22 * u, leg1: -78 * u, leg2: 70 * u, antenna: 60 * u, back: -20 * u } }; };
  const ROBOT = [
    { // がしゃん：パンチ
      dur: { attack: 0.8, damage: 0.5, lose: 1.0 },
      idle(t) { const b = st(sin(t * 3), 2); return { dy: -3 * b, P: { head: 3 * b, arm1: 5 * b, arm2: -5 * b, antenna: 9 * sin(t * 6), back: 2 * b } }; },
      attack(t) { const u = cl(t / 0.8), wind = st(hill(u, 0, 0.42), 3), hit = st(hill(u, 0.32, 0.9), 4); return { dx: 130 * hill(u, 0.25, 1), rot: -5 * wind + 7 * hit, P: { arm1: 52 * wind - 100 * hit, arm2: 24 * hit, head: 6 * hit, leg1: -14 * hit, leg2: 16 * hit, antenna: -20 * hit, back: 8 * hit } }; },
      damage: rDamage,
      win(t) { const b = st(abs(sin(t * 5)), 3); return { dy: -18 * b, P: { arm1: -150 - 14 * b, arm2: -140 - 14 * b, head: -8 * b, antenna: 20 * sin(t * 14), leg1: 0, leg2: 0 } }; },
      lose: rLose(1.0),
    },
    { // うぃーん：ゆっくり たいあたり
      dur: { attack: 1.15, damage: 0.5, lose: 1.4 },
      idle(t) { const w = sin(t * 1.2); return { P: { head: 9 * w, arm1: 3 * w, arm2: 3 * w, antenna: 6 * sin(t * 2.4), back: 2 * w } }; },
      attack(t) { const u = cl(t / 1.15), lean = hill(u, 0.08, 0.92), go = hill(u, 0.2, 1); return { dx: 160 * go, rot: 15 * lean, P: { arm1: -84 * lean, arm2: -78 * lean, head: 10 * lean, leg1: 12 * lean, leg2: 18 * lean, antenna: -24 * lean, back: -8 * lean } }; },
      damage: rDamage,
      win(t) { const w = sin(t * 2.4); return { P: { head: 14 * w, arm1: -150 + 16 * w, arm2: 30 * w, antenna: 14 * sin(t * 4.8), back: 4 * w }, rot: 3 * w }; },
      lose: rLose(1.4),
    },
    { // ぴこぴこ：こきざみに れんだ
      dur: { attack: 0.6, damage: 0.45, lose: 0.8 },
      idle(t) { const h = st(abs(sin(t * 14)), 2); return { dy: -4 * h, P: { head: 4 * sin(t * 14), arm1: -18 + 6 * h, arm2: -14 + 6 * h, antenna: 22 * sin(t * 20), back: 3 * h } }; },
      attack(t) { const u = cl(t / 0.6), a = Math.pow(sin(PI * u), 0.6), c = st(sin(t * 46), 1) * hill(u, 0.12, 0.92); return { dx: 160 * a, rot: 6 * a, P: { arm1: -74 * a + 44 * c, arm2: -74 * a - 44 * c, head: 5 * c, leg1: -12 * a, leg2: 14 * a, antenna: 26 * c, back: 6 * a } }; },
      damage: rDamage,
      win(t) { const h = st(abs(sin(t * 12)), 2), c = st(sin(t * 12), 1); return { dy: -14 * h, P: { arm1: -120 + 40 * c, arm2: -120 - 40 * c, head: 8 * c, antenna: 30 * sin(t * 24) } }; },
      lose: rLose(0.8),
    },
  ];

  // ---- にそく ----
  const nDamage = t => { const u = cl(t / 0.5), a = sin(PI * u); return { dx: -46 * a + 5 * sin(t * 70) * (1 - u), rot: -12 * a, P: { head: -18 * a, arm1: 40 * a, arm2: 48 * a, leg1: 14 * a, leg2: 20 * a, tail: 22 * a, ear: -24 * a, wing: 30 * a, fin: -16 * a } }; };
  const nLose = d => t => { const u = ease(cl(t / d)); return { dy: 34 * u, rot: 6 * u, P: { head: 42 * u, arm1: 30 * u, arm2: 22 * u, leg1: -80 * u, leg2: -66 * u, tail: 30 * u, ear: 30 * u, wing: -30 * u, fin: 18 * u } }; };
  const NISOKU = [
    { // てくてく：あるいて パンチ
      dur: { attack: 0.75, damage: 0.5, lose: 1.0 },
      idle(t) { const q = sin(t * 4.5); return { dy: -4 * abs(q), P: { leg1: 11 * q, leg2: -11 * q, arm1: -13 * q, arm2: 13 * q, head: 3 * sin(t * 4.5 + 1), tail: 10 * q, ear: 5 * q } }; },
      attack(t) { const u = cl(t / 0.75), a = sin(PI * u), wind = hill(u, 0, 0.4), hit = hill(u, 0.3, 0.85); return { dx: 160 * a, rot: -4 * wind + 9 * hit, P: { arm1: 46 * wind - 104 * hit, arm2: 30 * hit, leg1: -22 * hit, leg2: 24 * hit, head: 6 * hit, tail: -18 * a, ear: -10 * hit } }; },
      damage: nDamage,
      win(t) { const h = abs(sin(t * PI * 2.2)); return { dy: -52 * h, P: { arm1: -150 - 12 * h, arm2: -142 - 12 * h, leg1: -16 * h, leg2: 18 * h, head: -10 * h, tail: 30 * sin(t * 16), ear: -14 * h } }; },
      lose: nLose(1.0),
    },
    { // どすどす：ふみこんで キック
      dur: { attack: 1.0, damage: 0.5, lose: 1.3 },
      idle(t) { const h = abs(sin(t * 2.4)); return { dy: -8 * h, sy: 1 + 0.02 * h, P: { arm1: 6 * h, arm2: -6 * h, head: 3 * h, leg1: -6 * h, tail: 8 * sin(t * 1.6), ear: 3 * h } }; },
      attack(t) { const u = cl(t / 1.0), step = hill(u, 0.12, 1), kick = hill(u, 0.36, 0.84); return { dx: 135 * step, dy: -10 * kick, rot: -13 * kick, P: { leg1: 18 * hill(u, 0, 0.4) - 90 * kick, leg2: 12 * kick, arm1: 34 * kick, arm2: -30 * kick, head: -6 * kick, tail: 20 * kick, ear: -8 * kick } }; },
      damage: nDamage,
      win(t) { const h = abs(sin(t * PI * 1.2)); return { dy: -18 * h, sy: 1 + 0.03 * h, P: { arm1: -40 - 100 * h, arm2: -30 - 100 * h, head: -14 * h, tail: 16 * sin(t * 5), ear: -8 * h } }; },
      lose: nLose(1.3),
    },
    { // しゅっしゅっ：すばやく れんぞくパンチ
      dur: { attack: 0.6, damage: 0.45, lose: 0.8 },
      idle(t) { const h = abs(sin(t * 8)), q = sin(t * 8); return { dy: -9 * h, P: { arm1: -46 + 10 * q, arm2: -40 - 10 * q, leg1: 8 * q, leg2: -8 * q, head: 3 * q, tail: 14 * sin(t * 10), ear: 6 * q } }; },
      attack(t) { const u = cl(t / 0.6), a = Math.pow(sin(PI * u), 0.6), c = sin(t * 44) * hill(u, 0.12, 0.92); return { dx: 180 * a, rot: 7 * a, P: { arm1: -70 * a - 44 * c, arm2: -70 * a + 44 * c, leg1: -18 * a, leg2: 22 * a, head: 5 * a, tail: -30 * a, ear: -10 * a } }; },
      damage: nDamage,
      win(t) { const h = abs(sin(t * PI * 3)), q = sin(t * 15); return { dy: -30 * h, dx: 18 * sin(t * 5), P: { arm1: -130 + 30 * q, arm2: -130 - 30 * q, leg1: 14 * q, leg2: -14 * q, tail: 34 * sin(t * 18), ear: 10 * q } }; },
      lose: nLose(0.8),
    },
  ];
  const TABLE = { yotsu: YOTSU, slime: SLIME, tori: TORI, sakana: SAKANA, ekitai: EKITAI, robot: ROBOT, nisoku: NISOKU };
  // 動きを 書いていない かざりパーツ（はね・ひれ など）は、たいき・かち のとき 小さく ゆらす
  const SWAY = { wing: [7, 3.2], fin: [4, 2.4], ear: [4, 3], crest: [4, 3], antenna: [5, 5], dorsal: [4, 2.4], back: [2, 2], tail: [6, 2.6] };
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
    if (action === 'idle' || action === 'win') for (const k in SWAY) if (parts[k] == null) parts[k] = SWAY[k][0] * sin(t * SWAY[k][1]) * D2R;
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
