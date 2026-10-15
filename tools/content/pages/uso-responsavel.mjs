import { REQS, PRESETS, DIAL_INFO, PRINCIPIOS, QUERIES, REPO, COLAB, WHEEL } from "../guia.mjs";
import { O } from "../util.mjs";

export default {
  slug: "uso-responsavel", group: "entender", nome: "Uso responsável", lead: "O que a ferramenta assume, o que ela não faz e como usá-la com critério.",
  fontes: [["SECURITY.md", "SECURITY.md"], ["docs/INTELLIGENCE-METHODOLOGY.md", "docs/INTELLIGENCE-METHODOLOGY.md"]],
  blocks: [
    { t: "h2", x: "Princípios" },
    { t: "ul", items: PRINCIPIOS },
    { t: "h2", x: "Regras de uso" },
    { t: "ul", items: ["Use apenas informação publicamente acessível.", "Tenha finalidade legítima e autorização para pesquisar o identificador.", "Respeite termos de uso, limites de taxa, privacidade e a lei (LGPD, GDPR).", "Não trate um achado isolado como identificação de pessoa."] },
    { t: "h2", x: "O que a ferramenta não faz" },
    { t: "ul", items: ["Não tem mecanismo para burlar login, CAPTCHA ou controles de acesso.", "Não atribui nota a pessoas. O IPS prioriza achados, não indivíduos.", "Não transforma saída de IA em fato: ela vem marcada como `AI_SYNTHESIZED`."] },
    { t: "p", x: "Para reportar vulnerabilidades, consulte o [SECURITY.md](" + O("SECURITY.md") + ") do repositório original." },
  ],
};
