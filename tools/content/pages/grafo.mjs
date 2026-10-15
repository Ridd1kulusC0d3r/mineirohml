import { REQS, PRESETS, DIAL_INFO, PRINCIPIOS, QUERIES, REPO, COLAB, WHEEL } from "../guia.mjs";
import { O } from "../util.mjs";

export default {
  slug: "grafo", group: "usar", nome: "Grafo e pivôs", lead: "Candidatos, consultas locais e hipóteses mantidas com disciplina.",
  fontes: [["docs/GRAPH-HUNTING.md", "docs/GRAPH-HUNTING.md"], ["docs/INTELLIGENCE-METHODOLOGY.md", "docs/INTELLIGENCE-METHODOLOGY.md"]],
  blocks: [
    { t: "note", kind: "warn", x: "Mesmo username em dois lugares não é a mesma pessoa. Correlação exige evidência que a sustente." },
    { t: "h2", x: "O que entra no grafo" },
    { t: "ul", items: ["**Variantes**: usernames parecidos viram nós candidatos (similaridade Jaro-Winkler) e podem ser escaneados direto do grafo.", "**Pivôs**: a extração tem limites de profundidade e de orçamento; os scans de pivô rodam em segundo plano e alimentam o mesmo grafo.", "**Domínios compartilhados** e perfis ligados."] },
    { t: "h2", x: "Consultas locais" },
    { t: "p", x: "São de leitura apenas e podem ser exportadas para Neo4j/Cypher." },
    { t: "table", head: ["Consulta", "O que mostra"], rows: QUERIES.map((q) => ["`" + q.q + "`", q.d]) },
    { t: "h2", x: "Hipóteses com disciplina" },
    { t: "p", x: "Mantenha sempre: hipótese principal, hipótese alternativa, evidências a favor, evidências contra e ressalvas." },
    { t: "h2", x: "Ordem dos pivôs" },
    { t: "ol", items: ["Corroboração independente.", "Evidência de alta qualidade.", "Resolver contradições.", "Fechar gaps.", "Só então expandir a coleta."] },
  ],
};
