// ===== バトル（とく → みる → しあいしゅうりょう）。CPU戦（まいにちれんしゅう）と 対人戦（ともだちとたいせん） =====
(function (RG) {
  'use strict';
  const UI = RG.ui, stage = UI.stage, esc = UI.esc;
  const B = RG.battle = {};
  // ---- 数値（SPEC 7-2・7-3。仮）----
  const TIME = 60;                 // とく時間・みる時間（びょう）
  const HP = 1500, DMG_BASE = 80, DMG_K = 0.04, CRIT = 0.05, CRIT_MUL = 1.5, LOCK = 3;
  const CPU = [{ name: 'よわい', iv: 8, acc: 0.6 }, { name: 'ふつう', iv: 6, acc: 0.7 }, { name: 'つよい', iv: 4.5, acc: 0.8 }, { name: 'とてもつよい', iv: 3.5, acc: 0.9 }];
  B.CONST = { TIME, HP, DMG_BASE, DMG_K, CRIT, CRIT_MUL, LOCK, CPU };
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
    const hp = [HP, HP], out = [];
    let end = TIME;
    for (const e of ev) {
      const st = F[e.who].stats[e.s] ? F[e.who].stats[e.s].v : 0, crit = Math.random() < CRIT;
      const dmg = Math.round((DMG_BASE + st * DMG_K) * (crit ? CRIT_MUL : 1)), to = 1 - e.who;
      hp[to] = Math.max(0, hp[to] - dmg);
      out.push({ t: e.t, who: e.who, dmg, crit, hp: hp[to] });
      if (hp[to] <= 0) { end = e.t; break; }
    }
    return { events: out, end, hp, winner: hp[0] === hp[1] ? -1 : hp[0] > hp[1] ? 0 : 1 };
  }
  B.simulate = simulate;

  // =============== みる（シークバーで 殴り合い）===============
  const hill = (u, a, b) => (u <= a || u >= b) ? 0 : Math.sin(Math.PI * (u - a) / (b - a));
  // 白黒の 手書きの 地面（おくゆきの ある 線）
  function groundCanvas() {
    const c = RG.mkCanvas(1280, 720), x = c.getContext('2d'); let seed = 7;
    const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 - 0.5; };
    const wob = (x0, y0, x1, y1, col, w) => { x.strokeStyle = col; x.lineWidth = w; x.lineCap = 'round'; x.beginPath(); const n = 14; for (let i = 0; i <= n; i++) { const px = x0 + (x1 - x0) * i / n + r() * 5, py = y0 + (y1 - y0) * i / n + r() * 5; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); };
    x.fillStyle = '#fff'; x.fillRect(0, 0, 1280, 720);
    const HZ = 330;
    wob(-10, HZ, 1290, HZ, '#111', 3.5);
    for (const gx of [-900, -380, 60, 420, 860, 1220, 1660, 2180]) wob(640 + (gx - 640) * 0.08, HZ + 6, gx, 730, '#c4c4c8', 2.5);
    for (const gy of [366, 418, 496, 600]) wob(-10, gy, 1290, gy, '#c4c4c8', 2.5);
    // とおくの 山と くも、くさ
    x.strokeStyle = '#111'; x.lineWidth = 3; x.lineJoin = 'round';
    x.beginPath(); x.moveTo(60, HZ); x.lineTo(210 + r() * 8, 214); x.lineTo(300, 270); x.lineTo(380 + r() * 8, 236); x.lineTo(500, HZ); x.stroke();
    x.beginPath(); x.moveTo(820, HZ); x.lineTo(960 + r() * 8, 240); x.lineTo(1040, 286); x.lineTo(1120, 250); x.lineTo(1230, HZ); x.stroke();
    for (const [cx, cy] of [[180, 120], [640, 86], [1090, 132]]) { x.beginPath(); x.arc(cx - 38, cy + 8, 22, Math.PI * 0.6, Math.PI * 1.6); x.arc(cx, cy - 8, 32, Math.PI, Math.PI * 2); x.arc(cx + 40, cy + 8, 22, Math.PI * 1.4, Math.PI * 0.4); x.closePath(); x.stroke(); }
    for (const [gx, gy] of [[90, 640], [330, 560], [560, 680], [760, 590], [1010, 660], [1200, 560], [470, 440], [900, 430]]) for (const d of [-12, 0, 12]) { x.beginPath(); x.moveTo(gx + d, gy); x.quadraticCurveTo(gx + d * 1.4, gy - 18, gx + d * 2 + r() * 6, gy - 30 - Math.abs(r()) * 14); x.stroke(); }
    return c;
  }
  let GROUND = null;
  // F＝[じぶん, あいて]（{m, get, name, owner, stats, hits}）、sim＝simulate の かえり値。おわったら resolve
  function watch(F, sim) {
    return new Promise(res => {
      GROUND = GROUND || groundCanvas();
      const mk = (cls, f, i) => `<div class="hp ${cls} box"><p><b>${esc(f.name)}</b><span>${esc(f.owner)}</span></p><div class="hpbar"><i id="hp${i}"></i></div><em id="hpn${i}">${HP}</em></div>`;
      const marks = F.map((f, i) => f.hits.map(h => `<i class="mk ${i ? 'e' : 'p'}" style="left:${h.t / TIME * 100}%"></i>`).join('')).join('');
      UI.show('watch', `<canvas id="bcv" width="1280" height="720"></canvas>${mk('l', F[0], 0)}${mk('r', F[1], 1)}
        <div class="seek box"><i id="skfill"></i>${marks}<u id="skhead"></u></div>
        <div class="sklegend"><span><i class="mk p"></i>${esc(F[0].owner)}</span><span><i class="mk e"></i>${esc(F[1].owner)}</span></div>
        <button class="btn spd" data-a="spd" id="spd">はやさ ×1</button><div class="bend hide box" id="bend">しあい しゅうりょう！</div>`, {
        spd(b) { speed = speed === 1 ? 1.5 : 1; b.textContent = speed === 1 ? 'はやさ ×1' : 'はやさ ×1.5'; b.classList.toggle('on', speed !== 1); },
      });
      const cv = document.getElementById('bcv'), ctx = cv.getContext('2d');
      let speed = 1, T = 0, clk = 0, last = now(), ei = 0, ended = 0;
      const st = F.map((f, i) => ({ act: 'idle', at: 0, hp: HP, flip: i === 0 ? f.m.face === 1 : f.m.face !== 1 }));
      const pend = [], pops = [];
      const BOX = [[150, 250, 330, 300], [800, 250, 330, 300]];
      const set = (i, a) => { st[i].act = a; st[i].at = clk; };
      const loop = () => {
        if (RG.screen !== 'watch') return;
        const n = now(), dt = Math.max(0, Math.min(0.1 * (RG.timeScale || 1), n - last)) * speed; last = n; clk += dt;
        if (!ended) {
          T = Math.min(sim.end, T + dt);
          while (ei < sim.events.length && sim.events[ei].t <= T) { const e = sim.events[ei++]; set(e.who, 'attack'); pend.push({ at: clk + RG.motionDur(F[e.who].m.shape, F[e.who].m.motion || 0, 'attack') * 0.5, e }); }
        }
        for (let k = pend.length - 1; k >= 0; k--) {
          if (clk < pend[k].at) continue;
          const e = pend.splice(k, 1)[0].e, to = 1 - e.who;
          st[to].hp = e.hp; if (st[to].act !== 'lose') set(to, e.hp <= 0 ? 'lose' : 'damage');
          pops.push({ i: to, text: '-' + e.dmg, crit: e.crit, at: clk }); beep(e.crit ? 'crit' : 'hit');
          document.getElementById('hp' + to).style.width = (e.hp / HP * 100) + '%'; document.getElementById('hpn' + to).textContent = e.hp;
        }
        if (!ended && T >= sim.end && !pend.length && ei >= sim.events.length) {
          ended = clk;
          F.forEach((f, i) => { if (sim.winner < 0) return; if (i === sim.winner) set(i, 'win'); else if (st[i].act !== 'lose') set(i, 'lose'); });
          document.getElementById('bend').classList.remove('hide'); beep('end');
          setTimeout(() => { if (RG.screen === 'watch') res(); }, 2800 / (RG.timeScale || 1));
        }
        document.getElementById('skfill').style.width = document.getElementById('skhead').style.left = (T / TIME * 100) + '%';
        // ---- 描く ----
        ctx.drawImage(GROUND, 0, 0);
        const order = st[1].act === 'attack' ? [0, 1] : [1, 0];
        for (const i of order) {
          const f = F[i], s = st[i], t = clk - s.at, d = RG.motionDur(f.m.shape, f.m.motion || 0, s.act);
          if (d && s.act !== 'lose' && t > d) { s.act = 'idle'; s.at = clk; }
          const u = d ? Math.min(1, t / d) : 0, off = s.act === 'attack' ? 250 * hill(u, 0.1, 1) * (i ? -1 : 1) : 0, b = BOX[i];
          ctx.strokeStyle = '#999'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.ellipse(b[0] + b[2] / 2 + off, b[1] + b[3] - 4, 120, 20, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]);
          RG.drawMon(ctx, f.m, f.get, b[0] + off, b[1], b[2], b[3], { maxScale: 1.1, pose: RG.poseFor(f.m, s.act, clk - s.at), flip: s.flip });
        }
        ctx.textAlign = 'center'; ctx.lineJoin = 'round';
        for (let k = pops.length - 1; k >= 0; k--) {
          const p = pops[k], a = (clk - p.at) / 0.9; if (a >= 1) { pops.splice(k, 1); continue; }
          const b = BOX[p.i], px = b[0] + b[2] / 2, py = b[1] + 40 - 70 * a;
          ctx.globalAlpha = 1 - a * a; ctx.font = (p.crit ? 92 : 66) + 'px ' + getComputedStyle(stage).fontFamily;
          ctx.lineWidth = 10; ctx.strokeStyle = '#fff'; ctx.strokeText(p.text, px, py); ctx.fillStyle = '#111'; ctx.fillText(p.text, px, py);
          if (p.crit) { ctx.font = '40px ' + getComputedStyle(stage).fontFamily; ctx.strokeText('かいしん！', px, py - 84); ctx.fillText('かいしん！', px, py - 84); }
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
      <div class="rgrid">${F.map((f, i) => `<div class="box rcard${i === w ? ' win' : ''}"><canvas width="360" height="250" id="rv${i}"></canvas><h3>${esc(f.name)}</h3><p>${esc(f.owner)}</p><p>せいかい <b>${f.hits.length}</b>もん　のこりHP <b>${sim.hp[i]}</b></p></div>`).join('')}</div>
      <div class="row c rbtns"><button class="btn" data-a="home">ホームに もどる</button>${o.vs ? '' : '<button class="btn" data-a="set">なんいどを かえる</button>'}<button class="btn strong" data-a="again">もういっかい</button></div>
      ${o.vs ? '<p class="note rnote">ともだちとの たいせんは きろくに のこらないよ</p>' : '<p class="note rnote">コインと ほうせきは、つぎの こうしんで もらえるように なるよ</p>'}`, {
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
    const row = (label, html) => `<div class="brow"><span>${label}</span><div>${html}</div></div>`;
    const opt = (a, v, text, on, cls) => `<button class="btn bo${on ? ' on' : ''}${cls || ''}" data-a="${a}" data-v="${v}">${text}</button>`;
    UI.show('bset', `<h1 class="ttl">まいにち れんしゅう</h1><button class="btn backbtn" data-a="back">もどる</button><div class="bsetb">
      ${row('モード', opt('mode', 'A', 'ランダムきょうか', P.mode === 'A', ' w') + opt('mode', 'B', 'きょうかを えらぶ', P.mode === 'B', ' w'))}
      ${row('きょうか', names.map((n, i) => opt('subj', i, n, P.mode === 'B' && P.subj === i, P.mode === 'A' ? ' off' : '')).join(''))}
      ${row('がくねん', [1, 2, 3, 4, 5, 6].filter(g => g <= pl.grade).map(g => opt('grade', g, g + 'ねん', P.grade === g)).join(''))}
      ${row('あいて', CPU.map((c, i) => opt('cpu', i, c.name, P.cpu === i)).join(''))}
      ${row('モンスター', mons.map((m, i) => `<button class="btn bm${P.mon === i ? ' on' : ''}" data-a="mon" data-v="${i}"><canvas width="120" height="70" data-bm="${i}"></canvas><b>${esc(m.name)}</b></button>`).join(''))}
      </div><button class="btn strong donebtn" data-a="go">スタート！</button>`, {
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
    const F = [
      { m, get: UI.getter(m), name: m.name, owner: pl.name, stats: RG.stats(m, pl.grade), hits },
      { m: cpu.m, get: cpu.get, name: cpu.m.name, owner: 'コンピューター（' + CPU[P.cpu].name + '）', stats: RG.stats(cpu.m, pl.grade), hits: cpuHits(P.cpu, n, subj < 0 ? -1 : rnd(n)) },
    ];
    const sim = simulate(F);
    await watch(F, sim);
    result(F, sim, { vs: false, again: runPractice });
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
      const F = [
        { m, get: UI.getter(m), name: m.name, owner: who[0], stats: RG.stats(m, g), hits: h0 },
        { m: foe.m, get: foe.get, name: foe.m.name, owner: who[1], stats: RG.stats(foe.m, g), hits: h1 },
      ];
      const sim = simulate(F);
      await UI.tell('ふたりで がめんを みよう！');
      await watch(F, sim);
      result(F, sim, { vs: true, again: runVersus });
    };
  }
})(window.RG);
