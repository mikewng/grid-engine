import { Grid } from "../../engine/models/grid/grid";
import { GameUnit } from "../../engine/models/units/unit";
import { GridManager } from "../../engine/managers/gridmanager";
import { UnitManager } from "../../engine/managers/unitmanager";
import { MovementManager } from "../../engine/managers/movementmanager";
import { PathfindingManager } from "../../engine/managers/pathfindingmanager";
import { IGridManager, IUnitManager, IMovementManager } from "../../engine/managers/interfaces/manager-interfaces";
import { BasicMovementCostCalculator } from "../../engine/managers/implementations/basic-movement-cost-calculator";
import { BasicPathValidator } from "../../engine/managers/implementations/basic-path-validator";
import { BasicMovementTracker } from "../../engine/managers/implementations/basic-movement-tracker";
import { BasicGridMutator } from "../../engine/managers/implementations/basic-grid-mutator";
import { BasicPathfindingService } from "../../engine/managers/implementations/basic-pathfinding-service";

export interface GameManagers {
    gridManager: IGridManager;
    unitManager: IUnitManager;
    movementManager: IMovementManager;
}

export class GameSetup {
    static initializeManagers(gridArray: string[][], units: GameUnit[]): GameManagers {
        const gridManager = new GridManager();
        const unitManager = new UnitManager();


        // Set up managers with data
        const gridResult = gridManager.buildGridFromArr(gridArray);
        if (!gridResult.success) {
            throw new Error(`Failed to build grid: ${gridResult.err}`);
        }


        units.forEach(unit => {
            unitManager.setUnit(unit);
            // Place unit on the grid
            const tileOccupationResult = gridManager.setTileOccupation(unit.position.x, unit.position.y, unit.id);
            if (!tileOccupationResult.success) {
                throw new Error(`Failed to place unit on grid: ${tileOccupationResult.err}`);
            }
        });

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