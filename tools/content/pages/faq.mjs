import { REQS, PRESETS, DIAL_INFO, PRINCIPIOS, QUERIES, REPO, COLAB, WHEEL } from "../guia.mjs";
import { O } from "../util.mjs";

export default {
  slug: "faq", group: "referencia", nome: "FAQ", lead: "Respostas curtas às dúvidas que mais aparecem.",
  fontes: [["docs/FAQ.md", "docs/FAQ.md"]],
  blocks: [
    { t: "table", head: ["Pergunta", "Resposta"], rows: [
      ["O Mineiro confirma identidade?", "Não. Ele observa presença pública e dá suporte à correlação. Identidade exige evidência independente."],
      ["HTTP 200 significa FOUND?", "Não necessariamente. O Evidence Engine também olha redirect, URL final, conteúdo, canonical, soft-404 e proteção de borda."],
      ["Detector Reliability e Observation Confidence são iguais?", "Não. Uma é a qualidade esperada da regra, a outra é a qualidade desta execução."],
      ["O que é Source Quality?", "A força da fonte pública observada, separada da qualidade do detector."],
      ["O que é IPS?", "Intelligence Priority Score. Prioriza achados, não pessoas."],
      ["Por que aparece UNCERTAIN?", "Rate limit, WAF, redirect ambíguo ou comportamento inconclusivo. O Mineiro prefere admitir incerteza a inventar certeza."],
      ["O Full faz 7.880 requisições?", "Não. São checagens lógicas possíveis, várias extraídas da mesma resposta."],
      ["Posso rodar no Colab?", "Sim, pelo notebook oficial."],
      ["O Copilot é obrigatório?", "Não. Toda a avaliação determinística funciona sem IA."],
      ["O Copilot pode elevar a confiança?", "Não sozinho. A saída é marcada `AI_SYNTHESIZED`."],
      ["O SHA-256 prova autoria?", "Não. Verifica a integridade do payload exportado."],
      ["Posso adicionar detectores?", "Sim, se o endpoint for público, a proveniência documentada e o comportamento testável. Veja [Detectores e Registry](detectores.html)."],
    ] },
  ],
};
