import { describe, expect, it } from "vitest";
import { GameEvent } from "../models/game/gamestate";
import { UnitFaction, UnitStatusType } from "../models/units/iunit";
import { game, unit } from "./helpers";

const { P1, ENEMY } = UnitFaction;
const sturdy = { maxHealth: 99, currentHealth: 99 };
const enemyAi = { controllers: { [ENEMY]: "ai" as const } };
const types = (events: readonly GameEvent[]) => events.map(event => event.type);

describe("commands", () => {
    it("only lets the active faction's units act", () => {
        const { gameManager } = game(["....."], [unit("a", P1, 0, 0), unit("e", ENEMY, 4, 0)]);

        expect(gameManager.getState()).toMatchObject({ turn: 1, activeFaction: P1, isOver: false });
        expect(gameManager.execute({ type: "moveTo", unitId: "e", destination: { x: 3, y: 0 } }).err).toMatch(/isn't e's turn/);
    });

    it("allows one move and then one action per unit", () => {
        const { gameManager } = game(["......"], [unit("a", P1, 0, 0), unit("e", ENEMY, 3, 0, { stats: sturdy })]);

        expect(gameManager.execute({ type: "moveTo", unitId: "a", destination: { x: 1, y: 0 } }).success).toBe(true);
        expect(gameManager.execute({ type: "moveTo", unitId: "a", destination: { x: 2, y: 0 } }).err).toMatch(/already moved/);
        expect(gameManager.execute({ type: "attack", unitId: "a", targetId: "e" }).err).toMatch(/out of range/);
        expect(gameManager.execute({ type: "wait", unitId: "a" }).success).toBe(true);
        expect(gameManager.execute({ type: "wait", unitId: "a" }).err).toMatch(/already acted/);
    });

    it("can attack after moving, or after staying put with an empty move", () => {
        const { gameManager, unitManager } = game(["......"], [
            unit("a", P1, 0, 0, { stats: sturdy }),
            unit("b", P1, 5, 0),
            unit("e", ENEMY, 3, 0, { stats: sturdy }),
        ]);

        expect(gameManager.execute({ type: "moveTo", unitId: "a", destination: { x: 2, y: 0 } }).success).toBe(true);
        expect(types(gameManager.execute({ type: "attack", unitId: "a", targetId: "e" }).value!)).toEqual(["combat"]);

        expect(gameManager.execute({ type: "move", unitId: "b", path: [] }).success).toBe(true);
        expect(unitManager.getUnitById("b").value!.position).toEqual({ x: 5, y: 0 });
        expect(gameManager.execute({ type: "moveTo", unitId: "b", destination: { x: 4, y: 0 } }).err).toMatch(/already moved/);
        expect(gameManager.execute({ type: "attack", unitId: "b", targetId: "e" }).err).toMatch(/out of range/);
    });

    it("can take back a move until the unit acts", () => {
        const { gameManager, unitManager, gridManager } = game(["....."], [unit("a", P1, 0, 0), unit("e", ENEMY, 4, 0)]);
        const a = unitManager.getUnitById("a").value!;

        expect(gameManager.execute({ type: "undoMove", unitId: "a" }).err).toMatch(/hasn't moved/);

        gameManager.execute({ type: "moveTo", unitId: "a", destination: { x: 2, y: 0 } });
        expect(gameManager.execute({ type: "undoMove", unitId: "a" }).value).toEqual([{ type: "moveUndone", unitId: "a", to: { x: 0, y: 0 } }]);
        expect(a).toMatchObject({ position: { x: 0, y: 0 }, hasMoved: false });
        expect(gridManager.getTileAtPosition(0, 0).value!.occupiedByUnitId).toBe("a");
        expect(gridManager.getTileAtPosition(2, 0).value!.occupiedByUnitId).toBeUndefined();

        gameManager.execute({ type: "moveTo", unitId: "a", destination: { x: 1, y: 0 } });
        gameManager.execute({ type: "wait", unitId: "a" });
        expect(gameManager.execute({ type: "undoMove", unitId: "a" }).err).toMatch(/already acted/);
        expect(a.position).toEqual({ x: 1, y: 0 });
    });

    it("tells subscribers when the game changes, and not when a command is refused", () => {
        const { gameManager } = game(["..."], [unit("a", P1, 0, 0), unit("e", ENEMY, 2, 0)]);
        let calls = 0;
        const unsubscribe = gameManager.subscribe(() => calls++);
        const version = gameManager.getVersion();

        gameManager.execute({ type: "wait", unitId: "a" });
        gameManager.execute({ type: "wait", unitId: "a" });

        expect(calls).toBe(1);
        expect(gameManager.getVersion()).toBe(version + 1);

        unsubscribe();
        gameManager.execute({ type: "endTurn" });
        expect(calls).toBe(1);
    });
});

describe("turns", () => {
    it("passes the turn around and gives units their actions back", () => {
        const { gameManager, unitManager } = game(["....."], [unit("a", P1, 0, 0), unit("e", ENEMY, 4, 0)]);

        gameManager.execute({ type: "wait", unitId: "a" });
        expect(types(gameManager.execute({ type: "endTurn" }).value!)).toEqual(["turnStarted"]);
        expect(gameManager.getState()).toMatchObject({ turn: 1, activeFaction: ENEMY });
        expect(unitManager.getUnitById("a").value!.hasActed).toBe(false); // not shown as spent on the other side's turn

        gameManager.execute({ type: "wait", unitId: "e" });

        gameManager.execute({ type: "endTurn" });
        expect(gameManager.getState()).toMatchObject({ turn: 2, activeFaction: P1 });
        expect(unitManager.getUnitById("a").value!.hasActed).toBe(false);
        expect(unitManager.getUnitById("e").value!.hasActed).toBe(false);
    });

    it("ends the game when one side is wiped out", () => {
        const { gameManager } = game(["..."], [unit("a", P1, 0, 0), unit("e", ENEMY, 1, 0, { stats: { currentHealth: 1 } })]);

        const events = gameManager.execute({ type: "attack", unitId: "a", targetId: "e" }).value!;

        expect(types(events)).toEqual(["combat", "unitDefeated", "gameOver"]);
        expect(gameManager.getState()).toMatchObject({ isOver: true, winner: P1 });
        expect(gameManager.execute({ type: "endTurn" }).err).toMatch(/over/);
    });

    it("applies poison at the start of the unit's own turn, and can kill with it", () => {
        const { gameManager, unitManager, gridManager } = game(["....."], [
            unit("a", P1, 0, 0),
            unit("b", P1, 1, 0, { stats: { currentHealth: 3 } }),
            unit("e", ENEMY, 4, 0),
        ]);

        unitManager.getUnitById("a").value!.statusEffects.push({ type: UnitStatusType.POISON, duration: 2, intensity: 5 });
        unitManager.getUnitById("b").value!.statusEffects.push({ type: UnitStatusType.POISON, duration: 2, intensity: 5 });

        gameManager.execute({ type: "endTurn" });
        const events = gameManager.execute({ type: "endTurn" }).value!;

        expect(events).toContainEqual({ type: "statusDamage", unitId: "a", damage: 5 });
        expect(events).toContainEqual({ type: "statusDamage", unitId: "b", damage: 3 });
        expect(events).toContainEqual({ type: "unitDefeated", unitId: "b" });
        expect(unitManager.getUnitById("a").value!.stats.currentHealth).toBe(15);
        expect(gridManager.getTileAtPosition(1, 0).value!.occupiedByUnitId).toBeUndefined();
    });

    it("skips a stunned unit's turn", () => {
        const { gameManager, unitManager } = game(["....."], [unit("a", P1, 0, 0), unit("e", ENEMY, 4, 0)]);

        unitManager.getUnitById("e").value!.statusEffects.push({ type: UnitStatusType.STUN, duration: 1, intensity: 1 });
        gameManager.execute({ type: "endTurn" });

        expect(gameManager.execute({ type: "wait", unitId: "e" }).err).toMatch(/already acted/);
    });
});

describe("AI", () => {
    it("plays its whole turn when the human ends theirs", () => {
        const { gameManager, unitManager } = game(["......"], [
            unit("a", P1, 0, 0, { stats: sturdy }),
            unit("e", ENEMY, 3, 0, { stats: sturdy }),
        ], enemyAi);

        gameManager.execute({ type: "wait", unitId: "a" });
        const events = gameManager.execute({ type: "endTurn" }).value!;

        expect(types(events)).toEqual(["turnStarted", "unitMoved", "combat", "turnStarted"]);
        expect(events[2]).toMatchObject({ attackerId: "e", defenderId: "a" });
        expect(unitManager.getUnitById("e").value!.position).toEqual({ x: 1, y: 0 });
        expect(unitManager.getUnitById("a").value!.stats.currentHealth).toBeLessThan(99);
        expect(gameManager.getState()).toMatchObject({ turn: 2, activeFaction: P1 });
        expect(gameManager.execute({ type: "wait", unitId: "e" }).err).toMatch(/isn't e's turn/);
    });

    it("goes for the kill", () => {
        const { gameManager } = game([".......", "......."], [
            unit("weak", P1, 1, 0, { stats: { currentHealth: 5 } }),
            unit("strong", P1, 5, 0, { stats: sturdy }),
            unit("e", ENEMY, 3, 0),
        ], enemyAi);

        const combat = gameManager.execute({ type: "endTurn" }).value!.find(event => event.type === "combat");

        expect(combat).toMatchObject({ attackerId: "e", defenderId: "weak" });
    });

    it("walks toward the nearest enemy when nothing is in reach", () => {
        const { gameManager, unitManager } = game([".........."], [unit("a", P1, 0, 0), unit("e", ENEMY, 9, 0)], enemyAi);

        gameManager.execute({ type: "endTurn" });

        expect(unitManager.getUnitById("e").value!.position).toEqual({ x: 4, y: 0 });
    });

    it("can play both sides, a round at a time", () => {
        const { gameManager } = game([".".repeat(20)], [unit("a", P1, 0, 0), unit("e", ENEMY, 19, 0)], {
            controllers: { [P1]: "ai", [ENEMY]: "ai" },
        });

        expect(gameManager.execute({ type: "endTurn" }).err).toMatch(/human/);

        for (let round = 0; round < 20 && !gameManager.getState().isOver; round++) {
            expect(gameManager.continueAi().success).toBe(true);
        }

        expect(gameManager.getState().isOver).toBe(true);
        expect(gameManager.getHistory().at(-1)?.type).toBe("gameOver");
    });
});
