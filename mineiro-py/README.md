<div align="center">

<img src="../mineiro-tool/assets/mineiro-logo.png" alt="Mineiro" width="180">

# Mineiro · Python

**OSINT Investigation Workbench para presença pública de usernames, em Python.**
Evidência primeiro, correlação cautelosa, relatórios auditáveis. Sem servidor, sem build de JavaScript, sem IA.

<code>coleta → evidência → correlação → avaliação</code>

<p>
  <img alt="Python" src="https://img.shields.io/badge/python-3.10%2B-111111?style=flat-square">
  <img alt="Versão" src="https://img.shields.io/badge/mineiro-2.0.0a1-111111?style=flat-square">
  <img alt="Dependências" src="https://img.shields.io/badge/depend%C3%AAncias-httpx-111111?style=flat-square">
  <img alt="IA" src="https://img.shields.io/badge/IA-nenhuma-111111?style=flat-square">
</p>

<a href="https://colab.research.google.com/github/Ridd1kulusC0d3r/mineirohml/blob/main/mineiro-py/notebooks/Mineiro_Python_Colab.ipynb"><img alt="Open In Colab" src="https://colab.research.google.com/assets/colab-badge.svg"></a>

</div>

> English: a pure-Python port of the Mineiro investigative core (985 detectors, differential baseline, Evidence Engine,
> correlation graph, hypotheses/contradictions/gaps, STIX 2.1, cases and diff). Runs as a CLI, a Python API and inside a
> notebook (no web server, so it avoids the Colab proxy entirely).

## Por que Python

- **Colab sem proxy.** A interface é desenhada na própria saída do notebook. Não há porta, link `colab.dev` nem build, então não há tela branca nem erro 500.
- **Leve.** ~80 kB, uma dependência (`httpx`). Um scan Standard (49 sites, com Evidence Engine e baseline) leva ~6 s.
- **Auditável.** Todo relatório sai com um manifesto SHA-256; `mineiro verify` detecta qualquer alteração depois da exportação.

## Instalar

```bash
pip install "mineiro @ git+https://github.com/Ridd1kulusC0d3r/mineirohml.git#subdirectory=mineiro-py"
# para a interface em notebook fora do Colab: pip install "...[notebook]"
```

## Usar

### Linha de comando

```bash
mineiro scan forgejo                              # preset standard (49 sites)
mineiro scan forgejo --preset quick               # 19 sites, sem Evidence Engine
mineiro scan forgejo --preset full                # 984 sites: descoberta rápida e checagem profunda só nos candidatos
mineiro scan forgejo --lang pt --out relatorios/ --format html,markdown,json,csv,stix,cypher --variants --case
mineiro hunt relatorios/mineiro-forgejo.assessment.json "PATH from=TARGET to=PROFILE"
mineiro cases diff <id-do-caso>                   # NEW / DISAPPEARED / CHANGED / CONFIDENCE_UP / CONFIDENCE_DOWN
mineiro verify relatorios/mineiro-forgejo.html    # confere o SHA-256 do manifesto
mineiro registry stats | list | validate
mineiro doctor                                    # diagnostica Python, deps, DNS, TLS e faz consultas reais
mineiro variants forgejo
mineiro email alguem@exemplo.com
```

### API Python

```python
import asyncio
from mineiro import Scanner, build_assessment
from mineiro.export import write_report

async def main():
    async with Scanner(preset="standard") as scanner:
        results = await scanner.scan("forgejo")
    assessment = build_assessment(results, "forgejo", requirement="account_correlation", lang="pt")
    write_report(assessment, results, "relatorios", "html")

asyncio.run(main())
```

### Notebook / Colab

```python
from mineiro.ui import launch
launch()
```

Ou abra o [notebook oficial](notebooks/Mineiro_Python_Colab.ipynb) e use *Executar tudo*.

## Site público (hospedagem)

O usuário digita o username no site e recebe o resultado, sem instalar nada.

```bash
pip install ".[web]"
mineiro serve --host 0.0.0.0 --port 8000
```

Há `Dockerfile` e `render.yaml`. Limites de taxa, token de acesso, proxy reverso e notas de privacidade/LGPD estão em [`HOSTING.md`](HOSTING.md).

## O que vem do Mineiro original

| Área | Módulo |
|---|---|
| Registry de 985 detectores (984 escaneáveis), provenance e confiabilidade | `registry.py`, `data/registry.json` |
| Guarda anti-SSRF (IPs privados, metadata, redirecionamentos, DNS fixado) | `netguard.py`, `fetch.py` |
| Evidence Engine (8 checagens por resposta) | `evidence.py` |
| Baseline diferencial (compara com um handle que não existe) | `baseline.py` |
| Detectores declarativos com proveniência | `matchers.py`, `data/declarative.json` |
| Avaliação: julgamentos, hipóteses, contradições, lacunas, pivôs, ledger | `assessment.py`, `i18n.py` (en/pt/es) |
| Grafo de correlação, consultas MGQ e export Cypher | `graph.py` |
| Casos (SQLite) e Diff Intelligence | `cases.py` |
| Exportações HTML/JSON/Markdown/CSV/STIX 2.1/Cypher com manifesto SHA-256 | `export.py`, `stix.py` |
| Variantes de username (Jaro-Winkler) e pivôs | `variants.py`, `pivots.py` |

### Diferenças em relação à versão Node/React

- Não há interface web, mapas nem heatmaps: a interface é o notebook e os relatórios HTML.
- O JSON usa `snake_case` e `schema_version: 2` (o da versão Node usava `camelCase`).
- Consulta de MX de e-mail é opcional (`pip install dnspython`).
- Ainda não portados: Wayback Machine, hash perceptual de avatar, CNPJ (BrasilAPI) e o armazenamento Entity → Observation → Claim.
- Nenhuma integração de IA, por decisão de projeto.

## Princípios

1. **Observação não é identidade.** 2. **Inconclusivo continua inconclusivo.** 3. **A proveniência tem que sobreviver até o relatório.** 4. **Contradições merecem a mesma visibilidade que as provas a favor.** 5. **Coletar mais não é, automaticamente, investigar melhor.**

## Uso responsável

Use apenas informação publicamente acessível, com finalidade legítima e autorização para pesquisar o identificador. Respeite termos de uso, limites de taxa, privacidade e a lei (LGPD, GDPR). A ferramenta não contorna login, CAPTCHA nem controles de acesso e não atribui nota a pessoas.

## Desenvolvimento

```bash
pip install -e ".[dev,notebook]"
pytest            # 53 testes: núcleo, SSRF, motor contra um servidor local, exports, casos/diff e o notebook
```

Os testes não acessam a internet. `GuardedFetcher(allow_private=True)` existe só para testar contra um servidor local e não é exposto na CLI.

## Licença

MIT. O catálogo histórico tem entradas ainda em auditoria de proveniência: veja `LICENSES_AND_PROVENANCE.md` em `../mineiro-tool/` antes de reutilizar os dados fora deste projeto.
