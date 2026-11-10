// ===== おえかき（パーツを1つずつ描く）。お絵描きリレーの描画エンジンを 透明の紙・小さいパーツ用に 直したもの =====
(function (RG) {
  'use strict';
  const VW = 720, VH = 540, DPR = 2;   // 見える紙の大きさ（画面の座標）と、くっきり見せる倍率
  const mk = RG.mkCanvas;

  // shape, face, sources:{pid:canvas}（なおすとき）, onChange()
  RG.Editor = function (view, opt) {
    const E = this, sh = RG.SHAPES[opt.shape];
    E.free = opt.free || {};
    // いま 描ける パーツ（じゆうパーツを つけたり はずしたり すると 変わる）
    const model = () => ({ shape: opt.shape, adj: E.adj, free: E.free });
    const PARTS = () => RG.usableParts(model()), partNow = pid => PARTS().find(p => p.id === pid) || RG.part(opt.shape, pid);
    const vctx = view.getContext('2d');
    view.width = VW * DPR; view.height = VH * DPR;
    E.face = opt.face; E.adj = opt.adj || {}; E.parts = PARTS;
    E.st = { tool: 'pen', color: RG.COLORS[0][1], size: RG.SIZES[1][1], penOnly: false, guide: true, gattai: false };
    E.cur = sh.parts[0].id;
    const P = {};   // pid → {cv, ctx, base, strokes, redo}
    for (const p of sh.parts) {
      const cv = mk(p.w, p.h), ctx = cv.getContext('2d');
      RG.guidePath(ctx, p); ctx.clip();          // ガイドの外には はみださない（自動で けずる）
      P[p.id] = { p, cv, ctx, base: (opt.sources && opt.sources[p.id]) || null, strokes: [], redo: [], ink: false };
      renderPart(P[p.id]);
    }
    E.canvasOf = pid => P[pid] && P[pid].ink ? P[pid].cv : null;
    E.hasInk = pid => !!(P[pid] && P[pid].ink);
    let stroke = null, activeId = null, blink = null, raf = 0;

    // ---- 描画 ----
    function drawDot(c, s, p) { c.beginPath(); c.arc(p[0], p[1], p[2] / 2, 0, Math.PI * 2); c.fill(); }
    function drawSeg(c, s, i) {
      const Q = s.pts; if (i < 1) return;
      const p0 = Q[i - 2] || Q[i - 1], p1 = Q[i - 1], p2 = Q[i];
      c.lineWidth = (p1[2] + p2[2]) / 2; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath(); c.moveTo((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2); c.quadraticCurveTo(p1[0], p1[1], (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2); c.stroke();
    }
    function begin(c, s) {
      c.globalCompositeOperation = s.tool === 'eraser' ? 'destination-out' : 'source-over';
      c.fillStyle = c.strokeStyle = s.tool === 'eraser' ? '#000' : s.color;
    }
    function drawStroke(c, s) {
      begin(c, s);
      if (s.tool === 'fill') { const sp = s.spans; for (let i = 0; i < sp.length; i += 3) c.fillRect(sp[i + 1] - 1, sp[i] - 1, sp[i + 2] - sp[i + 1] + 3, 3); }
      else {
        drawDot(c, s, s.pts[0]);
        for (let i = 1; i < s.pts.length; i++) drawSeg(c, s, i);
        const n = s.pts.length; if (n > 1) { const a = s.pts[n - 2], b = s.pts[n - 1]; c.lineWidth = b[2]; c.lineCap = 'round'; c.beginPath(); c.moveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); c.lineTo(b[0], b[1]); c.stroke(); }
      }
      c.globalCompositeOperation = 'source-over';
    }
    function renderPart(o) {
      const c = o.ctx; c.clearRect(0, 0, o.p.w, o.p.h);
      let start = -1; o.strokes.forEach((s, i) => { if (s.tool === 'clear') start = i; });
      if (start < 0 && o.base) c.drawImage(o.base, 0, 0);
      for (let i = start + 1; i < o.strokes.length; i++) drawStroke(c, o.strokes[i]);
      const d = c.getImageData(0, 0, o.p.w, o.p.h).data; let ink = false;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 24) { ink = true; break; }
      o.ink = ink;
    }
    // バケツ：ぬった範囲を「横1列ずつの区間」で記録（もどす・すすむでも 同じ形）
    function computeFill(o, fx, fy, hex) {
      const w = o.p.w, h = o.p.h, x0 = Math.floor(fx), y0 = Math.floor(fy);
      if (x0 < 0 || y0 < 0 || x0 >= w || y0 >= h) return null;
      const img = o.ctx.getImageData(0, 0, w, h).data, k0 = (y0 * w + x0) * 4;
      const tr = img[k0], tg = img[k0 + 1], tb = img[k0 + 2], ta = img[k0 + 3], [fr, fg, fb] = RG.hexRgb(hex);
      if (ta > 250 && Math.abs(tr - fr) + Math.abs(tg - fg) + Math.abs(tb - fb) < 12) return null;
      // 色の ちがいは きびしめに 見る（近い色の線で かこんだ所だけを ぬれるように）。ふちの にじみは ぬるときに 1ピクセル ひろげて うめる
      const T = 48, seen = new Uint8Array(w * h);
      const ok = q => {
        if (seen[q]) return false; const k = q * 4;
        if (ta < 40) return img[k + 3] < 110;   // 透明な所から ぬるとき：うすい所まで
        return Math.abs(img[k] - tr) + Math.abs(img[k + 1] - tg) + Math.abs(img[k + 2] - tb) + Math.abs(img[k + 3] - ta) <= T;
      };
      const spans = [], stack = [x0, y0];
      while (stack.length) {
        const y = stack.pop(), x = stack.pop(), row = y * w;
        if (!ok(row + x)) continue;
        let l = x, r = x;
        while (l > 0 && ok(row + l - 1)) l--;
        while (r < w - 1 && ok(row + r + 1)) r++;
        seen.fill(1, row + l, row + r + 1); spans.push(y, l, r);
        for (const ny of [y - 1, y + 1]) {
          if (ny < 0 || ny >= h) continue;
          const nrow = ny * w; let i = l;
          while (i <= r) { if (ok(nrow + i)) { stack.push(i, ny); while (i <= r && ok(nrow + i)) i++; } else i++; }
        }
      }
      return new Int16Array(spans);
    }

    // ---- 見えかた ----
    // いまのパーツの「紙の座標 → 画面の座標」
    function viewOf() {
      const p = partNow(E.cur);
      if (!E.st.gattai) { const s = Math.min((VW - 24) / p.w, (VH - 24) / p.h); return { s, ox: (VW - p.w * s) / 2, oy: (VH - p.h * s) / 2, L: null }; }
      const parts = PARTS(), L = RG.layout(model(), pid => parts.some(q => q.id === pid));
      const s = Math.min((VW - 24) / L.w, (VH - 24) / L.h), bx = (VW - L.w * s) / 2, by = (VH - L.h * s) / 2;
      const at = o => [bx + (E.face === 1 ? L.x1 - (o.x + o.p.w) : o.x - L.x0) * s, by + (o.y - L.y0) * s];
      const me = L.order.find(o => o.p.id === E.cur), [ox, oy] = at(me);
      return { s, ox, oy, L, at };
    }
    // そのパーツに ある 関節（自分がわ＋子どもがわ）
    function jointsOf(p) {
      const js = []; if (p.cj) js.push({ pt: RG.jx(p, p.cj, E.face), key: p.id + '>' + p.id, need: true, child: p.id });
      PARTS().filter(c => c.parent === p.id).forEach(c => js.push({ pt: RG.jx(p, c.pj, E.face), key: c.id + '>' + p.id, need: !!c.req || E.hasInk(c.id), child: c.id }));
      return js;
    }
    function render() {
      const c = vctx, v = viewOf(), p = partNow(E.cur), o = P[E.cur];
      c.setTransform(DPR, 0, 0, DPR, 0, 0); c.clearRect(0, 0, VW, VH);
      // 透明を あらわす チェックがら
      c.fillStyle = '#fff'; c.fillRect(0, 0, VW, VH); c.fillStyle = '#e4e4e8';
      for (let y = 0; y < VH; y += 20) for (let x = (y / 20 % 2) * 20; x < VW; x += 40) c.fillRect(x, y, 20, 20);
      c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
      if (v.L) {
        for (const q of v.L.order) {
          if (q.p.id === E.cur) { c.globalAlpha = 1; c.drawImage(o.cv, v.ox, v.oy, p.w * v.s, p.h * v.s); }
          else if (P[q.p.id] && P[q.p.id].ink) { const [x, y] = v.at(q); c.globalAlpha = 0.3; c.drawImage(P[q.p.id].cv, x, y, q.p.w * v.s, q.p.h * v.s); }
        }
        c.globalAlpha = 1;
      } else c.drawImage(o.cv, v.ox, v.oy, p.w * v.s, p.h * v.s);
      const now = performance.now(), on = blink && now < blink.until && Math.floor((now - blink.t0) / 220) % 2 === 0;
      if (E.st.guide || (blink && now < blink.until)) {
        const whole = blink && blink.keys.includes('') && now < blink.until;   // パーツが まるごと まだ → わく全体を 光らせる
        c.lineWidth = whole && on ? 6 : 2; c.setLineDash([8, 6]); c.strokeStyle = whole && on ? '#d22' : '#8a8a94';
        RG.guidePath(c, p, v.s, v.ox, v.oy); if (whole && on) { c.fillStyle = 'rgba(230,40,40,.10)'; c.fill(); } c.stroke(); c.lineWidth = 2;
        for (const j of jointsOf(p)) {
          const miss = blink && blink.keys.includes(j.key) && now < blink.until;
          if (miss && !on) continue;
          c.beginPath(); c.arc(v.ox + j.pt[0] * v.s, v.oy + j.pt[1] * v.s, RG.JR * v.s, 0, Math.PI * 2);
          c.strokeStyle = miss ? '#d22' : (j.need ? '#8a5a2b' : '#c9b79f'); c.lineWidth = miss ? 5 : 2.5;
          if (miss) { c.fillStyle = 'rgba(230,40,40,.18)'; c.fill(); }
          c.stroke();
        }
        c.setLineDash([]);
      }
      if (blink && now < blink.until) { cancelAnimationFrame(raf); raf = requestAnimationFrame(render); } else blink = null;
    }
    E.render = render;

    // ---- 入力 ----
    function toLocal(e) {
      const r = view.getBoundingClientRect(), v = viewOf();
      return [((e.clientX - r.left) * VW / r.width - v.ox) / v.s, ((e.clientY - r.top) * VH / r.height - v.oy) / v.s];
    }
    function widthFor(e, prev) {
      let w = E.st.size;
      if (E.st.tool === 'pen' && e.pointerType === 'pen' && e.pressure > 0) { const t = E.st.size * (0.35 + e.pressure * 1.05); w = prev == null ? t : prev * 0.6 + t * 0.4; }
      return Math.max(1, w);
    }
    const changed = () => { if (opt.onChange) opt.onChange(); };
    view.addEventListener('pointerdown', e => {
      if (activeId !== null) return;
      if (E.st.penOnly && e.pointerType === 'touch') return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      const o = P[E.cur], [x, y] = toLocal(e);
      if (E.st.tool === 'fill') {
        const spans = computeFill(o, x, y, E.st.color);
        if (spans && spans.length) { o.strokes.push({ tool: 'fill', color: E.st.color, spans }); o.redo = []; renderPart(o); render(); changed(); }
        return;
      }
      activeId = e.pointerId; try { view.setPointerCapture(e.pointerId); } catch (_) { }
      stroke = { tool: E.st.tool, color: E.st.color, pts: [[x, y, widthFor(e)]] };
      begin(o.ctx, stroke); drawDot(o.ctx, stroke, stroke.pts[0]); o.ctx.globalCompositeOperation = 'source-over'; render();
    });
    view.addEventListener('pointermove', e => {
      if (e.pointerId !== activeId || !stroke) return;
      const o = P[E.cur], evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      begin(o.ctx, stroke);
      for (const ev of (evs.length ? evs : [e])) {
        const [x, y] = toLocal(ev), last = stroke.pts[stroke.pts.length - 1];
        if (Math.hypot(x - last[0], y - last[1]) < 0.6) continue;
        stroke.pts.push([x, y, widthFor(ev, last[2])]); drawSeg(o.ctx, stroke, stroke.pts.length - 1);
      }
      o.ctx.globalCompositeOperation = 'source-over'; render();
    });
    const end = e => {
      if (e.pointerId !== activeId) return; activeId = null;
      if (stroke) { const o = P[E.cur]; o.strokes.push(stroke); o.redo = []; stroke = null; renderPart(o); render(); changed(); }
    };
    view.addEventListener('pointerup', end); view.addEventListener('pointercancel', end);

    // ---- そうさ ----
    E.select = pid => { E.cur = pid; render(); };
    // じゆうパーツを はずしたとき：その紙を まっさらに
    E.wipe = pid => { const o = P[pid]; o.base = null; o.strokes = []; o.redo = []; renderPart(o); };
    E.undo = () => { const o = P[E.cur]; if (!o.strokes.length) return; o.redo.push(o.strokes.pop()); renderPart(o); render(); changed(); };
    E.redo = () => { const o = P[E.cur]; if (!o.redo.length) return; o.strokes.push(o.redo.pop()); renderPart(o); render(); changed(); };
    E.clear = () => { const o = P[E.cur]; if (!o.ink) return; o.strokes.push({ tool: 'clear' }); o.redo = []; renderPart(o); render(); changed(); };
    E.canUndo = () => P[E.cur].strokes.length > 0; E.canRedo = () => P[E.cur].redo.length > 0;
    // 関節エリアに 絵が あるか
    function inkAt(o, pt) {
      const r = RG.JR, x0 = Math.max(0, Math.floor(pt[0] - r)), y0 = Math.max(0, Math.floor(pt[1] - r));
      const w = Math.min(o.p.w, Math.ceil(pt[0] + r)) - x0, h = Math.min(o.p.h, Math.ceil(pt[1] + r)) - y0;
      const d = o.ctx.getImageData(x0, y0, w, h).data;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (d[(y * w + x) * 4 + 3] > 24 && Math.hypot(x0 + x + .5 - pt[0], y0 + y + .5 - pt[1]) <= r) return true;
      }
      return false;
    }
    // たりない所の一覧：[{pid（描きたす パーツ）, key, text}]
    E.check = function () {
      const miss = [], parts = PARTS();
      for (const p of parts) {
        if (p.req && !P[p.id].ink) { miss.push({ pid: p.id, key: '', text: `「${p.name}」を かこう` }); continue; }
        if (!p.parent || !P[p.id].ink) continue;
        const par = partNow(p.parent);
        if (!P[par.id].ink) continue;
        if (!inkAt(P[p.id], RG.jx(p, p.cj, E.face))) miss.push({ pid: p.id, key: p.id + '>' + p.id, text: `「${p.name}」の まるの なかに かこう` });
        if (!inkAt(P[par.id], RG.jx(par, p.pj, E.face))) miss.push({ pid: par.id, key: p.id + '>' + par.id, text: `「${par.name}」の「${p.name}」と つながる まるの なかに かこう` });
      }
      return miss;
    };
    E.blink = function (miss) {
      const m = miss[0]; E.cur = m.pid;
      blink = { keys: miss.filter(x => x.pid === m.pid).map(x => x.key), t0: performance.now(), until: performance.now() + 2600 };
      render();
    };
    // できあがった パーツ（描いたものだけ）を、あたらしい キャンバスで わたす
    E.result = function () {
      const out = {};
      for (const p of PARTS()) if (P[p.id].ink) { const c = mk(p.w, p.h); c.getContext('2d').drawImage(P[p.id].cv, 0, 0); out[p.id] = c; }
      return out;
    };
    render();
  };
})(window.RG);
