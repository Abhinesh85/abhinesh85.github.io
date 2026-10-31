/* Seasonal falling decorations: Santa hats and snow at Christmas, hearts for Valentine's Day, pumpkins at Halloween...
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

  // p = what falls: "hat" (Santa hat), "snow", "confetti", or an emoji
  const T = [
    { id: "christmas", label: "Christmas", win: (y) => [D(y, 12, 1), D(y, 12, 27)], p: ["hat", "hat", "snow", "snow", "snow", "snow", "❄️", "🎄", "🎁"] },
    { id: "newyear", label: "New Year", win: (y) => [D(y, 12, 28), D(y + 1, 1, 2)], p: ["confetti", "confetti", "confetti", "✨", "🎉"] },
    { id: "valentine", label: "Valentine's Day", win: (y) => [D(y, 2, 1), D(y, 2, 14)], p: ["💕", "❤️", "💗", "💖"] },
    { id: "familyday", label: "Family Day (Canada)", win: (y) => { const d = nth(y, 2, 1, 3); return [add(d, -2), d]; }, p: ["snow", "snow", "snow", "❄️"] },
    { id: "lunar", label: "Lunar New Year", win: around(LUNAR, 6, 7), p: ["🧧", "🏮", "✨", "🧧"] },
    { id: "eid", label: "Eid", win: around(EID, 5, 1), p: ["🌙", "⭐", "✨"] },
    { id: "stpatrick", label: "St. Patrick's Day", win: (y) => [D(y, 3, 10), D(y, 3, 17)], p: ["☘️", "🍀", "☘️"] },
    { id: "easter", label: "Easter", win: (y) => { const d = easter(y); return [add(d, -10), d]; }, p: ["🐣", "🥚", "🌷", "🐰"] },
    { id: "songkran", label: "Songkran", win: (y) => [D(y, 4, 11), D(y, 4, 15)], p: ["💦", "💧", "🌼"] },
    { id: "mothers", label: "Mother's Day", win: (y) => { const d = nth(y, 5, 0, 2); return [add(d, -9), d]; }, p: ["🌸", "💐", "🌷", "🌸"] },
    { id: "victoria", label: "Victoria Day (Canada)", win: (y) => { const d = lastWd(y, 5, 1); const v = d.getDate() > 24 ? add(d, -7) : d; return [add(v, -3), v]; }, p: ["🌷", "🌸", "🌼"] },
    { id: "memorial", label: "Memorial Day", win: (y) => { const d = lastWd(y, 5, 1); return [add(d, -3), d]; }, p: ["⭐", "⭐", "🕊️"] },
    { id: "fathers", label: "Father's Day", win: (y) => { const d = nth(y, 6, 0, 3); return [add(d, -7), d]; }, p: ["⭐", "👔", "🏆", "🎣"] },
    { id: "canada", label: "Canada Day", win: (y) => [D(y, 6, 24), D(y, 7, 1)], p: ["🍁", "🍁", "🍁", "⭐"] },
    { id: "july4", label: "Fourth of July", win: (y) => [D(y, 6, 28), D(y, 7, 4)], p: ["⭐", "🎆", "🎇", "⭐"] },
    { id: "labor", label: "Labor Day", win: (y) => { const d = nth(y, 9, 1, 1); return [add(d, -4), d]; }, p: ["⭐", "🛠️"] },
    { id: "halloween", label: "Halloween", win: (y) => [D(y, 10, 15), D(y, 10, 31)], p: ["ghost", "ghost", "ghost", "🎃", "🎃", "🦇", "🕷️"] },
    { id: "cthanks", label: "Thanksgiving (Canada)", win: (y) => { const d = nth(y, 10, 1, 2); return [add(d, -6), d]; }, p: ["🍁", "🍂", "🌽", "🍁"] },
    { id: "diwali", label: "Diwali", win: around(DIWALI, 7, 2), p: ["🪔", "✨", "🪔", "🎆"] },
    { id: "remembrance", label: "Veterans / Remembrance Day", win: (y) => [D(y, 11, 4), D(y, 11, 11)], p: ["🌺", "🕊️", "🌺"] },
    { id: "thanks", label: "Thanksgiving (US)", win: (y) => { const d = nth(y, 11, 4, 4); return [add(d, -9), d]; }, p: ["🍂", "🍁", "🦃", "🌽", "🍂"] },
  ];
  window.PRAJO_SEASONS = T.map((t) => ({ id: t.id, label: t.label }));

  function autoTheme(now) {
    const today = new Date((now || new Date()).getFullYear(), (now || new Date()).getMonth(), (now || new Date()).getDate()); let best = null;
    for (let y = today.getFullYear() - 1; y <= today.getFullYear() + 1; y++) for (const t of T) { const w = t.win(y); if (w && today >= w[0] && today <= w[1] && (!best || w[1] < best.end)) best = { t, end: w[1] }; }
    return best ? best.t : null;
  }
  window.prajoSeasonNow = (now) => (autoTheme(now) || {}).id || "";

  const FONT = "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif", sprites = {};
  function sprite(kind, size, dpr) {
    const key = kind + size + "@" + dpr; if (sprites[key]) return sprites[key];
    const cv = document.createElement("canvas"), s = Math.ceil(size * dpr * 1.2); cv.width = cv.height = s; const c = cv.getContext("2d"); c.translate(s / 2, s / 2); c.scale(s, s);
    if (kind === "hat") {
      c.translate(-.5, -.5 + .06);
      c.fillStyle = "#d8302f"; c.beginPath(); c.moveTo(.16, .66); c.bezierCurveTo(.2, .22, .44, .08, .74, .18); c.bezierCurveTo(.84, .3, .84, .52, .86, .66); c.closePath(); c.fill();
      c.fillStyle = "rgba(0,0,0,.14)"; c.beginPath(); c.moveTo(.5, .12); c.bezierCurveTo(.66, .2, .7, .5, .64, .66); c.lineTo(.86, .66); c.bezierCurveTo(.84, .52, .84, .3, .74, .18); c.closePath(); c.fill();
      c.fillStyle = "#fff"; c.beginPath(); c.moveTo(.1, .7); c.arcTo(.1, .8, .22, .8, .1); c.lineTo(.8, .8); c.arcTo(.92, .8, .92, .7, .1); c.arcTo(.92, .6, .8, .6, .1); c.lineTo(.22, .6); c.arcTo(.1, .6, .1, .7, .1); c.closePath(); c.fill();
      c.beginPath(); c.arc(.76, .15, .1, 0, TAU); c.fill();
    } else if (kind === "ghost") {
      c.translate(-.5, -.5); c.fillStyle = "rgba(255,255,255,.93)"; c.beginPath(); c.moveTo(.2, .88); c.lineTo(.2, .42); c.bezierCurveTo(.2, .12, .8, .12, .8, .42); c.lineTo(.8, .88);
      c.quadraticCurveTo(.725, .8, .65, .88); c.quadraticCurveTo(.575, .96, .5, .88); c.quadraticCurveTo(.425, .8, .35, .88); c.quadraticCurveTo(.275, .96, .2, .88); c.closePath(); c.fill();
      c.fillStyle = "#1b1b2b"; c.beginPath(); c.ellipse(.4, .42, .05, .07, 0, 0, TAU); c.ellipse(.6, .42, .05, .07, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(.5, .58, .06, .08, 0, 0, TAU); c.fill();
    } else if (kind === "snow") {
      const g = c.createRadialGradient(0, 0, 0, 0, 0, .5); g.addColorStop(0, "rgba(255,255,255,.95)"); g.addColorStop(.55, "rgba(255,255,255,.75)"); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.beginPath(); c.arc(0, 0, .5, 0, TAU); c.fill();
    } else if (kind === "confetti") {
      c.fillStyle = ["#f3d48a", "#e94f64", "#4fb3e9", "#7bd88f", "#c07cf0", "#ffffff"][Math.floor(Math.random() * 6)]; c.fillRect(-.22, -.12, .44, .24);
    } else {
      c.setTransform(1, 0, 0, 1, 0, 0); c.font = `${Math.round(s * .72)}px ${FONT}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(kind, s / 2, s / 2 + s * .04);
    }
    return (sprites[key] = cv);
  }

  let cvs = null, ctx = null, parts = [], raf = 0, last = 0, theme = null, dpr = 1, W = 0, H = 0;
  const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches || (navigator.connection && navigator.connection.saveData);
  function make(first) {
    const kind = theme.p[Math.floor(Math.random() * theme.p.length)], big = kind === "hat" || (kind !== "snow" && kind !== "confetti"), size = kind === "snow" ? 5 + Math.random() * 9 : kind === "confetti" ? 12 + Math.random() * 8 : kind === "ghost" ? 30 + Math.random() * 22 : 20 + Math.random() * 16;
    const sk = kind === "confetti" ? kind + Math.floor(Math.random() * 6) : kind;
    return { k: sk.replace(/\d$/, ""), spr: sprite(kind === "confetti" ? "confetti" : kind, Math.round(size), dpr), size, x: Math.random() * W, y: first ? Math.random() * H : kind === "ghost" ? H + size * 2 : -size * 2, vy: kind === "ghost" ? -(16 + Math.random() * 26) : (big ? 38 : 52) + Math.random() * 44, amp: 10 + Math.random() * 26, fr: .5 + Math.random() * 1.1, ph: Math.random() * TAU, rot: Math.random() * TAU, vr: kind === "ghost" ? 0 : (Math.random() - .5) * (big ? 1.2 : .6), a: kind === "snow" ? .85 : kind === "ghost" ? .8 : .92 };
  }
  function size() { dpr = Math.min(window.devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cvs.width = W * dpr; cvs.height = H * dpr; cvs.style.width = W + "px"; cvs.style.height = H + "px"; }
  function frame(t) {
    raf = requestAnimationFrame(frame); const dt = Math.min(.05, (t - (last || t)) / 1000); last = t;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.y += p.vy * dt; p.rot += p.vr * dt; const x = p.x + Math.sin(t / 1000 * p.fr + p.ph) * p.amp;
      if (p.vy > 0 ? p.y > H + p.size * 2 : p.y < -p.size * 2) { Object.assign(p, make(false)); }
      ctx.globalAlpha = p.a; ctx.save(); ctx.translate(x, p.y); ctx.rotate(p.k === "snow" ? 0 : p.k === "ghost" ? Math.sin(p.rot * 3 + p.ph) * .12 : Math.sin(p.rot) * .6 + (p.k === "confetti" ? p.rot : 0)); ctx.drawImage(p.spr, -p.size * .6, -p.size * .6, p.size * 1.2, p.size * 1.2); ctx.restore();
    }
  }
  // a decorated Christmas tree in the bottom-left corner (lights twinkle unless the device asks for reduced motion)
  function addTree() {
    const d = document.createElement("div"); d.id = "seasonTree"; d.setAttribute("aria-hidden", "true");
    const lights = [[60, 38, "#ffd35c"], [46, 62, "#ff6b6b"], [76, 66, "#6bd0ff"], [34, 92, "#ffd35c"], [60, 88, "#ff6b6b"], [88, 94, "#6bd0ff"], [24, 120, "#6bd0ff"], [50, 118, "#ffd35c"], [74, 120, "#ff6b6b"], [98, 122, "#ffd35c"]];
    const balls = [[52, 52, "#d8302f"], [70, 78, "#f3d48a"], [42, 104, "#4fa3e9"], [66, 106, "#d8302f"], [88, 110, "#f3d48a"], [30, 130, "#d8302f"], [58, 132, "#4fa3e9"], [86, 134, "#d8302f"]];
    d.innerHTML = `<style>#seasonTree{position:fixed;left:10px;bottom:10px;z-index:29;pointer-events:none;width:clamp(78px,11vw,128px);filter:drop-shadow(0 6px 10px rgba(0,0,0,.45))}#seasonTree svg{display:block;width:100%;height:auto}
      @media (prefers-reduced-motion:no-preference){#seasonTree .tw{animation:seasonTw 1.8s ease-in-out infinite}#seasonTree .st{animation:seasonTw 2.6s ease-in-out infinite;transform-origin:60px 14px}}
      @keyframes seasonTw{0%,100%{opacity:1}50%{opacity:.25}}</style>
      <svg viewBox="0 0 120 172" xmlns="http://www.w3.org/2000/svg"><rect x="52" y="146" width="16" height="22" rx="2" fill="#6b4425"/>
        <path d="M60 22 L98 70 H22 Z" fill="#1d7a3c"/><path d="M60 50 L106 108 H14 Z" fill="#176832"/><path d="M60 80 L114 150 H6 Z" fill="#115a2a"/>
        <path d="M60 22 L98 70 H60 Z M60 50 L106 108 H60 Z M60 80 L114 150 H60 Z" fill="rgba(0,0,0,.16)"/>
        <path d="M20 66 Q60 84 100 66" stroke="#f3d48a" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M12 106 Q60 128 108 106" stroke="#f3d48a" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        ${balls.map((b) => `<circle cx="${b[0]}" cy="${b[1]}" r="4.6" fill="${b[2]}"/><circle cx="${b[0] - 1.4}" cy="${b[1] - 1.6}" r="1.2" fill="rgba(255,255,255,.7)"/>`).join("")}
        ${lights.map((l, i) => `<circle class="tw" style="animation-delay:${(i % 5) * .35}s" cx="${l[0]}" cy="${l[1]}" r="2.6" fill="${l[2]}"/>`).join("")}
        <path class="st" d="M60 4 L63.6 13 L73 13.6 L65.8 19.6 L68.2 28.8 L60 23.6 L51.8 28.8 L54.2 19.6 L47 13.6 L56.4 13 Z" fill="#ffd35c"/></svg>`;
    document.body.appendChild(d);
  }
  function stop() {
    document.getElementById("seasonTree")?.remove(); cancelAnimationFrame(raf); raf = 0; cvs && cvs.remove(); cvs = ctx = null; parts = []; }
  function start(t) {
    stop(); theme = t; if (!t) return;
    if (t.id === "christmas") addTree();
    if (still()) return;
    cvs = document.createElement("canvas"); cvs.setAttribute("aria-hidden", "true"); cvs.id = "seasonFx";
    cvs.style.cssText = "position:fixed;left:0;top:0;pointer-events:none;z-index:30"; document.body.appendChild(cvs); ctx = cvs.getContext("2d"); size();
    const n = W < 700 ? 16 : 30; parts = Array.from({ length: n }, () => make(true)); last = 0; raf = requestAnimationFrame(frame);
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
