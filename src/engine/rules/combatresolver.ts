import { weaponCoversDistance } from "../models/items/weaponitem";
import { roll100, Rng } from "../utils/rng";
import { Combatant, CombatRules, HitRollStyle } from "./ruleset";

/** Decides whether each strike hits and crits. */
export interface CombatRoller {
    hits(hitRate: number): boolean;
    crits(critRate: number): boolean;
}

/** Every strike lands and nothing crits: the numbers a forecast shows. */
export const forecastRoller: CombatRoller = {
    hits: () => true,
    crits: () => false,
};

export function rngRoller(rng: Rng, style: HitRollStyle): CombatRoller {
    return {
        hits(hitRate) {
            const roll = style === "average-of-two"
                ? Math.floor((roll100(rng) + roll100(rng)) / 2)
                : roll100(rng);

            return hitRate > roll;
        },
        crits: (critRate) => critRate > roll100(rng),
    };
}

/** What one side brings to a fight, before any dice are rolled. */
export interface CombatSideStats {
    unitId: string;
    weaponName: string | undefined;
    /** HP going in. */
    hp: number;
    /** Whether its weapon reaches the other side at this distance. */
    canAttack: boolean;
    /** Damage per hit, before crits. */
    damage: number;
    hitRate: number;
    critRate: number;
    attackSpeed: number;
    /** How many times it would strike if nobody dies first (0, 1 or 2). */
    strikes: number;
    effective: boolean;
    triangle: -1 | 0 | 1;
}

export interface Strike {
    by: "attacker" | "defender";
    hit: boolean;
    crit: boolean;
    damage: number;
    attackerHp: number;
    defenderHp: number;
    /** The striker's weapon ran out of uses on this strike. */
    weaponBroke: boolean;
}

/**
 * A whole fight, worked out before anything is applied: who strikes in what
 * order and what happens each time. The UI plays the strikes back; the
 * CombatManager applies the final numbers to the units.
 */
export interface CombatOutcome {
    distance: number;
    attacker: CombatSideStats;
    defender: CombatSideStats;
    strikes: Strike[];
    attackerHp: number;
    defenderHp: number;
    /** Uses left on each weapon afterwards (undefined for unbreakable or no weapon). */
    attackerWeaponUses: number | undefined;
    defenderWeaponUses: number | undefined;
    attackerKilled: boolean;
    defenderKilled: boolean;
}

export interface CombatSetup {
    attacker: Combatant;
    defender: Combatant;
    distance: number;
}

/**
 * Resolve a fight without touching either unit. Order of strikes: the attacker,
 * then the defender if its weapon reaches, then a follow-up from whichever
 * side is faster by the follow-up threshold. It stops as soon as someone dies.
 */
export function resolveCombat(setup: CombatSetup, rules: CombatRules, roller: CombatRoller): CombatOutcome {
    const { attacker, defender, distance } = setup;
    const sides = [attacker, defender] as const;

    const canAttack = (side: Combatant) =>
        !!side.weapon &&
        rules.canAttackWith(side.weapon) &&
        weaponCoversDistance(side.weapon, distance) &&
        (side.weapon.durability === undefined || side.weapon.durability > 0);

    const sideStats = (self: Combatant, other: Combatant): CombatSideStats => ({
        unitId: self.unit.id,
        weaponName: self.weapon?.name,
        hp: self.unit.stats.currentHealth,
        canAttack: canAttack(self),
        damage: Math.max(0, rules.attack(self, other) - rules.defense(other, self)),
        hitRate: rules.hitRate(self, other),
        critRate: rules.critRate(self, other),
        attackSpeed: rules.attackSpeed(self),
        strikes: 0,
        effective: rules.isEffective(self, other),
        triangle: rules.triangle(self, other),
    });

    const stats = [sideStats(attacker, defender), sideStats(defender, attacker)];

    const order: (0 | 1)[] = [0];
    if (stats[1].canAttack) order.push(1);

    const lead = stats[0].attackSpeed - stats[1].attackSpeed;
    if (lead >= rules.followUpThreshold && stats[0].canAttack) order.push(0);
    else if (-lead >= rules.followUpThreshold && stats[1].canAttack) order.push(1);

    stats[0].strikes = stats[0].canAttack ? order.filter(s => s === 0).length : 0;
    stats[1].strikes = order.filter(s => s === 1).length;

    const hp = [stats[0].hp, stats[1].hp];
    const uses = sides.map(side => side.weapon?.durability);
    const strikes: Strike[] = [];

    for (const s of order) {
        const o = 1 - s;

        if (hp[0] <= 0 || hp[1] <= 0) break;
        if (!stats[s].canAttack || uses[s] === 0) continue;

        const hit = roller.hits(stats[s].hitRate);
        const crit = hit && roller.crits(stats[s].critRate);
        const damage = hit ? Math.min(hp[o], stats[s].damage * (crit ? rules.critMultiplier : 1)) : 0;

        hp[o] -= damage;

        let weaponBroke = false;
        const weapon = sides[s].weapon!;

        if (uses[s] !== undefined && (hit || rules.usesWeaponOnMiss(weapon))) {
            uses[s]! -= 1;
            weaponBroke = uses[s] === 0;
        }

        strikes.push({
            by: s === 0 ? "attacker" : "defender",
            hit,
            crit,
            damage,
            attackerHp: hp[0],
            defenderHp: hp[1],
            weaponBroke,
        });
    }

    return {
        distance,
        attacker: stats[0],
        defender: stats[1],
        strikes,
        attackerHp: hp[0],
        defenderHp: hp[1],
        attackerWeaponUses: uses[0],
        defenderWeaponUses: uses[1],
        attackerKilled: hp[0] <= 0,
        defenderKilled: hp[1] <= 0,
    };
}
