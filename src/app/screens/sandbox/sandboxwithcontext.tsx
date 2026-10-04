'use client'

import { GameConfig, GameProvider } from '@/app/context/gamecontext';
import { testScenario } from '../../data/game/testscenario';
import SandboxGame from './sandboxgame';

const gameConfig: GameConfig = {
    scenario: testScenario,
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
