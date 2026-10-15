import { REQS, PRESETS, DIAL_INFO, PRINCIPIOS, QUERIES, REPO, COLAB, WHEEL } from "../guia.mjs";
import { O } from "../util.mjs";

export default {
  slug: "detectores", group: "referencia", nome: "Detectores e Registry", lead: "Como o catálogo de 985 detectores é mantido, validado e estendido.",
  fontes: [["REGISTRY.md", "REGISTRY.md"], ["ARCHITECTURE.md", "ARCHITECTURE.md"], ["detector-health.md", "detector-health.md"]],
  blocks: [
    { t: "h2", x: "O que é o Registry" },
    { t: "p", x: "É o catálogo de plataformas. Na v1.7 são **985 detectores catalogados, 984 escaneáveis**. Cada um recebe categoria, tipo de site, confiabilidade do detector, nível de confiabilidade, status de proveniência, status de licença e checagens de evidência opcionais." },
    { t: "note", kind: "warn", x: "Parte do catálogo histórico está marcada `legacy-audit-required`: cobertura existe, auditoria independente ainda não. Trate esses resultados com mais cautela." },
    { t: "h2", x: "Detectores declarativos" },
    { t: "p", x: "Em `registry/detectors/*.json`, cada detector declara regras de presença e ausência, **handles-canário** (um que existe e um que não pode existir), data de verificação e fonte. Hoje o arquivo `core.json` traz 3 deles: Codeberg, DEV e Keybase." },
    { t: "code", x: "{ \"id\": \"codeberg\",\n  \"present\": [{ \"type\": \"status\", \"codes\": [200] }],\n  \"absent\":  [{ \"type\": \"status\", \"codes\": [404] }],\n  \"canary\": { \"present\": \"forgejo\", \"absent\": \"zqx9q8w7e6r5t4y3u2\" },\n  \"lastVerified\": \"2026-10-02\",\n  \"source\": \"own observation: ...\" }" },
    { t: "p", x: "Um workflow semanal de saúde (`detector-health`) roda os canários e abre uma issue quando um detector deriva." },
    { t: "h2", x: "Comandos de validação" },
    { t: "table", head: ["Comando", "Faz"], rows: [
      ["`npm run registry:validate`", "valida os 985 detectores"],
      ["`npm run registry:stats`", "estatísticas por categoria e confiabilidade"],
      ["`npm run detectors:validate`", "valida os declarativos"],
      ["`npm run detectors:health`", "roda os canários contra os sites reais"],
    ] },
    { t: "p", x: "Não ajuste um detector só para o teste passar. O validador existe para impedir catálogo quebrado em silêncio." },
    { t: "h2", x: "Adicionar um detector" },
    { t: "ol", items: ["O endpoint precisa ser público.", "Documente a fonte, a licença, a data de verificação e o mantenedor.", "Informe handles-canário.", "Inclua um teste. Importações grandes sem rastreio não entram."] },
    { t: "h2", x: "Registry-only" },
    { t: "p", x: "Alguns detectores ficam só no registro: servem à taxonomia e à documentação, mas não têm URL pública estável para scan direto." },
  ],
};
