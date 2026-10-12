'use client'

import { GameConfig, GameProvider } from '@/app/context/gamecontext';
import { SCENARIOS } from '../../data/game/scenarios';
import SandboxGame from './sandboxgame';

const gameConfig: GameConfig = {
    scenario: SCENARIOS[0].scenario,
    gameMode: 'sandbox',
    difficulty: 'normal',
};

const SandboxWithContext = () => {
    return (
        <GameProvider initialConfig={gameConfig}>
            <SandboxGame />
        </GameProvider>
    );
};

export default SandboxWithContext;
