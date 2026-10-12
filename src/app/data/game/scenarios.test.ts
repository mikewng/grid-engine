import { describe, expect, it } from "vitest";
import { createGame } from "@/engine/gamesetup";
import { UnitFaction } from "@/engine/models/units/iunit";
import { SCENARIOS } from "./scenarios";

describe.each(SCENARIOS)("$name", ({ scenario }) => {
    it("has a rectangular map that builds into a game", () => {
        const widths = new Set(scenario.map.map(row => row.length));

        expect(widths.size).toBe(1);
        expect(() => createGame(scenario)).not.toThrow();
    });

    it("starts every unit on a tile it can stand on", () => {
        for (const unit of scenario.units) {
            const tile = scenario.legend[scenario.map[unit.position.y][unit.position.x]];
            const cost = scenario.terrain[tile].moveCost[unit.unitClass.movementType];

            expect(cost, `${unit.id} at (${unit.position.x}, ${unit.position.y})`).not.toBeNull();
        }
    });

    it("plays out with every side on AI, with fighting and no errors", () => {
        const { gameManager } = createGame({
            ...scenario,
            controllers: { [UnitFaction.P1]: "ai", [UnitFaction.P2]: "ai", [UnitFaction.ENEMY]: "ai" },
        });

        for (let round = 0; round < 25 && !gameManager.getState().isOver; round++) {
            expect(gameManager.continueAi().success).toBe(true);
        }

        expect(gameManager.getHistory().some(event => event.type === "combat")).toBe(true);
    });
});
