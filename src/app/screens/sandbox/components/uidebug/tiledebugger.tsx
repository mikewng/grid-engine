import { TerrainDefinition } from "@/engine/models/grid/terrain";
import { Tile } from "@/engine/models/grid/tile"

interface TileProp {
    tile: Tile;
    terrain: TerrainDefinition;
}

const TileDebugger: React.FC<TileProp> = ({ tile, terrain }) => {
    return (
        <div className="tile-debugger-wrapper">
            <div>{`Tile Type: ${terrain.name}`}</div>
            <div>{`Tile Positions: (${tile.x}, ${tile.y})`}</div>
            <div>{`Tile Occupied By ID: ${tile.occupiedByUnitId}`}</div>
            <div>{`Avoid / Defense: +${terrain.avoid} / +${terrain.defense}`}</div>
        </div>
    )
}

export default TileDebugger;
