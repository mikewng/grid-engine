import { GridManager } from "./gridmanager";
import { UnitManager } from "./unitmanager";

export class CombatManager {
    constructor(
        private units: UnitManager,
        private grid: GridManager
    ) { }

    initiateAttack(atk_id: string, def_id: string) {

        // Get each units' stats
        const atk_unit = this.units.getUnitById(atk_id);
        const def_unit = this.units.getUnitById(def_id);
        if (!atk_unit || !def_unit) return false;

        // Calculate hit rate for each unit
        const atk_hitrate = this.calculateHitRate(atk_unit);
        const def_hitrate = this.calculateHitRate(def_unit);

        // Calculate thresholds for double hit
        const atk_has_dh = this.calculateDoubleHit(atk_unit);
        const def_has_dh = this.calculateDoubleHit(def_unit);

        // Calculate if attack(s) hit for attacker
        // Check if defender is dead (hp <= 0)
        //      -> If dead, return out of method
        // Calculate if attack(s) hit for defender
        // End method
    }

    calculateHitRate(unit: Unit) {
        // Calculate hit rate for unit
    }

    calculateDoubleHit(unit: Unit) {
        // Calculate thresholds for double hit
    }

    calculateCritHit(critrate: number) {
        // Roll RNG based off of critrate (%)
    }

    calculateHasHit(hitrate: number) {
        // Roll RNG based off of hitrate (%)
    }

    damageUnit(id: string, dmg: number) {
        const unit = this.units.getUnitById(id);
        if (!unit) return false;

        const currentHp = unit.stats.health;
        const newHp = currentHp - dmg;
        if (newHp <= 0) {
            this.units.patchUnit(id, { stats: { ...unit.stats, health: 0 } })
        } else {
            this.units.patchUnit(id, { stats: { ...unit.stats, health: newHp } })
        }
    }

}