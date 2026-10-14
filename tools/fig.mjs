// Linha de Garimpo Mineiro — figura isométrica (kit anatomy)
import * as k from "/mnt/skills/plugins/anatomy/kit/iso-kit.mjs";
import * as G from "/mnt/skills/plugins/anatomy/kit/lathe.mjs";

export const W = 1200;
export const H = 600;

export const BENCH = { x: -335, y: -62, w: 680, d: 157, r: 10 };
const BT = 14;
const FT = 5;

export const P = k.fitProjection(
  [
    ...k.boxCorners(BENCH, -BT - FT, 0),
    [-258, 6, 82],
    [-292, 91, 62],
    [306, 0, 92],
    [222, -8, 98],
    [158, -8, 30],
  ],
  W,
  H,
  { pad: 26, azimuth: 62 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (items, pos = (item) => item) =>
  [...items].sort((a, b) => k.depthOf([pos(a)[0], pos(a)[1], 0], P) - k.depthOf([pos(b)[0], pos(b)[1], 0], P));

const box = (plan, z, h, tone = "mid", o = {}) =>
  S(k.slabOf(plan, z, h, P, o.steps ?? 3, o.bevel ?? 0.4), { tone, crease: o.crease, lit: o.lit, inner: o.inner });
const post = (x, y, r, z, h, tone = "mid", o = {}) =>
  S(k.cylinder(x, y, r, z, h, P, o.steps ?? 20, o.bevel ?? 0), { tone, crease: o.crease, lit: o.lit });
const dots = (points, z, size = 0.45, tone = "mid") => D(points.map(([x, y]) => at([x, y, z])), { size, tone });
const screws = (plan, inset, z, r = 1.8) => {
  const pts = k.corners(plan, inset);
  return L(pts.map(([x, y]) => k.ring(x, y, r, z, P, 14)).join(""), { tone: "lo" }) + dots(pts, z, 0.45);
};
const grooveOf = (plan, inset, z, tone = "faint") => L(k.planOutline(k.insetPlan(plan, inset), z, P), { tone });

// ---------------------------------------------------------------- posições
export const STOPS = { start: -318, portal: -296, hopper: -262, tray: -157, comp: -42, dials: 78, board: 218, press: 306 };
export const FOCUS = {
  all: [10, 10, 10],
  portal: [-292, 70, 22],
  hopper: [-258, 6, 38],
  tray: [-157, 2, 10],
  comp: [-46, 3, 36],
  dials: [88, -6, 12],
  board: [222, -8, 52],
  press: [306, 2, 40],
};

// ---------------------------------------------------------------- bancada e trilho
function bench() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BENCH, -BT - FT, BT, P)}"/>`];
  const feet = [-318, -110, 100, 328].flatMap((x) => [-48, 82].map((y) => [x, y]));
  for (const [x, y] of byDepth(feet)) {
    out.push(S(k.cylinder(x, y, 7, -BT - FT, 1.6, P, 14), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -BT - FT + 1.6, FT - 1.6, P, 14), { tone: "mid" }));
  }
  out.push(S(k.slabOf(BENCH, -BT, BT, P, 10, 1.6), { tone: "mid" }));
  out.push(grooveOf(BENCH, 6, 0));
  out.push(screws(BENCH, 11, 0, 2.4));
  const strip = { x: -322, y: -56, w: 656, d: 6, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.4], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3, 0.6]), at([strip.x + strip.w - 2, strip.y + 3, 0.6])], { size: 0.45 }));
  const label = { x: 296, y: 86, w: 40, d: 7, r: 1.5 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.4), 0.8, P), { tone: "faint" }));
  [[14, 3.5], [10, 3.5], [6, 3.5]].forEach(([len], i) => out.push(L(k.lineOnTop([label.x + 4, label.y + 1.8 + i * 1.6], [label.x + 4 + len, label.y + 1.8 + i * 1.6], 0.8, P), { tone: "lo", free: true })));
  return out.join("");
}

function track() {
  const out = [];
  for (let x = -330; x <= 340; x += 13) out.push(S(k.slabOf({ x, y: 58, w: 4, d: 27, r: 0.6 }, 0, 1.2, P, 2, 0.2), { tone: "lo", crease: "none" }));
  for (const y of [60, 80]) {
    out.push(S(k.slabOf({ x: -332, y, w: 672, d: 3, r: 0.8 }, 1.2, 2.4, P, 2, 0.3), { tone: "mid", crease: "none" }));
  }
  const bolts = [];
  for (let x = -324; x <= 332; x += 52) for (const y of [61.5, 81.5]) bolts.push([x, y]);
  out.push(dots(bolts, 3.6, 0.4, "hi"));
  return out.join("");
}

// ---------------------------------------------------------------- boca da mina (portal)
function portalBack() {
  return box({ x: -296, y: 50, w: 7, d: 7, r: 1 }, 0, 52, "mid", { steps: 2, bevel: 0.4 }) +
    dots([[-292.5, 53.5]], 52, 0.45, "mid");
}
function portalFront() {
  const out = [];
  out.push(box({ x: -296, y: 90, w: 7, d: 7, r: 1 }, 0, 52, "mid", { steps: 2, bevel: 0.4 }));
  out.push(box({ x: -297, y: 48, w: 9, d: 50, r: 1.5 }, 52, 8, "mid", { steps: 3, bevel: 0.7 }));
  out.push(grooveOf({ x: -297, y: 48, w: 9, d: 50, r: 1.5 }, 1.5, 60));
  out.push(dots([[-292.5, 53], [-292.5, 71.5], [-292.5, 92]], 60, 0.45));
  // lanterna pendurada
  out.push(L(k.rise([-292.5, 71.5], 47, 52, P), { tone: "mid" }));
  out.push(`<g data-part="lantern">` + S(k.cylinder(-292.5, 71.5, 3, 41, 6, P, 16, 0.3), { tone: "hi", lit: false }) + `</g>`);
  out.push(post(-292.5, 71.5, 3.8, 40, 1, "lo", { steps: 16 }));
  return out.join("");
}

// ---------------------------------------------------------------- 1 · funil + seletor de requisito
const HX = -258;
const HY = 6;
const HF = G.frameAlong([HX, HY, 16], [0, 0, 1]);
export const SEL = { x: -267, y: 33, z: 14, r: 5 };
export const SEL_ANGLES = [-100, -60, -20, 20, 60, 100];
export const selPointer = (deg) => {
  const a = (deg * Math.PI) / 180;
  return k.lineOnTop([SEL.x, SEL.y], [SEL.x + Math.sin(a) * 4.6, SEL.y - Math.cos(a) * 4.6], SEL.z + 4.1, P);
};
function hopper() {
  const out = [];
  const ped = { x: -286, y: -30, w: 56, d: 72, r: 4 };
  out.push(`<path class="iso-halo" d="${k.haloOf(ped, 0, 6, P)}"/>`);
  out.push(box(ped, 0, 6, "mid", { steps: 4, bevel: 0.8 }));
  out.push(grooveOf(ped, 3, 6));
  out.push(screws(ped, 6, 6, 1.6));
  // esteira
  out.push(box({ x: -262, y: -2, w: 40, d: 16, r: 1 }, 6, 3, "lo", { steps: 2, bevel: 0.3 }));
  out.push(box({ x: -262, y: -3.5, w: 40, d: 1.5, r: 0.4 }, 6, 4.4, "mid", { steps: 2, bevel: 0 }));
  out.push(box({ x: -262, y: 14, w: 40, d: 1.5, r: 0.4 }, 6, 4.4, "mid", { steps: 2, bevel: 0 }));
  out.push(L(k.lineOnTop([-261, 6], [-223, 6], 9.1, P), { tone: "mid", dashed: true, flow: true, free: true }));
  // pernas e colar
  for (const [x, y] of byDepth([[-274, -16], [-242, -16], [-274, 28], [-242, 28]])) out.push(post(x, y, 3, 6, 24, "mid"));
  out.push(box({ x: -278, y: -20, w: 40, d: 52, r: 3 }, 30, 3, "mid", { steps: 4, bevel: 0.6 }));
  out.push(dots([[-274, -16], [-242, -16], [-274, 28], [-242, 28]], 33, 0.45));
  // funil
  out.push(S(G.solidOf([[0, 5], [24, 5], [56, 24], [60, 24]], HF, P), { tone: "hi", crease: "lo" }));
  out.push(L(G.arcOf(HF, 24, 5, P, { slope: 0 }), { tone: "faint" }));
  out.push(S(G.ringBand(60, 62.4, 21.6, 25.4, HF, P), { tone: "mid" }));
  out.push(`<path class="mouth" d="${k.ring(HX, HY, 21.6, 78.5, P, 40)}"/>`);
  out.push(L(k.ring(HX, HY, 24.4, 78.4, P, 40), { tone: "lo" }));
  return out.join("");
}
function selector() {
  const out = [];
  const con = { x: -284, y: 26, w: 36, d: 14, r: 2.5 };
  out.push(box(con, 6, 8, "mid", { steps: 4, bevel: 0.6 }));
  out.push(grooveOf(con, 1.6, 14));
  out.push(S(k.cylinder(SEL.x, SEL.y, SEL.r, SEL.z, 4, P, 20), { tone: "hi" }));
  out.push(L(k.knurl(SEL.x, SEL.y, SEL.r, SEL.z, SEL.z + 4, 20, P), { tone: "lo" }));
  const spots = SEL_ANGLES.map((deg) => {
    const a = (deg * Math.PI) / 180;
    return [SEL.x + Math.sin(a) * 8.4, SEL.y - Math.cos(a) * 8.4];
  });
  out.push(dots(spots, 14, 0.55, "hi"));
  out.push(`<path data-part="selptr" class="iso-line" data-tone="lit" d="${selPointer(SEL_ANGLES[0])}" style="stroke-width:1.1"/>`);
  out.push(`<g data-part="led">` + S(k.cylinder(-252.5, 33, 2.3, 14, 1.8, P, 16), { tone: "lo" }) + `</g>`);
  return out.join("");
}

// ---------------------------------------------------------------- 2 · esteira de coleta (bandeja de 50 detectores)
export const CELL = { x0: -211, dx: 11.7, y0: -24, dy: 11.5, cols: 10, rows: 5, z: 8 };
export const cellPos = (i) => [CELL.x0 + Math.floor(i / CELL.rows) * CELL.dx, CELL.y0 + (i % CELL.rows) * CELL.dy];
const TRAY = { x: -222, y: -44, w: 130, d: 92, r: 5 };
function trayBase() {
  const out = [`<path class="iso-halo" d="${k.haloOf(TRAY, 0, 8, P)}"/>`];
  out.push(box(TRAY, 0, 8, "mid", { steps: 5, bevel: 1.2 }));
  out.push(grooveOf(TRAY, 3.5, 8));
  out.push(screws(TRAY, 6.5, 8, 1.8));
  out.push(box({ x: -221, y: -42.5, w: 128, d: 3, r: 0.8 }, 8, 2.5, "mid", { steps: 2, bevel: 0.3, crease: "none" }));
  return out.join("");
}
function trayFrontRail() {
  return box({ x: -221, y: 43.5, w: 128, d: 3, r: 0.8 }, 8, 2.5, "mid", { steps: 2, bevel: 0.3, crease: "none" });
}
function cells() {
  const out = [];
  const order = [];
  for (let i = 0; i < CELL.cols * CELL.rows; i++) order.push(i);
  for (const i of byDepth(order, (n) => cellPos(n))) {
    const [x, y] = cellPos(i);
    out.push(
      `<g class="cell" data-cell="${i}" data-s="n">` +
        L(k.ring(x, y, 5, CELL.z, P, 12), { tone: "lo" }) +
        S(k.cylinder(x, y, 3.7, CELL.z, 1.6, P, 10, 0.2), { tone: "lo", crease: "none" }) +
        `</g>`,
    );
  }
  return out.join("");
}
export const BR = { z: 10.5, topZ: 27.5, beamH: 4 };
const bridgeBackSvg = () =>
  box({ x: -6, y: -43, w: 12, d: 4, r: 1 }, BR.z, 3, "mid", { steps: 2, bevel: 0.3 }) +
  box({ x: -3, y: -42.2, w: 6, d: 2.8, r: 0.5 }, BR.z + 3, BR.topZ - BR.z - 3, "mid", { steps: 2, bevel: 0.2 });
function bridgeFrontSvg() {
  const out = [];
  out.push(box({ x: -6, y: 42.5, w: 12, d: 4, r: 1 }, BR.z, 3, "mid", { steps: 2, bevel: 0.3 }));
  out.push(box({ x: -3, y: 43.2, w: 6, d: 2.8, r: 0.5 }, BR.z + 3, BR.topZ - BR.z - 3, "mid", { steps: 2, bevel: 0.2 }));
  for (let r = 0; r < CELL.rows; r++) {
    const y = CELL.y0 + r * CELL.dy;
    out.push(S(k.cylinder(0, y, 1.3, 13, BR.topZ - 13, P, 12), { tone: "mid", crease: "none" }));
    out.push(S(k.cylinder(0, y, 1.8, 11.4, 1.6, P, 12), { tone: "hi", lit: true, crease: "none" }));
  }
  out.push(box({ x: -3, y: -43, w: 6, d: 90, r: 1.5 }, BR.topZ, BR.beamH, "hi", { steps: 3, bevel: 0.5 }));
  out.push(L(k.lineOnTop([-3, -39], [3, -39], BR.topZ + BR.beamH, P), { tone: "faint" }));
  out.push(S(k.cylinder(0, 0, 2.6, BR.topZ + BR.beamH, 2.6, P, 16), { tone: "mid" }));
  out.push(D([at([0, 0, BR.topZ + BR.beamH + 2.6])], { size: 0.5, tone: "hi" }));
  return out.join("");
}

// ---------------------------------------------------------------- 3 · peneira diferencial (comparador)
export const CMP = { zBase: 10, barA: { x: -62, y: -6, w: 12, d: 12, r: 1.5 }, barB: { x: -34, y: -6, w: 12, d: 12, r: 1.5 }, minH: 4, maxH: 54 };
export const barSvg = (plan, h) => S(k.slabOf(plan, CMP.zBase + 0.1, Math.max(h, 0.6), P, 3, 0.5), { tone: "hi", crease: "lo" });
const GATE = { x: -12.5, y: -12, w: 3, d: 26, r: 0.8, z: 12, h: 36 };
const GATE_LIFT = 32;
export const gateLift = GATE_LIFT;
function comparator() {
  const out = [];
  const base = { x: -80, y: -30, w: 70, d: 66, r: 3 };
  out.push(`<path class="iso-halo" d="${k.haloOf(base, 0, 10, P)}"/>`);
  out.push(box(base, 0, 10, "mid", { steps: 4, bevel: 0.8 }));
  out.push(grooveOf(base, 3, 10));
  out.push(screws(base, 6, 10, 1.6));
  out.push(L(k.planOutline(k.insetPlan(CMP.barA, -1.6), CMP.zBase, P, 3) + k.planOutline(k.insetPlan(CMP.barB, -1.6), CMP.zBase, P, 3), { tone: "lo" }));
  // placa traseira + lâmpada
  out.push(box({ x: -76, y: -26, w: 62, d: 4, r: 1 }, 10, 66, "mid", { steps: 3, bevel: 0.6 }));
  // marcas de nível na face da placa
  const faceY = -22;
  const marks = [];
  for (let z = 20; z <= 70; z += 5) marks.push(k.segment([-76, faceY, z], [z % 10 === 0 ? -70 : -72.5, faceY, z], P));
  out.push(L(marks.join(""), { tone: "lo", free: "end" }));
  out.push(L(k.segment([-76, faceY, 14], [-76, faceY, 74], P), { tone: "mid" }));
  out.push(box({ x: -47, y: -27, w: 10, d: 6, r: 1.5 }, 76, 3, "mid", { steps: 3, bevel: 0.4 }));
  out.push(`<g data-lamp="cmp" data-s="n">` + S(k.cylinder(-42, -24, 3.4, 79, 5, P, 20, 0.3), { tone: "lo" }) + `</g>`);
  return out.join("");
}
function comparatorBars() {
  return `<g data-bar="a">${barSvg(CMP.barA, 20)}</g><g data-bar="b">${barSvg(CMP.barB, 20)}</g>`;
}
function gatePillars() {
  const out = [];
  out.push(box({ x: -14, y: -19, w: 6, d: 6, r: 1 }, 10, 40, "mid", { steps: 2, bevel: 0.4 }));
  return out.join("");
}
function gateFront() {
  const out = [];
  out.push(box({ x: -14, y: 18, w: 6, d: 6, r: 1 }, 10, 40, "mid", { steps: 2, bevel: 0.4 }));
  out.push(box({ x: -14, y: -19, w: 6, d: 43, r: 1.2 }, 50, 5, "hi", { steps: 3, bevel: 0.6 }));
  out.push(dots([[-11, -16], [-11, 21]], 55, 0.45));
  return out.join("");
}
function gateGroup() {
  const g = (z) => [[-14, -19, z], [-8, -19, z], [-8, 24, z], [-14, 24, z]];
  const hull = G.hullOf([...g(10), ...g(50)].map((p) => at(p)));
  const clip = `<clipPath id="gateclip"><path d="${hull.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("")}Z"/></clipPath>`;
  const gate = S(k.slabOf(GATE, GATE.z, GATE.h, P, 2, 0.4), { tone: "hi", crease: "lo" }) +
    L(k.segment([GATE.x + 1.5, GATE.y + 4, GATE.z + 4], [GATE.x + 1.5, GATE.y + GATE.d - 4, GATE.z + 4], P), { tone: "faint", free: true });
  return clip + `<g clip-path="url(#gateclip)"><g data-part="gate">${gate}</g></g>`;
}

// ---------------------------------------------------------------- 4 · console de mostradores + torre de lâmpadas
export const DIALS = { x0: 24, dx: 26, y: -6, r: 10, z: 16, h: 6, codes: ["DR", "OC", "CC", "SQ", "IPS"] };
export const dialAt = (i) => [DIALS.x0 + i * DIALS.dx, DIALS.y];
const DIAL_TOP = DIALS.z + DIALS.h;
const SWEEP = 270;
export const needleOf = (i, value) => {
  const [x, y] = dialAt(i);
  const a = ((-SWEEP / 2 + SWEEP * Math.min(1, Math.max(0, value))) * Math.PI) / 180;
  return k.lineOnTop([x - Math.sin(a) * 3, y + Math.cos(a) * 3], [x + Math.sin(a) * (DIALS.r - 3.4), y - Math.cos(a) * (DIALS.r - 3.4)], DIAL_TOP + 0.2, P);
};
function dialsConsole() {
  const out = [];
  const con = { x: 8, y: -28, w: 138, d: 46, r: 6 };
  out.push(`<path class="iso-halo" d="${k.haloOf(con, 0, 16, P)}"/>`);
  out.push(box(con, 0, 16, "mid", { steps: 6, bevel: 1 }));
  out.push(grooveOf(con, 3.5, 16));
  out.push(screws(con, 7, 16, 1.7));
  for (let i = 0; i < 5; i++) {
    const [x, y] = dialAt(i);
    out.push(S(k.cylinder(x, y, DIALS.r, DIALS.z, DIALS.h, P, 28, 0.6), { tone: "hi", crease: "lo" }));
    out.push(L(k.knurl(x, y, DIALS.r, DIAL_TOP - 2.6, DIAL_TOP, 36, P, 0.3), { tone: "lo" }));
    out.push(L(k.sideArc(x, y, DIALS.r, DIAL_TOP - 2.6, P, 20), { tone: "faint" }));
    out.push(L(k.ring(x, y, DIALS.r - 1.8, DIAL_TOP, P, 28), { tone: "lo" }));
    const t = k.radialTicks(x, y, DIALS.r - 2.4, 20, 5, DIAL_TOP, [1, 2.1], P, (-SWEEP / 2) * (Math.PI / 180), SWEEP * (Math.PI / 180));
    out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
    out.push(`<path data-needle="${i}" class="iso-line" data-tone="lit" data-free="start" d="${needleOf(i, 0.5)}" style="stroke-width:1"/>`);
    out.push(L(k.ring(x, y, 1.2, DIAL_TOP, P, 12), { tone: "mid" }));
    // botão de zero + código gravado
    out.push(S(k.cylinder(x, y + 14, 2.6, 16, 3, P, 16), { tone: "mid" }));
    out.push(L(k.knurl(x, y + 14, 2.6, 16, 19, 14, P), { tone: "lo" }));
    out.push(k.faceTextSvg(k.topMatrix([x, y + 8.4], 16, P, "x"), DIALS.codes[i], { size: 2.8, tone: "lo", anchor: "middle" }));
  }
  return out.join("");
}
function tower() {
  const out = [];
  const [x, y] = [158, -8];
  out.push(S(k.cylinder(x, y, 7, 0, 4, P, 24, 0.4), { tone: "lo" }));
  out.push(S(k.cylinder(x, y, 2, 4, 6, P, 14), { tone: "mid", crease: "none" }));
  [["abs", 10], ["unc", 17], ["fnd", 24]].forEach(([name, z]) => {
    out.push(`<g data-lamp="${name}" data-s="n">` + S(k.cylinder(x, y, 5, z, 6, P, 16, 0.3), { tone: "lo" }) + `</g>`);
    out.push(S(k.cylinder(x, y, 5.6, z + 6, 1, P, 16), { tone: "mid", crease: "none" }));
  });
  out.push(S(k.cylinder(x, y, 3.2, 31, 2.4, P, 16), { tone: "mid" }));
  return out.join("");
}

// ---------------------------------------------------------------- 5 · quadro de vínculos
export const BOARD = { x: 182, y: -10, w: 80, d: 5, r: 1, z: 14, h: 80 };
export const FACE_Y = BOARD.y + BOARD.d;
export const NODES = {
  T: { x: 222, z: 56, r: 6.5, kind: "t" },
  A: { x: 200, z: 76, r: 4.6, kind: "p" },
  B: { x: 246, z: 78, r: 4.6, kind: "p" },
  C: { x: 250, z: 40, r: 4.6, kind: "p" },
  D: { x: 198, z: 38, r: 4.6, kind: "p" },
  M: { x: 224, z: 83, r: 3.8, kind: "d" },
  E: { x: 205, z: 24, r: 3.8, kind: "c" },
  F: { x: 238, z: 24, r: 3.8, kind: "c" },
};
export const EDGES = [
  ["T", "A", "s"], ["T", "B", "s"], ["T", "C", "s"], ["T", "D", "s"],
  ["A", "M", "s"], ["B", "M", "s"], ["T", "E", "c"], ["T", "F", "c"],
];
const edgePath = (a, b) => {
  const A = NODES[a];
  const B = NODES[b];
  const dx = B.x - A.x;
  const dz = B.z - A.z;
  const len = Math.hypot(dx, dz);
  const ux = dx / len;
  const uz = dz / len;
  return k.segment([A.x + ux * A.r, FACE_Y, A.z + uz * A.r], [B.x - ux * B.r, FACE_Y, B.z - uz * B.r], P);
};
function board() {
  const out = [];
  const plat = { x: 176, y: -34, w: 92, d: 50, r: 5 };
  out.push(`<path class="iso-halo" d="${k.haloOf(plat, 0, 5, P)}"/>`);
  out.push(box(plat, 0, 5, "mid", { steps: 4, bevel: 0.8 }));
  out.push(grooveOf(plat, 3, 5));
  out.push(screws(plat, 6, 5, 1.6));
  // pés / suporte
  out.push(box({ x: 192, y: -12, w: 8, d: 10, r: 1 }, 5, 9, "mid", { steps: 2, bevel: 0.4 }));
  out.push(box({ x: 244, y: -12, w: 8, d: 10, r: 1 }, 5, 9, "mid", { steps: 2, bevel: 0.4 }));
  out.push(box({ x: 218, y: -26, w: 8, d: 12, r: 1 }, 5, 40, "lo", { steps: 2, bevel: 0.3 }));
  // placa do quadro
  out.push(box(BOARD, BOARD.z, BOARD.h, "mid", { steps: 3, bevel: 0.8 }));
  const m = 4;
  const fx0 = BOARD.x + m;
  const fx1 = BOARD.x + BOARD.w - m;
  const fz0 = BOARD.z + m;
  const fz1 = BOARD.z + BOARD.h - m;
  out.push(L([[fx0, fz0, fx1, fz0], [fx1, fz0, fx1, fz1], [fx1, fz1, fx0, fz1], [fx0, fz1, fx0, fz0]].map(([ax, az, bx, bz]) => k.segment([ax, FACE_Y, az], [bx, FACE_Y, bz], P)).join(""), { tone: "faint" }));
  const grid = [];
  for (let x = fx0 + 6; x < fx1; x += 12) for (let z = fz0 + 6; z < fz1; z += 12) grid.push(at([x, FACE_Y, z]));
  out.push(D(grid, { size: 0.4, tone: "lo" }));
  // arestas e nós
  out.push(`<g class="edges">` + EDGES.map(([a, b, kind]) => L(edgePath(a, b), { tone: "mid", dashed: kind === "c", className: `edge e-${a}${b}` })).join("") + `</g>`);
  for (const [id, n] of Object.entries(NODES)) {
    out.push(`<g class="node" data-node="${id}" data-kind="${n.kind}">` + `<path class="nodefill" d="${k.sideRing([n.x, FACE_Y, n.z], n.r, "y", P, 28)}"/>` + `<path class="iso-line nodering" data-tone="hi" d="${k.sideRing([n.x, FACE_Y, n.z], n.r, "y", P, 28)}"/>` + D([at([n.x, FACE_Y, n.z])], { size: n.kind === "t" ? 0.9 : 0.6, tone: "hi" }) + `</g>`);
  }
  return out.join("");
}

// ---------------------------------------------------------------- 6 · prensa e cofre
export const PRESS = { x: 306, y: -1, travel: 25, stampZ: 40 };
export const crateAt = (i) => ({ x: 280 + i * 11.2, y: 36, w: 9, d: 10, r: 1.2 });
function pressBase() {
  const out = [];
  const base = { x: 272, y: -32, w: 66, d: 62, r: 4 };
  out.push(`<path class="iso-halo" d="${k.haloOf(base, 0, 6, P)}"/>`);
  out.push(box(base, 0, 6, "mid", { steps: 4, bevel: 0.8 }));
  out.push(grooveOf(base, 3, 6));
  out.push(screws(base, 6, 6, 1.6));
  for (const [x, y] of [[282, -22], [330, -22]]) out.push(post(x, y, 3.4, 6, 74, "mid", { steps: 20 }));
  out.push(box({ x: 288, y: -14, w: 36, d: 30, r: 3 }, 6, 6, "mid", { steps: 4, bevel: 0.6 }));
  out.push(box({ x: 292, y: -10, w: 28, d: 22, r: 1.5 }, 12, 1.4, "hi", { steps: 3, bevel: 0.2, crease: "lo" }));
  out.push(box({ x: 292, y: -10, w: 28, d: 22, r: 1.5 }, 13.4, 1.4, "hi", { steps: 3, bevel: 0.2, crease: "lo" }));
  out.push(`<g data-part="seal">` + S(k.cylinder(PRESS.x, PRESS.y, 5, 14.8, 0.8, P, 24), { tone: "lit", lit: true, crease: "none" }) + `</g>`);
  return out.join("");
}
function ram() {
  const out = [];
  out.push(S(k.cylinder(PRESS.x, PRESS.y, 4, PRESS.stampZ + 4.5, 40, P, 20), { tone: "hi", crease: "none", lit: true }));
  out.push(S(k.cylinder(PRESS.x, PRESS.y, 9.5, PRESS.stampZ, 4.5, P, 22, 0.4), { tone: "hi", crease: "lo", lit: true }));
  return out.join("");
}
function pressFront() {
  const out = [];
  out.push(S(k.cylinder(PRESS.x, PRESS.y, 7, 56, 24, P, 20, 0.3), { tone: "mid" }));
  out.push(L(k.sideArc(PRESS.x, PRESS.y, 7, 64, P, 24), { tone: "faint" }));
  for (const [x, y] of [[282, 20], [330, 20]]) out.push(post(x, y, 3.4, 6, 74, "mid", { steps: 20 }));
  const head = { x: 276, y: -28, w: 60, d: 54, r: 4 };
  out.push(box(head, 80, 8, "hi", { steps: 4, bevel: 0.9 }));
  out.push(grooveOf(head, 3, 88));
  out.push(screws(head, 6, 88, 1.6));
  return out.join("");
}
function crates() {
  const out = [];
  for (let i = 0; i < 5; i++) {
    const c = crateAt(i);
    out.push(`<g class="crate" data-crate="${i}">` + box(c, 0, 9, "mid", { steps: 2, bevel: 0.4 }) + L(k.planOutline(k.insetPlan(c, 1.4), 9, P, 2), { tone: "faint" }) + `</g>`);
  }
  out.push(box({ x: 296, y: -48, w: 26, d: 12, r: 1.5 }, 0, 3, "lo", { steps: 3, bevel: 0.3, crease: "none" }));
  [[4, 3.4], [8, 3.4], [12, 3.4]].forEach(([_, __], i) => out.push(L(k.lineOnTop([300, -44 + i * 3], [300 + 8 + (i % 2) * 6, -44 + i * 3], 3, P), { tone: "lo", free: true })));
  return out.join("");
}

// ---------------------------------------------------------------- vagonete
function cart() {
  const out = [];
  const wheelF = (x, y) => G.frameAlong([x, y, 6.6], [0, 1, 0]);
  out.push(S(G.disc(-0.6, 1.6, 3, wheelF(-8, 60.9), P), { tone: "mid" }));
  out.push(S(G.disc(-0.6, 1.6, 3, wheelF(8, 60.9), P), { tone: "mid" }));
  out.push(S(G.disc(0, 22, 1, wheelF(-8, 60.9 + 0.5), P), { tone: "lo", crease: "none" }));
  out.push(S(G.disc(0, 22, 1, wheelF(8, 60.9 + 0.5), P), { tone: "lo", crease: "none" }));
  out.push(box({ x: -13, y: 64, w: 26, d: 15, r: 2.5 }, 8.6, 7, "mid", { steps: 4, bevel: 0.5 }));
  out.push(L(k.sideSeam({ x: -13, y: 64, w: 26, d: 15, r: 2.5 }, 12, P, 4), { tone: "faint" }));
  const rim = { x: -14, y: 63.2, w: 28, d: 16.6, r: 3 };
  out.push(box(rim, 15.6, 2, "hi", { steps: 4, bevel: 0.4, inner: "" }));
  out.push(`<path class="mouth" d="${k.planOutline(k.insetPlan(rim, 1.8), 17.6, P, 4)}"/>`);
  out.push(S(G.disc(-0.6, 1.6, 3, wheelF(-8, 80.9), P), { tone: "mid" }));
  out.push(S(G.disc(-0.6, 1.6, 3, wheelF(8, 80.9), P), { tone: "mid" }));
  const nug = (cx, cy, pts, z, h, lit) => S(k.extrude(pts.map(([x, y]) => [cx + x, cy + y]), z, h, P, { convex: true }), { tone: "hi", lit });
  out.push(`<g data-part="nugget">` + nug(0, 71.5, [[-4.6, -3], [0, -5.2], [5, -3], [6.4, 1], [2.4, 5], [-3.4, 4.4], [-6.4, 1]], 17.6, 4, true) + nug(0.5, 71.5, [[-2.6, -1.8], [1.4, -2.8], [3.2, 0.4], [-0.6, 2.8], [-3, 0.6]], 21.6, 2.4, true) + `</g>`);
  return out.join("");
}

// ---------------------------------------------------------------- montagem
const translate = (by) => k.translateAlong(P, by);
export function figure() {
  const body = [
    bench(),
    track(),
    portalBack(),
    // 1 funil
    hopper(),
    selector(),
    // 2 bandeja
    trayBase(),
    `<g data-part="bridgeB" transform="${translate([CELL.x0, 0, 0])}">${bridgeBackSvg()}</g>`,
    cells(),
    trayFrontRail(),
    `<g data-part="bridgeF" transform="${translate([CELL.x0, 0, 0])}">${bridgeFrontSvg()}</g>`,
    // 3 comparador
    comparator(),
    gatePillars(),
    comparatorBars(),
    gateGroup(),
    gateFront(),
    // 4 mostradores
    dialsConsole(),
    tower(),
    // 5 quadro
    board(),
    // 6 prensa
    pressBase(),
    `<g data-part="ram" transform="${translate([0, 0, 0])}">${ram()}</g>`,
    pressFront(),
    crates(),
    // vagonete e portal
    `<g data-part="cart" transform="${translate([STOPS.start, 0, 0])}">${cart()}</g>`,
    portalFront(),
  ];
  return k.figureSvg({
    width: W,
    height: H,
    label:
      "Uma linha de garimpo isométrica que representa o Mineiro Username Intelligence: um vagonete leva a pepita (o identificador) da boca da mina até um funil com seletor de requisito, uma bandeja de 50 detectores varrida por uma ponte, uma peneira que compara a resposta do alvo com a de um controle, uma bancada de cinco mostradores de confiança, um quadro de vínculos com fios e uma prensa que lacra o relatório com SHA-256.",
    body,
  });
}

export const geometry = { P, W, H };
