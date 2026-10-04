import { createGame, Scenario } from "../gamesetup";
import { TileType } from "../models/grid/itile";
import { TerrainTable } from "../models/grid/terrain";
import { ItemCategory } from "../models/items/item";
import { WeaponDefinition, WeaponType } from "../models/items/weaponitem";
import { UnitFaction, UnitStats } from "../models/units/iunit";
import { MovementType } from "../models/units/unitclass";
import { UnitTemplate } from "../models/units/unit";

const { INFANTRY, ARMORED, MOUNTED, FLYING } = MovementType;

export const legend: Record<string, TileType> = {
    ".": TileType.Grass,
    F: TileType.Forest,
    M: TileType.Mountain,
    W: TileType.Water,
    "#": TileType.Block,
};

export const terrain: TerrainTable = {
    [TileType.Grass]: { type: TileType.Grass, name: "Grass", moveCost: { [INFANTRY]: 1, [ARMORED]: 1, [MOUNTED]: 1, [FLYING]: 1 }, avoid: 0, defense: 0 },
    [TileType.Forest]: { type: TileType.Forest, name: "Forest", moveCost: { [INFANTRY]: 2, [ARMORED]: 2, [MOUNTED]: 3, [FLYING]: 1 }, avoid: 20, defense: 1 },
    [TileType.Mountain]: { type: TileType.Mountain, name: "Mountain", moveCost: { [INFANTRY]: 4, [ARMORED]: null, [MOUNTED]: null, [FLYING]: 1 }, avoid: 30, defense: 2 },
    [TileType.Water]: { type: TileType.Water, name: "Water", moveCost: { [INFANTRY]: null, [ARMORED]: null, [MOUNTED]: null, [FLYING]: 1 }, avoid: 0, defense: 0 },
    [TileType.Block]: { type: TileType.Block, name: "Wall", moveCost: { [INFANTRY]: null, [ARMORED]: null, [MOUNTED]: null, [FLYING]: null }, avoid: 0, defense: 0 },
};

const weapon = (name: string, weaponType: WeaponType, attack: number, minRange: number, maxRange: number, extra: Partial<WeaponDefinition> = {}): WeaponDefinition => ({
    name,
    itemTypeId: name.toLowerCase().replace(/ /g, "-"),
    category: ItemCategory.WEAPON,
    weaponType,
    attack,
    minRange,
    maxRange,
    weight: 0,
    baseHitRate: 100,
    baseCritRate: 0,
    maxDurability: 40,
    ...extra,
});

export const sword = weapon("Sword", WeaponType.SWORD, 5, 1, 1);
export const axe = weapon("Axe", WeaponType.AXE, 5, 1, 1);
export const bow = weapon("Bow", WeaponType.BOW, 6, 2, 2, { effectiveAgainst: [FLYING] });
export const tome = weapon("Tome", WeaponType.BMAGIC, 5, 1, 2);

export interface UnitOptions {
    stats?: Partial<UnitStats>;
    movementType?: MovementType;
    weapons?: WeaponDefinition[];
}

/** A unit with plain, even stats; override what a test cares about. */
export function unit(id: string, faction: UnitFaction, x: number, y: number, options: UnitOptions = {}): UnitTemplate {
    return {
        id,
        unitTypeId: id,
        name: id,
        position: { x, y },
        unitClass: { id: "class", name: "Class", movementType: options.movementType ?? INFANTRY },
        stats: {
            level: 1,
            currentExperience: 0,
            currentHealth: 20,
            maxHealth: 20,
            strength: 8,
            magic: 8,
            skill: 5,
            speed: 5,
            luck: 0,
            defense: 4,
            resistance: 3,
            constitution: 10,
            movement: 5,
            ...options.stats,
        },
        growths: {
            levelGR: 0, healthGR: 0, strengthGR: 0, magicGR: 0, skillGR: 0,
            speedGR: 0, luckGR: 0, defenseGR: 0, resistanceGR: 0, movementGR: 0,
        },
        faction,
        weapons: options.weapons ?? [sword],
    };
}

/** A game on a map given as rows of characters (see `legend`). Every faction is human unless set otherwise. */
export function game(rows: string[], units: UnitTemplate[], options: Partial<Scenario> = {}) {
    return createGame({
        map: rows.map(row => row.split("")),
        legend,
        terrain,
        units,
        turnOrder: [UnitFaction.P1, UnitFaction.ENEMY],
        seed: 1,
        ...options,
    });
}
