import { DECOR, FARM, TREES, WORLD } from "./config";
import type { Art } from "./sprites";
import { drawSheet } from "./sprites";
import type { Game, Human } from "./types";

function hash(n: number) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function aimDir(aim: number) {
  const t = (aim + Math.PI * 2) % (Math.PI * 2);
  if (t >= Math.PI * (7 / 4) || t < Math.PI / 4) return 2;
  if (t < Math.PI * (3 / 4)) return 0;
  if (t < Math.PI * (5 / 4)) return 1;
  return 3;
}

function shadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  a: number,
) {
  ctx.save();
  ctx.fillStyle = `rgba(18, 16, 12, ${a})`;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHuman(ctx: CanvasRenderingContext2D, art: Art, h: Human) {
  const boss = h.kind === "boss";
  const sheet = boss ? art.boss : h.kind === "hunter" ? art.hunter : art.hiker;
  const w = boss ? 92 : h.kind === "hunter" ? 52 : 48;
  const ht = boss ? 100 : h.kind === "hunter" ? 56 : 52;
  shadow(ctx, h.x, h.y + 4, boss ? 22 : 12, boss ? 10 : 6, 0.28);
  if (h.state === "aim") {
    ctx.save();
    ctx.strokeStyle = boss ? "rgba(181, 74, 50, 0.8)" : "rgba(181, 74, 50, 0.55)";
    ctx.lineWidth = boss ? 3 : 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(h.x, h.y - 18);
    ctx.lineTo(h.x + Math.cos(h.aim) * (boss ? 100 : 70), h.y + Math.sin(h.aim) * (boss ? 100 : 70));
    ctx.stroke();
    ctx.restore();
  }
  if (sheet) {
    const col = Math.abs(h.frame | 0) % 4;
    drawSheet(ctx, sheet, col, h.dir, h.x, h.y + 2, w, ht, h.flash > 0);
  } else {
    ctx.fillStyle = boss ? "#8b2c1a" : h.kind === "hunter" ? "#c45a28" : "#b56b45";
    ctx.beginPath();
    ctx.arc(h.x, h.y - (boss ? 28 : 16), boss ? 22 : 12, 0, Math.PI * 2);
    ctx.fill();
  }
  if (boss && h.maxHp > 0) {
    const bw = 54;
    const ratio = Math.max(0, h.hp / h.maxHp);
    ctx.fillStyle = "rgba(18,16,12,0.55)";
    ctx.fillRect(h.x - bw / 2, h.y - ht - 10, bw, 5);
    ctx.fillStyle = "#b54a32";
    ctx.fillRect(h.x - bw / 2, h.y - ht - 10, bw * ratio, 5);
  }
}

export function renderGame(
  ctx: CanvasRenderingContext2D,
  g: Game,
  art: Art | null,
) {
  const w = g.viewW;
  const h = g.viewH;
  const shake = g.reduced ? 0 : g.trauma * g.trauma;
  const ox = (hash(g.time * 37) * 2 - 1) * shake * 16;
  const oy = (hash(g.time * 53) * 2 - 1) * shake * 16;

  ctx.fillStyle = "#1a1814";
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(w / 2 + ox, h / 2 + oy);
  ctx.translate(-g.camX, -g.camY);

  if (art?.meadow) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(art.meadow, 0, 0, WORLD, WORLD);
  } else {
    ctx.fillStyle = "#6d7a3e";
    ctx.fillRect(0, 0, WORLD, WORLD);
  }

  const p = g.player;
  shadow(ctx, p.x, p.y + 6, 16 + p.alt * 6, 8 + p.alt * 2, 0.22 + p.alt * 0.1);

  type Item = { y: number; z: number; draw: () => void };
  const items: Item[] = [];

  if (art) {
    for (const t of TREES) {
      items.push({
        y: t.y,
        z: 1,
        draw: () => {
          if (art.tree) {
            ctx.drawImage(art.tree, t.x - 78, t.y - 150, 156, 168);
          }
        },
      });
    }
    items.push({
      y: FARM.y,
      z: 1,
      draw: () => {
        if (art.farmhouse) {
          ctx.drawImage(
            art.farmhouse,
            FARM.x - FARM.w / 2,
            FARM.y - FARM.h,
            FARM.w,
            FARM.h,
          );
        }
      },
    });
    for (const d of DECOR) {
      const img =
        d.kind === "hay"
          ? art.hay
          : d.kind === "hay2"
            ? art.hay2
            : d.kind === "bush"
              ? art.bush
              : art.stone;
      items.push({
        y: d.y,
        z: 0,
        draw: () => {
          if (img) ctx.drawImage(img, d.x - d.s / 2, d.y - d.s, d.s, d.s);
        },
      });
    }
  }

  for (const human of g.humans) {
    if (!human.alive) continue;
    items.push({
      y: human.y,
      z: 1,
      draw: () => drawHuman(ctx, art ?? ({} as Art), human),
    });
  }

  for (const pk of g.pickups) {
    if (!pk.alive) continue;
    items.push({
      y: pk.y,
      z: 0,
      draw: () => {
        const bob = Math.sin(g.time * 4 + pk.x * 0.02) * 5;
        const glow = 0.35 + Math.sin(g.time * 5) * 0.12;
        ctx.save();
        ctx.fillStyle = `rgba(215, 196, 164, ${glow})`;
        ctx.beginPath();
        ctx.ellipse(pk.x, pk.y + 4, 16, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        if (pk.kind === "shells") {
          ctx.fillStyle = "#d7c4a4";
          ctx.fillRect(pk.x - 5, pk.y - 14 + bob, 4, 12);
          ctx.fillRect(pk.x + 1, pk.y - 14 + bob, 4, 12);
          return;
        }
        const map: Record<string, [number, number]> = {
          scatter: [0, 0],
          rifle: [1, 0],
          cannon: [0, 1],
          eagle: [1, 1],
        };
        const cell = map[pk.kind] ?? [0, 0];
        if (art?.pickups) {
          drawSheet(ctx, art.pickups, cell[0], cell[1], pk.x, pk.y + bob, 44, 44);
        }
      },
    });
  }

  if (g.eagle?.alive) {
    const e = g.eagle;
    items.push({
      y: e.y,
      z: 2,
      draw: () => {
        shadow(ctx, e.x, e.y + 6, 14, 7, 0.2);
        const dir = aimDir(e.aim);
        const col = Math.abs(e.anim | 0) % 4;
        if (art?.eagle) {
          drawSheet(ctx, art.eagle, col, dir, e.x, e.y - 18, 70, 70);
        } else {
          ctx.fillStyle = "#c9a24a";
          ctx.beginPath();
          ctx.ellipse(e.x, e.y - 18, 22, 12, e.aim, 0, Math.PI * 2);
          ctx.fill();
        }
      },
    });
  }

  items.push({
    y: p.y,
    z: 2,
    draw: () => {
      const blink = p.invuln > 0 && Math.floor(g.time * 16) % 2 === 0;
      if (blink) ctx.globalAlpha = 0.45;
      const dir = aimDir(p.aim);
      const flyCol = Math.abs(p.anim * 1.4) % 4 | 0;
      const drawY = p.y - p.alt * 46;
      const size = 78 + p.alt * 10;
      if (p.fireT > 0 && art?.hawkShoot) {
        const fi = Math.min(3, (0.28 - p.fireT) / 0.07) | 0;
        const col = fi % 2;
        const row = (fi / 2) | 0;
        drawSheet(ctx, art.hawkShoot, col, row, p.x, drawY, size * 0.9, size * 0.9);
      } else if (art?.hawkFly) {
        drawSheet(ctx, art.hawkFly, flyCol, dir, p.x, drawY, size, size);
      } else {
        ctx.fillStyle = "#8a4a28";
        ctx.beginPath();
        ctx.ellipse(p.x, drawY, 28, 16, p.aim, 0, Math.PI * 2);
        ctx.fill();
      }
      if (p.fireT > 0.16 && art?.muzzle) {
        const mx = p.x + Math.cos(p.aim) * 34;
        const my = drawY + Math.sin(p.aim) * 20 - 8;
        const fi = Math.min(3, ((0.28 - p.fireT) / 0.04) | 0);
        drawSheet(ctx, art.muzzle, fi % 2, (fi / 2) | 0, mx, my + 22, 44, 44);
      }
      ctx.globalAlpha = 1;
    },
  });

  items.sort((a, b) => a.y - b.y || a.z - b.z);
  for (const it of items) it.draw();

  for (const b of g.pellets) {
    if (!b.alive) continue;
    ctx.fillStyle = b.fromPlayer ? "#f3efe6" : "#d9a15c";
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const pt of g.particles) {
    if (!pt.alive) continue;
    ctx.globalAlpha = Math.max(0, pt.ttl / pt.max);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.font = "600 14px Figtree, sans-serif";
  ctx.textAlign = "center";
  for (const pop of g.popups) {
    if (!pop.alive) continue;
    ctx.globalAlpha = Math.max(0, pop.ttl / pop.max);
    ctx.fillStyle = "#f3efe6";
    ctx.fillText(pop.text, pop.x, pop.y);
    ctx.globalAlpha = 1;
  }

  if (g.mode === "playing" && !g.player.reload) {
    const cx = p.x + Math.cos(p.aim) * 90;
    const cy = p.y + Math.sin(p.aim) * 90 - p.alt * 20;
    ctx.strokeStyle = "rgba(243, 239, 230, 0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy);
    ctx.lineTo(cx + 7, cy);
    ctx.moveTo(cx, cy - 7);
    ctx.lineTo(cx, cy + 7);
    ctx.stroke();
  }

  ctx.restore();

  ctx.fillStyle = "rgba(18, 16, 12, 0.18)";
  ctx.fillRect(0, 0, w, 48);
  ctx.fillRect(0, h - 28, w, 28);
}
