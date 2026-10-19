import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import {
  Award,
  BookOpen,
  Crosshair,
  Flame,
  Home,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Sparkles,
  Volume2,
  VolumeX,
  Wind,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BIRD_LIST,
  BIRDS,
  GAME_MODE_LIST,
  MAX_HP,
  MAX_SHELLS,
  PERKS,
  WEAPONS,
} from "@/game/config";
import type { GameApi } from "@/game/main";
import type { HudSnap } from "@/game/types";

type Props = {
  hud: HudSnap;
  api: GameApi | null;
};

function useTouchUi() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const apply = () => {
      const desktopMouse =
        window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
        navigator.maxTouchPoints === 0;
      setOn(!desktopMouse);
    };
    apply();
    const onPtr = (e: globalThis.PointerEvent) => {
      if (e.pointerType === "touch") setOn(true);
    };
    const onTouch = () => setOn(true);
    window.addEventListener("pointerdown", onPtr);
    window.addEventListener("touchstart", onTouch, { passive: true });
    window.addEventListener("resize", apply);
    return () => {
      window.removeEventListener("pointerdown", onPtr);
      window.removeEventListener("touchstart", onTouch);
      window.removeEventListener("resize", apply);
    };
  }, []);
  return on;
}

function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export function Overlay({ hud, api }: Props) {
  const well = useRef<HTMLDivElement>(null);
  const padOrigin = useRef<{ x: number; y: number } | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [tab, setTab] = useState<"hunt" | "guide">("hunt");
  const touchUi = useTouchUi();

  const steerFrom = useCallback(
    (cx: number, cy: number, x: number, y: number, range: number) => {
      if (!api) return;
      const dx = (x - cx) / range;
      const dy = (y - cy) / range;
      const m = Math.hypot(dx, dy);
      const s = m > 1 ? 1 / m : 1;
      const nx = dx * s;
      const ny = dy * s;
      setKnob({ x: nx, y: ny });
      api.setTouchMove(nx, ny);
    },
    [api],
  );

  const onStick = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const el = well.current;
      if (!el || !api) return;
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      const r = el.getBoundingClientRect();
      steerFrom(
        r.left + r.width / 2,
        r.top + r.height / 2,
        e.clientX,
        e.clientY,
        r.width * 0.42,
      );
    },
    [api, steerFrom],
  );

  const endStick = useCallback(() => {
    padOrigin.current = null;
    setKnob({ x: 0, y: 0 });
    api?.setTouchMove(0, 0);
  }, [api]);

  const onPad = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!api) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      if (!padOrigin.current) {
        padOrigin.current = { x: e.clientX, y: e.clientY };
      }
      const o = padOrigin.current;
      steerFrom(o.x, o.y, e.clientX, e.clientY, 64);
    },
    [api, steerFrom],
  );

  const onFire = useCallback(
    (e: PointerEvent) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      api?.setTouchFire(true);
    },
    [api],
  );

  const endFire = useCallback(() => {
    api?.setTouchFire(false);
  }, [api]);

  const onDash = useCallback(
    (e: PointerEvent) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      api?.setTouchDash(true);
    },
    [api],
  );

  const endDash = useCallback(() => {
    api?.setTouchDash(false);
  }, [api]);

  const showMenu = hud.mode === "title" || hud.mode === "boot";
  const showPause = hud.mode === "paused";
  const showOver = hud.mode === "over";
  const playing = hud.mode === "playing";
  const showTouch = playing && touchUi;
  const activeBird = BIRDS[hud.bird];

  return (
    <div className="pointer-events-none absolute inset-0 z-10 text-fg">
      {/* Top-Left HUD Status */}
      <div className="pointer-events-auto absolute top-3 left-3 flex flex-col gap-1 sm:top-5 sm:left-5">
        <div className="flex items-baseline gap-2.5">
          <p className="font-display text-xl tracking-tight text-fg tabular-nums sm:text-2xl">
            {hud.score.toLocaleString()}
          </p>
          {hud.gameMode === "blitz" && (playing || showPause) ? (
            <span className="rounded-xs bg-danger/25 px-1.5 py-0.5 text-xs font-semibold text-fg tabular-nums">
              {formatTimer(hud.modeTimer)}
            </span>
          ) : null}
        </div>
        <p className="text-xs font-medium tracking-wide text-muted uppercase">
          Wave {Math.max(1, hud.wave)}
          {hud.waveSubtitle && playing ? ` · ${hud.waveSubtitle}` : ""}
          {hud.best > 0 ? ` · Best ${hud.best.toLocaleString()}` : ""}
        </p>

        {playing || showPause || showOver ? (
          <div className="mt-1.5 flex flex-col gap-1.5 rounded-sm border border-border bg-surface/75 p-2 backdrop-blur-xs">
            {/* Health + Shield */}
            <div className="flex items-center gap-1.5" aria-label="Health">
              <div className="flex gap-1">
                {Array.from({ length: hud.maxHp || MAX_HP }, (_, i) => (
                  <span
                    key={i}
                    className={`h-2 w-4 rounded-xs transition-colors ${
                      i < hud.hp ? "bg-danger" : "bg-fg/15"
                    }`}
                  />
                ))}
              </div>
              {hud.shield > 0 ? (
                <div className="flex items-center gap-0.5 text-[11px] font-semibold text-amber-300">
                  <Shield className="size-3" />
                  <span>+{hud.shield}</span>
                </div>
              ) : null}
            </div>

            {/* Shells / Reload Bar */}
            {hud.reloadProgress < 1 ? (
              <div className="flex items-center gap-2">
                <div className="relative h-2.5 w-24 overflow-hidden rounded-xs bg-fg/15">
                  {hud.activeReloadReady ? (
                    <span
                      className="absolute inset-y-0 bg-amber-300/45"
                      style={{ left: "35%", width: "43%" }}
                    />
                  ) : null}
                  <span
                    className="block h-full bg-shell transition-all duration-75"
                    style={{ width: `${Math.round(hud.reloadProgress * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] font-semibold tracking-wider text-amber-300 uppercase">
                  {hud.activeReloadReady ? "[R] Sweet Spot" : "Reloading"}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1" aria-label="Shells">
                {Array.from(
                  { length: Math.min(16, hud.maxShells || MAX_SHELLS) },
                  (_, i) => (
                    <span
                      key={i}
                      className={`h-3 w-1.5 rounded-[1px] ${
                        i < hud.shells
                          ? hud.frenzyT > 0 || hud.overchargeT > 0
                            ? "bg-amber-300"
                            : "bg-shell"
                          : "bg-fg/15"
                      }`}
                    />
                  ),
                )}
              </div>
            )}

            {/* Weapon & Swoop Cooldown Row */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] font-semibold tracking-wide uppercase">
              <span
                style={{ color: WEAPONS[hud.weaponId]?.color ?? "#f3efe6" }}
              >
                {hud.weapon}
                {hud.weaponTimeLeft > 0 ? ` (${hud.weaponTimeLeft}s)` : ""}
              </span>
              <span className="text-muted">·</span>
              <span
                className={
                  hud.dashProgress >= 1 ? "text-emerald-300" : "text-muted"
                }
              >
                {hud.dashProgress >= 1
                  ? "Swoop Ready"
                  : `Swoop ${Math.round(hud.dashProgress * 100)}%`}
              </span>
              {hud.enemiesRemaining > 0 && playing ? (
                <>
                  <span className="text-muted">·</span>
                  <span className="text-muted">
                    {hud.enemiesRemaining} Left
                  </span>
                </>
              ) : null}
            </div>

            {/* Active Buffs & Perks */}
            {hud.eagleT > 0 ||
            hud.frenzyT > 0 ||
            hud.overchargeT > 0 ||
            hud.activePerks.length > 0 ? (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {hud.eagleT > 0 ? (
                  <span className="rounded-xs bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-medium text-sky-300">
                    Eagle {hud.eagleT}s
                  </span>
                ) : null}
                {hud.frenzyT > 0 ? (
                  <span className="rounded-xs bg-amber-500/25 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                    Frenzy {hud.frenzyT}s
                  </span>
                ) : null}
                {hud.overchargeT > 0 ? (
                  <span className="rounded-xs bg-yellow-500/20 px-1.5 py-0.5 text-[10px] font-medium text-yellow-200">
                    Overcharge {hud.overchargeT}s
                  </span>
                ) : null}
                {hud.activePerks.map((pk) => (
                  <span
                    key={pk.id}
                    className="rounded-xs bg-fg/10 px-1.5 py-0.5 text-[10px] font-medium text-fg/85"
                  >
                    {PERKS[pk.id].name}
                    {pk.count > 1 ? ` ×${pk.count}` : ""}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Top-Right Action Buttons */}
      <div className="pointer-events-auto absolute top-3 right-3 flex gap-2 sm:top-5 sm:right-5">
        {playing || showPause ? (
          <Button
            variant="icon"
            size="icon"
            aria-label={hud.autoFire ? "Disable Auto-Fire" : "Enable Auto-Fire"}
            title={hud.autoFire ? "Auto-Fire: ON" : "Auto-Fire: OFF"}
            className={hud.autoFire ? "border-amber-400/60 text-amber-300" : ""}
            onClick={() => api?.toggleAutoFire()}
          >
            <Crosshair />
          </Button>
        ) : null}
        {playing || showPause ? (
          <Button
            variant="icon"
            size="icon"
            aria-label={showPause ? "Resume" : "Pause"}
            onClick={() => (showPause ? api?.resume() : api?.pause())}
          >
            {showPause ? <Play /> : <Pause />}
          </Button>
        ) : null}
        <Button
          variant="icon"
          size="icon"
          aria-label={hud.muted ? "Unmute" : "Mute"}
          onClick={() => api?.toggleMute()}
        >
          {hud.muted ? <VolumeX /> : <Volume2 />}
        </Button>
      </div>

      {/* Boss Health Bar */}
      {hud.bossMaxHp > 0 && playing ? (
        <div className="pointer-events-none absolute top-4 left-1/2 flex w-56 -translate-x-1/2 flex-col items-center gap-1 sm:w-72">
          <p className="text-[11px] font-semibold tracking-wider text-amber-300 uppercase">
            {hud.bossName}
          </p>
          <div className="h-2.5 w-full overflow-hidden rounded-full border border-border bg-surface/85">
            <div
              className="h-full bg-danger transition-all duration-100"
              style={{
                width: `${Math.max(0, Math.min(100, (hud.bossHp / hud.bossMaxHp) * 100))}%`,
              }}
            />
          </div>
        </div>
      ) : null}

      {/* Combo & Streak Indicator */}
      {hud.combo > 1 && playing ? (
        <div className="pointer-events-none absolute top-14 left-1/2 flex -translate-x-1/2 flex-col items-center">
          <p className="font-display text-xl tracking-tight text-amber-300">
            x{hud.combo} Combo
          </p>
          <div className="mt-0.5 h-1 w-16 overflow-hidden rounded-full bg-fg/15">
            <div
              className="h-full bg-amber-300"
              style={{ width: `${Math.round(hud.comboProgress * 100)}%` }}
            />
          </div>
        </div>
      ) : null}

      {hud.streakBanner && playing ? (
        <p className="pointer-events-none absolute top-24 left-1/2 -translate-x-1/2 font-display text-xl tracking-tight text-amber-300 drop-shadow-sm sm:text-2xl">
          {hud.streakBanner}
        </p>
      ) : null}

      {hud.banner && playing ? (
        <p className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 text-center font-display text-2xl tracking-tight text-fg drop-shadow-md sm:text-4xl">
          {hud.banner}
        </p>
      ) : null}

      {/* Non-Blocking Between-Wave Perk Choice Bar */}
      {hud.perkChoices.length > 0 && playing ? (
        <div className="pointer-events-auto absolute bottom-14 left-1/2 flex w-[min(94vw,34rem)] -translate-x-1/2 flex-col gap-1.5 rounded-md border border-border bg-surface/90 p-2.5 shadow-panel backdrop-blur-xs">
          <div className="flex items-center justify-between text-[11px] font-semibold tracking-wider text-amber-300 uppercase">
            <span className="flex items-center gap-1">
              <Sparkles className="size-3.5" /> Choose Wave Upgrade (Press 1–3
              or Tap)
            </span>
            <span className="text-muted tabular-nums">{hud.perkOfferT}s</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {hud.perkChoices.map((id, idx) => {
              const p = PERKS[id];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => api?.choosePerk(idx)}
                  className="flex flex-col items-start rounded-xs border border-border bg-surface-2/85 p-2 text-left transition hover:border-fg/40 hover:bg-surface-2 active:scale-[0.98]"
                >
                  <span
                    className="text-xs font-semibold"
                    style={{ color: p.color }}
                  >
                    [{idx + 1}] {p.name}
                  </span>
                  <span className="mt-0.5 text-[10px] leading-tight text-muted">
                    {p.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {playing && !showTouch && hud.perkChoices.length === 0 ? (
        <p className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-center text-xs text-muted">
          WASD fly · Mouse aim · Click/Space fire · Shift/Right-click swoop · R
          active reload
        </p>
      ) : null}

      {/* Touch Controls */}
      {showTouch ? (
        <>
          <div
            className="pointer-events-auto absolute top-24 bottom-0 left-0 w-[44%] touch-none"
            onPointerDown={onPad}
            onPointerMove={onPad}
            onPointerUp={endStick}
            onPointerCancel={endStick}
            onContextMenu={(e) => e.preventDefault()}
            aria-hidden
          />
          <div
            className="pointer-events-auto absolute top-24 bottom-0 right-0 w-[44%] touch-none"
            onPointerDown={onFire}
            onPointerMove={(e) => {
              if (e.buttons) api?.setTouchFire(true);
            }}
            onPointerUp={endFire}
            onPointerCancel={endFire}
            onContextMenu={(e) => e.preventDefault()}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between px-4"
            style={{
              paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
            }}
          >
            <div
              ref={well}
              className="pointer-events-auto relative mb-2 size-28 rounded-full border-2 border-fg/35 bg-surface/70 touch-none sm:size-32"
              onPointerDown={onStick}
              onPointerMove={onStick}
              onPointerUp={endStick}
              onPointerCancel={endStick}
              onContextMenu={(e) => e.preventDefault()}
              aria-label="Move"
            >
              <span className="pointer-events-none absolute inset-0 m-auto size-12 rounded-full border border-fg/20 bg-fg/15" />
              <span
                className="pointer-events-none absolute top-1/2 left-1/2 size-11 rounded-full bg-accent shadow-panel"
                style={{
                  transform: `translate(calc(-50% + ${knob.x * 36}px), calc(-50% + ${knob.y * 36}px))`,
                }}
              />
            </div>
            <div className="flex items-end gap-2.5">
              <button
                type="button"
                className="pointer-events-auto mb-3 flex size-14 touch-none flex-col items-center justify-center rounded-full border-2 border-fg/30 bg-surface/85 text-xs font-semibold text-fg shadow-panel"
                onPointerDown={onDash}
                onPointerUp={endDash}
                onPointerCancel={endDash}
                onContextMenu={(e) => e.preventDefault()}
                aria-label="Swoop"
              >
                <Wind className="size-4 text-amber-300" />
                <span className="text-[10px]">Swoop</span>
              </button>
              <button
                type="button"
                className="pointer-events-auto mb-3 size-[4.25rem] touch-none rounded-full border-2 border-fg/30 bg-accent text-sm font-semibold text-bg shadow-panel"
                onPointerDown={onFire}
                onPointerUp={endFire}
                onPointerCancel={endFire}
                onContextMenu={(e) => e.preventDefault()}
                aria-label="Fire"
              >
                Fire
              </button>
            </div>
          </div>
        </>
      ) : null}

      {/* Center Modal for Title / Pause / Over */}
      {showMenu || showPause || showOver ? (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center overflow-y-auto bg-bg/60 p-3 sm:p-4">
          <div className="my-auto w-full max-w-lg rounded-xl border border-border bg-surface p-4 shadow-panel sm:p-5">
            {showMenu ? (
              <div className="flex flex-col gap-3.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium tracking-[0.22em] text-muted uppercase">
                    Payback
                  </p>
                  <div className="flex gap-1 rounded-xs border border-border bg-surface-2 p-0.5">
                    <button
                      type="button"
                      onClick={() => setTab("hunt")}
                      className={`rounded-xs px-2.5 py-1 text-xs font-medium transition ${
                        tab === "hunt"
                          ? "bg-accent text-bg"
                          : "text-muted hover:text-fg"
                      }`}
                    >
                      Hunt Setup
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab("guide")}
                      className={`flex items-center gap-1 rounded-xs px-2.5 py-1 text-xs font-medium transition ${
                        tab === "guide"
                          ? "bg-accent text-bg"
                          : "text-muted hover:text-fg"
                      }`}
                    >
                      <BookOpen className="size-3" /> Field Guide
                    </button>
                  </div>
                </div>

                <div>
                  <h1 className="font-display text-3xl leading-none tracking-tight text-fg sm:text-5xl">
                    Birds with Guns
                  </h1>
                  <p className="mt-2 text-xs leading-snug text-muted sm:text-sm">
                    They hunted birds with shotguns. The birds brought guns too.
                    Fly the raptor. Bag the poachers. Drop the Warden.
                  </p>
                </div>

                {tab === "hunt" ? (
                  <>
                    {/* Raptor Class Selector */}
                    <div className="flex flex-col gap-1.5">
                      <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
                        Select Raptor ({activeBird.callsign})
                      </p>
                      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                        {BIRD_LIST.map((b) => {
                          const selected = hud.bird === b.id;
                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => api?.selectBird(b.id)}
                              className={`flex flex-col items-start rounded-xs border p-2 text-left transition ${
                                selected
                                  ? "border-accent bg-surface-2"
                                  : "border-border bg-surface/60 hover:bg-surface-2/60"
                              }`}
                            >
                              <span
                                className="text-xs font-semibold"
                                style={{
                                  color: selected ? b.accentColor : "#f3efe6",
                                }}
                              >
                                {b.callsign}
                              </span>
                              <span className="text-[10px] text-muted">
                                {b.name}
                              </span>
                              <span className="mt-1 text-[10px] font-medium text-fg/80">
                                {b.hp} HP · {Math.round(b.speed / 2.65)}% SPD
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[11px] text-amber-200/90">
                        Passive: {activeBird.perk}
                      </p>
                    </div>

                    {/* Game Mode Selector */}
                    <div className="flex flex-col gap-1.5">
                      <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
                        Hunting Mode
                      </p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {GAME_MODE_LIST.map((m) => {
                          const selected = hud.gameMode === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => api?.selectGameMode(m.id)}
                              className={`flex flex-col items-start rounded-xs border p-2 text-left transition ${
                                selected
                                  ? "border-accent bg-surface-2"
                                  : "border-border bg-surface/60 hover:bg-surface-2/60"
                              }`}
                            >
                              <span className="text-xs font-semibold text-fg">
                                {m.name}
                              </span>
                              <span className="text-[10px] text-muted">
                                {m.subtitle}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <Button
                      size="lg"
                      className="mt-1 w-full"
                      disabled={hud.loading}
                      onClick={() => api?.start()}
                    >
                      {hud.loading ? "Loading ground…" : "Start hunt"}
                    </Button>

                    <ul className="space-y-1 text-xs leading-relaxed text-muted">
                      <li>
                        Drag left or WASD to fly · hold right or Click/Space to
                        shoot
                      </li>
                      <li>
                        Shift / Right-Click / Swoop to talon-dash through
                        poachers & refill shells
                      </li>
                      <li>
                        Grab scatterguns, bird rifles, SMGs, flare guns, and the
                        explosive goose gun
                      </li>
                      <li>
                        Shoot red powder barrels to detonate chain-reaction
                        ambushes
                      </li>
                    </ul>
                  </>
                ) : (
                  <div className="flex flex-col gap-3 text-xs">
                    {/* Career Stats */}
                    <div className="grid grid-cols-3 gap-2 rounded-xs border border-border bg-surface-2 p-2.5">
                      <div>
                        <p className="text-[10px] text-muted uppercase">
                          Best Bag
                        </p>
                        <p className="font-display text-base text-fg tabular-nums">
                          {hud.best.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted uppercase">
                          Humans Bagged
                        </p>
                        <p className="font-display text-base text-fg tabular-nums">
                          {hud.stats.totalKills.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted uppercase">
                          Wardens Dropped
                        </p>
                        <p className="font-display text-base text-fg tabular-nums">
                          {hud.stats.bossesKilled}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted uppercase">
                          Best Combo
                        </p>
                        <p className="font-display text-base text-amber-300 tabular-nums">
                          x{hud.stats.bestCombo}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted uppercase">
                          Highest Wave
                        </p>
                        <p className="font-display text-base text-fg tabular-nums">
                          Wave {hud.stats.highestWave}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted uppercase">
                          Talon Swoops
                        </p>
                        <p className="font-display text-base text-fg tabular-nums">
                          {hud.stats.swoopKills}
                        </p>
                      </div>
                    </div>

                    {/* Arsenal & Enemy Bestiary */}
                    <div className="space-y-1.5 text-muted">
                      <p className="font-semibold text-fg">
                        Field Threats & Ordnance:
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Zap className="size-3.5 text-amber-300" />
                        <span>
                          <strong className="text-fg">Active Reload:</strong>{" "}
                          Tap [R] or Fire inside the yellow reload zone for
                          instant Overcharge!
                        </span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Flame className="size-3.5 text-orange-400" />
                        <span>
                          <strong className="text-fg">
                            Snipers, Trappers & Pyros:
                          </strong>{" "}
                          Watch for crimson laser sights, green bolo-nets, and
                          incendiary flares.
                        </span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Award className="size-3.5 text-emerald-300" />
                        <span>
                          <strong className="text-fg">
                            Supply Hikers & Bell Charms:
                          </strong>{" "}
                          Gold-tagged hikers drop Medkits and War Cry Frenzy
                          bells.
                        </span>
                      </p>
                    </div>

                    <Button
                      size="lg"
                      className="w-full"
                      onClick={() => setTab("hunt")}
                    >
                      Back to Hunt Setup
                    </Button>
                  </div>
                )}
              </div>
            ) : null}

            {showPause ? (
              <div className="flex flex-col gap-4">
                <h2 className="font-display text-3xl tracking-tight">Paused</h2>
                <p className="text-sm text-muted">
                  Flying as {activeBird.name} ({activeBird.callsign}) · Wave{" "}
                  {hud.wave}
                </p>
                <div className="flex flex-col gap-2">
                  <Button size="lg" onClick={() => api?.resume()}>
                    Resume
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => api?.toggleAutoFire()}
                  >
                    <Crosshair />
                    Auto-Fire Assist: {hud.autoFire ? "ON" : "OFF"}
                  </Button>
                  <Button variant="ghost" onClick={() => api?.restart()}>
                    <RotateCcw />
                    Restart Hunt
                  </Button>
                  <Button variant="ghost" onClick={() => api?.returnToTitle()}>
                    <Home />
                    Change Raptor / Mode
                  </Button>
                </div>
              </div>
            ) : null}

            {showOver ? (
              <div className="flex flex-col gap-4">
                <p className="text-xs font-medium tracking-[0.22em] text-muted uppercase">
                  {hud.gameMode === "blitz" && hud.modeTimer <= 0
                    ? "Time Expired"
                    : "Shot down"}
                </p>
                <h2 className="font-display text-3xl tracking-tight">
                  Season over
                </h2>
                <div className="grid grid-cols-2 gap-2 rounded-xs border border-border bg-surface-2 p-3 text-xs sm:grid-cols-4">
                  <div>
                    <p className="text-[10px] text-muted uppercase">Score</p>
                    <p className="font-display text-lg text-fg tabular-nums">
                      {hud.score.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted uppercase">Best</p>
                    <p className="font-display text-lg text-amber-300 tabular-nums">
                      {hud.best.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted uppercase">Bagged</p>
                    <p className="font-display text-lg text-fg tabular-nums">
                      {hud.killsRun}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted uppercase">
                      Max Combo
                    </p>
                    <p className="font-display text-lg text-fg tabular-nums">
                      x{Math.max(1, hud.maxComboRun)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    size="lg"
                    className="flex-1"
                    onClick={() => api?.restart()}
                  >
                    Hunt again
                  </Button>
                  <Button
                    size="lg"
                    variant="ghost"
                    onClick={() => api?.returnToTitle()}
                  >
                    <Home />
                    Change Raptor
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
