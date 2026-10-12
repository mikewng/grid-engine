import { UnitFaction } from "@/engine/models/units/iunit";
import { INK, shade } from "./pixelart";

/** A faction's cloth: the main colour with a shadow and a highlight, swapped onto every sprite as in Fire Emblem. */
export interface FactionColors {
    main: string;
    dark: string;
    light: string;
}

export const FACTION_COLORS: Record<UnitFaction, FactionColors> = {
    [UnitFaction.P1]: { main: "#4672e0", dark: "#283f9c", light: "#9cbcff" },
    [UnitFaction.ENEMY]: { main: "#d9473f", dark: "#8e2229", light: "#ffa395" },
    [UnitFaction.P2]: { main: "#3ba862", dark: "#1e6a3b", light: "#a2e9b9" },
    [UnitFaction.NEUTRAL]: { main: "#d8a033", dark: "#8d6216", light: "#ffdf98" },
};

/** Colours that don't change with faction. */
export const COLORS = {
    ink: INK,
    skin: "#f1c9a2",
    skinShadow: "#d39b76",
    leather: "#5b3a22",
    pants: "#3a3550",
    gold: "#e6c977",
    steel: "#d6dde8",
    steelDark: "#8a95a8",
    white: "#f4f4f8",
    wood: "#8b5a2b",
    horse: "#8b5e3c",
    horseDark: "#5e3b22",
    mane: "#3b2416",
    pegasus: "#f2f3f8",
    pegasusDark: "#c3c7d6",
    pegasusMane: "#dfe3ee",
    hoof: "#2a2420",
    tomeAnima: "#c8452d",
    tomeLight: "#f2e6b6",
    pages: "#f4ead2",
    orb: "#9fe0ff",
};

const HAIR = ["#3b2a1e", "#7a4a22", "#c99a3c", "#2b2f45", "#9b3b2a", "#5a5f6a", "#d8d2c4"];

/** A hair colour that stays the same for each unit, on the map and in battle. */
export function hairOf(seed: string): string {
    let hash = 0;
    for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    return HAIR[hash % HAIR.length];
}

export const hairShadow = (hair: string) => shade(hair, 0.7);
