import { Item } from "../items/item";
import { WeaponItem } from "../items/weaponitem";
import { UnitClass } from "./unitclass";
import { UnitSkill } from "./unitskills";

export interface IUnit {
    readonly id: string;
    readonly unitTypeId: string;
    name: string;
    position: { x: number, y: number }
    unitClass: UnitClass;
    stats: UnitStats;
    growths: UnitGrowths;
    skills: UnitSkill[];
    equippedWeapon: WeaponItem | undefined;
    items: Item[]
    range: number;
    isAlive: boolean;
    hasActed: boolean;
    statusEffects: UnitStatusEffect[];
    unitFaction: UnitFaction;
}

export interface UnitStats {
    currentExperience: number;
    level: number;
    currentHealth: number;
    maxHealth: number;
    strength: number;
    magic: number;
    skill: number;
    speed: number;
    luck: number;
    defense: number;
    resistance: number;
    movement: number;
}

export interface UnitGrowths {
    levelGR: number;
    healthGR: number;
    strengthGR: number;
    magicGR: number;
    skillGR: number;
    speedGR: number;
    luckGR: number;
    defenseGR: number;
    resistanceGR: number;
    movementGR: number;
}

export interface UnitStatusEffect {
    type: UnitStatusType,
    duration: number;
    instensity: number;
}



export enum UnitStatusType {
    STUN,
    POISON,
    SLOW,
    HASTE
}

export enum UnitFaction {
    P1,
    P2,
    ENEMY,
    NEUTRAL
}