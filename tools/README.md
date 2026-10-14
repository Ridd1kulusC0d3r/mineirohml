# tools

Gera o site estático (raiz do repositório) a partir de:

- `content.mjs`: capítulos, laboratórios, fluxos e textos do guia imersivo
- `docs.mjs`: páginas da documentação
- `fig.mjs`: a figura isométrica (geometria)
- `engine-body.js`, `flows.mjs`, `src/`: motor interativo, fluxos, CSS e JS das páginas

```bash
cd tools
npm install        # instala o esbuild
node build-site.mjs
```

`fig.mjs` e `build-site.mjs` usam o kit isométrico "anatomy" (`iso-kit.mjs`, `lathe.mjs`).
O caminho padrão é `/mnt/skills/plugins/anatomy/kit/`; ajuste os imports de `fig.mjs` e a variável `KIT` se ele estiver em outro lugar.
O kit não é copiado para este repositório. Só o resultado gerado (`assets/guia.js`) o inclui.

`check.cjs` é uma verificação com Playwright (links, console, rolagem horizontal), servida em `localhost:8765`.
