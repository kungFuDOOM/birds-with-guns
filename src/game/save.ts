const KEY = "human-season-v1";
const VERSION = 1;

type SaveData = {
  version: number;
  best: number;
  muted: boolean;
};

const defaults: SaveData = { version: VERSION, best: 0, muted: false };

function migrate(raw: SaveData): SaveData {
  const s = { ...defaults, ...raw };
  s.version = VERSION;
  return s;
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw) as SaveData;
    return migrate(parsed);
  } catch {
    return { ...defaults };
  }
}

export function writeSave(data: Partial<SaveData>): void {
  try {
    const next = migrate({ ...loadSave(), ...data });
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota */
  }
}
