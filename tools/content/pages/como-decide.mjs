import { REQS, PRESETS, DIAL_INFO, PRINCIPIOS, QUERIES, REPO, COLAB, WHEEL } from "../guia.mjs";
import { O } from "../util.mjs";

export default {
  slug: "como-decide", group: "entender", nome: "Como o Mineiro decide", lead: "O que acontece entre a resposta HTTP e o veredito: oito checagens, baseline e dois níveis de confiança.",
  fontes: [["ARCHITECTURE.md", "ARCHITECTURE.md"], ["docs/INTELLIGENCE-METHODOLOGY.md", "docs/INTELLIGENCE-METHODOLOGY.md"]],
  blocks: [
    { t: "p", x: "Uma resposta HTTP não vira FOUND sozinha. O Mineiro separa **coleta**, **evidência**, **correlação** e **avaliação**, e cada etapa tem a sua própria confiança." },
    { t: "h2", x: "Oito checagens por resposta" },
    { t: "p", x: "Uma única resposta pode gerar até oito checagens lógicas. Nenhuma exige requisição extra." },
    { t: "table", head: ["Checagem", "Serve para"], rows: [
      ["Status esperado", "comportamento de presença"],
      ["Status de ausência", "evidência negativa explícita"],
      ["Consistência de redirect", "detectar redirects genéricos"],
      ["Username na URL final", "continuidade da rota"],
      ["Username no corpo", "token na resposta"],
      ["Canonical", "consistência do canonical"],
      ["Soft-404", "detectar páginas de erro genéricas"],
      ["Proteção de borda", "classificar WAF e rate limit"],
    ] },
    { t: "note", kind: "info", x: "985 detectores × 8 checagens = 7.880 checagens **possíveis**. Isso não significa 7.880 requisições." },
    { t: "h2", x: "Baseline diferencial" },
    { t: "p", x: "O alvo é comparado com um handle aleatório que não pode existir. Se as duas páginas são indistinguíveis, o resultado é descartado como soft-404. É a principal defesa contra falso positivo." },
    { t: "h2", x: "Dois níveis de confiança" },
    { t: "table", head: ["Nível", "Responde"], rows: [
      ["Detector Reliability", "A regra deste site costuma ser confiável?"],
      ["Result Confidence", "Esta consulta, agora, foi conclusiva?"],
    ] },
    { t: "p", x: "Exemplo: confiabilidade do detector 91, confiança do resultado 84, evidência *probable*. Os dois números nunca são fundidos numa nota única." },
    { t: "h2", x: "Proveniência" },
    { t: "ul", items: ["**PRIMARY**: observado diretamente pelo Mineiro.", "**EXTERNAL**: veio de fonte pública externa.", "**DERIVED**: avaliação construída sobre evidências.", "**AI_SYNTHESIZED**: sugestão de IA. Só gera hipótese e nunca eleva confiança factual."] },
    { t: "h2", x: "Modelo do grafo" },
    { t: "p", x: "Nós: TARGET, USERNAME, EMAIL, PROFILE, PLATFORM, DOMAIN, PUBLIC_URL, DISPLAY_NAME, ORGANIZATION, PUBLIC_PROJECT e AVATAR_HASH. Arestas: USES, LINKS_TO, MENTIONS, HOSTED_ON, SAME_HANDLE, SAME_DOMAIN, REFERENCES e OBSERVED_ON. Toda aresta guarda confiança, proveniência e `evidenceId`." },
    { t: "h2", x: "Integridade" },
    { t: "p", x: "O SHA-256 é calculado sobre o payload antes do manifest. Verifica **integridade do conteúdo**. Não é assinatura de autoria nem cadeia de custódia legal." },
  ],
};
