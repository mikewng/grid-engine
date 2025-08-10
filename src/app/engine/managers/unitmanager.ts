class UnitManager {
    private units: Map<string, Unit> = new Map();

    /**
     * TODO
     * - Add Unit(s)
     * - Remove Unit(s)
     * - Move Unit
     * - Get Unit by ID
     * - Get Units by Faction
     * - Get Unit at XY position
     */

    addUnit(unit: Unit) {
        this.units.set(unit.id, unit);
    }

    removeUnit(id: string) {
        this.units.delete(id);
    }

    moveUnit(id: string, x: number, y: number) {
        const unit = this.units.get(id);
        if (unit) {
            unit.position = { x, y }
        }
    }

    getUnitById(id: string) {

    }

    getUnitIdAtPosition(x: number, y: number) {
        
    }

    
}