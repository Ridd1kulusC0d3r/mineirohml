# Mineiro hml

Ambiente de homologação da documentação e do guia interativo em pt-BR do
[Mineiro OSINT Extractor](https://github.com/Ridd1kulusC0d3r/Mineiro-OSINT-Extractor).
O texto de referência é sempre o do repositório original.

- **Guia visual** (`index.html`): a "Linha de Garimpo", um diagrama isométrico com sete etapas (faça, decida, evite), laboratórios clicáveis e um mapa de fluxos.
- **Documentação** (`docs/`): instalação, primeiro scan, presets, Intelligence View, grafo, exportação, fluxo do analista, como o Mineiro decide, detectores, API e segurança, glossário, FAQ e solução de problemas.
- Tudo é HTML, CSS e JS estáticos. Sem backend e sem chamadas a plataformas: as demonstrações são simulações didáticas.

## Publicar no GitHub Pages

Em **Settings → Pages**, escolha *Deploy from a branch*, branch `main`, pasta `/ (root)`.
O arquivo `.nojekyll` já está na raiz. Os caminhos são relativos, então funciona em `https://<usuario>.github.io/mineirohml/`.

## Peso

| Arquivo | Tamanho (gzip) |
|---|---|
| `index.html` (inclui o SVG isométrico) | ~70 KB |
| `assets/guia.js` | ~20 KB |
| `assets/guia.css` | ~5 KB |
| Página de docs típica + `docs.js` + `docs.css` | ~10 KB |

## Regenerar

Os arquivos publicados são gerados por `tools/`. Veja [`tools/README.md`](tools/README.md).

## Licença e uso

O código original do Mineiro é MIT. Use a ferramenta apenas com informação pública, finalidade legítima e autorização, respeitando termos, limites de taxa, privacidade e a lei.
