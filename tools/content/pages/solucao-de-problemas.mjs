import { REQS, PRESETS, DIAL_INFO, PRINCIPIOS, QUERIES, REPO, COLAB, WHEEL } from "../guia.mjs";
import { O } from "../util.mjs";

export default {
  slug: "solucao-de-problemas", group: "referencia", nome: "Solução de problemas", lead: "Sintoma, causa provável e correção. Verifique o básico antes de abrir uma issue.",
  fontes: [["docs/TROUBLESHOOTING.md", "docs/TROUBLESHOOTING.md"], ["SUPPORT.md", "SUPPORT.md"]],
  blocks: [
    { t: "h2", x: "Diagnóstico rápido" },
    { t: "code", x: "node --version      # precisa ser 22 ou superior\nnpm run registry:validate\nnpm run lint\nmineiro --check     # instalação por pip" },
    { t: "p", x: "Também vale chamar `GET /api/health`: deve devolver a versão e status saudável." },
    { t: "h2", x: "Problemas comuns" },
    { t: "table", head: ["Sintoma", "Causa provável", "Correção"], rows: [
      ["`node: command not found`", "Node ausente", "Instale Node.js 22+"],
      ["Porta 3000 ocupada", "Servidor anterior ainda rodando", "Encerre o processo ou use `PORT=3001`"],
      ["Colab: página com *HTTP 500*", "Servidor escutando só em loopback (notebook antigo)", "Rode de novo as células Bootstrap e Start: o notebook atual usa `HOST=0.0.0.0` na VM do Colab"],
      ["Muitos `UNCERTAIN`", "Proteção de borda ou rate limit", "Reduza o escopo e espere. Trate como lacuna, não como ausência"],
      ["Muitos timeouts", "Rede lenta ou concorrência alta", "Use Quick ou Standard"],
      ["`FOUND` parece falso", "Soft-404 ou regra fraca", "Confira a Evidence Matrix e a URL final"],
      ["Build falha", "Dependência ou cache", "Apague `node_modules` e rode `npm ci`"],
      ["Notebook abre, UI não", "Servidor não está saudável", "Veja `/content/mineiro-server.log` e o health check"],
      ["Relatório sem SHA-256", "Web Crypto indisponível", "Use um navegador moderno em `localhost` ou HTTPS"],
      ["Full demora", "Cobertura ampla", "Use Full só quando a cobertura realmente importa"],
    ] },
    { t: "h2", x: "Atualizar no Colab" },
    { t: "p", x: "Rode de novo as células **Bootstrap** e **Start Mineiro**: o clone é atualizado, o build é refeito e o servidor reinicia. O log fica em `/content/mineiro-server.log`." },
    { t: "h2", x: "Registry inválido" },
    { t: "p", x: "Rode `npm run registry:validate` e `npm run registry:stats`. Não corrija um detector só para o teste passar." },
    { t: "h2", x: "Ao abrir uma issue" },
    { t: "p", x: "Informe a versão do Mineiro, o sistema (ou Colab), a versão do Node, o preset, a mensagem de erro e os passos mínimos para reproduzir. **Não publique tokens, cookies, credenciais nem dados pessoais.**" },
  ],
};
