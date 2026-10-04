import { MovementType } from "../units/unitclass";
import { TileType } from "./itile";

/** What a kind of tile does: what it costs to cross, and the cover it gives. */
export interface TerrainDefinition {
    type: TileType;
    name: string;
    /** Cost to enter, per movement type. null means that movement type can't enter. */
    moveCost: Record<MovementType, number | null>;
    /** Added to the avoid of a unit standing here. */
    avoid: number;
    /** Added to the defense (not resistance) of a unit standing here. */
    defense: number;
}

export type TerrainTable = Record<TileType, TerrainDefinition>;
