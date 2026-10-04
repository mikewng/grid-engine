import { describe, expect, it } from "vitest";
import { TileType } from "../models/grid/itile";
import { UnitFaction } from "../models/units/iunit";
import { createDefaultRuleset } from "../rules/defaultruleset";
import { SeededRng } from "../utils/rng";
import { game, unit } from "./helpers";

const { P1, P2, ENEMY, NEUTRAL } = UnitFaction;

describe("grid", () => {
    it("picks up terrain changes straight away", () => {
        const { gridManager, movementManager } = game(["..."], [unit("a", P1, 0, 0)]);

        expect(movementManager.getMovementRange("a").value).toHaveLength(3);

        gridManager.setTileAtPosition(1, 0, TileType.Block);

        expect(gridManager.getTerrainAt(1, 0).value!.name).toBe("Wall");
        expect(movementManager.getMovementRange("a").value).toEqual([{ x: 0, y: 0 }]);
    });

    it("keeps tile occupancy in step with unit positions", () => {
        const { gridManager, movementManager } = game(["..."], [unit("a", P1, 0, 0)]);

        expect(gridManager.getTileAtPosition(0, 0).value!.occupiedByUnitId).toBe("a");

        movementManager.moveUnitTo("a", { x: 2, y: 0 });

        expect(gridManager.getTileAtPosition(0, 0).value!.occupiedByUnitId).toBeUndefined();
        expect(gridManager.getTileAtPosition(2, 0).value!.occupiedByUnitId).toBe("a");
        expect(gridManager.getOccupiedTiles().value).toHaveLength(1);
    });

    it("rejects bad scenarios", () => {
        expect(() => game(["..", "."], [])).toThrow(/same length/);
        expect(() => game([".?"], [])).toThrow(/Unknown tile/);
        expect(() => game([".."], [unit("a", P1, 2, 0)])).toThrow(/off the map/);
        expect(() => game([".."], [unit("a", P1, 0, 0), unit("b", P1, 0, 0)])).toThrow(/occupied/);
    });
});

describe("factions", () => {
    it("are hostile across alliances only, and neutrals fight no one", () => {
        const { factions } = createDefaultRuleset();

        expect(factions.areHostile(P1, P2)).toBe(false);
        expect(factions.areHostile(P1, ENEMY)).toBe(true);
        expect(factions.areHostile(P2, ENEMY)).toBe(true);
        expect(factions.areHostile(P1, P1)).toBe(false);
        expect(factions.areHostile(NEUTRAL, ENEMY)).toBe(false);
    });

    it("can be set up per game", () => {
        const { factions } = createDefaultRuleset({ alliances: [[P1], [P2], [ENEMY]] });

        expect(factions.areHostile(P1, P2)).toBe(true);
    });
});

describe("SeededRng", () => {
    it("repeats for the same seed and can be rewound", () => {
        const a = new SeededRng(123);
        const b = new SeededRng(123);
        const first = [a.next(), a.next(), a.next()];

        expect([b.next(), b.next(), b.next()]).toEqual(first);
        expect(first.every(n => n >= 0 && n < 1)).toBe(true);

        const state = a.getState();
        const next = a.next();
        a.setState(state);
        expect(a.next()).toBe(next);
    });
});
