/* Name-font picker: one "Font: Script ▾" button that opens a full-screen sheet of fonts, grouped, each drawn with the customer's own name.
   Works on any existing row of <button data-f="..."> chips: the row keeps its own click handlers; it is only moved into the sheet while it is open. */
(function () {
  const GROUPS = [
    ["Popular", ["script", "chunky", "kids", "roman", "calli", "bub"]],
    ["Script & signature", ["pacifico", "dancing", "satisfy", "lobster", "caveat", "brushpen"]],
    ["Bold & modern", ["heavy", "modern", "plain", "block", "bebas", "slim", "wide", "rnd", "sport"]],
    ["Elegant", ["serif", "playfair", "classic", "royal", "headl"]],
    ["Fun & hand-drawn", ["marker", "sketch", "notebook"]],
    ["Outline & special", ["outl", "shadow", "rainbow", "stencil", "pixel"]],
  ];
  const UPPER = new Set(["classic", "block", "bebas", "royal", "sketch", "sport"]);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const css = document.createElement("style");
  css.textContent = `
.fontbtn { display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%; min-height: 52px; padding: 0 16px; margin: 4px 0 10px; border-radius: 14px; border: 1px solid rgba(245,236,220,.28); background: rgba(245,236,220,.07); color: inherit; font-size: 22px; cursor: pointer; text-align: left; }
.fontbtn small { font: 600 12px system-ui, sans-serif; opacity: .65; letter-spacing: .04em; text-transform: uppercase; white-space: nowrap; }
.fontbtn .fb-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fsheet { position: fixed; inset: 0; z-index: 210; background: #050911; overflow-y: auto; -webkit-overflow-scrolling: touch; }
.fsheet[hidden] { display: none; } .fs-box { max-width: 760px; margin: 0 auto; padding: 0 14px 60px; }
.fs-head { position: sticky; top: 0; z-index: 3; display: flex; justify-content: space-between; align-items: center; padding: 12px 0; background: rgba(5,9,17,.98); }
.fs-head h3 { margin: 0; font-size: 20px; } .fs-x { width: 44px; height: 44px; border-radius: 50%; border: 1px solid rgba(255,255,255,.25); background: rgba(10,18,32,.8); color: inherit; font-size: 24px; cursor: pointer; }
.fsheet .fxgrid { display: grid !important; grid-template-columns: 1fr 1fr; gap: 10px; overflow: visible; padding: 0; max-height: none; width: auto; }
.fsheet .fxgrid .fshead { grid-column: 1 / -1; font: 700 12px system-ui, sans-serif; letter-spacing: .12em; text-transform: uppercase; opacity: .6; margin: 14px 2px 0; }
.fsheet .fxgrid button[data-f] { flex: none; width: auto; margin: 0; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: 4px; min-height: 76px; padding: 10px 14px; border-radius: 16px; font-size: 26px; line-height: 1.15; text-align: left; overflow: hidden; }
.fsheet .fxgrid button[data-f] .fs-n { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fsheet .fxgrid button[data-f] small { font: 600 11px system-ui, sans-serif; opacity: .6; letter-spacing: .04em; text-transform: uppercase; }
@media (min-width: 700px) { .fsheet .fxgrid { grid-template-columns: repeat(3, 1fr); } }
`;
  document.head.appendChild(css);
  let sheet, box;
  function ensureSheet() {
    if (sheet) return;
    sheet = document.createElement("div"); sheet.className = "fsheet"; sheet.hidden = true; sheet.setAttribute("role", "dialog"); sheet.setAttribute("aria-modal", "true"); sheet.setAttribute("aria-label", "Choose a font");
    sheet.innerHTML = `<div class="fs-box"><div class="fs-head"><h3>Choose a font</h3><button type="button" class="fs-x" aria-label="Close">×</button></div><div class="fs-slot"></div></div>`;
    document.body.appendChild(sheet); box = sheet.querySelector(".fs-slot");
  }
  window.fontSheet = function (row, opts) {
    if (!row || row.dataset.fs) return;
    row.dataset.fs = "1"; opts = opts || {};
    const getName = () => (opts.name ? opts.name() : "").trim() || "Your name";
    const btns = [...row.querySelectorAll("button[data-f]")];
    btns.forEach((b) => { b.dataset.label = b.dataset.label || (b.getAttribute("aria-label") || b.textContent).replace(/ font$/i, "").trim(); b.setAttribute("aria-label", b.dataset.label + " font"); });
    const anchor = document.createComment("fontsheet"); row.parentNode.insertBefore(anchor, row);
    const open = document.createElement("button"); open.type = "button"; open.className = "fontbtn"; open.setAttribute("aria-haspopup", "dialog");
    anchor.parentNode.insertBefore(open, anchor); row.hidden = true;
    const current = () => row.querySelector('button[data-f][aria-pressed="true"]') || btns[0];
    const paintBtn = () => { const c = current(); if (!c) return; open.style.fontFamily = c.style.fontFamily; open.style.fontWeight = c.style.fontWeight || ""; open.innerHTML = `<span class="fb-name">${esc(UPPER.has(c.dataset.f) ? getName().toUpperCase() : getName())}</span><small>${esc(c.dataset.label)} ▾</small>`; };
    paintBtn();
    new MutationObserver(paintBtn).observe(row, { attributes: true, subtree: true, attributeFilter: ["aria-pressed"] });
    if (opts.nameInput) opts.nameInput.addEventListener("input", paintBtn);
    const prev = { o: "" };
    const close = () => { if (!sheet || sheet.hidden) return; sheet.hidden = true; document.body.style.overflow = prev.o; row.hidden = true; row.classList.remove("fxgrid"); row.querySelectorAll(".fshead").forEach((h) => h.remove()); btns.forEach((b) => { b.innerHTML = esc(b.dataset.label); row.appendChild(b); }); anchor.parentNode.insertBefore(row, anchor.nextSibling); paintBtn(); open.focus(); };
    open.onclick = () => {
      ensureSheet();
      const name = getName();
      btns.forEach((b) => { const t = UPPER.has(b.dataset.f) ? name.toUpperCase() : name; b.innerHTML = `<span class="fs-n">${esc(t)}</span><small>${esc(b.dataset.label)}</small>`; });
      row.classList.add("fxgrid"); row.hidden = false; box.appendChild(row);
      const byKey = Object.fromEntries(btns.map((b) => [b.dataset.f, b])), used = new Set();
      const mk = (t) => { const h = document.createElement("div"); h.className = "fshead"; h.textContent = t; row.appendChild(h); };
      GROUPS.forEach(([t, keys]) => { const have = keys.filter((k) => byKey[k]); if (!have.length) return; mk(t); have.forEach((k) => { row.appendChild(byKey[k]); used.add(k); }); });
      const rest = btns.filter((b) => !used.has(b.dataset.f)); if (rest.length) { mk("More"); rest.forEach((b) => row.appendChild(b)); }
      prev.o = document.body.style.overflow; document.body.style.overflow = "hidden"; sheet.hidden = false; sheet.scrollTop = 0;
      sheet.onclick = (e) => { if (e.target === sheet || e.target.closest(".fs-x")) close(); };
      sheet.onkeydown = (e) => { if (e.key === "Escape") close(); };
      const cur = current(); if (cur) setTimeout(() => cur.scrollIntoView({ block: "center" }), 30);
    };
    row.addEventListener("click", (e) => { if (e.target.closest("button[data-f]") && sheet && !sheet.hidden) setTimeout(close, 140); });
  };
})();
