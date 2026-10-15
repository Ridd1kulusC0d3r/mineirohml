import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import * as F from "../figure/fig.mjs";
import * as C from "../content/guia.mjs";
import * as D from "../content/docs.mjs";
import { OUT, SITE, KIT } from "./ctx.mjs";

const k = await import(KIT);
import { esc, md, plain, block } from "./markup.mjs";
import { head, topbar, sidebar, FOOT, THEME_JS } from "./layout.mjs";

export function buildPages() {
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

}
