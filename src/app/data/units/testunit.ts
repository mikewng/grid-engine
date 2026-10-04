import { UnitFaction, UnitGrowths, UnitStats } from "@/engine/models/units/iunit";
import { MovementType, UnitClass } from "@/engine/models/units/unitclass";
import { UnitTemplate } from "@/engine/models/units/unit";
import { testAxe, testBow, testMagicTome, testSword } from "../items/testweapons";

const knightClass: UnitClass = { id: "knight-class", name: "Knight", movementType: MovementType.MOUNTED };
const mageClass: UnitClass = { id: "mage-class", name: "Mage", movementType: MovementType.INFANTRY };
const archerClass: UnitClass = { id: "archer-class", name: "Archer", movementType: MovementType.INFANTRY };
const fighterClass: UnitClass = { id: "fighter-class", name: "Fighter", movementType: MovementType.INFANTRY };

const growths: UnitGrowths = {
    levelGR: 100,
    healthGR: 85,
    strengthGR: 75,
    magicGR: 10,
    skillGR: 60,
    speedGR: 50,
    luckGR: 30,
    defenseGR: 70,
    resistanceGR: 25,
    movementGR: 15
};

const stats = (overrides: Partial<UnitStats>): UnitStats => ({
    level: 5,
    currentExperience: 10,
    currentHealth: 25,
    maxHealth: 25,
    strength: 8,
    magic: 2,
    skill: 8,
    speed: 7,
    luck: 4,
    defense: 6,
    resistance: 3,
    constitution: 8,
    movement: 5,
    ...overrides,
});

export const testKnightUnit: UnitTemplate = {
    id: "test-unit-1",
    unitTypeId: "knight",
    name: "Test Knight",
    position: { x: 2, y: 2 },
    unitClass: knightClass,
    stats: stats({ strength: 9, defense: 8, constitution: 10, movement: 7 }),
    growths,
    faction: UnitFaction.P1,
    weapons: [testSword],
};

export const testMageUnit: UnitTemplate = {
    id: "test-unit-2",
    unitTypeId: "mage",
    name: "Test Mage",
    position: { x: 3, y: 4 },
    unitClass: mageClass,
    stats: stats({ currentHealth: 18, maxHealth: 18, strength: 1, magic: 8, defense: 2, resistance: 6, constitution: 5 }),
    growths,
    faction: UnitFaction.P1,
    weapons: [testMagicTome],
};

export const testEnemy: UnitTemplate = {
    id: "test-enemy-1",
    unitTypeId: "archer",
    name: "Enemy Archer",
    position: { x: 12, y: 3 },
    unitClass: archerClass,
    stats: stats({ currentHealth: 20, maxHealth: 20, strength: 6, skill: 6, speed: 5, defense: 4 }),
    growths,
    faction: UnitFaction.ENEMY,
    weapons: [testBow],
};

export const testEnemyFighter: UnitTemplate = {
    id: "test-enemy-2",
    unitTypeId: "fighter",
    name: "Enemy Fighter",
    position: { x: 13, y: 8 },
    unitClass: fighterClass,
    stats: stats({ currentHealth: 24, maxHealth: 24, strength: 7, skill: 4, speed: 5, defense: 4, constitution: 11 }),
    growths,
    faction: UnitFaction.ENEMY,
    weapons: [testAxe],
};
