import { REQS, PRESETS, DIAL_INFO, PRINCIPIOS, QUERIES, REPO, COLAB, WHEEL, PIP } from "../guia.mjs";
import { O } from "../util.mjs";

export default {
  slug: "instalacao", group: "comecar", nome: "Instalação", lead: "Três caminhos até o primeiro scan. Escolha um e faça um passo por vez.",
  fontes: [["README.md", "README.md"], ["docs/GETTING-STARTED.md", "docs/GETTING-STARTED.md"], ["COLAB.md", "COLAB.md"]],
  blocks: [
    { t: "h2", x: "Qual caminho?" },
    { t: "table", head: ["Caminho", "Precisa de", "Boa escolha quando"], rows: [["pip", "Python 3.10+", "você quer só usar a ferramenta"], ["Colab", "Conta Google e navegador", "não quer instalar nada"], ["Código-fonte", "Python 3.10+", "quer rodar os testes ou contribuir"]] },
    { t: "h2", x: "Caminho 1 · pip" },
    { t: "p", x: "O pacote `mineiro` (~80 kB, só depende do `httpx`) é instalado direto do repositório." },
    { t: "code", x: "python -m venv .venv\nsource .venv/bin/activate   # Windows: .venv\\Scripts\\activate\n" + PIP + "\nmineiro scan forgejo --preset quick" },
    { t: "p", x: "Os presets são `quick` (19 sites), `standard` (49, com Evidence Engine e baseline) e `full` (984, em duas fases). Os casos ficam em `~/.mineiro`." },
    { t: "code", x: "mineiro scan forgejo --lang pt --out relatorios/ --format html,markdown,json,stix\nmineiro registry validate   # diagnóstico do registry" },
    { t: "h2", x: "Caminho 2 · Google Colab" },
    { t: "p", x: "O notebook oficial instala o pacote Python e desenha a interface dentro da própria célula: não há servidor, porta nem link de proxy (sem IA e sem chaves). [Abrir no Colab](" + COLAB + "). Rode as células na ordem e use apenas um identificador que você esteja autorizado a pesquisar." },
    { t: "h2", x: "Caminho 3 · Código-fonte" },
    { t: "code", x: "git clone https://github.com/Ridd1kulusC0d3r/mineirohml.git\ncd mineirohml/mineiro-py\npip install -e \".[dev,notebook]\"\npytest" },
    { t: "p", x: "Pede Python 3.10 ou superior. A versão Node/React original continua em `mineiro-tool/` como referência." },
    { t: "h2", x: "Verificar a instalação" },
    { t: "ul", items: ["`mineiro --version` informa a versão.", "`mineiro registry validate` confere os 985 detectores.", "Pelo código-fonte: `pytest`."] },
    { t: "h2", x: "Lançadores de duplo clique" },
    { t: "p", x: "A raiz do repositório original traz lançadores para quem prefere não usar o terminal: `Iniciar-Mineiro.bat` (Windows), `Iniciar-Mineiro.command` (macOS) e `iniciar-mineiro.sh` (Linux), além do `COMECE-AQUI.md`. Consulte esse arquivo para o passo a passo deles." },
  ],
};
