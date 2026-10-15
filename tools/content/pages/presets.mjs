import { REQS, PRESETS, DIAL_INFO, PRINCIPIOS, QUERIES, REPO, COLAB, WHEEL } from "../guia.mjs";
import { O } from "../util.mjs";

export default {
  slug: "presets", group: "usar", nome: "Presets e coleta", lead: "Quick, Standard e Full: quanto cobrir, e o que o scan faz por baixo.",
  fontes: [["docs/USER-GUIDE.md", "docs/USER-GUIDE.md"], ["docs/INTELLIGENCE-METHODOLOGY.md", "docs/INTELLIGENCE-METHODOLOGY.md"]],
  blocks: [
    { t: "h2", x: "Os três presets" },
    { t: "table", head: ["Preset", "Cobertura", "Quando usar"], rows: [
      ["Quick", PRESETS.quick.nota, "Checar se o ambiente funciona e fazer triagem inicial."],
      ["Standard", PRESETS.standard.nota, "Investigação normal, com baseline diferencial."],
      ["Full", "984 escaneáveis de 985 catalogados · 2 fases", "Quando a cobertura ampla realmente importa."],
    ] },
    { t: "h2", x: "Como o Full trabalha" },
    { t: "ol", items: ["**Fase 1 · descoberta rápida** em todo o registro escaneável.", "**Fase 2 · checagens profundas** só nos candidatos (found, uncertain ou rate-limited)."] },
    { t: "h2", x: "Baseline diferencial" },
    { t: "p", x: "Além do alvo, o Mineiro sonda um handle aleatório que não pode existir. Se a página do alvo se parece com a do controle, o resultado é descartado como **soft-404**: uma página que responde 200 OK para qualquer nome." },
    { t: "h2", x: "Rastro de auditoria" },
    { t: "p", x: "Cada resultado carrega `evidenceHash` (SHA-256), `collectedAt` e `detectorVersion`." },
    { t: "h2", x: "Limites" },
    { t: "ul", items: ["Endpoints protegidos ficam **inconclusivos**. O Mineiro não tenta vencer CAPTCHA nem controles de acesso.", "Evite repetir o Full sem necessidade. Mais tráfego não é mais inteligência.", "Respeite termos de uso e limites de taxa das plataformas."] },
    { t: "flows", id: "preset" },
  ],
};
