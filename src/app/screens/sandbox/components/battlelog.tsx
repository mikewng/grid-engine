import { ReactNode } from "react";
import { GameEvent } from "@/engine/models/game/gamestate";
import { UnitFaction } from "@/engine/models/units/iunit";
import { factionClass, factionName } from "@/app/components/unit/faction";

export interface LoggedUnit {
    name: string;
    faction: UnitFaction;
}

interface BattleLogProps {
    events: readonly GameEvent[];
    unitOf: (unitId: string) => LoggedUnit | undefined;
    /** How many of the most recent events to show. */
    limit?: number;
}

function describe(event: GameEvent, unitOf: BattleLogProps["unitOf"]): ReactNode {
    const name = (unitId: string) => {
        const unit = unitOf(unitId);
        return <b className={unit ? factionClass(unit.faction) : undefined}>{unit?.name ?? unitId}</b>;
    };

    switch (event.type) {
        case "turnStarted":
            return null;
        case "unitMoved": {
            const end = event.path.at(-1);
            return end ? <>{name(event.unitId)} moved to ({end.x}, {end.y})</> : <>{name(event.unitId)} held position</>;
        }
        case "moveUndone":
            return <>{name(event.unitId)}&apos;s move was taken back</>;
        case "combat": {
            const { outcome } = event;
            const dealt = outcome.defender.hp - outcome.defenderHp;
            const taken = outcome.attacker.hp - outcome.attackerHp;
            const crits = outcome.strikes.filter(strike => strike.crit).length;

            return (
                <>
                    {name(event.attackerId)} attacked {name(event.defenderId)}: dealt {dealt}, took {taken}
                    {crits > 0 && <span className="ge-log-crit"> · critical!</span>}
                </>
            );
        }
        case "unitWaited":
            return <>{name(event.unitId)} waited</>;
        case "statusDamage":
            return <>{name(event.unitId)} took {event.damage} poison damage</>;
        case "unitDefeated":
            return <span className="ge-log-defeat">{name(event.unitId)} was defeated</span>;
        case "gameOver":
            return <span className="ge-log-end">{event.winner !== null ? `${factionName(event.winner)} wins` : "Nobody is left standing"}</span>;
    }
}

/** What has happened so far, newest first, grouped by phase. */
const BattleLog = ({ events, unitOf, limit = 40 }: BattleLogProps) => {
    const recent = events.slice(-limit).map((event, i) => ({ event, index: events.length - Math.min(limit, events.length) + i })).reverse();

    return (
        <section className="ge-panel ge-log" aria-label="Battle log">
            <div className="ge-panel-title">Battle Log</div>
            <ol>
                {recent.map(({ event, index }) => event.type === "turnStarted" ? (
                    <li key={index} className={`ge-log-phase ${factionClass(event.faction)}`}>
                        Turn {event.turn} · {factionName(event.faction)} Phase
                    </li>
                ) : (
                    <li key={index}>{describe(event, unitOf)}</li>
                ))}
            </ol>
        </section>
    );
};

export default BattleLog;
