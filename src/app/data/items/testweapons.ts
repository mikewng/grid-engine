import { WeaponItem, WeaponType } from "@/app/engine/models/items/weaponitem";
import { ItemCategory } from "@/app/engine/models/items/item";

export const testSword: WeaponItem = {
    id: "test-sword",
    name: "Iron Sword",
    description: "A sturdy iron sword",
    category: ItemCategory.WEAPON,
    attack: 8,
    weaponType: WeaponType.SWORD,
    range: 1,
    baseHitRate: 85,
    baseCritRate: 5,
    durability: 46,
    maxDurability: 46,
    itemTypeId: "sword-1"
};

export const testSpear: WeaponItem = {
    id: "test-spear",
    name: "Steel Spear",
    description: "A long steel spear with extended reach",
    category: ItemCategory.WEAPON,
    attack: 7,
    weaponType: WeaponType.SPEAR,
    range: 1,
    baseHitRate: 80,
    baseCritRate: 10,
    durability: 30,
    maxDurability: 30,
    itemTypeId: "spear-1"
};

export const testMagicTome: WeaponItem = {
    id: "test-fire-tome",
    name: "Fire Tome",
    description: "A magical tome containing fire spells",
    category: ItemCategory.WEAPON,
    attack: 6,
    weaponType: WeaponType.BMAGIC,
    range: 2,
    baseHitRate: 90,
    baseCritRate: 0,
    durability: 40,
    maxDurability: 40,
    itemTypeId: "tome-1"
};

export const testBow: WeaponItem = {
    id: "test-bow",
    name: "Iron Bow",
    description: "A reliable iron bow for ranged combat",
    category: ItemCategory.WEAPON,
    attack: 6,
    weaponType: WeaponType.BOW,
    range: 2,
    baseHitRate: 85,
    baseCritRate: 5,
    durability: 45,
    maxDurability: 45,
    itemTypeId: "bow-1"
};