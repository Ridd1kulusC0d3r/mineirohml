// Entrada do build: node build/index.mjs (ou npm run build)
import { buildAssets } from "./assets.mjs";
import { buildPages } from "./pages.mjs";

await buildAssets();
buildPages();
