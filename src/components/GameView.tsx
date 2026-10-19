import { useEffect, useRef, useState } from "react";
import { Overlay } from "@/components/Overlay";
import { createGame, type GameApi } from "@/game/main";
import type { HudSnap } from "@/game/types";

const initial: HudSnap = {
  mode: "boot",
  gameMode: "hunt",
  bird: "hawk",
  score: 0,
  best: 0,
  wave: 1,
  waveSubtitle: "Opening Day",
  modeTimer: 0,
  hp: 5,
  maxHp: 5,
  shield: 0,
  shells: 4,
  maxShells: 4,
  reloadProgress: 1,
  activeReloadReady: false,
  dashProgress: 1,
  weapon: "Pump",
  weaponId: "shotgun",
  weaponTimeLeft: 0,
  weaponTimeMax: 0,
  eagleT: 0,
  frenzyT: 0,
  overchargeT: 0,
  combo: 0,
  comboProgress: 0,
  banner: "",
  streakBanner: "",
  bossHp: 0,
  bossMaxHp: 0,
  bossName: "",
  enemiesRemaining: 0,
  perkChoices: [],
  perkOfferT: 0,
  activePerks: [],
  killsRun: 0,
  maxComboRun: 0,
  stats: {
    totalKills: 0,
    bossesKilled: 0,
    bestCombo: 0,
    highestWave: 1,
    gamesPlayed: 0,
    barrelsPopped: 0,
    swoopKills: 0,
  },
  muted: false,
  autoFire: false,
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
