<div align="center">

<img src="mineiro-tool/assets/mineiro-logo.png" alt="Mineiro" width="180" decoding="async">

# Mineiro hml

**Ferramenta de investigação OSINT de usernames, guia visual e documentação em pt-BR.**

<code>coleta → evidência → correlação → avaliação</code>

<p>
  <img alt="Versão" src="https://img.shields.io/badge/mineiro-2.0.0a1-111111?style=flat-square">
  <img alt="Python" src="https://img.shields.io/badge/python-3.10%2B-111111?style=flat-square">
  <img alt="IA" src="https://img.shields.io/badge/IA-nenhuma-111111?style=flat-square">
  <img alt="Ambiente" src="https://img.shields.io/badge/ambiente-homologa%C3%A7%C3%A3o-111111?style=flat-square">
</p>

<p>
  <a href="https://colab.research.google.com/github/Ridd1kulusC0d3r/mineirohml/blob/main/mineiro-py/notebooks/Mineiro_Python_Colab.ipynb"><img alt="Open In Colab" src="https://colab.research.google.com/assets/colab-badge.svg"></a>
</p>

<p>
  <a href="mineiro-py/README.md">Ferramenta (Python)</a>
  &nbsp;·&nbsp;
  <a href="mineiro-tool/README.pt-BR.md">Versão Node/React</a>
  &nbsp;·&nbsp;
  <a href="mineiro-tool/docs/USER-GUIDE.md">Guia de uso</a>
  &nbsp;·&nbsp;
  <a href="mineiro-tool/LEIA-ME-HML.md">O que mudou</a>
  &nbsp;·&nbsp;
  <a href="tools/README.md">Gerar o site</a>
</p>

<img src="mineiro-tool/assets/demo.gif" alt="Mineiro varrendo um handle público, com progresso ao vivo, veredictos por evidência e grafo de correlação" width="820">

</div>

## O que tem aqui

| Pasta | Conteúdo |
|---|---|
| [`mineiro-py/`](mineiro-py/) | **O Mineiro em Python** (recomendado): CLI, API e interface no notebook. ~80 kB, só `httpx`, sem servidor, sem IA. 985 detectores, baseline diferencial, Evidence Engine, grafo, STIX 2.1, casos e diff, relatórios com SHA-256 |
| [`mineiro-tool/`](mineiro-tool/) | O Mineiro v1.7.0 refatorado: sem integrações de IA, `server.ts` dividido, `HOST` padrão `127.0.0.1`, UI com carregamento sob demanda |
| `index.html` | **Guia visual**: a "Linha de Garimpo", um diagrama isométrico com sete etapas (faça, decida, evite), laboratórios clicáveis e mapa de fluxos |
| [`docs/`](docs/index.html) | Documentação em pt-BR: instalação, primeiro scan, presets, Intelligence View, grafo, exportação, fluxo do analista, detectores, API e segurança, glossário, FAQ |
| [`tools/`](tools/) | Gerador do site estático (esbuild) |

O site é HTML, CSS e JS estáticos, sem backend e sem chamadas a plataformas: as demonstrações são simulações didáticas.

## Começar em dois minutos

**No Colab (sem servidor, sem proxy):**

1. Clique em **Open in Colab** acima.
2. Escolha **Runtime → Run all**.
3. Na célula **Interface**, digite o alvo (um username que você esteja autorizado a pesquisar), escolha o preset e clique em **Run scan**.

**No terminal:**

```bash
pip install "mineiro @ git+https://github.com/Ridd1kulusC0d3r/mineirohml.git#subdirectory=mineiro-py"
mineiro scan forgejo --lang pt --out relatorios/ --format html,markdown,json
```

A versão Node/React (`mineiro-tool/`) continua no repositório como referência, com a interface web completa.

## Publicar o site no GitHub Pages

Em **Settings → Pages**, escolha *Deploy from a branch*, branch `main`, pasta `/ (root)`.
O arquivo `.nojekyll` já está na raiz e os caminhos são relativos, então funciona em `https://<usuario>.github.io/mineirohml/`.

## Peso do site

| Arquivo | Tamanho (gzip) |
|---|---|
| `index.html` (inclui o SVG isométrico) | ~70 KB |
| `assets/guia.js` | ~15 KB |
| `assets/guia.css` | ~4 KB |
| Página de docs típica + `docs.js` + `docs.css` | ~10 KB |

## Licença e uso

O código original do Mineiro é MIT. Use a ferramenta apenas com informação pública, finalidade legítima e autorização, respeitando termos, limites de taxa, privacidade e a lei.
