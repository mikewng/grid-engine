import { Coordinate } from "../grid/coordinate";
import { BaseItem } from "../items/item";
import { WeaponItem } from "../items/weaponitem";
import { UnitClass } from "./unitclass";
import { UnitSkill } from "./unitskills";

export interface IUnit {
    readonly id: string;
    readonly unitTypeId: string;
    name: string;
    position: Coordinate;
    unitClass: UnitClass;
    stats: UnitStats;
    growths: UnitGrowths;
    skills: UnitSkill[];
    /** The weapon it fights with. Always one of `items`. */
    equippedWeapon: WeaponItem | undefined;
    items: BaseItem[];
    isAlive: boolean;
    /** Has moved this turn; it can still attack or wait. */
    hasMoved: boolean;
    /** Is done for this turn. */
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
    /** Build: how much weapon weight the unit carries without slowing down. */
    constitution: number;
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
    intensity: number;
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
