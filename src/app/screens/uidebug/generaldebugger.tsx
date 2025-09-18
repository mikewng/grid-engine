import { TileType } from "@/app/engine/models/grid/itile";
import { Tile } from "@/app/engine/models/grid/tile"
import { IUnit, UnitFaction } from "@/app/engine/models/units/iunit";
import "./generaldebugger.scss"

interface GeneralDebuggerProps {
    selectedTile: Tile | null;
    selectedUnit: string | null;
    testUnit: IUnit;
    onUnitDeselect: () => void;
}

const GeneralDebugger: React.FC<GeneralDebuggerProps> =
    ({
        onUnitDeselect,
        selectedTile,
        selectedUnit,
        testUnit
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
                        {selectedTile.occupiedByUnitId && (
                            <div className="ge-unit-info">
                                Occupied by Unit: {testUnit.name} |
                                Level: {testUnit.stats.level} |
                                HP: {testUnit.stats.currentHealth}/{testUnit.stats.maxHealth} |
                                Faction: {UnitFaction[testUnit.unitFaction]}
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
                                    <strong>Selected Unit: {testUnit.name}</strong> |
                                    Movement: {testUnit.stats.movement} |
                                    Has Acted: {testUnit.hasActed ? 'Yes' : 'No'}
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