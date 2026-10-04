import { describe, expect, it } from "vitest";
import { TileType } from "../models/grid/itile";
import { WeaponType } from "../models/items/weaponitem";
import { UnitFaction } from "../models/units/iunit";
import { MovementType } from "../models/units/unitclass";
import { createUnit } from "../models/units/unit";
import { resolveCombat, rngRoller } from "../rules/combatresolver";
import { createDefaultCombatRules } from "../rules/defaultruleset";
import { SeededRng } from "../utils/rng";
import { axe, bow, game, sword, terrain, tome, unit } from "./helpers";

const { P1, ENEMY } = UnitFaction;
const sturdy = { maxHealth: 99, currentHealth: 99 };

// Default helper stats: Str 8, Mag 8, Skl 5, Spd 5, Lck 0, Def 4, Res 3, Con 10
describe("damage", () => {
    it("adds weapon might to strength and subtracts defense", () => {
        const { combatManager } = game(["..."], [unit("a", P1, 0, 0), unit("b", ENEMY, 1, 0)]);
        const outcome = combatManager.forecast("a", "b").value!;

        expect(outcome.attacker.damage).toBe(5 + 8 - 4);
    });

    it("uses magic against resistance for tomes, and terrain cover only helps against physical hits", () => {
        const units = [
            unit("mage", P1, 0, 0, { weapons: [tome], stats: { strength: 0 } }),
            unit("fighter", P1, 2, 0),
            unit("b", ENEMY, 1, 0),
        ];
        const { combatManager } = game([".F."], units);

        expect(combatManager.forecast("mage", "b").value!.attacker.damage).toBe(5 + 8 - 3);
        expect(combatManager.forecast("fighter", "b").value!.attacker.damage).toBe(5 + 8 - (4 + 1));
    });

    it("applies the weapon triangle to damage and hit", () => {
        const { combatManager } = game(["..."], [unit("a", P1, 0, 0), unit("b", ENEMY, 1, 0, { weapons: [axe] })]);
        const { attacker, defender } = combatManager.forecast("a", "b").value!;

        expect([attacker.triangle, defender.triangle]).toEqual([1, -1]);
        expect(attacker.damage).toBe(5 + 1 + 8 - 4);
        expect(defender.damage).toBe(5 - 1 + 8 - 4);
        expect(defender.hitRate).toBe(100 + 10 - 15 - 10);
    });

    it("triples might for effective weapons", () => {
        const units = [
            unit("archer", P1, 0, 0, { weapons: [bow] }),
            unit("flier", ENEMY, 2, 0, { movementType: MovementType.FLYING }),
            unit("walker", ENEMY, 0, 2),
        ];
        const { combatManager } = game(["...", "...", "..."], units);

        expect(combatManager.forecast("archer", "flier").value!.attacker.damage).toBe(6 * 3 + 8 - 4);
        expect(combatManager.forecast("archer", "walker").value!.attacker.damage).toBe(6 + 8 - 4);
    });

    it("multiplies damage on a crit", () => {
        const a = createUnit(unit("a", P1, 0, 0));
        const b = createUnit(unit("b", ENEMY, 1, 0, { stats: sturdy }));
        const grass = terrain[TileType.Grass];
        const setup = { attacker: { unit: a, weapon: a.equippedWeapon, terrain: grass }, defender: { unit: b, weapon: b.equippedWeapon, terrain: grass }, distance: 1 };

        const outcome = resolveCombat(setup, createDefaultCombatRules(), { hits: () => true, crits: () => true });

        expect(outcome.strikes[0]).toMatchObject({ crit: true, damage: 9 * 3 });
    });
});

describe("hit and crit", () => {
    it("are whole numbers between 0 and 100", () => {
        const units = [
            unit("sharp", P1, 0, 0, { stats: { skill: 40 } }),
            unit("lucky", P1, 2, 0, { stats: { skill: 0, luck: 5 }, weapons: [{ ...sword, baseHitRate: 70 }] }),
            unit("target", ENEMY, 1, 0),
            unit("blur", ENEMY, 2, 1, { stats: { speed: 60 } }),
        ];
        const { combatManager } = game(["...", "..."], units);

        expect(combatManager.forecast("sharp", "target").value!.attacker.hitRate).toBe(100);
        expect(combatManager.forecast("lucky", "target").value!.attacker.hitRate).toBe(70 + 2 - 10);
        expect(combatManager.forecast("lucky", "blur").value!.attacker.hitRate).toBe(0);
        expect(combatManager.forecast("sharp", "target").value!.attacker.critRate).toBe(20);
    });

    it("rolls true hit (average of two rolls), which favours rates above 50", () => {
        const rate = (style: "single" | "average-of-two") => {
            const roller = rngRoller(new SeededRng(42), style);
            let hits = 0;
            for (let i = 0; i < 20000; i++) if (roller.hits(60)) hits++;
            return hits / 20000;
        };

        expect(rate("single")).toBeCloseTo(0.6, 1);
        expect(rate("average-of-two")).toBeCloseTo(0.684, 1);
        expect(rate("average-of-two")).toBeGreaterThan(0.66);
    });
});

describe("strike order", () => {
    it("strikes twice when 4 or more attack speed faster, with weapon weight slowing the wielder", () => {
        const heavy = { ...sword, weight: 15 };
        const units = [
            unit("fast", P1, 0, 0, { stats: { ...sturdy, speed: 9 } }),
            unit("slow", P1, 2, 0, { stats: sturdy, weapons: [heavy] }),
            unit("b", ENEMY, 1, 0, { stats: sturdy }),
        ];
        const { combatManager } = game(["..."], units);

        expect(combatManager.forecast("fast", "b").value!.strikes.map(s => s.by)).toEqual(["attacker", "defender", "attacker"]);

        const slow = combatManager.forecast("slow", "b").value!;
        expect(slow.attacker.attackSpeed).toBe(0);
        expect(slow.strikes.map(s => s.by)).toEqual(["attacker", "defender", "defender"]);
    });

    it("stops as soon as someone dies", () => {
        const { combatManager } = game(["..."], [unit("a", P1, 0, 0), unit("b", ENEMY, 1, 0, { stats: { currentHealth: 1 } })]);
        const outcome = combatManager.initiateAttack("a", "b").value!;

        expect(outcome.strikes).toHaveLength(1);
        expect(outcome.defenderKilled).toBe(true);
    });
});

describe("range", () => {
    it("lets a bow hit at 2 but not 1, and it can't counter up close", () => {
        const { combatManager } = game([".....", ".....", ".....", ".....", "....."], [
            unit("archer", ENEMY, 2, 2, { weapons: [bow] }),
            unit("a", P1, 2, 1),
        ]);

        const range = combatManager.getAttackRange("archer").value!;
        expect(range).toHaveLength(8);
        expect(range.every(tile => Math.abs(tile.x - 2) + Math.abs(tile.y - 2) === 2)).toBe(true);

        const outcome = combatManager.forecast("a", "archer").value!;
        expect(outcome.defender.canAttack).toBe(false);
        expect(outcome.strikes.map(s => s.by)).toEqual(["attacker"]);

        expect(combatManager.initiateAttack("archer", "a").err).toMatch(/out of range/);
    });

    it("can forecast from a tile the unit could move to", () => {
        const { combatManager } = game(["....."], [unit("archer", P1, 0, 0, { weapons: [bow] }), unit("b", ENEMY, 4, 0)]);

        expect(combatManager.forecast("archer", "b").success).toBe(false);
        expect(combatManager.forecast("archer", "b", { x: 2, y: 0 }).value!.distance).toBe(2);
        expect(combatManager.getAttackableTargets("archer", { x: 2, y: 0 }).value!.map(u => u.id)).toEqual(["b"]);
    });

    it("never lets staves attack", () => {
        const staff = { ...sword, name: "Heal", itemTypeId: "heal", weaponType: WeaponType.STAFF };
        const { combatManager } = game(["..."], [unit("cleric", P1, 0, 0, { weapons: [staff] }), unit("b", ENEMY, 1, 0)]);

        expect(combatManager.getAttackRange("cleric").value).toEqual([]);
        expect(combatManager.initiateAttack("cleric", "b").err).toMatch(/no weapon/);
        expect(combatManager.forecast("b", "cleric").value!.defender.canAttack).toBe(false);
    });
});

describe("attacking", () => {
    it("refuses targets out of range, allies, and a second attack in one turn", () => {
        const { combatManager } = game(["......"], [
            unit("a", P1, 0, 0),
            unit("ally", P1, 1, 0),
            unit("near", ENEMY, 2, 0, { stats: sturdy }),
            unit("far", ENEMY, 5, 0),
        ]);

        expect(combatManager.initiateAttack("a", "far").err).toMatch(/out of range/);
        expect(combatManager.initiateAttack("a", "ally").err).toMatch(/not enemies/);
        expect(combatManager.initiateAttack("ally", "near").success).toBe(true);
        expect(combatManager.initiateAttack("ally", "near").err).toMatch(/already acted/);
    });

    it("removes the dead from the map", () => {
        const { combatManager, movementManager, unitManager, gridManager } = game(["..."], [
            unit("a", P1, 0, 0),
            unit("b", ENEMY, 1, 0, { stats: { currentHealth: 1 } }),
            unit("c", P1, 2, 0),
        ]);

        combatManager.initiateAttack("a", "b");

        const b = unitManager.getUnitById("b").value!;
        expect(b.isAlive).toBe(false);
        expect(gridManager.getTileAtPosition(1, 0).value!.occupiedByUnitId).toBeUndefined();
        expect(unitManager.getUnitAtPosition(1, 0).success).toBe(false);
        expect(movementManager.moveUnitTo("b", { x: 1, y: 0 }).err).toMatch(/defeated/);
        expect(combatManager.forecast("c", "b").success).toBe(false);
        expect(movementManager.moveUnitTo("c", { x: 1, y: 0 }).success).toBe(true);
    });

    it("plays out the same way for the same seed", () => {
        const fight = (seed: number) => {
            const { combatManager } = game(["..."], [
                unit("a", P1, 0, 0, { stats: { ...sturdy, skill: 0 } }),
                unit("b", ENEMY, 1, 0, { stats: { ...sturdy, speed: 25 } }),
            ], { seed });

            return combatManager.initiateAttack("a", "b").value!;
        };

        expect(fight(7)).toEqual(fight(7));

        const firstStrikes = Array.from({ length: 30 }, (_, i) => fight(i + 1).strikes[0].hit);
        expect(firstStrikes).toContain(true);
        expect(firstStrikes).toContain(false);
    });
});

describe("forecast", () => {
    it("assumes every strike lands without crits, and changes nothing", () => {
        const { combatManager, unitManager } = game(["..."], [unit("a", P1, 0, 0), unit("b", ENEMY, 1, 0)]);
        const outcome = combatManager.forecast("a", "b").value!;

        expect(outcome.strikes.every(s => s.hit && !s.crit)).toBe(true);
        expect([outcome.attackerHp, outcome.defenderHp]).toEqual([20 - 9, 20 - 9]);

        const a = unitManager.getUnitById("a").value!;
        expect(a.stats.currentHealth).toBe(20);
        expect(a.equippedWeapon!.durability).toBe(40);
        expect(a.hasActed).toBe(false);
    });
});

describe("weapon uses", () => {
    it("wears weapons down and throws them away when they break", () => {
        const fragile = { ...sword, maxDurability: 1 };
        const { combatManager, unitManager } = game(["..."], [
            unit("a", P1, 0, 0, { weapons: [fragile], stats: { ...sturdy, speed: 9 } }),
            unit("b", ENEMY, 1, 0, { stats: { ...sturdy, skill: 10 } }),
        ]);

        const outcome = combatManager.initiateAttack("a", "b").value!;
        const a = unitManager.getUnitById("a").value!;

        expect(outcome.strikes[0].weaponBroke).toBe(true);
        expect(outcome.strikes.map(s => s.by)).toEqual(["attacker", "defender"]); // no follow-up with a broken weapon
        expect(a.equippedWeapon).toBeUndefined();
        expect(a.items).toHaveLength(0);
        expect(unitManager.getUnitById("b").value!.equippedWeapon!.durability).toBe(39);
    });

    it("uses up magic even on a miss, but not physical weapons", () => {
        const blunt = { baseHitRate: 0 };
        const { combatManager, unitManager } = game(["....."], [
            unit("mage", P1, 0, 0, { weapons: [{ ...tome, ...blunt }], stats: { skill: 0 } }),
            unit("fighter", P1, 3, 0, { weapons: [{ ...sword, ...blunt }], stats: { ...sturdy, skill: 0 } }),
            unit("b", ENEMY, 2, 0, { stats: sturdy }),
        ]);

        expect(combatManager.initiateAttack("mage", "b").value!.strikes[0].hit).toBe(false);
        expect(combatManager.initiateAttack("fighter", "b").value!.strikes.find(s => s.by === "attacker")!.hit).toBe(false);

        expect(unitManager.getUnitById("mage").value!.equippedWeapon!.durability).toBe(39);
        expect(unitManager.getUnitById("fighter").value!.equippedWeapon!.durability).toBe(40);
    });
});
