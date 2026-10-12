import React, { CSSProperties, memo } from "react";
import { WeaponType } from "@/engine/models/items/weaponitem";
import { UnitFaction } from "@/engine/models/units/iunit";
import { MovementType } from "@/engine/models/units/unitclass";
import { UnitSprite } from "@/app/components/pixel/unitsprites";

import "./unittoken.scss"

export interface UnitTokenProps {
    x: number;
    y: number;
    name: string;
    faction: UnitFaction;
    weaponType: WeaponType | undefined;
    movement: MovementType;
    /** Picks the sprite's hair colour: the unit's id. */
    seed: string;
    hp: number;
    maxHp: number;
    /** Done for this turn: drawn greyed out and still. */
    acted?: boolean;
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
    x, y, name, faction, weaponType, movement, seed, hp, maxHp, acted, selected, lunge, hurt, dying,
}) => {
    const classes = [
        "ge-token",
        `faction-${UnitFaction[faction].toLowerCase()}`,
        acted && "is-acted",
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
                <UnitSprite className="ge-token-sprite" movement={movement} weapon={weaponType} faction={faction} seed={seed} />
                <div className="ge-token-hp">
                    <span className={`ge-token-hp-fill hp-${hpTone(hp, maxHp)}`} style={{ width: `${healthPercent}%` }} />
                </div>
            </div>
        </div>
    );
});

UnitToken.displayName = "UnitToken";

export default UnitToken;
