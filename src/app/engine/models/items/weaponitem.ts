import { BaseItem, ItemCategory } from "./item";
import { ItemRestrictions } from "./itemtypes";
import { ItemEffect } from "./itemeffects";

export interface WeaponItem extends BaseItem {
    category: ItemCategory.WEAPON;
    attack: number;
    weaponType: WeaponType;
    range: number;
    baseHitRate: number;
    baseCritRate: number;
    durability?: number;
    maxDurability?: number;
    effects?: ItemEffect[];
    restrictions?: ItemRestrictions;
}

export enum WeaponType {
    SWORD,
    AXE,
    SPEAR,
    BOW,
    STAFF,
    BMAGIC,
    WMAGIC,
}