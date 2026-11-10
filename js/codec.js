// ===== QRの中身（バイト列）の 作り方・読み方。形式は docs/QR_FORMAT.md =====
// ★ 項目は「うしろに足す」だけ。順番を変えない・消さない。変えたら 形式番号（FMT）を 上げる
(function (RG) {
  'use strict';
  const MAGIC = [0x52, 0x47], FMT = 1;      // 'RG' ＋ 形式番号
  const KEY = 'rakugaki/2026/らくがき学習バトル';   // チェック用の数字を作るカギ（書きかえ防止）
  const EPOCH = Date.UTC(2020, 0, 1);
  const te = new TextEncoder(), td = new TextDecoder();
  const BAD = 'この QRは よめないよ';
  class W {
    constructor() { this.b = []; }
    u8(v) { this.b.push(v & 255); }
    u32(v) { for (let i = 0; i < 4; i++) this.b.push((v >>> (i * 8)) & 255); }
    vu(v) { v = Math.max(0, Math.floor(v || 0)); while (v > 127) { this.b.push((v & 127) | 128); v = Math.floor(v / 128); } this.b.push(v); }
    str(s) { const u = te.encode(s || ''); this.vu(u.length); u.forEach(x => this.b.push(x)); }
  }
  class Rd {
    constructor(b) { this.b = b; this.i = 0; }
    u8() { if (this.i >= this.b.length) throw new Error(BAD); return this.b[this.i++]; }
    u32() { let v = 0; for (let i = 0; i < 4; i++) v += this.u8() * Math.pow(256, i); return v >>> 0; }
    vu() { let v = 0, m = 1, x; do { x = this.u8(); v += (x & 127) * m; m *= 128; } while (x & 128); return v; }
    str() { const n = this.vu(); if (this.i + n > this.b.length) throw new Error(BAD); const s = td.decode(new Uint8Array(this.b.slice(this.i, this.i + n))); this.i += n; return s; }
  }
  function hash(bytes) {
    let h = 0x811c9dc5; const k = te.encode(KEY);
    for (const x of [...k, ...bytes, ...k]) { h ^= x; h = Math.imul(h, 0x01000193) >>> 0; }
    return h >>> 0;
  }
  const seal = w => { w.u32(hash(w.b)); return w.b; };
  function open(bytes, kind) {
    bytes = Array.from(bytes || []);
    if (bytes.length < 9 || bytes[0] !== MAGIC[0] || bytes[1] !== MAGIC[1]) throw new Error('らくがき学習バトルの QRでは ないよ');
    if (bytes[2] > FMT) throw new Error('あたらしい バージョンの QRだよ');
    const body = bytes.slice(0, -4), r = new Rd(bytes.slice(-4));
    if (r.u32() !== hash(body)) throw new Error('QRが こわれているよ');
    if (bytes[3] !== kind) throw new Error(kind === 1 ? 'これは モンスターの データでは ないよ' : 'これは プレイヤーの データでは ないよ');
    const rd = new Rd(body); rd.i = 4; rd.fmt = bytes[2]; return rd;
  }
  RG.today = () => Math.floor((Date.now() - EPOCH) / 864e5);
  RG.dayStr = n => { const d = new Date(EPOCH + n * 864e5); return `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()}`; };
  RG.newId = () => (Math.floor(Math.random() * 0xffffffff) >>> 0) || 1;
  RG.kindOf = b => (b && b[0] === MAGIC[0] && b[1] === MAGIC[1]) ? b[3] : 0;

  // ---- モンスター（kind 1）----
  RG.encodeMon = function (m) {
    const w = new W(), parts = RG.SHAPES[m.shape].parts;
    MAGIC.forEach(x => w.u8(x)); w.u8(FMT); w.u8(1);
    w.u32(m.id); w.str(m.name); w.u8(RG.SHAPES[m.shape].no); w.u8(m.face ? 1 : 0);
    let mask = 0; parts.forEach((p, i) => { if (m.parts[p.id]) mask += Math.pow(2, i); }); w.vu(mask);
    m.r5.forEach(v => w.vu(v)); m.r4.forEach(v => w.vu(v));
    parts.filter(p => p.parent).forEach(p => { const a = (m.adj && m.adj[p.id]) || [0, 0, p.z]; w.u8(a[0] + 32); w.u8(a[1] + 32); w.u8(a[2] == null ? p.z : a[2]); });
    w.u8(m.motion || 0);
    for (let i = 0; i < 3; i++) w.u8((m.gems && m.gems[i]) || 0);
    w.str(m.creator.name); w.u32(m.creator.id); w.u8(m.grade); w.vu(m.date);
    return seal(w);
  };
  RG.decodeMon = function (bytes) {
    const r = open(bytes, 1), m = { id: r.u32(), name: r.str() };
    m.shape = RG.shapeByNo(r.u8()); if (!m.shape) throw new Error('この からだの かたちは まだ つかえないよ');
    const parts = RG.SHAPES[m.shape].parts;
    m.face = r.u8() ? 1 : 0;
    const mask = r.vu(); m.has = {}; parts.forEach((p, i) => { if (Math.floor(mask / Math.pow(2, i)) % 2) m.has[p.id] = true; });
    m.r5 = [0, 0, 0, 0, 0].map(() => r.vu()); m.r4 = [0, 0, 0, 0].map(() => r.vu());
    m.adj = {}; parts.filter(p => p.parent).forEach(p => { m.adj[p.id] = [r.u8() - 32, r.u8() - 32, r.u8() ? 1 : 0]; });
    m.motion = r.u8(); m.gems = [r.u8(), r.u8(), r.u8()];
    m.creator = { name: r.str(), id: r.u32() }; m.grade = r.u8(); m.date = r.vu();
    return m;
  };

  // ---- プレイヤー（kind 2）----
  RG.encodePlayer = function (p) {
    const w = new W();
    MAGIC.forEach(x => w.u8(x)); w.u8(FMT); w.u8(2);
    w.str(p.name); w.u32(p.id); w.u8(p.grade); w.vu(p.coins);
    w.u8((p.gems || []).length); (p.gems || []).forEach(g => w.u8(g));
    let mask = 0; RG.SHAPE_ORDER.forEach((s, i) => { if (p.shapes.includes(s)) mask |= 1 << i; }); w.u8(mask);
    w.u8(p.slots); w.vu(p.day || 0); w.u8(p.doneA || 0); w.u8(p.doneB || 0); w.u8(p.bonus || 0); w.u8(p.tutorial ? 1 : 0);
    return seal(w);
  };
  RG.decodePlayer = function (bytes) {
    const r = open(bytes, 2), p = { name: r.str(), id: r.u32(), grade: r.u8(), coins: r.vu() };
    const n = r.u8(); p.gems = []; for (let i = 0; i < n; i++) p.gems.push(r.u8());
    const mask = r.u8(); p.shapes = RG.SHAPE_ORDER.filter((s, i) => mask & (1 << i));
    p.slots = r.u8(); p.day = r.vu(); p.doneA = r.u8(); p.doneB = r.u8(); p.bonus = r.u8(); p.tutorial = !!r.u8();
    return p;
  };
})(window.RG);
