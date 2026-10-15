# Mineiro Username Intelligence · Google Colab oficial

**OSINT Investigation Workbench**

O notebook canônico do Mineiro é:

**[`notebooks/Mineiro_Username_Intelligence_Colab.ipynb`](../notebooks/Mineiro_Username_Intelligence_Colab.ipynb)**

[▶ Abrir no Google Colab](https://colab.research.google.com/github/Ridd1kulusC0d3r/Mineiro-OSINT-Extractor/blob/main/notebooks/Mineiro_Username_Intelligence_Colab.ipynb)

## O que ele faz

Uma execução completa prepara:

```text
GitHub (checkout parcial de mineiro-tool/)
   ↓
Node.js 22+
   ↓
npm ci
   ↓
Registry validation
   ↓
build de produção
   ↓
Mineiro server :3000 (node dist/server.cjs)
   ↓
health check
   ↓
Colab proxy URL
   ↓
Mineiro UI
```

A VM do Colab é temporária. O notebook não transforma Colab em hospedagem permanente.

## Uso recomendado

1. abra o notebook;
2. escolha **Runtime → Run all**;
3. aguarde o card **Environment ready**;
4. abra o link em **Mineiro UI**;
5. comece com Quick ou Standard.

## Células

### 1 · Environment

Define:
- repositório;
- branch e subpasta (`mineiro-tool`);
- diretório;
- porta;
- arquivo de log.

Também mostra a versão do notebook.

### 2 · Bootstrap

- clona só a pasta da ferramenta (checkout parcial) ou atualiza a branch;
- garante Node.js 22+;
- instala dependências com `npm ci`;
- valida o Registry;
- gera o build de produção (`npm run build`).

### 3 · Start Mineiro

- encerra uma instância anterior da sessão;
- inicia `node dist/server.cjs` em modo produção (escuta em `127.0.0.1`, sem servidor de desenvolvimento);
- grava logs em `/content/mineiro-server.log`;
- espera `/api/health`;
- exibe a URL do proxy.

### 4 · Validation

Opcional. Executa demo sintética e smoke test analítico.

### 5 · Diagnostics

Mostra as últimas linhas do log do servidor.

### 6 · Stop

Encerra o processo da sessão.

## Atualizar uma sessão já aberta

Execute novamente as células **Bootstrap** e **Start Mineiro**: o clone é atualizado, o build é refeito e o servidor reinicia.

## Performance

Durante desenvolvimento:

- use Quick;
- use Standard para validar Evidence Engine;
- evite Full Scan repetido.

No Full, o Mineiro usa progressive scan: discovery rápido e validação profunda apenas de candidatos.

## Logs

```python
!tail -n 100 /content/mineiro-server.log
```

## Limites

Colab pode:
- encerrar a VM;
- trocar o hostname do proxy;
- limitar CPU/RAM/rede;
- perder processos quando a sessão desconecta.

Isso é esperado. Para uso persistente, rode localmente ou em infraestrutura própria.
