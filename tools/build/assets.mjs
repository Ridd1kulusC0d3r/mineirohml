import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as esbuild from "esbuild";
import * as F from "../figure/fig.mjs";
import * as C from "../content/guia.mjs";
import { TOOLS, OUT, KIT, read } from "./ctx.mjs";

const k = await import(KIT);

export async function buildAssets() {
  // ---------------------------------------------------------------- dados do motor
  const exp = (o) => Object.entries(o).map(([k2, v]) => `export const ${k2}=${JSON.stringify(v)};`).join("\n");
  mkdirSync(join(TOOLS, ".gen"), { recursive: true });
  writeFileSync(join(TOOLS, ".gen/data.mjs"), exp({
    P: F.P, W: F.W, H: F.H, STOPS: F.STOPS, FOCUS: F.FOCUS, SEL: F.SEL, SEL_ANGLES: F.SEL_ANGLES, CELL: F.CELL, CMP: F.CMP, gateLift: F.gateLift, DIALS: F.DIALS, PRESS: F.PRESS,
    CHAPTERS: C.CHAPTERS, REQS: C.REQS, PRESETS: C.PRESETS, DIAL_INFO: C.DIAL_INFO, PRINCIPIOS: C.PRINCIPIOS, CHEAT: C.CHEAT, QUERIES: C.QUERIES, INSTALL: C.INSTALL, SCENARIOS: C.SCENARIOS_ALL,
  }));
  writeFileSync(join(TOOLS, ".gen/engine.mjs"), `import { iso, lineOnTop, slabOf, solidSvg, translateAlong } from ${JSON.stringify(KIT)};
  import { initFlows } from "../figure/flows.mjs";
  import { P, W, H, STOPS, FOCUS, SEL, SEL_ANGLES, CELL, CMP, gateLift, DIALS, PRESS, CHAPTERS, REQS, PRESETS, DIAL_INFO, PRINCIPIOS, CHEAT, QUERIES, INSTALL, SCENARIOS } from "./data.mjs";
  ${read("figure/engine-body.js")}`);

  mkdirSync(join(OUT, "assets"), { recursive: true });
  const bundle = async (entry, out) => {
    await esbuild.build({ entryPoints: [entry], bundle: true, minify: true, format: "iife", target: "es2020", outfile: join(OUT, "assets", out), legalComments: "none", logLevel: "warning" });
  };
  await bundle(join(TOOLS, ".gen/engine.mjs"), "guia.js");
  await bundle(join(TOOLS, "src/docs.js"), "docs.js");
  const css = async (parts, out) => {
    const r = await esbuild.transform(parts.join("\n"), { loader: "css", minify: true });
    writeFileSync(join(OUT, "assets", out), r.code);
  };
  await css([read("src/base.css"), read("src/docs.css")], "docs.css");
  await css([read("src/base.css"), k.ISO_CSS, read("src/guia.src.css")], "guia.css");


}
