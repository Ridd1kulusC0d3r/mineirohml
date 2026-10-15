import { REQS, PRESETS, DIAL_INFO, PRINCIPIOS, QUERIES, REPO, COLAB, WHEEL } from "../guia.mjs";
import { O } from "../util.mjs";

export default {
  slug: "exportacao-diff", group: "usar", nome: "Exportar e comparar", lead: "Relatórios lacrados com SHA-256, Casos com snapshots e o Diff entre coletas.",
  fontes: [["docs/USER-GUIDE.md", "docs/USER-GUIDE.md"], ["docs/INTELLIGENCE-METHODOLOGY.md", "docs/INTELLIGENCE-METHODOLOGY.md"]],
  blocks: [
    { t: "h2", x: "Exportar" },
    { t: "p", x: "Abra **Export**, escolha o conteúdo e o formato." },
    { t: "table", head: ["Formato", "Para quê"], rows: [["HTML", "Leitura e impressão"], ["JSON", "Integração"], ["Markdown", "Notas de caso"], ["CSV", "Evidência tabular"], ["STIX 2.1", "Troca de inteligência de ameaças"]] },
    { t: "p", x: "Cada exportação gera um **manifest** com o SHA-256 do payload (escopo `payload-before-manifest`). O hash prova **integridade**, não autoria nem identidade." },
    { t: "h2", x: "Casos e Diff" },
    { t: "p", x: "Casos guardam snapshots imutáveis no IndexedDB do navegador. O Diff Intelligence compara duas coletas:" },
    { t: "table", head: ["Status", "Significa"], rows: [["NEW", "Apareceu na coleta atual"], ["DISAPPEARED", "Estava antes e não está agora. É diferença entre coletas, não prova de conta apagada"], ["CHANGED", "Mudou entre coletas"], ["UNCHANGED", "Igual nas duas"], ["CONFIDENCE_UP", "A confiança subiu"], ["CONFIDENCE_DOWN", "A confiança caiu"]] },
    { t: "h2", x: "AI Analyst Copilot" },
    { t: "p", x: "Resume evidências, ordena gaps, sugere pivôs e hipóteses alternativas. A saída vem marcada `AI_SYNTHESIZED` e não eleva sozinha a confiança factual." },
    { t: "h2", x: "Quando parar" },
    { t: "p", x: "Pare quando novos dados não alteram julgamentos, não resolvem contradições, não fecham gaps e não mudam a decisão analítica." },
  ],
};
