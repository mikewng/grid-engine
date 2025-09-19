'use client'

// React and External Imports
import { useMemo, useState } from "react";
// Initializations
import { GameSetup } from "../../data/game/gamesetup";
import { testEnemy, testKnightUnit, testMageUnit } from "../../data/units/testunit";
import { testGridArr } from "../../data/grid/testgrid";
// Grid
import { Tile } from "../../engine/models/grid/tile";
// Movement
import { Coordinate } from "../../engine/models/grid/coordinate";
// UI Components
import GridComponent from "@/app/components/grid/gridcomponent";
import GeneralDebugger from "@/app/screens/sandbox/components/uidebug/generaldebugger";
// CSS
import "./sandbox.scss"
import CombatUI from "@/app/components/combat/combatui";
import UnitStatsUI from "@/app/components/unit/unitstatsui";

const SandboxScreen = () => {
    const testUnits = useMemo(() => {
        return [testKnightUnit, testMageUnit, testEnemy];
    }, []);

    const { gridManager, unitManager, movementManager, combatManager } = useMemo(() => {
        return GameSetup.initializeManagers(testGridArr, testUnits);
    }, [testGridArr, testUnits]);

    const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
    const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
    const [targetUnit, setTargetUnit] = useState<string | null>(null);
    const [combatResult, setCombatResult] = useState<any>(null);
    const [movementRange, setMovementRange] = useState<Set<string>>(new Set());
    const [attackRange, setAttackRange] = useState<Set<string>>(new Set());
    const [gamePhase, setGamePhase] = useState<'select' | 'move' | 'attack'>('select');

    const handleTileClick = (tile: Tile) => {
        setSelectedTile(tile);
        console.log(`Clicked tile at (${tile.x}, ${tile.y}) - Phase: ${gamePhase}`);

        if (tile.occupiedByUnitId) {
            if (gamePhase === 'select') {
                // Select unit and enter movement phase
                setSelectedUnit(tile.occupiedByUnitId);
                setTargetUnit(null);
                setCombatResult(null);
                setGamePhase('move');

                // Show movement range
                const movementRangeResult = movementManager.getMovementRange(tile.occupiedByUnitId);
                if (movementRangeResult.success && movementRangeResult.value) {
                    const rangeSet = new Set<string>();
                    movementRangeResult.value.forEach(coord => {
                        rangeSet.add(`${coord.x}-${coord.y}`);
                    });
                    setMovementRange(rangeSet);
                } else {
                    setMovementRange(new Set());
                }

                // Clear attack range for now
                setAttackRange(new Set());

                console.log(`Selected unit: ${tile.occupiedByUnitId} - Entering move phase`);
            } else if (gamePhase === 'attack' && selectedUnit && selectedUnit !== tile.occupiedByUnitId) {
                // Attack target unit
                setTargetUnit(tile.occupiedByUnitId);

                console.log(`Initiating combat: ${selectedUnit} vs ${tile.occupiedByUnitId}`);

                const canAttackResult = combatManager.canAttackTarget(selectedUnit, tile.occupiedByUnitId);
                if (canAttackResult.success && canAttackResult.value) {
                    const result = combatManager.initiateAttack(selectedUnit, tile.occupiedByUnitId);
                    if (result.success) {
                        setCombatResult(result.value);
                        console.log('Combat result:', result.value);
                        // Reset after combat
                        setTimeout(() => handleUnitDeselect(), 3000);
                    } else {
                        console.log('Combat failed:', result.err);
                    }
                } else {
                    console.log('Cannot attack target:', canAttackResult.err || 'Out of range');
                }
            } else if (selectedUnit === tile.occupiedByUnitId) {
                // Clicking same unit deselects
                handleUnitDeselect();
            }
        } else if (gamePhase === 'move' && selectedUnit && !tile.occupiedByUnitId) {
            // Move unit to empty tile
            const path = [{ x: tile.x, y: tile.y }];
            console.log(`Attempting to move unit ${selectedUnit} to (${tile.x}, ${tile.y})`);

            const moveResult = movementManager.moveUnit(selectedUnit, path);
            if (moveResult.success) {
                console.log('Movement successful! Entering attack phase.');
                setGamePhase('attack');
                setMovementRange(new Set());

                // Show attack range from new position
                const attackRangeResult = combatManager.getAttackRange(selectedUnit);
                if (attackRangeResult.success && attackRangeResult.value) {
                    const rangeSet = new Set<string>();
                    attackRangeResult.value.forEach(coord => {
                        rangeSet.add(`${coord.x}-${coord.y}`);
                    });
                    setAttackRange(rangeSet);
                } else {
                    setAttackRange(new Set());
                }
            } else {
                console.log(`Movement failed: ${moveResult.err}`);
            }
        }
    };

    const handleUnitDeselect = () => {
        setSelectedUnit(null);
        setTargetUnit(null);
        setCombatResult(null);
        setMovementRange(new Set());
        setAttackRange(new Set());
        setGamePhase('select');
    };

    const skipToAttack = () => {
        if (selectedUnit && gamePhase === 'move') {
            setGamePhase('attack');
            setMovementRange(new Set());

            // Show attack range from current position
            const attackRangeResult = combatManager.getAttackRange(selectedUnit);
            if (attackRangeResult.success && attackRangeResult.value) {
                const rangeSet = new Set<string>();
                attackRangeResult.value.forEach(coord => {
                    rangeSet.add(`${coord.x}-${coord.y}`);
                });
                setAttackRange(rangeSet);
            }
        }
    };

    return (
        <div className="ge-sandbox-wrapper">
            <h1>Grid Engine Combat Test</h1>
            <p>{`${testGridArr.length}x${testGridArr[0].length} Testing Grid`}</p>

            <div className="ge-sandbox-controls">
                <div style={{ marginBottom: '10px' }}>
                    <span style={{
                        padding: '8px 16px',
                        backgroundColor: gamePhase === 'select' ? '#2196F3' : gamePhase === 'move' ? '#4CAF50' : '#f44336',
                        color: 'white',
                        borderRadius: '4px',
                        marginRight: '10px'
                    }}>
                        Phase: {gamePhase === 'select' ? 'Select Unit' : gamePhase === 'move' ? 'Move' : 'Attack'}
                    </span>
                    {selectedUnit && gamePhase === 'move' && (
                        <button
                            onClick={skipToAttack}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#FF9800',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                marginRight: '10px'
                            }}
                        >
                            Skip to Attack
                        </button>
                    )}
                    <button
                        onClick={handleUnitDeselect}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#9E9E9E',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Deselect All
                    </button>
                </div>
                {selectedUnit && (
                    <p>Selected Unit: {selectedUnit}</p>
                )}
                {targetUnit && (
                    <p>Target: {targetUnit}</p>
                )}
                <p style={{ fontSize: '14px', color: '#666' }}>
                    {gamePhase === 'select' && 'Click a unit to select it'}
                    {gamePhase === 'move' && 'Click an empty tile to move, or skip to attack'}
                    {gamePhase === 'attack' && 'Click an enemy unit to attack it'}
                </p>
            </div>

            {combatResult && (
                <div style={{
                    backgroundColor: '#f5f5f5',
                    border: '1px solid #ddd',
                    padding: '15px',
                    margin: '10px 0',
                    borderRadius: '4px'
                }}>
                    <h3>Combat Result</h3>
                    <p>Attacker Damage Dealt: {combatResult.attackerDamageDealt}</p>
                    <p>Defender Damage Dealt: {combatResult.defenderDamageDealt}</p>
                    <p>Attacker Hits: {combatResult.attackerHits}</p>
                    <p>Defender Hits: {combatResult.defenderHits}</p>
                    <p>Defender Killed: {combatResult.defenderKilled ? 'Yes' : 'No'}</p>
                    <p>Attacker Killed: {combatResult.attackerKilled ? 'Yes' : 'No'}</p>
                </div>
            )}

            <div className="ge-sandbox-header-container">
                <GeneralDebugger
                    onUnitDeselect={handleUnitDeselect}
                    selectedTile={selectedTile}
                    selectedUnit={unitManager.getUnitById(selectedUnit ?? "").value}
                />
            </div>

            <div className="ge-sandbox-content-container">
                {(() => {
                    const gridResult = gridManager.getGrid();
                    return gridResult.success && gridResult.value ? (
                        <GridComponent
                            grid={gridResult.value}
                            onTileClick={handleTileClick}
                            selectedTile={selectedTile}
                            movementRangeTiles={movementRange}
                            attackRangeTiles={attackRange}
                        />
                    ) : null;
                })()}
            </div>
        </div>
    )
}

export default SandboxScreen;