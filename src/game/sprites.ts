export type Sheet = {
  img: HTMLImageElement;
  cols: number;
  rows: number;
};

export type Art = {
  hawkFly: Sheet | null;
  hawkShoot: Sheet | null;
  hiker: Sheet | null;
  hunter: Sheet | null;
  boss: Sheet | null;
  eagle: Sheet | null;
  pickups: Sheet | null;
  snatch: Sheet | null;
  muzzle: Sheet | null;
  meadow: HTMLImageElement | null;
  tree: HTMLImageElement | null;
  farmhouse: HTMLImageElement | null;
  hay: HTMLImageElement | null;
  hay2: HTMLImageElement | null;
  bush: HTMLImageElement | null;
  stone: HTMLImageElement | null;
};

/** Public-folder URL. Vite `base` is `/` on Vercel and `/birds-with-guns/` on Pages. */
function publicAsset(file: string): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${base}${file.replace(/^\//, "")}`;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function sheet(img: HTMLImageElement | null, cols: number, rows: number): Sheet | null {
  if (!img) return null;
  return { img, cols, rows };
}

export async function loadArt(): Promise<Art> {
  const [
    hawkFly,
    hawkShoot,
    hiker,
    hunter,
    boss,
    eagle,
    pickups,
    snatch,
    muzzle,
    meadow,
    tree,
    farmhouse,
    hay,
    hay2,
    bush,
    stone,
  ] = await Promise.all([
    loadImage(publicAsset("/sprites/hawk-fly.png")),
    loadImage(publicAsset("/sprites/hawk-shoot.png")),
    loadImage(publicAsset("/sprites/hiker.png")),
    loadImage(publicAsset("/sprites/hunter.png")),
    loadImage(publicAsset("/sprites/boss.png")),
    loadImage(publicAsset("/sprites/eagle.png")),
    loadImage(publicAsset("/sprites/pickups.png")),
    loadImage(publicAsset("/sprites/snatch.png")),
    loadImage(publicAsset("/sprites/muzzle.png")),
    loadImage(publicAsset("/sprites/meadow.png")),
    loadImage(publicAsset("/sprites/tree.png")),
    loadImage(publicAsset("/sprites/farmhouse.png")),
    loadImage(publicAsset("/sprites/hay.png")),
    loadImage(publicAsset("/sprites/hay2.png")),
    loadImage(publicAsset("/sprites/bush.png")),
    loadImage(publicAsset("/sprites/stone.png")),
  ]);
  return {
    hawkFly: sheet(hawkFly, 4, 4),
    hawkShoot: sheet(hawkShoot, 2, 2),
    hiker: sheet(hiker, 4, 4),
    hunter: sheet(hunter, 4, 4),
    boss: sheet(boss, 4, 4),
    eagle: sheet(eagle, 4, 4),
    pickups: sheet(pickups, 2, 2),
    snatch: sheet(snatch, 2, 2),
    muzzle: sheet(muzzle, 2, 2),
    meadow,
    tree,
    farmhouse,
    hay,
    hay2,
    bush,
    stone,
  };
}

export function drawSheet(
  ctx: CanvasRenderingContext2D,
  sheet: Sheet,
  col: number,
  row: number,
  x: number,
  y: number,
  w: number,
  h: number,
  flash = false,
  tilt = 0,
  filter = "",
) {
  const fw = sheet.img.width / sheet.cols;
  const fh = sheet.img.height / sheet.rows;
  const sx = Math.max(0, Math.min(sheet.cols - 1, col | 0)) * fw;
  const sy = Math.max(0, Math.min(sheet.rows - 1, row | 0)) * fh;
  ctx.save();
  ctx.translate(x, y - h / 2);
  if (tilt !== 0) ctx.rotate(tilt);
  if (flash) {
    ctx.filter = "brightness(2.3) contrast(1.25) saturate(0.3)";
  } else if (filter) {
    ctx.filter = filter;
  }
  ctx.drawImage(sheet.img, sx, sy, fw, fh, -w / 2, -h / 2, w, h);
  if (flash) {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.55;
    ctx.drawImage(sheet.img, sx, sy, fw, fh, -w / 2, -h / 2, w, h);
  }
  ctx.restore();
}

