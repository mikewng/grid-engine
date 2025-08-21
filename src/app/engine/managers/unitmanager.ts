export class UnitManager {
    private units: Map<string, Unit> = new Map();


    // BASIC CRUD
    setUnit(unit: Unit) {
        this.units.set(unit.id, unit);
    }

    removeUnit(id: string) {
        this.units.delete(id);
    }

    getUnitById(id: string) {
        return this.units.get(id) ?? undefined;
    }

    getUnitIdAtPosition(x: number, y: number) {
        return this.units.values().find(unit => unit.position.x === x && unit.position.y === y) ?? undefined;
    }

    getUnitsByFaction(factionType: UnitFaction) {
        return this.units.values().filter(unit => unit.unitFaction === factionType) ?? undefined;
    }

    getUnitStats(id: string) {
        return this.units.get(id)?.stats;
    }

    setUnitPosition(id: string, x: number, y: number) {
        const unit = this.units.get(id);
        if (unit) {
            unit.position = { x, y }
        }
    }

    patchUnit(id: string, changes: Partial<Unit>) {
        const unit = this.getUnitById(id);
        if (!unit) return false;
        this.setUnit({ ...unit, ...changes })
    }

    // BUSINESS LOGIC
}