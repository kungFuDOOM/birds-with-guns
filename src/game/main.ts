import { STEP, WEAPONS } from "./config";
import {
  attachInput,
  detachInput,
  pollActions,
  setInjectedKeys,
  setTouchFire,
  setTouchMove,
} from "./input";
import { isMuted, resumeAudio, setMuted, unlockAudio } from "./audio";
import { loadArt, type Art } from "./sprites";
import { createGameState, startHunt, updateGame } from "./sim";
import { renderGame } from "./render";
import { writeSave } from "./save";
import type { Game, HudSnap } from "./types";

export type GameApi = {
  start: () => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;
  toggleMute: () => void;
  setTouchMove: (x: number, y: number) => void;
  setTouchFire: (on: boolean) => void;
  destroy: () => void;
};

function snap(g: Game, loading: boolean): HudSnap {
  return {
    mode: g.mode,
    score: g.score,
    best: g.best,
    wave: g.wave,
    hp: g.player.hp,
    shells: g.player.reload > 0 ? 0 : g.player.shells,
    maxShells: WEAPONS[g.player.weapon].mag,
    weapon: WEAPONS[g.player.weapon].name,
    eagleT: g.eagle?.alive ? g.eagle.ttl : 0,
    combo: g.combo,
    banner: g.bannerT > 0 ? g.banner : "",
    muted: g.muted,
    loading,
  };
}

export function createGame(
  canvas: HTMLCanvasElement,
  onHud: (h: HudSnap) => void,
): GameApi {
  const g = createGameState();
  g.muted = isMuted() ? true : g.muted;
  setMuted(g.muted);

  let art: Art | null = null;
  let loading = true;
  let raf = 0;
  let acc = 0;
  let last = performance.now();
  let lastHud = "";
  let running = true;

  attachInput(canvas);

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, canvas.clientWidth);
    const h = Math.max(1, canvas.clientHeight);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    g.viewW = w;
    g.viewH = h;
  };
  resize();
  window.addEventListener("resize", resize);
  window.visualViewport?.addEventListener("resize", resize);

  const onVis = () => {
    if (document.hidden) {
      if (g.mode === "playing") g.mode = "paused";
    } else {
      resumeAudio();
    }
  };
  document.addEventListener("visibilitychange", onVis);

  void loadArt().then((loaded) => {
    art = loaded;
    loading = false;
    if (g.mode === "boot") g.mode = "title";
    pushHud();
  });

  window.__controlsTest = {
    getYaw: () => g.player.yaw,
    getSpeed: () => Math.hypot(g.player.vx, g.player.vy),
    setKeys: (codes: string[]) => setInjectedKeys(codes),
    getMode: () => g.mode,
    getShells: () => g.player.shells,
    getScore: () => g.score,
  };

  function pushHud() {
    const s = snap(g, loading);
    const key = JSON.stringify(s);
    if (key === lastHud) return;
    lastHud = key;
    onHud(s);
  }

  const loop = (now: number) => {
    if (!running) return;
    let dt = (now - last) / 1000;
    last = now;
    dt = Math.min(dt, 0.1);
    const actions = pollActions();

    if (g.mode === "title" && actions.startPressed && !loading) {
      unlockAudio();
      startHunt(g);
    } else if (g.mode === "playing" && actions.pausePressed) {
      g.mode = "paused";
    } else if (g.mode === "paused" && (actions.pausePressed || actions.startPressed)) {
      g.mode = "playing";
    } else if (g.mode === "over" && actions.startPressed) {
      unlockAudio();
      startHunt(g);
    }

    if (g.mode === "boot") {
      g.mode = "title";
    }

    acc += dt;
    while (acc >= STEP) {
      updateGame(g, STEP, actions);
      acc -= STEP;
    }

    const ctx = canvas.getContext("2d");
    if (ctx) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      renderGame(ctx, g, art);
    }
    pushHud();
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  return {
    start: () => {
      unlockAudio();
      startHunt(g);
    },
    pause: () => {
      if (g.mode === "playing") g.mode = "paused";
    },
    resume: () => {
      if (g.mode === "paused") g.mode = "playing";
    },
    restart: () => {
      unlockAudio();
      startHunt(g);
    },
    toggleMute: () => {
      g.muted = !g.muted;
      setMuted(g.muted);
      writeSave({ muted: g.muted });
    },
    setTouchMove,
    setTouchFire,
    destroy: () => {
      running = false;
      cancelAnimationFrame(raf);
      detachInput();
      window.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
      if (window.__controlsTest) delete window.__controlsTest;
    },
  };
}
