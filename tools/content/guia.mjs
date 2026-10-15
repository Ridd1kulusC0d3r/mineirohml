// Conteúdo pt-BR do guia — fiel a README / USER-GUIDE / GETTING-STARTED / INTELLIGENCE-METHODOLOGY do repositório.
export const REPO = "https://github.com/Ridd1kulusC0d3r/Mineiro-OSINT-Extractor";
export const COLAB = "https://colab.research.google.com/github/Ridd1kulusC0d3r/Mineiro-OSINT-Extractor/blob/main/notebooks/Mineiro_Username_Intelligence_Colab.ipynb";
export const WHEEL = "https://github.com/Ridd1kulusC0d3r/Mineiro-OSINT-Extractor/releases/download/v1.7.0/mineiro_osint-1.7.0-py3-none-any.whl";

export const CHAPTERS = [
  { id: 0, nome: "Regras", titulo: "Antes de abrir a ferramenta", view: "all", cart: "start", lab: "none",
    para: "Um scan sem pergunta e sem autorização só gera ruído e risco.",
    faca: ["Escreva a pergunta em uma frase (ex.: onde este handle aparece e há imitação?).", "Confirme que o alvo é público e que você tem autorização e finalidade legítima.", "Defina o critério de parada antes de começar."],
    decida: "Sem pergunta ou sem autorização, não rode o scan.",
    evite: "Tratar FOUND como identidade. Um FOUND é uma observação." },
  { id: 1, nome: "Instalar", titulo: "Instale e confirme que roda", view: "portal", cart: "portal", lab: "install",
    para: "Três caminhos. Escolha um.",
    faca: ["Rode os comandos do caminho escolhido.", "Confirme com `mineiro --check` ou `GET /api/health`."],
    decida: "Só usar: pip. Rodar testes ou contribuir: código-fonte. Sem instalar nada: Colab.",
    evite: "Instalar pelos três caminhos. Um basta." },
  { id: 2, nome: "Requisito", titulo: "Escolha o requisito", view: "hopper", cart: "hopper", lab: "requirement",
    para: "O requisito define o que é relevante na análise. Os fatos observados não mudam.",
    faca: ["Primeira passada: **Username presence**.", "Para ligar contas: **Public account correlation**."],
    decida: "Recomendação: mude o requisito só se a pergunta mudar.",
    evite: "Trocar de requisito para melhorar o resultado." },
  { id: 3, nome: "Coletar", titulo: "Colete com o menor preset que responde", view: "tray", cart: "tray", lab: "scan",
    para: "Quick e Standard resolvem a maioria dos casos.",
    faca: ["Comece no **Quick** (top 20, sem Evidence Engine): é triagem.", "Suba para **Standard** (top 50, com Evidence Engine e baseline) se a pergunta continuar aberta.", "Use **Full** só se faltar cobertura e houver motivo."],
    decida: "Recomendação: Full só depois de o Standard deixar lacunas que importam.",
    evite: "Repetir o Full. Mais tráfego não é mais inteligência." },
  { id: 4, nome: "Filtrar", titulo: "Deixe a peneira descartar o falso positivo", view: "comp", cart: "comp", lab: "sieve",
    para: "O baseline compara o alvo com um handle que não pode existir.",
    faca: ["Não há ação: o Standard e o Full já aplicam o baseline.", "Resultados descartados como soft-404 não entram como evidência."],
    decida: "Alvo e controle parecidos: descarte o achado.",
    evite: "Tratar uma página 200 OK como perfil existente." },
  { id: 5, nome: "Ler", titulo: "Leia 4 blocos, nesta ordem", view: "dials", cart: "dials", lab: "dials",
    para: "A Intelligence View tem sete seções. Quatro decidem o caso.",
    faca: ["**Executive Assessment**: cobertura e lacunas.", "**Contradictory Evidence**: antes de qualquer hipótese.", "**Intelligence Gaps**: o que mudaria a avaliação.", "**High-Value Pivots**: o próximo passo."],
    decida: "Recomendação: abra o evidence ID só dos achados que vão para o relatório. Pese OC e SQ por achado e use o IPS apenas para ordenar a fila.",
    evite: "Somar os cinco medidores numa nota única." },
  { id: 6, nome: "Ligar", titulo: "Ligue contas com disciplina", view: "board", cart: "board", lab: "board",
    para: "Mesmo username em dois lugares não prova a mesma pessoa.",
    faca: ["Trate variantes (similaridade Jaro-Winkler) como candidatos.", "Consulte o grafo: `MATCH candidate=true AND similarity>=70`.", "Mantenha hipótese principal, alternativa, evidências a favor e contra."],
    decida: "Recomendação: só correlacione com pelo menos duas evidências independentes.",
    evite: "Escalar pivôs sem corroboração independente." },
  { id: 7, nome: "Entregar", titulo: "Exporte, lacre e compare", view: "press", cart: "press", lab: "press",
    para: "O relatório precisa sobreviver à revisão.",
    faca: ["Exporte **JSON** (dados) e **HTML** (leitura).", "Guarde como Caso para comparar depois no Diff.", "Pare quando novos dados não mudam julgamentos nem fecham gaps."],
    decida: "Recomendação: STIX 2.1 só se alimentar uma plataforma de CTI. Markdown e CSV só se alguém for usar.",
    evite: "Ler DISAPPEARED como conta apagada. É diferença entre coletas." },
];

export const REQS = [
  { id: "presence", nome: "Username presence", d: "Onde o identificador aparece." },
  { id: "correlation", nome: "Public account correlation", d: "Quais achados sustentam relação entre si." },
  { id: "footprint", nome: "Digital footprint mapping", d: "Em quais tipos de serviço há presença pública." },
  { id: "developer", nome: "Developer footprint", d: "Presença técnica ou de desenvolvimento relevante." },
  { id: "threat", nome: "Threat research alias mapping", d: "Aparições de um alias em superfícies de pesquisa de ameaça." },
  { id: "brand", nome: "Brand impersonation monitoring", d: "Uso público do identificador em superfícies de marca ou redes sociais." },
];

export const PRESETS = {
  quick: { nome: "Quick", n: 20, cols: 4, evid: false, nota: "Top 20 · sem Evidence Engine" },
  standard: { nome: "Standard", n: 50, cols: 10, evid: true, nota: "Top 50 · Evidence Engine + baseline" },
  full: { nome: "Full", n: 984, cols: 10, evid: true, nota: "984 escaneáveis · 2 fases" },
};

export const DIAL_INFO = [
  { code: "DR", nome: "Detector Reliability", q: "A regra deste site costuma ser confiável?", d: "Qualidade da regra de detecção para aquele serviço. Não é o mesmo que a qualidade da fonte." },
  { code: "OC", nome: "Observation Confidence", q: "Esta consulta específica foi conclusiva?", d: "Qualidade daquela resposta em particular." },
  { code: "CC", nome: "Correlation Confidence", q: "Os achados sustentam uma relação entre contas?", d: "O quanto o achado ajuda a sustentar relações com outros." },
  { code: "SQ", nome: "Source Quality", q: "Quão forte é a fonte pública observada?", d: "Escala A–E. A: forte suporte e metadados autodeclarados ricos · B: evidência forte e estável de plataforma · C: utilizável, pede corroboração · D: fraca ou inconclusiva · E: estruturalmente fraca ou não verificada." },
  { code: "IPS", nome: "Intelligence Priority Score", q: "Vale revisar este achado antes dos outros?", d: "Prioridade de revisão do achado. **Não mede o risco da pessoa.**" },
];

export const SCENARIOS = {
  forte: { nome: "Achado forte", v: [0.85, 0.9, 0.7, 0.8, 0.85], lamp: "fnd", frase: "FOUND com boa evidência: ainda é uma observação — agora vale buscar corroboração independente." },
  duvida: { nome: "Resposta duvidosa", v: [0.6, 0.25, 0.2, 0.3, 0.3], lamp: "unc", frase: "UNCERTAIN: nada de elevar hipótese. Revalide, procure outra fonte ou deixe como lacuna (gap)." },
  conflito: { nome: "Evidência contraditória", v: [0.8, 0.7, 0.3, 0.6, 0.55], lamp: "fnd", frase: "A observação é boa, mas a correlação é fraca. Leia as evidências contraditórias antes de qualquer hipótese." },
};

export const QUERIES = [
  { id: "cand", q: "MATCH candidate=true AND similarity>=70", d: "Mostra só os nós candidatos (usernames parecidos) com similaridade a partir de 70." },
  { id: "dom", q: "SHARED type=DOMAIN", d: "Mostra o que compartilha um domínio: aqui, dois perfis ligados pelo mesmo domínio." },
  { id: "path", q: "PATH from=TARGET to=PROFILE", d: "Traça por onde o alvo se conecta a um perfil — neste quadro, passando pelo domínio compartilhado." },
];

export const PRINCIPIOS = [
  "Observação não é identidade.",
  "Inconclusivo continua inconclusivo.",
  "A proveniência tem que sobreviver até o relatório.",
  "Contradições merecem a mesma visibilidade que as provas a favor.",
  "Coletar mais não é, automaticamente, investigar melhor.",
];

export const CHEAT = [
  ["Instalar (pip)", "pip install "+WHEEL+"\nmineiro               # abre http://127.0.0.1:3000\nmineiro --check       # diagnóstico"],
  ["Instalar (fonte)", "git clone " + REPO + ".git\ncd Mineiro-OSINT-Extractor\nnpm ci --no-audit --no-fund\nnpm run dev           # http://localhost:3000"],
  ["Verificar", "GET /api/health   # versão e status saudável\nnpm test · npm run check · npm run detectors:health"],
  ["Grafo", "MATCH candidate=true AND similarity>=70\nSHARED type=DOMAIN\nPATH from=TARGET to=PROFILE"],
];

// ---------------- fluxos (coordenadas em 960 de largura)
// n: [id, x, y, w, h, texto, tipo, capítulo]  ·  e: [de, para, ladoDe, ladoPara, rótulo]
export const FLOWS = [
  {
    id: "analista",
    nome: "Fluxo do analista",
    desc: "O caminho mais curto do identificador à decisão. Se a pergunta não foi respondida, um pivô e uma nova coleta; se foi, exporte e pare.",
    h: 290,
    n: [
      ["p", 20, 30, 220, 60, "1 · Pergunta e autorização", "box", 0],
      ["q", 290, 30, 220, 60, "2 · Coleta Quick", "box", 3],
      ["l", 560, 30, 220, 60, "3 · Ler 4 blocos", "box", 5],
      ["d", 560, 150, 220, 110, "Respondeu a pergunta?", "dec", 5],
      ["v", 290, 175, 220, 60, "Pivô de maior valor", "box", 6],
      ["x", 830, 175, 110, 60, "Exportar e parar", "end", 7],
    ],
    e: [
      ["p", "q", "r", "l"], ["q", "l", "r", "l"], ["l", "d", "b", "t"],
      ["d", "x", "r", "l", "sim"], ["d", "v", "l", "r", "não"], ["v", "q", "t", "b", "recoleta", "loop"],
    ],
  },
  {
    id: "pipeline",
    nome: "Pipeline em 4 estágios",
    desc: "O que o Mineiro mantém separado: coleta, evidência, correlação e avaliação — e onde cada estágio mora na mina.",
    h: 330,
    n: [
      ["c1", 20, 40, 200, 80, "COLETA", "box", 3],
      ["c2", 270, 40, 200, 80, "EVIDÊNCIA", "box", 4],
      ["c3", 520, 40, 200, 80, "CORRELAÇÃO", "box", 6],
      ["c4", 770, 40, 170, 80, "AVALIAÇÃO", "box", 5],
      ["s1", 20, 190, 200, 110, "Esteira de 50 gavetas\nQuick · Standard · Full", "note", 3],
      ["s2", 270, 190, 200, 110, "Peneira + balança\nbaseline diferencial,\nsinais, SHA-256", "note", 4],
      ["s3", 520, 190, 200, 110, "Quadro de vínculos\nclusters, grafo,\nhipóteses", "note", 6],
      ["s4", 770, 190, 170, 110, "Mostradores\njulgamentos, gaps,\npivôs", "note", 5],
    ],
    e: [["c1", "c2", "r", "l"], ["c2", "c3", "r", "l"], ["c3", "c4", "r", "l"], ["c1", "s1", "b", "t"], ["c2", "s2", "b", "t"], ["c3", "s3", "b", "t"], ["c4", "s4", "b", "t"]],
  },
  {
    id: "preset",
    nome: "Qual preset usar?",
    desc: "Decisão rápida entre Quick, Standard e Full. Na dúvida, comece pequeno.",
    h: 450,
    n: [
      ["a", 330, 20, 300, 60, "Quero rodar um scan", "end", 3],
      ["q1", 330, 110, 300, 80, "Só testar o ambiente\nou fazer triagem inicial?", "dec", 3],
      ["quick", 20, 120, 220, 60, "QUICK · Top 20", "box", 3],
      ["q2", 330, 230, 300, 80, "Cobertura ampla\nrealmente importa?", "dec", 3],
      ["std", 20, 240, 220, 60, "STANDARD · Top 50", "box", 3],
      ["full", 700, 240, 240, 60, "FULL · fase 1 + fase 2", "box", 3],
      ["q3", 700, 350, 240, 80, "Rodar de novo\nmudou alguma coisa?", "dec", 7],
      ["stop", 400, 370, 240, 60, "Pare e exporte", "end", 7],
    ],
    e: [
      ["a", "q1", "b", "t"], ["q1", "quick", "l", "r", "sim"], ["q1", "q2", "b", "t", "não"],
      ["q2", "std", "l", "r", "não"], ["q2", "full", "r", "l", "sim"], ["full", "q3", "b", "t"], ["q3", "stop", "l", "r", "não"],
    ],
  },
  {
    id: "achado",
    nome: "Ler um achado e decidir",
    desc: "Do Executive Assessment ao critério de parada. Contradição vem antes de hipótese.",
    h: 470,
    n: [
      ["i", 330, 15, 300, 54, "Abrir Intelligence View", "end", 5],
      ["a", 330, 95, 300, 54, "Executive Assessment → Known / Assessed / Unknown", "box", 5],
      ["b", 330, 175, 300, 54, "Judgments + Evidence Matrix (5 medidores)", "box", 5],
      ["c", 330, 255, 300, 70, "Há evidência\ncontraditória?", "dec", 5],
      ["r", 30, 263, 230, 54, "Resolver primeiro", "box", 5],
      ["g", 330, 350, 300, 70, "Algum gap mudaria\na avaliação?", "dec", 6],
      ["p", 700, 358, 240, 54, "Pivô de maior valor", "box", 6],
      ["s", 330, 440, 300, 28, "Nada mudou? Pare e exporte", "end", 7],
    ],
    e: [["i", "a", "b", "t"], ["a", "b", "b", "t"], ["b", "c", "b", "t"], ["c", "r", "l", "r", "sim"], ["r", "g", "b", "l"], ["c", "g", "b", "t", "não"], ["g", "p", "r", "l", "sim"], ["g", "s", "b", "t", "não"], ["p", "b", "t", "r", "recoleta", "loop"]],
  },
];

export const INSTALL = {
  pip: { nome: "pip", para: "Caminho mais curto: um wheel do release, sem Node.", steps: [
    { t: "Crie um ambiente isolado", d: "Use um ambiente virtual do Python para não misturar dependências.", cmd: "python -m venv .venv\nsource .venv/bin/activate   # Windows: .venv\\Scripts\\activate" },
    { t: "Instale o pacote", d: "O README indica `pip install mineiro-osint`. Enquanto o pacote não estiver publicado no PyPI, instale pelo wheel do release v1.7.0.", cmd: "pip install " + WHEEL },
    { t: "Suba a interface", d: "Abre a interface só na sua máquina, em `http://127.0.0.1:3000`. Os dados ficam em `~/.mineiro`.", cmd: "mineiro" },
    { t: "Rode o diagnóstico", d: "Confirma que o ambiente está saudável antes de pesquisar qualquer coisa.", cmd: "mineiro --check" },
  ] },
  colab: { nome: "Colab", para: "Sem instalar nada: o notebook do projeto roda no navegador.", steps: [
    { t: "Abra o notebook", d: "O repositório traz um notebook de inteligência de username para o Google Colab.", link: COLAB },
    { t: "Execute as células na ordem", d: "Rode uma célula por vez, na ordem em que aparecem, e leia o que cada uma imprime." },
    { t: "Informe um alvo autorizado", d: "Use só um identificador que você tem autorização para pesquisar. Comece pelo preset pequeno." },
  ] },
  fonte: { nome: "Código-fonte", para: "Para quem quer rodar, testar ou contribuir. Pede Node 22 ou superior.", steps: [
    { t: "Clone o repositório", d: "Baixa o código do projeto.", cmd: "git clone " + REPO + ".git\ncd Mineiro-OSINT-Extractor" },
    { t: "Instale as dependências", d: "Com Node 22 ou superior. As flags evitam avisos de auditoria e anúncios de funding.", cmd: "npm ci --no-audit --no-fund" },
    { t: "Suba o modo de desenvolvimento", d: "A interface abre em `http://localhost:3000`.", cmd: "npm run dev" },
    { t: "Verifique a saúde", d: "O endpoint de saúde informa versão e status.", cmd: "curl http://localhost:3000/api/health" },
  ] },
};
export const SCENARIOS_ALL = { ...SCENARIOS, ausente: { nome: "Nada encontrado", v: [0.7, 0.3, 0.05, 0.1, 0.1], lamp: "abs", frase: "ABSENT: o detector não viu o identificador. Isso não prova que a pessoa não existe, só que esta consulta não achou." } };
