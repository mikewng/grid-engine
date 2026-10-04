import { UnitFaction } from "../models/units/iunit";
import { tickStatusEffects } from "../models/units/statuseffects";
import { IGridManager, IUnitManager } from "./interfaces/manager-interfaces";

export interface StatusTick {
    unitId: string;
    damage: number;
    defeated: boolean;
}

export class StatusManager {
    constructor(
        private units: IUnitManager,
        private grid: IGridManager,
    ) { }

    /** Run one turn of status effects for a faction's living units (at the start of its turn). */
    tickFaction(faction: UnitFaction): StatusTick[] {
        const ticks: StatusTick[] = [];

        for (const unit of this.units.getUnitsByFaction(faction).value!) {
            if (!unit.isAlive || unit.statusEffects.length === 0) continue;

            const { damage } = tickStatusEffects(unit);
            const defeated = unit.stats.currentHealth <= 0;

            if (defeated) this.units.killUnit(unit.id);
            if (damage > 0 || defeated) ticks.push({ unitId: unit.id, damage, defeated });
        }

        if (ticks.some(tick => tick.defeated)) {
            this.grid.refreshOccupancy(this.units.getAllUnits().value!);
        }

        return ticks;
    }
}
