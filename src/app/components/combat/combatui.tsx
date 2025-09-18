import { IUnit } from "@/app/engine/models/units/iunit"
import "./combatui.scss"

interface CombatStatsUI {
    unit: IUnit;
    combatType: string;
}

interface CombatUIProps {
    initiator: IUnit;
    defender: IUnit;
}

const CombatSubUIComponent: React.FC<CombatStatsUI> = ({ unit, combatType }) => {
    return (
        <div className={"combatui-sub-cpnt-wrapper " + (combatType ?? "")}>
            <div className="unit-icon"></div>
            <div className="unit-name">{unit.name}</div>
            <div className="unit-hp-container">
                {unit.stats.currentHealth}
            </div>
            <div className="unit-weapon-container">{unit.equippedWeapon?.name ?? "NULL"}</div>
            <div className="unit-stats-general-container">
                <div className="stats-container damage">
                    <div className="stats-name">DMG</div>
                    <div className="stats-value">20</div>
                </div>
                <div className="stats-container hitrate">
                    <div className="stats-name">HIT</div>
                    <div className="stats-value">95</div>
                </div>
                <div className="stats-container critrate">
                    <div className="stats-name">CRIT</div>
                    <div className="stats-value">15</div>
                </div>
            </div>
        </div>
    )
}

const CombatUI: React.FC<CombatUIProps> =
    ({
        initiator,
        defender
    }) => {
        return (
            <div className="combatui-cpnt-wrapper">
                <div className="combatui-visual-container">Combat Visual Here</div>
                <div className="combatui-stats-container">
                    <CombatSubUIComponent unit={initiator} combatType="initiator" />
                    <CombatSubUIComponent unit={defender} combatType="defender" />
                </div>
            </div>
        )
    }

export default CombatUI;