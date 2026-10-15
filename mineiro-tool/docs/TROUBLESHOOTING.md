# Mineiro Username Intelligence · Troubleshooting

## Diagnóstico rápido

Antes de qualquer coisa:

```bash
node --version
npm --version
npm run registry:validate
npm run lint
```

## Problemas comuns

| Sintoma | Causa provável | Correção |
|---|---|---|
| `node: command not found` | Node ausente | instale Node.js 22+ |
| `npm: command not found` | npm/PATH | reinstale Node.js |
| porta 3000 ocupada | servidor antigo | encerre o processo anterior |
| Colab: host not allowed | clone antigo | rode `git pull` e reinicie |
| muitos `UNCERTAIN` | proteção/rate limit | reduza escopo e aguarde |
| muitos timeouts | rede ou concorrência alta | use Standard/Quick |
| `FOUND` parece falso | soft-404/regra fraca | confira Evidence Matrix e URL |
| build falha | dependência/cache | remova `node_modules` e reinstale |
| notebook abre, UI não | servidor não saudável | rode health check |
| relatório sem SHA-256 | Web Crypto indisponível | use navegador moderno |
| Full Scan demora | cobertura ampla | use Progressive Full apenas quando necessário |

## Colab: atualização limpa

Rode de novo as células **Bootstrap** e **Start Mineiro**: o clone é atualizado, o build é refeito e o servidor reinicia.

## Colab: página com HTTP 500

O proxy do Colab só alcança o servidor em `0.0.0.0`. O notebook atual já usa isso; se o erro aparecer, atualize com as células acima. Veja também `/content/mineiro-server.log`.
