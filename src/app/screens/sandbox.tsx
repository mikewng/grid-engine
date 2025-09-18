'use client'

import { useMemo, useState } from "react";
import GridComponent from "../components/gridcomponent";
import { TileType } from "../engine/models/grid/itile";
import { Tile } from "../engine/models/grid/tile";
import { Grid } from "../engine/models/grid/grid";
import { GameUnit } from "../engine/models/units/unit";
import { UnitFaction } from "../engine/models/units/iunit";
import { GridManager } from "../engine/managers/gridmanager";
import { UnitManager } from "../engine/managers/unitmanager";
import { MovementManager } from "../engine/managers/movementmanager";
import {
    BasicMovementCostCalculator,
    BasicPathValidator,
    BasicMovementTracker,
    BasicGridMutator
} from "../engine/utils/movement-implementations";
import { Coordinate } from "../engine/models/grid/coordinate";
import "./sandbox.scss"

const SandboxScreen = () => {
    // Create a test unit
    const testUnit = useMemo(() => {
        return new GameUnit(
            "test-unit-1",
            "knight",
            "Test Knight",
            { x: 2, y: 2 },
            { id: "knight-class", name: "Knight" },
            {
                level: 5,
                currentHealth: 25,
                maxHealth: 25,
                strength: 12,
                magic: 2,
                skill: 8,
                speed: 6,
                luck: 4,
                defense: 10,
                resistance: 3,
                movement: 3
            },
            {
                levelGR: 100,
                healthGR: 85,
                strengthGR: 75,
                magicGR: 10,
                skillGR: 60,
                speedGR: 50,
                luckGR: 30,
                defenseGR: 70,
                resistanceGR: 25,
                movementGR: 15
            },
            UnitFaction.P1
        );
    }, []);

    // Create a 10x10 grass grid
    const testGrid = useMemo(() => {
        const width = 11;
        const height = 11;
        const gridContent: Tile[][] = [];

        // Generate 10x10 grid of grass tiles
        for (let y = 0; y < height; y++) {
            const row: Tile[] = [];
            for (let x = 0; x < width; x++) {
                // Create grass tile with movement cost of 1
                const tile = new Tile(TileType.Grass, x, y, 1);

                // Place test unit on tile (2, 2)
                if (x === testUnit.position.x && y === testUnit.position.y) {
                    tile.occupiedByUnitId = testUnit.id;
                }

                row.push(tile);
            }
            gridContent.push(row);
        }

        return new Grid(height, width, gridContent);
    }, [testUnit]);

    // Initialize managers and movement system
    const { gridManager, unitManager, movementManager } = useMemo(() => {
        const gridManager = new GridManager();
        const unitManager = new UnitManager();

        // Set up managers with data
        gridManager.setGrid(testGrid);
        unitManager.setUnit(testUnit);

        // Create movement system components
        const costCalculator = new BasicMovementCostCalculator();
        const pathValidator = new BasicPathValidator(gridManager);
        const movementTracker = new BasicMovementTracker();
        const gridMutator = new BasicGridMutator(gridManager, unitManager);

        const movementManager = new MovementManager(
            unitManager,
            gridManager,
            costCalculator,
            pathValidator,
            movementTracker,
            gridMutator
        );

        return { gridManager, unitManager, movementManager };
    }, [testGrid, testUnit]);

    // State for tile selection and movement
    const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
    const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
    const [movementPath, setMovementPath] = useState<Coordinate[]>([]);
    const [movementRange, setMovementRange] = useState<Set<string>>(new Set());

    // Handle tile click
    const handleTileClick = (tile: Tile) => {
        setSelectedTile(tile);
        console.log(`Clicked tile at (${tile.x}, ${tile.y})`);

        // If clicking on a unit, select it
        if (tile.occupiedByUnitId) {
            setSelectedUnit(tile.occupiedByUnitId);
            setMovementPath([]);

            // Calculate and display movement range
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

        // If a unit is selected and clicking on an empty tile, try to move
        if (selectedUnit && !tile.occupiedByUnitId) {
            const path = [{ x: tile.x, y: tile.y }];
            console.log(`Attempting to move unit ${selectedUnit} to (${tile.x}, ${tile.y})`);

            const moveResult = movementManager.moveUnit(selectedUnit, path);
            if (moveResult.success) {
                console.log(`Movement successful!`);
                setMovementPath(path);
                setMovementRange(new Set()); // Clear movement range after moving
                setSelectedUnit(null); // Deselect unit after move
                setSelectedTile(tile);
            } else {
                console.log(`Movement failed: ${moveResult.err}`);
                alert(`Movement failed: ${moveResult.err}`);
            }
        }
    };

    // Handle unit selection reset
    const handleUnitDeselect = () => {
        setSelectedUnit(null);
        setMovementPath([]);
        setMovementRange(new Set());
    };

    return (
        <div className="ge-sandbox-wrapper">
            <div className="ge-sandbox-header-container">
                <h1>Grid Engine Testing Screen</h1>
                <p>11x11 Grass Grid with Test Unit - Click unit to select, then click empty tile to move</p>

                {selectedUnit && (
                    <div className="ge-movement-controls">
                        <div>
                            <strong>Selected Unit: {testUnit.name}</strong> |
                            Movement: {testUnit.stats.movement} |
                            Has Acted: {testUnit.hasActed ? 'Yes' : 'No'}
                        </div>
                        <button onClick={handleUnitDeselect}>Deselect Unit</button>
                    </div>
                )}

                {selectedTile && (
                    <div className="ge-selected-tile-info">
                        <div>
                            Selected: ({selectedTile.x}, {selectedTile.y}) |
                            Type: {TileType[selectedTile.type]} |
                            Cost: {selectedTile.movementCost}
                        </div>
                        {selectedTile.occupiedByUnitId && (
                            <div className="ge-unit-info">
                                <strong>Unit: {testUnit.name}</strong> |
                                Level: {testUnit.stats.level} |
                                HP: {testUnit.stats.currentHealth}/{testUnit.stats.maxHealth} |
                                Faction: {UnitFaction[testUnit.unitFaction]}
                            </div>
                        )}
                    </div>
                )}

                {movementPath.length > 0 && (
                    <div className="ge-movement-info">
                        <strong>Last Movement:</strong> to ({movementPath[movementPath.length - 1].x}, {movementPath[movementPath.length - 1].y})
                    </div>
                )}
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