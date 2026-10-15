# Mineiro-OSINT-Extractor · cópia de homologação (hml)

- **Base:** [Mineiro-OSINT-Extractor](https://github.com/Ridd1kulusC0d3r/Mineiro-OSINT-Extractor) commit `96b49b6` (main), v1.7.0.
- **Escopo:** a ferramenta fica em `mineiro-tool/`; o site da raiz (guia e docs) foi regenerado a partir de `tools/` para refletir a remoção da IA.

## O que mudou em relação à base
1. **Todas as integrações de IA removidas:** Copilot/Gemini (`/api/intelligence/copilot*`, `/api/osint/gemini-validate`, `src/ai/`), workspace, painel e modal de chave de IA, proveniência `AI_SYNTHESIZED`, `AiProfileReport` e todas as props `aiProfile`, dependência `@google/genai`, `GEMINI_API_KEY` e os toggles de IA nas configurações de scan e lote.
2. **Endpoint legado `POST /api/osint/profile` removido**, junto com `platformSignalExtractor`, `behavioralEngine`, `threatActorHeuristics`, `fetchAiProfile` e `isAiLoading`.
3. **Código morto removido:** `AiProfileCard`, `DossierTimeline`, `ExportModal`, `geminiProfiler`, `reportGenerator`, `platformTimelineData`; devDependency `autoprefixer`.
4. **`server.ts` dividido** (1067 → ~80 linhas) em `server/routes/{email,registry}.ts`. Rate limits preservados.
5. **Versão única:** `server/version.ts` lê o `package.json`.
6. **`HOST` padrão `127.0.0.1`** (antes `0.0.0.0`). O Dockerfile define `ENV HOST=0.0.0.0`.
7. **Página web mais leve:** views e modais pesados carregam sob demanda (JS inicial de 365 kB para 222 kB gzip).
8. **Colab v1.7.0:** checkout parcial só de `mineiro-tool/`, `npm ci`, build de produção e `node dist/server.cjs` (sem servidor de desenvolvimento).

## Validação feita
- `npm run check` completo verde (lint, 46 testes, validadores, demo, manual, colab, docs, build).
- `node dist/server.cjs` em produção: `/api/health`, `/api/registry/stats` (985 detectores) e `POST /api/osint/email-recon` OK; `POST /api/osint/profile` e `POST /api/osint/gemini-validate` retornam 404.
- Site da raiz: `tools/check.cjs` (links, console, rolagem horizontal) sem erros.
