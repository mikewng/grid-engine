import { describe, expect, it } from "vitest";
import { coordinateKey } from "../models/grid/coordinate";
import { UnitFaction } from "../models/units/iunit";
import { MovementType } from "../models/units/unitclass";
import { costAt } from "../utils/pathing/distancemap";
import { game, terrain, unit } from "./helpers";

const { P1, ENEMY } = UnitFaction;
const keysOf = (tiles: { x: number; y: number }[]) => tiles.map(coordinateKey).sort();

describe("movement range", () => {
    it("settles each tile at its cheapest cost, even when a cheap route takes more steps", () => {
        // Straight across the mountain is 1 step costing 4; going around is 3 steps costing 1 each
        const { movementManager } = game([".M..", "...."], [unit("a", P1, 0, 0, { stats: { movement: 5 } })]);
        const map = movementManager.getDistanceMap("a").value!;

        expect(costAt(map, { x: 2, y: 0 })).toBe(4); // around: down, right, right, up
        expect(costAt(map, { x: 3, y: 0 })).toBe(5);
        expect(keysOf(movementManager.getMovementRange("a").value!)).toContain("3,0");
    });

    it("includes the unit's own tile, so it can choose to stay", () => {
        const { movementManager } = game(["..."], [unit("a", P1, 1, 0)]);

        expect(keysOf(movementManager.getMovementRange("a").value!)).toContain("1,0");
    });

    it("passes through allies without stopping on them, and is blocked by enemies", () => {
        const { movementManager } = game(["......"], [
            unit("a", P1, 0, 0, { stats: { movement: 5 } }),
            unit("ally", P1, 1, 0),
            unit("enemy", ENEMY, 3, 0),
        ]);

        expect(keysOf(movementManager.getMovementRange("a").value!)).toEqual(["0,0", "2,0"]);
    });

    it("uses each movement type's terrain costs", () => {
        const map = ["WWW", "M.."];
        const units = [
            unit("flier", P1, 1, 1, { movementType: MovementType.FLYING, stats: { movement: 2 } }),
            unit("armor", P1, 2, 1, { movementType: MovementType.ARMORED, stats: { movement: 2 } }),
        ];
        const { movementManager } = game(map, units);

        expect(keysOf(movementManager.getMovementRange("flier").value!)).toEqual(["0,0", "0,1", "1,0", "1,1", "2,0"]);
        expect(keysOf(movementManager.getMovementRange("armor").value!)).toEqual(["2,1"]);
    });
});

describe("paths", () => {
    it("returns a path of adjacent steps whose costs add up to the map's cost", () => {
        const { movementManager, gridManager } = game(["..F.", ".FF.", "...."], [unit("a", P1, 0, 0, { stats: { movement: 8 } })]);
        const destination = { x: 3, y: 2 };
        const path = movementManager.findPath("a", destination).value!;

        let from = { x: 0, y: 0 };
        let total = 0;

        for (const step of path) {
            expect(Math.abs(step.x - from.x) + Math.abs(step.y - from.y)).toBe(1);
            total += terrain[gridManager.getTileAtPosition(step.x, step.y).value!.type].moveCost[MovementType.INFANTRY]!;
            from = step;
        }

        expect(from).toEqual(destination);
        expect(total).toBe(costAt(movementManager.getDistanceMap("a").value!, destination));
    });

    it("rejects paths that teleport, cost too much, or end on another unit", () => {
        const units = [unit("a", P1, 0, 0, { stats: { movement: 3 } }), unit("b", P1, 2, 0)];
        const { movementManager } = game(["......"], units);

        expect(movementManager.moveUnit("a", [{ x: 2, y: 2 }]).success).toBe(false);
        expect(movementManager.moveUnit("a", [{ x: 0, y: 1 }]).err).toMatch(/off the map|can't be entered|not adjacent/);
        expect(movementManager.moveUnitTo("a", { x: 4, y: 0 }).success).toBe(false); // 4 steps, 3 movement
        expect(movementManager.moveUnitTo("a", { x: 2, y: 0 }).success).toBe(false); // occupied
        expect(movementManager.moveUnitTo("a", { x: 3, y: 0 }).success).toBe(true);  // through the ally
    });

    it("only lets a unit move once per turn", () => {
        const { movementManager } = game(["....."], [unit("a", P1, 0, 0)]);

        expect(movementManager.moveUnitTo("a", { x: 1, y: 0 }).success).toBe(true);
        expect(movementManager.moveUnitTo("a", { x: 2, y: 0 }).err).toMatch(/already moved/);
    });
});
