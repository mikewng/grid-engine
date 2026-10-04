import { TerrainDefinition } from "../models/grid/terrain";
import { WeaponItem } from "../models/items/weaponitem";
import { IUnit, UnitFaction } from "../models/units/iunit";

/**
 * Everything that differs between games built on this engine. Swap any part
 * (a different damage formula, terrain costs per class, who's allied with
 * whom) without touching the managers that use it.
 */
export interface Ruleset {
    movement: MovementRules;
    combat: CombatRules;
    factions: FactionRules;
}

export interface MovementRules {
    /** Cost for this unit to enter terrain, or null if it can't. */
    terrainCost(unit: IUnit, terrain: TerrainDefinition): number | null;
}

export interface FactionRules {
    /** Whether units of these factions fight each other (and block each other's movement). */
    areHostile(a: UnitFaction, b: UnitFaction): boolean;
}

/** One side of a fight as the formulas see it. */
export interface Combatant {
    unit: IUnit;
    /** The weapon it fights with, if any. */
    weapon: WeaponItem | undefined;
    /** The terrain it's standing on. */
    terrain: TerrainDefinition;
}

/**
 * How a hit chance is rolled. "single" is one roll against the displayed rate.
 * "average-of-two" averages two rolls (Fire Emblem's "true hit"), which makes
 * high rates more reliable and low rates less likely than they read.
 */
export type HitRollStyle = "single" | "average-of-two";

/** Attack, hit, crit and avoid as a stat screen shows them, without an opponent. */
export interface DisplayStats {
    attack: number;
    hit: number;
    crit: number;
    avoid: number;
    attackSpeed: number;
}

export interface CombatRules {
    /** Whether a weapon can attack at all (staves can't). */
    canAttackWith(weapon: WeaponItem): boolean;
    /** Damage-dealing power: might after the weapon triangle and effectiveness, plus Str or Mag. */
    attack(attacker: Combatant, defender: Combatant): number;
    /** What the defender subtracts from that. */
    defense(defender: Combatant, attacker: Combatant): number;
    attackSpeed(combatant: Combatant): number;
    /** Final chance to hit, 0 to 100. */
    hitRate(attacker: Combatant, defender: Combatant): number;
    /** Final chance to crit, 0 to 100. */
    critRate(attacker: Combatant, defender: Combatant): number;
    /** Weapon triangle for the attacker: 1 advantage, -1 disadvantage, 0 neither. */
    triangle(attacker: Combatant, defender: Combatant): -1 | 0 | 1;
    isEffective(attacker: Combatant, defender: Combatant): boolean;
    /** Attack speed lead needed to strike twice. */
    followUpThreshold: number;
    critMultiplier: number;
    hitRoll: HitRollStyle;
    /** Whether a strike uses up the weapon even when it misses (magic, in Fire Emblem). */
    usesWeaponOnMiss(weapon: WeaponItem): boolean;
    displayStats(combatant: Combatant): DisplayStats;
}

/**
 * Factions listed in the same group are allies; every other pair of listed
 * factions is hostile. A faction in no group (by default, NEUTRAL) fights no one.
 */
export function allianceRules(alliances: UnitFaction[][]): FactionRules {
    const groupOf = new Map<UnitFaction, number>();

    alliances.forEach((group, i) => {
        for (const faction of group) groupOf.set(faction, i);
    });

    return {
        areHostile(a, b) {
            const groupA = groupOf.get(a);
            const groupB = groupOf.get(b);

            return groupA !== undefined && groupB !== undefined && groupA !== groupB;
        },
    };
}
