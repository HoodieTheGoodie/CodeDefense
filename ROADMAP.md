# CodeDefense Roadmap

CodeDefense is planned as a browser-playable, cybersecurity-themed tower defense game. The starting point is inspired by Plants vs. Zombies: enemies advance along lanes, the player places defensive tools, and the core/base must survive each wave.

The long-term vision is a 2-player cooperative defense game where both players protect the same base. The short-term goal is to make single-player fun while shaping the code so online co-op can be added without rewriting the whole game.

## Core Vision

- Protect a central core from waves of viruses and malware.
- Start by defending one side of the base, then unlock up, down, left, and right sides over time.
- Each side can have its own gimmick, enemy pressure, lane layout, and resource advantage.
- Build towers and support systems to stop viruses before they reach the core.
- Add a factory/resource layer later for upgrades, materials, and longer-term planning.
- Keep the game playable in the browser with fast iteration and simple controls.

## Multiplayer Direction

The preferred 2-player mode is cooperative shared-base defense.

Both players defend the same core. They may place towers, start waves, upgrade defenses, or manage resources together. The game should scale enemy strength, enemy count, or wave pressure when more players are present.

Avoid building a full online system too early, but build the game logic in a multiplayer-shaped way:

- Represent player choices as actions, such as `placeTower`, `startWave`, or `upgradeTower`.
- Let single-player input create those same actions locally.
- Later, online multiplayer can send the same actions over the network.
- Track `ownerId` on player-built objects like towers.
- Keep core HP, wave state, side unlocks, and enemy state shared.

Possible co-op resource models:

- Shared energy pool: easiest to build and easiest to understand.
- Separate player energy: better for preventing one player from spending everything.
- Role-based play: one player manages defense while another manages factory/resources, likely later.

Recommended path: start with shared energy, but keep enough player identity in the data model to support separate resources later.

## Architecture Goals

Early prototypes can live mostly inside Phaser scenes, but the project should gradually separate game rules from rendering.

Aim for this shape over time:

```text
Player Input
  -> PlayerAction
  -> Game Rules / GameState
  -> Phaser Rendering
```

Good long-term pieces:

- `GameState`: core HP, energy, wave progress, towers, viruses, unlocked sides, players.
- `PlayerAction`: player intent, such as placing a tower or starting a wave.
- `GameRules`: pure or mostly pure functions that apply actions and advance the simulation.
- `GameScene`: Phaser scene responsible for visuals, input, camera, and UI.

This makes it easier to add:

- save/load
- local co-op
- online co-op
- replays/debugging
- balance tests
- AI/autoplay helpers

## Phase 1: Make One Side Fun

Goal: the right-side defense loop should feel playable before the game grows wider.

- Confirm the game boots and the current prototype is playable.
- Make placing towers feel clear and reliable.
- Make energy generation understandable.
- Make wave start, wave clear, and core failure states clean.
- Add a next-wave flow.
- Add at least one more virus type.
- Add at least one more defensive tower.
- Improve feedback for damage, kills, energy, and invalid placement.

Definition of done: a player can play several waves on the right side and understand why they won or lost.

## Phase 2: Clean Game Data

Goal: move the project toward multiplayer-shaped single-player.

- Introduce side/node config instead of hardcoding Node 1 values.
- Introduce tower definitions for cost, HP, cooldown, damage, and behavior.
- Introduce virus definitions for HP, speed, reward, and special traits.
- Add player IDs to placed towers and future player-owned objects.
- Convert direct input handling into player actions where practical.
- Avoid having UI, wave logic, placement logic, and entity logic all grow in one scene file.

Definition of done: the single-player game still works, but key gameplay operations are expressed as data/actions.

## Phase 3: Unlock More Sides

Goal: expand the base from one active side into the four-sided defense idea.

- Add side IDs: `right`, `left`, `top`, `bottom`.
- Define per-side grid dimensions, spawn direction, lanes, and entry-to-core behavior.
- Unlock sides over multiple levels or waves.
- Add side gimmicks, such as:
  - more energy, fewer viruses
  - fast enemies, narrow lanes
  - heavy enemies, slower waves
  - limited tower slots
  - bonus material production
- Add camera/navigation that makes switching sides quick and clear.

Definition of done: the player can defend at least two distinct sides with different pressures.

## Phase 4: Factory And Upgrades

Goal: add a resource layer without overwhelming the tower defense loop.

Start simple:

- Materials earned from waves or side objectives.
- Between-wave upgrades for towers, core HP, energy production, or side bonuses.
- Simple factory tiles or production chains later.

Possible factory direction:

- Place collectors, processors, and conveyors on a 2D grid.
- Materials feed permanent tower upgrades.
- Factory choices influence defense strategy.

Definition of done: upgrades create meaningful decisions between waves without slowing down the main defense gameplay.

## Phase 5: Local Multiplayer Simulation

Goal: prove 2-player rules before adding real online networking.

- Add two player records to `GameState`.
- Support actions from `player-1` and `player-2`.
- Give towers an `ownerId`.
- Add simple player-colored tower accents or labels.
- Scale waves based on player count.
- Optionally test two local input schemes or a debug button that simulates player 2.

Definition of done: the game rules can accept actions from two players, even if both are still on one browser.

## Phase 6: Online Co-op Prototype

Goal: connect two browsers to the same shared game.

Likely model:

- One server owns the authoritative game state.
- Clients send player actions.
- Server validates actions and broadcasts state updates or accepted actions.
- Clients render the latest state in Phaser.

Keep the first online version simple:

- private room code
- two players max
- shared base
- shared wave
- basic reconnect handling later

Definition of done: two browsers can join one room and place towers in the same defense game.

## Open Design Questions

- Should players share energy, have separate energy, or use a hybrid?
- Should both players do the same jobs, or should roles emerge over time?
- Should the factory be between-wave only at first, or run during combat?
- How much should each side differ mechanically?
- Should waves attack multiple sides at once, or usually focus on one side?
- What is the theme language: antivirus tools, firewall nodes, scripts, patches, packets, exploits?
- Should the game name stay CodeDefense, use EchoDefense from the menu, or become something else?

## Near-Term Suggested Next Steps

1. Run the current game in the browser.
2. Fix any boot/build/runtime issues.
3. Play the first wave and write down what feels confusing or fun.
4. Make the first-side loop smoother.
5. Start extracting side/tower/virus data once the prototype behavior is clear.

