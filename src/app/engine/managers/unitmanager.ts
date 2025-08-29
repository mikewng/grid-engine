import { Unit, UnitFaction, UnitStats } from "../models/units/unit";
import { Result } from "../utils/resultclass";

export class UnitManager {
    private units: Map<string, Unit> = new Map();


    // BASIC CRUD
    setUnit(unit: Unit): Result<boolean> {
        this.units.set(unit.id, unit);
        return Result.Success(true)
    }

    removeUnit(id: string): Result<boolean> {
        this.units.delete(id);
        return Result.Success(true)
    }

    getUnitById(id: string): Result<Unit> {
        const unit = this.units.get(id)
        if (!unit) return Result.Fail("Could not find unit by given ID.")
        return Result.Success(unit);
    }

    getUnitAtPosition(x: number, y: number): Result<Unit> {
        const unit = Array.from(this.units.values()).find(unit => unit.position.x === x && unit.position.y === y);
        if (!unit) return Result.Fail(`No unit found at position (${x}, ${y})`);
        return Result.Success(unit);
    }

    getUnitsByFaction(factionType: UnitFaction): Result<Unit[]> {
        const units = Array.from(this.units.values()).filter(unit => unit.unitFaction === factionType);
        return Result.Success(units);
    }

    getUnitStats(id: string): Result<UnitStats> {
        const unit = this.units.get(id);
        if (!unit) return Result.Fail("Could not find unit by given ID.");
        return Result.Success(unit.stats);
    }

    getAllUnits(): Result<Unit[]> {
        return Result.Success(Array.from(this.units.values()));
    }

    getAliveUnits(): Result<Unit[]> {
        const aliveUnits = Array.from(this.units.values()).filter(unit => unit.isAlive);
        return Result.Success(aliveUnits);
    }

    getActiveUnits(): Result<Unit[]> {
        const activeUnits = Array.from(this.units.values()).filter(unit => unit.isAlive && !unit.hasActed);
        return Result.Success(activeUnits);
    }

    setUnitPosition(id: string, x: number, y: number): Result<boolean> {
        const unit = this.units.get(id);
        if (unit) {
            unit.position = { x, y }
            return Result.Success(true);
        } else {
            return Result.Fail(`Could not update unit position for given unit ID: ${id}`);
        }
    }

    patchUnit(id: string, changes: Partial<Unit>): Result<Unit> {
        const unit = this.getUnitById(id);
        if (!unit.value) return Result.Fail("Could not find unit by given ID.");
        this.setUnit({ ...unit.value, ...changes })

        return Result.Success(unit.value)
    }

    // BUSINESS LOGIC
    markUnitActed(id: string): Result<Unit> {
        const unit = this.getUnitById(id);
        if (!unit.value) return Result.Fail("Could not find unit by given ID.");
        this.setUnit({ ...unit.value, hasActed: true })

        return Result.Success(unit.value)
    }
}