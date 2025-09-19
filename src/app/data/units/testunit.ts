import { UnitFaction } from "@/app/engine/models/units/iunit";
import { Unit } from "@/app/engine/models/units/unit";
import { testSword, testMagicTome, testBow } from "../items/testweapons";

export const testKnightUnit = new Unit(
    "test-unit-1",
    "knight",
    "Test Knight",
    { x: 2, y: 2 },
    { id: "knight-class", name: "Knight" },
    {
        level: 5,
        currentExperience: 10,
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

// Equip the knight with a sword
testKnightUnit.equippedWeapon = testSword;

export const testMageUnit = new Unit(
    "test-unit-2",
    "mage",
    "Test Mage",
    { x: 8, y: 2 },
    { id: "mage-class", name: "Mage" },
    {
        level: 5,
        currentExperience: 10,
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

// Equip the mage with a magic tome
testMageUnit.equippedWeapon = testMagicTome;

export const testEnemy = new Unit(
    "test-enemy-1",
    "mage",
    "Test Enemy",
    { x: 10, y: 2 },
    { id: "mage-class", name: "Mage" },
    {
        level: 5,
        currentExperience: 10,
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
    UnitFaction.ENEMY
);

// Equip the enemy with a bow
testEnemy.equippedWeapon = testBow;
