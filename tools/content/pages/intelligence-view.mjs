import { REQS, PRESETS, DIAL_INFO, PRINCIPIOS, QUERIES, REPO, COLAB, WHEEL } from "../guia.mjs";
import { O } from "../util.mjs";

export default {
  slug: "intelligence-view", group: "usar", nome: "Intelligence View", lead: "A aba que organiza o que foi observado, o que foi interpretado e o que ainda falta.",
  fontes: [["docs/INTELLIGENCE-METHODOLOGY.md", "docs/INTELLIGENCE-METHODOLOGY.md"], ["docs/USER-GUIDE.md", "docs/USER-GUIDE.md"]],
  blocks: [
    { t: "h2", x: "Ordem de leitura" },
    { t: "ol", items: [
      "**Executive Assessment**: Assessment Confidence, Coverage, High-value Findings e Analytical Gaps.",
      "**Known / Assessed / Unknown**: separa o que foi observado do que foi interpretado.",
      "**Key Intelligence Judgments**: cada julgamento traz confiança (HIGH, MODERATE ou LOW) e a sua *basis*.",
      "**Evidence Matrix**: detector, observação, correlação, qualidade da fonte e IPS, lado a lado.",
      "**Contradictory Evidence**: leia antes de elevar qualquer hipótese.",
      "**Intelligence Gaps**: qual lacuna, se resolvida, mudaria a avaliação?",
      "**High-Value Pivots**: execute primeiro os que corroboram por fonte independente, resolvem contradições ou fecham gaps.",
    ] },
    { t: "h2", x: "Cinco medidores, nenhuma nota única" },
    { t: "p", x: "Não existe uma pontuação que resuma tudo. Cada medidor responde a uma pergunta diferente. Misturá-los esconde justamente o que importa." },
    { t: "table", head: ["Medidor", "Pergunta", "O que é"], rows: DIAL_INFO.map((d) => [d.code + " · " + d.nome, d.q, d.d]) },
    { t: "h2", x: "Abrir um finding" },
    { t: "p", x: "Clique no **evidence ID** para ver a URL, o timestamp, o status HTTP, a latência, os sinais de evidência, os metadados públicos, por que importa e o pivô recomendado." },
    { t: "flows", id: "achado" },
  ],
};
