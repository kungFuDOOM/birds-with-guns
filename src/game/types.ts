import type { BirdId, GameModeId, PerkId, WeaponId } from "./config.ts";

export type Mode = "boot" | "title" | "playing" | "paused" | "over";

export type HumanKind = "civilian" | "hunter" | "sniper" | "trapper" | "pyro" | "boss";
export type HumanState = "wander" | "flee" | "hide" | "aim" | "stagger";

export type Human = {
  alive: boolean;
  kind: HumanKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  dir: number;
  frame: number;
  state: HumanState;
  think: number;
  aim: number;
  telegraph: number;
  flash: number;
  radius: number;
  hideT: number;
  burnT: number;
  burnTick: number;
  enraged: boolean;
  elite: boolean;
};

export type Pellet = {
  alive: boolean;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  ttl: number;
  fromPlayer: boolean;
  radius: number;
  dmg: number;
  color: string;
  pierce: number;
  ricochet: number;
  explosive: boolean;
  incendiary: boolean;
  netSlow: boolean;
};

export type ParticleKind = "dot" | "feather" | "shell" | "ring" | "snatch" | "leaf" | "fire";

export type Particle = {
  alive: boolean;
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl: number;
  max: number;
  size: number;
  color: string;
  rot: number;
  vrot: number;
  variant: number;
};

export type Popup = {
  alive: boolean;
  x: number;
  y: number;
  text: string;
  color: string;
  scale: number;
  ttl: number;
  max: number;
};

export type PickupKind = WeaponId | "eagle" | "shells" | "medkit" | "frenzy";

export type Pickup = {
  alive: boolean;
  kind: PickupKind;
  x: number;
  y: number;
  ttl: number;
};

export type Barrel = {
  alive: boolean;
  x: number;
  y: number;
  hp: number;
  flash: number;
  radius: number;
};

export type Hazard = {
  alive: boolean;
  kind: "fire" | "trap";
  x: number;
  y: number;
  radius: number;
  ttl: number;
  maxTtl: number;
  fromPlayer: boolean;
};

export type Ally = {
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  aim: number;
  anim: number;
  cooldown: number;
  fireT: number;
  ttl: number;
};

export type Afterimage = {
  x: number;
  y: number;
  alt: number;
  aim: number;
  anim: number;
  ttl: number;
  max: number;
};

export type Player = {
  bird: BirdId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  yaw: number;
  aim: number;
  bank: number;
  alt: number;
  hp: number;
  maxHp: number;
  shield: number;
  shells: number;
  cooldown: number;
  reload: number;
  reloadMax: number;
  activeReloadReady: boolean;
  overchargeT: number;
  frenzyT: number;
  slowT: number;
  dashT: number;
  dashCooldown: number;
  dashCooldownMax: number;
  dashVx: number;
  dashVy: number;
  fireT: number;
  invuln: number;
  anim: number;
  radius: number;
  weapon: WeaponId;
  weaponT: number;
  weaponTMax: number;
  perks: Record<PerkId, number>;
};

export type RadarBlip = {
  x: number;
  y: number;
  kind: "civilian" | "hunter" | "sniper" | "trapper" | "pyro" | "boss" | "pickup" | "barrel";
};

export type CareerStats = {
  totalKills: number;
  bossesKilled: number;
  bestCombo: number;
  highestWave: number;
  gamesPlayed: number;
  barrelsPopped: number;
  swoopKills: number;
};

export type Game = {
  mode: Mode;
  gameMode: GameModeId;
  time: number;
  modeTimer: number;
  player: Player;
  humans: Human[];
  pellets: Pellet[];
  particles: Particle[];
  popups: Popup[];
  pickups: Pickup[];
  barrels: Barrel[];
  hazards: Hazard[];
  afterimages: Afterimage[];
  eagle: Ally | null;
  camX: number;
  camY: number;
  trauma: number;
  viewW: number;
  viewH: number;
  score: number;
  best: number;
  combo: number;
  comboT: number;
  maxComboRun: number;
  killsRun: number;
  bossKillsRun: number;
  swoopKillsRun: number;
  wave: number;
  waveSubtitle: string;
  banner: string;
  bannerT: number;
  streakBanner: string;
  streakBannerT: number;
  perkChoices: PerkId[];
  perkOfferT: number;
  hitstop: number;
  fireBuf: number;
  dashBuf: number;
  muted: boolean;
  autoFire: boolean;
  reduced: boolean;
  stats: CareerStats;
  rng: () => number;
};

export type HudSnap = {
  mode: Mode;
  gameMode: GameModeId;
  bird: BirdId;
  score: number;
  best: number;
  wave: number;
  waveSubtitle: string;
  modeTimer: number;
  hp: number;
  maxHp: number;
  shield: number;
  shells: number;
  maxShells: number;
  reloadProgress: number;
  activeReloadReady: boolean;
  dashProgress: number;
  weapon: string;
  weaponId: WeaponId;
  weaponTimeLeft: number;
  weaponTimeMax: number;
  eagleT: number;
  frenzyT: number;
  overchargeT: number;
  combo: number;
  comboProgress: number;
  banner: string;
  streakBanner: string;
  bossHp: number;
  bossMaxHp: number;
  bossName: string;
  enemiesRemaining: number;
  perkChoices: PerkId[];
  perkOfferT: number;
  activePerks: { id: PerkId; count: number }[];
  killsRun: number;
  maxComboRun: number;
  stats: CareerStats;
  muted: boolean;
  autoFire: boolean;
  loading: boolean;
};

export type ControlsProbe = {
  getYaw: () => number;
  getSpeed: () => number;
  setSteer?: (v: number) => void;
  setKeys?: (codes: string[]) => void;
  getMode?: () => string;
  getShells?: () => number;
  getScore?: () => number;
};

declare global {
  interface Window {
    __controlsTest?: ControlsProbe;
  }
}
