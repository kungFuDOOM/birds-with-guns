export const WORLD = 2048;
export const STEP = 1 / 60;
export const MAX_HP = 5;
export const MAX_SHELLS = 3;
export const FLY_SPEED = 260;
export const PELLET_POOL = 380;
export const PARTICLE_POOL = 450;

export const POND = { x: 560, y: 1460, rx: 310, ry: 230 };

export const TREES = [
  { x: 360, y: 360, canopy: 92 },
  { x: 1020, y: 280, canopy: 86 },
  { x: 1720, y: 700, canopy: 96 },
  { x: 1540, y: 1580, canopy: 88 },
  { x: 780, y: 1020, canopy: 80 },
  { x: 430, y: 1788, canopy: 84 },
  { x: 1320, y: 920, canopy: 84 },
  { x: 620, y: 580, canopy: 78 },
] as const;

export const FARM = { x: 1660, y: 340, w: 210, h: 176 };

export const DECOR = [
  { kind: "hay" as const, x: 1490, y: 430, s: 54 },
  { kind: "hay2" as const, x: 1768, y: 455, s: 58 },
  { kind: "bush" as const, x: 900, y: 740, s: 48 },
  { kind: "bush" as const, x: 1240, y: 1640, s: 50 },
  { kind: "stone" as const, x: 1100, y: 1100, s: 40 },
  { kind: "hay" as const, x: 300, y: 680, s: 50 },
  { kind: "hay2" as const, x: 860, y: 1380, s: 54 },
  { kind: "stone" as const, x: 1560, y: 1120, s: 44 },
  { kind: "bush" as const, x: 480, y: 1080, s: 48 },
  { kind: "stone" as const, x: 720, y: 360, s: 38 },
];

export const BARREL_SPOTS = [
  { x: 1540, y: 470 },
  { x: 1040, y: 840 },
  { x: 680, y: 1180 },
  { x: 1380, y: 1340 },
  { x: 520, y: 500 },
  { x: 1660, y: 980 },
] as const;

export type WeaponId = "shotgun" | "scatter" | "rifle" | "cannon" | "smg" | "flare";

export type WeaponDef = {
  id: WeaponId;
  name: string;
  tagline: string;
  pellets: number;
  spread: number;
  speed: number;
  cooldown: number;
  mag: number;
  reload: number;
  dmg: number;
  radius: number;
  kick: number;
  recoilVel: number;
  color: string;
  pierce: number;
  explosive: boolean;
  incendiary: boolean;
};

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  shotgun: {
    id: "shotgun",
    name: "Pump",
    tagline: "Reliable 12-gauge buckshot spread",
    pellets: 8,
    spread: 0.38,
    speed: 740,
    cooldown: 0.28,
    mag: 4,
    reload: 1.2,
    dmg: 1,
    radius: 7,
    kick: 0.36,
    recoilVel: 38,
    color: "#f3efe6",
    pierce: 0,
    explosive: false,
    incendiary: false,
  },
  scatter: {
    id: "scatter",
    name: "Scattergun",
    tagline: "14-pellet room-broom with heavy knockback",
    pellets: 14,
    spread: 0.76,
    speed: 680,
    cooldown: 0.32,
    mag: 6,
    reload: 1.15,
    dmg: 1,
    radius: 6.5,
    kick: 0.44,
    recoilVel: 58,
    color: "#f7d996",
    pierce: 0,
    explosive: false,
    incendiary: false,
  },
  rifle: {
    id: "rifle",
    name: "Bird rifle",
    tagline: "High-velocity armor-piercing hunting slug",
    pellets: 1,
    spread: 0.015,
    speed: 1280,
    cooldown: 0.13,
    mag: 10,
    reload: 0.95,
    dmg: 2.5,
    radius: 5.5,
    kick: 0.18,
    recoilVel: 20,
    color: "#a8e6ff",
    pierce: 1,
    explosive: false,
    incendiary: false,
  },
  cannon: {
    id: "cannon",
    name: "Goose gun",
    tagline: "Punt-gun shell that detonates into shrapnel",
    pellets: 1,
    spread: 0.01,
    speed: 580,
    cooldown: 0.58,
    mag: 4,
    reload: 1.35,
    dmg: 6,
    radius: 14,
    kick: 0.62,
    recoilVel: 92,
    color: "#ff9e5e",
    pierce: 0,
    explosive: true,
    incendiary: false,
  },
  smg: {
    id: "smg",
    name: "Talon SMG",
    tagline: "Twin-barrel rapid-fire submachine gun",
    pellets: 2,
    spread: 0.14,
    speed: 920,
    cooldown: 0.085,
    mag: 16,
    reload: 0.88,
    dmg: 1,
    radius: 5,
    kick: 0.12,
    recoilVel: 12,
    color: "#ffe48f",
    pierce: 0,
    explosive: false,
    incendiary: false,
  },
  flare: {
    id: "flare",
    name: "Flare Launcher",
    tagline: "Tri-burst incendiary shells that scorch targets",
    pellets: 3,
    spread: 0.28,
    speed: 640,
    cooldown: 0.36,
    mag: 5,
    reload: 1.15,
    dmg: 1.5,
    radius: 9,
    kick: 0.4,
    recoilVel: 42,
    color: "#ff6438",
    pierce: 0,
    explosive: false,
    incendiary: true,
  },
};

export const GUN_DROPS: WeaponId[] = ["scatter", "rifle", "cannon", "smg", "flare"];

export type BirdId = "hawk" | "eagle" | "falcon" | "owl";

export type BirdDef = {
  id: BirdId;
  name: string;
  callsign: string;
  perk: string;
  hp: number;
  speed: number;
  dashCooldown: number;
  dmgMult: number;
  reloadMult: number;
  critChance: number;
  ricochet: boolean;
  tint: string;
  accentColor: string;
};

export const BIRDS: Record<BirdId, BirdDef> = {
  hawk: {
    id: "hawk",
    name: "Red-Tailed Hawk",
    callsign: "Buckshot",
    perk: "+15% reload speed · Balanced apex hunter",
    hp: 5,
    speed: 265,
    dashCooldown: 2.6,
    dmgMult: 1.0,
    reloadMult: 0.85,
    critChance: 0.12,
    ricochet: false,
    tint: "",
    accentColor: "#d98a3a",
  },
  eagle: {
    id: "eagle",
    name: "Bald Eagle",
    callsign: "Old Glory",
    perk: "7 HP · +25% gun damage · Heavy shockwave swoop",
    hp: 7,
    speed: 240,
    dashCooldown: 3.0,
    dmgMult: 1.25,
    reloadMult: 0.95,
    critChance: 0.15,
    ricochet: false,
    tint: "",
    accentColor: "#e8c27a",
  },
  falcon: {
    id: "falcon",
    name: "Peregrine Falcon",
    callsign: "Strikewing",
    perk: "+25% flight speed · Fast swoop refills 2 shells",
    hp: 4,
    speed: 325,
    dashCooldown: 1.65,
    dmgMult: 1.05,
    reloadMult: 0.8,
    critChance: 0.2,
    ricochet: false,
    tint: "hue-rotate(-18deg) saturate(1.25) brightness(1.08)",
    accentColor: "#6ec6ff",
  },
  owl: {
    id: "owl",
    name: "Great Horned Owl",
    callsign: "Nightwing",
    perk: "Ricochet pellets · 35% crit chance · Silent wings",
    hp: 5,
    speed: 260,
    dashCooldown: 2.3,
    dmgMult: 1.1,
    reloadMult: 0.88,
    critChance: 0.35,
    ricochet: true,
    tint: "sepia(0.35) hue-rotate(15deg) brightness(1.12) contrast(1.1)",
    accentColor: "#c89eff",
  },
};

export const BIRD_LIST: BirdDef[] = [
  BIRDS.hawk,
  BIRDS.eagle,
  BIRDS.falcon,
  BIRDS.owl,
];

export type GameModeId = "hunt" | "blitz" | "boss_rush";

export type GameModeDef = {
  id: GameModeId;
  name: string;
  subtitle: string;
  desc: string;
};

export const GAME_MODES: Record<GameModeId, GameModeDef> = {
  hunt: {
    id: "hunt",
    name: "Open Season",
    subtitle: "Escalating Waves",
    desc: "Clear escalating poaching parties, unlock mid-run perks, and defeat the Warden every 3rd wave.",
  },
  blitz: {
    id: "blitz",
    name: "2-Min Blitz",
    subtitle: "120s Score Attack",
    desc: "Non-stop spawns, double ordnance crates, and rapid frenzy multipliers against the clock.",
  },
  boss_rush: {
    id: "boss_rush",
    name: "Warden Showdown",
    subtitle: "Boss Gauntlet",
    desc: "Every wave drops an armed Warden and elite sharpshooters. Heavy weapons spawn immediately.",
  },
};

export const GAME_MODE_LIST: GameModeDef[] = [
  GAME_MODES.hunt,
  GAME_MODES.blitz,
  GAME_MODES.boss_rush,
];

export type PerkId =
  | "hollow_point"
  | "quick_talons"
  | "feather_vest"
  | "flock_leader"
  | "tailwind"
  | "scavenger";

export type PerkDef = {
  id: PerkId;
  name: string;
  desc: string;
  color: string;
};

export const PERKS: Record<PerkId, PerkDef> = {
  hollow_point: {
    id: "hollow_point",
    name: "Lead Talons",
    desc: "+25% pellet damage & heavy knockback",
    color: "#ff8c5a",
  },
  quick_talons: {
    id: "quick_talons",
    name: "Hair Trigger",
    desc: "+22% fire rate & faster reloads",
    color: "#f7d996",
  },
  feather_vest: {
    id: "feather_vest",
    name: "Iron Plumage",
    desc: "+1 Max HP, heal +2 HP & +1 Golden Shield",
    color: "#7be088",
  },
  flock_leader: {
    id: "flock_leader",
    name: "Flock Command",
    desc: "Call Eagle Wingman now & +5s duration",
    color: "#6ec6ff",
  },
  tailwind: {
    id: "tailwind",
    name: "Jetstream",
    desc: "+15% flight speed & -25% Swoop cooldown",
    color: "#c89eff",
  },
  scavenger: {
    id: "scavenger",
    name: "Magpie Cache",
    desc: "+40% special gun duration & +2 mag capacity",
    color: "#ffd166",
  },
};

export const PERK_LIST: PerkDef[] = [
  PERKS.hollow_point,
  PERKS.quick_talons,
  PERKS.feather_vest,
  PERKS.flock_leader,
  PERKS.tailwind,
  PERKS.scavenger,
];
