import { MovementType, UnitClass } from "@/engine/models/units/unitclass";

// Unit classes for the larger scenarios. A class sets how its units cross terrain.

const { INFANTRY, ARMORED, MOUNTED, FLYING } = MovementType;

const unitClass = (name: string, movementType: MovementType): UnitClass => ({
    id: name.toLowerCase().replace(/ /g, "-"),
    name,
    movementType,
});

export const lord = unitClass("Lord", INFANTRY);
export const cavalier = unitClass("Cavalier", MOUNTED);
export const armorKnight = unitClass("Armor Knight", ARMORED);
export const general = unitClass("General", ARMORED);
export const pegasusKnight = unitClass("Pegasus Knight", FLYING);
export const wyvernRider = unitClass("Wyvern Rider", FLYING);
export const archer = unitClass("Archer", INFANTRY);
export const mage = unitClass("Mage", INFANTRY);
export const monk = unitClass("Monk", INFANTRY);
export const shaman = unitClass("Shaman", INFANTRY);
export const fighter = unitClass("Fighter", INFANTRY);
export const brigand = unitClass("Brigand", INFANTRY);
export const soldier = unitClass("Soldier", INFANTRY);
export const mercenary = unitClass("Mercenary", INFANTRY);
