import { IUnit, UnitStats } from "@/app/engine/models/units/iunit";
import "./unitstatsui.scss"

interface UnitBasicStatsUIProps {
    unitStats: UnitStats;
}

const UnitBasicStatsUI: React.FC<UnitBasicStatsUIProps> =
    ({
        unitStats
    }) => {
        return (
            <div className="unitbasicstatsui-cpnt-wrapper">
                <div className="ui-subsection">
                    <div className="basic-stat-container str">
                        <div className="basic-stat-name">STR</div>
                        <div className="basic-stat-value">{unitStats.strength}</div>
                    </div>
                    <div className="basic-stat-container mag">
                        <div className="basic-stat-name">MAG</div>
                        <div className="basic-stat-value">{unitStats.magic}</div>
                    </div>
                    <div className="basic-stat-container spd">
                        <div className="basic-stat-name">SPD</div>
                        <div className="basic-stat-value">{unitStats.speed}</div>
                    </div>
                    <div className="basic-stat-container skill">
                        <div className="basic-stat-name">SKILL</div>
                        <div className="basic-stat-value">{unitStats.skill}</div>
                    </div>
                </div>
                <div className="ui-subsection">
                    <div className="basic-stat-container mov">
                        <div className="basic-stat-name">MOV</div>
                        <div className="basic-stat-value">{unitStats.movement}</div>
                    </div>
                    <div className="basic-stat-container lck">
                        <div className="basic-stat-name">LCK</div>
                        <div className="basic-stat-value">{unitStats.luck}</div>
                    </div>
                    <div className="basic-stat-container def">
                        <div className="basic-stat-name">DEF</div>
                        <div className="basic-stat-value">{unitStats.defense}</div>
                    </div>
                    <div className="basic-stat-container res">
                        <div className="basic-stat-name">RES</div>
                        <div className="basic-stat-value">{unitStats.resistance}</div>
                    </div>
                </div>
            </div>
        )
    }

interface UnitStatsUIProps {
    unit: IUnit
}

const UnitStatsUI: React.FC<UnitStatsUIProps> =
    ({
        unit
    }) => {
        return (
            <div className="unitstatsui-cpnt-wrapper">
                <div className="unitstatsui-header-container">
                    <div className="unit-header-name">
                        {unit.name}
                    </div>
                    <div className="unit-header-class">
                        {unit.unitClass.name}
                    </div>
                    <div className="unit-header-level">
                        {"LV " + unit.stats.level}
                    </div>
                </div>
                <div className="unitstatsui-body-container">
                    <div className="unitstatsui-basic-stats-container">
                        <div className="unit-image-container">Icon</div>
                        <div className="unit-basic-stats-container">
                            <UnitBasicStatsUI unitStats={unit.stats} />
                        </div>
                    </div>
                    <div className="unitstatsui-inset-container">
                        <div className="unitstatsui-battle-stats-container">
                            <div className="stats-health-container">{`HP ${unit.stats.currentHealth}/${unit.stats.maxHealth}`}</div>
                            <div className="stats-combat-container">
                                <div className="stats-atk">ATK</div>
                                <div className="stats-crit">CRIT</div>
                                <div className="stats-hit">HIT</div>
                                <div className="stats-avo">AVO</div>
                            </div>
                        </div>
                        <div className="unitstatsui-inventory-container">
                            {
                                unit.items.map((item) => {
                                    return (
                                        <div className="inv-item">
                                            {item.name}
                                        </div>
                                    )
                                })
                            }
                        </div>
                    </div>
                </div>
            </div>
        )
    }

export default UnitStatsUI;