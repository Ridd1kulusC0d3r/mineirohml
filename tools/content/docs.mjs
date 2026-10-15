// Índice da documentação: grupos e ordem das páginas. Cada página vive em content/pages/<slug>.mjs.
import { O } from "./util.mjs";

export const GROUPS = [
  { id: "comecar", nome: "Começar" },
  { id: "usar", nome: "Usar" },
  { id: "entender", nome: "Entender" },
  { id: "referencia", nome: "Referência" },
];

const SLUGS = ["index", "instalacao", "primeiro-scan", "presets", "intelligence-view", "grafo", "exportacao-diff", "fluxo-do-analista", "como-decide", "fluxos", "uso-responsavel", "glossario", "detectores", "api-seguranca", "faq", "solucao-de-problemas"];

export const PAGES = await Promise.all(SLUGS.map(async (s) => (await import("./pages/" + s + ".mjs")).default));

export const ORIGINAL_LINK = O;
