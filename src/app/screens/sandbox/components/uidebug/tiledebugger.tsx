import { Tile } from "@/app/engine/models/grid/tile"

interface TileProp {
    tile: Tile;
}

const TileDebugger: React.FC<TileProp> = ({ tile }: { tile: Tile }) => {
    return (
        <div className="tile-debugger-wrapper">
            <div>{`Tile Type: ${tile.type}`}</div>
            <div>{`Tile Positions: (${tile.x}, ${tile.y})`}</div>
            <div>{`Tile Occupied By ID: ${tile.occupiedByUnitId}`}</div>
            <div>{`Tile Movement Cost: ${tile.movementCost}`}</div>
        </div>
    )
}