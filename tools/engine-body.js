(() => {
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fmt = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/`(.+?)`/g, "<code>$1</code>");
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const still = matchMedia("(prefers-reduced-motion: reduce)");
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };

// ---- tema: segue o viewer (data-theme na raiz ou prefers-color-scheme)
const root = $(".iso");
const syncTheme = () => {
  const explicit = document.documentElement.getAttribute("data-theme");
  root.dataset.theme = explicit || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
};
syncTheme();
new MutationObserver(syncTheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", syncTheme);

// ---- máquina
const stage = $(".iso-stage");
const svg = stage.querySelector("svg");
const readout = $("[data-readout]");
const part = (n) => svg.querySelector('[data-part="' + n + '"]');
const el = { cart: part("cart"), ram: part("ram"), gate: part("gate"), bB: part("bridgeB"), bF: part("bridgeF"), sel: part("selptr"), led: part("led"), lantern: part("lantern"), seal: part("seal") };
const barA = svg.querySelector('[data-bar="a"]');
const barB = svg.querySelector('[data-bar="b"]');
const needles = [0, 1, 2, 3, 4].map((i) => svg.querySelector('[data-needle="' + i + '"]'));
const cells = $$(".cell", svg).sort((a, b) => a.dataset.cell - b.dataset.cell);
const nodes = Object.fromEntries($$(".node", svg).map((n) => [n.dataset.node, n]));
const edges = $$(".edge", svg);
const crates = $$(".crate", svg);
const lamp = (n) => svg.querySelector('[data-lamp="' + n + '"]');
const DIAL_TOP = DIALS.z + DIALS.h;
const SWEEP = 270;
const needleOf = (i, v) => {
  const x = DIALS.x0 + i * DIALS.dx, y = DIALS.y;
  const a = ((-SWEEP / 2 + SWEEP * clamp(v, 0, 1)) * Math.PI) / 180;
  return lineOnTop([x - Math.sin(a) * 3, y + Math.cos(a) * 3], [x + Math.sin(a) * (DIALS.r - 3.4), y - Math.cos(a) * (DIALS.r - 3.4)], DIAL_TOP + 0.2, P);
};
const selPointer = (deg) => {
  const a = (deg * Math.PI) / 180;
  return lineOnTop([SEL.x, SEL.y], [SEL.x + Math.sin(a) * 4.6, SEL.y - Math.cos(a) * 4.6], SEL.z + 4.1, P);
};
const barSvg = (plan, h) => solidSvg(slabOf(plan, CMP.zBase + 0.1, Math.max(h, 0.6), P, 3, 0.5), { tone: "hi", crease: "lo" });

const ZOOM = { all: 1, portal: 2.3, hopper: 2.2, tray: 2.0, comp: 2.5, dials: 2.3, board: 2.4, press: 2.4 };
const camFor = (view) => {
  const [sx, sy] = iso(FOCUS[view], P);
  return { cx: sx, cy: sy, z: ZOOM[view] };
};
const cur = { cart: STOPS.start, cx: W / 2, cy: H / 2, z: 1, sel: SEL_ANGLES[0], bridge: 0, barA: 20, barB: 20, gate: 0, ram: 0, seal: 0, n0: 0.5, n1: 0.5, n2: 0.5, n3: 0.5, n4: 0.5 };
const tgt = { ...cur };
const tau = { cart: 0.55, cx: 0.7, cy: 0.7, z: 0.7, ram: 0.22, bridge: 0.2, gate: 0.3, seal: 0.2 };
const flags = { lantern: false, led: false };
let last = 0, frame = 0, visible = true, demoOn = false;

function draw() {
  el.cart.setAttribute("transform", translateAlong(P, [cur.cart, 0, 0]));
  const z = cur.z, w = W / z, h = H / z;
  const x = clamp(cur.cx - w / 2, -60, W + 60 - w), y = clamp(cur.cy - h / 2, -40, H + 40 - h);
  svg.setAttribute("viewBox", x.toFixed(1) + " " + y.toFixed(1) + " " + w.toFixed(1) + " " + h.toFixed(1));
  el.sel.setAttribute("d", selPointer(cur.sel));
  const bt = translateAlong(P, [CELL.x0 + cur.bridge, 0, 0]);
  el.bB.setAttribute("transform", bt);
  el.bF.setAttribute("transform", bt);
  barA.innerHTML = barSvg(CMP.barA, cur.barA);
  barB.innerHTML = barSvg(CMP.barB, cur.barB);
  el.gate.setAttribute("transform", translateAlong(P, [0, 0, gateLift * cur.gate]));
  needles.forEach((n, i) => n.setAttribute("d", needleOf(i, cur["n" + i])));
  el.ram.setAttribute("transform", translateAlong(P, [0, 0, -PRESS.travel * cur.ram]));
  el.seal.style.opacity = (0.2 + 0.8 * cur.seal).toFixed(2);
  el.lantern.classList.toggle("on", flags.lantern);
  el.led.classList.toggle("on", flags.led);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  let moving = false;
  for (const k in cur) {
    const d = tgt[k] - cur[k];
    if (still.matches || Math.abs(d) < 0.004) { cur[k] = tgt[k]; continue; }
    cur[k] += d * (1 - Math.exp(-dt / (tau[k] || 0.3)));
    moving = true;
  }
  draw();
  frame = visible && moving ? requestAnimationFrame(tick) : 0;
  if (!frame) last = 0;
}
const kick = () => { if (!frame && visible) frame = requestAnimationFrame(tick); };
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) kick(); }, { rootMargin: "100px" }).observe(stage);
const aim = (o) => { Object.assign(tgt, o); kick(); };
const look = (view) => { const c = camFor(view); aim({ cx: c.cx, cy: c.cy, z: c.z }); };
const setRead = (t) => { if (readout.textContent !== t) readout.textContent = t; };
const setLamp = (name, on) => { const g = lamp(name); if (g) g.dataset.s = on ? "on" : "n"; };
const resetMachine = () => {
  cells.forEach((c) => (c.dataset.s = "n"));
  aim({ sel: SEL_ANGLES[0], bridge: 0, barA: 20, barB: 20, gate: 0, ram: 0, seal: 0, n0: 0.5, n1: 0.5, n2: 0.5, n3: 0.5, n4: 0.5 });
  flags.led = false; ["abs", "unc", "fnd", "cmp"].forEach((n) => setLamp(n, false));
  setNodes(null); crates.forEach((c) => (c.dataset.on = "0"));
};
function setNodes(set, edgeSet) {
  for (const id in nodes) nodes[id].dataset.dim = !set || set.has(id) ? "0" : "1";
  edges.forEach((e) => {
    const id = [...e.classList].find((c) => c.startsWith("e-"))?.slice(2) || "";
    e.dataset.dim = !set || (set.has(id[0]) && set.has(id[1])) ? "0" : "1";
  });
}

// ---- estado de progresso
let ch = 0, token = 0;
const done = new Set(JSON.parse(store.get("mineiro-done") || "[]").filter((n) => n >= 0 && n < CHAPTERS.length));
const saveDone = () => store.set("mineiro-done", JSON.stringify([...done]));
const stepAt = {};
const panel = $("#panel");
const rail = $("#rail");
const bar = $("#progress");

function renderRail() {
  rail.innerHTML = CHAPTERS.map((c, i) => '<button type="button" class="rail-b" data-go="' + i + '" aria-current="' + (i === ch) + '" data-done="' + done.has(i) + '"><span class="rail-i">' + i + '</span><span class="rail-t">' + esc(c.nome) + "</span></button>").join("");
  bar.style.setProperty("--p", (done.size / CHAPTERS.length * 100).toFixed(0) + "%");
  $("#progress-t").textContent = done.size + " de " + CHAPTERS.length + " galerias concluídas";
}

function stepperHtml(id, steps) {
  if (!steps.length) return "";
  const s = stepAt[id] || 0;
  const list = steps.map((st, i) => {
    if (i < s) return '<li class="st done"><span class="st-k">✓</span><span class="st-t">' + esc(st.t) + "</span></li>";
    if (i === s) {
      return '<li class="st now"><span class="st-k">' + (i + 1) + '</span><div class="st-b"><h4>' + esc(st.t) + "</h4><p>" + fmt(st.d) + "</p>" +
        (st.cmd ? '<div class="cmd"><pre>' + esc(st.cmd) + '</pre><button type="button" class="copy" data-copy="' + esc(st.cmd) + '">Copiar</button></div>' : "") +
        (st.link ? '<a class="btn ghost" href="' + st.link + '" target="_blank" rel="noopener">Abrir ↗</a>' : "") +
        '<button type="button" class="btn" data-step="' + id + '">' + (i === steps.length - 1 ? "Último passo feito ✓" : "Feito, próximo passo →") + "</button></div></li>";
    }
    return "";
  }).join("");
  const rest = steps.length - s - 1;
  const fin = s >= steps.length ? '<li class="st fin"><span class="st-k">★</span><span class="st-t">Passos concluídos. Siga para o laboratório.</span></li>' : "";
  return '<ol class="steps" data-id="' + id + '">' + list + fin + "</ol>" + (rest > 0 ? '<p class="more">Faltam ' + rest + " passo" + (rest > 1 ? "s" : "") + ". Um de cada vez.</p>" : "");
}

function labHtml(c) {
  switch (c.lab) {
    case "prologo":
      return '<p class="do">Faça agora: <strong>solte a pepita</strong> e acompanhe a viagem pelas sete galerias.</p><div class="row"><button type="button" class="btn" id="demo">▶ Soltar a pepita</button></div><div class="warn"><strong>Uso responsável.</strong> Pesquise só o que é público, com finalidade legítima e autorizada. Respeite termos, limites de taxa, privacidade e a lei.</div><div class="creed"><h4>O credo da mina</h4><ul>' + PRINCIPIOS.map((p) => "<li>" + esc(p) + "</li>").join("") + "</ul></div>";
    case "install":
      return '<p class="do">Faça agora: escolha <strong>um</strong> caminho. Só um.</p><div class="tabs" role="tablist">' + ["pip", "colab", "fonte"].map((k) => '<button type="button" role="tab" class="tab" data-inst="' + k + '" aria-selected="' + (k === instTab) + '">' + INSTALL[k].nome + "</button>").join("") + '</div><p class="muted">' + esc(INSTALL[instTab].para) + '</p><div id="inst-steps"></div>';
    case "requirement":
      return '<p class="do">Faça agora: <strong>gire o seletor</strong> clicando num requisito.</p><div class="opts">' + REQS.map((r, i) => '<button type="button" class="opt" data-req="' + i + '" aria-pressed="false"><span>' + esc(r.nome) + "</span></button>").join("") + '</div><p class="out" id="req-out" aria-live="polite">Nenhum requisito escolhido ainda.</p>';
    case "scan":
      return '<p class="do">Faça agora: escolha um preset e <strong>acione a varredura</strong>.</p><div class="opts three">' + Object.entries(PRESETS).map(([k, p]) => '<button type="button" class="opt" data-pre="' + k + '" aria-pressed="' + (k === preset) + '"><span>' + p.nome + '</span><small>' + p.nota + "</small></button>").join("") + '</div><div class="row"><button type="button" class="btn" id="scan">▶ Varrer</button></div><p class="out" id="scan-out" aria-live="polite">As 50 gavetas são uma amostra visual do registro.</p>';
    case "sieve":
      return '<p class="do">Faça agora: compare o <strong>alvo</strong> com o <strong>controle</strong>.</p><div class="opts two"><button type="button" class="opt" data-sv="real"><span>Perfil que existe</span><small>alvo e controle diferem</small></button><button type="button" class="opt" data-sv="soft"><span>Página 200 para tudo</span><small>alvo e controle iguais</small></button></div><p class="out" id="sv-out" aria-live="polite">As barras A e B representam as duas respostas. A comparação é didática.</p>';
    case "dials":
      return '<p class="do">Faça agora: escolha um cenário e <strong>clique num mostrador</strong>.</p><div class="opts two">' + Object.entries(SCEN).map(([k, s]) => '<button type="button" class="opt" data-sc="' + k + '" aria-pressed="false"><span>' + s.nome + "</span></button>").join("") + '</div><div class="opts five">' + DIAL_INFO.map((d, i) => '<button type="button" class="opt dial" data-dial="' + i + '" aria-pressed="false"><span>' + d.code + "</span></button>").join("") + '</div><div class="out" id="dial-out" aria-live="polite">Posições ilustrativas, não são pontuações reais.</div>';
    case "board":
      return '<p class="do">Faça agora: rode uma <strong>consulta local</strong> no grafo.</p><div class="opts">' + QUERIES.map((q, i) => '<button type="button" class="opt q" data-q="' + i + '" aria-pressed="false"><span><code>' + esc(q.q) + "</code></span></button>").join("") + '<button type="button" class="opt" data-q="-1" aria-pressed="true"><span>Mostrar tudo</span></button></div><p class="out" id="q-out" aria-live="polite">Linhas contínuas são vínculos; pontilhadas são candidatos por similaridade.</p>';
    case "press":
      return '<p class="do">Faça agora: marque os formatos e <strong>desça a prensa</strong>.</p><div class="opts five">' + FORMATS.map((f, i) => '<label class="chk"><input type="checkbox" id="fmt' + i + '" data-fmt="' + i + '"' + (fmtOn[i] ? " checked" : "") + "><span>" + f + "</span></label>").join("") + '</div><div class="row"><button type="button" class="btn" id="stamp">▼ Lacrar relatório</button></div><div class="out" id="press-out" aria-live="polite">O hash do exemplo aparece aqui.</div>';
  }
  return "";
}

function quizHtml(c) {
  if (!c.quiz) return "";
  return '<section class="quiz" aria-label="Checkpoint"><h3>Checkpoint</h3><p>' + fmt(c.quiz.q) + '</p><div class="qo">' + c.quiz.o.map((o, i) => '<button type="button" class="opt" data-ans="' + i + '"><span>' + fmt(o) + "</span></button>").join("") + '</div><p class="out" id="qz" aria-live="polite"></p></section>';
}

let instTab = "pip", preset = "standard";
const fmtOn = [true, true, false, false, false];
const FORMATS = ["HTML", "JSON", "Markdown", "CSV", "STIX 2.1"];
const SCEN = SCENARIOS;
const INST = INSTALL;

function showChapter(i, scroll) {
  token++;
  ch = clamp(i, 0, CHAPTERS.length - 1);
  const c = CHAPTERS[ch];
  const steps = c.lab === "install" ? [] : c.steps;
  panel.innerHTML =
    '<header class="ch-head"><span class="ch-n">Galeria ' + ch + " de " + (CHAPTERS.length - 1) + "</span><h2>" + esc(c.titulo) + '</h2><p class="ch-local">' + esc(c.local) + "</p></header>" +
    '<div class="story">' + c.story.map((p) => "<p>" + fmt(p) + "</p>").join("") + "</div>" +
    (steps.length ? "<h3>Passo a passo</h3>" + stepperHtml("s" + ch, steps) : "") +
    '<section class="lab"><h3>Laboratório</h3>' + labHtml(c) + "</section>" + quizHtml(c) +
    '<nav class="ch-nav"><button type="button" class="btn ghost" data-go="' + (ch - 1) + '"' + (ch === 0 ? " disabled" : "") + '>← Voltar</button>' +
    (ch < CHAPTERS.length - 1 ? '<button type="button" class="btn" data-next="1">' + (CHAPTERS[ch + 1] ? "Próxima: " + esc(CHAPTERS[ch + 1].nome) : "") + " →</button>" : '<a class="btn" href="#mapa">Ir ao Mapa de Fluxos ↓</a>') + "</nav>";
  renderRail();
  resetMachine();
  aim({ cart: STOPS[c.cart === "start" ? "start" : c.cart] });
  look(c.view);
  flags.lantern = ch >= 1 && done.has(1);
  setRead(c.nome + " · " + c.local.split("·")[1]?.trim() || c.nome);
  setRead(ch === 0 ? "Linha de Garimpo Mineiro · visão geral" : c.nome);
  if (c.lab === "install") renderInst();
  bindLab(c);
  try { history.replaceState(null, "", "#c" + ch); } catch {}
  flows && flows.mark();
  if (scroll) $("#top").scrollIntoView({ behavior: still.matches ? "auto" : "smooth", block: "start" });
}

function renderInst() {
  const box = $("#inst-steps");
  if (!box) return;
  box.innerHTML = stepperHtml("i" + instTab, INST[instTab].steps);
}

function complete(i) { if (!done.has(i)) { done.add(i); saveDone(); renderRail(); } }

// ---- laboratórios
function bindLab(c) {
  const my = token;
  const live = () => my === token;
  const wait = (ms) => new Promise((r) => setTimeout(r, still.matches ? 0 : ms));
  if (c.lab === "prologo") {
    $("#demo").onclick = async () => {
      if (demoOn) return;
      demoOn = true;
      const names = { portal: "Boca da mina", hopper: "Funil", tray: "Esteira", comp: "Peneira", dials: "Balança", board: "Quadro", press: "Prensa" };
      for (const k of Object.keys(names)) {
        if (!live()) break;
        aim({ cart: STOPS[k] }); look(k); setRead("Estação · " + names[k]);
        await wait(1700);
      }
      demoOn = false;
      if (live()) { aim({ cart: STOPS.start }); look("all"); setRead("Linha de Garimpo Mineiro · visão geral"); complete(0); }
    };
  }
  if (c.lab === "install") {
    $$("[data-inst]").forEach((b) => (b.onclick = () => { instTab = b.dataset.inst; showChapter(1, false); }));
  }
  if (c.lab === "requirement") {
    $$("[data-req]").forEach((b) => (b.onclick = () => {
      const i = +b.dataset.req;
      $$("[data-req]").forEach((x) => x.setAttribute("aria-pressed", x === b));
      aim({ sel: SEL_ANGLES[i] }); flags.led = true; kick(); draw();
      $("#req-out").innerHTML = "<strong>" + esc(REQS[i].nome) + ".</strong> " + esc(REQS[i].d);
      setRead("Requisito · " + REQS[i].nome);
    }));
  }
  if (c.lab === "scan") {
    $$("[data-pre]").forEach((b) => (b.onclick = () => { preset = b.dataset.pre; $$("[data-pre]").forEach((x) => x.setAttribute("aria-pressed", x === b)); }));
    let busy = false;
    $("#scan").onclick = async () => {
      if (busy) return;
      busy = true;
      const p = PRESETS[preset], out = $("#scan-out");
      cells.forEach((cc) => (cc.dataset.s = "n"));
      let seed = (Date.now() & 0xffff) + 7;
      const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      const tally = { f: 0, u: 0, a: 0 };
      const total = p.n;
      for (let col = 0; col < p.cols && live(); col++) {
        aim({ bridge: col * CELL.dx });
        const idx = [0, 1, 2, 3, 4].map((r) => col * CELL.rows + r);
        idx.forEach((n) => (cells[n].dataset.s = "s"));
        await wait(240);
        for (const n of idx) { const r = rnd(); const s = r < 0.18 ? "f" : r < 0.33 ? "u" : "a"; cells[n].dataset.s = s; tally[s]++; }
        const shown = Math.min(total, Math.round(((col + 1) / p.cols) * total));
        out.textContent = (preset === "full" ? "Fase 1 · descoberta: " : "Varridos: ") + shown + " de " + total + " detectores · amostra visual: " + tally.f + " found, " + tally.u + " uncertain, " + tally.a + " absent";
        setRead(p.nome + " · " + shown + "/" + total);
      }
      if (live() && preset === "full") {
        cells.forEach((cc) => { if (cc.dataset.s === "f" || cc.dataset.s === "u") cc.dataset.s = "p"; });
        out.textContent = "Fase 2 · checagem profunda só nos candidatos (found, uncertain, rate-limited). Os demais não são refeitos.";
        setRead("Full · fase 2 · candidatos");
        await wait(1600);
        cells.forEach((cc) => { if (cc.dataset.s === "p") cc.dataset.s = rnd() < 0.6 ? "f" : "u"; });
      }
      if (live()) {
        out.textContent += p.evid ? " · Evidence Engine ativo: cada achado ganha sinais e hash." : " · Sem Evidence Engine: é triagem, trate como observação simples.";
        aim({ bridge: 0 });
        complete(3);
      }
      busy = false;
    };
  }
  if (c.lab === "sieve") {
    let busy = false;
    $$("[data-sv]").forEach((b) => (b.onclick = async () => {
      if (busy) return;
      busy = true;
      const real = b.dataset.sv === "real", out = $("#sv-out");
      aim({ barA: 20, barB: 20, gate: 0 }); setLamp("cmp", false);
      out.textContent = "Sondando o alvo…"; await wait(600);
      if (!live()) return;
      aim({ barA: real ? 48 : 34 }); out.textContent = "Resposta do alvo (A) recebida. Sondando o controle, um handle que não pode existir…"; await wait(1100);
      if (!live()) return;
      aim({ barB: real ? 16 : 33 }); await wait(1200);
      if (!live()) return;
      if (real) { aim({ gate: 1 }); setLamp("cmp", true); out.innerHTML = "<strong>Diferentes.</strong> A comporta sobe e o resultado segue para o Evidence Engine."; setRead("Peneira · passou"); }
      else { out.innerHTML = "<strong>Parecidas.</strong> A comporta fica fechada: é um soft-404, ouro de tolo. O resultado é descartado."; setRead("Peneira · descartado"); }
      complete(4);
      busy = false;
    }));
  }
  if (c.lab === "dials") {
    const show = (i) => {
      $$("[data-dial]").forEach((x) => x.setAttribute("aria-pressed", +x.dataset.dial === i));
      const d = DIAL_INFO[i];
      $("#dial-out").innerHTML = "<strong>" + d.code + " · " + esc(d.nome) + "</strong><br><em>" + esc(d.q) + "</em><br>" + fmt(d.d);
      setRead("Mostrador · " + d.code);
    };
    $$("[data-dial]").forEach((b) => (b.onclick = () => show(+b.dataset.dial)));
    $$("[data-sc]").forEach((b) => (b.onclick = () => {
      const s = SCEN[b.dataset.sc];
      $$("[data-sc]").forEach((x) => x.setAttribute("aria-pressed", x === b));
      const o = {}; s.v.forEach((v, i) => (o["n" + i] = v)); aim(o);
      ["abs", "unc", "fnd"].forEach((n) => setLamp(n, n === s.lamp));
      $("#dial-out").innerHTML = "<strong>" + esc(s.nome) + ".</strong> " + esc(s.frase);
      setRead("Cenário · " + s.nome);
      complete(5);
    }));
    svg.querySelectorAll("[data-needle]").forEach((n) => { n.style.cursor = "pointer"; n.onclick = () => show(+n.dataset.needle); });
  }
  if (c.lab === "board") {
    const sets = [new Set(["T", "E", "F"]), new Set(["A", "B", "M"]), new Set(["T", "A", "M", "B"])];
    $$("[data-q]").forEach((b) => (b.onclick = () => {
      const i = +b.dataset.q;
      $$("[data-q]").forEach((x) => x.setAttribute("aria-pressed", x === b));
      setNodes(i < 0 ? null : sets[i]);
      $("#q-out").innerHTML = i < 0 ? "Quadro completo." : "<strong>" + esc(QUERIES[i].q) + "</strong><br>" + esc(QUERIES[i].d);
      setRead(i < 0 ? "Quadro · tudo" : "Grafo · " + QUERIES[i].q.split(" ")[0]);
      if (i >= 0) complete(6);
    }));
  }
  if (c.lab === "press") {
    $$("[data-fmt]").forEach((b) => (b.onchange = () => (fmtOn[+b.dataset.fmt] = b.checked)));
    let busy = false;
    $("#stamp").onclick = async () => {
      if (busy) return;
      busy = true;
      const picked = FORMATS.filter((_, i) => fmtOn[i]);
      const out = $("#press-out");
      crates.forEach((cr) => (cr.dataset.on = "0")); aim({ seal: 0 });
      aim({ ram: 1 }); setRead("Prensa · descendo"); await wait(900);
      if (!live()) return;
      aim({ ram: 0, seal: 1 });
      picked.forEach((_, i) => { if (crates[i]) crates[i].dataset.on = "1"; });
      const payload = JSON.stringify({ exemplo: "payload-didatico", formatos: picked, escopo: "payload-before-manifest" });
      let hex = "";
      try {
        const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
        hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
      } catch { hex = "indisponível neste navegador"; }
      out.innerHTML = picked.length
        ? "<strong>" + picked.length + " formato" + (picked.length > 1 ? "s" : "") + " lacrado" + (picked.length > 1 ? "s" : "") + ":</strong> " + picked.join(", ") + '.<br>SHA-256 do exemplo: <code class="hash">' + hex.slice(0, 32) + "…</code><br>O hash prova integridade, não autoria nem identidade."
        : "Marque ao menos um formato para exportar.";
      setRead("Prensa · lacrado");
      if (picked.length) complete(7);
      busy = false;
    };
  }
}

// ---- eventos globais
const quizDone = (i) => done.has(i);
document.addEventListener("click", (e) => {
  const t = e.target.closest("button, a");
  if (!t) return;
  if (t.dataset.go !== undefined) { showChapter(+t.dataset.go, true); return; }
  if (t.dataset.next) { complete(ch); showChapter(ch + 1, true); return; }
  if (t.dataset.step) {
    const id = t.dataset.step;
    stepAt[id] = (stepAt[id] || 0) + 1;
    if (id[0] === "i") {
      renderInst();
      if (stepAt[id] >= INST[instTab].steps.length) { flags.lantern = true; complete(1); draw(); setRead("Lanterna acesa · instalação feita"); }
    } else {
      const st = $("#panel .steps");
      st.outerHTML = stepperHtml(id, CHAPTERS[ch].steps);
      const next = $("#panel .steps .now, #panel .steps .fin");
      next?.scrollIntoView({ block: "nearest", behavior: still.matches ? "auto" : "smooth" });
    }
    return;
  }
  if (t.dataset.copy !== undefined) {
    const txt = t.dataset.copy;
    const ok = () => { t.textContent = "Copiado ✓"; setTimeout(() => (t.textContent = "Copiar"), 1400); };
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(ok).catch(() => {
      const pre = t.parentElement.querySelector("pre"); const r = document.createRange(); r.selectNodeContents(pre); const s = getSelection(); s.removeAllRanges(); s.addRange(r); t.textContent = "Selecionado";
    });
    return;
  }
  if (t.dataset.ans !== undefined) {
    const q = CHAPTERS[ch].quiz, i = +t.dataset.ans, ok = i === q.c;
    $$("[data-ans]").forEach((b) => { b.dataset.res = +b.dataset.ans === q.c && ok ? "ok" : b === t ? (ok ? "ok" : "no") : ""; });
    $("#qz").innerHTML = (ok ? "<strong>Certo.</strong> " : "<strong>Ainda não.</strong> Tente outra opção. ") + (ok ? fmt(q.why) : "");
    if (ok) complete(ch);
  }
});
stage.tabIndex = 0;
stage.setAttribute("role", "group");
stage.setAttribute("aria-label", "Linha de garimpo. Setas esquerda e direita trocam de galeria.");
stage.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") { e.preventDefault(); showChapter(ch + 1, false); }
  if (e.key === "ArrowLeft") { e.preventDefault(); showChapter(ch - 1, false); }
});

// ---- Mapa de Fluxos
const flows = initFlows({ box: $("#flow-box"), desc: $("#flow-desc"), walk: $("#walk"), tabs: $$("[data-flow]"), current: () => ch, onNode: (n) => showChapter(n, true) });

// ---- bolso (cola)
$("#cheat").innerHTML = CHEAT.map(([t, c]) => '<div class="cheat"><h4>' + esc(t) + '</h4><div class="cmd"><pre>' + esc(c) + '</pre><button type="button" class="copy" data-copy="' + esc(c) + '">Copiar</button></div></div>').join("");

const start = /^#c(\d)$/.exec(location.hash);
showChapter(start ? +start[1] : 0, false);
draw();
})();
