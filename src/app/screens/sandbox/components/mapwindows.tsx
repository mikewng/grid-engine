import { CSSProperties } from "react";
import { Coordinate } from "@/engine/models/grid/coordinate";
import { BannerInfo } from "../useplayback";

// Windows drawn over the map, inside GridComponent's overlay layer

interface ActionMenuProps {
    /** The unit the menu is for. */
    tile: Coordinate;
    cols: number;
    rows: number;
    canAttack: boolean;
    onAttack: () => void;
    onWait: () => void;
    onCancel: () => void;
}

/** Attack / Wait / Cancel, next to the unit that just moved. */
export const ActionMenu = ({ tile, cols, rows, canAttack, onAttack, onWait, onCancel }: ActionMenuProps) => {
    // Open to the right of the unit, or to the left near the right edge; likewise up near the bottom
    const flipX = tile.x >= cols - 4;
    const flipY = tile.y >= rows - 3;

    const style: CSSProperties = {
        left: `calc(${flipX ? tile.x : tile.x + 1} * 100% / var(--cols))`,
        top: `calc(${flipY ? tile.y + 1 : tile.y} * 100% / var(--rows))`,
        transform: `translate(${flipX ? "calc(-100% - 6px)" : "6px"}, ${flipY ? "-100%" : "0"})`,
    };

    return (
        <div className="ge-action-menu" style={style} role="menu" aria-label="Unit actions">
            {canAttack && (
                <button role="menuitem" className="is-attack" onClick={onAttack}>
                    Attack <kbd>A</kbd>
                </button>
            )}
            <button role="menuitem" onClick={onWait}>
                Wait <kbd>W</kbd>
            </button>
            <button role="menuitem" className="is-cancel" onClick={onCancel}>
                Cancel <kbd>Esc</kbd>
            </button>
        </div>
    );
};

/** "Player Phase" sweeping across the map when a turn starts. */
export const PhaseBanner = ({ banner }: { banner: BannerInfo }) => (
    <div className={`ge-phase-banner tone-${banner.tone}`} key={`${banner.title}-${banner.subtitle}`} aria-live="assertive">
        <div className="ge-phase-banner-band">
            <span className="ge-phase-banner-title">{banner.title}</span>
            {banner.subtitle && <span className="ge-phase-banner-sub">{banner.subtitle}</span>}
        </div>
    </div>
);

interface GameOverProps {
    victory: boolean;
    turn: number;
    onRestart: () => void;
}

export const GameOver = ({ victory, turn, onRestart }: GameOverProps) => (
    <div className={`ge-game-over ${victory ? "is-victory" : "is-defeat"}`} role="dialog" aria-label={victory ? "Victory" : "Defeat"}>
        <div className="ge-game-over-card">
            <div className="ge-game-over-title">{victory ? "Victory" : "Defeat"}</div>
            <p>{victory ? `Every enemy was defeated on turn ${turn}.` : `Your army fell on turn ${turn}.`}</p>
            <button className="ge-btn ge-btn--primary" onClick={onRestart} autoFocus>Play again</button>
        </div>
    </div>
);

/** A short message at the top of the map, such as why a command was refused. */
export const Toast = ({ text }: { text: string }) => (
    <div className="ge-toast" role="alert">{text}</div>
);

/** Shown while a replay runs. */
export const SkipButton = ({ onSkip }: { onSkip: () => void }) => (
    <button className="ge-skip" onClick={onSkip}>
        Skip <kbd>Space</kbd>
    </button>
);
