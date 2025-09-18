import { ITile } from "../../models/grid/itile";
import { IUnit } from "../../models/units/iunit";
import { MovementCostCalculator } from "../interfaces/movement-interfaces";

export class BasicMovementCostCalculator implements MovementCostCalculator {
    calculateCost(tile: ITile, unit: IUnit): number {
        return tile.movementCost;
    }
}