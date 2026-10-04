import { describe, expect, it } from "vitest";
import { UnitFaction, UnitStatusType } from "../models/units/iunit";
import { currentMovement, tickStatusEffects } from "../models/units/statuseffects";
import { createUnit, Unit } from "../models/units/unit";
import { bow, game, sword, unit } from "./helpers";

const { P1 } = UnitFaction;

describe("unit manager", () => {
    it("updates units in place, so they stay Units", () => {
        const { unitManager } = game(["..."], [unit("a", P1, 0, 0)]);
        const a = unitManager.getUnitById("a").value!;

        expect(unitManager.patchUnit("a", { name: "Renamed" }).value).toBe(a);
        unitManager.markUnitActed("a");

        expect(a).toBeInstanceOf(Unit);
        expect(a).toMatchObject({ name: "Renamed", hasActed: true, hasMoved: true });
        expect(unitManager.getUnitById("a").value).toBe(a);
    });
});

describe("creating units", () => {
    it("gives every game its own copies of units and weapons", () => {
        const templates = [unit("a", P1, 0, 0), unit("b", P1, 1, 0)];
        const first = game(["..."], templates).unitManager;
        const second = game(["..."], templates).unitManager;

        const a1 = first.getUnitById("a").value!;
        a1.stats.currentHealth = 1;
        a1.equippedWeapon!.durability = 1;
        a1.position.x = 2;

        const a2 = second.getUnitById("a").value!;
        expect(a2.stats.currentHealth).toBe(20);
        expect(a2.equippedWeapon!.durability).toBe(40);
        expect(a2.position.x).toBe(0);
        expect(templates[0].stats.currentHealth).toBe(20);
        expect(templates[0].position.x).toBe(0);
        expect(first.getUnitById("b").value!.equippedWeapon).not.toBe(a1.equippedWeapon);
    });

    it("equips the first weapon and carries the rest", () => {
        const a = createUnit(unit("a", P1, 0, 0, { weapons: [sword, bow] }));

        expect(a.equippedWeapon!.name).toBe("Sword");
        expect(a.items.map(item => item.name)).toEqual(["Sword", "Bow"]);
        expect(new Set(a.items.map(item => item.id)).size).toBe(2);
    });
});

describe("Unit", () => {
    it("keeps the equipped weapon in its inventory", () => {
        const a = createUnit(unit("a", P1, 0, 0, { weapons: [] }));
        const weapon = createUnit(unit("b", P1, 0, 0)).equippedWeapon!;

        a.equipWeapon(weapon);
        expect(a.items).toContain(weapon);

        a.removeItem(weapon.id);
        expect(a.equippedWeapon).toBeUndefined();
        expect(a.items).toHaveLength(0);
    });

    it("clones without sharing anything mutable", () => {
        const a = createUnit(unit("a", P1, 0, 0));
        a.addStatusEffect({ type: UnitStatusType.POISON, duration: 2, intensity: 3 });

        const copy = a.clone();
        copy.stats.currentHealth = 1;
        copy.position.x = 5;
        copy.equippedWeapon!.durability = 1;
        copy.statusEffects[0].duration = 9;

        expect(copy).toBeInstanceOf(Unit);
        expect(copy.items).toContain(copy.equippedWeapon);
        expect(a.stats.currentHealth).toBe(20);
        expect(a.position.x).toBe(0);
        expect(a.equippedWeapon!.durability).toBe(40);
        expect(a.statusEffects[0].duration).toBe(2);
    });
});

describe("status effects", () => {
    it("change movement, but never below 1", () => {
        const a = createUnit(unit("a", P1, 0, 0, { stats: { movement: 5 } }));

        a.addStatusEffect({ type: UnitStatusType.HASTE, duration: 1, intensity: 2 });
        expect(currentMovement(a)).toBe(7);

        a.addStatusEffect({ type: UnitStatusType.SLOW, duration: 1, intensity: 10 });
        expect(currentMovement(a)).toBe(1);
    });

    it("poison can't take HP below 0, and effects wear off", () => {
        const a = createUnit(unit("a", P1, 0, 0, { stats: { currentHealth: 2 } }));
        a.addStatusEffect({ type: UnitStatusType.POISON, duration: 1, intensity: 5 });

        expect(tickStatusEffects(a).damage).toBe(2);
        expect(a.stats.currentHealth).toBe(0);
        expect(a.statusEffects).toHaveLength(0);
    });
});
