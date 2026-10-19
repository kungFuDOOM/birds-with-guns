import {
  PERK_LIST,
  STEP,
  WEAPONS,
  type BirdId,
  type GameModeId,
} from "./config";
import {
  attachInput,
  detachInput,
  pollActions,
  setInjectedKeys,
  setTouchDash,
  setTouchFire,
  setTouchMove,
} from "./input";
import { isMuted, resumeAudio, setMuted, unlockAudio } from "./audio";
import { loadArt, type Art } from "./sprites";
import {
  choosePerk,
  createGameState,
  maxMagForPlayer,
  selectBird,
  selectGameMode,
  startHunt,
  toggleAutoFire,
  updateGame,
} from "./sim";
import { renderGame } from "./render";
import { writeSave } from "./save";
import type { Game, HudSnap } from "./types";

export type GameApi = {
  start: () => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;
  returnToTitle: () => void;
  toggleMute: () => void;
  toggleAutoFire: () => void;
  selectBird: (bird: BirdId) => void;
  selectGameMode: (mode: GameModeId) => void;
  choosePerk: (idx: number) => void;
  setTouchMove: (x: number, y: number) => void;
  setTouchFire: (on: boolean) => void;
  setTouchDash: (on: boolean) => void;
  destroy: () => void;
};

function q(n: number): number {
  return Math.round(n * 10) / 10;
}

function snap(g: Game, loading: boolean): HudSnap {
  const p = g.player;
  const boss = g.humans.find((h) => h.alive && h.kind === "boss");
  const reloadProgress =
    p.reload > 0 && p.reloadMax > 0 ? q(1 - p.reload / p.reloadMax) : 1;
  const dashProgress =
    p.dashCooldown > 0 && p.dashCooldownMax > 0
      ? q(1 - p.dashCooldown / p.dashCooldownMax)
      : 1;
  const activePerks = PERK_LIST.filter((pk) => p.perks[pk.id] > 0).map((pk) => ({
    id: pk.id,
    count: p.perks[pk.id],
  }));

  return {
    mode: g.mode,
    gameMode: g.gameMode,
    bird: p.bird,
    score: g.score,
    best: g.best,
    wave: g.wave,
    waveSubtitle: g.waveSubtitle,
    modeTimer: Math.ceil(g.modeTimer),
    hp: p.hp,
    maxHp: p.maxHp,
    shield: p.shield,
    shells: p.reload > 0 ? 0 : p.shells,
    maxShells: maxMagForPlayer(p),
    reloadProgress,
    activeReloadReady: p.reload > 0 && p.activeReloadReady,
    dashProgress,
    weapon: WEAPONS[p.weapon].name,
    weaponId: p.weapon,
    weaponTimeLeft: Math.ceil(p.weaponT),
    weaponTimeMax: Math.ceil(p.weaponTMax),
    eagleT: g.eagle?.alive ? Math.ceil(g.eagle.ttl) : 0,
    frenzyT: Math.ceil(p.frenzyT),
    overchargeT: Math.ceil(p.overchargeT),
    combo: g.combo,
    comboProgress: g.combo > 1 ? q(g.comboT / 2.8) : 0,
    banner: g.bannerT > 0 ? g.banner : "",
    streakBanner: g.streakBannerT > 0 ? g.streakBanner : "",
    bossHp: boss ? Math.ceil(boss.hp) : 0,
    bossMaxHp: boss ? boss.maxHp : 0,
    bossName: boss ? (boss.enraged ? "The Warden · Enraged" : "The Warden") : "",
    enemiesRemaining: g.humans.length,
    perkChoices: g.perkOfferT > 0 ? g.perkChoices : [],
    perkOfferT: Math.ceil(g.perkOfferT),
    activePerks,
    killsRun: g.killsRun,
    maxComboRun: g.maxComboRun,
    stats: g.stats,
    muted: g.muted,
    autoFire: g.autoFire,
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
    } else if (
      g.mode === "paused" &&
      (actions.pausePressed || actions.startPressed)
    ) {
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
    returnToTitle: () => {
      g.mode = "title";
      g.humans = [];
      pushHud();
    },
    toggleMute: () => {
      g.muted = !g.muted;
      setMuted(g.muted);
      writeSave({ muted: g.muted });
      pushHud();
    },
    toggleAutoFire: () => {
      toggleAutoFire(g);
      pushHud();
    },
    selectBird: (bird: BirdId) => {
      selectBird(g, bird);
      pushHud();
    },
    selectGameMode: (mode: GameModeId) => {
      selectGameMode(g, mode);
      pushHud();
    },
    choosePerk: (idx: number) => {
      choosePerk(g, idx);
      pushHud();
    },
    setTouchMove,
    setTouchFire,
    setTouchDash,
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
