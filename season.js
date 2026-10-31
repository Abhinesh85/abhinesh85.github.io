/* Seasonal touches: a quiet drift of snow and a little tree at Christmas, soft hearts for Valentine's Day, faint ghosts at Halloween...
   Follows the calendar by itself. Admin → Settings → Seasonal effects can force one, or turn them off.
   Preview any of them with  ?season=christmas  on the store address. Off for people who ask their device for reduced motion. */
(function () {
  const TAU = Math.PI * 2, D = (y, m, d) => new Date(y, m - 1, d), add = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const nth = (y, m, wd, n) => { const f = D(y, m, 1); return D(y, m, 1 + ((wd - f.getDay() + 7) % 7) + 7 * (n - 1)); };   // nth weekday of a month (0 = Sunday)
  const lastWd = (y, m, wd) => { const l = D(y, m + 1, 0); return D(y, m, l.getDate() - ((l.getDay() - wd + 7) % 7)); };
  const easter = (y) => { const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1; return D(y, mo, da); };
  const around = (table, before, after) => (y) => { const d = table[y]; return d ? [add(D(y, d[0], d[1]), -before), add(D(y, d[0], d[1]), after)] : null; };
  const ends = (fn, before) => (y) => { const d = fn(y); return [add(d, -before), d]; };
  const LUNAR = { 2027: [2, 6], 2028: [1, 26], 2029: [2, 13], 2030: [2, 3], 2031: [1, 23] };
  const DIWALI = { 2026: [11, 8], 2027: [10, 29], 2028: [10, 17], 2029: [11, 5], 2030: [10, 26], 2031: [11, 14] };
  const EID = { 2027: [3, 10], 2028: [2, 27], 2029: [2, 15], 2030: [2, 5], 2031: [1, 25] };   // Eid al-Fitr, give or take a day

  // p = what drifts down (or up, for ghosts): "kind" or "kind|colour". Kinds: snow flake sparkle heart petal leaf star ghost bat pumpkin egg clover drop moon hat
  const T = [
    { id: "christmas", label: "Christmas", win: (y) => [D(y, 12, 1), D(y, 12, 27)], p: ["snow", "snow", "snow", "snow", "flake", "flake", "sparkle|#f3d48a", "hat"], tree: true },
    { id: "newyear", label: "New Year", win: (y) => [D(y, 12, 28), D(y + 1, 1, 2)], p: ["sparkle|#f3d48a", "sparkle|#f3d48a", "sparkle|#ffffff", "snow"] },
    { id: "valentine", label: "Valentine's Day", win: (y) => [D(y, 2, 1), D(y, 2, 14)], p: ["heart|#e8798f", "heart|#f2a4b4", "heart|#e8798f", "petal|#f6c3cd"] },
    { id: "familyday", label: "Family Day (Canada)", win: (y) => { const d = nth(y, 2, 1, 3); return [add(d, -2), d]; }, p: ["snow", "snow", "flake"] },
    { id: "lunar", label: "Lunar New Year", win: around(LUNAR, 6, 7), p: ["sparkle|#f3d48a", "sparkle|#e8584a", "sparkle|#f3d48a", "petal|#e8584a"] },
    { id: "eid", label: "Eid", win: around(EID, 5, 1), p: ["moon|#f3d48a", "sparkle|#f3d48a", "sparkle|#ffffff"] },
    { id: "stpatrick", label: "St. Patrick's Day", win: (y) => [D(y, 3, 10), D(y, 3, 17)], p: ["clover|#5bbf7a", "clover|#7bd88f", "sparkle|#f3d48a"] },
    { id: "easter", label: "Easter", win: (y) => { const d = easter(y); return [add(d, -10), d]; }, p: ["egg|#f6c3cd", "egg|#bfe3f5", "egg|#f3e3a0", "petal|#f6c3cd"] },
    { id: "songkran", label: "Songkran", win: (y) => [D(y, 4, 11), D(y, 4, 15)], p: ["drop|#8fd0f2", "drop|#bfe3f5", "snow"] },
    { id: "mothers", label: "Mother's Day", win: (y) => { const d = nth(y, 5, 0, 2); return [add(d, -9), d]; }, p: ["petal|#f6c3cd", "petal|#f2a4b4", "petal|#ffffff"] },
    { id: "victoria", label: "Victoria Day (Canada)", win: (y) => { const d = lastWd(y, 5, 1); const v = d.getDate() > 24 ? add(d, -7) : d; return [add(v, -3), v]; }, p: ["petal|#f6c3cd", "petal|#d9c2f2", "petal|#ffffff"] },
    { id: "memorial", label: "Memorial Day", win: (y) => { const d = lastWd(y, 5, 1); return [add(d, -3), d]; }, p: ["star|#ffffff", "star|#e8584a", "star|#8fb4f2"] },
    { id: "fathers", label: "Father's Day", win: (y) => { const d = nth(y, 6, 0, 3); return [add(d, -7), d]; }, p: ["star|#8fb4f2", "star|#f3d48a", "star|#ffffff"] },
    { id: "canada", label: "Canada Day", win: (y) => [D(y, 6, 24), D(y, 7, 1)], p: ["leaf|#e8584a", "leaf|#d9453a", "snow"] },
    { id: "july4", label: "Fourth of July", win: (y) => [D(y, 6, 28), D(y, 7, 4)], p: ["star|#ffffff", "star|#e8584a", "star|#8fb4f2", "sparkle|#f3d48a"] },
    { id: "labor", label: "Labor Day", win: (y) => { const d = nth(y, 9, 1, 1); return [add(d, -4), d]; }, p: ["star|#8fb4f2", "star|#ffffff"] },
    { id: "halloween", label: "Halloween", win: (y) => [D(y, 10, 15), D(y, 10, 31)], p: ["ghost", "ghost", "pumpkin", "bat|#8b7aa8", "sparkle|#f0a040"] },
    { id: "cthanks", label: "Thanksgiving (Canada)", win: (y) => { const d = nth(y, 10, 1, 2); return [add(d, -6), d]; }, p: ["leaf|#d9792b", "leaf|#c2552b", "leaf|#e0a43a", "leaf|#e8584a"] },
    { id: "diwali", label: "Diwali", win: around(DIWALI, 7, 2), p: ["sparkle|#f3b84a", "sparkle|#f3d48a", "petal|#f0a040", "sparkle|#ffffff"] },
    { id: "remembrance", label: "Veterans / Remembrance Day", win: (y) => [D(y, 11, 4), D(y, 11, 11)], p: ["petal|#d9453a", "petal|#c2362e", "snow"] },
    { id: "thanks", label: "Thanksgiving (US)", win: (y) => { const d = nth(y, 11, 4, 4); return [add(d, -9), d]; }, p: ["leaf|#d9792b", "leaf|#c2552b", "leaf|#e0a43a", "leaf|#b8442b"] },
  ];
  window.PRAJO_SEASONS = T.map((t) => ({ id: t.id, label: t.label }));

  function autoTheme(now) {
    const n = now || new Date(), today = new Date(n.getFullYear(), n.getMonth(), n.getDate()); let best = null;
    for (let y = today.getFullYear() - 1; y <= today.getFullYear() + 1; y++) for (const t of T) { const w = t.win(y); if (w && today >= w[0] && today <= w[1] && (!best || w[1] < best.end)) best = { t, end: w[1] }; }
    return best ? best.t : null;
  }
  window.prajoSeasonNow = (now) => (autoTheme(now) || {}).id || "";

  // small hand-drawn shapes in the theme's colour: calmer than emoji, and they match the site
  const sprites = {};
  function sprite(spec, size, dpr) {
    const key = spec + size + "@" + dpr; if (sprites[key]) return sprites[key];
    const [kind, col = "#ffffff"] = spec.split("|"), s = Math.ceil(size * dpr * 1.2), cv = document.createElement("canvas"); cv.width = cv.height = s; const c = cv.getContext("2d");
    c.translate(s / 2, s / 2); c.scale(s, s); c.fillStyle = col; c.strokeStyle = col; c.lineCap = "round"; c.lineJoin = "round";
    const poly = (pts) => { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.fill(); };
    if (kind === "snow") { const g = c.createRadialGradient(0, 0, 0, 0, 0, .5); g.addColorStop(0, "rgba(255,255,255,.95)"); g.addColorStop(.6, "rgba(255,255,255,.6)"); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.beginPath(); c.arc(0, 0, .5, 0, TAU); c.fill(); }
    else if (kind === "flake") { c.lineWidth = .06; for (let i = 0; i < 6; i++) { c.save(); c.rotate(i * TAU / 6); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -.42); c.moveTo(0, -.24); c.lineTo(.1, -.34); c.moveTo(0, -.24); c.lineTo(-.1, -.34); c.stroke(); c.restore(); } }
    else if (kind === "sparkle") { poly([[0, -.5], [.08, -.08], [.5, 0], [.08, .08], [0, .5], [-.08, .08], [-.5, 0], [-.08, -.08]]); }
    else if (kind === "star") { const pts = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? .2 : .46, a = -Math.PI / 2 + i * Math.PI / 5; pts.push([Math.cos(a) * r, Math.sin(a) * r]); } poly(pts); }
    else if (kind === "heart") { c.translate(0, .04); c.beginPath(); c.moveTo(0, .38); c.bezierCurveTo(-.55, .02, -.4, -.4, 0, -.14); c.bezierCurveTo(.4, -.4, .55, .02, 0, .38); c.fill(); }
    else if (kind === "petal") { c.beginPath(); c.moveTo(0, -.45); c.bezierCurveTo(.4, -.25, .3, .3, 0, .45); c.bezierCurveTo(-.3, .3, -.4, -.25, 0, -.45); c.fill(); }
    else if (kind === "leaf") { c.beginPath(); c.moveTo(0, -.46); c.bezierCurveTo(.5, -.2, .4, .3, 0, .4); c.bezierCurveTo(-.4, .3, -.5, -.2, 0, -.46); c.fill(); c.strokeStyle = "rgba(0,0,0,.25)"; c.lineWidth = .04; c.beginPath(); c.moveTo(0, -.4); c.lineTo(0, .5); c.stroke(); }
    else if (kind === "clover") { for (let i = 0; i < 4; i++) { c.save(); c.rotate(i * Math.PI / 2); c.beginPath(); c.arc(0, -.2, .17, 0, TAU); c.fill(); c.restore(); } c.lineWidth = .06; c.beginPath(); c.moveTo(0, 0); c.lineTo(.12, .42); c.stroke(); }
    else if (kind === "egg") { c.beginPath(); c.ellipse(0, .04, .26, .36, 0, 0, TAU); c.fill(); c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = .05; c.beginPath(); c.moveTo(-.24, .06); c.quadraticCurveTo(0, .16, .24, .06); c.stroke(); }
    else if (kind === "drop") { c.beginPath(); c.moveTo(0, -.46); c.bezierCurveTo(.34, -.02, .3, .4, 0, .42); c.bezierCurveTo(-.3, .4, -.34, -.02, 0, -.46); c.fill(); }
    else if (kind === "moon") { c.beginPath(); c.arc(0, 0, .4, 0, TAU); c.fill(); c.globalCompositeOperation = "destination-out"; c.beginPath(); c.arc(.18, -.06, .34, 0, TAU); c.fill(); }
    else if (kind === "pumpkin") { c.fillStyle = "#e8812a"; c.beginPath(); c.ellipse(0, .06, .4, .32, 0, 0, TAU); c.fill(); c.strokeStyle = "rgba(120,50,0,.4)"; c.lineWidth = .04; c.beginPath(); c.ellipse(0, .06, .16, .32, 0, 0, TAU); c.stroke(); c.fillStyle = "#4f7a3a"; c.fillRect(-.04, -.36, .08, .12); }
    else if (kind === "bat") { c.beginPath(); c.moveTo(0, -.08); c.quadraticCurveTo(-.15, -.3, -.46, -.24); c.quadraticCurveTo(-.34, -.06, -.38, .12); c.quadraticCurveTo(-.2, .02, -.1, .2); c.lineTo(0, .06); c.lineTo(.1, .2); c.quadraticCurveTo(.2, .02, .38, .12); c.quadraticCurveTo(.34, -.06, .46, -.24); c.quadraticCurveTo(.15, -.3, 0, -.08); c.fill(); }
    else if (kind === "ghost") { c.translate(-.5, -.5); c.fillStyle = "rgba(255,255,255,.9)"; c.beginPath(); c.moveTo(.22, .86); c.lineTo(.22, .42); c.bezierCurveTo(.22, .14, .78, .14, .78, .42); c.lineTo(.78, .86); c.quadraticCurveTo(.715, .8, .65, .86); c.quadraticCurveTo(.58, .94, .5, .86); c.quadraticCurveTo(.42, .78, .35, .86); c.quadraticCurveTo(.285, .94, .22, .86); c.closePath(); c.fill(); c.fillStyle = "#23233a"; c.beginPath(); c.ellipse(.41, .44, .04, .06, 0, 0, TAU); c.ellipse(.59, .44, .04, .06, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(.5, .58, .045, .06, 0, 0, TAU); c.fill(); }
    else if (kind === "hat") { c.translate(-.5, -.44); c.fillStyle = "#c8312f"; c.beginPath(); c.moveTo(.16, .66); c.bezierCurveTo(.2, .22, .44, .08, .74, .18); c.bezierCurveTo(.84, .3, .84, .52, .86, .66); c.closePath(); c.fill(); c.fillStyle = "#fff"; c.beginPath(); c.moveTo(.1, .7); c.arcTo(.1, .8, .22, .8, .1); c.lineTo(.8, .8); c.arcTo(.92, .8, .92, .7, .1); c.arcTo(.92, .6, .8, .6, .1); c.lineTo(.22, .6); c.arcTo(.1, .6, .1, .7, .1); c.closePath(); c.fill(); c.beginPath(); c.arc(.76, .15, .1, 0, TAU); c.fill(); }
    return (sprites[key] = cv);
  }

  // a small decorated tree in the bottom-left corner (lights twinkle gently unless the device asks for reduced motion)
  function addTree() {
    const d = document.createElement("div"); d.id = "seasonTree"; d.setAttribute("aria-hidden", "true");
    const lights = [[60, 40, "#ffd98a"], [46, 64, "#ffd98a"], [76, 68, "#ffd98a"], [34, 94, "#ffd98a"], [60, 90, "#ffd98a"], [88, 96, "#ffd98a"], [24, 122, "#ffd98a"], [50, 120, "#ffd98a"], [74, 122, "#ffd98a"], [98, 124, "#ffd98a"]];
    const balls = [[52, 54, "#b8323a"], [70, 80, "#d8b66a"], [42, 106, "#d8b66a"], [66, 108, "#b8323a"], [88, 112, "#d8b66a"], [30, 132, "#b8323a"], [58, 134, "#d8b66a"], [86, 136, "#b8323a"]];
    d.innerHTML = `<style>#seasonTree{position:fixed;left:12px;bottom:12px;z-index:29;pointer-events:none;width:clamp(48px,6vw,72px);opacity:.92}#seasonTree svg{display:block;width:100%;height:auto}
      @media (prefers-reduced-motion:no-preference){#seasonTree .tw{animation:seasonTw 3s ease-in-out infinite}}
      @keyframes seasonTw{0%,100%{opacity:1}50%{opacity:.35}}</style>
      <svg viewBox="0 0 120 172" xmlns="http://www.w3.org/2000/svg"><rect x="53" y="148" width="14" height="20" rx="2" fill="#5e3f26"/>
        <path d="M60 22 L98 70 H22 Z" fill="#1b6b38"/><path d="M60 50 L106 108 H14 Z" fill="#165c30"/><path d="M60 80 L114 150 H6 Z" fill="#114f2a"/>
        <path d="M60 22 L98 70 H60 Z M60 50 L106 108 H60 Z M60 80 L114 150 H60 Z" fill="rgba(0,0,0,.18)"/>
        ${balls.map((b) => `<circle cx="${b[0]}" cy="${b[1]}" r="4.2" fill="${b[2]}"/>`).join("")}
        ${lights.map((l, i) => `<circle class="tw" style="animation-delay:${(i % 5) * .5}s" cx="${l[0]}" cy="${l[1]}" r="2.2" fill="${l[2]}"/>`).join("")}
        <path d="M60 5 L63 13.4 L72 14 L65.2 19.6 L67.4 28.2 L60 23.4 L52.6 28.2 L54.8 19.6 L48 14 L57 13.4 Z" fill="#e8c66a"/></svg>`;
    document.body.appendChild(d);
  }

  let cvs = null, ctx = null, parts = [], raf = 0, last = 0, theme = null, dpr = 1, W = 0, H = 0;
  const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches || (navigator.connection && navigator.connection.saveData);
  function make(first) {
    const spec = theme.p[Math.floor(Math.random() * theme.p.length)], kind = spec.split("|")[0], up = kind === "ghost";
    const size = kind === "snow" ? 3 + Math.random() * 5 : kind === "ghost" ? 26 + Math.random() * 16 : kind === "hat" ? 16 + Math.random() * 6 : 9 + Math.random() * 9;
    return { k: kind, spr: sprite(spec, Math.round(size), dpr), size, x: Math.random() * W, y: first ? Math.random() * H : up ? H + size * 2 : -size * 2,
      vy: up ? -(10 + Math.random() * 14) : 14 + Math.random() * 22, amp: 8 + Math.random() * 16, fr: .3 + Math.random() * .6, ph: Math.random() * TAU, rot: Math.random() * TAU,
      vr: kind === "snow" || up ? 0 : (Math.random() - .5) * .8, a: kind === "ghost" ? .38 + Math.random() * .12 : kind === "snow" ? .3 + Math.random() * .35 : .45 + Math.random() * .25 };
  }
  function size() { dpr = Math.min(window.devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cvs.width = W * dpr; cvs.height = H * dpr; cvs.style.width = W + "px"; cvs.style.height = H + "px"; }
  function frame(t) {
    raf = requestAnimationFrame(frame); const dt = Math.min(.05, (t - (last || t)) / 1000); last = t;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.y += p.vy * dt; p.rot += p.vr * dt; const x = p.x + Math.sin(t / 1000 * p.fr + p.ph) * p.amp;
      if (p.vy > 0 ? p.y > H + p.size * 2 : p.y < -p.size * 2) Object.assign(p, make(false));
      ctx.globalAlpha = p.a; ctx.save(); ctx.translate(x, p.y); ctx.rotate(p.k === "snow" ? 0 : p.k === "ghost" ? Math.sin(p.rot * 3 + p.ph) * .1 : Math.sin(p.rot) * .7 + p.rot * .3); ctx.drawImage(p.spr, -p.size * .6, -p.size * .6, p.size * 1.2, p.size * 1.2); ctx.restore();
    }
  }
  function stop() { document.getElementById("seasonTree")?.remove(); cancelAnimationFrame(raf); raf = 0; cvs && cvs.remove(); cvs = ctx = null; parts = []; }
  function start(t) {
    stop(); theme = t; if (!t) return;
    if (t.tree) addTree();
    if (still()) return;
    cvs = document.createElement("canvas"); cvs.setAttribute("aria-hidden", "true"); cvs.id = "seasonFx";
    cvs.style.cssText = "position:fixed;left:0;top:0;pointer-events:none;z-index:30"; document.body.appendChild(cvs); ctx = cvs.getContext("2d"); size();
    const n = W < 700 ? 8 : 14; parts = Array.from({ length: n }, () => make(true)); last = 0; raf = requestAnimationFrame(frame);
  }
  document.addEventListener("visibilitychange", () => { if (!cvs) return; if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (!raf) { last = 0; raf = requestAnimationFrame(frame); } });
  addEventListener("resize", () => { if (cvs) { size(); parts.forEach((p) => { if (p.x > W) p.x = Math.random() * W; }); } });

  // setting: undefined / "auto" follows the calendar; "off" turns it off; a theme id forces that one. ?season=… previews without saving.
  function apply(setting) {
    const q = new URLSearchParams(location.search).get("season"), m = q || setting || "auto";
    start(m === "off" ? null : m === "auto" ? autoTheme() : T.find((t) => t.id === m) || null);
  }
  window.__season = apply;
  const me = document.currentScript;
  if (!me || me.dataset.run !== "off") {
    let cached; try { cached = JSON.parse(localStorage.getItem("prajo:site") || "{}").season; } catch { /* none cached */ }
    const go = () => apply(cached); if (document.body) go(); else document.addEventListener("DOMContentLoaded", go);
  }
})();
