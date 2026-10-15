import { REQS, PRESETS, DIAL_INFO, PRINCIPIOS, QUERIES, REPO, COLAB, WHEEL } from "../guia.mjs";
import { O } from "../util.mjs";

export default {
  slug: "glossario", group: "referencia", nome: "Glossário", lead: "Os termos que aparecem na interface e nos relatórios.",
  fontes: [["docs/INTELLIGENCE-METHODOLOGY.md", "docs/INTELLIGENCE-METHODOLOGY.md"]],
  blocks: [
    { t: "table", head: ["Termo", "Significado"], rows: [
      ["FOUND / UNCERTAIN / ABSENT", "Veredito de uma consulta de detector. FOUND é observação, não identidade."],
      ["Detector", "Regra que verifica um serviço público para um identificador."],
      ["Soft-404", "Página que responde 200 OK para qualquer nome, mesmo os que não existem."],
      ["Baseline diferencial", "Comparar a resposta do alvo com a de um handle de controle que não pode existir."],
      ["Intelligence Requirement", "A pergunta que orienta a relevância e a prioridade da análise."],
      ["Evidence Engine", "Camada que coleta sinais, hash e metadados de cada resultado."],
      ["evidenceHash", "SHA-256 da evidência de um resultado."],
      ["DR · OC · CC · SQ · IPS", "Os cinco medidores: confiabilidade do detector, confiança da observação, confiança da correlação, qualidade da fonte e prioridade de revisão."],
      ["Gap", "Lacuna de inteligência: algo que, se resolvido, mudaria a avaliação."],
      ["Pivô", "Próximo passo de coleta a partir de um achado."],
      ["Candidato", "Username parecido, com similaridade Jaro-Winkler, que ainda precisa de corroboração."],
      ["Manifest", "Arquivo com o SHA-256 do payload exportado."],
      ["Caso", "Conjunto de snapshots imutáveis guardados no navegador."],
      ["Diff", "Comparação entre duas coletas: NEW, DISAPPEARED, CHANGED, UNCHANGED, CONFIDENCE_UP e CONFIDENCE_DOWN."],
      ["STIX 2.1", "Formato padrão para troca de inteligência de ameaças."],
      ["AI_SYNTHESIZED", "Marca de conteúdo gerado ou resumido por IA."],
    ] },
  ],
};
