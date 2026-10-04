import { WeaponType } from "@/engine/models/items/weaponitem";
import { UnitFaction } from "@/engine/models/units/iunit";
import { CombatOutcome, CombatSideStats } from "@/engine/rules/combatresolver";
import WeaponIcon from "@/app/components/icons/weaponicon";
import { factionClass } from "@/app/components/unit/faction";
import "./combatui.scss"

/** Who's fighting, as the combat panels show them. */
export interface Fighter {
    name: string;
    faction: UnitFaction;
    weaponType: WeaponType | undefined;
    maxHp: number;
}

const TRIANGLE: Record<-1 | 0 | 1, { mark: string; label: string } | null> = {
    [-1]: { mark: "▼", label: "Weapon triangle disadvantage" },
    0: null,
    1: { mark: "▲", label: "Weapon triangle advantage" },
};

export const FighterPlate = ({ fighter, side, align }: { fighter: Fighter; side: CombatSideStats; align: "left" | "right" }) => {
    const triangle = side.canAttack ? TRIANGLE[side.triangle] : null;

    return (
        <div className={`ge-fighter ge-fighter--${align} ${factionClass(fighter.faction)}`}>
            <div className="ge-fighter-badge">
                <WeaponIcon type={fighter.weaponType} />
            </div>
            <div className="ge-fighter-text">
                <div className="ge-fighter-name">{fighter.name}</div>
                <div className="ge-fighter-weapon">
                    {side.weaponName ?? "Unarmed"}
                    {triangle && (
                        <span className={`ge-triangle ge-triangle--${side.triangle > 0 ? "up" : "down"}`} title={triangle.label}>
                            {triangle.mark}
                        </span>
                    )}
                    {side.canAttack && side.effective && <span className="ge-effective">Effective</span>}
                </div>
            </div>
        </div>
    );
};

const HpChange = ({ before, after, max }: { before: number; after: number; max: number }) => {
    const kept = max > 0 ? (after / max) * 100 : 0;
    const lost = max > 0 ? ((before - after) / max) * 100 : 0;

    return (
        <div className="ge-hp-change">
            <div className="ge-hp-change-numbers">
                {before === after ? <strong>{before}</strong> : <><span>{before}</span><span className="ge-arrow">→</span><strong className={after === 0 ? "is-ko" : ""}>{after}</strong></>}
            </div>
            <div className="ge-hp-change-bar">
                <span className="kept" style={{ width: `${kept}%` }} />
                <span className="lost" style={{ width: `${lost}%` }} />
            </div>
        </div>
    );
};

interface CombatUIProps {
    attacker: Fighter;
    defender: Fighter;
    /** A forecast from CombatManager.forecast: every strike lands, no crits. */
    forecast: CombatOutcome;
    /** Show Attack and Back buttons (once a target is picked, not just hovered). */
    onConfirm?: () => void;
    onBack?: () => void;
}

/** The battle forecast shown before committing to an attack. */
const CombatUI: React.FC<CombatUIProps> = ({ attacker, defender, forecast, onConfirm, onBack }) => {
    const sides = [forecast.attacker, forecast.defender];
    const value = (side: CombatSideStats, text: string | number) => (side.canAttack ? text : "–");

    const rows: { label: string; render: (side: CombatSideStats) => React.ReactNode }[] = [
        {
            label: "Dmg",
            render: side => side.canAttack
                ? <>{side.damage}{side.strikes > 1 && <span className="ge-double">×{side.strikes}</span>}</>
                : "–",
        },
        { label: "Hit", render: side => value(side, side.hitRate) },
        { label: "Crit", render: side => value(side, side.critRate) },
    ];

    let verdict: { tone: "good" | "bad" | "neutral"; text: string } | null = null;
    if (forecast.attackerKilled) verdict = { tone: "bad", text: `${attacker.name} could fall in this fight` };
    else if (forecast.defenderKilled) verdict = { tone: "good", text: `Defeats ${defender.name} if the hits land` };
    else if (!forecast.defender.canAttack) verdict = { tone: "neutral", text: `${defender.name} can't counter at this range` };

    return (
        <section className="ge-forecast" aria-label="Battle forecast">
            <header className="ge-forecast-title">Battle Forecast</header>

            <div className="ge-forecast-plates">
                <FighterPlate fighter={attacker} side={forecast.attacker} align="left" />
                <span className="ge-forecast-vs">VS</span>
                <FighterPlate fighter={defender} side={forecast.defender} align="right" />
            </div>

            <div className="ge-forecast-table">
                <div className="ge-forecast-cell is-left">
                    <HpChange before={forecast.attacker.hp} after={forecast.attackerHp} max={attacker.maxHp} />
                </div>
                <div className="ge-forecast-label">HP</div>
                <div className="ge-forecast-cell is-right">
                    <HpChange before={forecast.defender.hp} after={forecast.defenderHp} max={defender.maxHp} />
                </div>

                {rows.map(row => (
                    <div className="ge-forecast-row" key={row.label}>
                        <div className="ge-forecast-cell is-left">{row.render(sides[0])}</div>
                        <div className="ge-forecast-label">{row.label}</div>
                        <div className="ge-forecast-cell is-right">{row.render(sides[1])}</div>
                    </div>
                ))}
            </div>

            {verdict && <div className={`ge-forecast-verdict is-${verdict.tone}`}>{verdict.text}</div>}

            {onConfirm && (
                <div className="ge-forecast-actions">
                    <button className="ge-btn ge-btn--danger" onClick={onConfirm}>Attack <kbd>Enter</kbd></button>
                    {onBack && <button className="ge-btn ge-btn--ghost" onClick={onBack}>Back <kbd>Esc</kbd></button>}
                </div>
            )}

            <p className="ge-forecast-note">HP after assumes every hit lands without a critical.</p>
        </section>
    );
};

export default CombatUI;
