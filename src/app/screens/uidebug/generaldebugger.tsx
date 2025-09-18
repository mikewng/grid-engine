import { TileType } from "@/app/engine/models/grid/itile";
import { Tile } from "@/app/engine/models/grid/tile"
import { IUnit, UnitFaction } from "@/app/engine/models/units/iunit";
import "./generaldebugger.scss"

interface GeneralDebuggerProps {
    selectedTile: Tile | null;
    selectedUnit: IUnit | undefined;
    onUnitDeselect: () => void;
}

const GeneralDebugger: React.FC<GeneralDebuggerProps> =
    ({
        onUnitDeselect,
        selectedTile,
        selectedUnit
    }) => {
        return (
            <div className="general-debugger-wrapper">
                {selectedTile && (
                    <div className="ge-selected-tile-info">
                        <div className="ge-header tile">
                            Selected Tile
                        </div>
                        <div>
                            Selected: ({selectedTile.x}, {selectedTile.y}) |
                            Type: {TileType[selectedTile.type]} |
                            Cost: {selectedTile.movementCost}
                        </div>
                        {(selectedTile.occupiedByUnitId && selectedUnit) && (
                            <div className="ge-unit-info">
                                Occupied by Unit: {selectedUnit.name} |
                                Level: {selectedUnit.stats.level} |
                                HP: {selectedUnit.stats.currentHealth}/{selectedUnit.stats.maxHealth} |
                                Faction: {UnitFaction[selectedUnit.unitFaction]}
                            </div>
                        )}
                    </div>
                )}


                <div className="ge-movement-controls">
                    <div className="ge-header unit">
                        Selected Unit
                    </div>
                    <div className="ge-selected-unit-info">
                        {
                            selectedUnit ?
                            <div className="ge-data">
                                <div>
                                    <strong>Selected Unit: {selectedUnit.name}</strong> |
                                    Movement: {selectedUnit.stats.movement} |
                                    Has Acted: {selectedUnit.hasActed ? 'Yes' : 'No'}
                                </div>
                                <button onClick={onUnitDeselect}>Deselect Unit</button>
                            </div>
                            :
                            <div className="ge-data">None</div>
                        }
                    </div>

                </div>
            </div>
        )
    }

export default GeneralDebugger;