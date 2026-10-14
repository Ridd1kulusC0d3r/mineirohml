// Conteúdo pt-BR do guia — fiel a README / USER-GUIDE / GETTING-STARTED / INTELLIGENCE-METHODOLOGY do repositório.
export const REPO = "https://github.com/Ridd1kulusC0d3r/Mineiro-OSINT-Extractor";
export const COLAB = "https://colab.research.google.com/github/Ridd1kulusC0d3r/Mineiro-OSINT-Extractor/blob/main/notebooks/Mineiro_Username_Intelligence_Colab.ipynb";
export const WHEEL = "https://github.com/Ridd1kulusC0d3r/Mineiro-OSINT-Extractor/releases/download/v1.7.0/mineiro_osint-1.7.0-py3-none-any.whl";

export const CHAPTERS = [
  {
    id: 0,
    nome: "Prólogo",
    titulo: "A pepita e o ouro de tolo",
    local: "Madrugada na serra",
    view: "all",
    cart: "start",
    story: [
      "Madrugada na serra. Seu Tião, garimpeiro de quarenta anos de peneira, te entrega uma pepita que brilha demais e resmunga: “Uai, filho… nem tudo que reluz é ouro.”",
      "A mina que você vai conhecer chama-se **Mineiro** (Mineiro Username Intelligence). Ela não garimpa pedra: garimpa a **presença pública** de um nome de usuário. E, como o Seu Tião, ela desconfia de brilho fácil.",
      "Seu caso de treino: a **Cafeteria Serra Azul** (fictícia) quer saber onde o handle `serraazul_cafe` aparece — e se alguém está se passando por ela.",
    ],
    steps: [
      { t: "O credo da mina", d: "Mineiro separa quatro coisas que ferramentas de username costumam misturar: **coleta → evidência → correlação → avaliação**. Um `FOUND` é uma observação. **Não é prova de identidade.**" },
      { t: "Regra de ouro", d: "Use só informação publicamente acessível, com finalidade legítima e autorizada, respeitando termos, limites de taxa, privacidade e a lei (LGPD/GDPR). O projeto não tem mecanismo para burlar login, CAPTCHA ou controles de acesso, e não dá nota para pessoas." },
      { t: "Combinado", d: "Tudo aqui é **simulação didática**: nenhuma plataforma é consultada e os resultados são sorteados só para você ver a máquina trabalhar." },
    ],
    lab: "prologo",
    cta: "Descer à mina",
    fluxo: ["Pepita (handle)", "Coleta", "Evidência", "Correlação", "Avaliação"],
  },
  {
    id: 1,
    nome: "Boca da mina",
    titulo: "Acenda a lanterna",
    local: "Galeria 1 · Instalação",
    view: "portal",
    cart: "portal",
    story: [
      "Seu Tião aponta a entrada: “Sem lanterna, ninguém entra.” Existem três caminhos até a boca da mina — escolha o que combina com você e faça **uma ação por vez**.",
    ],
    steps: [],
    lab: "install",
    quiz: {
      q: "Instalado pelo pip, qual comando abre a interface e em que endereço ela fica?",
      o: ["`mineiro` → http://127.0.0.1:3000", "`mineiro serve` → http://0.0.0.0:8080", "`npm start` → http://localhost:5000"],
      c: 0,
      why: "O pacote liga em 127.0.0.1 (só a sua máquina) na porta 3000 e guarda dados em ~/.mineiro. `mineiro --check` roda o diagnóstico.",
    },
    fluxo: ["Escolher caminho", "Instalar", "Subir a interface", "Verificar saúde", "Primeiro scan Quick"],
  },
  {
    id: 2,
    nome: "O funil",
    titulo: "Diga o que você procura",
    local: "Galeria 2 · Intelligence Requirement",
    view: "hopper",
    cart: "hopper",
    story: [
      "No funil, Seu Tião para a sua mão: “Quem não sabe o que procura acha de tudo e não acha nada.” Antes de coletar, você escolhe o **Intelligence Requirement**.",
      "O requisito decide **o que é relevante** na análise. Os fatos observados continuam sendo os mesmos.",
    ],
    steps: [
      { t: "Gire o seletor", d: "Escolha um dos seis requisitos. Cada um é uma pergunta diferente feita à mesma mina." },
      { t: "Primeiro scan de verdade", d: "Na interface: selecione **Username**, digite um identificador que você esteja autorizado a pesquisar, mantenha o preset **Quick**, inicie a coleta e **leia a aba Intelligence antes da tabela de evidências**." },
    ],
    lab: "requirement",
    quiz: {
      q: "O que o Intelligence Requirement escolhido muda?",
      o: ["Os fatos que foram observados", "A relevância e a prioridade dos achados na análise", "O número de detectores no registro"],
      c: 1,
      why: "Segundo a metodologia, o requisito altera relevância e prioridade — não o fato observado.",
    },
    fluxo: ["Escolher requisito", "Digitar identificador autorizado", "Preset Quick", "Iniciar coleta", "Ler Intelligence"],
  },
  {
    id: 3,
    nome: "A esteira",
    titulo: "Cinquenta gavetas, um varredor",
    local: "Galeria 3 · Coleta progressiva",
    view: "tray",
    cart: "tray",
    story: [
      "A pepita cai na esteira e chega a uma bandeja de gavetas — cada gaveta é um **detector** que olha uma superfície pública. Uma ponte varre coluna por coluna.",
      "Seu Tião ergue três dedos: “Quick, Standard e Full. E lembra: **mais tráfego não é mais inteligência**.”",
    ],
    steps: [
      { t: "Quick", d: "Top 20, sem Evidence Engine. Para checar se o ambiente funciona e fazer triagem inicial." },
      { t: "Standard", d: "Top 50, com Evidence Engine e baseline diferencial. É o preset de investigação normal." },
      { t: "Full", d: "Todo o registro escaneável (984 dos 985 detectores catalogados). Fase 1: descoberta rápida. Fase 2: checagens mais profundas **só** nos candidatos (found, uncertain ou rate-limited)." },
      { t: "Limites", d: "Endpoints protegidos ficam **inconclusivos**: o Mineiro não tenta vencer CAPTCHA nem controle de acesso. Evite repetir Full sem necessidade." },
    ],
    lab: "scan",
    quiz: {
      q: "No scan Full, o que a segunda fase faz?",
      o: ["Refaz todos os 984 detectores, do zero", "Faz checagens mais profundas só nos candidatos (found, uncertain, rate-limited)", "Descarta tudo que ficou incerto"],
      c: 1,
      why: "O Full roda em duas fases: descoberta rápida e depois verificação profunda apenas dos candidatos.",
    },
    fluxo: ["Escolher preset", "Fase 1: descoberta", "Candidatos?", "Fase 2: profunda", "Evidências"],
  },
  {
    id: 4,
    nome: "A peneira",
    titulo: "Separando o ouro de tolo",
    local: "Galeria 4 · Baseline diferencial",
    view: "comp",
    cart: "comp",
    story: [
      "“Ouro de tolo” é a pirita: brilha igualzinho. No mundo do username é a página que responde **200 OK** para qualquer nome, mesmo os que não existem (os soft-404).",
      "A peneira do Mineiro tem duas colunas. Numa entra a resposta do **alvo**; na outra, a de um **controle** — um handle que não pode existir. Se as duas se parecem, é ouro de tolo.",
    ],
    steps: [
      { t: "Sonda de controle", d: "Além do alvo, o Mineiro sonda um handle aleatório que não pode existir." },
      { t: "Comparação", d: "Se a página do alvo parece a do controle, a peneira **descarta** o resultado (soft-404). Se for diferente, ele passa adiante." },
      { t: "Rastro de auditoria", d: "Cada resultado carrega `evidenceHash` (SHA-256), `collectedAt` e `detectorVersion`." },
      { t: "Aviso honesto", d: "A animação é didática: o critério real de semelhança está no código (src/core), não nesta máquina de brinquedo." },
    ],
    lab: "sieve",
    quiz: {
      q: "Por que o Mineiro sonda também um handle que não pode existir?",
      o: ["Para ganhar velocidade na varredura", "Para descartar páginas “200 OK” iguais para qualquer nome (soft-404)", "Para gerar variantes de username"],
      c: 1,
      why: "É o baseline diferencial: alvo versus controle. Páginas indistinguíveis são descartadas.",
    },
    fluxo: ["Sondar alvo", "Sondar controle", "Comparar", "Parece igual? Descarta", "Diferente? Passa"],
  },
  {
    id: 5,
    nome: "A balança",
    titulo: "Cinco pesos, nenhuma nota única",
    local: "Galeria 5 · Evidence Engine e scores",
    view: "dials",
    cart: "dials",
    story: [
      "Na bancada de mostradores Seu Tião avisa: “Não existe **uma** nota. Existem cinco medidores respondendo cinco perguntas diferentes — e misturar é como pesar ouro na balança de açougue.”",
      "A torre de luzes mostra o veredito de cada consulta: **found**, **uncertain** ou **absent**. Clique num mostrador para ler a pergunta que ele responde.",
    ],
    steps: [
      { t: "1 · Executive Assessment", d: "Comece por Assessment Confidence, Coverage, High-value Findings e Analytical Gaps." },
      { t: "2 · Known / Assessed / Unknown", d: "Separa o que foi **observado** do que foi **interpretado**." },
      { t: "3 · Key Intelligence Judgments", d: "Cada julgamento traz confiança (HIGH, MODERATE ou LOW) e a sua *basis*." },
      { t: "4 · Evidence Matrix", d: "Compare detector, observação, correlação, qualidade da fonte e IPS — lado a lado, nunca somados." },
      { t: "5 · Contradictory Evidence", d: "**Leia antes de elevar qualquer hipótese.**" },
      { t: "6 · Intelligence Gaps", d: "Qual lacuna, se resolvida, mudaria a avaliação?" },
      { t: "7 · High-Value Pivots", d: "Execute primeiro os pivôs que corroboram por fonte independente, resolvem contradições ou fecham gaps." },
      { t: "Abra um finding", d: "Clique no **evidence ID**: URL, timestamp, status HTTP, latência, sinais de evidência, metadados públicos, por que importa e o pivô recomendado." },
    ],
    lab: "dials",
    quiz: {
      q: "O que o IPS (Intelligence Priority Score) mede?",
      o: ["A probabilidade de a conta ser da pessoa investigada", "O risco que a pessoa representa", "Quanto o achado merece revisão antes dos outros — não é risco da pessoa"],
      c: 2,
      why: "IPS prioriza achados, não pessoas: pondera qualidade da evidência, suporte de correlação, novidade e relevância para o requisito.",
    },
    fluxo: ["Executive Assessment", "Known/Assessed/Unknown", "Judgments", "Evidence Matrix", "Contradições", "Gaps", "Pivôs"],
  },
  {
    id: 6,
    nome: "O quadro",
    titulo: "Ligando os fios com disciplina",
    local: "Galeria 6 · Correlação e grafo",
    view: "board",
    cart: "board",
    story: [
      "No quadro de vínculos cada achado vira um pino e cada relação, um fio. Seu Tião aperta a sua mão: “Fio esticado demais arrebenta. **Mesmo nome em dois lugares não é a mesma pessoa.**”",
      "Aqui moram os usernames parecidos (candidatos), os pivôs e os domínios compartilhados. Teste as consultas do grafo e veja o quadro responder.",
    ],
    steps: [
      { t: "Variantes", d: "Usernames parecidos viram nós candidatos (similaridade Jaro-Winkler) e podem ser escaneados direto do grafo." },
      { t: "Pivôs", d: "A extração de pivôs tem limites de profundidade e de orçamento; os scans de pivô rodam em segundo plano e alimentam o mesmo grafo." },
      { t: "Consultas locais", d: "Leitura apenas: `MATCH candidate=true AND similarity>=70`, `SHARED type=DOMAIN`, `PATH from=TARGET to=PROFILE`. Exporte para Neo4j/Cypher se quiser." },
      { t: "Hipóteses com disciplina", d: "Mantenha hipótese principal, alternativa, evidências a favor, evidências contra e ressalvas." },
      { t: "Ordem dos pivôs", d: "1) corroboração independente · 2) evidência de alta qualidade · 3) resolver contradições · 4) fechar gaps · 5) só então expandir a coleta." },
    ],
    lab: "board",
    quiz: {
      q: "O mesmo username aparecendo em dois serviços prova que é a mesma pessoa?",
      o: ["Sim, se os dois forem FOUND", "Não — é uma observação; correlação exige evidência que a sustente", "Sim, quando a similaridade passa de 70"],
      c: 1,
      why: "“Observation is not identity.” O username repetido é um indício a ser corroborado, nunca uma conclusão.",
    },
    fluxo: ["Candidatos", "Consultas no grafo", "Hipótese + contrários", "Pivô de maior valor", "Reavaliar"],
  },
  {
    id: 7,
    nome: "A prensa",
    titulo: "Lacrar, comparar e saber parar",
    local: "Galeria 7 · Relatórios, Casos e Diff",
    view: "press",
    cart: "press",
    story: [
      "No fim da linha há uma prensa. Seu Tião põe a folha no cepo: “Trabalho bom a gente **lacra**. Quem abrir depois confere se mexeram.”",
      "Escolha os formatos, desça a prensa e veja o selo SHA-256 nascer. Depois, aprenda a comparar coletas no tempo — e a parar na hora certa.",
    ],
    steps: [
      { t: "Exportar", d: "Abra **Export**, escolha o conteúdo e o formato: HTML (leitura/impressão), JSON (integração), Markdown (notas de caso), CSV (evidência tabular) e STIX 2.1." },
      { t: "Manifest com SHA-256", d: "Cada exportação gera um manifest com o SHA-256 do payload (escopo `payload-before-manifest`). O hash prova **integridade** — não autoria nem identidade." },
      { t: "Casos e Diff", d: "Casos guardam snapshots imutáveis (IndexedDB do navegador). O Diff mostra NEW, DISAPPEARED, CHANGED, UNCHANGED, CONFIDENCE_UP e CONFIDENCE_DOWN. **DISAPPEARED é diferença entre coletas, não prova de conta apagada.**" },
      { t: "AI Analyst Copilot", d: "Resume evidências, ordena gaps, sugere pivôs e hipóteses alternativas. A saída vem marcada `AI_SYNTHESIZED` e não eleva sozinha a confiança factual." },
      { t: "Saiba parar", d: "Pare quando novos dados não alteram julgamentos, não resolvem contradições, não fecham gaps e não mudam a decisão analítica." },
    ],
    lab: "press",
    quiz: {
      q: "No Diff, o que significa um item DISAPPEARED?",
      o: ["A conta foi apagada pelo dono", "Ele estava numa coleta anterior e não está na atual — uma diferença, não uma prova de exclusão", "O detector foi removido do registro"],
      c: 1,
      why: "O próprio projeto avisa: DISAPPEARED é diferença entre coletas, não prova de que a conta foi excluída.",
    },
    fluxo: ["Exportar", "Manifest SHA-256", "Salvar como Caso", "Nova coleta + Diff", "Decidir: parar ou pivotar"],
  },
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
  "A IA resume e prioriza; não fabrica confiança factual.",
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
    id: "jornada",
    nome: "Jornada completa",
    desc: "Os nove passos do fluxo de investigação, na ordem em que a mina trabalha. A seta pontilhada é o laço: o plano de coleta alimenta a próxima rodada.",
    h: 430,
    n: [
      ["req", 30, 30, 250, 62, "1 · Intelligence Requirement", "box", 2],
      ["col", 355, 30, 250, 62, "2 · Coleta progressiva", "box", 3],
      ["evi", 680, 30, 250, 62, "3 · Evidência", "box", 4],
      ["cor", 680, 170, 250, 62, "4 · Correlação", "box", 6],
      ["hip", 355, 170, 250, 62, "5 · Hipóteses", "box", 6],
      ["con", 30, 170, 250, 62, "6 · Contradições", "box", 5],
      ["ava", 30, 310, 250, 62, "7 · Avaliação", "box", 5],
      ["piv", 355, 310, 250, 62, "8 · Pivôs", "box", 6],
      ["pla", 680, 310, 250, 62, "9 · Plano de coleta", "end", 7],
    ],
    e: [
      ["req", "col", "r", "l"], ["col", "evi", "r", "l"], ["evi", "cor", "b", "t"], ["cor", "hip", "l", "r"],
      ["hip", "con", "l", "r"], ["con", "ava", "b", "t"], ["ava", "piv", "r", "l"], ["piv", "pla", "r", "l"],
      ["pla", "col", "b", "t", "próxima rodada", "loop", [[805, 405], [8, 405], [8, 10], [480, 10]]],
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
  {
    id: "export",
    nome: "Exportar e comparar",
    desc: "Como um resultado vira relatório lacrado e como duas coletas viram um Diff.",
    h: 360,
    n: [
      ["a", 20, 30, 190, 60, "Achados\nvalidados", "box", 7],
      ["b", 260, 30, 190, 60, "Export\nHTML·JSON·MD·CSV·STIX", "box", 7],
      ["c", 500, 30, 200, 60, "Manifest\nSHA-256 do payload", "box", 7],
      ["d", 750, 30, 190, 60, "Relatório\nlacrado", "end", 7],
      ["e", 20, 200, 190, 60, "Salvar como\nCaso (snapshot)", "box", 7],
      ["f", 260, 200, 190, 60, "Nova coleta\nmais tarde", "box", 7],
      ["g", 500, 200, 200, 60, "Diff Intelligence\nNEW · CHANGED…", "box", 7],
      ["h", 750, 200, 190, 80, "DISAPPEARED ≠\nconta apagada", "dec", 7],
    ],
    e: [["a", "b", "r", "l"], ["b", "c", "r", "l"], ["c", "d", "r", "l"], ["a", "e", "b", "t"], ["e", "f", "r", "l"], ["f", "g", "r", "l"], ["g", "h", "r", "l"]],
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
