import { UnitManager } from "./unitmanager";
import { Result } from "../utils/resultclass";
import { Unit } from "../models/units/unit";

interface CombatResult {
    attackerDamageDealt: number;
    defenderDamageDealt: number;
    attackerHits: number;
    defenderHits: number;
    defenderKilled: boolean;
    attackerKilled: boolean;
}

export class CombatManager {
    constructor(
        private units: UnitManager,
    ) { }

    initiateAttack(atk_id: string, def_id: string): Result<CombatResult> {
        // Get units
        const attackerResult = this.units.getUnitById(atk_id);
        const defenderResult = this.units.getUnitById(def_id);

        if (!attackerResult.success || !defenderResult.success) {
            return Result.Fail("Could not find one or both units for combat");
        }

        const attacker = attackerResult.value!;
        const defender = defenderResult.value!;

        // Initialize combat result
        const combatResult: CombatResult = {
            attackerDamageDealt: 0,
            defenderDamageDealt: 0,
            attackerHits: 0,
            defenderHits: 0,
            defenderKilled: false,
            attackerKilled: false
        };

        // Calculate combat stats
        const attackerHitRate = this.calculateHitRate(attacker, defender);
        const defenderHitRate = this.calculateHitRate(defender, attacker);
        const attackerDoubleHit = this.calculateDoubleHit(attacker, defender);
        const defenderDoubleHit = this.calculateDoubleHit(defender, attacker);

        // Phase 1: Attacker's first attack
        if (this.calculateHasHit(attackerHitRate)) {
            const damage = this.calculateDamage(attacker, defender);
            this.damageUnit(def_id, damage);
            combatResult.attackerDamageDealt += damage;
            combatResult.attackerHits++;

            // Check if defender died
            const updatedDefender = this.units.getUnitById(def_id);
            if (updatedDefender.success && updatedDefender.value!.stats.currentHealth <= 0) {
                combatResult.defenderKilled = true;
                return Result.Success(combatResult);
            }
        }

        // Phase 2: Defender counterattack (if alive and can counter)
        if (this.canCounterAttack(defender, attacker)) {
            if (this.calculateHasHit(defenderHitRate)) {
                const damage = this.calculateDamage(defender, attacker);
                this.damageUnit(atk_id, damage);
                combatResult.defenderDamageDealt += damage;
                combatResult.defenderHits++;

                // Check if attacker died
                const updatedAttacker = this.units.getUnitById(atk_id);
                if (updatedAttacker.success && updatedAttacker.value!.stats.currentHealth <= 0) {
                    combatResult.attackerKilled = true;
                    return Result.Success(combatResult);
                }
            }
        }

        // Phase 3: Follow-up attacks
        // Attacker's second attack if they have double hit advantage
        if (attackerDoubleHit && !combatResult.defenderKilled) {
            if (this.calculateHasHit(attackerHitRate)) {
                const damage = this.calculateDamage(attacker, defender);
                this.damageUnit(def_id, damage);
                combatResult.attackerDamageDealt += damage;
                combatResult.attackerHits++;

                // Check if defender died from second attack
                const updatedDefender = this.units.getUnitById(def_id);
                if (updatedDefender.success && updatedDefender.value!.stats.currentHealth <= 0) {
                    combatResult.defenderKilled = true;
                    return Result.Success(combatResult);
                }
            }
        }

        // Defender's second attack if they have double hit advantage
        if (defenderDoubleHit && !combatResult.attackerKilled && this.canCounterAttack(defender, attacker)) {
            if (this.calculateHasHit(defenderHitRate)) {
                const damage = this.calculateDamage(defender, attacker);
                this.damageUnit(atk_id, damage);
                combatResult.defenderDamageDealt += damage;
                combatResult.defenderHits++;

                // Check if attacker died from defender's second attack
                const updatedAttacker = this.units.getUnitById(atk_id);
                if (updatedAttacker.success && updatedAttacker.value!.stats.currentHealth <= 0) {
                    combatResult.attackerKilled = true;
                }
            }
        }

        return Result.Success(combatResult);
    }

    calculateHitRate(attacker: Unit, defender: Unit): number {
        // Calculate hit rate for unit
        // Formula: (base hit rate + skill stat*2 and luck/2) - (speed + luck)
        if (attacker.equippedWeapon?.baseHitRate) {
            return ((attacker.equippedWeapon.baseHitRate) + (attacker.stats.skill * 2) + (attacker.stats.luck / 2)) -
                ((defender.stats.speed * 2) + defender.stats.luck);
        } else {
            return ((attacker.stats.skill * 2) + (attacker.stats.luck / 2)) -
                ((defender.stats.speed * 2) + defender.stats.luck);
        }

    }

    calculateDoubleHit(attacker: Unit, defender: Unit): boolean {
        // Calculate if unit gets double hit based on speed difference
        // Formula: attacker speed - defender speed >= threshold (usually 4)
        const speedDifference = attacker.stats.speed - defender.stats.speed;
        return speedDifference >= 4;
    }

    calculateCritRate(unit: Unit): number {
        // Calculate critical hit rate based on skill stat
        // Formula: skill / 2 + weapon crit 
        if (unit.equippedWeapon?.baseCritRate) {
            return (unit.stats.skill / 2) + unit.equippedWeapon.baseCritRate;
        } else {
            return (unit.stats.skill / 2);
        }
    }

    calculateHasHit(hitrate: number): boolean {
        // Roll RNG based off of hitrate (%)
        return Math.random() * 100 < hitrate;
    }

    calculateHasCritHit(critrate: number): boolean {
        // Roll RNG based off of critrate (%)
        return Math.random() * 100 < critrate;
    }

    canCounterAttack(defender: Unit, attacker: Unit): boolean {
        // Check if defender can counter attack based on range, weapon type, etc.
        // For now, simple implementation - defender can counter if they have a weapon
        if (defender.equippedWeapon && attacker.equippedWeapon) {
            return defender.equippedWeapon.range >= attacker.equippedWeapon?.range
        } else {
            return false;
        }
    }

    calculateDamage(attacker: Unit, defender: Unit): number {
        // Calculate damage: attack stat - defense stat
        const attackStat = attacker.stats.strength; // Could be magic for magic units
        const defenseStat = defender.stats.defense; // Could be resistance for magic damage
        const baseDamage = Math.max(0, attackStat - defenseStat);

        // Check for critical hit
        const critRate = this.calculateCritRate(attacker);
        const isCritical = this.calculateHasCritHit(critRate);

        return isCritical ? baseDamage * 2 : baseDamage;
    }

    damageUnit(id: string, dmg: number) {
        const unit = this.units.getUnitById(id);
        if (!unit.success || !unit.value) return false;

        const currentHp = unit.value.stats.currentHealth;
        const newHp = currentHp - dmg;
        if (newHp <= 0) {
            this.units.patchUnit(id, { stats: { ...unit.value.stats, currentHealth: 0 } })
        } else {
            this.units.patchUnit(id, { stats: { ...unit.value.stats, currentHealth: newHp } })
        }
    }

}