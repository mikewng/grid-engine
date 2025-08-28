'use client'

import { useMemo, useState } from "react";
import GridComponent from "../components/gridcomponent";
import { TileType } from "../engine/models/grid/itile";
import { Tile } from "../engine/models/grid/tile";
import { Grid } from "../engine/models/grid/grid";
import "./sandbox.scss"

const SandboxScreen = () => {
    // Create a 10x10 grass grid
    const testGrid = useMemo(() => {
        const width = 10;
        const height = 15;
        const gridContent: Tile[][] = [];

        // Generate 10x10 grid of grass tiles
        for (let y = 0; y < height; y++) {
            const row: Tile[] = [];
            for (let x = 0; x < width; x++) {
                // Create grass tile with movement cost of 1
                const tile = new Tile(TileType.Grass, x, y, 1);
                row.push(tile);
            }
            gridContent.push(row);
        }

        return new Grid(height, width, gridContent);
    }, []);

    // State for tile selection
    const [selectedTile, setSelectedTile] = useState<Tile | null>(null);

    // Handle tile click
    const handleTileClick = (tile: Tile) => {
        setSelectedTile(tile);
        console.log(`Clicked tile at (${tile.x}, ${tile.y})`);
    };

    return (
        <div className="ge-sandbox-wrapper">
            <div className="ge-sandbox-header-container">
                <h1>Grid Engine Testing Screen</h1>
                <p>10x10 Grass Grid Test</p>
                {selectedTile && (
                    <div className="ge-selected-tile-info">
                        Selected: ({selectedTile.x}, {selectedTile.y}) | 
                        Type: {TileType[selectedTile.type]} | 
                        Cost: {selectedTile.movementCost}
                    </div>
                )}
            </div>
            <div className="ge-sandbox-content-container">
                <GridComponent 
                    grid={testGrid}
                    onTileClick={handleTileClick}
                    selectedTile={selectedTile}
                />
            </div>
        </div>
    )
}

export default SandboxScreen;