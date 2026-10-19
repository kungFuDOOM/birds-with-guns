import { BIRDS, DECOR, FARM, POND, TREES, WEAPONS, WORLD } from "./config";
import type { Art } from "./sprites";
import { drawSheet } from "./sprites";
import type { Barrel, Game, Human, Pickup } from "./types";

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

function drawBarrel(ctx: CanvasRenderingContext2D, br: Barrel, time: number) {
  shadow(ctx, br.x, br.y + 4, 15, 7, 0.32);
  ctx.save();
  ctx.translate(br.x, br.y);
  if (br.flash > 0) {
    ctx.scale(1.12, 1.12);
  }
  // Barrel body
  ctx.fillStyle = br.flash > 0 ? "#fff3d6" : "#8f2d1e";
  ctx.beginPath();
  ctx.roundRect(-13, -30, 26, 30, 5);
  ctx.fill();
  ctx.strokeStyle = "#2b1610";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Hazard band
  ctx.fillStyle = "#f2b84b";
  ctx.fillRect(-12, -19, 24, 7);

  // Metal hoops
  ctx.fillStyle = "#3a352f";
  ctx.fillRect(-13, -26, 26, 3);
  ctx.fillRect(-13, -8, 26, 3);

  // Top lid
  ctx.fillStyle = "#6b2015";
  ctx.beginPath();
  ctx.ellipse(0, -29, 12, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Spark/pulse if damaged
  if (br.hp < 2) {
    const pulse = 0.5 + Math.sin(time * 18) * 0.4;
    ctx.fillStyle = `rgba(255, 160, 60, ${pulse})`;
    ctx.beginPath();
    ctx.arc(0, -32, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawHuman(ctx: CanvasRenderingContext2D, art: Art, h: Human, g: Game) {
  const boss = h.kind === "boss";
  const sheet =
    boss
      ? art.boss
      : h.kind === "hunter" || h.kind === "sniper" || h.kind === "pyro"
        ? art.hunter
        : art.hiker;
  const w = boss ? 94 : h.kind === "trapper" ? 54 : h.kind === "civilian" ? 48 : 52;
  const ht = boss ? 102 : h.kind === "trapper" ? 58 : h.kind === "civilian" ? 52 : 56;
  shadow(ctx, h.x, h.y + 4, boss ? 24 : 13, boss ? 11 : 6.5, 0.3);

  // Elite or special enemy ground ring
  if (boss && h.enraged) {
    ctx.save();
    ctx.strokeStyle = "rgba(255, 76, 56, 0.7)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(
      h.x,
      h.y + 2,
      28 + Math.sin(g.time * 10) * 4,
      13 + Math.sin(g.time * 10) * 2,
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
    ctx.restore();
  } else if (h.elite || h.kind === "sniper" || h.kind === "trapper" || h.kind === "pyro") {
    ctx.save();
    ctx.strokeStyle =
      h.kind === "sniper"
        ? "rgba(255, 92, 92, 0.5)"
        : h.kind === "trapper"
          ? "rgba(123, 224, 180, 0.5)"
          : h.kind === "pyro"
            ? "rgba(255, 120, 50, 0.55)"
            : "rgba(255, 209, 102, 0.55)";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(h.x, h.y + 3, 15, 7, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Telegraph visuals
  if (h.state === "aim" && h.telegraph > 0) {
    ctx.save();
    if (h.kind === "sniper") {
      const lockRatio = Math.min(1, h.telegraph / 0.92);
      ctx.strokeStyle =
        lockRatio > 0.75
          ? "rgba(255, 64, 64, 0.92)"
          : "rgba(255, 92, 92, 0.48)";
      ctx.lineWidth = lockRatio > 0.75 ? 2.4 : 1.4;
      ctx.beginPath();
      ctx.moveTo(h.x, h.y - 22);
      ctx.lineTo(
        h.x + Math.cos(h.aim) * 560,
        h.y + Math.sin(h.aim) * 560,
      );
      ctx.stroke();
    } else if (h.kind === "trapper") {
      ctx.strokeStyle = "rgba(168, 230, 207, 0.6)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      for (const offset of [-0.16, 0, 0.16]) {
        ctx.beginPath();
        ctx.moveTo(h.x, h.y - 18);
        ctx.lineTo(
          h.x + Math.cos(h.aim + offset) * 85,
          h.y + Math.sin(h.aim + offset) * 85,
        );
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = boss
        ? "rgba(255, 110, 64, 0.85)"
        : "rgba(217, 138, 58, 0.6)";
      ctx.lineWidth = boss ? 3 : 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(h.x, h.y - 18);
      ctx.lineTo(
        h.x + Math.cos(h.aim) * (boss ? 115 : 75),
        h.y + Math.sin(h.aim) * (boss ? 115 : 75),
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  const filter =
    h.kind === "sniper"
      ? "hue-rotate(-28deg) saturate(1.35)"
      : h.kind === "trapper"
        ? "hue-rotate(110deg) saturate(1.15)"
        : h.kind === "pyro"
          ? "hue-rotate(-15deg) saturate(1.6) brightness(1.08)"
          : boss && h.enraged
            ? "saturate(1.6) brightness(1.12)"
            : "";

  if (sheet) {
    const col = Math.abs(h.frame | 0) % 4;
    drawSheet(ctx, sheet, col, h.dir, h.x, h.y + 2, w, ht, h.flash > 0, 0, filter);
  } else {
    ctx.fillStyle = boss ? "#8b2c1a" : h.kind === "hunter" ? "#c45a28" : "#b56b45";
    ctx.beginPath();
    ctx.arc(h.x, h.y - (boss ? 28 : 16), boss ? 22 : 12, 0, Math.PI * 2);
    ctx.fill();
  }

  // Role badge / indicator above specialized enemies
  if (!boss && (h.kind === "sniper" || h.kind === "trapper" || h.kind === "pyro" || h.elite)) {
    ctx.save();
    ctx.font = "600 10px Figtree, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle =
      h.kind === "sniper"
        ? "#ff6b6b"
        : h.kind === "trapper"
          ? "#a8e6cf"
          : h.kind === "pyro"
            ? "#ff9e5e"
            : "#ffd166";
    const tag =
      h.kind === "sniper"
        ? "SNIPER"
        : h.kind === "trapper"
          ? "TRAPPER"
          : h.kind === "pyro"
            ? "PYRO"
            : "SUPPLY";
    ctx.fillText(tag, h.x, h.y - ht - 4);
    ctx.restore();
  }

  // Health bar for Boss or damaged multi-HP enemies
  if ((boss || (h.maxHp > 1 && h.hp < h.maxHp)) && h.maxHp > 0) {
    const bw = boss ? 58 : 30;
    const bh = boss ? 5 : 3.5;
    const by = h.y - ht - (boss ? 12 : 14);
    const ratio = Math.max(0, h.hp / h.maxHp);
    ctx.fillStyle = "rgba(18,16,12,0.68)";
    ctx.fillRect(h.x - bw / 2, by, bw, bh);
    ctx.fillStyle = boss && h.enraged ? "#ff4d38" : "#d96b38";
    ctx.fillRect(h.x - bw / 2, by, bw * ratio, bh);
  }
}

function drawPickupItem(
  ctx: CanvasRenderingContext2D,
  pk: Pickup,
  art: Art | null,
  time: number,
) {
  const bob = Math.sin(time * 4.2 + pk.x * 0.02) * 5;
  const glow = 0.34 + Math.sin(time * 5.5) * 0.14;
  const haloColor =
    pk.kind === "medkit"
      ? `rgba(123, 224, 136, ${glow})`
      : pk.kind === "frenzy" || pk.kind === "eagle"
        ? `rgba(255, 209, 102, ${glow})`
        : `rgba(215, 196, 164, ${glow})`;

  ctx.save();
  ctx.fillStyle = haloColor;
  ctx.beginPath();
  ctx.ellipse(pk.x, pk.y + 4, 18, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  if (pk.kind === "shells") {
    ctx.fillStyle = "#d95338";
    ctx.fillRect(pk.x - 7, pk.y - 16 + bob, 5, 11);
    ctx.fillRect(pk.x + 2, pk.y - 16 + bob, 5, 11);
    ctx.fillStyle = "#f2c96d";
    ctx.fillRect(pk.x - 7, pk.y - 8 + bob, 5, 4);
    ctx.fillRect(pk.x + 2, pk.y - 8 + bob, 5, 4);
  } else if (pk.kind === "medkit") {
    ctx.fillStyle = "#1c281e";
    ctx.beginPath();
    ctx.roundRect(pk.x - 13, pk.y - 26 + bob, 26, 22, 5);
    ctx.fill();
    ctx.strokeStyle = "#7be088";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#7be088";
    ctx.fillRect(pk.x - 2.5, pk.y - 22 + bob, 5, 14);
    ctx.fillRect(pk.x - 7, pk.y - 17.5 + bob, 14, 5);
  } else {
    const map: Record<string, [number, number]> = {
      scatter: [0, 0],
      smg: [0, 0],
      rifle: [1, 0],
      cannon: [0, 1],
      flare: [0, 1],
      eagle: [1, 1],
      frenzy: [1, 1],
    };
    const cell = map[pk.kind] ?? [0, 0];
    const filter =
      pk.kind === "smg"
        ? "hue-rotate(35deg) brightness(1.15)"
        : pk.kind === "flare"
          ? "hue-rotate(-25deg) saturate(1.5)"
          : pk.kind === "frenzy"
            ? "saturate(1.6) brightness(1.18)"
            : "";
    if (art?.pickups) {
      drawSheet(
        ctx,
        art.pickups,
        cell[0],
        cell[1],
        pk.x,
        pk.y + bob,
        44,
        44,
        false,
        0,
        filter,
      );
    }
  }

  // Floating pickup label
  ctx.font = "600 10px Figtree, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(243, 239, 230, 0.88)";
  const label =
    pk.kind === "medkit"
      ? "HEAL"
      : pk.kind === "frenzy"
        ? "FRENZY"
        : pk.kind === "eagle"
          ? "EAGLE"
          : pk.kind === "shells"
            ? "AMMO"
            : WEAPONS[pk.kind].name.toUpperCase();
  ctx.fillText(label, pk.x, pk.y + 16);
  ctx.restore();
}

function drawMinimap(ctx: CanvasRenderingContext2D, g: Game) {
  if (g.mode !== "playing") return;
  const size = g.viewW < 500 ? 86 : 112;
  const pad = 16;
  const mx = g.viewW - size - pad;
  const my = g.viewW < 500 ? 64 : g.viewH - size - 36;
  const scale = size / WORLD;

  ctx.save();
  ctx.fillStyle = "rgba(18, 16, 12, 0.76)";
  ctx.strokeStyle = "rgba(243, 239, 230, 0.22)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(mx, my, size, size, 8);
  ctx.fill();
  ctx.stroke();

  // Pond on radar
  ctx.fillStyle = "rgba(74, 154, 185, 0.45)";
  ctx.beginPath();
  ctx.ellipse(
    mx + POND.x * scale,
    my + POND.y * scale,
    POND.rx * scale,
    POND.ry * scale,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  // Farmhouse on radar
  ctx.fillStyle = "rgba(165, 112, 76, 0.6)";
  ctx.fillRect(
    mx + (FARM.x - FARM.w / 2) * scale,
    my + (FARM.y - FARM.h / 2) * scale,
    FARM.w * scale,
    FARM.h * scale,
  );

  // Pickups
  ctx.fillStyle = "#7be088";
  for (const pk of g.pickups) {
    if (!pk.alive) continue;
    ctx.fillRect(mx + pk.x * scale - 1.5, my + pk.y * scale - 1.5, 3, 3);
  }

  // Humans
  for (const h of g.humans) {
    if (!h.alive) continue;
    ctx.fillStyle =
      h.kind === "boss"
        ? "#ff4d38"
        : h.kind === "civilian"
          ? "#e8dcc8"
          : "#ff9e44";
    const r = h.kind === "boss" ? 3.5 : 2;
    ctx.beginPath();
    ctx.arc(mx + h.x * scale, my + h.y * scale, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Player dot
  ctx.fillStyle = BIRDS[g.player.bird].accentColor;
  ctx.beginPath();
  ctx.arc(
    mx + g.player.x * scale,
    my + g.player.y * scale,
    3.2,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();
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

  // Subtle animated pond ripples
  ctx.save();
  ctx.strokeStyle = "rgba(220, 248, 255, 0.22)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    const phase = ((g.time * 0.35 + i * 0.33) % 1);
    ctx.globalAlpha = (1 - phase) * 0.35;
    ctx.beginPath();
    ctx.ellipse(
      POND.x,
      POND.y,
      POND.rx * (0.25 + phase * 0.65),
      POND.ry * (0.25 + phase * 0.65),
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  }
  ctx.restore();

  // Fire hazards on ground
  for (const hz of g.hazards) {
    if (!hz.alive) continue;
    const alpha = Math.min(1, hz.ttl / 0.8) * 0.42;
    ctx.save();
    ctx.fillStyle = `rgba(255, 100, 42, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(hz.x, hz.y, hz.radius, hz.radius * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
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

  for (const br of g.barrels) {
    if (!br.alive) continue;
    items.push({
      y: br.y,
      z: 1,
      draw: () => drawBarrel(ctx, br, g.time),
    });
  }

  for (const human of g.humans) {
    if (!human.alive) continue;
    items.push({
      y: human.y,
      z: 1,
      draw: () => drawHuman(ctx, art ?? ({} as Art), human, g),
    });
  }

  for (const pk of g.pickups) {
    if (!pk.alive) continue;
    items.push({
      y: pk.y,
      z: 0,
      draw: () => drawPickupItem(ctx, pk, art, g.time),
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

  // Swoop afterimages
  const birdSheet = p.bird === "eagle" ? art?.eagle ?? art?.hawkFly : art?.hawkFly;
  const birdTint = BIRDS[p.bird].tint;
  for (const af of g.afterimages) {
    items.push({
      y: af.y - 1,
      z: 2,
      draw: () => {
        ctx.save();
        ctx.globalAlpha = (af.ttl / af.max) * 0.38;
        const dir = aimDir(af.aim);
        const flyCol = Math.abs(af.anim * 1.4) % 4 | 0;
        const drawY = af.y - af.alt * 46;
        const size = 78 + af.alt * 10;
        if (birdSheet) {
          drawSheet(ctx, birdSheet, flyCol, dir, af.x, drawY, size, size, false, 0, birdTint);
        }
        ctx.restore();
      },
    });
  }

  items.push({
    y: p.y,
    z: 2,
    draw: () => {
      const blink = p.invuln > 0 && p.dashT <= 0 && Math.floor(g.time * 16) % 2 === 0;
      if (blink) ctx.globalAlpha = 0.48;
      const dir = aimDir(p.aim);
      const flyCol = Math.abs(p.anim * 1.4) % 4 | 0;
      const drawY = p.y - p.alt * 46;
      const size = 78 + p.alt * 10;

      // Frenzy or Overcharge aura around the bird
      if (p.frenzyT > 0 || p.overchargeT > 0) {
        ctx.save();
        ctx.strokeStyle =
          p.frenzyT > 0 ? "rgba(255, 209, 102, 0.75)" : "rgba(168, 230, 255, 0.65)";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(p.x, drawY - size * 0.45, 34 + Math.sin(g.time * 14) * 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (p.fireT > 0 && art?.hawkShoot) {
        const fi = Math.min(3, (0.28 - p.fireT) / 0.07) | 0;
        const col = fi % 2;
        const row = (fi / 2) | 0;
        drawSheet(
          ctx,
          art.hawkShoot,
          col,
          row,
          p.x,
          drawY,
          size * 0.92,
          size * 0.92,
          false,
          p.bank,
          birdTint,
        );
      } else if (birdSheet) {
        drawSheet(
          ctx,
          birdSheet,
          flyCol,
          dir,
          p.x,
          drawY,
          size,
          size,
          false,
          p.bank,
          birdTint,
        );
      } else {
        ctx.fillStyle = "#8a4a28";
        ctx.beginPath();
        ctx.ellipse(p.x, drawY, 28, 16, p.aim, 0, Math.PI * 2);
        ctx.fill();
      }

      // Golden shield feathers orbiting bird
      if (p.shield > 0) {
        ctx.save();
        for (let i = 0; i < p.shield; i++) {
          const ang = g.time * 3.2 + (i * Math.PI * 2) / p.shield;
          const sx = p.x + Math.cos(ang) * 32;
          const sy = drawY - size * 0.45 + Math.sin(ang) * 18;
          ctx.fillStyle = "#ffd166";
          ctx.beginPath();
          ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (p.fireT > 0.16 && art?.muzzle) {
        const mx = p.x + Math.cos(p.aim) * 34;
        const my = drawY + Math.sin(p.aim) * 20 - 8;
        const fi = Math.min(3, ((0.28 - p.fireT) / 0.04) | 0);
        drawSheet(ctx, art.muzzle, fi % 2, (fi / 2) | 0, mx, my + 22, 46, 46);
      }

      // Active Reload timing bar above bird
      if (p.reload > 0 && p.reloadMax > 0) {
        const progress = 1 - p.reload / p.reloadMax;
        const bw = 46;
        const bx = p.x - bw / 2;
        const by = drawY - size - 8;
        ctx.fillStyle = "rgba(18, 16, 12, 0.8)";
        ctx.fillRect(bx, by, bw, 5);
        if (p.activeReloadReady) {
          ctx.fillStyle = "rgba(255, 225, 105, 0.55)";
          ctx.fillRect(bx + bw * 0.35, by, bw * 0.43, 5);
        }
        ctx.fillStyle = "#f3efe6";
        ctx.fillRect(bx + bw * progress - 1.5, by - 1, 3, 7);
      }

      ctx.globalAlpha = 1;
    },
  });

  items.sort((a, b) => a.y - b.y || a.z - b.z);
  for (const it of items) it.draw();

  // Pellets & tracer streaks
  for (const b of g.pellets) {
    if (!b.alive) continue;
    ctx.save();
    ctx.strokeStyle = b.color;
    ctx.lineWidth = b.radius * 0.9;
    ctx.lineCap = "round";
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.moveTo(b.prevX, b.prevY);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Rich particles
  for (const pt of g.particles) {
    if (!pt.alive) continue;
    const ratio = Math.max(0, pt.ttl / pt.max);
    ctx.save();
    if (pt.kind === "snatch" && art?.snatch) {
      ctx.globalAlpha = Math.min(1, ratio * 1.4);
      const col = pt.variant % 2;
      const row = (pt.variant / 2) | 0;
      const s = pt.size * (1.15 - ratio * 0.25);
      drawSheet(ctx, art.snatch, col, row, pt.x, pt.y + s * 0.5, s, s);
    } else if (pt.kind === "ring") {
      ctx.globalAlpha = ratio * 0.75;
      ctx.strokeStyle = pt.color;
      ctx.lineWidth = 2.5 * ratio + 1;
      const rad = Math.max(2, pt.size * (1 - ratio * 0.82));
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, rad, 0, Math.PI * 2);
      ctx.stroke();
    } else if (pt.kind === "feather" || pt.kind === "leaf") {
      ctx.globalAlpha = ratio;
      ctx.translate(pt.x, pt.y);
      ctx.rotate(pt.rot);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, pt.size * 1.3, pt.size * 0.48, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (pt.kind === "shell") {
      ctx.globalAlpha = ratio;
      ctx.translate(pt.x, pt.y);
      ctx.rotate(pt.rot);
      ctx.fillStyle = pt.color;
      ctx.fillRect(-pt.size, -pt.size * 0.45, pt.size * 2, pt.size * 0.9);
    } else {
      ctx.globalAlpha = ratio;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Popups
  ctx.textAlign = "center";
  for (const pop of g.popups) {
    if (!pop.alive) continue;
    const alpha = Math.max(0, pop.ttl / pop.max);
    ctx.save();
    ctx.globalAlpha = alpha;
    const px = Math.round(14 * pop.scale);
    ctx.font = `700 ${px}px Figtree, sans-serif`;
    ctx.fillStyle = "rgba(18, 16, 12, 0.75)";
    ctx.fillText(pop.text, pop.x + 1, pop.y + 1);
    ctx.fillStyle = pop.color;
    ctx.fillText(pop.text, pop.x, pop.y);
    ctx.restore();
  }

  // Off-screen target locator arrow when <= 3 enemies or a Boss is off-screen
  if (g.mode === "playing" && g.humans.length > 0) {
    const boss = g.humans.find((hm) => hm.alive && hm.kind === "boss");
    const target = boss ?? (g.humans.length <= 4 ? g.humans[0] : null);
    if (target) {
      const dx = target.x - g.camX;
      const dy = target.y - g.camY;
      if (Math.abs(dx) > w * 0.44 || Math.abs(dy) > h * 0.42) {
        const ang = Math.atan2(dy, dx);
        const rx = g.camX + Math.cos(ang) * (w * 0.38);
        const ry = g.camY + Math.sin(ang) * (h * 0.36);
        ctx.save();
        ctx.translate(rx, ry);
        ctx.rotate(ang);
        ctx.fillStyle = boss ? "#ff4d38" : "#ffd166";
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(-8, -6);
        ctx.lineTo(-5, 0);
        ctx.lineTo(-8, 6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
  }

  // Dynamic crosshair
  if (g.mode === "playing" && !g.player.reload) {
    const cx = p.x + Math.cos(p.aim) * 92;
    const cy = p.y + Math.sin(p.aim) * 92 - p.alt * 20;
    const spreadGap = 5 + WEAPONS[p.weapon].spread * 10 + p.fireT * 14;
    ctx.save();
    ctx.strokeStyle =
      p.overchargeT > 0 || p.frenzyT > 0
        ? "rgba(255, 225, 105, 0.9)"
        : "rgba(243, 239, 230, 0.78)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx - spreadGap - 5, cy);
    ctx.lineTo(cx - spreadGap + 2, cy);
    ctx.moveTo(cx + spreadGap - 2, cy);
    ctx.lineTo(cx + spreadGap + 5, cy);
    ctx.moveTo(cx, cy - spreadGap - 5);
    ctx.lineTo(cx, cy - spreadGap + 2);
    ctx.moveTo(cx, cy + spreadGap - 2);
    ctx.lineTo(cx, cy + spreadGap + 5);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();

  // Top & bottom subtle cinematic bars
  ctx.fillStyle = "rgba(18, 16, 12, 0.18)";
  ctx.fillRect(0, 0, w, 48);
  ctx.fillRect(0, h - 28, w, 28);

  drawMinimap(ctx, g);
}
