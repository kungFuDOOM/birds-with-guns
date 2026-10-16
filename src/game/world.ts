import { DECOR, FARM, POND, TREES, WORLD } from "./config";

export function inWorld(x: number, y: number, pad = 36) {
  return x > pad && y > pad && x < WORLD - pad && y < WORLD - pad;
}

export function clampWorld(x: number, y: number, pad = 36) {
  return {
    x: Math.max(pad, Math.min(WORLD - pad, x)),
    y: Math.max(pad, Math.min(WORLD - pad, y)),
  };
}

export function inPond(x: number, y: number, extra = 0) {
  const dx = (x - POND.x) / (POND.rx + extra);
  const dy = (y - POND.y) / (POND.ry + extra);
  return dx * dx + dy * dy < 1;
}

export function pushOutPond(x: number, y: number, extra = 8) {
  const rx = POND.rx + extra;
  const ry = POND.ry + extra;
  const dx = x - POND.x;
  const dy = y - POND.y;
  const d = Math.hypot(dx / rx, dy / ry);
  if (d >= 1 || d === 0) return { x, y };
  return { x: POND.x + (dx / d) * 1.02, y: POND.y + (dy / d) * 1.02 };
}

function farmRect() {
  return {
    x: FARM.x - FARM.w * 0.38,
    y: FARM.y - FARM.h * 0.38,
    w: FARM.w * 0.76,
    h: FARM.h * 0.34,
  };
}

export function inFarm(x: number, y: number, r = 12) {
  const b = farmRect();
  return x > b.x - r && x < b.x + b.w + r && y > b.y - r && y < b.y + b.h + r;
}

export function nearTrunk(x: number, y: number, r = 18) {
  for (const t of TREES) {
    if (Math.hypot(x - t.x, y - t.y) < r) return t;
  }
  return null;
}

export function underCanopy(x: number, y: number) {
  for (const t of TREES) {
    if (Math.hypot(x - t.x, y - t.y) < t.canopy * 0.55) return t;
  }
  return null;
}

export function hitsCover(x: number, y: number) {
  if (inFarm(x, y, 4)) return true;
  for (const t of TREES) {
    if (Math.hypot(x - t.x, y - t.y) < t.canopy * 0.42) return true;
  }
  for (const d of DECOR) {
    if (d.kind === "hay" || d.kind === "hay2") {
      if (Math.hypot(x - d.x, y - d.y) < d.s * 0.35) return true;
    }
  }
  return false;
}

export function walkableHuman(x: number, y: number) {
  if (!inWorld(x, y, 48)) return false;
  if (inPond(x, y, 10)) return false;
  if (inFarm(x, y, 16)) return false;
  if (nearTrunk(x, y, 22)) return false;
  return true;
}

export function nearestTree(x: number, y: number) {
  let best: { x: number; y: number; canopy: number } = TREES[0];
  let bestD = Infinity;
  for (const t of TREES) {
    const d = Math.hypot(x - t.x, y - t.y);
    if (d < bestD) {
      bestD = d;
      best = t;
    }
  }
  return best;
}

export function lineBlocked(x1: number, y1: number, x2: number, y2: number) {
  const steps = 8;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    if (hitsCover(x, y)) return true;
  }
  return false;
}
