import { REQS, PRESETS, DIAL_INFO, PRINCIPIOS, QUERIES, REPO, COLAB, WHEEL } from "../guia.mjs";
import { O } from "../util.mjs";

export default {
  slug: "fluxo-do-analista", group: "entender", nome: "Fluxo do analista", lead: "Como um analista OSINT usa o Mineiro: pergunta primeiro, menor coleta que responde, evidência antes de conclusão.",
  fontes: [["docs/INTELLIGENCE-METHODOLOGY.md", "docs/INTELLIGENCE-METHODOLOGY.md"]],
  blocks: [
    { t: "note", kind: "info", x: "Opinião de método, não texto oficial. Serve para decidir o que fazer com a ferramenta, não para substituí-la." },
    { t: "flows", id: "analista" },
    { t: "h2", x: "Regras de mão" },
    { t: "ol", items: [
      "**Escreva a pergunta antes de coletar.** Sem requisito, o resultado vira lista de links.",
      "**Comece pelo Quick.** Suba para Standard só se a pergunta exigir evidência com hash e baseline. Full é exceção.",
      "**Leia os medidores na ordem**: primeiro a qualidade do sinal, depois a cobertura, depois a correlação. Um número alto sozinho não decide nada.",
      "**Trate FOUND como observação.** Confirmação exige um segundo sinal independente.",
      "**Registre a lacuna.** O que não foi encontrado e o que não foi coletado entra no relatório.",
      "**Exporte o mínimo.** HTML para ler, JSON para guardar. STIX só se outro sistema vai consumir.",
    ] },
    { t: "h2", x: "O que normalmente não vale o tempo" },
    { t: "ul", items: ["Repetir scans Full para ver se algo mudou. Use o Diff entre coletas.", "Seguir todos os candidatos do grafo. Siga os que respondem à pergunta.", "Gerar todos os formatos de exportação por hábito."] },
  ],
};
