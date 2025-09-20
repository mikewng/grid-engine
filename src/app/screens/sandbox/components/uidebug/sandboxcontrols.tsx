interface SandboxControlsProps {
    gamePhase: 'select' | 'move' | 'attack' | 'enemy_turn' | 'game_over';
    selectedUnit: string | null;
    targetUnit: string | null;
    onSkipToAttack: () => void;
    onUnitDeselect: () => void;
}

const SandboxControls = ({
    gamePhase,
    selectedUnit,
    targetUnit,
    onSkipToAttack,
    onUnitDeselect
}: SandboxControlsProps) => {
    return (
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
                        onClick={onSkipToAttack}
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
                    onClick={onUnitDeselect}
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
    );
};

export default SandboxControls;