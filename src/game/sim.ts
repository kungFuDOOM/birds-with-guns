import {
  FLY_SPEED,
  GUN_DROPS,
  MAX_HP,
  PARTICLE_POOL,
  PELLET_POOL,
  WEAPONS,
  WORLD,
  type WeaponId,
} from "./config";
import type { Game, Human, Pickup, PickupKind, Pellet, Player } from "./types";
import type { Actions } from "./input";
import {
  clampWorld,
  hitsCover,
  inPond,
  inWorld,
  lineBlocked,
  nearestTree,
  pushOutPond,
  underCanopy,
  walkableHuman,
} from "./world";
import { loadSave, writeSave } from "./save";
import {
  sfxHit,
  sfxHurt,
  sfxOver,
  sfxPickup,
  sfxReload,
  sfxShot,
  sfxWave,
} from "./audio";

function mulberry(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function poolPellets(): Pellet[] {
  return Array.from({ length: PELLET_POOL }, () => ({
    alive: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    ttl: 0,
    fromPlayer: true,
    radius: 5,
    dmg: 1,
  }));
}

function makePlayer(): Player {
  return {
    x: WORLD * 0.5,
    y: WORLD * 0.45,
    vx: 0,
    vy: 0,
    yaw: 0,
    aim: -Math.PI / 2,
    alt: 1,
    hp: MAX_HP,
    shells: WEAPONS.shotgun.mag,
    cooldown: 0,
    reload: 0,
    fireT: 0,
    invuln: 0,
    anim: 0,
    radius: 22,
    weapon: "shotgun",
    weaponT: 0,
  };
}

export function createGameState(): Game {
  const save = loadSave();
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return {
    mode: "boot",
    time: 0,
    player: makePlayer(),
    humans: [],
    pellets: poolPellets(),
    particles: Array.from({ length: PARTICLE_POOL }, () => ({
      alive: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      ttl: 0,
      max: 1,
      size: 3,
      color: "#e8dcc8",
    })),
    popups: Array.from({ length: 24 }, () => ({
      alive: false,
      x: 0,
      y: 0,
      text: "",
      ttl: 0,
      max: 1,
    })),
    pickups: [],
    eagle: null,
    camX: WORLD * 0.5,
    camY: WORLD * 0.45,
    trauma: 0,
    viewW: 800,
    viewH: 600,
    score: 0,
    best: save.best,
    combo: 0,
    comboT: 0,
    wave: 0,
    banner: "",
    bannerT: 0,
    hitstop: 0,
    fireBuf: 0,
    muted: save.muted,
    reduced,
    rng: mulberry(0x9e3779b9),
  };
}

function spawnPellet(
  g: Game,
  x: number,
  y: number,
  vx: number,
  vy: number,
  fromPlayer: boolean,
  radius: number,
  dmg: number,
  ttl = fromPlayer ? 0.42 : 0.55,
) {
  for (const p of g.pellets) {
    if (p.alive) continue;
    p.alive = true;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.ttl = ttl;
    p.fromPlayer = fromPlayer;
    p.radius = radius;
    p.dmg = dmg;
    return;
  }
}

function burst(
  g: Game,
  x: number,
  y: number,
  n: number,
  color: string,
  speed: number,
) {
  let left = n;
  for (const p of g.particles) {
    if (p.alive) continue;
    const a = g.rng() * Math.PI * 2;
    const s = speed * (0.4 + g.rng() * 0.8);
    p.alive = true;
    p.x = x;
    p.y = y;
    p.vx = Math.cos(a) * s;
    p.vy = Math.sin(a) * s;
    p.max = 0.35 + g.rng() * 0.35;
    p.ttl = p.max;
    p.size = 2 + g.rng() * 4;
    p.color = color;
    left--;
    if (left <= 0) return;
  }
}

function popup(g: Game, x: number, y: number, text: string) {
  for (const p of g.popups) {
    if (p.alive) continue;
    p.alive = true;
    p.x = x;
    p.y = y;
    p.text = text;
    p.max = 0.85;
    p.ttl = p.max;
    return;
  }
}

function pickSpawn(g: Game): { x: number; y: number } {
  const px = g.player.x;
  const py = g.player.y;
  for (let i = 0; i < 90; i++) {
    const x = 80 + g.rng() * (WORLD - 160);
    const y = 80 + g.rng() * (WORLD - 160);
    if (!walkableHuman(x, y)) continue;
    if (Math.hypot(x - px, y - py) < 200) continue;
    let crowded = false;
    for (const h of g.humans) {
      if (!h.alive) continue;
      if (Math.hypot(h.x - x, h.y - y) < 70) {
        crowded = true;
        break;
      }
    }
    if (crowded) continue;
    return { x, y };
  }
  return { x: 120 + g.rng() * (WORLD - 240), y: 120 + g.rng() * (WORLD - 240) };
}

function addHuman(g: Game, kind: Human["kind"]) {
  const p = pickSpawn(g);
  const hp = kind === "boss" ? 34 + g.wave * 6 : kind === "hunter" ? 2 : 1;
  g.humans.push({
    alive: true,
    kind,
    x: p.x,
    y: p.y,
    vx: 0,
    vy: 0,
    hp,
    maxHp: hp,
    dir: (g.rng() * 4) | 0,
    frame: 0,
    state: "wander",
    think: 0.2 + g.rng() * 1.2,
    aim: 0,
    telegraph: 0,
    flash: 0,
    radius: kind === "boss" ? 36 : kind === "hunter" ? 22 : 20,
    hideT: 0,
  });
}

function spawnWave(g: Game, wave: number) {
  g.humans = [];
  const civ = Math.min(22 + (wave - 1) * 5, 50);
  const hun = Math.min(3 + wave, 14);
  for (let i = 0; i < civ; i++) addHuman(g, "civilian");
  for (let i = 0; i < hun; i++) addHuman(g, "hunter");
  if (wave % 3 === 0) addHuman(g, "boss");
  const stash = 2 + (wave > 2 ? 1 : 0);
  for (let i = 0; i < stash; i++) {
    const s = pickSpawn(g);
    spawnPickup(g, s.x, s.y, GUN_DROPS[(g.rng() * GUN_DROPS.length) | 0]);
  }
  g.wave = wave;
  g.banner = wave % 3 === 0 ? `Wave ${wave} · Warden` : `Wave ${wave}`;
  g.bannerT = 1.9;
  if (g.player.weapon === "shotgun") {
    g.player.shells = WEAPONS.shotgun.mag;
    g.player.reload = 0;
  }
  if (wave > 1 && g.player.hp < MAX_HP) g.player.hp += 1;
  sfxWave();
}

export function startHunt(g: Game) {
  g.rng = mulberry((Date.now() ^ 0x2c1b3c6d) >>> 0);
  g.player = makePlayer();
  g.score = 0;
  g.combo = 0;
  g.comboT = 0;
  g.trauma = 0;
  g.pickups = [];
  g.eagle = null;
  for (const p of g.pellets) p.alive = false;
  for (const p of g.particles) p.alive = false;
  spawnWave(g, 1);
  g.mode = "playing";
  g.camX = g.player.x;
  g.camY = g.player.y;
}

function equipGun(g: Game, id: WeaponId) {
  const w = WEAPONS[id];
  g.player.weapon = id;
  g.player.weaponT = id === "shotgun" ? 0 : 24;
  g.player.shells = w.mag;
  g.player.reload = 0;
  g.player.cooldown = 0;
  popup(g, g.player.x, g.player.y - 36, w.name);
}

function spawnPickup(g: Game, x: number, y: number, kind: PickupKind) {
  const spot = clampWorld(x + (g.rng() - 0.5) * 36, y + (g.rng() - 0.5) * 36, 50);
  g.pickups.push({
    alive: true,
    kind,
    x: spot.x,
    y: spot.y,
    ttl: 16,
  });
}

function callEagle(g: Game) {
  const p = g.player;
  g.eagle = {
    alive: true,
    x: p.x - 40,
    y: p.y - 50,
    vx: 0,
    vy: 0,
    aim: p.aim,
    anim: 0,
    cooldown: 0.2,
    fireT: 0,
    ttl: 12,
  };
  g.banner = "Eagle inbound";
  g.bannerT = 1.4;
  popup(g, p.x, p.y - 44, "Ally eagle");
}

function fireSpread(
  g: Game,
  x: number,
  y: number,
  aim: number,
  n: number,
  spread: number,
  speed: number,
  fromPlayer: boolean,
  radius: number,
  dmg: number,
) {
  const count = Math.max(1, n);
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1) - 0.5;
    const a = aim + t * spread + (g.rng() - 0.5) * 0.06;
    const spd = speed + g.rng() * 80;
    spawnPellet(
      g,
      x + Math.cos(aim) * 18,
      y + Math.sin(aim) * 18,
      Math.cos(a) * spd,
      Math.sin(a) * spd,
      fromPlayer,
      radius,
      dmg,
      fromPlayer ? 0.44 : 0.55,
    );
  }
}

function firePlayer(g: Game) {
  const p = g.player;
  if (p.reload > 0 || p.cooldown > 0 || p.shells <= 0) return false;
  const w = WEAPONS[p.weapon];
  p.shells -= 1;
  p.cooldown = w.cooldown;
  p.fireT = 0.28;
  p.alt = 0.58;
  fireSpread(g, p.x, p.y, p.aim, w.pellets, w.spread, w.speed, true, w.radius, w.dmg);
  g.trauma = Math.min(1, g.trauma + (g.reduced ? 0.1 : w.kick));
  g.hitstop = g.reduced ? 0 : w.id === "cannon" ? 0.06 : 0.03;
  sfxShot(w.id);
  if (p.shells <= 0) {
    if (p.weapon !== "shotgun") {
      p.weapon = "shotgun";
      p.weaponT = 0;
    }
    p.reload = WEAPONS[p.weapon].reload;
    sfxReload();
  }
  return true;
}

function fireHunter(g: Game, h: Human) {
  const p = g.player;
  const lead = h.kind === "boss" ? 0.42 : 0;
  const a = Math.atan2(p.y + p.vy * lead - h.y, p.x + p.vx * lead - h.x);
  if (h.kind === "boss") {
    fireSpread(g, h.x, h.y, a, 16, 0.5, 520, false, 8, 1);
    fireSpread(g, h.x, h.y, a + 0.12, 8, 0.22, 560, false, 7, 1);
    burst(g, h.x, h.y, 14, "#e8c27a", 130);
    return;
  }
  fireSpread(g, h.x, h.y, a, 5, 0.28, 400, false, 5, 1);
  burst(g, h.x, h.y, 6, "#e8c27a", 80);
}

function maybeDrop(g: Game, h: Human) {
  if (h.kind === "boss") {
    spawnPickup(g, h.x + 28, h.y - 10, GUN_DROPS[(g.rng() * GUN_DROPS.length) | 0]);
    spawnPickup(g, h.x - 24, h.y + 12, "shells");
    if (g.rng() < 0.28) spawnPickup(g, h.x, h.y, "eagle");
    return;
  }
  const chance = h.kind === "hunter" ? 0.2 : 0.08;
  if (g.rng() > chance) return;
  if (g.rng() < 0.45) spawnPickup(g, h.x, h.y, "shells");
  else spawnPickup(g, h.x, h.y, GUN_DROPS[(g.rng() * GUN_DROPS.length) | 0]);
}

function killHuman(g: Game, h: Human) {
  h.alive = false;
  const base = h.kind === "boss" ? 800 : h.kind === "hunter" ? 250 : 100;
  if (g.comboT > 0) g.combo += 1;
  else g.combo = 1;
  g.comboT = 2.4;
  const pts = base * g.combo;
  g.score += pts;
  popup(g, h.x, h.y - 20, g.combo > 1 ? `${pts}  x${g.combo}` : `+${pts}`);
  burst(g, h.x, h.y, h.kind === "boss" ? 28 : 18, h.kind === "boss" ? "#c45a32" : h.kind === "hunter" ? "#d98a3a" : "#e8dcc8", 150);
  g.trauma = Math.min(1, g.trauma + (g.reduced ? 0.08 : h.kind === "boss" ? 0.5 : 0.28));
  g.hitstop = g.reduced ? 0 : h.kind === "boss" ? 0.1 : 0.05;
  maybeDrop(g, h);
  sfxHit();
}

function hurtPlayer(g: Game) {
  const p = g.player;
  if (p.invuln > 0) return;
  p.hp -= 1;
  p.invuln = 0.95;
  g.trauma = Math.min(1, g.trauma + (g.reduced ? 0.16 : 0.55));
  burst(g, p.x, p.y, 14, "#c45a3a", 160);
  sfxHurt();
  if (p.hp <= 0) {
    g.mode = "over";
    g.eagle = null;
    if (g.score > g.best) {
      g.best = g.score;
      writeSave({ best: g.best });
    }
    sfxOver();
  }
}

function dirFromVec(vx: number, vy: number) {
  if (Math.abs(vx) > Math.abs(vy)) return vx > 0 ? 2 : 1;
  return vy > 0 ? 0 : 3;
}

function updateHumans(g: Game, dt: number) {
  const p = g.player;
  for (const h of g.humans) {
    if (!h.alive) continue;
    h.flash = Math.max(0, h.flash - dt);
    h.think -= dt;
    const dx = p.x - h.x;
    const dy = p.y - h.y;
    const dist = Math.hypot(dx, dy) || 1;
    const threat = dist < 210 || (g.player.fireT > 0 && dist < 340);
    const range = h.kind === "boss" ? 640 : 400;

    if (h.state === "stagger") {
      h.hideT -= dt;
      if (h.hideT <= 0) h.state = h.kind === "civilian" ? "flee" : "aim";
    } else if (
      (h.kind === "hunter" || h.kind === "boss") &&
      dist < range &&
      dist > 70 &&
      !underCanopy(h.x, h.y) &&
      !lineBlocked(h.x, h.y, p.x, p.y)
    ) {
      h.state = "aim";
    } else if (threat && h.kind !== "boss") {
      h.state = "flee";
    } else if (h.state === "aim") {
      h.state = "wander";
      h.telegraph = 0;
    }

    let spd = h.kind === "boss" ? 96 : h.kind === "hunter" ? 78 : 88;
    let mx = 0;
    let my = 0;

    if (h.state === "aim") {
      h.aim = Math.atan2(dy, dx);
      h.telegraph += dt;
      h.dir = dirFromVec(dx, dy);
      const wait = h.kind === "boss" ? 0.48 : 0.72;
      if (h.telegraph > wait) {
        fireHunter(g, h);
        h.telegraph = h.kind === "boss" ? -0.32 : -1.1;
      }
      spd = h.kind === "boss" ? 42 : 18;
      mx = dx / dist;
      my = dy / dist;
    } else if (h.state === "flee") {
      const tree = nearestTree(h.x, h.y);
      mx = tree.x - h.x - dx * 0.35;
      my = tree.y - h.y - dy * 0.35;
      spd = h.kind === "hunter" ? 110 : 130;
      const mag = Math.hypot(mx, my) || 1;
      mx /= mag;
      my /= mag;
      if (underCanopy(h.x, h.y) && dist > 90) {
        h.state = "hide";
        h.hideT = 1.6 + g.rng() * 0.8;
        mx = 0;
        my = 0;
      }
    } else if (h.state === "hide") {
      h.hideT -= dt;
      if (h.hideT <= 0) h.state = "wander";
    } else {
      if (h.think <= 0) {
        const a = g.rng() * Math.PI * 2;
        h.vx = Math.cos(a);
        h.vy = Math.sin(a);
        h.think = 1.2 + g.rng() * 2;
      }
      mx = h.vx;
      my = h.vy;
      spd = h.kind === "boss" ? 70 : 52;
    }

    if (h.state !== "aim") {
      const mag = Math.hypot(mx, my);
      if (mag > 0.01) {
        mx /= mag;
        my /= mag;
      }
    }

    let nx = h.x + mx * spd * dt;
    let ny = h.y + my * spd * dt;
    if (inPond(nx, ny, 8)) {
      const out = pushOutPond(nx, ny, 12);
      nx = out.x;
      ny = out.y;
    }
    if (!walkableHuman(nx, ny)) {
      if (walkableHuman(nx, h.y)) ny = h.y;
      else if (walkableHuman(h.x, ny)) nx = h.x;
      else {
        nx = h.x;
        ny = h.y;
        h.think = 0;
      }
    }
    const clamped = clampWorld(nx, ny, 50);
    h.x = clamped.x;
    h.y = clamped.y;
    if (Math.hypot(mx, my) > 0.1) h.dir = dirFromVec(mx, my);
    h.frame += dt * (h.state === "flee" ? 11 : 7);
  }
  g.humans = g.humans.filter((h) => h.alive);
}

function updatePellets(g: Game, dt: number) {
  const p = g.player;
  for (const b of g.pellets) {
    if (!b.alive) continue;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.ttl -= dt;
    if (b.ttl <= 0 || !inWorld(b.x, b.y, 0)) {
      b.alive = false;
      continue;
    }
    if (hitsCover(b.x, b.y)) {
      b.alive = false;
      burst(g, b.x, b.y, 4, "#efe6d4", 50);
      continue;
    }
    if (b.fromPlayer) {
      for (const h of g.humans) {
        if (!h.alive) continue;
        if (Math.hypot(b.x - h.x, b.y - h.y) < h.radius + b.radius) {
          b.alive = false;
          h.hp -= b.dmg;
          h.flash = 0.08;
          if (h.kind === "boss") {
            h.x += b.vx * 0.006;
            h.y += b.vy * 0.006;
          } else {
            h.state = "stagger";
            h.hideT = 0.12;
            h.x += b.vx * 0.02;
            h.y += b.vy * 0.02;
          }
          if (h.hp <= 0) killHuman(g, h);
          else burst(g, h.x, h.y, 6, "#efe6d4", 90);
          break;
        }
      }
    } else if (p.invuln <= 0) {
      const py = p.y - p.alt * 10;
      if (Math.hypot(b.x - p.x, b.y - py) < p.radius + b.radius) {
        b.alive = false;
        hurtPlayer(g);
      }
    }
  }
}

function collectPickup(g: Game, pk: Pickup) {
  pk.alive = false;
  sfxPickup();
  if (pk.kind === "eagle") {
    callEagle(g);
    return;
  }
  if (pk.kind === "shells") {
    const w = WEAPONS[g.player.weapon];
    g.player.shells = w.mag;
    g.player.reload = 0;
    popup(g, g.player.x, g.player.y - 32, "Shells");
    return;
  }
  equipGun(g, pk.kind);
}

function updatePickups(g: Game, dt: number) {
  const p = g.player;
  for (const pk of g.pickups) {
    if (!pk.alive) continue;
    pk.ttl -= dt;
    if (pk.ttl <= 0) {
      pk.alive = false;
      continue;
    }
    if (Math.hypot(pk.x - p.x, pk.y - p.y) < 38) collectPickup(g, pk);
  }
  g.pickups = g.pickups.filter((pk) => pk.alive);
}

function nearestHuman(g: Game, x: number, y: number, max: number): Human | null {
  let best: Human | null = null;
  let bestD = max;
  for (const h of g.humans) {
    if (!h.alive) continue;
    const d = Math.hypot(h.x - x, h.y - y);
    if (d < bestD) {
      bestD = d;
      best = h;
    }
  }
  return best;
}

function updateEagle(g: Game, dt: number) {
  const e = g.eagle;
  if (!e || !e.alive) return;
  e.ttl -= dt;
  e.cooldown = Math.max(0, e.cooldown - dt);
  e.fireT = Math.max(0, e.fireT - dt);
  if (e.ttl <= 0) {
    popup(g, e.x, e.y - 24, "Eagle out");
    g.eagle = null;
    return;
  }
  const p = g.player;
  const prey = nearestHuman(g, e.x, e.y, 520);
  const tx = prey ? prey.x : p.x + Math.cos(g.time * 1.6) * 54;
  const ty = prey ? prey.y : p.y + Math.sin(g.time * 1.6) * 40 - 18;
  const dx = tx - e.x;
  const dy = ty - e.y;
  const dist = Math.hypot(dx, dy) || 1;
  const spd = prey && dist < 180 ? 210 : 280;
  e.vx = (dx / dist) * spd;
  e.vy = (dy / dist) * spd;
  e.x += e.vx * dt;
  e.y += e.vy * dt;
  const hold = clampWorld(e.x, e.y, 36);
  e.x = hold.x;
  e.y = hold.y;
  e.aim = Math.atan2(e.vy, e.vx);
  e.anim += dt * 12;
  if (prey && dist < 260 && e.cooldown <= 0 && !lineBlocked(e.x, e.y, prey.x, prey.y)) {
    const aim = Math.atan2(prey.y - e.y, prey.x - e.x);
    e.aim = aim;
    fireSpread(g, e.x, e.y, aim, 4, 0.2, 760, true, 5, 1);
    e.cooldown = 0.38;
    e.fireT = 0.18;
    sfxShot("rifle");
  }
}

function updateFx(g: Game, dt: number) {
  for (const p of g.particles) {
    if (!p.alive) continue;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.92;
    p.vy *= 0.92;
    p.ttl -= dt;
    if (p.ttl <= 0) p.alive = false;
  }
  for (const p of g.popups) {
    if (!p.alive) continue;
    p.y -= 28 * dt;
    p.ttl -= dt;
    if (p.ttl <= 0) p.alive = false;
  }
}

export function updateGame(g: Game, dt: number, a: Actions) {
  g.time += dt;
  g.trauma = Math.max(0, g.trauma - dt * 1.8);
  g.comboT = Math.max(0, g.comboT - dt);
  if (g.comboT <= 0) g.combo = 0;
  g.bannerT = Math.max(0, g.bannerT - dt);

  if (g.mode === "title") {
    g.camX = WORLD * 0.5 + Math.cos(g.time * 0.12) * 140;
    g.camY = WORLD * 0.42 + Math.sin(g.time * 0.1) * 90;
    if (g.humans.length === 0) {
      for (let i = 0; i < 18; i++) addHuman(g, i % 5 === 0 ? "hunter" : "civilian");
    }
    updateHumans(g, dt * 0.6);
    updateFx(g, dt);
    return;
  }

  if (g.mode !== "playing") {
    updateFx(g, dt);
    return;
  }

  if (g.hitstop > 0) {
    g.hitstop -= dt;
    updateFx(g, dt);
    return;
  }

  const p = g.player;
  p.cooldown = Math.max(0, p.cooldown - dt);
  p.reload = Math.max(0, p.reload - dt);
  p.fireT = Math.max(0, p.fireT - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  if (p.weaponT > 0) {
    p.weaponT -= dt;
    if (p.weaponT <= 0 && p.weapon !== "shotgun") {
      p.weapon = "shotgun";
      p.shells = WEAPONS.shotgun.mag;
      popup(g, p.x, p.y - 32, "Pump");
    }
  }
  if (p.reload <= 0 && p.shells <= 0) p.shells = WEAPONS[p.weapon].mag;
  if (a.reloadPressed && p.reload <= 0 && p.shells < WEAPONS[p.weapon].mag) {
    p.reload = WEAPONS[p.weapon].reload;
    p.shells = 0;
    sfxReload();
  }

  p.vx = a.moveX * FLY_SPEED;
  p.vy = a.moveY * FLY_SPEED;
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  const c = clampWorld(p.x, p.y, 40);
  p.x = c.x;
  p.y = c.y;

  const spd = Math.hypot(p.vx, p.vy);
  if (spd > 8) p.yaw = Math.atan2(-p.vx, -p.vy);
  p.anim += dt * (spd > 20 ? 10 : 5);
  p.alt += ((p.fireT > 0 ? 0.55 : 1) - p.alt) * (1 - Math.exp(-10 * dt));

  if (a.usingMouseAim) {
    const wx = g.camX + (a.mouseX - g.viewW / 2);
    const wy = g.camY + (a.mouseY - g.viewH / 2);
    p.aim = Math.atan2(wy - p.y, wx - p.x);
  } else if (Math.hypot(a.aimX, a.aimY) > 0.2) {
    p.aim = Math.atan2(a.aimY, a.aimX);
  } else if (a.usingTouch && a.fire) {
    const best = nearestHuman(g, p.x, p.y, 340);
    if (best) p.aim = Math.atan2(best.y - p.y, best.x - p.x);
    else if (spd > 8) p.aim = Math.atan2(p.vy, p.vx);
  } else if (spd > 8) {
    p.aim = Math.atan2(p.vy, p.vx);
  }

  if (a.firePressed) g.fireBuf = 0.14;
  g.fireBuf = Math.max(0, g.fireBuf - dt);
  if (a.fire || g.fireBuf > 0) {
    if (firePlayer(g)) g.fireBuf = 0;
  }

  updateHumans(g, dt);
  updateEagle(g, dt);
  updatePickups(g, dt);
  updatePellets(g, dt);
  updateFx(g, dt);

  if (g.humans.length === 0 && g.bannerT <= 0) spawnWave(g, g.wave + 1);

  const look = 70;
  const tx = p.x + Math.cos(p.aim) * look;
  const ty = p.y + Math.sin(p.aim) * look - 18;
  const k = 1 - Math.exp(-5.2 * dt);
  g.camX += (tx - g.camX) * k;
  g.camY += (ty - g.camY) * k;
}

export function weaponName(id: WeaponId) {
  return WEAPONS[id].name;
}
