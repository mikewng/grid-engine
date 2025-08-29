import { Item } from "./item";

export interface WeaponItem extends Item {
    attack: number;
    weaponType: WeaponType;
    range: number;
    baseHitRate: number;
    baseCritRate: number;
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