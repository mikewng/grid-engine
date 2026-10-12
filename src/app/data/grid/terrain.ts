import { TileType } from "@/engine/models/grid/itile";
import { TerrainTable } from "@/engine/models/grid/terrain";
import { MovementType } from "@/engine/models/units/unitclass";

/** Which map character stands for which tile type. Grass and walls also have a quieter character each, for drawing larger maps. */
export const tileLegend: Record<string, TileType> = {
    'B': TileType.Block,
    '#': TileType.Block,
    'G': TileType.Grass,
    '.': TileType.Grass,
    'F': TileType.Forest,
    'M': TileType.Mountain,
    'W': TileType.Water,
    '=': TileType.Road,
    'H': TileType.Bridge,
    'T': TileType.Fort,
    'S': TileType.Sand,
    'V': TileType.Village,
};

const { INFANTRY, ARMORED, MOUNTED, FLYING } = MovementType;

/**
 * Costs and cover per terrain, in the spirit of Fire Emblem: forests slow
 * horses, mountains stop them and armor, water only lets fliers across, sand
 * bogs down everyone on the ground, and forts give cover and heal a fifth of
 * max HP each turn. null means impassable.
 */
export const terrainTable: TerrainTable = {
    [TileType.Grass]: {
        type: TileType.Grass,
        name: "Grass",
        moveCost: { [INFANTRY]: 1, [ARMORED]: 1, [MOUNTED]: 1, [FLYING]: 1 },
        avoid: 0,
        defense: 0,
    },
    [TileType.Forest]: {
        type: TileType.Forest,
        name: "Forest",
        moveCost: { [INFANTRY]: 2, [ARMORED]: 2, [MOUNTED]: 3, [FLYING]: 1 },
        avoid: 20,
        defense: 1,
    },
    [TileType.Mountain]: {
        type: TileType.Mountain,
        name: "Mountain",
        moveCost: { [INFANTRY]: 4, [ARMORED]: null, [MOUNTED]: null, [FLYING]: 1 },
        avoid: 30,
        defense: 2,
    },
    [TileType.Water]: {
        type: TileType.Water,
        name: "Water",
        moveCost: { [INFANTRY]: null, [ARMORED]: null, [MOUNTED]: null, [FLYING]: 1 },
        avoid: 0,
        defense: 0,
    },
    [TileType.Block]: {
        type: TileType.Block,
        name: "Wall",
        moveCost: { [INFANTRY]: null, [ARMORED]: null, [MOUNTED]: null, [FLYING]: null },
        avoid: 0,
        defense: 0,
    },
    [TileType.Road]: {
        type: TileType.Road,
        name: "Road",
        moveCost: { [INFANTRY]: 1, [ARMORED]: 1, [MOUNTED]: 1, [FLYING]: 1 },
        avoid: 0,
        defense: 0,
    },
    [TileType.Bridge]: {
        type: TileType.Bridge,
        name: "Bridge",
        moveCost: { [INFANTRY]: 1, [ARMORED]: 1, [MOUNTED]: 1, [FLYING]: 1 },
        avoid: 0,
        defense: 0,
    },
    [TileType.Fort]: {
        type: TileType.Fort,
        name: "Fort",
        moveCost: { [INFANTRY]: 2, [ARMORED]: 2, [MOUNTED]: 2, [FLYING]: 1 },
        avoid: 20,
        defense: 2,
        heal: 0.2,
    },
    [TileType.Sand]: {
        type: TileType.Sand,
        name: "Sand",
        moveCost: { [INFANTRY]: 2, [ARMORED]: 3, [MOUNTED]: 4, [FLYING]: 1 },
        avoid: 5,
        defense: 0,
    },
    [TileType.Village]: {
        type: TileType.Village,
        name: "Village",
        moveCost: { [INFANTRY]: 1, [ARMORED]: 1, [MOUNTED]: 1, [FLYING]: 1 },
        avoid: 10,
        defense: 0,
    },
};
