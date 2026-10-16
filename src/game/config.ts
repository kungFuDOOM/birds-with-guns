export const WORLD = 2048;
export const STEP = 1 / 60;
export const MAX_HP = 5;
export const MAX_SHELLS = 3;
export const FLY_SPEED = 250;
export const PELLET_POOL = 280;
export const PARTICLE_POOL = 280;

export const POND = { x: 560, y: 1460, rx: 310, ry: 230 };

export const TREES = [
  { x: 360, y: 360, canopy: 92 },
  { x: 1020, y: 280, canopy: 86 },
  { x: 1720, y: 700, canopy: 96 },
  { x: 1540, y: 1580, canopy: 88 },
  { x: 780, y: 1020, canopy: 80 },
  { x: 430, y: 1788, canopy: 84 },
] as const;

export const FARM = { x: 1660, y: 340, w: 210, h: 176 };

export const DECOR = [
  { kind: "hay" as const, x: 1490, y: 430, s: 54 },
  { kind: "hay2" as const, x: 1768, y: 455, s: 58 },
  { kind: "bush" as const, x: 900, y: 740, s: 48 },
  { kind: "bush" as const, x: 1240, y: 1640, s: 50 },
  { kind: "stone" as const, x: 1100, y: 1100, s: 40 },
  { kind: "hay" as const, x: 300, y: 680, s: 50 },
];

export type WeaponId = "shotgun" | "scatter" | "rifle" | "cannon";

export type WeaponDef = {
  id: WeaponId;
  name: string;
  pellets: number;
  spread: number;
  speed: number;
  cooldown: number;
  mag: number;
  reload: number;
  dmg: number;
  radius: number;
  kick: number;
};

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  shotgun: {
    id: "shotgun",
    name: "Pump",
    pellets: 8,
    spread: 0.4,
    speed: 700,
    cooldown: 0.3,
    mag: 3,
    reload: 1.35,
    dmg: 1,
    radius: 7,
    kick: 0.38,
  },
  scatter: {
    id: "scatter",
    name: "Scattergun",
    pellets: 14,
    spread: 0.78,
    speed: 640,
    cooldown: 0.34,
    mag: 5,
    reload: 1.2,
    dmg: 1,
    radius: 6,
    kick: 0.44,
  },
  rifle: {
    id: "rifle",
    name: "Bird rifle",
    pellets: 1,
    spread: 0.018,
    speed: 1200,
    cooldown: 0.14,
    mag: 8,
    reload: 1.05,
    dmg: 2,
    radius: 5,
    kick: 0.16,
  },
  cannon: {
    id: "cannon",
    name: "Goose gun",
    pellets: 1,
    spread: 0.012,
    speed: 540,
    cooldown: 0.7,
    mag: 3,
    reload: 1.55,
    dmg: 5,
    radius: 14,
    kick: 0.58,
  },
};

export const GUN_DROPS: WeaponId[] = ["scatter", "rifle", "cannon"];
