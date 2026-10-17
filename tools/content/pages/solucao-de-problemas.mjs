import { REQS, PRESETS, DIAL_INFO, PRINCIPIOS, QUERIES, REPO, COLAB, WHEEL } from "../guia.mjs";
import { O } from "../util.mjs";

export default {
  slug: "solucao-de-problemas", group: "referencia", nome: "Solução de problemas", lead: "Sintoma, causa provável e correção. Verifique o básico antes de abrir uma issue.",
  fontes: [["docs/TROUBLESHOOTING.md", "docs/TROUBLESHOOTING.md"], ["SUPPORT.md", "SUPPORT.md"]],
  blocks: [
    { t: "h2", x: "Diagnóstico rápido" },
    { t: "code", x: "python --version      # precisa ser 3.10 ou superior\nmineiro --version\nmineiro registry validate\npytest                # pelo código-fonte" },
    { t: "h2", x: "Problemas comuns" },
    { t: "table", head: ["Sintoma", "Causa provável", "Correção"], rows: [
      ["`mineiro: command not found`", "Pacote não instalado neste ambiente", "Ative o ambiente virtual e rode o `pip install` de novo"],
      ["Todos os resultados com `error` e *CERTIFICATE_VERIFY_FAILED*", "Rede com inspeção TLS (certificado próprio)", "Aponte `MINEIRO_CA_BUNDLE` (ou `SSL_CERT_FILE`) para o certificado da sua rede. Não desligue a verificação"],
      ["`error`: *Port not allowed* / *Non-public address*", "A guarda anti-SSRF recusou o alvo", "É esperado para `localhost`, IPs privados e portas fora de 80/443"],
      ["Muitos `UNCERTAIN`", "Proteção de borda ou rate limit", "Reduza o escopo e espere. Trate como lacuna, não como ausência"],
      ["Muitos timeouts", "Rede lenta ou concorrência alta", "Use Quick ou Standard"],
      ["`FOUND` parece falso", "Soft-404 ou regra fraca", "Confira a Evidence Matrix e a URL final"],
      ["`mineiro verify` acusa *MISMATCH*", "O arquivo foi alterado depois da exportação", "Exporte de novo. O SHA-256 prova integridade do conteúdo, não autoria"],
      ["Full demora", "Cobertura ampla", "Use Full só quando a cobertura realmente importa"],
    ] },
    { t: "h2", x: "Atualizar no Colab" },
    { t: "p", x: "Use *Runtime → Restart session* e rode a célula **1 · Instalar** de novo: o `pip` baixa a versão mais recente do repositório. Não há servidor nem porta, então não há erro de proxy." },
    { t: "h2", x: "Registry inválido" },
    { t: "p", x: "Rode `mineiro registry validate` e `mineiro registry stats`. Não corrija um detector só para o teste passar." },
    { t: "h2", x: "Ao abrir uma issue" },
    { t: "p", x: "Informe a versão do Mineiro, o sistema (ou Colab), a versão do Python, o preset, a mensagem de erro e os passos mínimos para reproduzir. **Não publique tokens, cookies, credenciais nem dados pessoais.**" },
  ],
};
