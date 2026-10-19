import {
  BARREL_SPOTS,
  BIRDS,
  GUN_DROPS,
  PARTICLE_POOL,
  PELLET_POOL,
  PERK_LIST,
  PERKS,
  WEAPONS,
  WORLD,
  type BirdId,
  type GameModeId,
  type PerkId,
  type WeaponId,
} from "./config.ts";
import type {
  Game,
  Human,
  HumanKind,
  ParticleKind,
  Pellet,
  Pickup,
  PickupKind,
  Player,
} from "./types.ts";
import type { Actions } from "./input.ts";
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
} from "./world.ts";
import { loadSave, writeSave } from "./save.ts";
import {
  sfxDash,
  sfxExplosion,
  sfxHit,
  sfxHurt,
  sfxOver,
  sfxPerk,
  sfxPickup,
  sfxReload,
  sfxScreech,
  sfxShot,
  sfxWave,
} from "./audio.ts";

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
    prevX: 0,
    prevY: 0,
    vx: 0,
    vy: 0,
    ttl: 0,
    fromPlayer: true,
    radius: 5,
    dmg: 1,
    color: "#f3efe6",
    pierce: 0,
    ricochet: 0,
    explosive: false,
    incendiary: false,
    netSlow: false,
  }));
}

function emptyPerks(): Record<PerkId, number> {
  return {
    hollow_point: 0,
    quick_talons: 0,
    feather_vest: 0,
    flock_leader: 0,
    tailwind: 0,
    scavenger: 0,
  };
}

function makePlayer(bird: BirdId = "hawk"): Player {
  const b = BIRDS[bird];
  return {
    bird,
    x: WORLD * 0.5,
    y: WORLD * 0.45,
    vx: 0,
    vy: 0,
    yaw: 0,
    aim: -Math.PI / 2,
    bank: 0,
    alt: 1,
    hp: b.hp,
    maxHp: b.hp,
    shield: 0,
    shells: WEAPONS.shotgun.mag,
    cooldown: 0,
    reload: 0,
    reloadMax: WEAPONS.shotgun.reload * b.reloadMult,
    activeReloadReady: false,
    overchargeT: 0,
    frenzyT: 0,
    slowT: 0,
    dashT: 0,
    dashCooldown: 0,
    dashCooldownMax: b.dashCooldown,
    dashVx: 0,
    dashVy: 0,
    fireT: 0,
    invuln: 0,
    anim: 0,
    radius: 22,
    weapon: "shotgun",
    weaponT: 0,
    weaponTMax: 0,
    perks: emptyPerks(),
  };
}

export function maxMagForPlayer(p: Player): number {
  const base = WEAPONS[p.weapon].mag;
  const extra = p.perks.scavenger * 2 + (p.bird === "eagle" ? 1 : 0);
  return base + extra;
}

export function reloadDurationForPlayer(p: Player): number {
  const w = WEAPONS[p.weapon];
  const b = BIRDS[p.bird];
  const perkMult = Math.pow(0.82, p.perks.quick_talons);
  return Math.max(0.35, w.reload * b.reloadMult * perkMult);
}

export function createGameState(): Game {
  const save = loadSave();
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return {
    mode: "boot",
    gameMode: save.gameMode,
    time: 0,
    modeTimer: 0,
    player: makePlayer(save.bird),
    humans: [],
    pellets: poolPellets(),
    particles: Array.from({ length: PARTICLE_POOL }, () => ({
      alive: false,
      kind: "dot" as ParticleKind,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      ttl: 0,
      max: 1,
      size: 3,
      color: "#e8dcc8",
      rot: 0,
      vrot: 0,
      variant: 0,
    })),
    popups: Array.from({ length: 36 }, () => ({
      alive: false,
      x: 0,
      y: 0,
      text: "",
      color: "#f3efe6",
      scale: 1,
      ttl: 0,
      max: 1,
    })),
    pickups: [],
    barrels: [],
    hazards: [],
    afterimages: [],
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
    maxComboRun: 0,
    killsRun: 0,
    bossKillsRun: 0,
    swoopKillsRun: 0,
    wave: 0,
    waveSubtitle: "",
    banner: "",
    bannerT: 0,
    streakBanner: "",
    streakBannerT: 0,
    perkChoices: [],
    perkOfferT: 0,
    hitstop: 0,
    fireBuf: 0,
    dashBuf: 0,
    muted: save.muted,
    autoFire: save.autoFire,
    reduced,
    stats: save.stats,
    rng: mulberry(0x9e3779b9),
  };
}

export function selectBird(g: Game, bird: BirdId) {
  g.player.bird = bird;
  const b = BIRDS[bird];
  g.player.hp = b.hp;
  g.player.maxHp = b.hp;
  g.player.dashCooldownMax = b.dashCooldown;
  writeSave({ bird });
}

export function selectGameMode(g: Game, gameMode: GameModeId) {
  g.gameMode = gameMode;
  writeSave({ gameMode });
}

export function toggleAutoFire(g: Game) {
  g.autoFire = !g.autoFire;
  writeSave({ autoFire: g.autoFire });
}

function spawnParticle(
  g: Game,
  kind: ParticleKind,
  x: number,
  y: number,
  vx: number,
  vy: number,
  size: number,
  color: string,
  maxTtl: number,
  variant = 0,
) {
  for (const p of g.particles) {
    if (p.alive) continue;
    p.alive = true;
    p.kind = kind;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.max = maxTtl;
    p.ttl = maxTtl;
    p.size = size;
    p.color = color;
    p.rot = g.rng() * Math.PI * 2;
    p.vrot = (g.rng() - 0.5) * 10;
    p.variant = variant;
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
  kind: ParticleKind = "dot",
) {
  for (let i = 0; i < n; i++) {
    const a = g.rng() * Math.PI * 2;
    const s = speed * (0.35 + g.rng() * 0.85);
    spawnParticle(
      g,
      kind,
      x,
      y,
      Math.cos(a) * s,
      Math.sin(a) * s,
      kind === "feather" ? 5 + g.rng() * 5 : 2 + g.rng() * 4,
      color,
      0.35 + g.rng() * 0.38,
      (g.rng() * 4) | 0,
    );
  }
}

function spawnSnatchFx(g: Game, x: number, y: number, size = 48, variant = -1) {
  const v = variant >= 0 ? variant : (g.rng() * 4) | 0;
  spawnParticle(g, "snatch", x, y, 0, -12, size, "#ffffff", 0.28, v);
}

function spawnRingFx(g: Game, x: number, y: number, maxRadius: number, color = "#f3efe6") {
  spawnParticle(g, "ring", x, y, 0, 0, maxRadius, color, 0.34, 0);
}

function popup(
  g: Game,
  x: number,
  y: number,
  text: string,
  color = "#f3efe6",
  scale = 1,
) {
  for (const p of g.popups) {
    if (p.alive) continue;
    p.alive = true;
    p.x = x;
    p.y = y;
    p.text = text;
    p.color = color;
    p.scale = scale;
    p.max = 0.95;
    p.ttl = p.max;
    return;
  }
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
  ttl = fromPlayer ? 0.46 : 0.62,
  opts?: {
    color?: string;
    pierce?: number;
    ricochet?: number;
    explosive?: boolean;
    incendiary?: boolean;
    netSlow?: boolean;
  },
) {
  for (const p of g.pellets) {
    if (p.alive) continue;
    p.alive = true;
    p.x = x;
    p.y = y;
    p.prevX = x;
    p.prevY = y;
    p.vx = vx;
    p.vy = vy;
    p.ttl = ttl;
    p.fromPlayer = fromPlayer;
    p.radius = radius;
    p.dmg = dmg;
    p.color = opts?.color ?? (fromPlayer ? "#f3efe6" : "#d9a15c");
    p.pierce = opts?.pierce ?? 0;
    p.ricochet = opts?.ricochet ?? 0;
    p.explosive = opts?.explosive ?? false;
    p.incendiary = opts?.incendiary ?? false;
    p.netSlow = opts?.netSlow ?? false;
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
    if (Math.hypot(x - px, y - py) < 220) continue;
    let crowded = false;
    for (const h of g.humans) {
      if (!h.alive) continue;
      if (Math.hypot(h.x - x, h.y - y) < 68) {
        crowded = true;
        break;
      }
    }
    if (crowded) continue;
    return { x, y };
  }
  return { x: 120 + g.rng() * (WORLD - 240), y: 120 + g.rng() * (WORLD - 240) };
}

function addHuman(g: Game, kind: HumanKind) {
  const p = pickSpawn(g);
  const hp =
    kind === "boss"
      ? 36 + g.wave * 7
      : kind === "trapper" || kind === "pyro"
        ? 3
        : kind === "hunter" || kind === "sniper"
          ? 2
          : 1;
  const elite = kind === "civilian" ? g.rng() < 0.18 : kind !== "boss" && g.rng() < 0.14;
  const finalHp = elite && kind !== "civilian" ? hp + 1 : hp;
  g.humans.push({
    alive: true,
    kind,
    x: p.x,
    y: p.y,
    vx: 0,
    vy: 0,
    hp: finalHp,
    maxHp: finalHp,
    dir: (g.rng() * 4) | 0,
    frame: 0,
    state: "wander",
    think: 0.2 + g.rng() * 1.1,
    aim: 0,
    telegraph: 0,
    flash: 0,
    radius: kind === "boss" ? 36 : kind === "trapper" ? 24 : kind === "civilian" ? 20 : 22,
    hideT: 0,
    burnT: 0,
    burnTick: 0,
    enraged: false,
    elite,
  });
}

function spawnBarrels(g: Game) {
  g.barrels = [];
  for (const spot of BARREL_SPOTS) {
    if (g.rng() < 0.85) {
      g.barrels.push({
        alive: true,
        x: spot.x + (g.rng() - 0.5) * 28,
        y: spot.y + (g.rng() - 0.5) * 28,
        hp: 2,
        flash: 0,
        radius: 20,
      });
    }
  }
}

function offerWavePerks(g: Game) {
  const pool = [...PERK_LIST];
  const picks: PerkId[] = [];
  while (picks.length < 3 && pool.length > 0) {
    const idx = (g.rng() * pool.length) | 0;
    picks.push(pool[idx].id);
    pool.splice(idx, 1);
  }
  g.perkChoices = picks;
  g.perkOfferT = 8.5;
}

export function choosePerk(g: Game, index: number) {
  if (g.perkChoices.length === 0 || index < 0 || index >= g.perkChoices.length) return;
  const id = g.perkChoices[index];
  const def = PERKS[id];
  const p = g.player;
  p.perks[id] = (p.perks[id] ?? 0) + 1;
  g.perkChoices = [];
  g.perkOfferT = 0;

  switch (id) {
    case "hollow_point":
      popup(g, p.x, p.y - 44, "Lead Talons +25% DMG", def.color, 1.2);
      break;
    case "quick_talons":
      p.reloadMax = reloadDurationForPlayer(p);
      popup(g, p.x, p.y - 44, "Hair Trigger!", def.color, 1.2);
      break;
    case "feather_vest":
      p.maxHp += 1;
      p.hp = Math.min(p.maxHp, p.hp + 2);
      p.shield = Math.min(3, p.shield + 1);
      popup(g, p.x, p.y - 44, "+1 Max HP & Shield!", def.color, 1.2);
      break;
    case "flock_leader":
      callEagle(g, 5);
      break;
    case "tailwind":
      p.dashCooldownMax = Math.max(0.95, p.dashCooldownMax * 0.78);
      popup(g, p.x, p.y - 44, "Jetstream Speed!", def.color, 1.2);
      break;
    case "scavenger":
      p.shells = maxMagForPlayer(p);
      popup(g, p.x, p.y - 44, "Magpie Cache!", def.color, 1.2);
      break;
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
  spawnRingFx(g, p.x, p.y - 16, 68, def.color);
  sfxPerk();
}

const WAVE_EVENTS = [
  "Opening Day",
  "Poacher Patrol",
  "Warden's Warrant",
  "Sharpshooter Ridge",
  "Trapper's Ambush",
  "Scorched Meadow",
] as const;

function spawnWave(g: Game, wave: number) {
  g.humans = [];
  g.hazards = [];
  spawnBarrels(g);

  const isBossRush = g.gameMode === "boss_rush";
  const isBlitz = g.gameMode === "blitz";

  if (isBossRush) {
    addHuman(g, "boss");
    if (wave >= 3) addHuman(g, "boss");
    const escorts = Math.min(3 + wave * 2, 12);
    for (let i = 0; i < escorts; i++) {
      const r = g.rng();
      addHuman(g, r < 0.35 ? "sniper" : r < 0.65 ? "trapper" : "hunter");
    }
    for (let i = 0; i < 6; i++) addHuman(g, "civilian");
    g.waveSubtitle = `Showdown Stage ${wave}`;
  } else {
    const civ = Math.min(18 + (wave - 1) * 4, 42);
    const hun = Math.min(3 + wave, 12);
    const snipers = wave >= 2 ? Math.min(1 + ((wave / 2) | 0), 5) : 0;
    const trappers = wave >= 2 ? Math.min(1 + (((wave - 1) / 2) | 0), 4) : 0;
    const pyros = wave >= 3 ? Math.min(((wave - 1) / 2) | 0, 4) : 0;

    for (let i = 0; i < civ; i++) addHuman(g, "civilian");
    for (let i = 0; i < hun; i++) addHuman(g, "hunter");
    for (let i = 0; i < snipers; i++) addHuman(g, "sniper");
    for (let i = 0; i < trappers; i++) addHuman(g, "trapper");
    for (let i = 0; i < pyros; i++) addHuman(g, "pyro");
    if (wave % 3 === 0 || (isBlitz && wave % 2 === 0)) {
      addHuman(g, "boss");
    }
    g.waveSubtitle = WAVE_EVENTS[(wave - 1) % WAVE_EVENTS.length];
  }

  const stash = (isBlitz || isBossRush ? 4 : 2) + (wave > 2 ? 1 : 0);
  for (let i = 0; i < stash; i++) {
    const s = pickSpawn(g);
    spawnPickup(g, s.x, s.y, GUN_DROPS[(g.rng() * GUN_DROPS.length) | 0]);
  }
  if (wave > 1) {
    const medSpot = pickSpawn(g);
    spawnPickup(g, medSpot.x, medSpot.y, g.rng() < 0.5 ? "medkit" : "frenzy");
  }

  g.wave = wave;
  const hasBoss = g.humans.some((h) => h.alive && h.kind === "boss");
  g.banner = hasBoss
    ? `Wave ${wave} · The Warden`
    : `Wave ${wave} · ${g.waveSubtitle}`;
  g.bannerT = 2.0;

  if (g.player.weapon === "shotgun") {
    g.player.shells = maxMagForPlayer(g.player);
    g.player.reload = 0;
  }
  if (wave > 1 && g.player.hp < g.player.maxHp) {
    g.player.hp += 1;
  }
  if (wave > 1) {
    offerWavePerks(g);
  }
  if (wave > g.stats.highestWave) {
    g.stats.highestWave = wave;
    writeSave({ stats: g.stats });
  }
  sfxWave();
}

export function startHunt(g: Game) {
  g.rng = mulberry((Date.now() ^ 0x2c1b3c6d) >>> 0);
  const chosenBird = g.player.bird;
  g.player = makePlayer(chosenBird);
  g.score = 0;
  g.combo = 0;
  g.comboT = 0;
  g.maxComboRun = 0;
  g.killsRun = 0;
  g.bossKillsRun = 0;
  g.swoopKillsRun = 0;
  g.trauma = 0;
  g.pickups = [];
  g.barrels = [];
  g.hazards = [];
  g.afterimages = [];
  g.perkChoices = [];
  g.perkOfferT = 0;
  g.streakBanner = "";
  g.streakBannerT = 0;
  g.eagle = null;
  g.modeTimer = g.gameMode === "blitz" ? 120 : 0;
  for (const p of g.pellets) p.alive = false;
  for (const p of g.particles) p.alive = false;
  for (const pop of g.popups) pop.alive = false;
  g.stats.gamesPlayed += 1;
  writeSave({ stats: g.stats });
  spawnWave(g, 1);
  g.mode = "playing";
  g.camX = g.player.x;
  g.camY = g.player.y;
}

function equipGun(g: Game, id: WeaponId) {
  const p = g.player;
  p.weapon = id;
  const dur = id === "shotgun" ? 0 : 24 * (1 + p.perks.scavenger * 0.4);
  p.weaponT = dur;
  p.weaponTMax = dur;
  p.shells = maxMagForPlayer(p);
  p.reload = 0;
  p.reloadMax = reloadDurationForPlayer(p);
  p.cooldown = 0;
  const w = WEAPONS[id];
  popup(g, p.x, p.y - 38, w.name, w.color, 1.18);
  spawnRingFx(g, p.x, p.y - 16, 48, w.color);
}

function spawnPickup(g: Game, x: number, y: number, kind: PickupKind) {
  const spot = clampWorld(x + (g.rng() - 0.5) * 36, y + (g.rng() - 0.5) * 36, 50);
  g.pickups.push({
    alive: true,
    kind,
    x: spot.x,
    y: spot.y,
    ttl: 18,
  });
}

function callEagle(g: Game, bonusTtl = 0) {
  const p = g.player;
  const extra = p.perks.flock_leader * 5 + bonusTtl;
  if (g.eagle?.alive) {
    g.eagle.ttl = Math.min(30, g.eagle.ttl + 10 + extra);
    popup(g, p.x, p.y - 44, "Eagle Extended!", "#6ec6ff", 1.15);
    sfxScreech();
    return;
  }
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
    ttl: 14 + extra,
  };
  g.banner = "Eagle Wingman Inbound";
  g.bannerT = 1.4;
  popup(g, p.x, p.y - 44, "Ally Eagle", "#6ec6ff", 1.2);
  sfxScreech();
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
  opts?: {
    color?: string;
    pierce?: number;
    ricochet?: number;
    explosive?: boolean;
    incendiary?: boolean;
    netSlow?: boolean;
    ttl?: number;
  },
) {
  const count = Math.max(1, n);
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1) - 0.5;
    const a = aim + t * spread + (g.rng() - 0.5) * (spread * 0.18 + 0.015);
    const spd = speed + (g.rng() - 0.5) * 70;
    spawnPellet(
      g,
      x + Math.cos(aim) * 18,
      y + Math.sin(aim) * 18,
      Math.cos(a) * spd,
      Math.sin(a) * spd,
      fromPlayer,
      radius,
      dmg,
      opts?.ttl ?? (fromPlayer ? 0.48 : 0.62),
      opts,
    );
  }
}

function ejectShellCasing(g: Game, x: number, y: number, aim: number, color = "#e6be6a") {
  const side = aim + Math.PI * 0.55 + (g.rng() - 0.5) * 0.4;
  const spd = 75 + g.rng() * 55;
  spawnParticle(
    g,
    "shell",
    x - Math.cos(aim) * 6,
    y - Math.sin(aim) * 6,
    Math.cos(side) * spd,
    Math.sin(side) * spd - 35,
    4.5,
    color,
    0.55,
  );
}

function firePlayer(g: Game) {
  const p = g.player;
  if (p.reload > 0 || p.cooldown > 0 || p.shells <= 0) return false;
  const w = WEAPONS[p.weapon];
  const birdDef = BIRDS[p.bird];

  if (p.frenzyT <= 0) {
    p.shells -= 1;
  }
  const rateMult =
    Math.pow(0.84, p.perks.quick_talons) * (p.frenzyT > 0 ? 0.62 : 1);
  p.cooldown = w.cooldown * rateMult;
  p.fireT = 0.28;
  p.alt = 0.58;

  const isCrit = g.rng() < birdDef.critChance || p.overchargeT > 0;
  const dmg =
    w.dmg *
    birdDef.dmgMult *
    (1 + p.perks.hollow_point * 0.25) *
    (isCrit ? 1.5 : 1);

  fireSpread(g, p.x, p.y, p.aim, w.pellets, w.spread, w.speed, true, w.radius, dmg, {
    color: isCrit ? "#ffe169" : w.color,
    pierce: w.pierce,
    ricochet: birdDef.ricochet ? 1 : 0,
    explosive: w.explosive,
    incendiary: w.incendiary,
    ttl: w.id === "rifle" ? 0.62 : w.id === "cannon" ? 0.52 : 0.46,
  });

  ejectShellCasing(
    g,
    p.x,
    p.y - p.alt * 32,
    p.aim,
    w.id === "flare" ? "#ff6438" : w.id === "cannon" ? "#d97538" : "#e6be6a",
  );

  // Subtle recoil impulse
  p.x -= Math.cos(p.aim) * w.recoilVel * 0.08;
  p.y -= Math.sin(p.aim) * w.recoilVel * 0.08;

  g.trauma = Math.min(1, g.trauma + (g.reduced ? 0.08 : w.kick));
  if (!g.reduced && w.id === "cannon") {
    g.hitstop = Math.max(g.hitstop, 0.025);
  }
  sfxShot(w.id);

  if (p.shells <= 0) {
    if (p.weapon !== "shotgun") {
      p.weapon = "shotgun";
      p.weaponT = 0;
      p.weaponTMax = 0;
    }
    p.reloadMax = reloadDurationForPlayer(p);
    p.reload = p.reloadMax;
    p.activeReloadReady = true;
    sfxReload(false);
  }
  return true;
}

function triggerDash(g: Game, a: Actions) {
  const p = g.player;
  if (p.dashCooldown > 0 || p.dashT > 0) return false;
  let dx = a.moveX;
  let dy = a.moveY;
  if (Math.hypot(dx, dy) < 0.1) {
    dx = Math.cos(p.aim);
    dy = Math.sin(p.aim);
  } else {
    const m = Math.hypot(dx, dy);
    dx /= m;
    dy /= m;
  }
  const spd = BIRDS[p.bird].speed * 2.55;
  p.dashVx = dx * spd;
  p.dashVy = dy * spd;
  p.dashT = 0.24;
  p.dashCooldownMax =
    BIRDS[p.bird].dashCooldown * Math.pow(0.78, p.perks.tailwind);
  p.dashCooldown = p.dashCooldownMax;
  p.invuln = Math.max(p.invuln, 0.36);
  p.slowT = 0;
  p.alt = 0.32;
  burst(g, p.x, p.y - 20, 12, BIRDS[p.bird].accentColor, 180, "feather");
  spawnRingFx(g, p.x, p.y - 20, 52, BIRDS[p.bird].accentColor);
  sfxDash();
  return true;
}

function explodeAt(
  g: Game,
  x: number,
  y: number,
  radius: number,
  dmg: number,
  fromPlayer: boolean,
) {
  sfxExplosion();
  spawnRingFx(g, x, y, radius, "#ff9e5e");
  spawnSnatchFx(g, x, y, 76, 1);
  burst(g, x, y, 26, "#ff7b3a", 220, "fire");
  burst(g, x, y, 14, "#f3efe6", 170, "feather");
  g.trauma = Math.min(1, g.trauma + (g.reduced ? 0.15 : 0.62));
  g.hitstop = g.reduced ? 0 : 0.06;

  g.hazards.push({
    alive: true,
    kind: "fire",
    x,
    y,
    radius: radius * 0.48,
    ttl: 4.0,
    maxTtl: 4.0,
    fromPlayer,
  });

  for (const h of g.humans) {
    if (!h.alive) continue;
    const d = Math.hypot(h.x - x, h.y - y);
    if (d <= radius + h.radius) {
      const falloff = 1 - (d / (radius + h.radius)) * 0.45;
      h.hp -= Math.max(1, dmg * falloff);
      h.flash = 0.14;
      h.burnT = 2.8;
      const push = 42;
      const ang = Math.atan2(h.y - y, h.x - x);
      h.x += Math.cos(ang) * push;
      h.y += Math.sin(ang) * push;
      if (h.hp <= 0) killHuman(g, h, false);
    }
  }

  for (const b of g.barrels) {
    if (!b.alive) continue;
    if (Math.hypot(b.x - x, b.y - y) < radius + b.radius && Math.hypot(b.x - x, b.y - y) > 4) {
      b.alive = false;
      g.stats.barrelsPopped += 1;
      popup(g, b.x, b.y - 24, "CHAIN BOOM!", "#ff9e5e", 1.25);
      explodeAt(g, b.x, b.y, 130, 8, true);
    }
  }
}

function fireHunter(g: Game, h: Human) {
  const p = g.player;
  const lead = h.kind === "boss" || h.kind === "sniper" ? 0.42 : 0.15;
  const a = Math.atan2(p.y + p.vy * lead - h.y, p.x + p.vx * lead - h.x);

  switch (h.kind) {
    case "boss": {
      fireSpread(g, h.x, h.y, a, 14, 0.52, 530, false, 8, 1, {
        color: "#ff9e5e",
      });
      fireSpread(g, h.x, h.y, a + 0.1, 7, 0.24, 570, false, 7, 1, {
        color: "#ffd166",
      });
      if (h.enraged) {
        for (let i = 0; i < 12; i++) {
          const ang = (i / 12) * Math.PI * 2 + g.time;
          spawnPellet(
            g,
            h.x + Math.cos(ang) * 20,
            h.y + Math.sin(ang) * 20,
            Math.cos(ang) * 390,
            Math.sin(ang) * 390,
            false,
            7,
            1,
            0.85,
            { color: "#ff6438" },
          );
        }
      }
      burst(g, h.x, h.y, 14, "#e8c27a", 130);
      sfxShot("cannon");
      break;
    }
    case "sniper": {
      fireSpread(g, h.x, h.y, a, 1, 0.01, 860, false, 6, 1, {
        color: "#ff5c5c",
        ttl: 0.78,
      });
      burst(g, h.x, h.y, 8, "#ff8c7a", 110);
      sfxShot("rifle");
      break;
    }
    case "trapper": {
      fireSpread(g, h.x, h.y, a, 4, 0.34, 430, false, 7.5, 1, {
        color: "#a8e6cf",
        netSlow: true,
        ttl: 0.65,
      });
      burst(g, h.x, h.y, 7, "#a8e6cf", 90);
      sfxShot("shotgun");
      break;
    }
    case "pyro": {
      fireSpread(g, h.x, h.y, a, 3, 0.25, 440, false, 7, 1, {
        color: "#ff6438",
        incendiary: true,
        ttl: 0.6,
      });
      burst(g, h.x, h.y, 10, "#ff6438", 100, "fire");
      sfxShot("flare");
      break;
    }
    case "hunter":
    case "civilian": {
      fireSpread(g, h.x, h.y, a, 5, 0.28, 410, false, 5, 1, {
        color: "#d9a15c",
      });
      burst(g, h.x, h.y, 6, "#e8c27a", 80);
      sfxShot("shotgun");
      break;
    }
    default: {
      const _exhaustive: never = h.kind;
      return _exhaustive;
    }
  }
}

function maybeDrop(g: Game, h: Human) {
  if (h.kind === "boss") {
    spawnPickup(g, h.x + 28, h.y - 10, GUN_DROPS[(g.rng() * GUN_DROPS.length) | 0]);
    spawnPickup(g, h.x - 24, h.y + 12, "medkit");
    spawnPickup(g, h.x, h.y, g.rng() < 0.55 ? "eagle" : "frenzy");
    return;
  }
  if (h.elite && h.kind === "civilian") {
    const roll = g.rng();
    const kind: PickupKind =
      roll < 0.35
        ? "medkit"
        : roll < 0.65
          ? GUN_DROPS[(g.rng() * GUN_DROPS.length) | 0]
          : "frenzy";
    spawnPickup(g, h.x, h.y, kind);
    return;
  }
  const baseChance =
    h.kind === "sniper" || h.kind === "trapper" || h.kind === "pyro"
      ? 0.32
      : h.kind === "hunter"
        ? 0.22
        : 0.09;
  const chance = g.gameMode === "blitz" ? baseChance * 1.5 : baseChance;
  if (g.rng() > chance) return;
  const r = g.rng();
  if (r < 0.35) spawnPickup(g, h.x, h.y, "shells");
  else if (r < 0.48) spawnPickup(g, h.x, h.y, "medkit");
  else if (r < 0.56) spawnPickup(g, h.x, h.y, "frenzy");
  else if (r < 0.62) spawnPickup(g, h.x, h.y, "eagle");
  else spawnPickup(g, h.x, h.y, GUN_DROPS[(g.rng() * GUN_DROPS.length) | 0]);
}

function checkKillStreak(g: Game) {
  if (g.combo === 5) {
    g.streakBanner = "FLOCK FURY! x5";
    g.streakBannerT = 1.5;
  } else if (g.combo === 10) {
    g.streakBanner = "APEX PREDATOR! x10";
    g.streakBannerT = 1.6;
    sfxScreech();
  } else if (g.combo === 15) {
    g.streakBanner = "AVIAN OVERLORD! x15";
    g.streakBannerT = 1.8;
    sfxScreech();
  } else if (g.combo >= 20 && g.combo % 5 === 0) {
    g.streakBanner = `EXTINCTION EVENT! x${g.combo}`;
    g.streakBannerT = 1.9;
    sfxScreech();
  }
}

function killHuman(g: Game, h: Human, bySwoop = false) {
  if (!h.alive) return;
  h.alive = false;
  const base =
    h.kind === "boss"
      ? 900
      : h.kind === "sniper" || h.kind === "trapper" || h.kind === "pyro"
        ? 350
        : h.kind === "hunter"
          ? 250
          : h.elite
            ? 200
            : 100;
  if (g.comboT > 0) g.combo += 1;
  else g.combo = 1;
  g.comboT = 2.8;
  if (g.combo > g.maxComboRun) g.maxComboRun = g.combo;
  if (g.combo > g.stats.bestCombo) g.stats.bestCombo = g.combo;

  g.killsRun += 1;
  g.stats.totalKills += 1;
  if (h.kind === "boss") {
    g.bossKillsRun += 1;
    g.stats.bossesKilled += 1;
  }
  if (bySwoop) {
    g.swoopKillsRun += 1;
    g.stats.swoopKills += 1;
    const refill = g.player.bird === "falcon" ? 2 : 1;
    g.player.shells = Math.min(maxMagForPlayer(g.player), g.player.shells + refill);
    g.player.reload = 0;
  }

  const pts = base * g.combo * (bySwoop ? 2 : 1);
  g.score += pts;
  const label = bySwoop
    ? `TALON BAG +${pts}`
    : g.combo > 1
      ? `+${pts}  x${g.combo}`
      : `+${pts}`;
  popup(
    g,
    h.x,
    h.y - 24,
    label,
    bySwoop ? "#ffd166" : h.kind === "boss" ? "#ff8c5a" : "#f3efe6",
    h.kind === "boss" || bySwoop ? 1.25 : 1,
  );

  spawnSnatchFx(g, h.x, h.y - 18, h.kind === "boss" ? 84 : 52);
  burst(
    g,
    h.x,
    h.y - 14,
    h.kind === "boss" ? 30 : 16,
    h.kind === "boss" ? "#c45a32" : h.kind === "hunter" ? "#d98a3a" : "#e8dcc8",
    160,
    "feather",
  );
  g.trauma = Math.min(
    1,
    g.trauma + (g.reduced ? 0.08 : h.kind === "boss" ? 0.55 : 0.26),
  );
  g.hitstop = g.reduced ? 0 : h.kind === "boss" ? 0.09 : 0.035;
  maybeDrop(g, h);
  checkKillStreak(g);
  sfxHit(g.combo);
}

function endRun(g: Game) {
  g.mode = "over";
  g.eagle = null;
  if (g.score > g.best) {
    g.best = g.score;
  }
  writeSave({ best: g.best, stats: g.stats });
  sfxOver();
}

function hurtPlayer(g: Game, netSlow = false) {
  const p = g.player;
  if (p.invuln > 0) return;
  if (netSlow) {
    p.slowT = 1.8;
    popup(g, p.x, p.y - 36, "Snared!", "#a8e6cf", 1.1);
  }
  if (p.shield > 0) {
    p.shield -= 1;
    p.invuln = 0.85;
    popup(g, p.x, p.y - 38, "Shield Absorbed!", "#ffd166", 1.15);
    spawnRingFx(g, p.x, p.y - 20, 56, "#ffd166");
    sfxHit(1);
    return;
  }
  p.hp -= 1;
  p.invuln = 1.0;
  g.trauma = Math.min(1, g.trauma + (g.reduced ? 0.16 : 0.55));
  spawnSnatchFx(g, p.x, p.y - 24, 56, 0);
  burst(g, p.x, p.y - 20, 16, "#c45a3a", 165, "feather");
  sfxHurt();
  if (p.hp <= 0) {
    endRun(g);
  }
}

function dirFromVec(vx: number, vy: number) {
  if (Math.abs(vx) > Math.abs(vy)) return vx > 0 ? 2 : 1;
  return vy > 0 ? 0 : 3;
}

function updateHumans(g: Game, dt: number) {
  const p = g.player;
  const owlStealth = p.bird === "owl" ? 0.82 : 1;

  for (const h of g.humans) {
    if (!h.alive) continue;
    h.flash = Math.max(0, h.flash - dt);
    h.think -= dt;

    if (h.burnT > 0) {
      h.burnT -= dt;
      h.burnTick -= dt;
      if (h.burnTick <= 0) {
        h.burnTick = 0.35;
        h.hp -= 0.7;
        h.flash = 0.06;
        spawnParticle(g, "fire", h.x + (g.rng() - 0.5) * 16, h.y - 18, 0, -35, 5, "#ff6438", 0.3);
        if (h.hp <= 0) {
          killHuman(g, h, false);
          continue;
        }
      }
    }

    if (h.kind === "boss" && !h.enraged && h.hp <= h.maxHp * 0.5) {
      h.enraged = true;
      g.banner = "Warden Enraged!";
      g.bannerT = 1.5;
      spawnRingFx(g, h.x, h.y - 20, 96, "#ff5c5c");
      sfxScreech();
    }

    const dx = p.x - h.x;
    const dy = p.y - h.y;
    const dist = Math.hypot(dx, dy) || 1;
    const threat = dist < 210 * owlStealth || (g.player.fireT > 0 && dist < 340 * owlStealth);
    const range =
      h.kind === "boss"
        ? 660
        : h.kind === "sniper"
          ? 620
          : h.kind === "trapper"
            ? 340
            : 410 * owlStealth;

    if (h.state === "stagger") {
      h.hideT -= dt;
      if (h.hideT <= 0) h.state = h.kind === "civilian" ? "flee" : "aim";
    } else if (
      h.kind !== "civilian" &&
      dist < range &&
      dist > 65 &&
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

    let spd =
      h.kind === "boss"
        ? h.enraged
          ? 122
          : 96
        : h.kind === "trapper"
          ? 94
          : h.kind === "sniper"
            ? 68
            : h.kind === "hunter"
              ? 78
              : 90;
    let mx = 0;
    let my = 0;

    if (h.state === "aim") {
      h.aim = Math.atan2(dy, dx);
      h.telegraph += dt;
      h.dir = dirFromVec(dx, dy);
      const wait =
        h.kind === "boss"
          ? h.enraged
            ? 0.38
            : 0.5
          : h.kind === "sniper"
            ? 0.92
            : h.kind === "trapper"
              ? 0.62
              : 0.72;
      if (h.telegraph > wait) {
        fireHunter(g, h);
        h.telegraph =
          h.kind === "boss"
            ? h.enraged
              ? -0.22
              : -0.35
            : h.kind === "sniper"
              ? -1.35
              : -1.05;
      }
      spd = h.kind === "boss" ? (h.enraged ? 64 : 44) : h.kind === "sniper" ? 10 : 22;
      mx = dx / dist;
      my = dy / dist;
    } else if (h.state === "flee") {
      const tree = nearestTree(h.x, h.y);
      mx = tree.x - h.x - dx * 0.35;
      my = tree.y - h.y - dy * 0.35;
      spd = h.kind === "civilian" ? (h.elite ? 142 : 130) : 112;
      const mag = Math.hypot(mx, my) || 1;
      mx /= mag;
      my /= mag;
      if (underCanopy(h.x, h.y) && dist > 90) {
        h.state = "hide";
        h.hideT = 1.5 + g.rng() * 0.8;
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
      spd = h.kind === "boss" ? 72 : 54;
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
    b.prevX = b.x;
    b.prevY = b.y;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.ttl -= dt;

    if (b.ttl <= 0 || !inWorld(b.x, b.y, 0)) {
      if (b.explosive && b.fromPlayer) {
        explodeAt(g, b.x, b.y, 105, 5, true);
      }
      b.alive = false;
      continue;
    }

    const cover = hitsCover(b.x, b.y);
    if (cover) {
      if (b.explosive && b.fromPlayer) {
        explodeAt(g, b.x, b.y, 105, 5, true);
        b.alive = false;
        continue;
      }
      if (b.ricochet > 0) {
        b.ricochet -= 1;
        b.x = b.prevX;
        b.y = b.prevY;
        b.vx = -b.vx * 0.92;
        b.vy = -b.vy * 0.92;
        burst(g, b.x, b.y, 4, "#c89eff", 70);
        continue;
      }
      b.alive = false;
      const leafColor = cover === "tree" ? "#d97a38" : cover === "hay" ? "#e8c27a" : "#efe6d4";
      burst(
        g,
        b.x,
        b.y,
        cover === "tree" ? 6 : 4,
        leafColor,
        65,
        cover === "tree" ? "leaf" : "dot",
      );
      continue;
    }

    // Check barrel hits
    let hitBarrel = false;
    for (const br of g.barrels) {
      if (!br.alive) continue;
      if (Math.hypot(b.x - br.x, b.y - br.y) < br.radius + b.radius) {
        b.alive = false;
        hitBarrel = true;
        br.hp -= b.dmg;
        br.flash = 0.1;
        if (br.hp <= 0) {
          br.alive = false;
          g.stats.barrelsPopped += 1;
          popup(g, br.x, br.y - 24, "BOOM!", "#ff9e5e", 1.2);
          explodeAt(g, br.x, br.y, 130, 8, true);
        } else {
          burst(g, br.x, br.y, 5, "#ff9e5e", 80);
        }
        break;
      }
    }
    if (hitBarrel) continue;

    if (b.fromPlayer) {
      for (const h of g.humans) {
        if (!h.alive) continue;
        if (Math.hypot(b.x - h.x, b.y - h.y) < h.radius + b.radius) {
          if (b.explosive) {
            explodeAt(g, b.x, b.y, 110, 6, true);
            b.alive = false;
            break;
          }
          if (b.incendiary) {
            h.burnT = 3.2;
            g.hazards.push({
              alive: true,
              kind: "fire",
              x: h.x,
              y: h.y,
              radius: 36,
              ttl: 3.0,
              maxTtl: 3.0,
              fromPlayer: true,
            });
          }
          h.hp -= b.dmg;
          h.flash = 0.09;
          const kbMult = 1 + p.perks.hollow_point * 0.35;
          if (h.kind === "boss") {
            h.x += b.vx * 0.006 * kbMult;
            h.y += b.vy * 0.006 * kbMult;
          } else {
            h.state = "stagger";
            h.hideT = 0.14;
            h.x += b.vx * 0.022 * kbMult;
            h.y += b.vy * 0.022 * kbMult;
          }
          if (h.hp <= 0) {
            killHuman(g, h, false);
          } else {
            spawnSnatchFx(g, h.x, h.y - 16, 34, 2);
            burst(g, h.x, h.y, 6, "#efe6d4", 90);
          }
          if (b.pierce > 0) {
            b.pierce -= 1;
          } else {
            b.alive = false;
            break;
          }
        }
      }
    } else if (p.invuln <= 0) {
      const py = p.y - p.alt * 10;
      if (Math.hypot(b.x - p.x, b.y - py) < p.radius + b.radius) {
        b.alive = false;
        hurtPlayer(g, b.netSlow);
      }
    }
  }
}

function updateHazards(g: Game, dt: number) {
  for (const br of g.barrels) {
    if (!br.alive) continue;
    br.flash = Math.max(0, br.flash - dt);
  }
  g.barrels = g.barrels.filter((br) => br.alive);

  for (const hz of g.hazards) {
    if (!hz.alive) continue;
    hz.ttl -= dt;
    if (hz.ttl <= 0) {
      hz.alive = false;
      continue;
    }
    if (hz.kind === "fire") {
      if (g.rng() < 0.3) {
        spawnParticle(
          g,
          "fire",
          hz.x + (g.rng() - 0.5) * hz.radius * 1.4,
          hz.y + (g.rng() - 0.5) * hz.radius * 0.8,
          (g.rng() - 0.5) * 20,
          -30 - g.rng() * 30,
          3 + g.rng() * 4,
          "#ff7b3a",
          0.28,
        );
      }
      for (const h of g.humans) {
        if (!h.alive) continue;
        if (Math.hypot(h.x - hz.x, h.y - hz.y) < hz.radius + h.radius * 0.5) {
          h.burnT = Math.max(h.burnT, 1.5);
        }
      }
    }
  }
  g.hazards = g.hazards.filter((hz) => hz.alive);
}

function collectPickup(g: Game, pk: Pickup) {
  pk.alive = false;
  sfxPickup();
  const p = g.player;
  switch (pk.kind) {
    case "eagle":
      callEagle(g);
      return;
    case "shells":
      p.shells = maxMagForPlayer(p);
      p.reload = 0;
      p.overchargeT = Math.max(p.overchargeT, 4.0);
      if (p.weaponT > 0) p.weaponT = Math.min(p.weaponTMax, p.weaponT + 6);
      popup(g, p.x, p.y - 32, "Overcharged Shells!", "#ffe169", 1.15);
      return;
    case "medkit":
      if (p.hp < p.maxHp) {
        p.hp = Math.min(p.maxHp, p.hp + 2);
        popup(g, p.x, p.y - 34, "+2 Plumage HP", "#7be088", 1.15);
      } else {
        p.shield = Math.min(3, p.shield + 1);
        popup(g, p.x, p.y - 34, "+1 Golden Shield!", "#ffd166", 1.15);
      }
      spawnRingFx(g, p.x, p.y - 16, 48, "#7be088");
      return;
    case "frenzy":
      p.frenzyT = 7.5;
      p.shells = maxMagForPlayer(p);
      p.reload = 0;
      g.banner = "Avian Frenzy · Infinite Ammo!";
      g.bannerT = 1.4;
      popup(g, p.x, p.y - 38, "WAR CRY FRENZY!", "#ffd166", 1.25);
      spawnRingFx(g, p.x, p.y - 16, 68, "#ffd166");
      sfxScreech();
      return;
    case "shotgun":
    case "scatter":
    case "rifle":
    case "cannon":
    case "smg":
    case "flare":
      equipGun(g, pk.kind);
      return;
    default: {
      const _exhaustive: never = pk.kind;
      return _exhaustive;
    }
  }
}

function updatePickups(g: Game, dt: number) {
  const p = g.player;
  const magnetRange = 88 + p.perks.scavenger * 35;
  for (const pk of g.pickups) {
    if (!pk.alive) continue;
    pk.ttl -= dt;
    if (pk.ttl <= 0) {
      pk.alive = false;
      continue;
    }
    const dx = p.x - pk.x;
    const dy = p.y - pk.y;
    const d = Math.hypot(dx, dy);
    if (d < 42) {
      collectPickup(g, pk);
    } else if (d < magnetRange && d > 1) {
      pk.x += (dx / d) * 180 * dt;
      pk.y += (dy / d) * 180 * dt;
    }
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
    popup(g, e.x, e.y - 24, "Eagle Out", "#9a9386");
    g.eagle = null;
    return;
  }
  const p = g.player;
  const prey = nearestHuman(g, e.x, e.y, 560);
  const tx = prey ? prey.x : p.x + Math.cos(g.time * 1.6) * 58;
  const ty = prey ? prey.y : p.y + Math.sin(g.time * 1.6) * 44 - 18;
  const dx = tx - e.x;
  const dy = ty - e.y;
  const dist = Math.hypot(dx, dy) || 1;
  const spd = prey && dist < 180 ? 220 : 295;
  e.vx = (dx / dist) * spd;
  e.vy = (dy / dist) * spd;
  e.x += e.vx * dt;
  e.y += e.vy * dt;
  const hold = clampWorld(e.x, e.y, 36);
  e.x = hold.x;
  e.y = hold.y;
  e.aim = Math.atan2(e.vy, e.vx);
  e.anim += dt * 12;
  if (prey && dist < 290 && e.cooldown <= 0 && !lineBlocked(e.x, e.y, prey.x, prey.y)) {
    const aim = Math.atan2(prey.y - e.y, prey.x - e.x);
    e.aim = aim;
    fireSpread(g, e.x, e.y, aim, 4, 0.18, 820, true, 5.5, 1.2, {
      color: "#ffe48f",
    });
    e.cooldown = 0.34;
    e.fireT = 0.18;
    sfxShot("rifle");
  }
}

function updateFx(g: Game, dt: number) {
  if (g.rng() < 0.08 && !g.reduced) {
    spawnParticle(
      g,
      "leaf",
      g.camX - g.viewW * 0.55 + g.rng() * g.viewW * 1.1,
      g.camY - g.viewH * 0.55,
      25 + g.rng() * 35,
      35 + g.rng() * 25,
      4 + g.rng() * 3,
      g.rng() < 0.5 ? "#d98a3a" : "#c45a32",
      2.2,
    );
  }

  for (const p of g.particles) {
    if (!p.alive) continue;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.kind === "shell") {
      p.vy += 190 * dt;
      p.vx *= 0.96;
    } else if (p.kind === "leaf") {
      p.vx += Math.sin(g.time * 3 + p.rot) * 15 * dt;
    } else {
      p.vx *= 0.92;
      p.vy *= 0.92;
    }
    p.rot += p.vrot * dt;
    p.ttl -= dt;
    if (p.ttl <= 0) p.alive = false;
  }
  for (const p of g.popups) {
    if (!p.alive) continue;
    p.y -= 30 * dt;
    p.ttl -= dt;
    if (p.ttl <= 0) p.alive = false;
  }
  for (const af of g.afterimages) {
    af.ttl -= dt;
  }
  g.afterimages = g.afterimages.filter((af) => af.ttl > 0);
}

export function updateGame(g: Game, dt: number, a: Actions) {
  g.time += dt;
  g.trauma = Math.max(0, g.trauma - dt * 1.8);
  g.comboT = Math.max(0, g.comboT - dt);
  if (g.comboT <= 0) g.combo = 0;
  g.bannerT = Math.max(0, g.bannerT - dt);
  g.streakBannerT = Math.max(0, g.streakBannerT - dt);

  if (g.mode === "title") {
    g.camX = WORLD * 0.5 + Math.cos(g.time * 0.12) * 140;
    g.camY = WORLD * 0.42 + Math.sin(g.time * 0.1) * 90;
    if (g.humans.length === 0) {
      for (let i = 0; i < 18; i++) {
        addHuman(g, i % 5 === 0 ? "hunter" : i % 7 === 0 ? "sniper" : "civilian");
      }
    }
    updateHumans(g, dt * 0.6);
    updateFx(g, dt);
    return;
  }

  if (g.mode !== "playing") {
    updateFx(g, dt);
    return;
  }

  if (g.gameMode === "blitz") {
    g.modeTimer = Math.max(0, g.modeTimer - dt);
    if (g.modeTimer <= 0) {
      endRun(g);
      return;
    }
  }

  if (g.perkOfferT > 0) {
    g.perkOfferT -= dt;
    if (a.perkPressed >= 0 && a.perkPressed < g.perkChoices.length) {
      choosePerk(g, a.perkPressed);
    } else if (g.perkOfferT <= 0 && g.perkChoices.length > 0) {
      choosePerk(g, 0);
    }
  }

  if (a.dashPressed) g.dashBuf = 0.15;
  if (a.firePressed) g.fireBuf = 0.14;

  if (g.hitstop > 0) {
    g.hitstop -= dt;
    updateFx(g, dt);
    return;
  }

  const p = g.player;
  const birdDef = BIRDS[p.bird];
  p.cooldown = Math.max(0, p.cooldown - dt);
  p.fireT = Math.max(0, p.fireT - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  p.overchargeT = Math.max(0, p.overchargeT - dt);
  p.frenzyT = Math.max(0, p.frenzyT - dt);
  p.slowT = Math.max(0, p.slowT - dt);
  p.dashCooldown = Math.max(0, p.dashCooldown - dt);

  if (p.weaponT > 0) {
    p.weaponT -= dt;
    if (p.weaponT <= 0 && p.weapon !== "shotgun") {
      p.weapon = "shotgun";
      p.weaponT = 0;
      p.weaponTMax = 0;
      p.shells = maxMagForPlayer(p);
      popup(g, p.x, p.y - 32, "Pump", "#f3efe6");
    }
  }

  if (p.reload > 0) {
    const progress = 1 - p.reload / Math.max(0.1, p.reloadMax);
    if (
      p.activeReloadReady &&
      (a.reloadPressed || a.firePressed) &&
      progress >= 0.35 &&
      progress <= 0.78
    ) {
      p.reload = 0;
      p.activeReloadReady = false;
      p.shells = maxMagForPlayer(p);
      p.overchargeT = Math.max(p.overchargeT, 3.5);
      popup(g, p.x, p.y - 40, "PERFECT RELOAD!", "#ffe169", 1.2);
      spawnRingFx(g, p.x, p.y - 20, 44, "#ffe169");
      sfxReload(true);
    } else {
      p.reload = Math.max(0, p.reload - dt);
      if (p.reload <= 0 && p.shells <= 0) {
        p.shells = maxMagForPlayer(p);
        p.activeReloadReady = false;
      }
    }
  } else if (a.reloadPressed && p.shells < maxMagForPlayer(p)) {
    p.reloadMax = reloadDurationForPlayer(p);
    p.reload = p.reloadMax;
    p.shells = 0;
    p.activeReloadReady = true;
    sfxReload(false);
  }

  if (a.dashPressed) g.dashBuf = 0.15;
  g.dashBuf = Math.max(0, g.dashBuf - dt);
  if (g.dashBuf > 0 && triggerDash(g, a)) {
    g.dashBuf = 0;
  }

  const speedMult =
    (1 + p.perks.tailwind * 0.15) *
    (p.weapon === "smg" ? 1.1 : 1) *
    (p.frenzyT > 0 ? 1.18 : 1) *
    (p.slowT > 0 ? 0.58 : 1);
  const flySpeed = birdDef.speed * speedMult;

  if (p.dashT > 0) {
    p.dashT -= dt;
    p.vx = p.dashVx;
    p.vy = p.dashVy;
    g.afterimages.push({
      x: p.x,
      y: p.y,
      alt: p.alt,
      aim: p.aim,
      anim: p.anim,
      ttl: 0.18,
      max: 0.18,
    });
    for (const h of g.humans) {
      if (!h.alive) continue;
      if (Math.hypot(h.x - p.x, h.y - p.y) < h.radius + p.radius + 18) {
        const swoopDmg = p.bird === "eagle" ? 6 : 3.5;
        h.hp -= swoopDmg;
        h.flash = 0.12;
        h.state = "stagger";
        h.hideT = 0.35;
        h.x += p.vx * 0.04;
        h.y += p.vy * 0.04;
        if (h.hp <= 0) {
          killHuman(g, h, true);
        } else {
          spawnSnatchFx(g, h.x, h.y - 18, 48, 3);
        }
      }
    }
    if (p.dashT <= 0 && p.bird === "eagle") {
      spawnRingFx(g, p.x, p.y - 16, 92, "#e8c27a");
      for (const h of g.humans) {
        if (!h.alive) continue;
        if (Math.hypot(h.x - p.x, h.y - p.y) < 96) {
          h.hp -= 2;
          h.flash = 0.1;
          if (h.hp <= 0) killHuman(g, h, true);
        }
      }
    }
  } else {
    p.vx = a.moveX * flySpeed;
    p.vy = a.moveY * flySpeed;
  }

  p.x += p.vx * dt;
  p.y += p.vy * dt;
  const c = clampWorld(p.x, p.y, 40);
  p.x = c.x;
  p.y = c.y;

  const spd = Math.hypot(p.vx, p.vy);
  if (spd > 8) p.yaw = Math.atan2(-p.vx, -p.vy);
  const targetBank = Math.max(-0.22, Math.min(0.22, (p.vx / flySpeed) * 0.16));
  p.bank += (targetBank - p.bank) * (1 - Math.exp(-12 * dt));
  p.anim += dt * (p.dashT > 0 ? 18 : spd > 20 ? 10 : 5);
  const targetAlt = p.dashT > 0 ? 0.35 : p.fireT > 0 ? 0.55 : 1;
  p.alt += (targetAlt - p.alt) * (1 - Math.exp(-10 * dt));

  if (a.usingMouseAim) {
    const wx = g.camX + (a.mouseX - g.viewW / 2);
    const wy = g.camY + (a.mouseY - g.viewH / 2);
    p.aim = Math.atan2(wy - p.y, wx - p.x);
  } else if (Math.hypot(a.aimX, a.aimY) > 0.2) {
    p.aim = Math.atan2(a.aimY, a.aimX);
  } else if ((a.usingTouch && a.fire) || g.autoFire) {
    const best = nearestHuman(g, p.x, p.y, 380);
    if (best) p.aim = Math.atan2(best.y - p.y, best.x - p.x);
    else if (spd > 8) p.aim = Math.atan2(p.vy, p.vx);
  } else if (spd > 8) {
    p.aim = Math.atan2(p.vy, p.vx);
  }

  if (a.firePressed) g.fireBuf = 0.14;
  g.fireBuf = Math.max(0, g.fireBuf - dt);
  const autoTarget = g.autoFire ? nearestHuman(g, p.x, p.y, 380) : null;
  if (a.fire || g.fireBuf > 0 || (g.autoFire && autoTarget)) {
    if (firePlayer(g)) g.fireBuf = 0;
  }

  updateHumans(g, dt);
  updateEagle(g, dt);
  updatePickups(g, dt);
  updatePellets(g, dt);
  updateHazards(g, dt);
  updateFx(g, dt);

  if (g.humans.length === 0 && g.bannerT <= 0) {
    spawnWave(g, g.wave + 1);
  }

  const look = 72;
  const tx = p.x + Math.cos(p.aim) * look;
  const ty = p.y + Math.sin(p.aim) * look - 18;
  const k = 1 - Math.exp(-5.5 * dt);
  g.camX += (tx - g.camX) * k;
  g.camY += (ty - g.camY) * k;
}

export function weaponName(id: WeaponId) {
  return WEAPONS[id].name;
}
