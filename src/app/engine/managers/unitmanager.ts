export class UnitManager {
    private units: Map<string, Unit> = new Map();

    addUnit(unit: Unit) {
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

    setUnitPosition(id: string, x: number, y: number) {
        const unit = this.units.get(id);
        if (unit) {
            unit.position = { x, y }
        }
    }
    
}