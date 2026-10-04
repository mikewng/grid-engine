# Engine Overhaul: What Changed and How to Use It

This document covers the rework of grid-engine that landed in commit `cf9f4dc` ("engine rehaul"). The first half lists what changed and why. The second half explains how to use the engine as it is now.

Many of the design decisions follow *Fire Emblem: The Sacred Stones*, using the community decompilation of the game (`fireemblem8u`) as a reference for how its pathfinding, combat and turn flow work.

## Contents

- [At a glance](#at-a-glance)
- [What changed](#what-changed)
  - [Bugs fixed](#bugs-fixed)
  - [Design changes](#design-changes)
  - [Project structure](#project-structure)
  - [Breaking changes](#breaking-changes)
  - [Test data](#test-data)
  - [Sandbox UI](#sandbox-ui)
  - [Tooling](#tooling)
- [Using the engine](#using-the-engine)
  - [How the pieces fit](#how-the-pieces-fit)
  - [1. Define your content](#1-define-your-content)
  - [2. Start a game](#2-start-a-game)
  - [3. Send commands](#3-send-commands)
  - [4. Ask the engine questions](#4-ask-the-engine-questions)
  - [5. Turns and the AI](#5-turns-and-the-ai)
  - [6. Change the rules](#6-change-the-rules)
  - [7. Replays and determinism](#7-replays-and-determinism)
  - [8. Using it from React](#8-using-it-from-react)
  - [Default combat formulas](#default-combat-formulas)
- [Testing](#testing)
- [Running the sandbox](#running-the-sandbox)
- [Not done yet](#not-done-yet)

---

## At a glance

- **Correctness:** fixed ten reproduced bugs in pathfinding, combat, unit state and resets. Each is now covered by a test.
- **Pathfinding:** one Dijkstra "distance map" drives the movement range, paths, the AI and the danger zone.
- **Combat:** a fight is worked out in full as a list of strikes before anything changes. The battle forecast uses the same code, and all randomness comes from a seeded RNG.
- **Turns:** the engine owns the turn flow. Every action is a plain-data command that the engine validates, whether it comes from the UI, the AI or (later) a network peer.
- **Rules as data:** formulas, terrain costs and alliances live in a swappable `Ruleset` and data tables, not in hard-coded classes.
- **AI:** enemy factions can be played by a basic AI.
- **Structure:** the engine moved from `src/app/engine` to `src/engine`, with no React or app imports.
- **Tooling:** 51 Vitest tests, working ESLint, and `npm test` / `npm run lint` scripts.
- **Sandbox:** the UI was rebuilt with terrain art, animated playback of moves and fights, a battle forecast, an action menu, a danger zone and keyboard shortcuts.

---

## What changed

### Bugs fixed

Every one of these was reproduced against the old code before it was fixed.

| # | Problem in the old code | Now |
|---|---|---|
| 1 | The movement search locked in a tile the first time it reached it, even if a cheaper route came later. The Test Knight got 46 tiles instead of 53. | Dijkstra's algorithm settles each tile at its cheapest cost ([distancemap.ts](src/engine/utils/pathing/distancemap.ts)). |
| 2 | `patchUnit` and `markUnitActed` replaced units with plain objects, so methods like `equipWeapon` and `clone` disappeared after one move. `patchUnit` also returned the old object. | Units are updated in place and stay `Unit` instances. `patchUnit` returns the updated unit. |
| 3 | Damage ignored weapon might, and tomes used Strength against Defense. | Damage is might + Str (or Mag for tomes) − Def (or Res against magic). |
| 4 | Counterattacks compared the two weapons' ranges, not the real distance, so a bow could counter at 1 tile. | Weapons have `minRange` and `maxRange`, and every range check uses the actual distance. |
| 5 | A unit at 0 HP stayed alive, kept blocking its tile and could still move. | `killUnit` marks it defeated and removes it from play. Its tile is freed and it can't move. |
| 6 | `initiateAttack` worked from 33 tiles away and against allies, and units could move again after acting. Only the UI enforced the rules. | The engine validates every command: range, hostility, turn, and whether the unit has moved or acted. |
| 7 | Hit rates came out as values like 151.5 and −10.5. Avoid ignored weapon weight and terrain, crit ignored the defender's Luck, and rolls used `Math.random`. | Rates are whole numbers from 0 to 100, the formulas are complete, and rolls use a seeded RNG. |
| 8 | Turning grass into a wall left its movement cost at 1. | Costs are looked up from the tile's terrain type every time, so tile changes take effect at once. |
| 9 | Paths were never checked for adjacent, affordable steps, and `findPath` wasn't implemented, so units teleported. | `findPath` returns the cheapest route, and `moveUnit` checks every step. |
| 10 | Reset reused unit objects that had already been moved, and every unit shared one `testSword` object. | `createGame` builds fresh units and weapon copies from templates every time. |

The review also turned up some smaller problems, now fixed:

- A status-effect check tested a `Result` with `if (!u)`, which was never true.
- `instensity` is now spelled `intensity`.
- `Unit.range` was removed; range comes from the equipped weapon.
- A 3-second `setTimeout` deselect in the sandbox could clear a newer selection. It's gone.
- Tile keys were built two ways (`"x,y"` and `"x-y"`). There is now one helper, `coordinateKey()`.

### Design changes

**One cheapest-cost map for everything.** `computeDistanceMap` records the cheapest cost to every reachable tile and where each route came from. From that one result the engine gets the movement range, the path to any tile (`pathTo`), and, with an unlimited budget, distances across the whole map for the AI. Units pass through allies but can't stop on them; enemies block the way.

**Fights are worked out first, then applied.** `resolveCombat` produces a `CombatOutcome`: each side's numbers plus an ordered list of strikes (hit or miss, crit, damage, HP afterwards, whether a weapon broke). It never touches the units. The `CombatManager` then applies the final HP, weapon wear and deaths. The forecast runs the same function with a roller that always hits and never crits. The UI plays the strike list back as animation.

**A seeded RNG.** `SeededRng` (mulberry32) is the only source of randomness. The same seed and the same commands always produce the same game, which makes tests, replays and future multiplayer sync possible. Its state can be saved and restored.

**Rules are data.** A `Ruleset` holds three parts:
- `movement`: what it costs a unit to enter a terrain.
- `combat`: every formula (attack, defense, hit, crit, follow-ups, weapon triangle, weapon wear).
- `factions`: who is hostile to whom, built from an alliance table.

Terrain is a table of costs per movement type plus avoid and defense bonuses. Weapons are definitions; each unit gets its own copy with its own durability. A different game means different data and a different ruleset, not new classes.

**The engine owns turns.** `GameManager.execute(command)` is the single way to change the game. Commands are plain data (`move`, `moveTo`, `undoMove`, `attack`, `wait`, `endTurn`), and each one returns a list of events or the reason it was refused. The engine keeps the turn order, resets units at the start of each faction's turn, runs status effects, plays AI factions and detects the end of the game.

**One source of truth for positions.** Tiles no longer store occupancy independently. `GridManager.refreshOccupancy` rebuilds "who stands where" from unit positions after every change, so the two can't disagree.

### Project structure

```
src/
  engine/                     the engine: plain TypeScript, no React
    ai/basicai.ts             plays AI factions
    gamesetup.ts              createGame(scenario): builds and wires everything
    managers/                 grid, unit, movement, combat, status and game managers
    models/                   grid, terrain, units, classes, items, commands and events
    rules/                    Ruleset, default rules, combat resolver
    tests/                    Vitest tests and helpers
    utils/                    Result, seeded RNG, distance map
  app/                        the Next.js app
    components/               map, tiles, unit tokens, unit card, forecast, battle HUD
    context/gamecontext.tsx   GameProvider and useGame()
    data/                     terrain table, test map, weapons, units, scenario
    screens/sandbox/          the sandbox screen, playback hook, panels
```

**Moved:** `src/app/engine` → `src/engine`. The engine no longer imports from `@/app/data`; content is passed in through the scenario.

**Added:**
- Engine: `rules/`, `ai/`, `gamesetup.ts`, `models/grid/terrain.ts`, `models/units/unitclass.ts`, `models/units/statuseffects.ts`, `utils/rng.ts`, `utils/pathing/distancemap.ts` and `tests/`.
- App: `data/grid/terrain.ts`, `data/game/testscenario.ts`, and the new sandbox components.

**Removed:**
- The old pathfinding stack: `pathfindingmanager.ts`, `movement-interfaces.ts` and the `implementations/` folder (five classes).
- 12 empty placeholder files, including `astarpathing.ts`, `dijkstraspathing.ts`, `combatRules.js`, `multiplayerwebsocket.ts`, `login.tsx`, the host and user contexts, and several empty UI components.
- The duplicate `screens/sandbox/sandbox.tsx`.
- `data/grid/tileDictionary.ts` (replaced by `data/grid/terrain.ts`) and `data/game/gamesetup.ts` (replaced by `engine/gamesetup.ts`).

### Breaking changes

If you have code written against the old engine, these are the changes you'll hit:

| Area | Before | Now |
|---|---|---|
| Imports | `@/app/engine/...` | `@/engine/...` |
| `Result` | a class | a union: `{ success: true, value }` or `{ success: false, err }`. Build one with `Result.Success(value)` or `Result.Fail("why")`. |
| Starting a game | managers built by hand | `createGame(scenario, ruleset?)` returns all managers, already wired |
| `GridManager` | `new GridManager()` | `new GridManager(terrainTable, legend)` |
| Tiles | stored a `movementCost` | cost comes from the terrain table, per movement type |
| `UnitClass` | `{ id, name }` | `{ id, name, movementType }` |
| `IUnit` | had `range` | `range` removed. Added `hasMoved` and `stats.constitution`; `position` is a `Coordinate`. |
| Weapons | `range` | `minRange`, `maxRange`, `weight`, optional `maxDurability` and `effectiveAgainst` |
| Status effects | `instensity` | `intensity` |
| Changing the game | call manager methods from the UI | send commands through `gameManager.execute()`. The manager methods still exist but don't check turns. |
| `UiPhase` | `select`, `move`, `action` | adds `target` |
| `npm run lint` | `next lint` | `eslint .` |

### Test data

The test content was changed to behave like Fire Emblem:

- **Terrain:** forest went from cost 5 to cost 2 (3 for mounted units) and now gives +20 avoid and +1 defense. Mountains cost 4 for infantry, can't be crossed by mounted or armored units, and give +30 avoid and +2 defense. Water used to cost 2 for everyone and now only fliers can cross it. Walls are impassable.
- **Weapons:** Iron Sword might 8 → 5 (it now adds to Strength). Fire Tome might 6 → 5, range 2 → 1–2. Iron Bow range 2 → exactly 2, and effective against fliers. Steel Spear might 7 → 10. A new Iron Axe (might 8).
- **Units:** classes now have movement types (the Knight is mounted). Stats and starting positions were rebalanced. The enemy side is now an Enemy Archer and an Enemy Fighter, both played by the AI.
- **Scenario:** [testscenario.ts](src/app/data/game/testscenario.ts) puts it together with turn order P1 then ENEMY, ENEMY controlled by the AI, and seed 2026.

### Sandbox UI

The sandbox was rebuilt from a debug page into something closer to a playable game:

- **Map:** SVG terrain art; unit tokens colored by faction with a weapon icon and an HP bar; a cursor; a path arrow; blue movement and red attack overlays.
- **Previews:** hover any unit to see its reach. **Danger Zone** shades every tile the enemy can attack next turn.
- **Turn flow:** after moving, an action menu offers Attack, Wait or Cancel. Cancel takes the move back (the new `undoMove` command). Attacking shows a full battle forecast and needs a second click or Enter to confirm.
- **Playback:** moves and fights play out as animation: phase banners, units walking their path, lunges, damage numbers, and a battle HUD with HP draining strike by strike. Space or a click skips ahead, and there's a "Fast animations" option.
- **Panels:** turn and phase, a contextual hint, a unit card (stats, combat numbers, items), a terrain card, a battle log, "How to play", and the old debug readouts under "Developer tools".
- **Endgame:** the turn ends on its own once every unit has acted (can be switched off). Victory and Defeat screens offer **Play again**.

### Tooling

- **Vitest 3** for tests, with `vitest.config.ts` mapping `@` to `src`. (Vitest 5 needs newer Node types than the project uses, and Vitest 4 hit an npm install bug.)
- **ESLint 9** with `eslint.config.mjs`, using Next's `core-web-vitals` and `typescript` presets.
- **New scripts:** `npm test`, `npm run test:watch`, and `npm run lint` (now `eslint .`).

---

## Using the engine

### How the pieces fit

```
Scenario (map, terrain, units, turn order, seed)
        │
        ▼
createGame(scenario, ruleset?) ──► GameManagers
                                     ├─ gameManager      turns, commands, events, AI
                                     ├─ movementManager  range, paths, moving
                                     ├─ combatManager    forecast, attack ranges, fights
                                     ├─ unitManager      unit state
                                     ├─ gridManager      tiles and terrain
                                     └─ statusManager    poison, stun, haste, slow
UI / AI / network
        │  gameManager.execute({ type: "moveTo", ... })
        ▼
   validated ──► state updated ──► events returned ──► UI plays them back
```

Use the other managers to **ask questions** (where can this unit go, what would this fight look like). Use `gameManager.execute` to **change things**.

### 1. Define your content

**Terrain.** A legend maps map characters to tile types. A terrain table gives each type a cost per movement type (`null` means it can't be entered) plus cover bonuses.

```ts
import { TileType } from "@/engine/models/grid/itile";
import { TerrainTable } from "@/engine/models/grid/terrain";
import { MovementType } from "@/engine/models/units/unitclass";

const { INFANTRY, ARMORED, MOUNTED, FLYING } = MovementType;

export const legend: Record<string, TileType> = {
    G: TileType.Grass, F: TileType.Forest, M: TileType.Mountain, W: TileType.Water, B: TileType.Block,
};

export const terrain: TerrainTable = {
    [TileType.Grass]:    { type: TileType.Grass,    name: "Grass",    moveCost: { [INFANTRY]: 1, [ARMORED]: 1, [MOUNTED]: 1, [FLYING]: 1 }, avoid: 0,  defense: 0 },
    [TileType.Forest]:   { type: TileType.Forest,   name: "Forest",   moveCost: { [INFANTRY]: 2, [ARMORED]: 2, [MOUNTED]: 3, [FLYING]: 1 }, avoid: 20, defense: 1 },
    [TileType.Mountain]: { type: TileType.Mountain, name: "Mountain", moveCost: { [INFANTRY]: 4, [ARMORED]: null, [MOUNTED]: null, [FLYING]: 1 }, avoid: 30, defense: 2 },
    [TileType.Water]:    { type: TileType.Water,    name: "Water",    moveCost: { [INFANTRY]: null, [ARMORED]: null, [MOUNTED]: null, [FLYING]: 1 }, avoid: 0, defense: 0 },
    [TileType.Block]:    { type: TileType.Block,    name: "Wall",     moveCost: { [INFANTRY]: null, [ARMORED]: null, [MOUNTED]: null, [FLYING]: null }, avoid: 0, defense: 0 },
};
```

The sandbox's real table is in [src/app/data/grid/terrain.ts](src/app/data/grid/terrain.ts).

**Weapons.** A `WeaponDefinition` is the weapon as written in data. Each unit gets its own copy, so durability is tracked per unit.

```ts
import { ItemCategory } from "@/engine/models/items/item";
import { WeaponDefinition, WeaponType } from "@/engine/models/items/weaponitem";

export const ironBow: WeaponDefinition = {
    itemTypeId: "iron-bow",
    name: "Iron Bow",
    category: ItemCategory.WEAPON,
    weaponType: WeaponType.BOW,
    attack: 6,                              // might
    minRange: 2,                            // can't hit adjacent units
    maxRange: 2,
    weight: 5,                              // slows the wielder by however much this exceeds their Con
    baseHitRate: 85,
    baseCritRate: 0,
    maxDurability: 45,                      // leave out for an unbreakable weapon
    effectiveAgainst: [MovementType.FLYING], // triple might against fliers
};
```

`BMAGIC` and `WMAGIC` weapons use Magic against Resistance. Staves can't attack.

**Units.** A `UnitTemplate` describes a unit before the game creates it. The first weapon in `weapons` is equipped.

```ts
import { UnitFaction } from "@/engine/models/units/iunit";
import { UnitTemplate } from "@/engine/models/units/unit";

export const archer: UnitTemplate = {
    id: "enemy-archer",
    unitTypeId: "archer",
    name: "Enemy Archer",
    position: { x: 12, y: 3 },
    unitClass: { id: "archer", name: "Archer", movementType: MovementType.INFANTRY },
    stats: {
        level: 5, currentExperience: 0, currentHealth: 20, maxHealth: 20,
        strength: 6, magic: 2, skill: 6, speed: 5, luck: 4,
        defense: 4, resistance: 3, constitution: 8, movement: 5,
    },
    growths: {
        levelGR: 0, healthGR: 70, strengthGR: 40, magicGR: 10, skillGR: 50,
        speedGR: 40, luckGR: 30, defenseGR: 20, resistanceGR: 15, movementGR: 0,
    },
    faction: UnitFaction.ENEMY,
    weapons: [ironBow],
};
```

**Scenario.** A scenario ties it together.

```ts
import { Scenario } from "@/engine/gamesetup";

export const scenario: Scenario = {
    map: [
        "GGFGGG".split(""),
        "GWWGMG".split(""),
        "GGGGGG".split(""),
    ],
    legend,
    terrain,
    units: [knight, archer],                       // knight: another UnitTemplate like archer
    turnOrder: [UnitFaction.P1, UnitFaction.ENEMY],
    controllers: { [UnitFaction.ENEMY]: "ai" },   // anything not listed is human
    seed: 2026,                                    // leave out for a random game
};
```

All rows must be the same length. Maps can be any width and height.

### 2. Start a game

```ts
import { createGame } from "@/engine/gamesetup";

const game = createGame(scenario);   // optional second argument: your own Ruleset
const { gameManager, movementManager, combatManager, unitManager, gridManager } = game;
```

`createGame` builds fresh units from the templates, checks that every unit starts on the map and on its own tile (it throws if not), wires up the AI, and starts turn 1. If the first faction in the turn order is AI-controlled, it plays its turn straight away.

Call `createGame` again to restart. Templates are never modified, so a new game always starts from the same state.

### 3. Send commands

Every change goes through `gameManager.execute`. It returns a `Result` with the events that happened, or the reason the command was refused.

```ts
const result = gameManager.execute({ type: "moveTo", unitId: "knight", destination: { x: 5, y: 2 } });

if (result.success) {
    for (const event of result.value) console.log(event.type);   // "unitMoved"
} else {
    console.log(result.err);   // e.g. "Test Knight has already moved this turn"
}
```

| Command | Does | Refused when |
|---|---|---|
| `{ type: "moveTo", unitId, destination }` | Moves along the cheapest path. | Out of range, occupied, already moved or acted. |
| `{ type: "move", unitId, path }` | Moves along a path you give (each step after the start). An empty path means staying put but counts as moving. | A step isn't adjacent, can't be entered or is too expensive; the path ends on another unit. |
| `{ type: "undoMove", unitId }` | Takes back this turn's move. | The unit hasn't moved, or has already acted. |
| `{ type: "attack", unitId, targetId }` | Fights. The attacker is then done for the turn. | Not hostile, out of weapon range, no usable weapon, already acted. |
| `{ type: "wait", unitId }` | Ends the unit's turn without acting. | Already acted. |
| `{ type: "endTurn" }` | Passes the turn. AI factions play immediately. | The game is over. |

Every unit command is also refused if it isn't that unit's faction's turn, if the unit has been defeated, or if the active faction isn't human-controlled.

A unit can move once and then act once (attack or wait), like Fire Emblem. It can't move after attacking.

**Events** describe what happened, in order:

| Event | Fields |
|---|---|
| `turnStarted` | `turn`, `faction` |
| `unitMoved` | `unitId`, `path` |
| `moveUndone` | `unitId`, `to` |
| `combat` | `attackerId`, `defenderId`, `outcome` (the full `CombatOutcome`, including every strike) |
| `unitWaited` | `unitId` |
| `statusDamage` | `unitId`, `damage` |
| `unitDefeated` | `unitId` |
| `gameOver` | `winner` (a faction, or `null`) |

`gameManager.getHistory()` returns every event since the game started. `gameManager.getState()` returns `{ turn, activeFaction, isOver, winner }`.

### 4. Ask the engine questions

These don't change anything, so the UI and the AI can call them freely.

```ts
// Where can the knight stop this turn? (includes its own tile)
movementManager.getMovementRange("knight").value;              // Coordinate[]

// The route it would take: every step after the start
movementManager.findPath("knight", { x: 5, y: 2 }).value;      // Coordinate[]

// What could it attack from a tile it might move to?
combatManager.getAttackRange("knight", { x: 5, y: 2 }).value;          // tiles its weapon reaches
combatManager.getAttackableTargets("knight", { x: 5, y: 2 }).value;    // enemies on those tiles

// What would the fight look like? (every strike lands, no crits, no randomness)
const forecast = combatManager.forecast("knight", "enemy-archer").value!;
forecast.attacker.damage;        // damage per hit
forecast.attacker.hitRate;       // 0 to 100
forecast.attacker.strikes;       // 0, 1 or 2
forecast.defender.canAttack;     // false if its weapon can't reach (a bow at range 1)
forecast.defenderHp;             // HP afterwards if every hit lands
forecast.defenderKilled;

// Attack, hit, crit, avoid and attack speed for a stat screen
combatManager.getDisplayStats("knight").value;
```

For anything beyond one turn's movement, use the distance map directly:

```ts
import { costAt, pathTo, reachableTiles } from "@/engine/utils/pathing/distancemap";

const map = movementManager.getDistanceMap("knight", { budget: Infinity }).value!;
costAt(map, { x: 19, y: 14 });   // cheapest cost across the whole map, or undefined if unreachable
pathTo(map, { x: 19, y: 14 });   // the route there
```

`getDistanceMap` also accepts `from` to search from a different tile.

### 5. Turns and the AI

- Factions take turns in `scenario.turnOrder`. Factions with no living units are skipped.
- At the start of a faction's turn, its units can move and act again, and their status effects tick: poison deals damage (and can kill), stun skips the unit's turn, and haste and slow change movement.
- When a turn reaches an AI-controlled faction, `BasicAi` plays every one of its units before `execute` returns. The resulting events come back from that same `endTurn` call.
- `BasicAi` takes the best attack it can reach this turn. It scores expected damage dealt minus damage taken, adds a bonus for a likely kill, and prefers shorter moves on ties. If nothing is in reach, it walks toward the nearest enemy along the cheapest route.
- The game ends when no two factions with living units are hostile to each other. `winner` is the faction left standing.
- In a game where **every** faction is AI-controlled (simulations, balance testing), call `gameManager.continueAi()` to play the next round.

To use a different AI, implement `AiController` (one method: `planUnit(unitId)` returns a list of commands) and pass it to `gameManager.setAi()`.

### 6. Change the rules

`createGame(scenario, ruleset)` takes any `Ruleset`. The easiest way to make one is to start from the defaults and override what you need:

```ts
import { createDefaultRuleset } from "@/engine/rules/defaultruleset";
import { Ruleset } from "@/engine/rules/ruleset";

const base = createDefaultRuleset({
    // Free-for-all: each faction in its own group. The default is [[P1, P2], [ENEMY]].
    alliances: [[UnitFaction.P1], [UnitFaction.P2], [UnitFaction.ENEMY]],
});

const ruleset: Ruleset = {
    ...base,
    combat: {
        ...base.combat,
        followUpThreshold: 5,   // need a 5-point speed lead to strike twice
        hitRoll: "single",      // the displayed hit rate is the real one (no "true hit")
        critMultiplier: 2,
    },
    movement: {
        // Example: fliers ignore terrain entirely
        terrainCost: (unit, terrain) =>
            unit.unitClass.movementType === MovementType.FLYING ? 1 : terrain.moveCost[unit.unitClass.movementType],
    },
};

const game = createGame(scenario, ruleset);
```

The full list of overridable formulas is the `CombatRules` interface in [ruleset.ts](src/engine/rules/ruleset.ts): `canAttackWith`, `attack`, `defense`, `attackSpeed`, `hitRate`, `critRate`, `triangle`, `isEffective`, `followUpThreshold`, `critMultiplier`, `hitRoll`, `usesWeaponOnMiss` and `displayStats`. A faction listed in no alliance group (by default, `NEUTRAL`) fights no one.

### 7. Replays and determinism

With a fixed `seed`, the same commands always play out the same way, AI turns included. To replay a game, keep the commands the player sent and run them against a fresh game:

```ts
const sent: GameCommand[] = [];
// ...push each command as the player sends it...

const replay = createGame(scenario);   // same scenario, same seed
for (const command of sent) replay.gameManager.execute(command);
```

To save and restore the RNG mid-game, use `game.rng.getState()` and `game.rng.setState(state)`.

### 8. Using it from React

The engine updates its objects in place and tells listeners when something changes. `GameManager` exposes `subscribe` and `getVersion` for `useSyncExternalStore`:

```tsx
const version = useSyncExternalStore(gameManager.subscribe, gameManager.getVersion, gameManager.getVersion);
```

The app already does this in `GameProvider` ([gamecontext.tsx](src/app/context/gamecontext.tsx)). Components inside it call `useGame()` to get `managers`, `version`, `resetGame()` and the UI-only state (`selectedUnit`, `hoveredTile`, `gamePhase` and so on).

**Animating results.** The engine applies a command immediately, so to animate it the sandbox takes a snapshot of every unit before calling `execute`, then replays the returned events from that snapshot. The pattern is in [useplayback.ts](src/app/screens/sandbox/useplayback.ts):

```ts
const before = snapshotUnits(unitManager.getAllUnits().value!);
const result = gameManager.execute(command);
if (result.success) play(result.value, before, context);   // walks, strikes, banners...
```

While a replay runs, the map draws from the snapshot. When it ends (or is skipped), the map draws the engine's state again, which is where the replay ends up anyway.

### Default combat formulas

These follow *The Sacred Stones* and live in [defaultruleset.ts](src/engine/rules/defaultruleset.ts).

| Stat | Formula |
|---|---|
| Attack | (might ± 1 weapon triangle) × 3 if effective, + Str (Mag for tomes) |
| Defense | Def + terrain defense; Res against magic (terrain doesn't help) |
| Damage | Attack − Defense, never below 0 |
| Attack speed | Spd − max(0, weapon weight − Con) |
| Hit | weapon hit + Skl × 2 + Lck ÷ 2 ± 15 weapon triangle − avoid, clamped to 0–100 |
| Avoid | attack speed × 2 + Lck + terrain avoid |
| Crit | weapon crit + Skl ÷ 2 − the defender's Lck, clamped to 0–100 |
| Critical hit | triple damage |
| Strikes twice | attack speed at least 4 higher than the opponent's |
| Hit roll | "true hit": the average of two rolls, so 80% displayed is about 92% real and 20% is about 8% |

- **Weapon triangle:** sword beats axe, axe beats spear, spear beats sword.
- **Order of strikes:** the attacker, then the defender if its weapon reaches, then a follow-up from whichever side is faster. The fight stops as soon as someone dies.
- **Weapon wear:** a weapon loses a use on each hit (magic on every swing, hit or miss). It breaks and is discarded at 0.

---

## Testing

```bash
npm test             # run once
npm run test:watch   # rerun on save
npm run lint
npm run build        # production build; also type-checks and lints
```

The tests live in [src/engine/tests/](src/engine/tests/) and cover movement, combat, units, the grid and the game manager. [helpers.ts](src/engine/tests/helpers.ts) makes small games quick to write: maps are strings (`.` grass, `F` forest, `M` mountain, `W` water, `#` wall), and `unit()` creates a unit with plain, even stats that you override as needed.

```ts
import { expect, it } from "vitest";
import { UnitFaction } from "../models/units/iunit";
import { game, unit, bow } from "./helpers";

it("a bow can't counter up close", () => {
    const { combatManager } = game(["..."], [
        unit("a", UnitFaction.P1, 0, 0),
        unit("archer", UnitFaction.ENEMY, 1, 0, { weapons: [bow] }),
    ]);

    expect(combatManager.forecast("a", "archer").value!.defender.canAttack).toBe(false);
});
```

---

## Running the sandbox

```bash
npm install
npm run dev     # then open http://localhost:3000
```

1. Click one of your units. Blue tiles show where it can move, red tiles what it could hit from there.
2. Click a blue tile to move. The arrow shows the route.
3. Choose **Attack** and click an enemy to see the forecast. Click it again (or press Enter) to strike.
4. **Cancel** or right-click takes the move back until the unit acts.
5. When every unit has acted, the turn ends and the enemy plays.

| Key | Action |
|---|---|
| E | End turn |
| D | Toggle the danger zone |
| A | Attack (from the action menu) |
| W | Wait |
| Esc or right-click | Go back a step: un-pick a target, undo a move, deselect |
| Enter | Confirm the attack |
| Space | Skip an animation |

---

## Not done yet

- **Item effects and skills** are modeled (`itemeffects.ts`, `unitskills.ts`) but the engine doesn't use them yet.
- **Experience and level-ups** aren't implemented; growth rates are stored but unused.
- **Multiplayer:** commands are plain data and games are deterministic, which is the groundwork, but there's no networking.
- **AI:** `BasicAi` doesn't consider terrain, retreating, healing or protecting allies.
- **Danger zone** is computed in the sandbox ([threat.ts](src/app/screens/sandbox/threat.ts)), not the engine. The AI could use it if it moved into the engine.
- **Art:** the sandbox draws everything with CSS and inline SVG; there are no sprite sheets or sounds.
