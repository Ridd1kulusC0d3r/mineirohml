import * as C from "../content/guia.mjs";

export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const md = (s) => {
  const parts = String(s).split("`");
  return parts.map((p, i) => {
    if (i % 2) return "<code>" + esc(p) + "</code>";
    let t = esc(p);
    t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, a, u) => /^https?:/.test(u) ? `<a href="${u}" target="_blank" rel="noopener">${a}</a>` : `<a href="${u}">${a}</a>`);
    t = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,;:]|$)/g, "$1<em>$2</em>");
    return t;
  }).join("");
};
export const plain = (s) => String(s).replace(/`/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*/g, "");


const flowBlock = (id) => {
  const all = id === "all";
  const tabs = all ? `<div class="flowtabs" role="tablist">${C.FLOWS.map((f) => `<button type="button" role="tab" class="tab" data-flow="${f.id}" aria-selected="false">${esc(f.nome)}</button>`).join("")}</div>` : "";
  return `<div class="flowblock" data-start="${id}">${tabs}<p class="flow-desc"></p><div class="flowwrap"></div><div><button type="button" class="btn walk">▶ Percorrer</button></div></div>`;
};
const cmd = (x) => `<div class="cmd codewrap"><pre>${esc(x)}</pre><button type="button" class="copy" data-copy-pre>Copiar</button></div>`;
export function block(b) {
  switch (b.t) {
    case "h2": return `<h2>${md(b.x)}</h2>`;
    case "h3": return `<h3>${md(b.x)}</h3>`;
    case "p": return `<p>${md(b.x)}</p>`;
    case "ul": return `<ul>${b.items.map((i) => `<li>${md(i)}</li>`).join("")}</ul>`;
    case "ol": return `<ol>${b.items.map((i) => `<li>${md(i)}</li>`).join("")}</ol>`;
    case "code": return cmd(b.x);
    case "note": return `<div class="note ${b.kind || ""}" role="note">${md(b.x)}</div>`;
    case "table": return `<div class="tw"><table><thead><tr>${b.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${md(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    case "cards": return `<div class="cards">${b.items.map(([s, t, d]) => `<a href="${s}.html"><b>${esc(t)}</b><span>${esc(d)}</span></a>`).join("")}</div>`;
    case "flows": return flowBlock(b.id);
  }
  return "";
}
