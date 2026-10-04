import { BasicAi } from "./ai/basicai";
import { Controller } from "./models/game/gamestate";
import { TileType } from "./models/grid/itile";
import { TerrainTable } from "./models/grid/terrain";
import { UnitFaction } from "./models/units/iunit";
import { createUnit, UnitTemplate } from "./models/units/unit";
import { CombatManager } from "./managers/combatmanager";
import { GameManager } from "./managers/gamemanager";
import { GridManager } from "./managers/gridmanager";
import { MovementManager } from "./managers/movementmanager";
import { StatusManager } from "./managers/statusmanager";
import { UnitManager } from "./managers/unitmanager";
import { createDefaultRuleset } from "./rules/defaultruleset";
import { Ruleset } from "./rules/ruleset";
import { Rng, SeededRng } from "./utils/rng";

/** Everything needed to start a game: the map, its terrain, the units and who plays them. */
export interface Scenario {
    map: string[][];
    /** Which map character stands for which tile type. */
    legend: Record<string, TileType>;
    terrain: TerrainTable;
    units: UnitTemplate[];
    turnOrder: UnitFaction[];
    controllers?: Partial<Record<UnitFaction, Controller>>;
    /** RNG seed. The same seed and the same commands always play out the same way. */
    seed?: number;
}

export interface GameManagers {
    gridManager: GridManager;
    unitManager: UnitManager;
    movementManager: MovementManager;
    combatManager: CombatManager;
    statusManager: StatusManager;
    gameManager: GameManager;
    rng: Rng;
    ruleset: Ruleset;
}

/**
 * Build a ready-to-play game. Units are created fresh from the scenario's
 * templates every time, so starting over always starts from the same state.
 */
export function createGame(scenario: Scenario, ruleset: Ruleset = createDefaultRuleset()): GameManagers {
    const gridManager = new GridManager(scenario.terrain, scenario.legend);
    const unitManager = new UnitManager();
    const rng = new SeededRng(scenario.seed ?? Date.now());

    const gridResult = gridManager.buildGridFromArr(scenario.map);
    if (!gridResult.success) {
        throw new Error(`Failed to build grid: ${gridResult.err}`);
    }

    for (const template of scenario.units) {
        if (!gridManager.isValidPosition(template.position.x, template.position.y)) {
            throw new Error(`${template.name} starts off the map at (${template.position.x}, ${template.position.y})`);
        }

        if (unitManager.getUnitAtPosition(template.position.x, template.position.y).success) {
            throw new Error(`${template.name} starts on an occupied tile at (${template.position.x}, ${template.position.y})`);
        }

        unitManager.setUnit(createUnit(template));
    }

    gridManager.refreshOccupancy(unitManager.getAllUnits().value!);

    const movementManager = new MovementManager(unitManager, gridManager, ruleset);
    const combatManager = new CombatManager(unitManager, gridManager, ruleset, rng);
    const statusManager = new StatusManager(unitManager, gridManager);
    const gameManager = new GameManager(unitManager, movementManager, combatManager, statusManager, ruleset, {
        turnOrder: scenario.turnOrder,
        controllers: scenario.controllers,
    });

    gameManager.setAi(new BasicAi(unitManager, movementManager, combatManager, ruleset));
    gameManager.start();

    return { gridManager, unitManager, movementManager, combatManager, statusManager, gameManager, rng, ruleset };
}
