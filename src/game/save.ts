import type { BirdId, GameModeId } from "./config.ts";
import type { CareerStats } from "./types.ts";

const KEY = "human-season-v1";
const VERSION = 2;

export type SaveData = {
  version: number;
  best: number;
  muted: boolean;
  autoFire: boolean;
  bird: BirdId;
  gameMode: GameModeId;
  stats: CareerStats;
};

const defaultStats: CareerStats = {
  totalKills: 0,
  bossesKilled: 0,
  bestCombo: 0,
  highestWave: 1,
  gamesPlayed: 0,
  barrelsPopped: 0,
  swoopKills: 0,
};

const defaults: SaveData = {
  version: VERSION,
  best: 0,
  muted: false,
  autoFire: false,
  bird: "hawk",
  gameMode: "hunt",
  stats: { ...defaultStats },
};

function migrate(raw: Partial<SaveData>): SaveData {
  const s: SaveData = {
    ...defaults,
    ...raw,
    stats: {
      ...defaultStats,
      ...(raw.stats ?? {}),
    },
  };
  s.version = VERSION;
  return s;
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return migrate({});
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return migrate(parsed);
  } catch {
    return migrate({});
  }
}

export function writeSave(data: Partial<SaveData>): void {
  try {
    const current = loadSave();
    const next = migrate({
      ...current,
      ...data,
      stats: {
        ...current.stats,
        ...(data.stats ?? {}),
      },
    });
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota */
  }
}
