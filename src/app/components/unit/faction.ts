import { UnitFaction } from "@/engine/models/units/iunit";

const NAMES: Record<UnitFaction, string> = {
    [UnitFaction.P1]: "Player",
    [UnitFaction.P2]: "Ally",
    [UnitFaction.ENEMY]: "Enemy",
    [UnitFaction.NEUTRAL]: "Neutral",
};

/** "Player", "Enemy" and so on, for display. */
export const factionName = (faction: UnitFaction) => NAMES[faction];

/** The CSS modifier used for a faction's colors (faction-p1, faction-enemy, ...). */
export const factionClass = (faction: UnitFaction) => `faction-${UnitFaction[faction].toLowerCase()}`;
