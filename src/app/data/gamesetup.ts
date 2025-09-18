import { Grid } from "../engine/models/grid/grid";
import { GameUnit } from "../engine/models/units/unit";
import { GridManager } from "../engine/managers/gridmanager";
import { UnitManager } from "../engine/managers/unitmanager";
import { MovementManager } from "../engine/managers/movementmanager";
import { PathfindingManager } from "../engine/managers/pathfindingmanager";
import { BasicMovementCostCalculator } from "../engine/managers/implementations/basic-movement-cost-calculator";
import { BasicPathValidator } from "../engine/managers/implementations/basic-path-validator";
import { BasicMovementTracker } from "../engine/managers/implementations/basic-movement-tracker";
import { BasicGridMutator } from "../engine/managers/implementations/basic-grid-mutator";
import { BasicPathfindingService } from "../engine/managers/implementations/basic-pathfinding-service";

export interface GameManagers {
    gridManager: GridManager;
    unitManager: UnitManager;
    movementManager: MovementManager;
}

export class GameSetup {
    static initializeManagers(grid: Grid, unit: GameUnit): GameManagers {
        const gridManager = new GridManager();
        const unitManager = new UnitManager();

        // Set up managers with data
        gridManager.setGrid(grid);
        unitManager.setUnit(unit);

        // Create movement system components
        const costCalculator = new BasicMovementCostCalculator();
        const pathValidator = new BasicPathValidator(gridManager);
        const movementTracker = new BasicMovementTracker();
        const gridMutator = new BasicGridMutator(gridManager, unitManager);
        const pathfindingService = new BasicPathfindingService(gridManager, costCalculator, pathValidator);

        // Create pathfinding manager
        const pathfindingManager = new PathfindingManager(
            unitManager,
            gridManager,
            costCalculator,
            pathValidator,
            movementTracker,
            pathfindingService
        );

        const movementManager = new MovementManager(
            unitManager,
            pathfindingManager,
            gridMutator
        );

        return { gridManager, unitManager, movementManager };
    }
}