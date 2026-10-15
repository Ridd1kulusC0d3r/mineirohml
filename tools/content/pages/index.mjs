import { REQS, PRESETS, DIAL_INFO, PRINCIPIOS, QUERIES, REPO, COLAB, WHEEL } from "../guia.mjs";
import { O } from "../util.mjs";

export default {
  slug: "index", group: null, nome: "Visão geral", lead: "O Mineiro é uma bancada de investigação OSINT para presença pública de usernames: evidência primeiro, correlação cautelosa e relatórios auditáveis.",
  fontes: [["README.md", "README.md"], ["docs/README.md", "docs/README.md"]],
  blocks: [
    { t: "note", kind: "info", x: "Esta é a documentação de homologação (hml) da comunidade, escrita em pt-BR. O texto de referência e a versão mais recente estão no [repositório original](" + REPO + "). Em caso de diferença, vale o original." },
    { t: "h2", x: "O que ele faz" },
    { t: "p", x: "O Mineiro verifica superfícies públicas associadas a um identificador (um username) e transforma respostas técnicas brutas numa avaliação estruturada. Ele mantém separadas quatro coisas que ferramentas de username costumam misturar:" },
    { t: "ol", items: ["**Coleta**: o que cada detector observou.", "**Evidência**: sinais, hash SHA-256, data e versão do detector.", "**Correlação**: o que sustenta uma relação entre contas.", "**Avaliação**: julgamentos, lacunas e próximos passos."] },
    { t: "note", kind: "warn", x: "Um resultado FOUND é uma observação. **Não é prova de identidade.**" },
    { t: "h2", x: "Comece por aqui" },
    { t: "p", x: "Siga a trilha na ordem. Cada passo cabe numa sessão curta." },
    { t: "cards", items: [
      ["instalacao", "1 · Instalar", "pip, Colab ou código-fonte. Três caminhos, escolha um."],
      ["primeiro-scan", "2 · Primeiro scan", "Quick, um identificador autorizado, e a leitura da aba Intelligence."],
      ["presets", "3 · Presets e coleta", "Quick, Standard e Full. Quando usar cada um."],
      ["intelligence-view", "4 · Intelligence View", "Os cinco medidores e a ordem certa de leitura."],
      ["grafo", "5 · Grafo e pivôs", "Candidatos, consultas locais e hipóteses com disciplina."],
      ["exportacao-diff", "6 · Exportar e comparar", "Relatórios com manifest SHA-256, Casos e Diff."],
    ] },
    { t: "h2", x: "Para entender e consultar" },
    { t: "cards", items: [
      ["fluxo-do-analista", "Fluxo do analista", "Pergunta, menor coleta, evidência antes de conclusão."],
      ["como-decide", "Como o Mineiro decide", "Oito checagens, baseline e dois níveis de confiança."],
      ["detectores", "Detectores e Registry", "985 detectores, canários e como contribuir."],
      ["api-seguranca", "API local e segurança", "Endpoints, variáveis e proteções do servidor."],
    ] },
    { t: "h2", x: "Prefere o resumo visual?" },
    { t: "p", x: "A [Linha de Garimpo](../index.html) resume as sete etapas com figuras isométricas: faça, decida, evite. Para a visão de quem investiga, leia o [Fluxo do analista](fluxo-do-analista.html)." },
  ],
};
