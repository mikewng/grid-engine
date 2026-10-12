import { describe, expect, it } from "vitest";
import { WeaponType } from "@/engine/models/items/weaponitem";
import { UnitFaction } from "@/engine/models/units/iunit";
import { MovementType } from "@/engine/models/units/unitclass";
import { paths } from "./pixelart";
import { bodyOf, spriteFrames, spritePalette } from "./unitsprites";

const movements = Object.values(MovementType);
const weapons = [undefined, ...Object.values(WeaponType).filter((value): value is WeaponType => typeof value === "number")];

describe("unit sprites", () => {
    it("draws every body with every weapon, 18 by 18, in colours its palette has", () => {
        for (const movement of movements) {
            for (const weapon of weapons) {
                const palette = spritePalette(movement, weapon, UnitFaction.P1, "unit");
                for (const frame of spriteFrames(movement, weapon)) {
                    expect(frame).toHaveLength(18);
                    for (const row of frame) expect(row).toHaveLength(18);
                    expect(() => paths(frame, palette)).not.toThrow();
                }
            }
        }
    });

    it("keeps an empty border, so outlines aren't cut off", () => {
        for (const movement of movements) {
            for (const weapon of weapons) {
                for (const frame of spriteFrames(movement, weapon)) {
                    const edges = [frame[0], frame[17], frame.map(row => row[0]).join(""), frame.map(row => row[17]).join("")];
                    for (const edge of edges) expect(edge).toMatch(/^[.k]+$/);
                }
            }
        }
    });

    it("dresses casters in robes", () => {
        expect(bodyOf(MovementType.INFANTRY, WeaponType.BMAGIC)).toBe("robe");
        expect(bodyOf(MovementType.INFANTRY, WeaponType.SWORD)).toBe("foot");
        expect(bodyOf(MovementType.MOUNTED, WeaponType.BMAGIC)).toBe("horse");
    });
});
