# Introduction
This application is to provide a lightweight and modular game engine for 2D-Grid Combat Games.
Currently, I am modeling its gameplay structure and loop based off of series such as Fire Emblem and Advanced Wars.

# File Structure
- `src/engine/` - Core logic of the game engine. Plain TypeScript with no React, so it runs the same in tests, on a server, or behind any UI.
  - `models/` - Grid, tiles, terrain, units, unit classes, items, and the commands and events a game runs on
  - `rules/` - The `Ruleset` (terrain costs, combat formulas, who is hostile to whom), the default Fire Emblem-style rules, and the combat resolver
  - `managers/` - Game state and the operations on it: grid, units, movement, combat, status effects, and the `GameManager` that runs turns
  - `ai/` - `BasicAi`, which plays AI-controlled factions
  - `utils/` - `Result`, the seeded RNG, and the distance map used for pathfinding
  - `gamesetup.ts` - `createGame(scenario)`, which builds and wires every manager
  - `tests/` - Vitest tests
- `src/app/` - The Next.js app
  - `assets/` - image, icons, svg files for the game.
  - `components/` - UI components related to the game.
  - `context/` - `GameProvider`, which holds the managers and re-renders whenever the game changes
  - `data/` - Hardcoded game data: the terrain table, test map, weapons, units and scenario
  - `screens/` - UI Screens for the game, including a sandbox test page

# Using the Engine
```ts
import { createGame } from "@/engine/gamesetup";

const game = createGame(scenario);      // optional second argument: a custom Ruleset

const result = game.gameManager.execute({ type: "moveTo", unitId: "knight", destination: { x: 4, y: 2 } });
if (!result.success) console.log(result.err);
```

A `Scenario` is the map (rows of characters), a `legend` from characters to tile types, a `terrain` table, the units, the faction turn order, who controls each faction (`"human"` or `"ai"`), and an RNG seed. See `src/app/data/game/testscenario.ts`.

Most methods return a `Result<T>`: check `success`, then read `value` or `err`.

## Grid and Terrain
- A grid is any width x height of tiles.
- Each tile type has a `TerrainDefinition`: movement cost per movement type (infantry, armored, mounted, flying; `null` means impassable), avoid bonus and defense bonus.
- Which unit stands on a tile is worked out from unit positions (`refreshOccupancy`), so tiles and units can't disagree.

## Units
- Units are created fresh from `UnitTemplate`s for every game, each with its own copies of stats and weapons.
- A unit's class sets its movement type. Its first weapon is equipped.
- Status effects: poison (damage at the start of the unit's turn), stun (skips its turn), haste and slow (movement).

## Movement
- `getDistanceMap` runs Dijkstra's algorithm from a unit: the cheapest cost to every tile within its movement, and the route there. The movement range, path previews and the AI all read from it.
- Units can pass through allies but can't stop on them; enemies block the way.
- `moveUnitTo(destination)` takes the cheapest path. `moveUnit(path)` checks every step of a given path.
- A unit moves once per turn, then attacks or waits.

## Combat
- `forecast(attacker, defender, from?)` works out the whole fight assuming every strike lands, without changing anything. `from` previews an attack from a tile the unit could move to.
- `initiateAttack` rolls the fight with the seeded RNG and applies HP, weapon wear and deaths.
- Strike order: the attacker, then the defender if its weapon reaches, then a follow-up from whichever side is at least 4 attack speed faster. The fight stops when someone dies.
- Default formulas, from Fire Emblem: The Sacred Stones:
  - Attack: weapon might (±1 weapon triangle, x3 if effective) + Str, or Mag for tomes
  - Defense: Def + terrain defense, or Res against magic
  - Attack speed: Spd - max(0, weapon weight - Con)
  - Hit: weapon hit + Skl x 2 + Lck / 2 (±15 weapon triangle) - (attack speed x 2 + Lck + terrain avoid), from 0 to 100
  - Crit: weapon crit + Skl / 2 - defender's Lck. A crit does triple damage.
  - Hit rolls average two random numbers ("true hit"), so high rates are more reliable than they look.
  - Weapons lose a use on each hit (magic on every swing) and break at 0. Bows can't hit at range 1. Staves can't attack.
- Any of this can be swapped by passing your own `Ruleset` to `createGame`.

## Turns
- Every action goes through `gameManager.execute(command)`: `move`, `moveTo`, `undoMove` (take a move back before acting), `attack`, `wait` or `endTurn`. It checks it's that unit's faction's turn and that the unit can still act. It returns what happened as a list of events, or why the command was refused.
- `getHistory()` is the log of every event.
- AI factions play their whole turn as soon as it starts. `continueAi()` advances games where every faction is AI.
- The game ends when no two factions left standing are hostile to each other.
- The same seed and the same commands always play out the same way.
- `subscribe` and `getVersion` let React (`useSyncExternalStore`) re-render when the game changes.

## Not Implemented Yet
- Item effects and skills are modelled but not used by the engine.
- Experience and level-ups.

# Running Instructions
To Run:
1. Clone Repository
2. npm install
3. npm run dev
4. Web application will run on localhost 3000 by default.

Other commands:
- `npm test` - run the engine tests
- `npm run lint` - lint the project
- `npm run build` - production build (also type-checks and lints)
