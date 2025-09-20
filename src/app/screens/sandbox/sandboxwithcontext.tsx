'use client'

import { GameProvider } from '@/app/context/gamecontext';
import { testEnemy, testKnightUnit, testMageUnit } from '../../data/units/testunit';
import { testGridArr } from '../../data/grid/testgrid';
import SandboxGame from './sandboxgame';

const SandboxWithContext = () => {
    const gameConfig = {
        gridArray: testGridArr,
        units: [testKnightUnit, testMageUnit, testEnemy],
        gameMode: 'sandbox' as const,
        playerFaction: 'player',
        difficulty: 'normal' as const,
    };

    return (
        <GameProvider initialConfig={gameConfig}>
            <SandboxGame />
        </GameProvider>
    );
};

export default SandboxWithContext;