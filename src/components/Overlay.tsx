import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_HP, MAX_SHELLS } from "@/game/config";
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

export function Overlay({ hud, api }: Props) {
  const well = useRef<HTMLDivElement>(null);
  const padOrigin = useRef<{ x: number; y: number } | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
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
      steerFrom(r.left + r.width / 2, r.top + r.height / 2, e.clientX, e.clientY, r.width * 0.42);
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
      if (!padOrigin.current) padOrigin.current = { x: e.clientX, y: e.clientY };
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

  const showMenu = hud.mode === "title" || hud.mode === "boot";
  const showPause = hud.mode === "paused";
  const showOver = hud.mode === "over";
  const playing = hud.mode === "playing";
  const showTouch = playing && touchUi;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 text-fg">
      <div className="pointer-events-auto absolute top-4 left-4 flex flex-col gap-1 sm:top-5 sm:left-5">
        <p className="font-display text-xl tracking-tight text-fg tabular-nums sm:text-2xl">
          {hud.score.toLocaleString()}
        </p>
        <p className="text-xs font-medium tracking-wide text-muted uppercase">
          Wave {Math.max(1, hud.wave)}
          {hud.best > 0 ? ` · Best ${hud.best.toLocaleString()}` : ""}
        </p>
        {playing || showPause || showOver ? (
          <div className="mt-2 flex flex-col gap-1.5">
            <div className="flex gap-1.5" aria-label="Health">
              {Array.from({ length: MAX_HP }, (_, i) => (
                <span
                  key={i}
                  className={`h-2 w-5 rounded-xs ${i < hud.hp ? "bg-danger" : "bg-fg/15"}`}
                />
              ))}
            </div>
            <div className="flex gap-1.5" aria-label="Shells">
              {Array.from({ length: hud.maxShells || MAX_SHELLS }, (_, i) => (
                <span
                  key={i}
                  className={`h-3 w-2 rounded-[1px] ${i < hud.shells ? "bg-shell" : "bg-fg/15"}`}
                />
              ))}
            </div>
            <p className="text-[10px] font-medium tracking-wide text-muted uppercase">
              {hud.weapon}
              {hud.eagleT > 0 ? ` · Eagle ${Math.ceil(hud.eagleT)}s` : ""}
            </p>
          </div>
        ) : null}
      </div>

      <div className="pointer-events-auto absolute top-4 right-4 flex gap-2 sm:top-5 sm:right-5">
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

      {hud.combo > 1 && playing ? (
        <p className="absolute top-16 left-1/2 -translate-x-1/2 font-display text-lg tracking-tight text-accent">
          x{hud.combo}
        </p>
      ) : null}

      {hud.banner && playing ? (
        <p className="absolute top-1/3 left-1/2 -translate-x-1/2 font-display text-3xl tracking-tight text-fg">
          {hud.banner}
        </p>
      ) : null}

      {playing && !showTouch ? (
        <p className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 text-xs text-muted">
          WASD fly · Mouse aim · Click fire
        </p>
      ) : null}

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
            className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between px-5"
            style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
          >
            <div
              ref={well}
              className="pointer-events-auto relative mb-2 size-32 rounded-full border-2 border-fg/35 bg-surface/70 touch-none"
              onPointerDown={onStick}
              onPointerMove={onStick}
              onPointerUp={endStick}
              onPointerCancel={endStick}
              onContextMenu={(e) => e.preventDefault()}
              aria-label="Move"
            >
              <span className="pointer-events-none absolute inset-0 m-auto size-14 rounded-full border border-fg/20 bg-fg/15" />
              <span
                className="pointer-events-none absolute left-1/2 top-1/2 size-12 rounded-full bg-accent shadow-panel"
                style={{
                  transform: `translate(calc(-50% + ${knob.x * 40}px), calc(-50% + ${knob.y * 40}px))`,
                }}
              />
            </div>
            <button
              type="button"
              className="pointer-events-auto mb-3 size-[4.5rem] touch-none rounded-full border-2 border-fg/30 bg-accent text-sm font-semibold text-bg shadow-panel"
              onPointerDown={onFire}
              onPointerUp={endFire}
              onPointerCancel={endFire}
              onContextMenu={(e) => e.preventDefault()}
              aria-label="Fire"
            >
              Fire
            </button>
          </div>
        </>
      ) : null}

      {showMenu || showPause || showOver ? (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-bg/55 px-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-4 shadow-panel sm:p-5">
            {showMenu ? (
              <div className="flex flex-col gap-4">
                <p className="text-xs font-medium tracking-[0.22em] text-muted uppercase">
                  Payback
                </p>
                <div>
                  <h1 className="font-display text-4xl leading-none tracking-tight text-fg sm:text-5xl">
                    Birds with Guns
                  </h1>
                  <p className="mt-3 max-w-sm text-sm leading-snug text-muted">
                    They hunted birds with shotguns. The birds brought guns too.
                    Fly the hawk. Bag the humans. Drop the Warden.
                  </p>
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
                  <li>Drag left to fly · hold the right side or Fire to shoot</li>
                  <li>Grab rifles, scatterguns, and the goose gun off the field</li>
                  <li>Wardens hit hard · they rarely drop an eagle ally</li>
                  <li>Orange vests shoot back · trees and the barn eat pellets</li>
                </ul>
                {hud.best > 0 ? (
                  <p className="text-xs text-muted">Best bag {hud.best.toLocaleString()}</p>
                ) : null}
              </div>
            ) : null}

            {showPause ? (
              <div className="flex flex-col gap-4">
                <h2 className="font-display text-3xl tracking-tight">Paused</h2>
                <p className="text-sm text-muted">The field can wait.</p>
                <div className="flex flex-col gap-2">
                  <Button size="lg" onClick={() => api?.resume()}>
                    Resume
                  </Button>
                  <Button variant="ghost" onClick={() => api?.restart()}>
                    <RotateCcw />
                    Restart
                  </Button>
                </div>
              </div>
            ) : null}

            {showOver ? (
              <div className="flex flex-col gap-4">
                <p className="text-xs font-medium tracking-[0.22em] text-muted uppercase">
                  Shot down
                </p>
                <h2 className="font-display text-3xl tracking-tight">Season over</h2>
                <p className="text-sm text-muted">
                  You bagged {hud.score.toLocaleString()} · Wave {hud.wave}
                </p>
                <Button size="lg" onClick={() => api?.restart()}>
                  Hunt again
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
