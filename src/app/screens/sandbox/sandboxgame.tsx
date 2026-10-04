'use client'
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { GameConfig, GameState, useGame } from '@/app/context/gamecontext';
import { GameManagers } from '@/engine/gamesetup';
import { Tile } from '@/engine/models/grid/tile';
import { Coordinate, coordinateKey } from '@/engine/models/grid/coordinate';
import { GameCommand, GameEvent } from '@/engine/models/game/gamestate';
import { IUnit, UnitFaction } from '@/engine/models/units/iunit';
import GridComponent from '@/app/components/grid/gridcomponent';
import UnitToken from '@/app/components/unit/unittoken';
import UnitStatsUI from '@/app/components/unit/unitstatsui';
import CombatUI, { Fighter } from '@/app/components/combat/combatui';
import BattleHud from '@/app/components/combat/battlehud';
import { FloatingTexts, MapCursor, PathArrow } from '@/app/components/map/mapoverlays';
import { factionName } from '@/app/components/unit/faction';
import GeneralDebugger from './components/uidebug/generaldebugger';
import CombatResultsUI from './components/uidebug/combatresultsui';
import TurnPanel from './components/turnpanel';
import TerrainInfo from './components/terraininfo';
import BattleLog from './components/battlelog';
import { ActionMenu, GameOver, PhaseBanner, SkipButton, Toast } from './components/mapwindows';
import { BannerInfo, PlaybackContext, snapshotUnits, usePlayback } from './useplayback';
import { threatOf } from './threat';
import './sandbox.scss';

const EMPTY = new Set<string>();
const keys = (tiles: Coordinate[]) => new Set(tiles.map(coordinateKey));
const samePlace = (a: Coordinate, b: Coordinate) => a.x === b.x && a.y === b.y;

const TONES: Record<UnitFaction, BannerInfo["tone"]> = {
    [UnitFaction.P1]: "player",
    [UnitFaction.P2]: "ally",
    [UnitFaction.ENEMY]: "enemy",
    [UnitFaction.NEUTRAL]: "neutral",
};

function playbackContext({ unitManager, gameManager }: GameManagers): PlaybackContext {
    return {
        banner: (faction, turn) => ({ title: `${factionName(faction)} Phase`, subtitle: `Turn ${turn}`, tone: TONES[faction] }),
        isAi: (unitId) => {
            const unit = unitManager.getUnitById(unitId).value;
            return !!unit && gameManager.controllerOf(unit.unitFaction) === "ai";
        },
    };
}

const fighterOf = (unit: IUnit): Fighter => ({
    name: unit.name,
    faction: unit.unitFaction,
    weaponType: unit.equippedWeapon?.weaponType,
    maxHp: unit.stats.maxHealth,
});

interface SandboxViewProps {
    config: GameConfig;
    managers: GameManagers;
    gameState: GameState;
    updateGameState: (updates: Partial<GameState>) => void;
    resetGame: () => void;
}

const SandboxView = ({ config, managers, gameState, updateGameState, resetGame }: SandboxViewProps) => {
    const [notice, setNotice] = useState<{ id: number; text: string } | null>(null);
    const [targetId, setTargetId] = useState<string | null>(null);
    const [inspectedId, setInspectedId] = useState<string | null>(null);
    const [dangerZone, setDangerZone] = useState(false);
    const [autoEnd, setAutoEnd] = useState(true);
    const [fast, setFast] = useState(false);

    const playback = usePlayback(fast ? 0.45 : 1);
    const { play, skip, playing } = playback;

    const { gridManager, unitManager, movementManager, combatManager, gameManager, ruleset } = managers;
    const grid = gridManager.getGrid().value!;
    const turn = gameManager.getState();
    const history = gameManager.getHistory();
    const allUnits = unitManager.getAllUnits().value!;
    const isHumanTurn = !turn.isOver && gameManager.controllerOf(turn.activeFaction) === 'human';
    const canAct = isHumanTurn && !playing;
    const phase = gameState.gamePhase;

    const unitById = (id: string | null) => (id ? unitManager.getUnitById(id).value : undefined);
    const unitAt = (tile: Coordinate) => unitManager.getUnitAtPosition(tile.x, tile.y).value;
    const isReady = (unit: IUnit) => unit.isAlive && unit.unitFaction === turn.activeFaction && !unit.hasActed;

    const selectedUnit = unitById(gameState.selectedUnit);
    const hovered = gameState.hoveredTile;
    const hoveredUnit = hovered ? unitAt(hovered) : undefined;
    // A unit clicked on to keep its reach on screen
    const clickedUnit = unitById(inspectedId);
    const pinnedUnit = clickedUnit?.isAlive ? clickedUnit : undefined;
    const activeUnits = allUnits.filter(unit => unit.isAlive && unit.unitFaction === turn.activeFaction);
    const readyCount = activeUnits.filter(unit => !unit.hasActed).length;

    // The side the danger zone is drawn for: whoever is playing at this screen
    const viewer = isHumanTurn
        ? turn.activeFaction
        : config.scenario.turnOrder.find(faction => gameManager.controllerOf(faction) === 'human') ?? UnitFaction.P1;

    // --- Overlays, all worked out by the engine ---
    let moveTiles = EMPTY;
    let attackTiles = EMPTY;
    let targetTiles = EMPTY;
    let path: Coordinate[] = [];
    let targets: IUnit[] = [];

    if (!playing && !turn.isOver) {
        if (selectedUnit && phase === 'move') {
            const threat = threatOf(managers, selectedUnit.id);
            moveTiles = threat.move;
            attackTiles = threat.attackFringe;

            if (hovered && moveTiles.has(coordinateKey(hovered))) {
                path = [selectedUnit.position, ...(movementManager.findPath(selectedUnit.id, hovered).value ?? [])];
            }
        } else if (selectedUnit && (phase === 'action' || phase === 'target')) {
            targets = combatManager.getAttackableTargets(selectedUnit.id).value ?? [];
            attackTiles = keys(combatManager.getAttackRange(selectedUnit.id).value ?? []);
            targetTiles = keys(targets.map(target => target.position));
        } else if (phase === 'select') {
            // Preview a unit's reach: the one clicked on, or else the one under the pointer.
            // Units that are done for the turn aren't going anywhere, so they don't get one.
            const preview = pinnedUnit ?? hoveredUnit;

            if (preview && !(preview.unitFaction === turn.activeFaction && preview.hasActed)) {
                const threat = threatOf(managers, preview.id);
                moveTiles = threat.move;
                attackTiles = threat.attackFringe;
            }
        }
    }

    const dangerTiles = new Set<string>();

    if (dangerZone) {
        for (const unit of allUnits) {
            if (unit.isAlive && ruleset.factions.areHostile(viewer, unit.unitFaction)) {
                for (const key of threatOf(managers, unit.id).attackable) dangerTiles.add(key);
            }
        }
    }

    // --- Forecast: the hovered target, or the one picked ---
    const hoveredTarget = hovered ? targets.find(target => samePlace(target.position, hovered)) : undefined;
    const pickedTarget = phase === 'target' ? targets.find(target => target.id === targetId) : undefined;
    const forecastTarget = hoveredTarget ?? pickedTarget;
    const forecast = selectedUnit && forecastTarget ? combatManager.forecast(selectedUnit.id, forecastTarget.id).value : undefined;
    const forecastIsPicked = !!pickedTarget && forecastTarget?.id === pickedTarget.id;

    // --- Sending commands ---
    const showNotice = (text: string) => setNotice({ id: Date.now(), text });

    /** Send a command to the engine and play back what happened. Shows why if it's refused. */
    const run = (command: GameCommand): boolean => {
        const before = snapshotUnits(allUnits);
        const result = gameManager.execute(command);

        if (!result.success) {
            showNotice(result.err);
            return false;
        }

        setNotice(null);
        if (result.value.length > 0) void play(result.value, before, playbackContext(managers));
        return true;
    };

    const deselect = () => {
        setTargetId(null);
        updateGameState({ selectedUnit: null, gamePhase: 'select' });
    };

    const select = (unit: IUnit) => {
        setInspectedId(null);
        setTargetId(null);
        updateGameState({ selectedUnit: unit.id, gamePhase: unit.hasMoved ? 'action' : 'move' });
    };

    const attack = (target: IUnit) => {
        if (selectedUnit && run({ type: 'attack', unitId: selectedUnit.id, targetId: target.id })) deselect();
    };

    const wait = () => {
        if (selectedUnit && run({ type: 'wait', unitId: selectedUnit.id })) deselect();
    };

    const openAttack = () => {
        if (targets.length === 0) return;
        setTargetId(targets[0].id);
        updateGameState({ gamePhase: 'target' });
    };

    /** Step back: target → menu → undo the move → deselect. */
    const back = () => {
        if (playing) return skip();

        if (phase === 'target') {
            setTargetId(null);
            updateGameState({ gamePhase: 'action' });
        } else if (phase === 'action' && selectedUnit) {
            if (run({ type: 'undoMove', unitId: selectedUnit.id })) updateGameState({ gamePhase: 'move' });
            else deselect();
        } else if (phase === 'move') {
            deselect();
        } else {
            setInspectedId(null);
        }
    };

    const endTurn = () => {
        if (!canAct) return;
        deselect();
        setInspectedId(null);
        run({ type: 'endTurn' });
    };

    const restart = () => {
        skip();
        setNotice(null);
        setTargetId(null);
        setInspectedId(null);
        resetGame();
    };

    const handleTileClick = (tile: Tile) => {
        if (playing) return skip();

        updateGameState({ selectedTile: { x: tile.x, y: tile.y } });
        if (!isHumanTurn) return;

        const clicked = unitAt(tile);

        if (phase === 'select' || !selectedUnit) {
            if (clicked && isReady(clicked)) select(clicked);
            else setInspectedId(clicked && clicked.id !== inspectedId ? clicked.id : null);
            return;
        }

        if (phase === 'move') {
            if (moveTiles.has(coordinateKey(tile))) {
                const moved = samePlace(tile, selectedUnit.position)
                    ? run({ type: 'move', unitId: selectedUnit.id, path: [] })
                    : run({ type: 'moveTo', unitId: selectedUnit.id, destination: { x: tile.x, y: tile.y } });

                if (moved) updateGameState({ gamePhase: 'action' });
            } else if (clicked && isReady(clicked) && clicked.id !== selectedUnit.id) {
                select(clicked);
            } else {
                deselect();
            }
            return;
        }

        // Action or target step: the first click on an enemy picks it, the second attacks
        const target = targets.find(unit => samePlace(unit.position, tile));

        if (target && phase === 'target' && targetId === target.id) {
            attack(target);
        } else if (target) {
            setTargetId(target.id);
            updateGameState({ gamePhase: 'target' });
        } else if (phase === 'target') {
            setTargetId(null);
            updateGameState({ gamePhase: 'action' });
        }
    };

    // --- Keyboard and timers. Handlers read the latest render through refs. ---
    const keyHandler = useRef<(event: KeyboardEvent) => void>(() => { });
    const endTurnRef = useRef(endTurn);

    useLayoutEffect(() => {
        endTurnRef.current = endTurn;
        keyHandler.current = (event) => {
            if (event.ctrlKey || event.metaKey || event.altKey) return;

            const target = event.target as HTMLElement | null;
            if (target?.closest('input, select, textarea')) return;
            const onControl = !!target?.closest('button, [role="button"], summary');

            switch (event.key) {
                case 'Escape':
                    back();
                    break;
                case ' ':
                    if (playing && !onControl) {
                        event.preventDefault();
                        skip();
                    }
                    break;
                case 'Enter':
                    if (!onControl && pickedTarget) attack(pickedTarget);
                    break;
                case 'e':
                case 'E':
                    endTurn();
                    break;
                case 'd':
                case 'D':
                    setDangerZone(on => !on);
                    break;
                case 'a':
                case 'A':
                    if (canAct && phase === 'action') openAttack();
                    break;
                case 'w':
                case 'W':
                    if (canAct && (phase === 'action' || phase === 'target')) wait();
                    break;
            }
        };
    });

    useEffect(() => {
        const listener = (event: KeyboardEvent) => keyHandler.current(event);
        window.addEventListener('keydown', listener);
        return () => window.removeEventListener('keydown', listener);
    }, []);

    // Announce the phase whenever a new game starts
    useEffect(() => {
        const state = managers.gameManager.getState();
        if (state.isOver) return;

        const opening: GameEvent[] = [{ type: 'turnStarted', turn: state.turn, faction: state.activeFaction }];
        void play(opening, snapshotUnits(managers.unitManager.getAllUnits().value!), playbackContext(managers));

        return skip;
    }, [managers, play, skip]);

    // End the turn on its own once every unit has acted
    const shouldAutoEnd = autoEnd && canAct && readyCount === 0;

    useEffect(() => {
        if (!shouldAutoEnd) return;
        const timer = setTimeout(() => endTurnRef.current(), 500);
        return () => clearTimeout(timer);
    }, [shouldAutoEnd]);

    useEffect(() => {
        if (!notice) return;
        const timer = setTimeout(() => setNotice(null), 2800);
        return () => clearTimeout(timer);
    }, [notice]);

    // --- Drawing ---
    const { visuals, motion } = playback;

    const tokens = allUnits.map(unit => {
        const visual = visuals?.[unit.id];

        return {
            unit,
            x: visual?.x ?? unit.position.x,
            y: visual?.y ?? unit.position.y,
            hp: visual?.hp ?? unit.stats.currentHealth,
            alive: visual ? visual.alive : unit.isAlive,
            acted: visual ? visual.acted : unit.hasActed,
            dying: visual?.dying ?? false,
        };
    }).filter(token => token.alive || token.dying);

    const occupants = new Map(tokens.map(token => [
        coordinateKey(token),
        `${token.unit.name}, ${factionName(token.unit.unitFaction)}, ${token.hp} of ${token.unit.stats.maxHealth} HP`,
    ]));

    const cursorTile = playing ? playback.focus : hovered;
    const battle = playback.battle;
    const battleAttacker = battle ? unitById(battle.attackerId) : undefined;
    const battleDefender = battle ? unitById(battle.defenderId) : undefined;

    const inspected = hoveredUnit ?? pinnedUnit ?? selectedUnit;
    const inspectedStatus = inspected && inspected.unitFaction === turn.activeFaction && inspected.isAlive
        ? (inspected.hasActed ? 'Done' : inspected.hasMoved ? 'Moved' : 'Ready')
        : undefined;

    const terrainTile = hovered ?? selectedUnit?.position;
    const terrain = terrainTile ? gridManager.getTerrainAt(terrainTile.x, terrainTile.y).value : undefined;

    const lastCombat = [...history].reverse().find((event): event is Extract<GameEvent, { type: "combat" }> => event.type === "combat");

    const victory = turn.winner !== null && gameManager.controllerOf(turn.winner) === 'human';

    let hint: string;
    if (turn.isOver) hint = victory ? 'Victory! Start again whenever you like.' : 'Defeat. Try again?';
    else if (playing) hint = isHumanTurn ? 'Press Space or click the map to skip ahead.' : `${factionName(turn.activeFaction)} phase. Press Space to skip ahead.`;
    else if (!isHumanTurn) hint = `${factionName(turn.activeFaction)} phase.`;
    else if (phase === 'move' && selectedUnit) hint = `Choose where ${selectedUnit.name} moves. Click its own tile to stay put.`;
    else if (phase === 'action') hint = targets.length > 0 ? 'Attack, Wait, or Cancel to take the move back.' : 'No enemies in reach. Wait, or Cancel to take the move back.';
    else if (phase === 'target') hint = 'Pick a target, then click it again (or press Enter) to attack.';
    else if (readyCount > 0) hint = 'Choose a unit to command. Hover any unit to see how far it reaches.';
    else hint = 'Everyone has acted. End the turn when ready.';

    return (
        <div className="ge-sandbox">
            <header className="ge-sandbox-header">
                <div className="ge-brand">
                    <span className="ge-brand-mark" aria-hidden="true" />
                    <div>
                        <h1>Grid Engine</h1>
                        <p>Sandbox skirmish · {grid.width}×{grid.height} map{config.scenario.seed !== undefined && ` · seed ${config.scenario.seed}`}</p>
                    </div>
                </div>
                <div className="ge-legend" aria-label="Map legend">
                    <span><i className="sw-move" />Move</span>
                    <span><i className="sw-attack" />Attack range</span>
                    <span><i className="sw-danger" />Danger zone</span>
                </div>
            </header>

            <div className="ge-sandbox-layout">
                <main className="ge-sandbox-map">
                    <GridComponent
                        grid={grid}
                        onTileClick={handleTileClick}
                        onTileHover={(tile) => updateGameState({ hoveredTile: tile && { x: tile.x, y: tile.y } })}
                        onCancel={back}
                        movementRangeTiles={moveTiles}
                        attackRangeTiles={attackTiles}
                        dangerTiles={dangerTiles}
                        targetTiles={targetTiles}
                        occupants={occupants}
                    >
                        <PathArrow cols={grid.width} rows={grid.height} points={path} />

                        {tokens.map(token => (
                            <UnitToken
                                key={token.unit.id}
                                x={token.x}
                                y={token.y}
                                name={token.unit.name}
                                faction={token.unit.unitFaction}
                                weaponType={token.unit.equippedWeapon?.weaponType}
                                hp={token.hp}
                                maxHp={token.unit.stats.maxHealth}
                                acted={token.acted}
                                ready={canAct && token.unit.unitFaction === turn.activeFaction && !token.acted}
                                selected={!playing && token.unit.id === selectedUnit?.id}
                                lunge={motion.lunge?.unitId === token.unit.id ? motion.lunge : undefined}
                                hurt={motion.hurt?.unitId === token.unit.id ? motion.hurt.kind : undefined}
                                dying={token.dying}
                            />
                        ))}

                        {cursorTile && <MapCursor tile={cursorTile} tone={hoveredTarget && !playing ? 'attack' : 'default'} />}

                        <FloatingTexts items={playback.floats} />

                        {canAct && selectedUnit && phase === 'action' && (
                            <ActionMenu
                                tile={selectedUnit.position}
                                cols={grid.width}
                                rows={grid.height}
                                canAttack={targets.length > 0}
                                onAttack={openAttack}
                                onWait={wait}
                                onCancel={back}
                            />
                        )}

                        {battle && battleAttacker && battleDefender && (
                            <BattleHud
                                attacker={fighterOf(battleAttacker)}
                                defender={fighterOf(battleDefender)}
                                attackerStats={battle.outcome.attacker}
                                defenderStats={battle.outcome.defender}
                                attackerHp={battle.attackerHp}
                                defenderHp={battle.defenderHp}
                                active={battle.active}
                                placement={battleAttacker.position.y + battleDefender.position.y > grid.height ? 'top' : 'bottom'}
                            />
                        )}

                        {playback.banner && <PhaseBanner banner={playback.banner} />}
                        {playing && <SkipButton onSkip={skip} />}
                        {notice && <Toast key={notice.id} text={notice.text} />}
                        {turn.isOver && !playing && <GameOver victory={victory} turn={turn.turn} onRestart={restart} />}
                    </GridComponent>
                </main>

                <aside className="ge-sandbox-side">
                    <TurnPanel
                        turn={turn}
                        isHumanTurn={isHumanTurn}
                        playing={playing}
                        readyCount={readyCount}
                        unitCount={activeUnits.length}
                        hint={hint}
                        dangerZone={dangerZone}
                        autoEnd={autoEnd}
                        fast={fast}
                        onEndTurn={endTurn}
                        onReset={restart}
                        onToggleDangerZone={() => setDangerZone(on => !on)}
                        onToggleAutoEnd={() => setAutoEnd(on => !on)}
                        onToggleFast={() => setFast(on => !on)}
                    />

                    {forecast && selectedUnit && forecastTarget && !playing && (
                        <CombatUI
                            attacker={fighterOf(selectedUnit)}
                            defender={fighterOf(forecastTarget)}
                            forecast={forecast}
                            onConfirm={forecastIsPicked ? () => attack(forecastTarget) : undefined}
                            onBack={back}
                        />
                    )}

                    {inspected && (
                        <UnitStatsUI unit={inspected} displayStats={combatManager.getDisplayStats(inspected.id).value} status={inspectedStatus} />
                    )}

                    {terrainTile && terrain && (
                        <TerrainInfo tile={terrainTile} terrain={terrain} highlight={(selectedUnit ?? hoveredUnit)?.unitClass.movementType} />
                    )}

                    <BattleLog
                        events={history}
                        unitOf={(id) => {
                            const unit = unitById(id);
                            return unit && { name: unit.name, faction: unit.unitFaction };
                        }}
                    />

                    <details className="ge-panel ge-help">
                        <summary>How to play</summary>
                        <ol>
                            <li>Click one of your units. Blue tiles show where it can move, red where it can strike.</li>
                            <li>Click a blue tile to move there. The arrow shows the route.</li>
                            <li>Choose <b>Attack</b>, then click an enemy to see the forecast. Click again or press <kbd>Enter</kbd> to strike.</li>
                            <li><b>Cancel</b> (or right-click) takes a move back until the unit acts.</li>
                            <li>Turn on the <b>Danger Zone</b> to see every tile the enemy can reach.</li>
                        </ol>
                    </details>

                    <details className="ge-panel ge-debug">
                        <summary>Developer tools</summary>
                        <GeneralDebugger
                            onUnitDeselect={deselect}
                            selectedTile={gameState.selectedTile}
                            terrain={gameState.selectedTile ? gridManager.getTerrainAt(gameState.selectedTile.x, gameState.selectedTile.y).value : undefined}
                            tileUnit={gameState.selectedTile ? unitAt(gameState.selectedTile) : undefined}
                            selectedUnit={selectedUnit}
                        />
                        {lastCombat && (
                            <CombatResultsUI
                                attackerName={unitById(lastCombat.attackerId)?.name ?? lastCombat.attackerId}
                                defenderName={unitById(lastCombat.defenderId)?.name ?? lastCombat.defenderId}
                                outcome={lastCombat.outcome}
                            />
                        )}
                    </details>
                </aside>
            </div>
        </div>
    );
};

const SandboxGame = () => {
    const { config, isGameInitialized, managers, gameState, updateGameState, resetGame } = useGame();

    if (!isGameInitialized || !config || !managers) {
        return <div className="ge-loading">Loading game…</div>;
    }

    return (
        <SandboxView
            config={config}
            managers={managers}
            gameState={gameState}
            updateGameState={updateGameState}
            resetGame={resetGame}
        />
    );
};

export default SandboxGame;
