import { UnitFaction } from "../models/units/iunit";
import { tickStatusEffects } from "../models/units/statuseffects";
import { IGridManager, IUnitManager } from "./interfaces/manager-interfaces";

export interface StatusTick {
    unitId: string;
    damage: number;
    defeated: boolean;
}

export interface TerrainHeal {
    unitId: string;
    amount: number;
}

export class StatusManager {
    constructor(
        private units: IUnitManager,
        private grid: IGridManager,
    ) { }

    /** Heal a faction's living units that start their turn on terrain that heals, up to their max HP. */
    healOnTerrain(faction: UnitFaction): TerrainHeal[] {
        const heals: TerrainHeal[] = [];

        for (const unit of this.units.getUnitsByFaction(faction).value!) {
            const { stats } = unit;
            if (!unit.isAlive || stats.currentHealth >= stats.maxHealth) continue;

            const share = this.grid.getTerrainAt(unit.position.x, unit.position.y).value?.heal ?? 0;
            if (share <= 0) continue;

            const amount = Math.min(stats.maxHealth - stats.currentHealth, Math.ceil(stats.maxHealth * share));
            stats.currentHealth += amount;
            heals.push({ unitId: unit.id, amount });
        }

        return heals;
    }

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
