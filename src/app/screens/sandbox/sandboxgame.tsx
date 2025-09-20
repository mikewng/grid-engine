'use client'
import { useGame, useGameManagers, useGameState } from '@/app/context/gamecontext';
import { Tile } from '../../engine/models/grid/tile';
import GridComponent from '@/app/components/grid/gridcomponent';
import GeneralDebugger from '@/app/screens/sandbox/components/uidebug/generaldebugger';
import SandboxControls from '@/app/screens/sandbox/components/uidebug/sandboxcontrols';
import CombatResultsUI from './components/uidebug/combatresultsui';
import './sandbox.scss';

const SandboxGame = () => {
    const { config, isGameInitialized, managers } = useGame();
    const { gameState, updateGameState } = useGameState();

    if (!isGameInitialized || !config || !managers) {
        return <div>Loading game...</div>;
    }

    const { gridManager, unitManager, movementManager, combatManager } = managers;

    const handleTileClick = (tile: Tile) => {
        updateGameState({ selectedTile: tile });
        console.log(`Clicked tile at (${tile.x}, ${tile.y}) - Phase: ${gameState.gamePhase}`);

        if (tile.occupiedByUnitId) {
            if (gameState.gamePhase === 'select') {
                // Select unit and enter movement phase
                updateGameState({
                    selectedUnit: tile.occupiedByUnitId,
                    targetUnit: null,
                    combatResult: null,
                    gamePhase: 'move'
                });

                // Show movement range
                const movementRangeResult = movementManager.getMovementRange(tile.occupiedByUnitId);
                if (movementRangeResult.success && movementRangeResult.value) {
                    const rangeSet = new Set<string>();
                    movementRangeResult.value.forEach(coord => {
                        rangeSet.add(`${coord.x}-${coord.y}`);
                    });
                    updateGameState({
                        movementRange: rangeSet,
                        attackRange: new Set()
                    });
                } else {
                    updateGameState({ movementRange: new Set() });
                }

                console.log(`Selected unit: ${tile.occupiedByUnitId} - Entering move phase`);
            } else if (gameState.gamePhase === 'attack' && gameState.selectedUnit && gameState.selectedUnit !== tile.occupiedByUnitId) {
                // Attack target unit
                updateGameState({ targetUnit: tile.occupiedByUnitId });

                console.log(`Initiating combat: ${gameState.selectedUnit} vs ${tile.occupiedByUnitId}`);

                const canAttackResult = combatManager.canAttackTarget(gameState.selectedUnit, tile.occupiedByUnitId);
                if (canAttackResult.success && canAttackResult.value) {
                    const result = combatManager.initiateAttack(gameState.selectedUnit, tile.occupiedByUnitId);
                    if (result.success) {
                        updateGameState({ combatResult: result.value });
                        console.log('Combat result:', result.value);
                        // Reset after combat
                        setTimeout(() => handleUnitDeselect(), 3000);
                    } else {
                        console.log('Combat failed:', result.err);
                    }
                } else {
                    console.log('Cannot attack target:', canAttackResult.err || 'Out of range');
                }
            } else if (gameState.selectedUnit === tile.occupiedByUnitId) {
                // Clicking same unit deselects
                handleUnitDeselect();
            }
        } else if (gameState.gamePhase === 'move' && gameState.selectedUnit && !tile.occupiedByUnitId) {
            // Move unit to empty tile
            const path = [{ x: tile.x, y: tile.y }];
            console.log(`Attempting to move unit ${gameState.selectedUnit} to (${tile.x}, ${tile.y})`);

            const moveResult = movementManager.moveUnit(gameState.selectedUnit, path);
            if (moveResult.success) {
                console.log('Movement successful! Entering attack phase.');
                updateGameState({
                    gamePhase: 'attack',
                    movementRange: new Set()
                });

                // Show attack range from new position
                const attackRangeResult = combatManager.getAttackRange(gameState.selectedUnit);
                if (attackRangeResult.success && attackRangeResult.value) {
                    const rangeSet = new Set<string>();
                    attackRangeResult.value.forEach(coord => {
                        rangeSet.add(`${coord.x}-${coord.y}`);
                    });
                    updateGameState({ attackRange: rangeSet });
                } else {
                    updateGameState({ attackRange: new Set() });
                }
            } else {
                console.log(`Movement failed: ${moveResult.err}`);
            }
        }
    };

    const handleUnitDeselect = () => {
        updateGameState({
            selectedUnit: null,
            targetUnit: null,
            combatResult: null,
            movementRange: new Set(),
            attackRange: new Set(),
            gamePhase: 'select'
        });
    };

    const skipToAttack = () => {
        if (gameState.selectedUnit && gameState.gamePhase === 'move') {
            updateGameState({
                gamePhase: 'attack',
                movementRange: new Set()
            });

            // Show attack range from current position
            const attackRangeResult = combatManager.getAttackRange(gameState.selectedUnit);
            if (attackRangeResult.success && attackRangeResult.value) {
                const rangeSet = new Set<string>();
                attackRangeResult.value.forEach(coord => {
                    rangeSet.add(`${coord.x}-${coord.y}`);
                });
                updateGameState({ attackRange: rangeSet });
            }
        }
    };

    return (
        <div className="ge-sandbox-wrapper">
            <h1>Grid Engine Combat Test</h1>
            <p>{`${config.gridArray.length}x${config.gridArray[0].length} Testing Grid`}</p>

            <div className="debug-ui-container">
                <SandboxControls
                    gamePhase={gameState.gamePhase}
                    selectedUnit={gameState.selectedUnit}
                    targetUnit={gameState.targetUnit}
                    onSkipToAttack={skipToAttack}
                    onUnitDeselect={handleUnitDeselect}
                />

                {gameState.combatResult && (
                    <CombatResultsUI combatResult={gameState.combatResult} />
                )}

                <div className="ge-sandbox-header-container">
                    <GeneralDebugger
                        onUnitDeselect={handleUnitDeselect}
                        selectedTile={gameState.selectedTile}
                        selectedUnit={unitManager.getUnitById(gameState.selectedUnit ?? "").value}
                    />
                </div>
            </div>

            <div className="ge-sandbox-content-container">
                {(() => {
                    const gridResult = gridManager.getGrid();
                    return gridResult.success && gridResult.value ? (
                        <GridComponent
                            grid={gridResult.value}
                            onTileClick={handleTileClick}
                            selectedTile={gameState.selectedTile}
                            movementRangeTiles={gameState.movementRange}
                            attackRangeTiles={gameState.attackRange}
                        />
                    ) : null;
                })()}
            </div>
        </div>
    );
};

export default SandboxGame;