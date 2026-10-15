// Gera o site estático (raiz do repositório) a partir de fig.mjs, content.mjs e docs.mjs.
// Requer o kit "anatomy" (iso-kit.mjs, lathe.mjs). Ajuste KIT se ele estiver em outro lugar.
import { mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import * as esbuild from "esbuild";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "..");
const KIT = process.env.KIT || "/mnt/skills/plugins/anatomy/kit/iso-kit.mjs";
const k = await import(KIT);
const F = await import("./fig.mjs");
const C = await import("./content.mjs");
const D = await import("./docs.mjs");

const SITE = "Mineiro hml";
const read = (f) => readFileSync(join(HERE, f), "utf8");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const md = (s) => {
  const parts = String(s).split("`");
  return parts.map((p, i) => {
    if (i % 2) return "<code>" + esc(p) + "</code>";
    let t = esc(p);
    t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, a, u) => /^https?:/.test(u) ? `<a href="${u}" target="_blank" rel="noopener">${a}</a>` : `<a href="${u}">${a}</a>`);
    t = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,;:]|$)/g, "$1<em>$2</em>");
    return t;
  }).join("");
};
const plain = (s) => String(s).replace(/`/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*/g, "");

// ---------------------------------------------------------------- dados do motor
const exp = (o) => Object.entries(o).map(([k2, v]) => `export const ${k2}=${JSON.stringify(v)};`).join("\n");
mkdirSync(join(HERE, ".gen"), { recursive: true });
writeFileSync(join(HERE, ".gen/data.mjs"), exp({
  P: F.P, W: F.W, H: F.H, STOPS: F.STOPS, FOCUS: F.FOCUS, SEL: F.SEL, SEL_ANGLES: F.SEL_ANGLES, CELL: F.CELL, CMP: F.CMP, gateLift: F.gateLift, DIALS: F.DIALS, PRESS: F.PRESS,
  CHAPTERS: C.CHAPTERS, REQS: C.REQS, PRESETS: C.PRESETS, DIAL_INFO: C.DIAL_INFO, PRINCIPIOS: C.PRINCIPIOS, CHEAT: C.CHEAT, QUERIES: C.QUERIES, INSTALL: C.INSTALL, SCENARIOS: C.SCENARIOS_ALL,
}));
writeFileSync(join(HERE, ".gen/engine.mjs"), `import { iso, lineOnTop, slabOf, solidSvg, translateAlong } from ${JSON.stringify(KIT)};
import { initFlows } from "../flows.mjs";
import { P, W, H, STOPS, FOCUS, SEL, SEL_ANGLES, CELL, CMP, gateLift, DIALS, PRESS, CHAPTERS, REQS, PRESETS, DIAL_INFO, PRINCIPIOS, CHEAT, QUERIES, INSTALL, SCENARIOS } from "./data.mjs";
${read("engine-body.js")}`);

mkdirSync(join(OUT, "assets"), { recursive: true });
const bundle = async (entry, out) => {
  await esbuild.build({ entryPoints: [entry], bundle: true, minify: true, format: "iife", target: "es2020", outfile: join(OUT, "assets", out), legalComments: "none", logLevel: "warning" });
};
await bundle(join(HERE, ".gen/engine.mjs"), "guia.js");
await bundle(join(HERE, "src/docs.js"), "docs.js");
const css = async (parts, out) => {
  const r = await esbuild.transform(parts.join("\n"), { loader: "css", minify: true });
  writeFileSync(join(OUT, "assets", out), r.code);
};
await css([read("src/base.css"), read("src/docs.css")], "docs.css");
await css([read("src/base.css"), k.ISO_CSS, read("src/guia.src.css")], "guia.css");

// ---------------------------------------------------------------- peças HTML comuns
const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800&family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap">`;
const FAVICON = `<link rel="icon" href="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#0b0b0b"/><path d="M6 20l5-9 7-3 8 6-2 9-9 3z" fill="#e2a93b"/></svg>')}">`;
const THEME_BOOT = `<script>try{var t=localStorage.getItem("mhml-theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}</script>`;
const THEME_BTN = `<button type="button" class="themebtn" data-theme-toggle aria-label="Alternar tema claro e escuro">◐ Tema</button>`;
const THEME_JS = `<script>document.querySelectorAll("[data-theme-toggle]").forEach(function(b){b.onclick=function(){var r=document.documentElement,c=r.getAttribute("data-theme")||(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"),n=c==="dark"?"light":"dark";r.setAttribute("data-theme",n);try{localStorage.setItem("mhml-theme",n)}catch(e){}}})</script>`;
const head = (title, desc, root, css2) => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}">${FAVICON}${FONTS}${THEME_BOOT}<link rel="stylesheet" href="${root}assets/${css2}"></head>`;
const topbar = (root, current, search) => `<a class="skip" href="#main">Pular para o conteúdo</a><header class="top"><a class="brand" href="${root}index.html">Mineiro <span>hml</span></a>${search ? `<div class="search"><input id="q" type="search" placeholder="Buscar na documentação" aria-label="Buscar na documentação" autocomplete="off"><ul id="results" class="results" hidden></ul></div>` : ""}<nav aria-label="Principal"><a href="${root}index.html"${current === "guia" ? ' aria-current="page"' : ""}>Guia visual</a><a href="${root}docs/index.html"${current === "docs" ? ' aria-current="page"' : ""}>Documentação</a><a href="${C.REPO}" target="_blank" rel="noopener">Repositório original ↗</a>${THEME_BTN}</nav></header>`;
const FOOT = `<footer class="foot"><span>Ambiente de homologação (hml). Material de estudo e documentação em pt-BR baseado no <a href="${C.REPO}" target="_blank" rel="noopener">Mineiro-OSINT-Extractor</a> (licença MIT no código original).</span><span>As demonstrações interativas são simulações didáticas. Nenhuma plataforma é consultada.</span></footer>`;

// ---------------------------------------------------------------- docs
const flowBlock = (id) => {
  const all = id === "all";
  const tabs = all ? `<div class="flowtabs" role="tablist">${C.FLOWS.map((f) => `<button type="button" role="tab" class="tab" data-flow="${f.id}" aria-selected="false">${esc(f.nome)}</button>`).join("")}</div>` : "";
  return `<div class="flowblock" data-start="${id}">${tabs}<p class="flow-desc"></p><div class="flowwrap"></div><div><button type="button" class="btn walk">▶ Percorrer</button></div></div>`;
};
const cmd = (x) => `<div class="cmd codewrap"><pre>${esc(x)}</pre><button type="button" class="copy" data-copy-pre>Copiar</button></div>`;
function block(b) {
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
const sidebar = (cur) => `<aside class="side"><details><summary>Menu da documentação</summary><nav aria-label="Documentação"><ul><li><a href="index.html"${cur === "index" ? ' aria-current="page"' : ""}>Visão geral</a></li></ul>${D.GROUPS.map((g) => `<h2>${g.nome}</h2><ul>${D.PAGES.filter((p) => p.group === g.id).map((p) => `<li><a href="${p.slug}.html"${p.slug === cur ? ' aria-current="page"' : ""}>${esc(p.nome)}</a></li>`).join("")}</ul>`).join("")}</nav></details></aside>`;
const order = D.PAGES;
const search = [];
for (const [i, p] of order.entries()) {
  const prev = order[i - 1], next = order[i + 1];
  const wide = p.slug === "fluxos";
  const html = head(`${p.slug === "index" ? "Documentação" : p.nome} · ${SITE}`, plain(p.lead), "../", "docs.css") +
    `<body data-root="../">${topbar("../", "docs", true)}<div class="shell">${sidebar(p.slug)}<main id="main"${wide ? ' class="wide"' : ""}><span class="kick">${p.group ? D.GROUPS.find((g) => g.id === p.group).nome : "Documentação"}</span><h1>${esc(p.slug === "index" ? "Documentação do Mineiro" : p.nome)}</h1><p class="lead">${md(p.lead)}</p>${p.blocks.map(block).join("")}` +
    `<p class="src">Fonte no repositório original: ${p.fontes.map(([t, path]) => `<a href="${D.ORIGINAL_LINK(path)}" target="_blank" rel="noopener">${esc(t)}</a>`).join(" · ")}</p>` +
    `<nav class="pn" aria-label="Navegação entre páginas">${prev ? `<a href="${prev.slug}.html"><small>← Anterior</small>${esc(prev.nome)}</a>` : "<span></span>"}${next ? `<a href="${next.slug}.html"><small>Próxima →</small>${esc(next.nome)}</a>` : "<span></span>"}</nav></main></div>${FOOT}<script src="../assets/docs.js" defer></script>${THEME_JS}</body></html>`;
  mkdirSync(join(OUT, "docs"), { recursive: true });
  writeFileSync(join(OUT, "docs", p.slug + ".html"), html);
  const text = p.blocks.map((b) => [b.x, ...(b.items || []), ...(b.rows || []).flat(), ...(b.head || [])].filter(Boolean).map(plain).join(" ")).join(" ");
  search.push({ u: "docs/" + p.slug + ".html", t: p.slug === "index" ? "Documentação do Mineiro" : p.nome, d: plain(p.lead), x: text });
}
writeFileSync(join(OUT, "assets/search.json"), JSON.stringify(search));

// ---------------------------------------------------------------- guia imersivo (index.html)
const plate = k.plateHtml({
  fig: "Fig 1", title: "Linha de Garimpo Mineiro", hint: "Setas ← → trocam de etapa", readout: "Linha de Garimpo Mineiro · visão geral",
  keys: [{ mark: "lit", label: "O que está em foco agora" }, { mark: "raised", label: "Estações = etapas do pipeline" }],
  caption: "Cada estação é uma etapa do pipeline: requisito, coleta, baseline, avaliação, correlação e relatório.",
  body: `<div class="iso-stage">${F.figure()}</div>`,
});
const index = head("Linha de Garimpo Mineiro · " + SITE, "Guia direto para usar o Mineiro Username Intelligence: sete etapas, o que fazer, o que decidir e o que evitar, com figuras isométricas.", "./", "guia.css") +
`<body>${topbar("./", "guia", false)}
<div class="iso" data-theme="dark" id="top"><main id="main" style="display:contents">
<header class="hero"><span class="kick">Guia de uso · Mineiro Username Intelligence</span><h1>Linha de Garimpo</h1>
<p class="lead">Sete etapas, na ordem do pipeline. Em cada uma: o que fazer, o que decidir e o que evitar.</p></header>
<div class="app"><div class="left">${plate}<nav id="rail" aria-label="Etapas"></nav></div><article id="panel" aria-live="polite"></article></div>
<section class="sec" id="mapa"><span class="kick">Mapa de Fluxos</span><h2>Fluxos</h2>
<p class="lead">Escolha um fluxo. Clique numa caixa para abrir a etapa dela.</p>
<div class="flowtabs" role="tablist">${C.FLOWS.map((f) => `<button type="button" role="tab" class="tab" data-flow="${f.id}" aria-selected="false">${esc(f.nome)}</button>`).join("")}<button type="button" class="btn" id="walk">▶ Percorrer</button></div>
<p id="flow-desc" class="flow-desc"></p><div class="flowwrap" id="flow-box"></div></section>
<section class="sec" id="bolso"><span class="kick">Cola rápida</span><h2>Comandos</h2><div class="cheats" id="cheat"></div>
<div class="foot"><p>Simulação didática: nenhuma plataforma é consultada aqui. Valores, resultados e posições das barras são ilustrativos. A documentação completa está em <a href="docs/index.html">docs</a> e o texto de referência no <a href="${C.REPO}" target="_blank" rel="noopener">repositório original</a>.</p><p>O Mineiro não atribui nota a pessoas. Ele organiza observações públicas, evidências e lacunas para que um analista decida.</p></div></section>
</main></div>
<script>(function(){var e=document.documentElement.getAttribute("data-theme");document.getElementById("top").dataset.theme=e||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light")})()</script>
<script src="assets/guia.js" defer></script>${THEME_JS}</body></html>`;
writeFileSync(join(OUT, "index.html"), index);

// ---------------------------------------------------------------- extras
writeFileSync(join(OUT, ".nojekyll"), "");
writeFileSync(join(OUT, "404.html"), head("Página não encontrada · " + SITE, "Página não encontrada.", "./", "docs.css") + `<body>${topbar("./", "", false)}<div class="shell"><main id="main"><span class="kick">Erro 404</span><h1>Página não encontrada</h1><p class="lead">O caminho não existe nesta documentação.</p><p><a class="btn" href="index.html">Voltar ao guia</a> <a class="btn" href="docs/index.html">Ir à documentação</a></p></main></div>${THEME_JS}</body></html>`);

const sz = (f) => { const b = readFileSync(join(OUT, f)); return `${(b.length / 1024).toFixed(0)} KB (gzip ${(gzipSync(b).length / 1024).toFixed(0)} KB)`; };
console.log("index.html", sz("index.html"));
console.log("assets/guia.js", sz("assets/guia.js"), "| guia.css", sz("assets/guia.css"));
console.log("assets/docs.js", sz("assets/docs.js"), "| docs.css", sz("assets/docs.css"), "| search.json", sz("assets/search.json"));
