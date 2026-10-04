import { BaseItem, ItemCategory } from "./item";
import { ItemRestrictions } from "./itemtypes";
import { ItemEffect } from "./itemeffects";
import { MovementType } from "../units/unitclass";

export interface WeaponItem extends BaseItem {
    category: ItemCategory.WEAPON;
    /** Might. */
    attack: number;
    weaponType: WeaponType;
    /** Closest distance it can hit (a bow is 2). */
    minRange: number;
    /** Farthest distance it can hit. */
    maxRange: number;
    /** Slows its wielder by however much this exceeds their constitution. */
    weight: number;
    baseHitRate: number;
    baseCritRate: number;
    /** Uses left. Undefined means unbreakable. */
    durability?: number;
    maxDurability?: number;
    /** Movement types it deals bonus damage to (a bow against fliers). */
    effectiveAgainst?: MovementType[];
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

/** A weapon as listed in game data, before a copy of it is given to a unit. */
export type WeaponDefinition = Omit<WeaponItem, "id" | "durability">;

/** A fresh copy of a weapon at full durability. Each unit gets its own. */
export function createWeapon(definition: WeaponDefinition, id: string): WeaponItem {
    return { ...definition, id, durability: definition.maxDurability };
}

export function weaponCoversDistance(weapon: WeaponItem, distance: number): boolean {
    return distance >= weapon.minRange && distance <= weapon.maxRange;
}

export function isMagicWeapon(weapon: WeaponItem): boolean {
    return weapon.weaponType === WeaponType.BMAGIC || weapon.weaponType === WeaponType.WMAGIC;
}
