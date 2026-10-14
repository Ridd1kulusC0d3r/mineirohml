import { FLOWS } from "./content.mjs";
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const still = matchMedia("(prefers-reduced-motion: reduce)");
export function initFlows({ box: fbox, desc, walk, tabs, current, onNode, start }) {
  const $ = (s) => (s === "#flow-desc" ? desc : null);
const fl = { id: start || FLOWS[0].id, walking: 0 };
function wrap(text, max) {
  const out = [];
  for (const line of text.split("\n")) {
    let cur2 = "";
    for (const w of line.split(" ")) {
      if ((cur2 + " " + w).trim().length > max && cur2) { out.push(cur2); cur2 = w; } else cur2 = (cur2 + " " + w).trim();
    }
    out.push(cur2);
  }
  return out;
}
const sidePt = (n, s) => ({ l: [n.x, n.y + n.h / 2], r: [n.x + n.w, n.y + n.h / 2], t: [n.x + n.w / 2, n.y], b: [n.x + n.w / 2, n.y + n.h] }[s]);
const dirOf = { l: [-1, 0], r: [1, 0], t: [0, -1], b: [0, 1] };
function renderFlow() {
  const f = FLOWS.find((x) => x.id === fl.id);
  const N = Object.fromEntries(f.n.map(([id, x, y, w, h, tx, kind, chn]) => [id, { id, x, y, w, h, tx, kind, chn }]));
  let s = '<svg viewBox="0 0 960 ' + f.h + '" class="flow-svg" role="img" aria-label="Fluxo: ' + esc(f.nome) + '"><defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--ink-2)"/></marker></defs>';
  f.e.forEach(([a, b, sa, sb, label, kind, way], i) => {
    const A = N[a], B = N[b], p0 = sidePt(A, sa), p1 = sidePt(B, sb), d0 = dirOf[sa], d1 = dirOf[sb];
    const a1 = [p0[0] + d0[0] * 22, p0[1] + d0[1] * 22], b1 = [p1[0] + d1[0] * 22, p1[1] + d1[1] * 22];
    const h0 = d0[1] === 0, h1 = d1[1] === 0;
    let mid;
    if (h0 && h1) mid = [[(a1[0] + b1[0]) / 2, a1[1]], [(a1[0] + b1[0]) / 2, b1[1]]];
    else if (!h0 && !h1) mid = [[a1[0], (a1[1] + b1[1]) / 2], [b1[0], (a1[1] + b1[1]) / 2]];
    else if (h0) mid = [[b1[0], a1[1]]];
    else mid = [[a1[0], b1[1]]];
    const pts = way ? [p0, ...way, p1] : [p0, a1, ...mid, b1, p1];
    const dpath = pts.map((p, j) => (j ? "L" : "M") + p[0].toFixed(0) + " " + p[1].toFixed(0)).join("");
    s += '<path class="fe" data-e="' + i + '" d="' + dpath + '"' + (kind === "loop" ? ' stroke-dasharray="5 4"' : "") + ' marker-end="url(#ar)"/>';
    if (label) {
      const m = way ? [(pts[2][0] + pts[3][0]) / 2, pts[2][1] + 14] : pts[Math.floor(pts.length / 2)];
      s += '<text class="fl" x="' + m[0].toFixed(0) + '" y="' + (way ? m[1] - 19 : m[1] - 5).toFixed(0) + '" text-anchor="middle">' + esc(label) + "</text>";
    }
  });
  f.n.forEach(([id], idx) => {
    const n = N[id], lines = wrap(n.tx, Math.max(10, Math.floor((n.w - 18) / 7.8)));
    const cls = "fn " + n.kind + (n.chn === current() ? " here" : "");
    let shape;
    if (n.kind === "dec") shape = '<polygon points="' + [[n.x + n.w / 2, n.y], [n.x + n.w, n.y + n.h / 2], [n.x + n.w / 2, n.y + n.h], [n.x, n.y + n.h / 2]].map((p) => p.join(",")).join(" ") + '"/>';
    else if (n.kind === "end") shape = '<rect x="' + n.x + '" y="' + n.y + '" width="' + n.w + '" height="' + n.h + '" rx="' + Math.min(26, n.h / 2) + '"/>';
    else shape = '<rect x="' + n.x + '" y="' + n.y + '" width="' + n.w + '" height="' + n.h + '" rx="5"/>';
    const lh = 15, y0 = n.y + n.h / 2 - ((lines.length - 1) * lh) / 2 + 4.5;
    s += '<g class="' + cls + '" data-n="' + idx + '" data-ch="' + n.chn + '" tabindex="0" role="button" aria-label="' + esc(n.tx.replace(/\n/g, " ")) + ', ir à galeria ' + n.chn + '">' + shape +
      lines.map((l, j) => '<text x="' + (n.x + n.w / 2) + '" y="' + (y0 + j * lh).toFixed(1) + '" text-anchor="middle">' + esc(l) + "</text>").join("") + "</g>";
  });
  fbox.innerHTML = s + "</svg>";
  desc.textContent = f.desc;
  tabs.forEach((b) => b.setAttribute("aria-selected", b.dataset.flow === fl.id));
}
function markFlows() { if (fbox && fbox.innerHTML) $$(".fn", fbox).forEach((g) => g.classList.toggle("here", +g.dataset.ch === current() && g.dataset.ch !== "undefined")); }
function goFlowNode(g) { onNode(+g.dataset.ch); }
fbox.addEventListener("click", (e) => { const g = e.target.closest(".fn"); if (g) goFlowNode(g); });
fbox.addEventListener("keydown", (e) => { const g = e.target.closest(".fn"); if (g && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); goFlowNode(g); } });
tabs.forEach((b) => (b.onclick = () => { fl.id = b.dataset.flow; fl.walking++; renderFlow(); }));
walk.onclick = async () => {
  const me = ++fl.walking, f = FLOWS.find((x) => x.id === fl.id);
  const gs = $$(".fn", fbox); const es = $$(".fe", fbox);
  gs.forEach((g) => g.classList.remove("lit")); es.forEach((x) => x.classList.remove("lit"));
  for (let i = 0; i < gs.length; i++) {
    if (me !== fl.walking) return;
    gs[i].classList.add("lit");
    desc.textContent = (i + 1) + "/" + gs.length + " · " + f.n[i][5].replace(/\n/g, " ");
    es.filter((_, k) => f.e[k][1] === f.n[i][0]).forEach((x) => x.classList.add("lit"));
    await new Promise((r) => setTimeout(r, still.matches ? 0 : 900));
  }
  desc.textContent = f.desc;
};

  renderFlow();
  return { mark: markFlows };
}
