import { ITile } from "../../models/grid/itile";
import { Unit } from "../../models/units/unit";
import { MovementCostCalculator } from "../interfaces/movement-interfaces";

export class BasicMovementCostCalculator implements MovementCostCalculator {
    calculateCost(tile: ITile, unit: Unit): number {
        return tile.movementCost;
    }
}