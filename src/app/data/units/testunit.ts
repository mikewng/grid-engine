import { UnitFaction } from "@/app/engine/models/units/iunit";
import { GameUnit } from "@/app/engine/models/units/unit";

export const testKnightUnit = new GameUnit(
    "test-unit-1",
    "knight",
    "Test Knight",
    { x: 2, y: 2 },
    { id: "knight-class", name: "Knight" },
    {
        level: 5,
        currentHealth: 25,
        maxHealth: 25,
        strength: 12,
        magic: 2,
        skill: 8,
        speed: 6,
        luck: 4,
        defense: 10,
        resistance: 3,
        movement: 8
    },
    {
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
    },
    UnitFaction.P1
);


export const testMageUnit = new GameUnit(
    "test-unit-2",
    "mage",
    "Test Mage",
    { x: 8, y: 2 },
    { id: "mage-class", name: "Mage" },
    {
        level: 5,
        currentHealth: 16,
        maxHealth: 25,
        strength: 12,
        magic: 2,
        skill: 8,
        speed: 6,
        luck: 4,
        defense: 10,
        resistance: 3,
        movement: 5
    },
    {
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
    },
    UnitFaction.P1
);
