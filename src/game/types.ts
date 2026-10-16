import type { WeaponId } from "./config";

export type Mode = "boot" | "title" | "playing" | "paused" | "over";

export type HumanKind = "civilian" | "hunter" | "boss";
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
};

export type Pellet = {
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl: number;
  fromPlayer: boolean;
  radius: number;
  dmg: number;
};

export type Particle = {
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl: number;
  max: number;
  size: number;
  color: string;
};

export type Popup = {
  alive: boolean;
  x: number;
  y: number;
  text: string;
  ttl: number;
  max: number;
};

export type PickupKind = WeaponId | "eagle" | "shells";

export type Pickup = {
  alive: boolean;
  kind: PickupKind;
  x: number;
  y: number;
  ttl: number;
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

export type Player = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  yaw: number;
  aim: number;
  alt: number;
  hp: number;
  shells: number;
  cooldown: number;
  reload: number;
  fireT: number;
  invuln: number;
  anim: number;
  radius: number;
  weapon: WeaponId;
  weaponT: number;
};

export type Game = {
  mode: Mode;
  time: number;
  player: Player;
  humans: Human[];
  pellets: Pellet[];
  particles: Particle[];
  popups: Popup[];
  pickups: Pickup[];
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
  wave: number;
  banner: string;
  bannerT: number;
  hitstop: number;
  fireBuf: number;
  muted: boolean;
  reduced: boolean;
  rng: () => number;
};

export type HudSnap = {
  mode: Mode;
  score: number;
  best: number;
  wave: number;
  hp: number;
  shells: number;
  maxShells: number;
  weapon: string;
  eagleT: number;
  combo: number;
  banner: string;
  muted: boolean;
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
