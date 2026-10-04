'use client'

import React, { createContext, useCallback, useContext, useState, useSyncExternalStore, ReactNode } from 'react';
import { createGame, GameManagers, Scenario } from '@/engine/gamesetup';
import { Coordinate } from '@/engine/models/grid/coordinate';

export interface GameConfig {
    scenario: Scenario;
    gameMode?: 'sandbox' | 'campaign' | 'skirmish';
    difficulty?: 'easy' | 'normal' | 'hard';
}

/**
 * UI-only state: what the player is pointing at and which step of a unit's
 * action they're on. Game state (turns, positions, HP) lives in the engine.
 *   select: pick a unit
 *   move:   pick where it goes
 *   action: choose Attack, Wait or Cancel
 *   target: pick who to attack, then confirm
 */
export type UiPhase = 'select' | 'move' | 'action' | 'target';

export interface GameState {
    selectedTile: Coordinate | null;
    hoveredTile: Coordinate | null;
    selectedUnit: string | null;
    gamePhase: UiPhase;
}

export interface GameContextType {
    config: GameConfig | null;
    managers: GameManagers | null;
    /** Changes whenever the engine changes, so components re-render. */
    version: number;
    gameState: GameState;
    initializeGame: (config: GameConfig) => void;
    resetGame: () => void;
    updateGameState: (updates: Partial<GameState>) => void;
    isGameInitialized: boolean;
}

const defaultGameState: GameState = {
    selectedTile: null,
    hoveredTile: null,
    selectedUnit: null,
    gamePhase: 'select',
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export interface GameProviderProps {
    children: ReactNode;
    initialConfig?: GameConfig;
}

const noSubscription = () => () => { };

export const GameProvider: React.FC<GameProviderProps> = ({ children, initialConfig }) => {
    const [config, setConfig] = useState<GameConfig | null>(initialConfig ?? null);
    const [managers, setManagers] = useState<GameManagers | null>(() => initialConfig ? createGame(initialConfig.scenario) : null);
    const [gameState, setGameState] = useState<GameState>(defaultGameState);

    const subscribe = managers?.gameManager.subscribe ?? noSubscription;
    const getVersion = useCallback(() => managers?.gameManager.getVersion() ?? 0, [managers]);
    const version = useSyncExternalStore(subscribe, getVersion, getVersion);

    // Each call builds fresh units from the scenario, so a reset really starts over
    const initializeGame = useCallback((newConfig: GameConfig) => {
        setConfig(newConfig);
        setManagers(createGame(newConfig.scenario));
        setGameState(defaultGameState);
    }, []);

    const resetGame = useCallback(() => {
        if (config) initializeGame(config);
    }, [config, initializeGame]);

    const updateGameState = useCallback((updates: Partial<GameState>) => {
        setGameState(prev => ({ ...prev, ...updates }));
    }, []);

    const contextValue: GameContextType = {
        config,
        managers,
        version,
        gameState,
        initializeGame,
        resetGame,
        updateGameState,
        isGameInitialized: !!(config && managers),
    };

    return (
        <GameContext.Provider value={contextValue}>
            {children}
        </GameContext.Provider>
    );
};

export const useGame = (): GameContextType => {
    const context = useContext(GameContext);
    if (context === undefined) {
        throw new Error('useGame must be used within a GameProvider');
    }
    return context;
};

// Convenience hooks for specific parts of the game state
export const useGameManagers = () => {
    const { managers, isGameInitialized } = useGame();
    if (!isGameInitialized || !managers) {
        throw new Error('Game is not initialized');
    }
    return managers;
};

export const useGameState = () => {
    const { gameState, updateGameState } = useGame();
    return { gameState, updateGameState };
};

export const useGameConfig = () => {
    const { config } = useGame();
    return config;
};
