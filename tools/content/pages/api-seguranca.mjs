import { REQS, PRESETS, DIAL_INFO, PRINCIPIOS, QUERIES, REPO, COLAB, WHEEL } from "../guia.mjs";
import { O } from "../util.mjs";

export default {
  slug: "api-seguranca", group: "referencia", nome: "API local e segurança", lead: "Endpoints, variáveis de ambiente e as proteções que impedem o servidor de virar um scanner aberto.",
  fontes: [["SECURITY.md", "SECURITY.md"], ["docs/DEPLOYMENT.md", "docs/DEPLOYMENT.md"], ["server.ts", "server.ts"]],
  blocks: [
    { t: "h2", x: "Endpoints" },
    { t: "table", head: ["Rota", "Para quê"], rows: [
      ["`GET /api/health`", "versão e status"],
      ["`POST /api/osint/verify`", "uma consulta de detector"],
      ["`POST /api/osint/variants`", "variantes de username (Jaro-Winkler)"],
      ["`POST /api/osint/pivots`", "extração de pivôs com limites"],
      ["`POST /api/osint/avatar-hash`", "dHash perceptual de avatar"],
      ["`POST /api/osint/wayback`", "linha do tempo do Wayback CDX"],
      ["`GET /api/osint/br/cnpj/:cnpj`", "consulta de CNPJ (dados da empresa)"],
      ["`POST /api/osint/email-recon`", "MX, Gravatar e heurísticas de provedor"],
      ["`GET /api/registry/stats` · `/detectors`", "metadados do Registry"],
      ["`POST /api/registry/benchmark`", "TP/TN/FP/FN, precisão e recall locais"],
      ["`POST /api/store/observations` · `/claims`", "grava no SQLite"],
      ["`GET /api/store/timeline` · `/export/stix`", "linha do tempo e STIX 2.1"],
    ] },
    { t: "h2", x: "Proteções do servidor" },
    { t: "ul", items: [
      "**URL só do detector.** O servidor nunca sonda uma URL inventada pelo cliente: ela precisa casar com o `urlPattern` do detector.",
      "**DNS protegido.** O IP resolvido precisa ser público no momento da conexão. Faixas privadas, loopback, link-local e de metadados de nuvem são bloqueadas, com proteção contra DNS rebinding.",
      "**Redirects revalidados** a cada salto.",
      "**Rate limit** por IP (token bucket), cabeçalhos de segurança e corpo limitado a 2 MB.",
      "**Limite por host:** 4 requisições simultâneas por padrão.",
    ] },
    { t: "h2", x: "Variáveis de ambiente" },
    { t: "table", head: ["Variável", "Efeito"], rows: [
      ["`PORT`", "porta (padrão 3000)"],
      ["`HOST`", "endereço de escuta. Na instalação por pip é 127.0.0.1"],
      ["`MINEIRO_DB`", "caminho do SQLite (padrão `data/mineiro.sqlite`)"],
      ["`MINEIRO_PUBLIC=1`", "modo de instância pública (veja abaixo)"],
      ["`MINEIRO_TRUST_PROXY=1`", "confia no proxy reverso para o IP do cliente"],
      ["`MINEIRO_HOST_CONCURRENCY`", "máximo de requisições por host (padrão 4)"],
      ["`MINEIRO_CACHE_TTL_MS`", "validade do cache de resultados (padrão 5 minutos)"],
      ["`HOST`", "endereço de escuta. Padrão `127.0.0.1`; a imagem Docker usa `0.0.0.0`"],
    ] },
    { t: "note", kind: "warn", x: "Por padrão o servidor escuta só em `127.0.0.1`. A imagem Docker define `HOST=0.0.0.0`. Fora de contêiner, só use `HOST=0.0.0.0` se quiser acesso pela rede." },
    { t: "h2", x: "Modo de instância pública" },
    { t: "p", x: "Com `MINEIRO_PUBLIC=1`, o servidor deixa de usar chaves guardadas nele, desativa persistência e o hash de avatar, e aplica limites mais baixos. Assim uma instância compartilhada não vira scanner aberto nem base de consultas." },
    { t: "h2", x: "Implantação" },
    { t: "p", x: "Para uso local, pip. Para servidor persistente, Docker (imagem Node 22, `npm ci`, usuário não root, healthcheck). Para URL pública, uma plataforma de contêiner gerenciada atrás de HTTPS. O Colab serve para demonstração, não para produção." },
  ],
};
