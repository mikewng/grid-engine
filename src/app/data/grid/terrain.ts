import { TileType } from "@/engine/models/grid/itile";
import { TerrainTable } from "@/engine/models/grid/terrain";
import { MovementType } from "@/engine/models/units/unitclass";

/** Which map character stands for which tile type. */
export const tileLegend: Record<string, TileType> = {
    'B': TileType.Block,
    'G': TileType.Grass,
    'F': TileType.Forest,
    'M': TileType.Mountain,
    'W': TileType.Water
};

const { INFANTRY, ARMORED, MOUNTED, FLYING } = MovementType;

/**
 * Costs and cover per terrain, in the spirit of Fire Emblem: forests slow
 * horses, mountains stop them and armor, water only lets fliers across, and
 * fliers get no cover from anything. null means impassable.
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
};
