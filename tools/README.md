# tools

Gera o site estático (raiz do repositório) a partir de:

- `content/guia.mjs`: etapas, fluxos e textos do guia
- `content/docs.mjs` e `content/pages/*.mjs`: uma página da documentação por arquivo
- `figure/`: geometria isométrica (`fig.mjs`), motor interativo (`engine-body.js`) e fluxos (`flows.mjs`)
- `build/`: gerador (`index.mjs` é a entrada; `assets`, `layout`, `markup`, `pages`)
- `src/`: CSS e JS das páginas

```bash
cd tools
npm install        # instala o esbuild
npm run build   # ou: node build/index.mjs
```

`figure/fig.mjs` e o build usam o kit isométrico "anatomy" (`iso-kit.mjs`, `lathe.mjs`).
O caminho padrão é `/mnt/skills/plugins/anatomy/kit/`; defina `KIT_DIR=/caminho/do/kit` se ele estiver em outro lugar.
O kit não é copiado para este repositório. Só o resultado gerado (`assets/guia.js`) o inclui.

`npm run check` roda `check.cjs`, que é uma verificação com Playwright (links, console, rolagem horizontal), servida em `localhost:8765`.
