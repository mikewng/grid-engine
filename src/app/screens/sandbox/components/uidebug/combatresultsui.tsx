import { CombatResult } from "@/app/engine/managers/interfaces/manager-interfaces";

export interface CombatResultsUIProps {
    combatResult: CombatResult;
}

const CombatResultsUI = ({ combatResult }: CombatResultsUIProps) => {
    return (
        <div
            style={{
                backgroundColor: '#f5f5f5',
                border: '1px solid #ddd',
                padding: '15px',
                margin: '10px 0',
                borderRadius: '4px'
            }}
            className="combatresultsui-cpnt-wrapper"
        >
            <h3>Combat Result</h3>
            <p>Attacker Damage Dealt: {combatResult.attackerDamageDealt}</p>
            <p>Defender Damage Dealt: {combatResult.defenderDamageDealt}</p>
            <p>Attacker Hits: {combatResult.attackerHits}</p>
            <p>Defender Hits: {combatResult.defenderHits}</p>
            <p>Defender Killed: {combatResult.defenderKilled ? 'Yes' : 'No'}</p>
            <p>Attacker Killed: {combatResult.attackerKilled ? 'Yes' : 'No'}</p>
        </div>
    )
}

export default CombatResultsUI;