import { CombatOutcome } from "@/engine/rules/combatresolver";

export interface CombatResultsUIProps {
    attackerName: string;
    defenderName: string;
    outcome: CombatOutcome;
}

/** The strikes of the last fight, in order. */
const CombatResultsUI = ({ attackerName, defenderName, outcome }: CombatResultsUIProps) => {
    const name = (by: "attacker" | "defender") => (by === "attacker" ? attackerName : defenderName);
    const other = (by: "attacker" | "defender") => (by === "attacker" ? defenderName : attackerName);

    return (
        <div className="combatresultsui-cpnt-wrapper">
            <div className="ge-header">Last fight: {attackerName} vs {defenderName}</div>
            <ol>
                {outcome.strikes.map((strike, i) => (
                    <li key={i}>
                        {strike.hit
                            ? `${name(strike.by)} ${strike.crit ? "crits" : "hits"} for ${strike.damage}`
                            : `${name(strike.by)} misses`}
                        {strike.weaponBroke && ` (${name(strike.by)}'s weapon breaks)`}
                        {strike.hit && (strike.by === "attacker" ? strike.defenderHp : strike.attackerHp) === 0 && ` — ${other(strike.by)} is defeated`}
                    </li>
                ))}
            </ol>
            <p>{attackerName}: {outcome.attackerHp} HP · {defenderName}: {outcome.defenderHp} HP</p>
        </div>
    )
}

export default CombatResultsUI;
