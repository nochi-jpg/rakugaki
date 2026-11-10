// ===== バトル（とく → みる → しあいしゅうりょう）。CPU戦（まいにちれんしゅう）と 対人戦（ともだちとたいせん） =====
(function (RG) {
  'use strict';
  const UI = RG.ui, stage = UI.stage, esc = UI.esc;
  const B = RG.battle = {};
  // ---- 数値（SPEC 7-2・7-3。仮）----
  const TIME = 60;                 // とく時間・みる時間（びょう）
  const HP = 1500, DMG_BASE = 80, DMG_K = 0.04, CRIT = 0.05, CRIT_MUL = 1.5, LOCK = 3;
  const CPU = [{ name: 'よわい', iv: 8, acc: 0.6 }, { name: 'ふつう', iv: 6, acc: 0.7 }, { name: 'つよい', iv: 4.5, acc: 0.8 }, { name: 'とてもつよい', iv: 3.5, acc: 0.9 }];
  // CPUの つよさごとの、ほうせきが 出る 確率 と、ひく 回数（何回か ひいて いちばん いいものを もらう）
  const DROP = [0.2, 0.35, 0.5, 0.7], DROP_ROLLS = [1, 1, 2, 3];
  B.CONST = { TIME, HP, DMG_BASE, DMG_K, CRIT, CRIT_MUL, LOCK, CPU, DROP, DROP_ROLLS };
  // テストのとき 時間を 早送りできる（RG.timeScale）
  const now = () => performance.now() * (RG.timeScale || 1) / 1000;
  const wait = s => new Promise(r => setTimeout(r, s * 1000 / (RG.timeScale || 1)));
  const rnd = n => Math.floor(Math.random() * n);
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const subjNames = g => g <= 2 ? RG.SUBJ4 : RG.SUBJ5;
  const S = () => RG.app.S;

  // ---- おと（合成。ファイル不要）----
  let ac = null;
  function beep(kind) {
    if (!UI.seOn) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const [f0, f1, d, type, vol] = { ok: [660, 990, .12, 'triangle', .16], ng: [220, 150, .26, 'sawtooth', .1], hit: [190, 70, .14, 'square', .1], crit: [330, 60, .32, 'square', .13], end: [520, 780, .5, 'triangle', .16], tick: [880, 880, .06, 'triangle', .1] }[kind];
      const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d * 0.8);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d + .02);
    } catch (e) { }
  }

  // =============== 問題 ===============
  // 1〜3年の さんすう・算数は 自動で 作る（仮）
  function mathQ(g) {
    let a, b, q, ans;
    const k = rnd(3);
    if (g <= 1) { if (k) { a = 1 + rnd(9); b = 1 + rnd(9); q = `${a} ＋ ${b} ＝ ？`; ans = a + b; } else { a = 3 + rnd(15); b = 1 + rnd(Math.min(9, a - 1)); q = `${a} － ${b} ＝ ？`; ans = a - b; } }
    else if (g === 2) { if (k === 0) { a = 2 + rnd(8); b = 2 + rnd(8); q = `${a} × ${b} ＝ ？`; ans = a * b; } else if (k === 1) { a = 11 + rnd(60); b = 3 + rnd(28); q = `${a} ＋ ${b} ＝ ？`; ans = a + b; } else { a = 30 + rnd(69); b = 3 + rnd(27); q = `${a} － ${b} ＝ ？`; ans = a - b; } }
    else { if (k === 0) { b = 2 + rnd(8); ans = 2 + rnd(8); a = b * ans; q = `${a} ÷ ${b} ＝ ？`; } else if (k === 1) { a = 11 + rnd(40); b = 2 + rnd(8); q = `${a} × ${b} ＝ ？`; ans = a * b; } else { a = 120 + rnd(700); b = 105 + rnd(180); q = `${a} ＋ ${b} ＝ ？`; ans = a + b; } }
    const set = new Set([ans]);
    for (const d of shuffle([1, -1, 2, -2, 10, -10, 3, 9, -9])) { if (set.size >= 4) break; if (ans + d >= 0) set.add(ans + d); }
    return { s: 1, q, c: [...set].map(String), ex: '' };
  }
  const queues = {};
  // その学年・教科の 問題を 1つ。同じ問題が 続かないように、山を 引ききるまで 出さない
  function nextQ(g, s) {
    let o;
    if (s === 1 && g <= 3) o = mathQ(g);
    else {
      const key = g + '/' + s;
      if (!queues[key] || !queues[key].length) {
        let ids = []; RG.QDB.forEach((q, i) => { if (q[0] === g && q[1] === s) ids.push(i); });
        if (!ids.length) RG.QDB.forEach((q, i) => { if (q[0] <= g && q[1] === s) ids.push(i); });   // 仮の問題が 足りない わくは 下の学年から
        queues[key] = shuffle(ids);
      }
      const q = RG.QDB[queues[key].pop()];
      o = q ? { s, q: q[3], c: q[4].slice(), ex: q[5] } : mathQ(Math.min(3, g));
    }
    const right = o.c[0], c = shuffle(o.c.slice());
    return { s: o.s, q: o.q, c, ans: c.indexOf(right), ex: o.ex };
  }
  B.nextQ = nextQ;

  // =============== とく（60秒）===============
  // かえり値：[{t（何秒めに 正解したか）, s（教科）}]。とちゅうで やめたら null
  function solve(o) {   // o = { who, grade, subj（-1＝ランダム） }
    return new Promise(res => {
      const names = subjNames(o.grade), hits = [];
      let q = null, lockUntil = 0, done = false, t0 = 0, total = 0;
      UI.show('solve', `<div class="qtime box"><i id="qbar"></i></div><div class="qleft box">のこり <b id="qleft">${TIME}</b></div><div class="qcnt box">せいかい <b id="qn">0</b></div>
        <div class="qwho">${esc(o.who)}</div><div class="qsub box" id="qsub"></div><button class="btn qquit" data-a="quit">やめる</button>
        <div class="qbox box"><p id="qtext"></p></div>
        <div class="qch">${[0, 1, 2, 3].map(i => `<button class="btn qc" data-a="ans" data-i="${i}"></button>`).join('')}</div>
        <div class="qlock hide" id="qlock"><div class="box">ざんねん！　<b id="qlk">${LOCK}</b>びょう まってね</div></div>
        <div class="qready" id="qready"><div class="box"><p>${esc(o.who)}</p><b id="qrd">3</b></div></div>`, {
        ans(b) {
          if (done || !q || !t0 || now() < lockUntil) return;
          const i = +b.dataset.i, t = now() - t0; total++;
          if (i === q.ans) { hits.push({ t, s: q.s }); document.getElementById('qn').textContent = hits.length; beep('ok'); put(); }
          else {
            beep('ng'); lockUntil = now() + LOCK;
            stage.querySelectorAll('.qc').forEach((x, k) => x.classList.add(k === q.ans ? 'right' : k === i ? 'wrong' : 'dim'));
            document.getElementById('qlock').classList.remove('hide');
          }
        },
        async quit() { if (await UI.ask('バトルを やめる？', 'やめる', 'つづける')) { done = true; res(null); } },
      });
      function put() {
        q = nextQ(o.grade, o.subj < 0 ? rnd(names.length) : o.subj); B._q = q;
        document.getElementById('qsub').textContent = names[q.s];
        const tx = document.getElementById('qtext'); tx.textContent = q.q; tx.className = q.q.length > 44 ? 'l3' : q.q.length > 24 ? 'l2' : '';
        stage.querySelectorAll('.qc').forEach((x, k) => { x.textContent = q.c[k]; x.className = 'btn qc' + (q.c[k].length > 26 ? ' l3' : q.c[k].length > 13 ? ' l2' : ''); });
      }
      const loop = () => {
        if (done || RG.screen !== 'solve') return;
        const t = now() - t0, left = Math.max(0, Math.min(TIME, TIME - t));
        document.getElementById('qbar').style.width = (left / TIME * 100) + '%';
        document.getElementById('qleft').textContent = Math.ceil(left);
        if (lockUntil) {
          const l = lockUntil - now();
          if (l <= 0) { lockUntil = 0; document.getElementById('qlock').classList.add('hide'); put(); }
          else document.getElementById('qlk').textContent = Math.ceil(l);
        }
        if (t >= TIME) { done = true; beep('end'); res(hits); return; }
        requestAnimationFrame(loop);
      };
      (async () => {   // 3・2・1 → スタート
        for (let n = 3; n >= 1; n--) { if (RG.screen !== 'solve' || done) return; document.getElementById('qrd').textContent = n; beep('tick'); await wait(0.8); }
        if (RG.screen !== 'solve' || done) return;
        document.getElementById('qready').remove(); put(); t0 = now(); requestAnimationFrame(loop);
      })();
    });
  }

  // =============== しあいの 計算 ===============
  // CPUの 正解タイミングを 作る
  function cpuHits(level, nSubj, subj) {
    const c = CPU[level], hits = []; let t = c.iv * (0.5 + Math.random() * 0.5);
    while (t < TIME) { if (Math.random() < c.acc) hits.push({ t, s: subj < 0 ? rnd(nSubj) : subj }); t += c.iv * (0.7 + Math.random() * 0.6); }
    return hits;
  }
  // 2人の 正解から、ダメージと 勝ち負けを 先に 計算しておく
  function simulate(F) {
    const ev = [];
    F.forEach((f, i) => f.hits.forEach(h => ev.push({ t: h.t, who: i, s: h.s })));
    ev.sort((a, b) => a.t - b.t);
    const NOFX = { subj: [0, 0, 0, 0, 0], hp: 0, crit: 0, cmul: 0, def: 0, back: 0 };
    F.forEach(f => { f.fx = f.fx || NOFX; f.maxHp = Math.round(HP * (1 + f.fx.hp)); });
    const hp = [F[0].maxHp, F[1].maxHp], out = [];
    let end = TIME;
    for (const e of ev) {
      const A = F[e.who], to = 1 - e.who, fx = A.fx, st = A.stats[e.s] ? A.stats[e.s].v : 0, crit = Math.random() < CRIT + fx.crit;
      // ダメージ＝（80＋属性値×0.04）×（1＋ほうせきの ボーナス）×（会心なら 1.5＋α）×（1－あいての まもり）
      const up = 1 + (fx.subj[e.s] || 0) + (hp[e.who] <= A.maxHp / 2 ? fx.back : 0);
      const dmg = Math.round((DMG_BASE + st * DMG_K) * up * (crit ? CRIT_MUL + fx.cmul : 1) * (1 - F[to].fx.def));
      hp[to] = Math.max(0, hp[to] - dmg);
      out.push({ t: e.t, who: e.who, dmg, crit, hp: hp[to] });
      if (hp[to] <= 0) { end = e.t; break; }
    }
    return { events: out, end, hp, winner: hp[0] === hp[1] ? -1 : hp[0] > hp[1] ? 0 : 1 };
  }
  B.simulate = simulate;

  // =============== みる（3Dの ステージで 殴り合い。シークバーつき）===============
  const hill = (u, a, b) => (u <= a || u >= b) ? 0 : Math.sin(Math.PI * (u - a) / (b - a));
  const SPEEDS = [1, 1.5, 2, 3];
  // ---- 3D：せかいの 座標（x＝右、y＝上、z＝おく）を がめんに うつす ----
  // カメラは「見る点（tx,ty,tz）」の まわりを、きょり dist・よこの かくど yaw・たての かくど pitch で まわる
  const FOCAL = 780, CXS = 640, CYS = 380, DEG = Math.PI / 180;
  function makeCam(c) {
    const cp = Math.cos(c.pitch), px = c.tx + c.dist * Math.sin(c.yaw) * cp, py = c.ty + c.dist * Math.sin(c.pitch), pz = c.tz - c.dist * Math.cos(c.yaw) * cp;
    let fx = c.tx - px, fy = c.ty - py, fz = c.tz - pz; const fl = Math.hypot(fx, fy, fz); fx /= fl; fy /= fl; fz /= fl;
    let rx = fz, rz = -fx; const rl = Math.hypot(rx, rz) || 1; rx /= rl; rz /= rl;      // 右＝上×前
    const ux = fy * rz, uy = fz * rx - fx * rz, uz = -fy * rx;                          // 上＝前×右
    return {
      // かえり値：[がめんx, がめんy, おくゆき]。おくゆきが 0.2 より 小さい（カメラの うしろ）ときは null
      pr(x, y, z) { const dx = x - px, dy = y - py, dz = z - pz, Z = dx * fx + dy * fy + dz * fz; if (Z < 0.2) return null; return [CXS + FOCAL * (dx * rx + dz * rz) / Z + c.sx, CYS - FOCAL * (dx * ux + dy * uy + dz * uz) / Z + c.sy, Z]; },
    };
  }
  // ステージの 線（手書きの ゆれを つけた、せかいの 座標の 点の ならび）。1回だけ 作る
  let STAGE = null;
  function buildStage() {
    let seed = 11; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 - 0.5; };
    const line = (x0, z0, x1, z1, n) => { const p = []; for (let i = 0; i <= n; i++) p.push([x0 + (x1 - x0) * i / n + r() * 0.12, 0, z0 + (z1 - z0) * i / n + r() * 0.12]); return p; };
    const grid = [], ring = [], ring2 = [], tufts = [], rocks = [], mounts = [], clouds = [];
    for (let x = -14; x <= 14; x += 2) grid.push(line(x, -9, x, 16, 12));
    for (let z = -9; z <= 16; z += 2.5) grid.push(line(-14, z, 14, z, 14));
    for (let i = 0; i <= 44; i++) { const a = i / 44 * Math.PI * 2; ring.push([Math.cos(a) * 5.2 + r() * 0.1, 0, Math.sin(a) * 3.4 + r() * 0.1]); ring2.push([Math.cos(a) * 5.6 + r() * 0.14, 0, Math.sin(a) * 3.8 + r() * 0.14]); }
    for (let i = 0; i < 26; i++) { const a = r() * 6.3 * 2, d = 6.4 + Math.abs(r()) * 14; tufts.push([Math.cos(a) * d, Math.sin(a) * d * 0.8 + 2, 0.5 + Math.abs(r()) * 0.6]); }
    for (let i = 0; i < 7; i++) { const a = r() * 6.3 * 2, d = 7 + Math.abs(r()) * 9; rocks.push([Math.cos(a) * d, Math.sin(a) * d * 0.8 + 3, 0.5 + Math.abs(r()) * 0.7]); }
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2 + r() * 0.3; mounts.push([Math.sin(a) * 70, Math.cos(a) * 70, 12 + Math.abs(r()) * 16, 9 + Math.abs(r()) * 10]); }   // x, z, はば, 高さ
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2 + r(); clouds.push([Math.sin(a) * 60, 20 + Math.abs(r()) * 12, Math.cos(a) * 60, 5 + Math.abs(r()) * 4]); }
    return { grid, ring, ring2, tufts, rocks, mounts, clouds };
  }
  function drawStage(ctx, cam) {
    STAGE = STAGE || buildStage();
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1280, 720);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const poly = (pts, close) => { let on = false; ctx.beginPath(); for (const p of pts) { const q = cam.pr(p[0], p[1], p[2]); if (!q) { on = false; continue; } on ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); on = true; } if (close) ctx.closePath(); ctx.stroke(); };
    // とおくの 山と くも
    ctx.strokeStyle = '#111'; ctx.lineWidth = 3; ctx.fillStyle = '#fff';
    for (const m of STAGE.mounts) {
      const a = cam.pr(m[0], 0, m[1]), t = cam.pr(m[0], m[3], m[1]); if (!a || !t) continue;
      const w = m[2] * FOCAL / a[2];
      ctx.beginPath(); ctx.moveTo(a[0] - w, a[1]); ctx.lineTo(a[0] - w * 0.2, t[1]); ctx.lineTo(a[0] + w * 0.15, a[1] - (a[1] - t[1]) * 0.55); ctx.lineTo(a[0] + w * 0.5, a[1] - (a[1] - t[1]) * 0.8); ctx.lineTo(a[0] + w, a[1]); ctx.fill(); ctx.stroke();
    }
    for (const c of STAGE.clouds) {
      const q = cam.pr(c[0], c[1], c[2]); if (!q) continue; const w = c[3] * FOCAL / q[2];
      ctx.beginPath(); ctx.arc(q[0] - w * 0.5, q[1] + w * 0.1, w * 0.3, Math.PI * 0.6, Math.PI * 1.6); ctx.arc(q[0], q[1] - w * 0.12, w * 0.42, Math.PI, Math.PI * 2); ctx.arc(q[0] + w * 0.52, q[1] + w * 0.1, w * 0.3, Math.PI * 1.4, Math.PI * 0.4); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    // 地面：ます目（うすい線）と リング（黒い線）。地平線より 下を 白く ぬって、山の すそを かくす
    const far = cam.pr(cam.fx0, 0, cam.fz0);
    if (far) { ctx.fillStyle = '#fff'; ctx.fillRect(0, far[1], 1280, 720 - far[1]); ctx.strokeStyle = '#111'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(-10, far[1] + 2); ctx.lineTo(1290, far[1] - 2); ctx.stroke(); }
    ctx.strokeStyle = '#cfcfd4'; ctx.lineWidth = 2.2; for (const g of STAGE.grid) poly(g);
    ctx.strokeStyle = '#111'; ctx.lineWidth = 3.5; poly(STAGE.ring, true);
    ctx.setLineDash([10, 9]); ctx.lineWidth = 2.5; poly(STAGE.ring2, true); ctx.setLineDash([]);
  }
  // 地面に 立っている 小さな もの（くさ・いし）。おくの ものから 描くために まとめて わたす
  function props(cam) {
    const out = [];
    for (const t of STAGE.tufts) { const q = cam.pr(t[0], 0, t[1]); if (q) out.push({ z: q[2], draw(ctx) { const h = t[2] * FOCAL / q[2]; ctx.strokeStyle = '#111'; ctx.lineWidth = Math.max(1.5, 3.2 * 6 / q[2]); for (const d of [-0.3, 0, 0.3]) { ctx.beginPath(); ctx.moveTo(q[0] + d * h * 0.5, q[1]); ctx.quadraticCurveTo(q[0] + d * h * 0.9, q[1] - h * 0.6, q[0] + d * h * 1.5, q[1] - h * (1 - Math.abs(d))); ctx.stroke(); } } }); }
    for (const t of STAGE.rocks) { const q = cam.pr(t[0], 0, t[1]); if (q) out.push({ z: q[2], draw(ctx) { const w = t[2] * FOCAL / q[2]; ctx.strokeStyle = '#111'; ctx.fillStyle = '#fff'; ctx.lineWidth = Math.max(1.5, 3.2 * 6 / q[2]); ctx.beginPath(); ctx.moveTo(q[0] - w, q[1]); ctx.lineTo(q[0] - w * 0.6, q[1] - w * 0.7); ctx.lineTo(q[0] + w * 0.3, q[1] - w * 0.85); ctx.lineTo(q[0] + w, q[1]); ctx.closePath(); ctx.fill(); ctx.stroke(); } }); }
    return out;
  }
  // F＝[じぶん, あいて]（{m, get, name, owner, stats, hits}）、sim＝simulate の かえり値。おわったら resolve
  function watch(F, sim) {
    return new Promise(res => {
      const mk = (cls, f, i) => `<div class="hp ${cls} box"><p><b>${esc(f.name)}</b><span>${esc(f.owner)}</span></p><div class="hpbar"><i id="hp${i}"></i></div><em id="hpn${i}">${f.maxHp}</em></div>`;
      const marks = F.map((f, i) => f.hits.map(h => `<i class="mk ${i ? 'e' : 'p'}" style="left:${h.t / TIME * 100}%"></i>`).join('')).join('');
      UI.show('watch', `<canvas id="bcv" width="1280" height="720"></canvas>${mk('l', F[0], 0)}${mk('r', F[1], 1)}
        <div class="seek box"><i id="skfill"></i>${marks}<u id="skhead"></u></div>
        <div class="sklegend"><span><i class="mk p"></i>${esc(F[0].owner)}</span><span><i class="mk e"></i>${esc(F[1].owner)}</span></div>
        <button class="btn spd${B.speed ? ' on' : ''}" data-a="spd" id="spd">はやさ ×${SPEEDS[B.speed || 0]}</button><div class="bend hide box" id="bend"></div>`, {
        spd(b) { B.speed = ((B.speed || 0) + 1) % SPEEDS.length; b.textContent = 'はやさ ×' + SPEEDS[B.speed]; b.classList.toggle('on', B.speed > 0); },
      });
      const cv = document.getElementById('bcv'), ctx = cv.getContext('2d'), bend = document.getElementById('bend');
      const font = getComputedStyle(stage).fontFamily;
      let T = 0, clk = 0, last = now(), ei = 0, ended = 0, shake = 0;
      const INTRO = 3.0, X0 = [-2.4, 2.4];
      const st = F.map((f, i) => ({ act: 'idle', at: 0, hp: f.maxHp, flip: i === 0 ? f.m.face === 1 : f.m.face !== 1 }));
      const pend = [], pops = [];
      const set = (i, a) => { st[i].act = a; st[i].at = clk; };
      // カメラ：cam＝いまの 位置、goal＝めざす 位置（なめらかに 近づく）
      const cam = { tx: 0, ty: 1.3, tz: 0, dist: 17, yaw: -70 * DEG, pitch: 30 * DEG, sx: 0, sy: 0 }, goal = Object.assign({}, cam);
      let focus = null;   // こうげき中の ちゅうもく：{ who, until, crit }
      const direct = () => {
        if (clk < INTRO) {                       // はじまり：ぐるっと まわりこんで 2ひきを うつす
          const u = clk / INTRO;
          if (u < 0.34) Object.assign(goal, { tx: X0[0], ty: 1.3, tz: 0, dist: 6.2, yaw: (-50 + 60 * u) * DEG, pitch: 9 * DEG });
          else if (u < 0.68) Object.assign(goal, { tx: X0[1], ty: 1.3, tz: 0, dist: 6.2, yaw: (50 - 60 * (u - 0.34)) * DEG, pitch: 9 * DEG });
          else Object.assign(goal, { tx: 0, ty: 1.35, tz: 0, dist: 9.6, yaw: 0, pitch: 11 * DEG });
          return 3.2;
        }
        if (ended) {                             // おわり：かった ほうに よって ゆっくり まわる
          const w = sim.winner, e = clk - ended;
          Object.assign(goal, { tx: w < 0 ? 0 : X0[w] * 0.85, ty: 1.4, tz: 0, dist: w < 0 ? 10 : 6.4, yaw: (w === 1 ? -1 : 1) * (-24 + 16 * e) * DEG, pitch: 8 * DEG });
          return 2.2;
        }
        if (focus && clk < focus.until) {        // こうげき：こうげきする ほうに よって、すこし うしろへ まわりこむ
          const s = focus.who ? 1 : -1, u = 1 - (focus.until - clk) / focus.len;
          Object.assign(goal, { tx: s * (1.5 - 2.3 * hill(u, 0.1, 1)), ty: 1.35, tz: 0, dist: focus.crit ? 5.8 : 6.8, yaw: s * (26 - 20 * u) * DEG, pitch: 7 * DEG });
          return 5.5;
        }
        focus = null;                            // ふだん：2ひきを 見ながら ゆっくり ゆれる
        Object.assign(goal, { tx: 0, ty: 1.35, tz: 0, dist: 9.4, yaw: 10 * Math.sin(clk * 0.45) * DEG, pitch: (10 + 2 * Math.sin(clk * 0.3)) * DEG });
        return 2.6;
      };
      const loop = () => {
        if (RG.screen !== 'watch') return;
        const speed = SPEEDS[B.speed || 0], n = now(), dt = Math.max(0, Math.min(0.1 * (RG.timeScale || 1), n - last)) * speed; last = n; clk += dt;
        // ---- しあいを すすめる ----
        if (clk >= INTRO && !ended) {
          T = Math.min(sim.end, T + dt);
          while (ei < sim.events.length && sim.events[ei].t <= T) {
            const e = sim.events[ei++], d = RG.motionDur(F[e.who].m.shape, F[e.who].m.motion || 0, 'attack');
            set(e.who, 'attack'); pend.push({ at: clk + d * 0.5, e });
            focus = { who: e.who, until: clk + d + 0.35, len: d + 0.35, crit: e.crit };
          }
        }
        for (let k = pend.length - 1; k >= 0; k--) {
          if (clk < pend[k].at) continue;
          const e = pend.splice(k, 1)[0].e, to = 1 - e.who;
          st[to].hp = e.hp; if (st[to].act !== 'lose') set(to, e.hp <= 0 ? 'lose' : 'damage');
          pops.push({ i: to, text: '-' + e.dmg, crit: e.crit, at: clk }); beep(e.crit ? 'crit' : 'hit'); shake = e.crit ? 1 : 0.55;
          document.getElementById('hp' + to).style.width = (e.hp / F[to].maxHp * 100) + '%'; document.getElementById('hpn' + to).textContent = e.hp;
        }
        if (!ended && clk >= INTRO && T >= sim.end && !pend.length && ei >= sim.events.length) {
          ended = clk; focus = null;
          F.forEach((f, i) => { if (sim.winner < 0) return; if (i === sim.winner) set(i, 'win'); else if (st[i].act !== 'lose') set(i, 'lose'); });
          bend.textContent = 'しあい しゅうりょう！'; bend.classList.remove('hide'); beep('end');
          setTimeout(() => { if (RG.screen === 'watch') res(); }, 3400 / (RG.timeScale || 1));
        }
        // はじまりの 文字
        if (clk < INTRO) { const t = clk < INTRO * 0.68 ? 'よーい…' : 'はじめ！'; if (bend.textContent !== t) { bend.textContent = t; bend.classList.remove('hide'); beep('tick'); } }
        else if (!ended && !bend.classList.contains('hide')) bend.classList.add('hide');
        document.getElementById('skfill').style.width = document.getElementById('skhead').style.left = (T / TIME * 100) + '%';
        // ---- カメラ ----
        const k = 1 - Math.exp(-dt * direct());
        for (const key of ['tx', 'ty', 'tz', 'dist', 'yaw', 'pitch']) cam[key] += (goal[key] - cam[key]) * k;
        shake *= Math.exp(-dt * 7); cam.sx = shake * 16 * Math.sin(clk * 70); cam.sy = shake * 12 * Math.cos(clk * 83);
        const C = makeCam(cam); C.fx0 = cam.tx - Math.sin(cam.yaw) * 400; C.fz0 = cam.tz + Math.cos(cam.yaw) * 400;
        // ---- 描く ----
        drawStage(ctx, C);
        const items = props(C);
        F.forEach((f, i) => {
          const s = st[i], t = clk - s.at, d = RG.motionDur(f.m.shape, f.m.motion || 0, s.act);
          if (d && s.act !== 'lose' && t > d) { s.act = 'idle'; s.at = clk; }
          const u = d ? Math.min(1, t / d) : 0, wx = X0[i] + (s.act === 'attack' ? 3.3 * hill(u, 0.1, 1) * (i ? -1 : 1) : 0);
          const q = C.pr(wx, 0, 0); if (!q) return; s.q = q;
          items.push({ z: q[2] - (s.act === 'attack' ? 0.5 : 0), draw(c2) {
            const sc = FOCAL / q[2], bw = 3.3 * sc, bh = 3.0 * sc;
            c2.strokeStyle = '#888'; c2.lineWidth = 2.5; c2.setLineDash([6, 6]); c2.beginPath(); c2.ellipse(q[0], q[1], 1.25 * sc, 1.25 * sc * Math.max(0.12, Math.sin(cam.pitch) * 1.6), 0, 0, 7); c2.stroke(); c2.setLineDash([]);
            RG.drawMon(c2, f.m, f.get, q[0] - bw / 2, q[1] - bh, bw, bh, { maxScale: 9, bottom: true, pose: RG.poseFor(f.m, s.act, clk - s.at), flip: s.flip });
          } });
        });
        items.sort((a, b) => b.z - a.z).forEach(it => it.draw(ctx));
        ctx.textAlign = 'center';
        for (let n2 = pops.length - 1; n2 >= 0; n2--) {
          const p = pops[n2], a = (clk - p.at) / 0.9; if (a >= 1) { pops.splice(n2, 1); continue; }
          const q = st[p.i].q; if (!q) continue; const sc = FOCAL / q[2], px = q[0], py = q[1] - 3.1 * sc - 60 * a, fs = (p.crit ? 96 : 68) * Math.min(1.5, Math.max(0.7, sc / 70));
          ctx.globalAlpha = 1 - a * a; ctx.font = fs + 'px ' + font;
          ctx.lineWidth = fs * 0.16; ctx.strokeStyle = '#fff'; ctx.strokeText(p.text, px, py); ctx.fillStyle = '#111'; ctx.fillText(p.text, px, py);
          if (p.crit) { ctx.font = fs * 0.45 + 'px ' + font; ctx.strokeText('かいしん！', px, py - fs * 0.95); ctx.fillText('かいしん！', px, py - fs * 0.95); }
          ctx.globalAlpha = 1;
        }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    });
  }

  // =============== けっか ===============
  function result(F, sim, o) {
    const w = sim.winner, head = w < 0 ? 'ひきわけ' : o.vs ? `${esc(F[w].owner)}の かち！` : w === 0 ? 'かち！' : 'まけ…';
    UI.show('result', `<h1 class="rhead">${head}</h1>
      <div class="rgrid">${F.map((f, i) => `<div class="box rcard${i === w ? ' win' : ''}"><canvas width="360" height="250" id="rv${i}"></canvas><h3>${esc(f.name)}</h3><p>${esc(f.owner)}</p><p>せいかい <b>${f.hits.length}</b>もん　のこりHP <b>${sim.hp[i]}</b> / ${f.maxHp}</p></div>`).join('')}</div>
      <div class="row c rbtns"><button class="btn" data-a="home">ホームに もどる</button>${o.vs ? '' : '<button class="btn" data-a="set">なんいどを かえる</button>'}<button class="btn strong" data-a="again">もういっかい</button></div>
      <p class="rnote">${o.note || ''}</p>`, {
      home() { UI.home(); }, set() { B.practice(); }, again() { o.again(); },
    });
    F.forEach((f, i) => RG.play(document.getElementById('rv' + i), f.m, f.get, { action: w < 0 ? 'idle' : i === w ? 'win' : 'lose', flip: i === 0 ? f.m.face === 1 : f.m.face !== 1, maxScale: 0.8 }));
  }

  // =============== CPUの モンスター（仮。あとで K.nom の キャラに 入れかえる）===============
  const CPU_NAMES = ['もじゃ', 'ぷにお', 'とげまる', 'ぴかりん', 'のそのそ', 'がおー', 'ひらひら', 'ころん'];
  function dummyMon() {
    const shape = ['slime', 'yotsu', 'tori', 'sakana', 'ekitai', 'robot', 'nisoku'][rnd(7)], parts = {}, C = RG.COLORS.slice(2).map(c => c[1]);
    const main = C[rnd(C.length)], sub = C[rnd(C.length)], m = { shape, face: 1, adj: {}, free: {}, motion: rnd(3), name: CPU_NAMES[rnd(CPU_NAMES.length)] };
    const all = RG.SHAPES[shape].parts.filter(p => !p.free && !p.locked);
    for (const p of all) {
      const c = RG.mkCanvas(p.w, p.h), x = c.getContext('2d');
      RG.guidePath(x, p); x.clip(); x.translate(p.w, 0); x.scale(-1, 1);   // ひだりむきの絵
      x.fillStyle = x.strokeStyle = p.parent ? sub : main; x.lineCap = 'round';
      if (!p.parent) { x.fillStyle = main; x.beginPath(); x.ellipse(p.w / 2, p.h / 2, p.w * 0.43, p.h * 0.36, 0, 0, 7); x.fill(); }
      else { const j = p.cj, cx = p.w / 2, cy = p.h / 2; x.lineWidth = Math.min(p.w, p.h) * 0.4; x.beginPath(); x.moveTo(j[0], j[1]); x.lineTo(cx + (cx - j[0]) * 0.45, cy + (cy - j[1]) * 0.45); x.stroke(); }
      if (['face', 'head', 'up'].includes(p.id) || (shape === 'slime' && p.id === 'body')) {
        const ex = p.w * 0.62, ey = p.h * (shape === 'slime' ? 0.5 : 0.42);
        x.fillStyle = '#fff'; x.beginPath(); x.arc(ex, ey, 15, 0, 7); x.fill(); x.fillStyle = '#23213a'; x.beginPath(); x.arc(ex + 4, ey, 7, 0, 7); x.fill();
      }
      parts[p.id] = c;
    }
    const r = RG.colorRatio(Object.values(parts)); m.r5 = r.r5; m.r4 = r.r4;
    return { m, get: pid => parts[pid] || null };
  }

  // =============== まいにちれんしゅう（CPU戦）===============
  const P = { mode: 'A', subj: 0, grade: 0, cpu: 1, mon: 0 };
  B.practice = function () {
    const pl = S().player, mons = S().mons;
    if (!mons.length) return UI.tell('さきに「キャラクター」で モンスターを つくろう');
    if (!P.grade || P.grade > pl.grade) P.grade = pl.grade;
    if (P.mon >= mons.length) P.mon = 0;
    const names = subjNames(P.grade); if (P.subj >= names.length) P.subj = 0;
    RG.items.rollDay();
    const doneB = i => pl.doneB >> i & 1, cleared = P.mode === 'A' ? pl.doneA : doneB(P.subj);
    const row = (label, html) => `<div class="brow"><span>${label}</span><div>${html}</div></div>`;
    const opt = (a, v, text, on, cls) => `<button class="btn bo${on ? ' on' : ''}${cls || ''}" data-a="${a}" data-v="${v}">${text}</button>`;
    UI.show('bset', `<h1 class="ttl">まいにち れんしゅう</h1><button class="btn backbtn" data-a="back">もどる</button><div class="bsetb">
      ${row('モード', opt('mode', 'A', 'ランダムきょうか' + (pl.doneA ? '<small>すみ</small>' : ''), P.mode === 'A', ' w') + opt('mode', 'B', 'きょうかを えらぶ', P.mode === 'B', ' w'))}
      ${row('きょうか', names.map((n, i) => opt('subj', i, n + (doneB(i) ? '<small>すみ</small>' : ''), P.mode === 'B' && P.subj === i, P.mode === 'A' ? ' off' : '')).join(''))}
      ${row('がくねん', [1, 2, 3, 4, 5, 6].filter(g => g <= pl.grade).map(g => opt('grade', g, g + 'ねん', P.grade === g)).join(''))}
      ${row('あいて', CPU.map((c, i) => opt('cpu', i, c.name, P.cpu === i)).join(''))}
      ${row('モンスター', mons.map((m, i) => `<button class="btn bm${P.mon === i ? ' on' : ''}" data-a="mon" data-v="${i}"><canvas width="120" height="70" data-bm="${i}"></canvas><b>${esc(m.name)}</b></button>`).join(''))}
      </div><p class="bleft">かつと コイン 100。きょうの のこり <b>${RG.items.left()}</b>かい${cleared ? '　／　ここは きょうは もう クリアしたよ' : ''}</p><button class="btn strong donebtn${cleared ? ' off' : ''}" data-a="go">スタート！</button>`, {
      back() { UI.home(); },
      mode(b) { P.mode = b.dataset.v; B.practice(); }, subj(b) { P.subj = +b.dataset.v; B.practice(); }, grade(b) { P.grade = +b.dataset.v; B.practice(); },
      cpu(b) { P.cpu = +b.dataset.v; B.practice(); }, mon(b) { P.mon = +b.dataset.v; B.practice(); },
      go() { return runPractice(); },
    });
    stage.querySelectorAll('canvas[data-bm]').forEach(c => { const m = mons[+c.dataset.bm]; RG.drawMon(c.getContext('2d'), m, UI.getter(m), 4, 2, 112, 66, { maxScale: 1 }); });
  };
  async function runPractice() {
    const pl = S().player, m = S().mons[P.mon], n = subjNames(P.grade).length, subj = P.mode === 'A' ? -1 : P.subj;
    const hits = await solve({ who: pl.name, grade: P.grade, subj });
    if (!hits) return UI.home();
    const cpu = dummyMon();
    RG.items.owners();
    const F = [
      { m, get: UI.getter(m), name: m.name, owner: pl.name, stats: RG.stats(m, pl.grade), hits, fx: RG.gemFx(m.gem, pl.grade) },
      { m: cpu.m, get: cpu.get, name: cpu.m.name, owner: 'コンピューター（' + CPU[P.cpu].name + '）', stats: RG.stats(cpu.m, pl.grade), hits: cpuHits(P.cpu, n, subj < 0 ? -1 : rnd(n)) },
    ];
    const sim = simulate(F);
    await watch(F, sim);
    // かったら：コイン100、きょうの 権利が 1つ きえる、ほうせきが 出ることも（つよい あいてほど 出やすく、いいものが 出やすい）
    let note = sim.winner === 0 ? '' : 'かつまで なんどでも ちょうせん できるよ';
    if (sim.winner === 0) {
      pl.coins += 100; if (P.mode === 'A') pl.doneA = 1; else pl.doneB |= 1 << P.subj;
      RG.app.save(); note = 'コイン +100！';
      if (RG.gemsOn() && Math.random() < DROP[P.cpu]) {
        const t = RG.items.rollBest(Math.random, DROP_ROLLS[P.cpu]);
        await UI.tell(`${RG.gemIcon(t)}<br>ほうせきを みつけた！<br>「${RG.gemName(t)}」<br><span class="note">${RG.gemText(t)}</span>`);
        if (await RG.items.give(t)) note += `　「${RG.gemName(t)}」を てにいれた！`;
      }
    }
    result(F, sim, { vs: false, note, again: sim.winner === 0 ? B.practice : runPractice });
  }

  // =============== ともだちとたいせん（1台で 2人）===============
  const V = { mon: 0, mode: 'A', foe: null };
  B.versus = function () {
    const pl = S().player, mons = S().mons;
    if (!mons.length) return UI.tell('さきに「キャラクター」で モンスターを つくろう');
    if (V.mon >= mons.length) V.mon = 0;
    const foe = V.foe;
    UI.show('vset', `<h1 class="ttl">ともだちと たいせん</h1><button class="btn backbtn" data-a="back">もどる</button>
      <div class="vcol l"><h3>${esc(pl.name)}</h3><div class="vmons">${mons.map((m, i) => `<button class="btn bm${V.mon === i ? ' on' : ''}" data-a="mon" data-v="${i}"><canvas width="120" height="70" data-bm="${i}"></canvas><b>${esc(m.name)}</b></button>`).join('')}</div></div>
      <div class="vmid">たい</div>
      <div class="vcol r"><h3>${foe ? esc(foe.owner) : 'あいて'}</h3>${foe ? `<div class="box vfoe"><canvas width="300" height="200" id="vf"></canvas><b>${esc(foe.m.name)}</b></div>` : '<div class="box vfoe empty"><p>あいての モンスターの<br>PNGを よみこもう</p></div>'}
        <button class="btn" data-a="load">${foe ? 'べつの PNGに かえる' : 'ファイルを えらぶ'}</button></div>
      <div class="brow vmode"><span>モード</span><div><button class="btn bo w${V.mode === 'A' ? ' on' : ''}" data-a="mode" data-v="A">ランダムきょうか</button><button class="btn bo w${V.mode === 'B' ? ' on' : ''}" data-a="mode" data-v="B">きょうかを えらぶ</button></div></div>
      <button class="btn strong donebtn${foe ? '' : ' off'}" data-a="go">スタート！</button>`, {
      back() { UI.home(); }, mon(b) { V.mon = +b.dataset.v; B.versus(); }, mode(b) { V.mode = b.dataset.v; B.versus(); },
      async load() {
        const f = await UI.pickFile(); if (!f) return;
        const r = RG.readMonPNG(await RG.fileToCanvas(f)), q = r.mon;
        if (q.grade !== pl.grade) return UI.tell(`この モンスターは ${q.grade}ねんせいの データだよ。<br>がくねんが ちがうと たいせん できないよ`);
        const m = Object.assign({}, q, { parts: r.parts });
        V.foe = { m, get: pid => r.parts[pid] || null, owner: q.creator.name === pl.name ? q.creator.name + '（あいて）' : q.creator.name };
        B.versus();
      },
      go() { return runVersus(); },
    });
    stage.querySelectorAll('canvas[data-bm]').forEach(c => { const m = mons[+c.dataset.bm]; RG.drawMon(c.getContext('2d'), m, UI.getter(m), 4, 2, 112, 66, { maxScale: 1 }); });
    if (foe) RG.drawMon(document.getElementById('vf').getContext('2d'), foe.m, foe.get, 6, 6, 288, 188, { maxScale: 1 });
  };
  // きょうかを 1つ えらぶ（モードB）
  const pickSubj = (who, grade) => new Promise(res => UI.modal(`<p class="mtext">${esc(who)}は どの きょうかで たたかう？</p><div class="row c wrap">${subjNames(grade).map((n, i) => `<button class="btn" data-a="s" data-i="${i}">${n}</button>`).join('')}</div>`, { s(b) { UI.closeModal(); res(+b.dataset.i); } }));
  async function runVersus() {
    const pl = S().player, m = S().mons[V.mon], foe = V.foe, g = pl.grade;
    const who = [pl.name, foe.owner], subj = [-1, -1];
    if (V.mode === 'B') { subj[0] = await pickSubj(who[0], g); subj[1] = await pickSubj(who[1], g); }
    await UI.tell(`まずは ${esc(who[0])}の ばん。<br>60びょうで できるだけ たくさん こたえよう！<br><span class="note">${esc(who[1])}は みないでね</span>`);
    const h0 = await solve({ who: who[0], grade: g, subj: subj[0] }); if (!h0) return UI.home();
    UI.show('pass', UI.guide(`こうたい！<br>${esc(who[1])}に わたしてね`) + `<button class="btn big strong okbtn" data-a="go">じゅんび できた</button>`, { go() { next(); } });
    const next = async () => {
      const h1 = await solve({ who: who[1], grade: g, subj: subj[1] }); if (!h1) return UI.home();
      RG.items.owners();
      const F = [
        { m, get: UI.getter(m), name: m.name, owner: who[0], stats: RG.stats(m, g), hits: h0, fx: RG.gemFx(m.gem, g) },
        { m: foe.m, get: foe.get, name: foe.m.name, owner: who[1], stats: RG.stats(foe.m, g), hits: h1, fx: RG.gemFx(foe.m.gem, g) },
      ];
      const sim = simulate(F);
      await UI.tell('ふたりで がめんを みよう！');
      await watch(F, sim);
      result(F, sim, { vs: true, note: 'ともだちとの たいせんは きろくに のこらないよ', again: runVersus });
    };
  }
})(window.RG);
