import { Coordinate } from "@/engine/models/grid/coordinate";
import { TerrainDefinition } from "@/engine/models/grid/terrain";
import { IUnit, UnitFaction } from "@/engine/models/units/iunit";
import "./generaldebugger.scss"

interface GeneralDebuggerProps {
    selectedTile: Coordinate | null;
    /** Terrain at the selected tile. */
    terrain: TerrainDefinition | undefined;
    /** Unit on the selected tile. */
    tileUnit: IUnit | undefined;
    /** The unit being given orders. */
    selectedUnit: IUnit | undefined;
    onUnitDeselect: () => void;
}

const GeneralDebugger: React.FC<GeneralDebuggerProps> =
    ({
        onUnitDeselect,
        selectedTile,
        terrain,
        tileUnit,
        selectedUnit
    }) => {
        const costFor = (unit: IUnit) => terrain?.moveCost[unit.unitClass.movementType] ?? null;

        return (
            <div className="general-debugger-wrapper">
                {selectedTile && terrain && (
                    <div className="ge-selected-tile-info">
                        <div className="ge-header tile">
                            Selected Tile
                        </div>
                        <div>
                            ({selectedTile.x}, {selectedTile.y}) |
                            {" "}{terrain.name} |
                            Avoid +{terrain.avoid} |
                            Def +{terrain.defense}
                            {selectedUnit && <> | Cost for {selectedUnit.name}: {costFor(selectedUnit) ?? "impassable"}</>}
                        </div>
                        {tileUnit && (
                            <div className="ge-unit-info">
                                Occupied by Unit: {tileUnit.name} |
                                Level: {tileUnit.stats.level} |
                                HP: {tileUnit.stats.currentHealth}/{tileUnit.stats.maxHealth} |
                                Faction: {UnitFaction[tileUnit.unitFaction]}
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
                                    Movement: {selectedUnit.stats.movement} ({selectedUnit.unitClass.movementType}) |
                                    Moved: {selectedUnit.hasMoved ? 'Yes' : 'No'} |
                                    Acted: {selectedUnit.hasActed ? 'Yes' : 'No'}
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
