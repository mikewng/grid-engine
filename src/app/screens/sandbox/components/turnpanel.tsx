import { TurnState } from "@/engine/models/game/gamestate";
import { factionClass, factionName } from "@/app/components/unit/faction";

interface TurnPanelProps {
    turn: TurnState;
    /** The active faction is played by a person (not the AI). */
    isHumanTurn: boolean;
    playing: boolean;
    readyCount: number;
    unitCount: number;
    /** What to do next, in a sentence. */
    hint: string;
    dangerZone: boolean;
    autoEnd: boolean;
    fast: boolean;
    onEndTurn: () => void;
    onReset: () => void;
    onToggleDangerZone: () => void;
    onToggleAutoEnd: () => void;
    onToggleFast: () => void;
}

/** Whose turn it is, what to do next, and the turn-level buttons. */
const TurnPanel = ({
    turn, isHumanTurn, playing, readyCount, unitCount, hint, dangerZone, autoEnd, fast,
    onEndTurn, onReset, onToggleDangerZone, onToggleAutoEnd, onToggleFast,
}: TurnPanelProps) => {
    const allDone = isHumanTurn && readyCount === 0;

    return (
        <section className="ge-panel ge-turn-panel" aria-label="Turn">
            <div className="ge-turn-row">
                <div>
                    <div className="ge-turn-label">Turn</div>
                    <div className="ge-turn-number">{turn.turn}</div>
                </div>
                {turn.isOver ? (
                    <span className="ge-phase-pill is-over">Game over</span>
                ) : (
                    <span className={`ge-phase-pill ${factionClass(turn.activeFaction)}`}>{factionName(turn.activeFaction)} Phase</span>
                )}
            </div>

            {isHumanTurn && (
                <div className="ge-ready">
                    <div className="ge-ready-dots" aria-hidden="true">
                        {Array.from({ length: unitCount }, (_, i) => (
                            <span key={i} className={i < readyCount ? "is-ready" : ""} />
                        ))}
                    </div>
                    <span>{readyCount} of {unitCount} units ready</span>
                </div>
            )}

            <p className="ge-hint" aria-live="polite">{hint}</p>

            <button
                className={`ge-btn ge-btn--primary ge-end-turn${allDone && !playing ? " is-nudging" : ""}`}
                onClick={onEndTurn}
                disabled={!isHumanTurn || playing}
            >
                End Turn <kbd>E</kbd>
            </button>

            <div className="ge-turn-buttons">
                <button className={`ge-btn${dangerZone ? " is-on" : ""}`} onClick={onToggleDangerZone} aria-pressed={dangerZone}>
                    Danger Zone <kbd>D</kbd>
                </button>
                <button className="ge-btn ge-btn--ghost" onClick={onReset}>
                    Restart
                </button>
            </div>

            <div className="ge-toggles">
                <label>
                    <input type="checkbox" checked={autoEnd} onChange={onToggleAutoEnd} />
                    Auto-end turn
                </label>
                <label>
                    <input type="checkbox" checked={fast} onChange={onToggleFast} />
                    Fast animations
                </label>
            </div>
        </section>
    );
};

export default TurnPanel;
