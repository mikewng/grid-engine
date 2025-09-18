import { Coordinate } from "../../models/grid/coordinate";
import { IUnit } from "../../models/units/iunit";
import { Result } from "../../utils/resultclass";
import { PathfindingService, MovementCostCalculator, PathValidator } from "../interfaces/movement-interfaces";
import { GridManager } from "../gridmanager";

export class BasicPathfindingService implements PathfindingService {
    constructor(
        private gridManager: GridManager,
        private costCalculator: MovementCostCalculator,
        private pathValidator: PathValidator
    ) {}

    calculateMovementRange(unit: IUnit, movementBudget: number): Result<Coordinate[]> {
        const reachableTiles: Coordinate[] = [];
        const visited = new Set<string>();
        const queue: Array<{ position: Coordinate, remainingBudget: number }> = [];

        queue.push({ position: unit.position, remainingBudget: movementBudget });
        visited.add(`${unit.position.x},${unit.position.y}`);

        while (queue.length > 0) {
            const current = queue.shift()!;

            const neighbors = this.getAdjacentTiles(current.position);
            for (const neighbor of neighbors) {
                const positionKey = `${neighbor.x},${neighbor.y}`;

                if (visited.has(positionKey)) {
                    continue;
                }

                const stepValidation = this.pathValidator.validateStep(neighbor, unit);
                if (!stepValidation.success) {
                    continue;
                }

                const tile = this.gridManager.getTileAtPosition(neighbor.x, neighbor.y);
                if (!tile.success || !tile.value) {
                    continue;
                }

                const movementCost = this.costCalculator.calculateCost(tile.value, unit);
                const remaining = current.remainingBudget - movementCost;

                if (remaining >= 0) {
                    visited.add(positionKey);
                    reachableTiles.push(neighbor);

                    if (remaining > 0) {
                        queue.push({
                            position: neighbor,
                            remainingBudget: remaining
                        });
                    }
                }
            }
        }

        return Result.Success(reachableTiles);
    }

    findPath(unit: IUnit, from: Coordinate, to: Coordinate): Result<Coordinate[]> {
        return Result.Fail("Not implemented");
    }

    private getAdjacentTiles(position: Coordinate): Coordinate[] {
        const adjacent: Coordinate[] = [];
        const directions = [
            { x: 0, y: -1 }, // North
            { x: 1, y: 0 },  // East
            { x: 0, y: 1 },  // South
            { x: -1, y: 0 }  // West
        ];

        for (const direction of directions) {
            const newPosition = {
                x: position.x + direction.x,
                y: position.y + direction.y
            };

            const isValid = this.gridManager.isValidPosition(newPosition.x, newPosition.y);
            if (isValid.success && isValid.value) {
                adjacent.push(newPosition);
            }
        }

        return adjacent;
    }

    private heuristic(a: Coordinate, b: Coordinate): number {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    private reconstructPath(cameFrom: Map<string, Coordinate>, current: string): Coordinate[] {
        const path: Coordinate[] = [];
        const [x, y] = current.split(',').map(Number);
        path.push({ x, y });

        while (cameFrom.has(current)) {
            const coord = cameFrom.get(current)!;
            current = `${coord.x},${coord.y}`;
            path.unshift(coord);
        }

        return path;
    }
}