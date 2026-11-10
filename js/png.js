// ===== モンスターPNG・プレイヤーPNG の 出力と 読みこみ =====
(function (RG) {
  'use strict';
  const W = RG.PNG_W, H = RG.PNG_H;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  RG.mkCanvas = mk;
  const FONT = "'しねきゃぷしょん','cinecaption','Yomogi','Hiragino Maru Gothic ProN','BIZ UDPGothic','Meiryo',sans-serif";

  // ---- QR ----
  function makeQR(bytes) {
    const qr = window.qrcode(0, 'L');
    qr.addData(String.fromCharCode(...bytes), 'Byte'); qr.make();
    return qr;
  }
  // 席（x, y, 一辺）の中に QRを描く。かえり値：{n, px, x0, y0}（x0,y0＝もようの左上。白い ふちは ふくまない）
  function drawQR(ctx, bytes, sx, sy, size) {
    const qr = makeQR(bytes), n = qr.getModuleCount(), px = Math.max(1, Math.floor(size / (n + 8)));
    const full = (n + 8) * px, bx = sx + Math.floor((size - full) / 2), by = sy + Math.floor((size - full) / 2);
    ctx.fillStyle = '#fff'; ctx.fillRect(bx, by, full, full);
    ctx.fillStyle = '#000';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect(bx + (c + 4) * px, by + (r + 4) * px, px, px);
    return { n, px, x0: bx + 4 * px, y0: by + 4 * px };
  }
  function scanQR(cv) {
    // 透明は 黒に見えてしまうので、白の上に のせてから 読む
    const t = mk(cv.width, cv.height), c = t.getContext('2d');
    c.fillStyle = '#fff'; c.fillRect(0, 0, t.width, t.height); c.drawImage(cv, 0, 0);
    const d = c.getImageData(0, 0, t.width, t.height);
    return window.jsQR(d.data, t.width, t.height, { inversionAttempts: 'dontInvert' });
  }

  // ---- モンスターPNGを 作る ----
  // m＝モンスター、get(pid)＝パーツのキャンバス
  RG.buildMonPNG = function (m, get) {
    const cv = mk(W, H), ctx = cv.getContext('2d'), sh = RG.SHAPES[m.shape];
    const frame = (x, y, w, h) => { ctx.fillStyle = RG.FRAME_COLOR; ctx.fillRect(x - 2, y - 2, w + 4, 2); ctx.fillRect(x - 2, y + h, w + 4, 2); ctx.fillRect(x - 2, y, 2, h); ctx.fillRect(x + w, y, 2, h); };
    for (const p of sh.parts) {
      const [x, y] = p.seat; frame(x, y, p.w, p.h);
      // 関節の めじるし（わくの外がわに 小さな線）。絵には 重ねない
      ctx.fillStyle = RG.JOINT_COLOR;
      const js = []; if (p.cj) js.push(p.cj); sh.parts.filter(c => c.parent === p.id).forEach(c => js.push(c.pj));
      js.forEach(j => { const q = RG.jx(p, j, m.face); ctx.fillRect(x + q[0] - 1, y - 8, 2, 6); ctx.fillRect(x - 8, y + q[1] - 1, 6, 2); });
      const c = get(p.id); if (c) ctx.drawImage(c, x, y);
    }
    (sh.spare || []).forEach(s => frame(s[0], s[1], s[2], s[3]));
    // 見るための すがた と なまえ（データとしては 使わない）
    const [px, py, pw, ph] = RG.PREVIEW_SEAT;
    RG.drawMon(ctx, m, get, px, py, pw, ph, { maxScale: 1 });
    ctx.fillStyle = '#fff'; ctx.fillRect(20, 508, 1010, 192);
    ctx.strokeStyle = '#111'; ctx.lineWidth = 3; ctx.strokeRect(21.5, 509.5, 1007, 189);
    ctx.fillStyle = '#111'; ctx.textBaseline = 'middle';
    ctx.font = '72px ' + FONT; ctx.fillText(m.name, 48, 572);
    ctx.font = '30px ' + FONT;
    ctx.fillText(`${sh.name}　うみのおや：${m.creator.name}　${m.grade}ねんせい　${RG.dayStr(m.date)}`, 50, 646);
    ctx.font = '22px ' + FONT; ctx.textAlign = 'right'; ctx.fillText('らくがき学習バトル', 1010, 532); ctx.textAlign = 'left';
    drawQR(ctx, RG.encodeMon(m), RG.QR_SEAT[0], RG.QR_SEAT[1], RG.QR_SEAT[2]);
    return cv;
  };

  // ---- プレイヤーPNG ----
  RG.buildPlayerPNG = function (p) {
    const cv = mk(640, 360), ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 640, 360);
    ctx.strokeStyle = '#111'; ctx.lineWidth = 4; ctx.strokeRect(8, 8, 624, 344);
    ctx.fillStyle = '#111'; ctx.textBaseline = 'middle';
    ctx.font = '24px ' + FONT; ctx.fillText('らくがき学習バトル', 32, 50);
    ctx.font = '30px ' + FONT; ctx.fillText('プレイヤーデータ', 32, 96);
    ctx.font = '60px ' + FONT; ctx.fillText(p.name, 32, 180);
    ctx.font = '28px ' + FONT; ctx.fillText(`${p.grade}ねんせい`, 34, 250);
    ctx.fillText(`${RG.dayStr(RG.today())}`, 34, 296);
    drawQR(ctx, RG.encodePlayer(p), 360, 60, 248);
    return cv;
  };

  // ---- 画像ファイルを キャンバスに ----
  RG.fileToCanvas = file => new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => { const c = mk(img.naturalWidth, img.naturalHeight); c.getContext('2d').drawImage(img, 0, 0); URL.revokeObjectURL(url); res(c); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('この がぞうは ひらけないよ')); };
    img.src = url;
  });

  RG.readPlayerPNG = function (src) {
    const r = scanQR(src);
    if (!r) throw new Error('QRが みつからないよ');
    return RG.decodePlayer(r.binaryData);
  };

  // ---- モンスターPNGを 読む ----
  // かえり値：{ mon（QRの中身）, parts:{pid:canvas}, blurry（にじんだ画像から 復活させたか） }
  RG.readMonPNG = function (src) {
    const exactSize = src.width === W && src.height === H;
    let cv = src;
    if (!exactSize) { cv = mk(W, H); const c = cv.getContext('2d'); c.imageSmoothingQuality = 'high'; c.drawImage(src, 0, 0, W, H); }
    const r = scanQR(cv);
    if (!r) throw new Error('QRが みつからないよ。べつの がぞうかも しれないよ');
    if (RG.kindOf(r.binaryData) === 2) throw new Error('これは プレイヤーの データだよ。タイトルの「データよみこみ」で つかってね');
    const mon = RG.decodeMon(r.binaryData), sh = RG.SHAPES[mon.shape];
    const ctx = cv.getContext('2d'), all = ctx.getImageData(0, 0, W, H).data;
    const px = (x, y) => { const k = (y * W + x) * 4; return [all[k], all[k + 1], all[k + 2], all[k + 3]]; };
    // そのままの PNGか？（大きさが同じ・わくの色が ぴったり・透明が ある）
    const [fr, fg, fb] = RG.hexRgb(RG.FRAME_COLOR);
    let exact = exactSize;
    if (exact) for (const p of sh.parts) {
      for (const [x, y] of [[p.seat[0] - 1, p.seat[1] - 1], [p.seat[0] + p.w, p.seat[1] + p.h], [p.seat[0] + (p.w >> 1), p.seat[1] - 1]]) {
        const q = px(x, y); if (q[0] !== fr || q[1] !== fg || q[2] !== fb || q[3] !== 255) exact = false;
      }
    }
    if (exact && px(4, 4)[3] !== 0) exact = false;
    const parts = {};
    if (exact) {
      for (const p of sh.parts) {
        if (!mon.has[p.id]) continue;
        const c = mk(p.w, p.h); c.getContext('2d').drawImage(cv, p.seat[0], p.seat[1], p.w, p.h, 0, 0, p.w, p.h);
        parts[p.id] = c;
      }
      return { mon, parts, blurry: false };
    }
    // ---- にじんだ画像（JPEG・縮小など）から 復活させる ----
    // 1) QRの位置で ずれを 直す
    const qr = makeQR(Array.from(r.binaryData)), n = qr.getModuleCount(), qpx = Math.max(1, Math.floor(RG.QR_SEAT[2] / (n + 8)));
    const full = (n + 8) * qpx, ex = RG.QR_SEAT[0] + Math.floor((RG.QR_SEAT[2] - full) / 2) + 4 * qpx, ey = RG.QR_SEAT[1] + Math.floor((RG.QR_SEAT[2] - full) / 2) + 4 * qpx, el = n * qpx;
    const L = r.location, fx = (L.topLeftCorner.x + L.bottomLeftCorner.x) / 2, fy = (L.topLeftCorner.y + L.topRightCorner.y) / 2;
    const fw = (L.topRightCorner.x + L.bottomRightCorner.x) / 2 - fx, fh = (L.bottomLeftCorner.y + L.bottomRightCorner.y) / 2 - fy;
    const sx = fw / el, sy = fh / el;
    let fix = cv;
    if (Math.abs(sx - 1) > 0.012 || Math.abs(sy - 1) > 0.012 || Math.abs(fx - ex) > 2.5 || Math.abs(fy - ey) > 2.5) {
      // 見つけた QRが (ex,ey) に 大きさ el で くるように 描きなおす
      fix = mk(W, H); const c = fix.getContext('2d'); c.imageSmoothingQuality = 'high';
      c.setTransform(1 / sx, 0, 0, 1 / sy, ex - fx / sx, ey - fy / sy); c.drawImage(cv, 0, 0);
    }
    const fctx = fix.getContext('2d');
    // 2) 透明が のこっているか（PNGを 縮小しただけ）／なくなったか（JPEG）
    const corner = fctx.getImageData(2, 2, 8, 8).data; let alphaAlive = true;
    for (let i = 3; i < corner.length; i += 4) if (corner[i] > 40) alphaAlive = false;
    const bg = [corner[0], corner[1], corner[2]];
    const PAL = RG.ALL_RGB, G = RG.GUIDE_IN;
    const near = (r0, g0, b0) => { let best = 0, bd = 1e9; for (let i = 0; i < PAL.length; i++) { const p = PAL[i], d = (p[0] - r0) * (p[0] - r0) + (p[1] - g0) * (p[1] - g0) + (p[2] - b0) * (p[2] - b0); if (d < bd) { bd = d; best = i; } } return best; };
    for (const p of sh.parts) {
      if (!mon.has[p.id]) continue;
      // 3) 解像度を 半分に下げて 読む
      const hw = p.w >> 1, hh = p.h >> 1, half = mk(hw, hh), hc = half.getContext('2d');
      hc.imageSmoothingQuality = 'high'; hc.drawImage(fix, p.seat[0], p.seat[1], p.w, p.h, 0, 0, hw, hh);
      const id = hc.getImageData(0, 0, hw, hh), d = id.data, clear = new Uint8Array(hw * hh);
      if (alphaAlive) { for (let i = 0; i < hw * hh; i++) if (d[i * 4 + 3] < 128) clear[i] = 1; }
      else {
        // 4) JPEGは 透明が ない：わくの ふちから つながっている 背景色を 透明に もどす
        const isBg = i => Math.abs(d[i * 4] - bg[0]) + Math.abs(d[i * 4 + 1] - bg[1]) + Math.abs(d[i * 4 + 2] - bg[2]) < 54;
        const st = [];
        // いちばん外の1列は わくの色が にじむので 先に 透明に。そのひとつ内がわから たどる
        for (let x = 0; x < hw; x++) { clear[x] = clear[(hh - 1) * hw + x] = 1; st.push(hw + x, (hh - 2) * hw + x); }
        for (let y = 0; y < hh; y++) { clear[y * hw] = clear[y * hw + hw - 1] = 1; st.push(y * hw + 1, y * hw + hw - 2); }
        while (st.length) {
          const i = st.pop(); if (clear[i] || !isBg(i)) continue; clear[i] = 1;
          const x = i % hw, y = (i / hw) | 0;
          if (x > 0) st.push(i - 1); if (x < hw - 1) st.push(i + 1); if (y > 0) st.push(i - hw); if (y < hh - 1) st.push(i + hw);
        }
      }
      // 5) 色を パレットの 近い色に よせる。ふちの 1ピクセルは にじんでいるので、内がわの色を もらう
      const idx = new Int16Array(hw * hh).fill(-1);
      for (let i = 0; i < hw * hh; i++) if (!clear[i]) idx[i] = near(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]);
      const edge = i => { const x = i % hw, y = (i / hw) | 0; return (x > 0 && clear[i - 1]) || (x < hw - 1 && clear[i + 1]) || (y > 0 && clear[i - hw]) || (y < hh - 1 && clear[i + hw]); };
      const isEdge = new Uint8Array(hw * hh);
      for (let i = 0; i < hw * hh; i++) if (!clear[i] && edge(i)) isEdge[i] = 1;
      const out = new Int16Array(idx);
      for (let i = 0; i < hw * hh; i++) {
        if (!isEdge[i]) continue;
        const x = i % hw, y = (i / hw) | 0;
        for (const j of [x > 0 ? i - 1 : -1, x < hw - 1 ? i + 1 : -1, y > 0 ? i - hw : -1, y < hh - 1 ? i + hw : -1]) {
          if (j >= 0 && !clear[j] && !isEdge[j]) { out[i] = idx[j]; break; }
        }
      }
      for (let i = 0; i < hw * hh; i++) {
        if (out[i] < 0) { d[i * 4 + 3] = 0; continue; }
        const c = PAL[out[i]]; d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255;
      }
      hc.putImageData(id, 0, 0);
      // 6) もとの大きさに もどす（ガイドの 外は けずる）
      const c = mk(p.w, p.h), cc = c.getContext('2d');
      RG.guidePath(cc, p); cc.clip(); cc.imageSmoothingQuality = 'high'; cc.drawImage(half, 0, 0, p.w, p.h);
      parts[p.id] = c;
    }
    return { mon, parts, blurry: true };
  };

  // ガイド（描ける範囲）の形：わくの 少し内がわの 角丸
  RG.guidePath = function (ctx, p, sx, ox, oy) {
    const s = sx || 1, g = RG.GUIDE_IN * s, x = (ox || 0) + g, y = (oy || 0) + g, w = p.w * s - g * 2, h = p.h * s - g * 2, r = 18 * s;
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  };

  // ---- 保存（ダウンロード）----
  RG.canvasBlob = cv => new Promise(res => cv.toBlob(res, 'image/png'));
  RG.download = async function (cv, name) {
    const blob = await RG.canvasBlob(cv), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };
})(window.RG);
