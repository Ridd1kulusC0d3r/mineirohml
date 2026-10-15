// Caminhos e instâncias compartilhadas pelo build.
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const TOOLS = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const OUT = resolve(TOOLS, "..");
// Diretório do kit isométrico "anatomy" (iso-kit.mjs, lathe.mjs). Ajuste com KIT_DIR=/caminho/do/kit
export const KIT_DIR = process.env.KIT_DIR || "/mnt/skills/plugins/anatomy/kit";
export const KIT = KIT_DIR + "/iso-kit.mjs";
export const SITE = "Mineiro hml";
export const read = (f) => readFileSync(join(TOOLS, f), "utf8");
