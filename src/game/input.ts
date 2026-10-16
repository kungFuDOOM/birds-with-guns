const GAME_CODES = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowLeft",
  "ArrowDown",
  "ArrowRight",
  "Space",
  "KeyR",
  "Escape",
  "Enter",
]);

export type Actions = {
  moveX: number;
  moveY: number;
  aimX: number;
  aimY: number;
  fire: boolean;
  firePressed: boolean;
  reloadPressed: boolean;
  pausePressed: boolean;
  startPressed: boolean;
  mouseX: number;
  mouseY: number;
  usingMouseAim: boolean;
  usingTouch: boolean;
};

const keys = new Set<string>();
const injected = new Set<string>();
let prevFire = false;
let prevReload = false;
let prevPause = false;
let prevStart = false;
let mouseX = 0;
let mouseY = 0;
let hasMouse = false;
let touchMoveX = 0;
let touchMoveY = 0;
let touchFire = false;
let usingTouch = false;
let canvas: HTMLCanvasElement | null = null;

function activeKeys(): Set<string> {
  if (injected.size) return injected;
  return keys;
}

function onKeyDown(e: KeyboardEvent) {
  if (GAME_CODES.has(e.code)) e.preventDefault();
  keys.add(e.code);
}

function onKeyUp(e: KeyboardEvent) {
  keys.delete(e.code);
}

function onBlur() {
  keys.clear();
}

function onMouseMove(e: PointerEvent) {
  if (!canvas) return;
  if (e.pointerType === "touch") return;
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
  hasMouse = true;
  usingTouch = false;
}

function onMouseDown(e: PointerEvent) {
  if (e.pointerType === "touch") return;
  if (e.button === 0) keys.add("Mouse0");
  hasMouse = true;
}

function onMouseUp(e: PointerEvent) {
  if (e.button === 0) keys.delete("Mouse0");
}

function onCancel() {
  keys.delete("Mouse0");
  touchFire = false;
}

function radial(x: number, y: number, dz = 0.18) {
  const m = Math.hypot(x, y);
  if (m < dz) return { x: 0, y: 0 };
  const scale = (m - dz) / (1 - dz) / m;
  return { x: x * scale, y: y * scale };
}

export function attachInput(el: HTMLCanvasElement) {
  canvas = el;
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) keys.clear();
  });
  el.addEventListener("pointermove", onMouseMove);
  el.addEventListener("pointerdown", onMouseDown);
  window.addEventListener("pointerup", onMouseUp);
  window.addEventListener("pointercancel", onCancel);
}

export function detachInput() {
  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("keyup", onKeyUp);
  window.removeEventListener("blur", onBlur);
  canvas?.removeEventListener("pointermove", onMouseMove);
  canvas?.removeEventListener("pointerdown", onMouseDown);
  window.removeEventListener("pointerup", onMouseUp);
  window.removeEventListener("pointercancel", onCancel);
  canvas = null;
}

export function setTouchMove(x: number, y: number) {
  touchMoveX = x;
  touchMoveY = y;
  usingTouch = true;
}

export function setTouchFire(on: boolean) {
  touchFire = on;
  usingTouch = true;
}

export function setInjectedKeys(codes: string[]) {
  injected.clear();
  for (const c of codes) injected.add(c);
}

export function pollActions(): Actions {
  const k = activeKeys();
  let moveX = 0;
  let moveY = 0;
  if (k.has("KeyA") || k.has("ArrowLeft")) moveX -= 1;
  if (k.has("KeyD") || k.has("ArrowRight")) moveX += 1;
  if (k.has("KeyW") || k.has("ArrowUp")) moveY -= 1;
  if (k.has("KeyS") || k.has("ArrowDown")) moveY += 1;

  const pads = typeof navigator !== "undefined" ? navigator.getGamepads() : [];
  let aimX = 0;
  let aimY = 0;
  let padFire = false;
  let padStart = false;
  for (const pad of pads) {
    if (!pad || pad.mapping !== "standard") continue;
    const ls = radial(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
    moveX += ls.x;
    moveY += ls.y;
    const rs = radial(pad.axes[2] ?? 0, pad.axes[3] ?? 0, 0.25);
    aimX += rs.x;
    aimY += rs.y;
    if (pad.buttons[0]?.pressed || (pad.buttons[7]?.value ?? 0) > 0.4) padFire = true;
    if (pad.buttons[9]?.pressed) padStart = true;
  }

  moveX += touchMoveX;
  moveY += touchMoveY;

  const mag = Math.hypot(moveX, moveY);
  if (mag > 1) {
    moveX /= mag;
    moveY /= mag;
  }

  const fire =
    k.has("Space") || k.has("Mouse0") || touchFire || padFire;
  const reload = k.has("KeyR");
  const pause = k.has("Escape");
  const start = k.has("Enter") || padStart;

  const firePressed = fire && !prevFire;
  const reloadPressed = reload && !prevReload;
  const pausePressed = pause && !prevPause;
  const startPressed = start && !prevStart;
  prevFire = fire;
  prevReload = reload;
  prevPause = pause;
  prevStart = start;

  return {
    moveX,
    moveY,
    aimX,
    aimY,
    fire,
    firePressed,
    reloadPressed,
    pausePressed,
    startPressed,
    mouseX,
    mouseY,
    usingMouseAim: hasMouse && Math.hypot(aimX, aimY) < 0.2 && !usingTouch,
    usingTouch,
  };
}
