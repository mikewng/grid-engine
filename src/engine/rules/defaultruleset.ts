import { isMagicWeapon, WeaponType } from "../models/items/weaponitem";
import { UnitFaction } from "../models/units/iunit";
import { allianceRules, Combatant, CombatRules, MovementRules, Ruleset } from "./ruleset";

// Each weapon type beats the next: sword > axe > spear > sword
const TRIANGLE_BEATS: Partial<Record<WeaponType, WeaponType>> = {
    [WeaponType.SWORD]: WeaponType.AXE,
    [WeaponType.AXE]: WeaponType.SPEAR,
    [WeaponType.SPEAR]: WeaponType.SWORD,
};

const TRIANGLE_HIT = 15;
const TRIANGLE_DAMAGE = 1;
const EFFECTIVE_MULTIPLIER = 3;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Formulas modelled on Fire Emblem: The Sacred Stones (src/bmbattle.c in the
 * decompilation), with this engine's stat names.
 */
export function createDefaultCombatRules(): CombatRules {
    const triangle = (attacker: Combatant, defender: Combatant): -1 | 0 | 1 => {
        const mine = attacker.weapon?.weaponType;
        const theirs = defender.weapon?.weaponType;

        if (mine === undefined || theirs === undefined) return 0;
        if (TRIANGLE_BEATS[mine] === theirs) return 1;
        if (TRIANGLE_BEATS[theirs] === mine) return -1;
        return 0;
    };

    const isEffective = (attacker: Combatant, defender: Combatant) =>
        !!attacker.weapon?.effectiveAgainst?.includes(defender.unit.unitClass.movementType);

    const attackSpeed = ({ unit, weapon }: Combatant) =>
        Math.max(0, unit.stats.speed - Math.max(0, (weapon?.weight ?? 0) - unit.stats.constitution));

    const rawHit = ({ unit, weapon }: Combatant) =>
        (weapon?.baseHitRate ?? 0) + unit.stats.skill * 2 + Math.floor(unit.stats.luck / 2);

    const rawCrit = ({ unit, weapon }: Combatant) => (weapon?.baseCritRate ?? 0) + Math.floor(unit.stats.skill / 2);

    const avoid = (combatant: Combatant) =>
        attackSpeed(combatant) * 2 + combatant.unit.stats.luck + combatant.terrain.avoid;

    const power = ({ unit, weapon }: Combatant) =>
        weapon && isMagicWeapon(weapon) ? unit.stats.magic : unit.stats.strength;

    return {
        canAttackWith: (weapon) => weapon.weaponType !== WeaponType.STAFF,

        attack(attacker, defender) {
            if (!attacker.weapon) return power(attacker);

            const might = attacker.weapon.attack + triangle(attacker, defender) * TRIANGLE_DAMAGE;
            const multiplier = isEffective(attacker, defender) ? EFFECTIVE_MULTIPLIER : 1;

            return might * multiplier + power(attacker);
        },

        defense(defender, attacker) {
            // Magic hits resistance; terrain cover only helps against physical attacks
            return attacker.weapon && isMagicWeapon(attacker.weapon)
                ? defender.unit.stats.resistance
                : defender.unit.stats.defense + defender.terrain.defense;
        },

        attackSpeed,

        hitRate(attacker, defender) {
            return clamp(rawHit(attacker) + triangle(attacker, defender) * TRIANGLE_HIT - avoid(defender), 0, 100);
        },

        critRate(attacker, defender) {
            return clamp(rawCrit(attacker) - defender.unit.stats.luck, 0, 100);
        },

        triangle,
        isEffective,
        followUpThreshold: 4,
        critMultiplier: 3,
        hitRoll: "average-of-two",
        usesWeaponOnMiss: (weapon) => isMagicWeapon(weapon),

        displayStats(combatant) {
            return {
                attack: (combatant.weapon?.attack ?? 0) + power(combatant),
                hit: rawHit(combatant),
                crit: rawCrit(combatant),
                avoid: avoid(combatant),
                attackSpeed: attackSpeed(combatant),
            };
        },
    };
}

/** Terrain costs come from each terrain's table, keyed by the unit class's movement type. */
export function createDefaultMovementRules(): MovementRules {
    return {
        terrainCost: (unit, terrain) => terrain.moveCost[unit.unitClass.movementType] ?? null,
    };
}

export interface DefaultRulesetOptions {
    /** Who is allied with whom. Defaults to P1 and P2 together against ENEMY. */
    alliances?: UnitFaction[][];
}

export function createDefaultRuleset(options: DefaultRulesetOptions = {}): Ruleset {
    return {
        movement: createDefaultMovementRules(),
        combat: createDefaultCombatRules(),
        factions: allianceRules(options.alliances ?? [[UnitFaction.P1, UnitFaction.P2], [UnitFaction.ENEMY]]),
    };
}
