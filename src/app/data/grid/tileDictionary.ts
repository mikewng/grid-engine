import { TileType } from "@/app/engine/models/grid/itile";

export const TileDictionary: { [key: string]: TileType } = {
    'B': TileType.Block,
    'G': TileType.Grass,
    'F': TileType.Forest,
    'M': TileType.Mountain,
    'W': TileType.Water
};

export const movementCostMap: { [key in TileType]: number } = {
    [TileType.Grass]: 1,
    [TileType.Forest]: 7,
    [TileType.Mountain]: 3,
    [TileType.Water]: 2,
    [TileType.Block]: Number.MAX_SAFE_INTEGER
};