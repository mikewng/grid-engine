import { IUnit, UnitStatusType } from "@/engine/models/units/iunit";
import { ItemCategory } from "@/engine/models/items/item";
import { WeaponItem } from "@/engine/models/items/weaponitem";
import { DisplayStats } from "@/engine/rules/ruleset";
import WeaponIcon from "@/app/components/icons/weaponicon";
import { hpTone } from "./unittoken";
import { factionClass, factionName } from "./faction";
import "./unitstatsui.scss"

interface UnitStatsUIProps {
    unit: IUnit;
    /** Attack, hit, crit and avoid from the ruleset (CombatManager.getDisplayStats). */
    displayStats?: DisplayStats;
    /** A short state label, like "Ready" or "Done". */
    status?: string;
}

const STATUS_NAMES: Record<UnitStatusType, string> = {
    [UnitStatusType.STUN]: "Stunned",
    [UnitStatusType.POISON]: "Poisoned",
    [UnitStatusType.SLOW]: "Slowed",
    [UnitStatusType.HASTE]: "Hasted",
};

const range = (weapon: WeaponItem) =>
    weapon.minRange === weapon.maxRange ? `${weapon.minRange}` : `${weapon.minRange}–${weapon.maxRange}`;

/** Everything about one unit: HP, stats, combat numbers and inventory. */
const UnitStatsUI: React.FC<UnitStatsUIProps> = ({ unit, displayStats, status }) => {
    const { stats } = unit;
    const healthPercent = stats.maxHealth > 0 ? (stats.currentHealth / stats.maxHealth) * 100 : 0;

    const basics: [string, number][] = [
        ["STR", stats.strength],
        ["MAG", stats.magic],
        ["SKL", stats.skill],
        ["SPD", stats.speed],
        ["LCK", stats.luck],
        ["DEF", stats.defense],
        ["RES", stats.resistance],
        ["CON", stats.constitution],
        ["MOV", stats.movement],
    ];

    const combat: [string, number | undefined][] = [
        ["Atk", displayStats?.attack],
        ["Hit", displayStats?.hit],
        ["Crit", displayStats?.crit],
        ["Avo", displayStats?.avoid],
        ["AS", displayStats?.attackSpeed],
    ];

    return (
        <section className={`ge-unit-card ${factionClass(unit.unitFaction)}`} aria-label={`${unit.name} details`}>
            <header className="ge-unit-card-header">
                <div className="ge-unit-card-badge">
                    <WeaponIcon type={unit.equippedWeapon?.weaponType} />
                </div>
                <div className="ge-unit-card-title">
                    <div className="ge-unit-card-name">{unit.name}</div>
                    <div className="ge-unit-card-sub">
                        {unit.unitClass.name} · Lv {stats.level} · <span className="ge-unit-card-faction">{factionName(unit.unitFaction)}</span>
                    </div>
                </div>
                {status && <div className="ge-unit-card-status">{status}</div>}
            </header>

            <div className="ge-unit-card-hp">
                <span className="ge-unit-card-hp-label">HP</span>
                <div className="ge-unit-card-hp-bar">
                    <span className={`hp-${hpTone(stats.currentHealth, stats.maxHealth)}`} style={{ width: `${healthPercent}%` }} />
                </div>
                <span className="ge-unit-card-hp-value">{stats.currentHealth}<small>/{stats.maxHealth}</small></span>
            </div>

            <div className="ge-unit-card-combat">
                {combat.map(([label, value]) => (
                    <div key={label} className="ge-stat-chip">
                        <span>{label}</span>
                        <strong>{value ?? "–"}</strong>
                    </div>
                ))}
            </div>

            <div className="ge-unit-card-stats">
                {basics.map(([label, value]) => (
                    <div key={label} className="ge-stat">
                        <span>{label}</span>
                        <strong>{value}</strong>
                    </div>
                ))}
            </div>

            <div className="ge-unit-card-items">
                {unit.items.length === 0 && <div className="ge-unit-card-empty">No items</div>}
                {unit.items.map((item) => {
                    const weapon = item.category === ItemCategory.WEAPON ? item as WeaponItem : undefined;
                    const equipped = item.id === unit.equippedWeapon?.id;
                    const uses = weapon?.durability;
                    const max = weapon?.maxDurability;

                    return (
                        <div className={`ge-item${equipped ? " is-equipped" : ""}`} key={item.id}>
                            <WeaponIcon type={weapon?.weaponType} className="ge-item-icon" />
                            <div className="ge-item-main">
                                <div className="ge-item-name">
                                    {item.name}
                                    {equipped && <span className="ge-item-equipped" title="Equipped">E</span>}
                                </div>
                                {weapon && (
                                    <div className="ge-item-detail">
                                        Mt {weapon.attack} · Hit {weapon.baseHitRate} · Rng {range(weapon)} · Wt {weapon.weight}
                                    </div>
                                )}
                            </div>
                            {uses !== undefined && max !== undefined && (
                                <div className="ge-item-uses" title={`${uses} of ${max} uses left`}>
                                    {uses}<small>/{max}</small>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {unit.statusEffects.length > 0 && (
                <div className="ge-unit-card-effects">
                    {unit.statusEffects.map(effect => (
                        <span key={effect.type} className="ge-effect-chip">
                            {STATUS_NAMES[effect.type]} · {effect.duration}
                        </span>
                    ))}
                </div>
            )}
        </section>
    );
};

export default UnitStatsUI;
