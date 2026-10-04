import React, { CSSProperties, memo } from "react";
import { WeaponType } from "@/engine/models/items/weaponitem";
import { UnitFaction } from "@/engine/models/units/iunit";
import WeaponIcon from "@/app/components/icons/weaponicon";

import "./unittoken.scss"

export interface UnitTokenProps {
    x: number;
    y: number;
    name: string;
    faction: UnitFaction;
    weaponType: WeaponType | undefined;
    hp: number;
    maxHp: number;
    /** Done for this turn: drawn greyed out. */
    acted?: boolean;
    /** Can still be given orders: gently bobs. */
    ready?: boolean;
    selected?: boolean;
    /** Leaning toward an enemy mid-strike: the direction to lean in. */
    lunge?: { dx: number; dy: number };
    /** Just took a hit. */
    hurt?: "hit" | "crit";
    dying?: boolean;
}

export const hpTone = (hp: number, maxHp: number) => {
    const ratio = maxHp > 0 ? hp / maxHp : 0;
    return ratio > 0.5 ? "high" : ratio > 0.25 ? "mid" : "low";
};

/** A unit on the map, positioned by tile. Moving it to a new tile glides it there. */
const UnitToken: React.FC<UnitTokenProps> = memo(({
    x, y, name, faction, weaponType, hp, maxHp, acted, ready, selected, lunge, hurt, dying,
}) => {
    const classes = [
        "ge-token",
        `faction-${UnitFaction[faction].toLowerCase()}`,
        acted && "is-acted",
        ready && "is-ready",
        selected && "is-selected",
        lunge && "is-lunging",
        hurt && `is-hurt is-hurt-${hurt}`,
        dying && "is-dying",
    ].filter(Boolean).join(" ");

    const style = {
        left: `calc(${x} * 100% / var(--cols))`,
        top: `calc(${y} * 100% / var(--rows))`,
        "--lunge-x": lunge?.dx ?? 0,
        "--lunge-y": lunge?.dy ?? 0,
    } as CSSProperties;

    const healthPercent = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;

    return (
        <div className={classes} style={style} title={`${name} (${hp}/${maxHp} HP)`}>
            <div className="ge-token-body">
                <div className="ge-token-badge">
                    <WeaponIcon type={weaponType} className="ge-token-icon" />
                </div>
                <div className="ge-token-hp">
                    <span className={`ge-token-hp-fill hp-${hpTone(hp, maxHp)}`} style={{ width: `${healthPercent}%` }} />
                </div>
            </div>
        </div>
    );
});

UnitToken.displayName = "UnitToken";

export default UnitToken;
