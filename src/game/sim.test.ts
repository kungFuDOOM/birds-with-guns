import assert from "node:assert/strict";
import test from "node:test";
import { BIRDS, WEAPONS } from "./config.ts";
import type { Actions } from "./input.ts";
import {
  choosePerk,
  createGameState,
  maxMagForPlayer,
  selectBird,
  selectGameMode,
  startHunt,
  updateGame,
} from "./sim.ts";

function idleActions(overrides: Partial<Actions> = {}): Actions {
  return {
    moveX: 0,
    moveY: 0,
    aimX: 0,
    aimY: 0,
    fire: false,
    firePressed: false,
    dashPressed: false,
    reloadPressed: false,
    pausePressed: false,
    startPressed: false,
    perkPressed: -1,
    mouseX: 400,
    mouseY: 300,
    usingMouseAim: false,
    usingTouch: false,
    ...overrides,
  };
}

test("bird selection and game modes configure initial hunt state", () => {
  const g = createGameState();
  selectBird(g, "eagle");
  selectGameMode(g, "blitz");
  startHunt(g);

  assert.equal(g.mode, "playing");
  assert.equal(g.player.bird, "eagle");
  assert.equal(g.player.maxHp, BIRDS.eagle.hp);
  assert.equal(g.modeTimer, 120);
  assert.ok(g.humans.length > 0);
  assert.ok(g.barrels.length > 0);
});

test("firing, talon swoop dash, and perk upgrades work cleanly", () => {
  const g = createGameState();
  selectBird(g, "falcon");
  startHunt(g);

  const initialShells = g.player.shells;
  updateGame(g, 1 / 60, idleActions({ fire: true, firePressed: true }));
  assert.equal(g.player.shells, initialShells - 1);
  assert.ok(g.pellets.some((p) => p.alive && p.fromPlayer));

  // Trigger Talon Swoop dash (buffered across hitstop if active)
  updateGame(g, 1 / 60, idleActions({ moveX: 1, dashPressed: true }));
  if (g.player.dashT <= 0) {
    updateGame(g, 1 / 60, idleActions({ moveX: 1 }));
  }
  assert.ok(g.player.dashT > 0);
  assert.ok(g.player.invuln > 0);
  assert.ok(g.afterimages.length > 0);

  // Offer and claim a perk
  g.perkChoices = ["scavenger", "feather_vest", "hollow_point"];
  g.perkOfferT = 5;
  const beforeMag = maxMagForPlayer(g.player);
  choosePerk(g, 0);
  assert.equal(g.player.perks.scavenger, 1);
  assert.equal(maxMagForPlayer(g.player), beforeMag + 2);
  assert.equal(g.player.shells, WEAPONS.shotgun.mag + 2);
});

test("active reload sweet spot grants instant reload and overcharge", () => {
  const g = createGameState();
  selectBird(g, "hawk");
  startHunt(g);

  // Fire one shell then trigger reload
  updateGame(g, 1 / 60, idleActions({ fire: true, firePressed: true }));
  updateGame(g, 1 / 60, idleActions({ reloadPressed: true }));
  assert.ok(g.player.reload > 0);
  assert.equal(g.player.activeReloadReady, true);

  // Advance reload into the 35% - 78% sweet spot
  g.player.reload = g.player.reloadMax * 0.45;
  updateGame(g, 1 / 60, idleActions({ reloadPressed: true }));
  assert.equal(g.player.reload, 0);
  assert.equal(g.player.shells, maxMagForPlayer(g.player));
  assert.ok(g.player.overchargeT > 0);
});

test("movement yaw obeys A=left (+yaw) and D=right (-yaw) while moving forward", () => {
  const g = createGameState();
  startHunt(g);

  updateGame(g, 0.1, idleActions({ moveX: -1, moveY: -1 }));
  assert.ok(g.player.yaw > 0, "Moving forward-left (W+A) produces positive yaw");

  updateGame(g, 0.1, idleActions({ moveX: 1, moveY: -1 }));
  assert.ok(g.player.yaw < 0, "Moving forward-right (W+D) produces negative yaw");
});

