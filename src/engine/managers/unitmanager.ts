import { IUnit, UnitFaction, UnitStats } from "../models/units/iunit";
import { Result } from "../utils/resultclass";
import { IUnitManager } from "./interfaces/manager-interfaces";

/**
 * The single place unit state is kept. Units are updated in place, so a stored
 * Unit stays a Unit (with its methods) and every reference to it stays current.
 */
export class UnitManager implements IUnitManager {
    private units: Map<string, IUnit> = new Map();


    // BASIC CRUD
    setUnit(unit: IUnit): Result<boolean> {
        this.units.set(unit.id, unit);
        return Result.Success(true)
    }

    removeUnit(id: string): Result<boolean> {
        this.units.delete(id);
        return Result.Success(true)
    }

    getUnitById(id: string): Result<IUnit> {
        const unit = this.units.get(id)
        if (!unit) return Result.Fail("Could not find unit by given ID.")
        return Result.Success(unit);
    }

    getUnitAtPosition(x: number, y: number): Result<IUnit> {
        const unit = Array.from(this.units.values()).find(unit => unit.isAlive && unit.position.x === x && unit.position.y === y);
        if (!unit) return Result.Fail(`No unit found at position (${x}, ${y})`);
        return Result.Success(unit);
    }

    getUnitsByFaction(factionType: UnitFaction): Result<IUnit[]> {
        const units = Array.from(this.units.values()).filter(unit => unit.unitFaction === factionType);
        return Result.Success(units);
    }

    getUnitStats(id: string): Result<UnitStats> {
        const unit = this.units.get(id);
        if (!unit) return Result.Fail("Could not find unit by given ID.");
        return Result.Success(unit.stats);
    }

    getAllUnits(): Result<IUnit[]> {
        return Result.Success(Array.from(this.units.values()));
    }

    getAliveUnits(): Result<IUnit[]> {
        const aliveUnits = Array.from(this.units.values()).filter(unit => unit.isAlive);
        return Result.Success(aliveUnits);
    }

    getActiveUnits(): Result<IUnit[]> {
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

    patchUnit(id: string, changes: Partial<IUnit>): Result<IUnit> {
        const unit = this.units.get(id);
        if (!unit) return Result.Fail("Could not find unit by given ID.");

        Object.assign(unit, changes);
        return Result.Success(unit);
    }

    // BUSINESS LOGIC
    markUnitActed(id: string): Result<boolean> {
        const unit = this.units.get(id);
        if (!unit) return Result.Fail("Could not find unit by given ID.");

        unit.hasMoved = true;
        unit.hasActed = true;
        return Result.Success(true)
    }

    markUnitUnacted(id: string): Result<boolean> {
        const unit = this.units.get(id);
        if (!unit) return Result.Fail("Could not find unit by given ID.");

        unit.hasMoved = false;
        unit.hasActed = false;
        return Result.Success(true)
    }

    isUnitActed(id: string): Result<boolean> {
        const unit = this.units.get(id);
        if (!unit) return Result.Fail("Could not find unit by given ID.");
        return Result.Success(unit.hasActed)
    }

    killUnit(id: string): Result<boolean> {
        const unit = this.units.get(id);
        if (!unit) return Result.Fail("Could not find unit by given ID.");

        unit.stats.currentHealth = 0;
        unit.isAlive = false;
        unit.hasActed = true;
        return Result.Success(true);
    }

    resetTurnFlags(faction: UnitFaction): void {
        for (const unit of this.units.values()) {
            if (unit.isAlive && unit.unitFaction === faction) {
                unit.hasMoved = false;
                unit.hasActed = false;
            }
        }
    }
}
