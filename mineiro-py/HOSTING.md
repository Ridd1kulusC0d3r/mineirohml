# Hospedagem — Mineiro como site público

O usuário digita um username no site e recebe o resultado. Tudo roda em memória; nada é gravado em disco nem registrado em log.

## Rodar
```bash
pip install ".[web]"
mineiro serve --host 0.0.0.0 --port 8000
# ou com Docker:
docker build -t mineiro . && docker run -p 8000:8000 -e MINEIRO_TRUST_HOPS=1 mineiro
```
Render/Railway/Fly: use o `Dockerfile` (há `render.yaml`). Defina `MINEIRO_TRUST_HOPS=1` quando houver um proxy reverso à frente; senão todos os visitantes parecem o mesmo IP e dividem o limite.

## Variáveis de ambiente
| Variável | Padrão | Função |
|---|---|---|
| `MINEIRO_PUBLIC` | `1` | modo público: sem cache entre visitantes, preset `full` bloqueado |
| `MINEIRO_RATE_PER_HOUR` | `12` | buscas por cliente por hora |
| `MINEIRO_PER_IP_JOBS` | `1` | buscas simultâneas por cliente |
| `MINEIRO_MAX_JOBS` | `6` | buscas simultâneas no servidor |
| `MINEIRO_ALLOW_FULL` | `0` | libera o preset de 984 sites |
| `MINEIRO_JOB_TTL` | `900` | segundos que um resultado fica disponível |
| `MINEIRO_TRUST_HOPS` | `0` | nº de proxies confiáveis (lê `X-Forwarded-For`) |
| `MINEIRO_ACCESS_TOKEN` | vazio | se definido, exige o token (campo no site) |

## Segurança e uso responsável
- Entrada validada (2–64 caracteres: letras, números, `.`, `_`, `-`); o alvo nunca monta host de URL.
- Guarda SSRF: bloqueia IPs privados/loopback/metadados, só portas 80/443, redireções revalidadas.
- CSP estrita (sem script inline), resultados renderizados com `textContent`, relatórios baixados como anexo com `sandbox`.
- Cada resultado só é visível ao cliente que o criou; expira em `MINEIRO_JOB_TTL`.
- Uma ferramenta pública de varredura de username é de uso duplo (pode servir para perseguição). Mantenha o aviso de consentimento e os limites de taxa; se o público for restrito, use `MINEIRO_ACCESS_TOKEN`. Publique política de privacidade e canal para pedidos de remoção/abuso, e cumpra a LGPD.
- Os limites de taxa ficam na memória do processo: rode **uma instância** (ou limite no proxy/CDN para várias).
