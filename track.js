/* PrAjo shared tracking: privacy choices + visit counter. Loaded by the shop, the tumbler designer and the keepsakes page. */
/* Privacy choices: honours Do Not Track and Global Privacy Control, asks first in the EU/UK, and gives everyone a "Your privacy choices" switch. */
(function () {
  var NT = "prajo:noTrack", CO = "prajo:consent";
  var get = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var put = function (k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
  var tz = ""; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
  var eu = /^(Europe\/|Atlantic\/(Azores|Madeira|Canary|Faroe|Reykjavik))/.test(tz);
  var signal = function () { return navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.globalPrivacyControl === true; };
  var P = window.PRAJO_PRIV = {
    eu: eu, signal: signal,
    allowed: function () { return !signal() && !navigator.webdriver && get(NT) !== "1" && (!eu || get(CO) === "yes"); },
    changed: function () { try { if (window.__prajoTrackRefresh) window.__prajoTrackRefresh(); } catch (e) {} try { if (window.PRAJO_VISIT) window.PRAJO_VISIT.refresh(); } catch (e) {} }
  };
  var css = "position:fixed;z-index:2147483000;background:#0f1b2e;color:#f5ecdc;border:1px solid #d9ab4f;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.5);font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;padding:16px 18px;";
  var btn = "min-height:44px;padding:0 18px;border-radius:999px;border:1px solid #d9ab4f;background:transparent;color:#f5ecdc;font:700 15px system-ui;cursor:pointer;";
  var gold = "min-height:44px;padding:0 18px;border-radius:999px;border:0;background:#d9ab4f;color:#1a1204;font:800 15px system-ui;cursor:pointer;";
  function el(id) { return document.getElementById(id); }
  function drop(id) { var e = el(id); if (e && e.parentNode) e.parentNode.removeChild(e); }
  function status() { return P.allowed() ? "ON" : "OFF"; }
  function dialog() {
    drop("privDlg");
    var d = document.createElement("div"); d.id = "privDlg"; d.setAttribute("role", "dialog"); d.setAttribute("aria-modal", "true"); d.setAttribute("aria-label", "Your privacy choices");
    d.style.cssText = css + "left:50%;top:50%;transform:translate(-50%,-50%);width:min(440px,92vw);";
    var why = signal() ? "Your browser is sending a Do Not Track or Global Privacy Control signal, so the counter stays off." : eu && get(CO) !== "yes" ? "Because you are in a region that asks first, it stays off until you say yes." : "";
    d.innerHTML = '<b style="font-size:18px">Your privacy choices</b><p style="margin:10px 0">Our anonymous visit counter and the saved copy of your cart are <b>' + status() + '</b> for this browser. They have no name or IP address and are never shared with advertisers.</p>' + (why ? '<p style="margin:0 0 10px;color:#b9c0cf">' + why + '</p>' : "") +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px">' + (signal() ? "" : '<button type="button" id="privTog" style="' + gold + '">' + (P.allowed() ? "Turn off" : "Turn on") + "</button>") + '<button type="button" id="privX" style="' + btn + '">Close</button></div><p style="margin:12px 0 0;font-size:13px"><a href="/privacy.html" style="color:#e9c46a">Read the privacy policy</a></p>';
    document.body.appendChild(d);
    var t = el("privTog"); if (t) t.onclick = function () { if (P.allowed()) { put(NT, "1"); put(CO, "no"); } else { put(NT, null); put(CO, "yes"); } P.changed(); dialog(); };
    el("privX").onclick = function () { drop("privDlg"); }; (t || el("privX")).focus();
    d.addEventListener("keydown", function (e) { if (e.key === "Escape") drop("privDlg"); });
  }
  function banner() {
    if (!eu || get(CO) !== null || signal() || el("privBar")) return;
    var b = document.createElement("div"); b.id = "privBar"; b.setAttribute("role", "region"); b.setAttribute("aria-label", "Visit counter");
    b.style.cssText = css + "left:12px;right:12px;bottom:12px;max-width:640px;margin:0 auto;";
    b.innerHTML = '<p style="margin:0 0 10px">May we count your visit? It is anonymous, stays on this site and has no name or IP address. Saying no does not change how the shop works. <a href="/privacy.html" style="color:#e9c46a">Privacy policy</a></p><div style="display:flex;gap:10px;flex-wrap:wrap"><button type="button" id="privYes" style="' + gold + '">Yes, count my visit</button><button type="button" id="privNo" style="' + btn + '">No thanks</button></div>';
    document.body.appendChild(b);
    el("privYes").onclick = function () { put(CO, "yes"); put(NT, null); drop("privBar"); P.changed(); };
    el("privNo").onclick = function () { put(CO, "no"); drop("privBar"); P.changed(); };
  }
  document.addEventListener("click", function (e) { var a = e.target && e.target.closest ? e.target.closest("#privChoices") : null; if (a) { e.preventDefault(); dialog(); } });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", banner); else banner();
})();

/* ---------- Visits: where from, how long, how many pages (one shared file for the shop, the tumbler designer and the keepsakes page) ----------
   Counts only when PRAJO_PRIV.allowed(). The visitor's address is never stored: the place comes from our own Cloudflare Worker (see privacy.html). */
(function () {
  var DB = { url: "https://mrnnrmyvjkyjcjnfomna.supabase.co", key: "sb_publishable_yRYTwn_RktQUGMaqwiQVAA_Gb1ei78b" };
  var GEO_URL = "https://prajo-geo.abhi-prasad85.workers.dev/";   // the prajo-geo Worker address; empty = visits are counted without a place
  var path = location.pathname.toLowerCase(), isShop = !/(tumbler|keepsakes|design)/.test(path);
  var kind = /tumbler/.test(path) ? "tumbler" : /keepsakes/.test(path) ? "keepsakes" : /design/.test(path) ? "design" : "";
  var ok = function () { return !!(window.PRAJO_PRIV && window.PRAJO_PRIV.allowed()); };
  var S = function (k, v) { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) {} return null; };
  var rnd = function () { return (window.crypto && crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "") : Math.random().toString(36).slice(2) + Date.now().toString(36)); };
  var sid = "", vid = "", ref = "", geo = null, landing = "", timer = 0, beat = 0, sentKey = "", lastTick = Date.now(), started = false;
  var pagesN = 0, activeMs = 0;
  var tz = ""; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
  var dev = innerWidth < 640 ? "phone" : innerWidth < 1024 ? "tablet" : "desktop";
  var qs = new URLSearchParams(location.search), medium = (qs.get("utm_medium") || "").slice(0, 40), campaign = (qs.get("utm_campaign") || "").slice(0, 60);
  var returning = false; try { returning = localStorage.getItem("prajo:seen") === "1"; } catch (e) {}
  var rpc = function (fn, body) { try { fetch(DB.url + "/rest/v1/rpc/" + fn, { method: "POST", keepalive: true, headers: { "Content-Type": "application/json", apikey: DB.key, Authorization: "Bearer " + DB.key }, body: JSON.stringify(body) }).catch(function () {}); } catch (e) {} };
  function ensureSid() { try { sid = localStorage.getItem("prajo:sid") || ""; if (!/^[a-z0-9]{10,24}$/.test(sid)) { sid = (rnd() + "x").slice(0, 24); localStorage.setItem("prajo:sid", sid); } } catch (e) { sid = ""; } }
  function ensureVid() { vid = S("prajo:vid") || ""; if (!/^[a-z0-9]{10,24}$/.test(vid)) { vid = ("v" + rnd()).slice(0, 24); S("prajo:vid", vid); } }
  function ensureRef() { ref = S("prajo:ref"); if (ref === null) { ref = ""; try { var r = document.referrer && new URL(document.referrer); if (r && r.hostname !== location.hostname) ref = r.hostname.replace(/^www\./, ""); var u = qs.get("utm_source"); if (u) ref = u.slice(0, 40); } catch (e) {} S("prajo:ref", ref); } }
  function pageName() { if (kind) return kind; var h = location.hash; return /^#p\//.test(h) ? "product" : /^#cart/.test(h) ? "cart" : /^#order\//.test(h) ? "order" : "home"; }
  function getGeo() { if (!GEO_URL) return Promise.resolve(null); var c = S("prajo:geo"); if (c) { try { return Promise.resolve(JSON.parse(c)); } catch (e) {} }
    return fetch(GEO_URL, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (g) { if (!g) return null; var o = { c: String(g.c || "").slice(0, 2), r: String(g.r || "").slice(0, 80), city: String(g.city || "").slice(0, 80), z: String(g.z || "").slice(0, 12) }; S("prajo:geo", JSON.stringify(o)); return o; }).catch(function () { return null; }); }
  function tick() { var n = Date.now(); if (document.visibilityState === "visible") activeMs += Math.min(n - lastTick, 6000); lastTick = n; S("prajo:vms", String(Math.round(activeMs))); }
  function send(force) {
    if (!ok() || !sid || !vid) return; var secs = Math.round(activeMs / 1000), key = secs + ":" + pagesN + ":" + (geo ? 1 : 0); if (!force && key === sentKey) return; sentKey = key; var g = geo || {};
    rpc("track_visit", { p_vid: vid, p_sid: sid, p_seconds: secs, p_pages: pagesN, p_country: g.c || null, p_region: g.r || null, p_city: g.city || null, p_zip: g.z || null, p_ref: ref || null, p_landing: landing || null, p_medium: medium || null, p_campaign: campaign || null, p_device: dev, p_tz: tz, p_returning: returning });
  }
  function page(name) {
    if (!ok() || !started) return; pagesN++; S("prajo:vpg", String(pagesN));
    if (!landing) { landing = S("prajo:landing") || ""; if (!landing) { landing = name; S("prajo:landing", name); } }
    send(true);
  }
  function leaving() { if (!ok() || !started) return; tick(); send(true); }
  function start() {
    if (started || !ok()) return; started = true; ensureSid(); if (!sid) { started = false; return; } ensureVid(); ensureRef();
    pagesN = parseInt(S("prajo:vpg") || "0", 10) || 0; activeMs = parseInt(S("prajo:vms") || "0", 10) || 0; landing = S("prajo:landing") || ""; lastTick = Date.now();
    timer = setInterval(function () { tick(); if (activeMs < 18e5 && ++beat % 4 === 0) send(false); }, 5000);
    document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") leaving(); else lastTick = Date.now(); }); window.addEventListener("pagehide", leaving);
    if (isShop) window.addEventListener("hashchange", function () { page(pageName()); });
    page(pageName());
    // the tumbler designer and the shop's own tracker count their own events; this adds a plain "view" for the tumbler page
    if (kind === "tumbler") rpc("track_event", { p_sid: sid, p_kind: "view", p_product: null, p_page: "tumbler", p_ref: ref || null, p_device: dev, p_tz: tz, p_qty: null, p_value: null });
    getGeo().then(function (g) { geo = g; try { localStorage.setItem("prajo:seen", "1"); } catch (e) {} send(true); });
  }
  function stop() { clearInterval(timer); timer = 0; started = false; S("prajo:vid", null); S("prajo:geo", null); S("prajo:landing", null); S("prajo:vpg", null); S("prajo:vms", null); vid = ""; geo = null; landing = ""; pagesN = 0; activeMs = 0; sentKey = ""; }
  window.PRAJO_VISIT = { refresh: function () { if (ok()) start(); else stop(); } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
