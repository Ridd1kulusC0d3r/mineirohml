import { initFlows } from "../flows.mjs";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.body.dataset.root || "./";

// copiar comandos
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-copy-pre]");
  if (!t) return;
  const pre = t.parentElement.querySelector("pre");
  const ok = () => { t.textContent = "Copiado ✓"; setTimeout(() => (t.textContent = "Copiar"), 1400); };
  (navigator.clipboard ? navigator.clipboard.writeText(pre.textContent) : Promise.reject()).then(ok).catch(() => {
    const r = document.createRange(); r.selectNodeContents(pre); const s = getSelection(); s.removeAllRanges(); s.addRange(r); t.textContent = "Selecionado";
  });
});

// fluxos
$$(".flowblock").forEach((b) => {
  initFlows({
    box: $(".flowwrap", b), desc: $(".flow-desc", b), walk: $(".walk", b), tabs: $$("[data-flow]", b),
    current: () => -1, start: b.dataset.start === "all" ? undefined : b.dataset.start,
    onNode: (n) => { location.href = root + "index.html#c" + n; },
  });
});

// busca leve (índice carregado só quando o campo recebe foco)
const input = $("#q"), list = $("#results");
if (input && list) {
  let idx = null;
  const load = () => idx || (idx = fetch(root + "assets/search.json").then((r) => r.json()).catch(() => []));
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  input.addEventListener("focus", load, { once: true });
  input.addEventListener("input", async () => {
    const q = norm(input.value.trim());
    if (q.length < 2) { list.hidden = true; return; }
    const data = await load();
    const words = q.split(/\s+/);
    const hits = data.map((p) => {
      const t = norm(p.t), x = norm(p.x);
      let score = 0;
      for (const w of words) { if (t.includes(w)) score += 6; const n = x.split(w).length - 1; score += Math.min(n, 5); if (!t.includes(w) && !n) return null; }
      const at = x.indexOf(words[0]);
      return { p, score, snip: at < 0 ? p.d : "…" + p.x.slice(Math.max(0, at - 40), at + 90) + "…" };
    }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 6);
    list.innerHTML = hits.length ? hits.map((h) => '<li><a href="' + root + h.p.u + '"><b>' + h.p.t.replace(/</g, "&lt;") + "</b><small>" + h.snip.replace(/</g, "&lt;") + "</small></a></li>").join("") : '<li><a href="#" tabindex="-1"><small>Nada encontrado.</small></a></li>';
    list.hidden = false;
  });
  document.addEventListener("click", (e) => { if (!e.target.closest(".search")) list.hidden = true; });
  input.addEventListener("keydown", (e) => { if (e.key === "Escape") { list.hidden = true; input.blur(); } });
}

// menu lateral: aberto no desktop, recolhido no celular
const side = $(".side details");
if (side) { const mq = matchMedia("(min-width:900px)"); side.open = mq.matches; mq.addEventListener("change", () => (side.open = mq.matches)); }
