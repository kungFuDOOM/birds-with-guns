import { useEffect, useRef, useState } from "react";
import { Overlay } from "@/components/Overlay";
import { createGame, type GameApi } from "@/game/main";
import type { HudSnap } from "@/game/types";

const initial: HudSnap = {
  mode: "boot",
  score: 0,
  best: 0,
  wave: 1,
  hp: 5,
  shells: 3,
  maxShells: 3,
  weapon: "Pump",
  eagleT: 0,
  combo: 0,
  banner: "",
  muted: false,
  loading: true,
};

export function GameView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [api, setApi] = useState<GameApi | null>(null);
  const [hud, setHud] = useState<HudSnap>(initial);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = createGame(canvas, setHud);
    setApi(game);
    return () => {
      game.destroy();
      setApi(null);
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-bg text-fg touch-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full touch-none select-none"
      />
      <Overlay hud={hud} api={api} />
    </div>
  );
}
