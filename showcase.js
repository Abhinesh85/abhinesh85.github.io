/* Draws a design wrapped on the real tumbler photo (with an optional name). Shared by the home page and the admin showcase preview. */
/* design wrapped on the real tumbler photo (same geometry/maths as the designer, front view) */
const TP = { W: 496, H: 1086, SY: 100, L: 112, R: 388, T: 194, B: 1036, CX: 250, RAD: 138, K: 2 }, tpCache = {};
const loadImg = (src) => new Promise((ok, no) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => ok(i); i.onerror = no; i.src = src; });
const artOf = (d) => d.art || (d.card || "").replace(/\/c-([^/]+)$/, "/$1");
const SC_FONTS = {
  script: { fam: '"Great Vibes", cursive', wt: 400, size: 130 }, pacifico: { fam: '"Pacifico", cursive', wt: 400, size: 96 }, dancing: { fam: '"Dancing Script", cursive', wt: 700, size: 112 },
  satisfy: { fam: '"Satisfy", cursive', wt: 400, size: 112 }, lobster: { fam: '"Lobster", cursive', wt: 400, size: 100 }, caveat: { fam: '"Caveat", cursive', wt: 700, size: 120 },
  serif: { fam: '"Fraunces", Georgia, serif', wt: 700, size: 96 }, playfair: { fam: '"Playfair Display", Georgia, serif', wt: 700, size: 96, style: "italic" },
  classic: { fam: '"Cinzel", Georgia, serif', wt: 700, size: 84, upper: true, ls: 3 }, block: { fam: '"Manrope", sans-serif', wt: 800, size: 84, upper: true },
  bebas: { fam: '"Bebas Neue", Impact, sans-serif', wt: 400, size: 120, upper: true, ls: 2 }, marker: { fam: '"Permanent Marker", cursive', wt: 400, size: 84 } };
const scFont = (F, px) => `${F.style || "normal"} ${F.wt} ${px}px ${F.fam}`;
function nameSprite(name, fk, ink, maxW) {   // the name drawn flat, same look as the designer
  const F = SC_FONTS[fk] || SC_FONTS.script, K = 2, text = F.upper ? name.toUpperCase() : name, RAD = TP.RAD;
  const m = document.createElement("canvas").getContext("2d"); m.font = scFont(F, F.size); if ("letterSpacing" in m) m.letterSpacing = (F.ls || 0) + "px";
  let tw = m.measureText(text).width; const fs = F.size * Math.min(1, (maxW || RAD * 2) / Math.max(tw, 1)); tw = tw * fs / F.size;
  const pad = 24, oh = Math.ceil(fs * 1.7), o = document.createElement("canvas"); o.width = Math.ceil((tw + pad * 2) * K); o.height = oh * K;
  const oc = o.getContext("2d"); oc.scale(K, K); oc.font = scFont(F, fs); if ("letterSpacing" in oc) oc.letterSpacing = (F.ls || 0) * fs / F.size + "px"; oc.textAlign = "center"; oc.textBaseline = "middle";
  const mid = oh / 2, x0 = (tw + pad * 2) / 2;
  if (ink === "gold") { const g = oc.createLinearGradient(0, mid - fs * .5, 0, mid + fs * .5); g.addColorStop(0, "#fff3cf"); g.addColorStop(.45, "#e9c46a"); g.addColorStop(1, "#a97a22"); oc.shadowColor = "rgba(60,35,5,.6)"; oc.shadowBlur = 2; oc.shadowOffsetY = 1.4; oc.fillStyle = g; }
  else if (ink === "white") { oc.shadowColor = "rgba(0,0,0,.45)"; oc.shadowBlur = 3; oc.shadowOffsetY = 1; oc.fillStyle = "#ffffff"; } else oc.fillStyle = "#15171c";
  oc.fillText(text, x0, mid); return { o, tw, oh, x0 };
}
let blankTp = "";
async function blankTumbler(tpl) {
  if (tpl && tpl.kind === "flat") return tpl.photo;   // a flat product (luggage tag...): its own blank photo
  if (blankTp) return blankTp;
  const photo = await loadImg("tumbler-white.jpg"), { W, H, SY } = TP, K = 2, cv = document.createElement("canvas"); cv.width = W * K; cv.height = H * K;
  const c = cv.getContext("2d"); c.setTransform(K, 0, 0, K, 0, 0); c.drawImage(photo, 0, SY, W, H, 0, 0, W, H); return (blankTp = cv.toDataURL("image/jpeg", .9));
}
const flatCache = {};
async function flatPreview(d, tpl, opt) {   // a design printed on a flat product (luggage tag...): cover-fit into its printable area; its strap, slot and stitching stay on top
  const key = `f|${tpl.slug}|${d.id}|${opt && opt.name ? `${opt.name}|${opt.f}|${opt.i}|${opt.y ?? ""}` : ""}`; if (flatCache[key]) return flatCache[key];
  const [photo, art] = await Promise.all([loadImg(tpl.photo), loadImg(artOf(d))]), g = tpl.geom, { W, H } = g, L = g.L, R = g.R, T = g.T, B = g.B, aw = R - L, ah = B - T;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const c = cv.getContext("2d"); c.drawImage(photo, 0, g.SY || 0, W, H, 0, 0, W, H);
  c.save(); const r = Math.min(g.radius || 0, aw / 2, ah / 2); c.beginPath(); c.moveTo(L + r, T); c.arcTo(R, T, R, B, r); c.arcTo(R, B, L, B, r); c.arcTo(L, B, L, T, r); c.arcTo(L, T, R, T, r); c.closePath(); c.clip();
  const sc = Math.max(aw / art.naturalWidth, ah / art.naturalHeight), dw = art.naturalWidth * sc, dh = art.naturalHeight * sc; c.drawImage(art, L + aw / 2 - dw / 2, T + ah / 2 - dh / 2, dw, dh);
  if (opt && opt.name) { const nm = nameSprite(opt.name, opt.f, opt.i, aw * .88), ny = opt.y == null || opt.y === "" ? (g.TY || (T + B) / 2) : T + ah * Math.max(0, Math.min(100, Number(opt.y))) / 100; c.drawImage(nm.o, (L + R) / 2 - nm.o.width / 4, ny - nm.oh / 2, nm.o.width / 2, nm.oh); }
  if (g.overlay) { c.globalCompositeOperation = "multiply"; c.drawImage(photo, 0, g.SY || 0, W, H, 0, 0, W, H); c.globalCompositeOperation = "source-over"; }
  c.restore(); return (flatCache[key] = cv.toDataURL("image/jpeg", .9));
}
async function tumblerPreview(d, opt, tpl) {   // opt = { name, f, i } also prints a name on it
  if (tpl && tpl.kind === "flat") return flatPreview(d, tpl, opt);
  const key = d.id + (opt && opt.name ? `|${opt.name}|${opt.f}|${opt.i}|${opt.y ?? ""}|${opt.a ?? ""}` : ""); if (tpCache[key]) return tpCache[key];
  const [photo, art] = await Promise.all([loadImg("tumbler-white.jpg"), loadImg(artOf(d))]);
  const { W, H, SY, L, R, T, B, CX, RAD, K } = TP, TAU = Math.PI * 2, cv = document.createElement("canvas"); cv.width = W * K; cv.height = H * K;
  const c = cv.getContext("2d"); c.setTransform(K, 0, 0, K, 0, 0); c.drawImage(photo, 0, SY, W, H, 0, 0, W, H);
  const lay = document.createElement("canvas"); lay.width = W * K; lay.height = H * K; const lc = lay.getContext("2d"); lc.setTransform(K, 0, 0, K, 0, 0);
  const iw = art.naturalWidth, ih = art.naturalHeight, aw = TAU * RAD, ah = B - T, sc = Math.max(aw / iw, ah / ih), fx = aw / (iw * sc), fy = ah / (ih * sc), sy = (1 - fy) / 2 * ih, shh = fy * ih, half = RAD * .995;
  for (let dx = -half; dx < half; dx += .5) {
    const th = Math.asin(dx / RAD), u = th / TAU + .5, sx = ((1 - fx) / 2 + u * fx) * iw; let sw = (.5 / Math.cos(th)) * (iw * fx / aw); sw = Math.min(sw, iw - sx);
    if (sw > 0) lc.drawImage(art, sx, sy, sw, shh, CX + dx, T, 1, ah);
  }
  c.save(); c.beginPath(); c.moveTo(L, T); c.lineTo(R, T); c.lineTo(R, B - 24); c.quadraticCurveTo(R, B, R - 24, B); c.lineTo(L + 24, B); c.quadraticCurveTo(L, B, L, B - 24); c.closePath(); c.clip();
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = "multiply"; c.drawImage(lay, 0, 0); c.setTransform(K, 0, 0, K, 0, 0);
  if (opt && opt.name) {   // the name, bent around the tumbler like the designer does
    const nm = nameSprite(opt.name, opt.f, opt.i), ny = opt.y == null || opt.y === "" ? 560 : T + (B - T) * Math.max(0, Math.min(100, Number(opt.y))) / 100, na = (Number(opt.a) || 0) * Math.PI / 180, y = ny - nm.oh / 2, nl = document.createElement("canvas"); nl.width = W * K; nl.height = H * K; const nc = nl.getContext("2d"); nc.setTransform(K, 0, 0, K, 0, 0);
    for (let dx = -half; dx < half; dx += .5) { const th = Math.asin(dx / RAD), u = RAD * (th - na); if (Math.abs(u) > nm.tw / 2 + 6) continue; const sx = (nm.x0 + u) * K, sw = (.5 / Math.cos(th)) * K; if (sx < 0 || sx + sw > nm.o.width) continue; nc.drawImage(nm.o, sx, 0, sw, nm.o.height, CX + dx, y, .75, nm.oh); }
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = "source-over"; c.drawImage(nl, 0, 0); c.setTransform(K, 0, 0, K, 0, 0);
  }
  const g = c.createLinearGradient(L, 0, R, 0); g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(.17, "rgba(255,255,255,0)"); g.addColorStop(.25, "rgba(255,255,255,.32)"); g.addColorStop(.33, "rgba(255,255,255,0)");
  g.addColorStop(.8, "rgba(255,255,255,0)"); g.addColorStop(.89, "rgba(255,255,255,.22)"); g.addColorStop(.95, "rgba(255,255,255,0)"); c.globalCompositeOperation = "screen"; c.fillStyle = g; c.fillRect(L, T, R - L, B - T);
  const e = c.createLinearGradient(L, 0, R, 0); e.addColorStop(0, "rgba(40,40,50,.55)"); e.addColorStop(.1, "rgba(40,40,50,.14)"); e.addColorStop(.3, "rgba(255,255,255,0)"); e.addColorStop(.72, "rgba(255,255,255,0)"); e.addColorStop(.92, "rgba(40,40,50,.16)"); e.addColorStop(1, "rgba(40,40,50,.5)");
  c.globalCompositeOperation = "multiply"; c.fillStyle = e; c.fillRect(L, T, R - L, B - T); c.restore();
  return (tpCache[key] = cv.toDataURL("image/jpeg", .9));
}
