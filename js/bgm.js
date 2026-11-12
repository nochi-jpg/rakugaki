// ===== BGM（チップチューン）：譜面データを その場で 鳴らす。音声ファイルは 使わない =====
// むかしの 携帯ゲーム機ふうの 4チャンネル：矩形波×2（メロディ・和音）＋ 低音（三角波）＋ ノイズ（ドラム）。曲は ぜんぶ オリジナル
// 譜面の 書き方（MML）：
//   c d e f g a b＝ドレミ…、+ / -＝半音 上/下、r＝やすみ、数字＝長さ（4＝4分、8＝8分、16＝16分、2＝2分、1＝全）、.＝ふてん
//   o4＝オクターブ、> <＝オクターブを 上/下、l8＝数字を はぶいたときの 長さ、v0〜15＝音量、@0〜3＝音色（矩形波の 細さ 12.5/25/50/75%）
//   ドラム：k＝キック、s＝スネア、h＝ハット、r＝やすみ
// 1小節ごとに 文字列を 分けて 書く（4分の4。長さが 合わないと RG.chip.check() が 知らせる）
(function (RG) {
  'use strict';
  const C = RG.chip = {};
  const bars = (...b) => b;
  // 低音：ルートと 5度を 4分で（C→"c4 g4 c4 g4"）／オクターブを 8分で 行き来
  const b4 = (r, f) => `${r}4 ${f}4 ${r}4 ${f}4`, oct = r => `${r} >${r}< ${r} >${r}< ${r} >${r}< ${r} >${r}<`;
  const x8 = (a, b) => `${a} ${b} ${a} ${b} ${a} ${b} ${a} ${b}`, x4 = (a, b) => `${a} ${b} ${a} ${b}`;
  const D8 = 'k h s h k h s h', D8b = 'k h s h k k s h';

  // ---- 曲（t＝テンポ。lead＝メロディ、sub＝和音、bass＝低音、drum＝ドラム。intro は はじめに 1回だけ）----
  C.TRACKS = {
    // タイトル：あかるい マーチ（ハ長調）
    title: { t: 150, lead: ['@2 v12 o5 l8', bars('c e g >c <b g e g', 'a4 f a g4. e', 'f a >c f e c <a >c', 'd2 <b4 g4', 'c e g >c <b g e g', 'a4 f a g4. >c', 'd c <b a g a b >d', 'c2. r4<')],
      sub: ['@1 v7 o4 l8', bars(x8('e', 'g'), x4('f', 'a') + ' ' + x4('e', 'g'), x8('f', 'a'), x8('d', 'g'), x8('e', 'g'), x4('f', 'a') + ' ' + x4('e', 'g'), x8('d', 'g'), x8('e', 'g'))],
      bass: ['v12 o3 l8', bars(b4('c', 'g'), 'f4 c4 c4 g4', b4('f', 'c'), b4('g', 'd'), b4('c', 'g'), 'f4 c4 c4 g4', b4('g', 'd'), 'c4 g4 c4 r4')],
      drum: ['v9 l8', bars(D8, D8, D8, D8b, D8, D8, D8b, 'k h s h k4 s4')] },
    // おはなし：しずかで すこし ふしぎ（イ短調）
    story: { t: 84, lead: ['@1 v10 o5 l8', bars('e2 a2', 'g2 e2', 'f2 a2', 'e1', 'e2 >c2<', 'b2 g2', 'a4 g4 f4 e4', 'a1')],
      sub: ['@0 v6 o4 l8', bars('c e a e c e a e', 'c e g e c e g e', 'c f a f c f a f', 'c e g e c e g e', 'c e a e c e a e', 'd g b g d g b g', 'c f a f e g+ b g+', 'c e a e c e a4')],
      bass: ['v11 o3 l8', bars('a1', 'c1', 'f1', 'c1', 'a1', 'g1', 'f2 e2', 'a1')],
      drum: ['v0 l1', bars('r', 'r', 'r', 'r', 'r', 'r', 'r', 'r')] },
    // ホーム：のんびりした まちの 曲（ト長調）
    home: { t: 116, lead: ['@2 v11 o5 l8', bars('d4 g a b4 a g', 'e4 g4 d2', 'c4 e g a4 g e', 'd2. r4', 'd4 g a b4 >d <b', '>e4 d <b a4 g4', 'e g f+ e d4 f+4', 'g2. r4')],
      sub: ['@1 v6 o4 l8', bars(x8('g', 'b'), x4('e', 'g') + ' ' + x4('g', 'b'), x8('e', 'g'), x8('f+', 'a'), x8('g', 'b'), x4('e', 'g') + ' ' + x4('f+', 'a'), x4('e', 'a') + ' ' + x4('f+', 'a'), x8('g', 'b'))],
      bass: ['v12 o3 l8', bars(b4('g', 'd'), 'c4 g4 g4 d4', b4('c', 'g'), b4('d', 'a'), b4('g', 'd'), 'c4 g4 d4 a4', 'a4 e4 d4 a4', 'g4 d4 g4 r4')],
      drum: ['v7 l8', bars('k4 h4 s4 h4', 'k4 h4 s4 h4', 'k4 h4 s4 h4', 'k4 h4 s4 h h', 'k4 h4 s4 h4', 'k4 h4 s4 h4', 'k4 h4 s4 h4', 'k4 h4 s4 r4')] },
    // つくる：じゃまに ならない、ゆったりした 曲（ハ長調）
    make: { t: 100, lead: ['@1 v9 o5 l8', bars('e2 g4 e4', 'd2 f4 d4', 'c2 e4 g4', 'a2 g2', 'e2 g4 >c4<', 'b2 a4 g4', 'a4 f4 d4 e4', 'c1')],
      sub: ['@0 v6 o4 l8', bars('c e g e c e g e', 'd g b g d g b g', 'c e a e c e a e', 'c f a f c e g e', 'c e g e c e g e', 'd g b g d g b g', 'd f a f d g b g', 'c e g e c e g4')],
      bass: ['v11 o3 l8', bars('c2 c2', 'g2 g2', 'a2 a2', 'f2 c2', 'c2 c2', 'g2 g2', 'd2 g2', 'c1')],
      drum: ['v4 l4', bars('h h h h', 'h h h h', 'h h h h', 'h h h h', 'h h h h', 'h h h h', 'h h h h', 'h h h r')] },
    // おみせ：はずむ 曲（ヘ長調）
    shop: { t: 132, lead: ['@2 v11 o5 l8', bars('c f a f >c4< a4', 'b- >d< b- g a4 f4', 'g b- g e f a >c< a', 'g2 r c e g', 'c f a f >c4< a4', 'b- >d f d< b-4 >d4<', '>c< a f a g e c e', 'f2. r4')],
      sub: ['@1 v7 o4 l8', bars(x8('r', 'a'), x4('r', 'b-') + ' ' + x4('r', 'a'), x4('r', 'g') + ' ' + x4('r', 'a'), x8('r', 'g'), x8('r', 'a'), x8('r', 'b-'), x4('r', 'a') + ' ' + x4('r', 'g'), x8('r', 'a'))],
      bass: ['v12 o3 l8', bars(b4('f', 'c'), 'b-4 f4 f4 c4', 'c4 g4 f4 c4', b4('c', 'g'), b4('f', 'c'), b4('b-', 'f'), 'f4 c4 c4 g4', 'f4 c4 f4 r4')],
      drum: ['v8 l8', bars(D8b, D8b, D8b, 'k h s h k h s s', D8b, D8b, D8b, 'k h s h k4 s4')] },
    // とく：はやめで 集中する 曲（ニ短調）
    solve: { t: 156, lead: ['@1 v11 o5 l8', bars('d f a f d f a >d<', 'c e g e c e g >c<', 'b- >d< b- g b- >d f d<', 'a4 a a a4 r4', 'd f a f d f a >d<', 'e g >c< g e g >c e<', 'f e d c+ d e f g', 'a2 r4 a a')],
      sub: ['@0 v6 o4 l8', bars(x8('f', 'a'), x8('e', 'g'), x8('d', 'f'), x8('c+', 'e'), x8('f', 'a'), x8('e', 'g'), x8('f', 'a'), x8('c+', 'e'))],
      bass: ['v12 o3 l8', bars('d d r d d r d d', 'c c r c c r c c', '<b- b- r b- b- r b- b->', '<a a r a a r a a>', 'd d r d d r d d', 'c c r c c r c c', 'd d r d d r d d', '<a a r a a r a a>')],
      drum: ['v8 l8', bars(D8, D8, D8, 'k h s h k h s s', D8, D8, D8, 'k h s h k s s s')] },
    // みる：たたかいの 曲（イ短調）
    watch: { t: 172, lead: ['@2 v12 o5 l8', bars('a4 >c< a e a >c e<', 'g4 b g d g b >d<', 'f4 a f c f a >c<', 'e4 g+ b >e4< b g+', '>c< b a b >c d e c<', '>d c< b >c d e f d<', '>e d c< b >c< b a g+', 'a2 r e a >c<')],
      sub: ['@1 v7 o4 l16', bars(x8('c e', 'a e'), x8('d g', 'b g'), x8('c f', 'a f'), x8('e g+', 'b g+'), x8('c e', 'a e'), x8('d f', 'a f'), x8('e g+', 'b g+'), x8('c e', 'a e'))],
      bass: ['v12 o2 l8', bars(oct('a'), oct('g'), oct('f'), oct('e'), oct('a'), oct('d'), oct('e'), oct('a'))],
      drum: ['v9 l8', bars(D8b, D8b, D8b, 'k h s h k s s s', D8b, D8b, D8b, 'k h s h k k s s')] },
    // かち：ファンファーレ → あかるい くりかえし（ハ長調）
    win: { t: 150,
      intro: { lead: ['@2 v12 o5 l8', bars('c16 c16 c16 r16 c4 e4 g4', '>c2.< r4')], sub: ['@1 v8 o4 l8', bars('e16 e16 e16 r16 e4 g4 >c4<', 'e2. r4')], bass: ['v12 o3 l8', bars('c4 c4 e4 g4', 'c2. r4')], drum: ['v9 l8', bars('s16 s16 s16 r16 k4 k4 s4', 'k4 r2.')] },
      lead: ['@2 v11 o5 l8', bars('e g >c< g e g >c4<', 'f a >c< a f a >c4<', 'g b >d< b g b >d4<', '>c4 <g4 e4 g4')],
      sub: ['@1 v7 o4 l8', bars(x8('c', 'e'), x8('c', 'f'), x8('d', 'g'), x8('c', 'e'))],
      bass: ['v12 o3 l8', bars(b4('c', 'g'), b4('f', 'c'), b4('g', 'd'), b4('c', 'g'))],
      drum: ['v8 l8', bars(D8, D8, D8, D8b)] },
    // まけ：しょんぼり → やさしい くりかえし（イ短調）
    lose: { t: 96,
      intro: { lead: ['@1 v11 o5 l8', bars('e4 d4 c4 <b4', 'a1>')], sub: ['@0 v7 o4 l8', bars('c4 <b4 a4 g+4', 'e1>')], bass: ['v11 o3 l8', bars('a2 e2', 'a1')], drum: ['v0 l1', bars('r', 'r')] },
      lead: ['@1 v9 o5 l8', bars('c4 e4 a2', 'g4 e4 d2', 'c4 e4 g4 a4', 'e1')],
      sub: ['@0 v6 o4 l8', bars('c e a e c e a e', 'd g b g d g b g', 'c f a f c f a f', 'c e a e c e a4')],
      bass: ['v11 o3 l8', bars('a1', 'g1', 'f1', 'a1')],
      drum: ['v0 l1', bars('r', 'r', 'r', 'r')] },
  };

  // ---- 譜面を 読む：かえり値 {ev:[{t（ティック）, d（長さ）, n（音の高さ・ドラムは 'k' など）, v, w（音色）}], len}。4分音符＝48ティック ----
  const SEMI = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  function parse(head, barList, drum) {
    const st = { o: 4, l: 8, v: 10, w: 2 }, ev = []; let t = 0; const lens = [];
    const run = src => {
      const re = /([a-gr]|[ksh])([+\-]?)(\d*)(\.*)|o(\d)|([<>])|l(\d+)|v(\d+)|@(\d)/g; let m;
      while ((m = re.exec(src))) {
        if (m[5]) st.o = +m[5]; else if (m[6]) st.o += m[6] === '>' ? 1 : -1; else if (m[7]) st.l = +m[7]; else if (m[8]) st.v = +m[8]; else if (m[9]) st.w = +m[9];
        else {
          let d = 192 / (m[3] ? +m[3] : st.l); if (m[4]) d *= 1.5;
          const c = m[1];
          if (c !== 'r') {
            if (drum) ev.push({ t, d, n: c, v: st.v });
            else if (SEMI[c] != null) ev.push({ t, d, n: 12 * (st.o + 1) + SEMI[c] + (m[2] === '+' ? 1 : m[2] === '-' ? -1 : 0), v: st.v, w: st.w });
          }
          t += d;
        }
      }
    };
    run(head);
    for (const b of barList) { const t0 = t; run(b); lens.push(t - t0); }
    return { ev, len: t, lens };
  }
  const CH = ['lead', 'sub', 'bass', 'drum'];
  function compile(tr) {
    const part = p => { const o = {}; let len = 0; for (const c of CH) { o[c] = parse(p[c][0], p[c][1], c === 'drum'); len = Math.max(len, o[c].len); } o.len = len; return o; };
    return { t: tr.t, intro: tr.intro ? part(tr.intro) : null, loop: part(tr) };
  }
  // 譜面の 長さが 合っているか（テスト用）。おかしい所の 一覧を 返す
  C.check = function () {
    const bad = [];
    for (const name in C.TRACKS) {
      const k = compile(C.TRACKS[name]);
      for (const [pn, p] of [['intro', k.intro], ['loop', k.loop]]) {
        if (!p) continue;
        for (const c of CH) { p[c].lens.forEach((l, i) => { if (l !== 192) bad.push(`${name} ${pn} ${c} ${i + 1}小節め：${l / 48}拍`); }); if (p[c].len !== p.len) bad.push(`${name} ${pn} ${c}：長さ ${p[c].len / 192}小節（ほかは ${p.len / 192}）`); }
      }
    }
    return bad;
  };

  // ---- 鳴らす ----
  let ctx = null, master = null, timer = 0, cur = null, noiseBuf = null; const waves = {};
  C.playing = null; C.count = 0;
  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    ctx = new AC();
    // 矩形波（細さ 12.5 / 25 / 50 / 75%）を 倍音から 作る
    [0.125, 0.25, 0.5, 0.75].forEach((d, i) => { const N = 40, re = new Float32Array(N), im = new Float32Array(N); for (let n = 1; n < N; n++) re[n] = 2 / (n * Math.PI) * Math.sin(n * Math.PI * d); waves[i] = ctx.createPeriodicWave(re, im); });
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate); const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    return ctx;
  }
  const freq = n => 440 * Math.pow(2, (n - 69) / 12);
  const MIX = { lead: 0.30, sub: 0.20, bass: 0.50, drum: 0.42 };
  function note(ch, e, when, dur, out) {
    const g = ctx.createGain(), v = e.v / 15 * MIX[ch]; g.connect(out);
    if (ch === 'drum') {
      if (e.n === 'k') { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(160, when); o.frequency.exponentialRampToValueAtTime(45, when + 0.11); g.gain.setValueAtTime(v * 1.5, when); g.gain.exponentialRampToValueAtTime(0.001, when + 0.14); o.connect(g); o.start(when); o.stop(when + 0.16); }
      else { const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), hat = e.n === 'h', len = hat ? 0.035 : 0.12; s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = hat ? 7000 : 1800; g.gain.setValueAtTime(v * (hat ? 0.5 : 0.9), when); g.gain.exponentialRampToValueAtTime(0.001, when + len); s.connect(f); f.connect(g); s.start(when); s.stop(when + len + 0.02); }
      return;
    }
    const o = ctx.createOscillator(), gate = Math.max(0.03, dur * 0.9);
    if (ch === 'bass') o.type = 'triangle'; else o.setPeriodicWave(waves[e.w] || waves[2]);
    o.frequency.setValueAtTime(freq(e.n), when);
    // 音の 形：すぐ 立ち上がって、すこしずつ 小さくなる
    g.gain.setValueAtTime(0.0001, when); g.gain.linearRampToValueAtTime(v, when + 0.008);
    g.gain.linearRampToValueAtTime(v * (ch === 'bass' ? 0.85 : 0.55), when + gate); g.gain.linearRampToValueAtTime(0.0001, when + gate + 0.02);
    o.connect(g); o.start(when); o.stop(when + gate + 0.04);
  }
  C.stop = function () {
    clearInterval(timer); timer = 0; C.playing = null;
    if (cur && ctx) { const m = cur.out; try { m.gain.cancelScheduledValues(ctx.currentTime); m.gain.setValueAtTime(m.gain.value, ctx.currentTime); m.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25); } catch (e) { } setTimeout(() => { try { m.disconnect(); } catch (e) { } }, 500); }
    cur = null;
  };
  // name の 曲を くりかえし 鳴らす。vol＝全体の 音量（0〜1）
  C.play = function (name, vol) {
    const tr = C.TRACKS[name]; if (!tr || !ensure()) return false;
    C.stop();
    const k = compile(tr), out = ctx.createGain(), spt = 60 / k.t / 48;      // spt＝1ティックの びょう
    out.gain.value = vol == null ? 0.5 : vol; out.connect(ctx.destination);
    // part＝いま 鳴らしている かたまり（intro か loop）、base＝その かたまりが 始まる 時刻、idx＝チャンネルごとの つぎの 音
    const s = cur = { out, part: k.intro || k.loop, base: ctx.currentTime + 0.12, idx: { lead: 0, sub: 0, bass: 0, drum: 0 } };
    C.playing = name;
    const tick = () => {
      if (cur !== s) return;
      if (ctx.state === 'suspended') return;
      const until = ctx.currentTime + 0.3;
      for (let guard = 0; guard < 4; guard++) {
        let done = true;
        for (const c of CH) {
          const ev = s.part[c].ev;
          while (s.idx[c] < ev.length) { const e = ev[s.idx[c]], when = s.base + e.t * spt; if (when > until) { done = false; break; } note(c, e, Math.max(when, ctx.currentTime), e.d * spt, out); C.count++; s.idx[c]++; }
        }
        // かたまりの さいごまで 予約したら、つぎは くりかえしの 部分へ
        if (!done || s.base + s.part.len * spt > until) break;
        s.base += s.part.len * spt; s.part = k.loop; s.idx = { lead: 0, sub: 0, bass: 0, drum: 0 };
      }
    };
    tick(); timer = setInterval(tick, 80);
    return true;
  };
  // ブラウザは、さいしょに がめんを さわるまで 音を 出せない。さわったら 鳴らしはじめる
  C.unlock = function () { if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => { }); };
  C.ready = () => !!ctx && ctx.state === 'running';
  addEventListener('pointerdown', C.unlock, true); addEventListener('keydown', C.unlock, true);
  // べつの タブに 行ったら 止める
  document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend().catch(() => { }); else if (C.playing) ctx.resume().catch(() => { }); });
})(window.RG);
