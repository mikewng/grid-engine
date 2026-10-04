import { CombatSideStats } from "@/engine/rules/combatresolver";
import { hpTone } from "@/app/components/unit/unittoken";
import { factionClass } from "@/app/components/unit/faction";
import { Fighter, FighterPlate } from "./combatui";
import "./combatui.scss"

interface BattleHudProps {
    attacker: Fighter;
    defender: Fighter;
    attackerStats: CombatSideStats;
    defenderStats: CombatSideStats;
    attackerHp: number;
    defenderHp: number;
    /** Whose strike is playing. */
    active: "attacker" | "defender" | null;
    /** Which edge of the map to sit on: the one away from the fight. */
    placement: "top" | "bottom";
}

const Side = ({ fighter, stats, hp, active, align }: { fighter: Fighter; stats: CombatSideStats; hp: number; active: boolean; align: "left" | "right" }) => {
    const percent = fighter.maxHp > 0 ? (hp / fighter.maxHp) * 100 : 0;

    return (
        <div className={`ge-battle-side ${factionClass(fighter.faction)}${active ? " is-active" : ""}`}>
            <FighterPlate fighter={fighter} side={stats} align={align} />
            <div className="ge-battle-hp">
                <span className="ge-battle-hp-value">{hp}</span>
                <div className="ge-battle-hp-bar">
                    <span className={`hp-${hpTone(hp, fighter.maxHp)}`} style={{ width: `${percent}%` }} />
                </div>
            </div>
            <div className="ge-battle-numbers">
                <span>Hit <strong>{stats.canAttack ? stats.hitRate : "–"}</strong></span>
                <span>Dmg <strong>{stats.canAttack ? stats.damage : "–"}</strong></span>
                <span>Crit <strong>{stats.canAttack ? stats.critRate : "–"}</strong></span>
            </div>
        </div>
    );
};

/** The two fighters' HP draining strike by strike while a fight plays out on the map. */
const BattleHud = ({ attacker, defender, attackerStats, defenderStats, attackerHp, defenderHp, active, placement }: BattleHudProps) => (
    <div className={`ge-battle-hud is-${placement}`} role="status" aria-live="polite">
        <Side fighter={attacker} stats={attackerStats} hp={attackerHp} active={active === "attacker"} align="left" />
        <Side fighter={defender} stats={defenderStats} hp={defenderHp} active={active === "defender"} align="right" />
    </div>
);

export default BattleHud;
