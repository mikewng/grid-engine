'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GameSetup, GameManagers } from '../data/game/gamesetup';
import { IUnit } from '../engine/models/units/iunit';
import { Tile } from '../engine/models/grid/tile';

export interface GameConfig {
    gridArray: string[][];
    units: IUnit[];
    gameMode?: 'sandbox' | 'campaign' | 'skirmish';
    playerFaction?: string;
    difficulty?: 'easy' | 'normal' | 'hard';
}

export interface GameState {
    selectedTile: Tile | null;
    selectedUnit: string | null;
    targetUnit: string | null;
    gamePhase: 'select' | 'move' | 'attack' | 'enemy_turn' | 'game_over';
    currentTurn: number;
    movementRange: Set<string>;
    attackRange: Set<string>;
    combatResult: any | null;
}

export interface GameContextType {
    // Configuration
    config: GameConfig | null;

    // Managers
    managers: GameManagers | null;

    // Game State
    gameState: GameState;

    // Actions
    initializeGame: (config: GameConfig) => void;
    resetGame: () => void;
    updateGameState: (updates: Partial<GameState>) => void;

    // Convenience getters
    isGameInitialized: boolean;
}

const defaultGameState: GameState = {
    selectedTile: null,
    selectedUnit: null,
    targetUnit: null,
    gamePhase: 'select',
    currentTurn: 1,
    movementRange: new Set(),
    attackRange: new Set(),
    combatResult: null,
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export interface GameProviderProps {
    children: ReactNode;
    initialConfig?: GameConfig;
}

export const GameProvider: React.FC<GameProviderProps> = ({ children, initialConfig }) => {

    const [config, setConfig] = useState<GameConfig | null>(initialConfig || null);
    const [managers, setManagers] = useState<GameManagers | null>(null);
    const [gameState, setGameState] = useState<GameState>(defaultGameState);


    const initializeGame = (newConfig: GameConfig) => {
        console.log('initializeGame called with config:', newConfig);
        try {
            const gameManagers = GameSetup.initializeManagers(newConfig.gridArray, newConfig.units);
            setConfig(newConfig);
            setManagers(gameManagers);
            setGameState(defaultGameState);
        } catch (error) {
            console.error('Failed to initialize game:', error);
            throw error;
        }
    };

    const resetGame = () => {
        if (config) {
            initializeGame(config);
        }
    };

    const updateGameState = (updates: Partial<GameState>) => {
        setGameState(prev => ({ ...prev, ...updates }));
    };

    // Initialize with initial config if provided
    useEffect(() => {
        if (initialConfig && !managers) {
            initializeGame(initialConfig);
        }
    }, [initialConfig, managers]);

    const contextValue: GameContextType = {
        config,
        managers,
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