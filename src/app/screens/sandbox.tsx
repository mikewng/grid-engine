'use client'

// React and External Imports
import { useMemo, useState } from "react";
// Initializations
import { GameSetup } from "../data/gamesetup";
import { testKnightUnit } from "../data/units/testunit";
// Grid
import { Grid } from "../engine/models/grid/grid";
import { TileType } from "../engine/models/grid/itile";
import { Tile } from "../engine/models/grid/tile";
// Movement
import { Coordinate } from "../engine/models/grid/coordinate";
// UI Components
import GridComponent from "../components/gridcomponent";
import GeneralDebugger from "./uidebug/generaldebugger";
// CSS
import "./sandbox.scss"

const SandboxScreen = () => {
    const testUnit = useMemo(() => {
        return testKnightUnit;
    }, []);

    const testGrid = useMemo(() => {
        const width = 15;
        const height = 10;
        const gridContent: Tile[][] = [];

        for (let y = 0; y < height; y++) {
            const row: Tile[] = [];
            for (let x = 0; x < width; x++) {
                const tile = new Tile(TileType.Grass, x, y, 1);

                if (x === testUnit.position.x && y === testUnit.position.y) {
                    tile.occupiedByUnitId = testUnit.id;
                }

                row.push(tile);
            }
            gridContent.push(row);
        }

        return new Grid(height, width, gridContent);
    }, [testUnit]);

    const { gridManager, unitManager, movementManager } = useMemo(() => {
        return GameSetup.initializeManagers(testGrid, testUnit);
    }, [testGrid, testUnit]);

    const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
    const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
    const [movementPath, setMovementPath] = useState<Coordinate[]>([]);
    const [movementRange, setMovementRange] = useState<Set<string>>(new Set());

    const handleTileClick = (tile: Tile) => {
        setSelectedTile(tile);
        console.log(`Clicked tile at (${tile.x}, ${tile.y})`);

        if (tile.occupiedByUnitId) {
            setSelectedUnit(tile.occupiedByUnitId);
            setMovementPath([]);

            const rangeResult = movementManager.getMovementRange(tile.occupiedByUnitId);
            if (rangeResult.success && rangeResult.value) {
                const rangeSet = new Set<string>();
                rangeResult.value.forEach(coord => {
                    rangeSet.add(`${coord.x}-${coord.y}`);
                });
                setMovementRange(rangeSet);
            } else {
                setMovementRange(new Set());
            }

            console.log(`Selected unit: ${tile.occupiedByUnitId}`);
            return;
        }

        if (selectedUnit && !tile.occupiedByUnitId) {
            const path = [{ x: tile.x, y: tile.y }];
            console.log(`Attempting to move unit ${selectedUnit} to (${tile.x}, ${tile.y})`);

            const moveResult = movementManager.moveUnit(selectedUnit, path);
            if (moveResult.success) {
                console.log(`Movement successful!`);
                setMovementPath(path);
                setMovementRange(new Set());
                setSelectedUnit(null);
                setSelectedTile(tile);
            } else {
                console.log(`Movement failed: ${moveResult.err}`);
            }
        }
    };


    const handleUnitDeselect = () => {
        setSelectedUnit(null);
        setMovementPath([]);
        setMovementRange(new Set());
    };

    return (
        <div className="ge-sandbox-wrapper">
            <h1>Grid Engine Testing Screen</h1>
            <p>{`${testGrid.height}x${testGrid.width} Testing Grid`}</p>

            <div className="ge-sandbox-header-container">
                <GeneralDebugger
                    onUnitDeselect={handleUnitDeselect}
                    selectedTile={selectedTile}
                    selectedUnit={unitManager.getUnitById(selectedUnit ?? "").value}
                />
            </div>
            <div className="ge-sandbox-content-container">
                <GridComponent
                    grid={testGrid}
                    onTileClick={handleTileClick}
                    selectedTile={selectedTile}
                    movementRangeTiles={movementRange}
                />
            </div>
        </div>
    )
}

export default SandboxScreen;