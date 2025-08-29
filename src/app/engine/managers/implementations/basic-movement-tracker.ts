import { MovementTracker } from "../interfaces/movement-interfaces";
import { Result } from "../../utils/resultclass";

export class BasicMovementTracker implements MovementTracker {
    initializeBudget(unit: Unit): number {
        return unit.movement;
    }

    consumeBudget(current: number, cost: number): Result<number> {
        const newBudget = current - cost;
        if (newBudget < 0) {
            return Result.Fail("Movement cost exceeded available movement budget");
        }
        return Result.Success(newBudget);
    }
}