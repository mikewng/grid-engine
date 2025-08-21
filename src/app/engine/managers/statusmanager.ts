import { UnitManager } from "./unitmanager";

export class StatusManager {
    constructor(private units: UnitManager) { }

    tickUnit(unitId: string) {
        const u = this.units.getUnitById(unitId);
        if (!u) return false;
        // Implementation
    }
}