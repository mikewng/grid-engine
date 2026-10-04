import { Coordinate } from "@/engine/models/grid/coordinate";
import { TileType } from "@/engine/models/grid/itile";
import { TerrainDefinition } from "@/engine/models/grid/terrain";
import { MovementType } from "@/engine/models/units/unitclass";

const MOVEMENT_LABELS: [MovementType, string][] = [
    [MovementType.INFANTRY, "Foot"],
    [MovementType.ARMORED, "Armor"],
    [MovementType.MOUNTED, "Horse"],
    [MovementType.FLYING, "Flier"],
];

interface TerrainInfoProps {
    tile: Coordinate;
    terrain: TerrainDefinition;
    /** Movement type to point out, usually the selected unit's. */
    highlight?: MovementType;
}

/** What a tile's terrain does: cover and how hard it is to cross. */
const TerrainInfo = ({ tile, terrain, highlight }: TerrainInfoProps) => (
    <section className="ge-panel ge-terrain" aria-label="Terrain">
        <div className={`ge-terrain-swatch ge-tile ge-tile--${TileType[terrain.type].toLowerCase()}`} aria-hidden="true" />
        <div className="ge-terrain-body">
            <div className="ge-terrain-head">
                <span className="ge-terrain-name">{terrain.name}</span>
                <span className="ge-terrain-coords">{tile.x}, {tile.y}</span>
            </div>
            <div className="ge-terrain-bonuses">
                <span>DEF <strong>+{terrain.defense}</strong></span>
                <span>AVO <strong>+{terrain.avoid}</strong></span>
            </div>
            <div className="ge-terrain-costs">
                {MOVEMENT_LABELS.map(([type, label]) => {
                    const cost = terrain.moveCost[type];

                    return (
                        <span key={type} className={type === highlight ? "is-highlight" : ""} title={`Movement cost for ${label.toLowerCase()} units`}>
                            {label} <strong>{cost ?? "✕"}</strong>
                        </span>
                    );
                })}
            </div>
        </div>
    </section>
);

export default TerrainInfo;
