import { Scenario } from "@/engine/gamesetup";
import { UnitFaction } from "@/engine/models/units/iunit";
import { testGridArr } from "../grid/testgrid";
import { terrainTable, tileLegend } from "../grid/terrain";
import { testEnemy, testEnemyFighter, testKnightUnit, testMageUnit } from "../units/testunit";

/** The sandbox: two player units against two AI enemies on the test grid. */
export const testScenario: Scenario = {
    map: testGridArr,
    legend: tileLegend,
    terrain: terrainTable,
    units: [testKnightUnit, testMageUnit, testEnemy, testEnemyFighter],
    turnOrder: [UnitFaction.P1, UnitFaction.ENEMY],
    controllers: { [UnitFaction.ENEMY]: "ai" },
    seed: 2026,
};
