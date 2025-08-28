import GridComponent from "../components/gridcomponent";
import TileComponent from "../components/tilecomponent";
import { TileType } from "../engine/models/grid/itile";
import { Tile } from "../engine/models/grid/tile";
import "./sandbox.scss"

const t = new Tile(TileType.Grass, 0, 0, 1);

const SandboxScreen = () => {
    return (
        <div className="ge-sandbox-wrapper">
            <div className="ge-sandbox-header-container">
                Grid Engine Testing Screen
            </div>
            <div className="ge-sandbox-content-container">
                {/* <div>Content Here</div> */}
                <TileComponent tile={t} />
            </div>
        </div>
    )
}

export default SandboxScreen;