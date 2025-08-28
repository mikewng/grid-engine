import { Tile } from "../engine/models/grid/tile";

interface TileProps {
    tile: Tile;
}

const TileComponent: React.FC<TileProps> = ({ tile }: { tile: Tile }) => {
    return (
        <div className="ge-tile-wrapper">
            Test
        </div>
    )
}

export default TileComponent;