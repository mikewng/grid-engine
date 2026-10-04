import { IUnit, UnitStatusType } from "./iunit";

/** Movement after Haste and Slow, never below 1. */
export function currentMovement(unit: IUnit): number {
    const hasteBonus = unit.statusEffects.find(e => e.type === UnitStatusType.HASTE)?.intensity ?? 0;
    const slowPenalty = unit.statusEffects.find(e => e.type === UnitStatusType.SLOW)?.intensity ?? 0;

    return Math.max(1, unit.stats.movement + hasteBonus - slowPenalty);
}

/**
 * One turn of status effects: poison deals damage, stun ends the unit's turn,
 * and every duration counts down. Returns the poison damage dealt; whoever
 * calls this handles a unit dropping to 0 HP.
 */
export function tickStatusEffects(unit: IUnit): { damage: number } {
    let damage = 0;

    for (const effect of unit.statusEffects) {
        switch (effect.type) {
            case UnitStatusType.POISON: {
                const dealt = Math.min(unit.stats.currentHealth, effect.intensity);
                unit.stats.currentHealth -= dealt;
                damage += dealt;
                break;
            }
            case UnitStatusType.STUN:
                unit.hasActed = true;
                break;
            case UnitStatusType.SLOW:
            case UnitStatusType.HASTE:
                // Applied through currentMovement
                break;
        }

        effect.duration--;
    }

    unit.statusEffects = unit.statusEffects.filter(effect => effect.duration > 0);
    return { damage };
}
