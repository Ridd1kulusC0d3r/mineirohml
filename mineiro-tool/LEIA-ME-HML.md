# Mineiro-OSINT-Extractor · cópia de homologação (hml)

- **Base:** [Mineiro-OSINT-Extractor](https://github.com/Ridd1kulusC0d3r/Mineiro-OSINT-Extractor) commit `96b49b6` (main), v1.7.0.
- **Escopo:** tudo da ferramenta fica em `mineiro-tool/`; o site da raiz do repositório não foi alterado.

## O que mudou em relação à base
1. **Código morto removido:** `AiProfileCard`, `DossierTimeline`, `ExportModal`, `geminiProfiler`, `reportGenerator`, `platformTimelineData`.
2. **Endpoint legado `POST /api/osint/profile` removido** (desligado por padrão desde a v1.4.1), junto com `platformSignalExtractor`, `behavioralEngine`, `threatActorHeuristics`, `fetchAiProfile` e o estado `isAiLoading` do `App.tsx`. O tipo `AiProfileReport` e as props `aiProfile` permanecem (segundo PR).
3. **`server.ts` dividido** (1067 → 82 linhas) em `server/routes/{copilot,email,registry}.ts`. Rate limits preservados.
4. **Versão única:** `server/version.ts` lê o `package.json`; `check-version.mjs` não verifica mais o `server.ts`.
5. **`HOST` padrão `127.0.0.1`** (antes `0.0.0.0`). O Dockerfile define `ENV HOST=0.0.0.0`.

## Validação feita
- Base: lint, 47 testes e `registry:validate` (985 detectores) verdes.
- Depois: `npm run check` completo verde (lint, 47 testes, validadores, demo, manual, colab, docs, build).
- `node dist/server.cjs` em produção: `/api/health` (1.7.0), `/api/intelligence/copilot/status`, `/api/registry/stats` (985), `POST /api/osint/email-recon` OK; `POST /api/osint/profile` retorna 404.
- `npx knip`: os arquivos não usados deixaram de ser listados.
