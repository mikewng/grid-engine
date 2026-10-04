import { WeaponDefinition, WeaponType } from "@/engine/models/items/weaponitem";
import { ItemCategory } from "@/engine/models/items/item";
import { MovementType } from "@/engine/models/units/unitclass";

// Weapon definitions. Each unit gets its own copy (see createUnit), so
// durability is tracked per unit rather than shared.

export const testSword: WeaponDefinition = {
    name: "Iron Sword",
    description: "A sturdy iron sword",
    category: ItemCategory.WEAPON,
    attack: 5,
    weaponType: WeaponType.SWORD,
    minRange: 1,
    maxRange: 1,
    weight: 5,
    baseHitRate: 90,
    baseCritRate: 0,
    maxDurability: 46,
    itemTypeId: "sword-1"
};

export const testSpear: WeaponDefinition = {
    name: "Steel Spear",
    description: "A long steel spear",
    category: ItemCategory.WEAPON,
    attack: 10,
    weaponType: WeaponType.SPEAR,
    minRange: 1,
    maxRange: 1,
    weight: 13,
    baseHitRate: 70,
    baseCritRate: 0,
    maxDurability: 30,
    itemTypeId: "spear-1"
};

export const testAxe: WeaponDefinition = {
    name: "Iron Axe",
    description: "A heavy iron axe",
    category: ItemCategory.WEAPON,
    attack: 8,
    weaponType: WeaponType.AXE,
    minRange: 1,
    maxRange: 1,
    weight: 10,
    baseHitRate: 75,
    baseCritRate: 0,
    maxDurability: 45,
    itemTypeId: "axe-1"
};

export const testMagicTome: WeaponDefinition = {
    name: "Fire Tome",
    description: "A magical tome containing fire spells",
    category: ItemCategory.WEAPON,
    attack: 5,
    weaponType: WeaponType.BMAGIC,
    minRange: 1,
    maxRange: 2,
    weight: 4,
    baseHitRate: 90,
    baseCritRate: 0,
    maxDurability: 40,
    itemTypeId: "tome-1"
};

export const testBow: WeaponDefinition = {
    name: "Iron Bow",
    description: "A reliable iron bow. Deadly against fliers",
    category: ItemCategory.WEAPON,
    attack: 6,
    weaponType: WeaponType.BOW,
    minRange: 2,
    maxRange: 2,
    weight: 5,
    baseHitRate: 85,
    baseCritRate: 0,
    maxDurability: 45,
    effectiveAgainst: [MovementType.FLYING],
    itemTypeId: "bow-1"
};
