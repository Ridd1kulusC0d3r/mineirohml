import { REQS, PRESETS, DIAL_INFO, PRINCIPIOS, QUERIES, REPO, COLAB, WHEEL } from "../guia.mjs";
import { O } from "../util.mjs";

export default {
  slug: "primeiro-scan", group: "comecar", nome: "Primeiro scan", lead: "Um scan Quick com um identificador autorizado e a leitura na ordem certa.",
  fontes: [["docs/GETTING-STARTED.md", "docs/GETTING-STARTED.md"], ["docs/USER-GUIDE.md", "docs/USER-GUIDE.md"]],
  blocks: [
    { t: "note", kind: "warn", x: "Pesquise só o que é público, com finalidade legítima e autorizada. Veja [Uso responsável](uso-responsavel.html)." },
    { t: "h2", x: "Passo a passo" },
    { t: "ol", items: ["Abra o terminal (ou o notebook do Colab, célula **Interface**).", "Digite um username que você esteja autorizado a pesquisar: `mineiro scan alvo --preset quick`.", "No notebook, mantenha o preset **quick** e clique em **Run scan**.", "Quando terminar, **leia os julgamentos e as lacunas antes da tabela de evidências**.", "Para guardar o resultado: `--out relatorios/ --format html,markdown,json`."] },
    { t: "h2", x: "Escolha o requisito de inteligência" },
    { t: "p", x: "O Intelligence Requirement diz ao Mineiro **o que é relevante**. Ele muda a relevância e a prioridade na análise. Os fatos observados continuam os mesmos." },
    { t: "table", head: ["Requisito", "Pergunta que responde"], rows: REQS.map((r) => [r.nome, r.d]) },
    { t: "h2", x: "E depois?" },
    { t: "p", x: "Leia o relatório (a [Intelligence View](intelligence-view.html) descreve a ordem) na ordem indicada e só então decida se vale um preset maior ou um pivô." },
  ],
};
