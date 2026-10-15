import { REQS, PRESETS, DIAL_INFO, PRINCIPIOS, QUERIES, REPO, COLAB, WHEEL } from "../guia.mjs";
import { O } from "../util.mjs";

export default {
  slug: "instalacao", group: "comecar", nome: "Instalação", lead: "Três caminhos até a interface. Escolha um e faça um passo por vez.",
  fontes: [["README.md", "README.md"], ["docs/GETTING-STARTED.md", "docs/GETTING-STARTED.md"], ["COLAB.md", "COLAB.md"]],
  blocks: [
    { t: "h2", x: "Qual caminho?" },
    { t: "table", head: ["Caminho", "Precisa de", "Boa escolha quando"], rows: [["pip", "Python", "você quer só usar a ferramenta"], ["Colab", "Conta Google e navegador", "não quer instalar nada"], ["Código-fonte", "Node.js 22+", "quer rodar os testes ou contribuir"]] },
    { t: "h2", x: "Caminho 1 · pip" },
    { t: "p", x: "O README indica `pip install mineiro-osint`. Enquanto o pacote não estiver publicado no PyPI, instale pelo wheel do release v1.7.0." },
    { t: "code", x: "python -m venv .venv\nsource .venv/bin/activate   # Windows: .venv\\Scripts\\activate\npip install " + WHEEL + "\nmineiro" },
    { t: "p", x: "A interface abre em `http://127.0.0.1:3000`, acessível só na sua máquina. Os dados ficam em `~/.mineiro`." },
    { t: "code", x: "mineiro --check   # diagnóstico do ambiente" },
    { t: "h2", x: "Caminho 2 · Google Colab" },
    { t: "p", x: "O repositório traz um notebook de inteligência de username. [Abrir no Colab](" + COLAB + "). Rode as células na ordem em que aparecem e use apenas um identificador que você esteja autorizado a pesquisar." },
    { t: "h2", x: "Caminho 3 · Código-fonte" },
    { t: "code", x: "git clone " + REPO + ".git\ncd Mineiro-OSINT-Extractor\nnpm ci --no-audit --no-fund\nnpm run dev" },
    { t: "p", x: "Pede Node.js 22 ou superior. A interface abre em `http://localhost:3000`." },
    { t: "h2", x: "Verificar a instalação" },
    { t: "ul", items: ["`GET /api/health` informa versão e status.", "`mineiro --check` roda o diagnóstico na instalação por pip.", "Pelo código-fonte: `npm test`, `npm run check` e `npm run detectors:health`."] },
    { t: "h2", x: "Lançadores de duplo clique" },
    { t: "p", x: "A raiz do repositório original traz lançadores para quem prefere não usar o terminal: `Iniciar-Mineiro.bat` (Windows), `Iniciar-Mineiro.command` (macOS) e `iniciar-mineiro.sh` (Linux), além do `COMECE-AQUI.md`. Consulte esse arquivo para o passo a passo deles." },
  ],
};
