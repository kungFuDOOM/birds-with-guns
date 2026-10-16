import { createFileRoute } from "@tanstack/react-router";
import { GameView } from "@/components/GameView";

export const Route = createFileRoute("/")({
  ssr: false,
  component: Home,
});

function Home() {
  return <GameView />;
}
