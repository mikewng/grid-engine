import { Scenario } from "@/engine/gamesetup";
import { WeaponDefinition } from "@/engine/models/items/weaponitem";
import { AiBehavior, UnitFaction, UnitGrowths, UnitStats } from "@/engine/models/units/iunit";
import { UnitClass } from "@/engine/models/units/unitclass";
import { UnitTemplate } from "@/engine/models/units/unit";
import { terrainTable, tileLegend } from "../grid/terrain";
import * as w from "../items/weapons";
import * as c from "../units/classes";

/**
 * Border Fort: a river splits the map. Raiders cross the north bridge toward a
 * village (top left) that three green allies are holding; brigands wait in the
 * hills to the south-east; a general holds the castle (top right) behind its
 * gate. Your army starts in the bottom-left corner.
 *
 *   .  grass     F  forest    M  mountain   W  water     #  wall
 *   =  road      H  bridge    T  fort       S  sand      V  village
 */
const MAP = [
    // 01234567890123456789012345
    "MM.........SWWS...########", // 0
    "M.V..V...FFSWWS...#T====T#", // 1
    "....V....F.SWWSFF.#==T===#", // 2
    "............WW....#======#", // 3
    "...=========HH===.#======#", // 4
    "...=........WW..=.#======#", // 5
    "...=..FF....WW..=.###T####", // 6
    "...=..FF.T.SWW..======....", // 7
    "F..=..F....SWWS.=......FF.", // 8
    "FF.=.T.....SWWS.=...FF..F.", // 9
    "...=....FF.SWWS.=.T..F....", // 10
    "...=.....F..WWS.=.........", // 11
    "...=........WW..=....MM..M", // 12
    "...=========HH===..MM..M..", // 13
    "............WW.......FFFM.", // 14
    "........F..SWWS...F.MM...M", // 15
    "........FF.SWWSS...F..MMMM", // 16
    "...........SWWSSS.........", // 17
];

// Nobody levels up yet, so growths don't matter
const NO_GROWTHS: UnitGrowths = {
    levelGR: 0, healthGR: 0, strengthGR: 0, magicGR: 0, skillGR: 0,
    speedGR: 0, luckGR: 0, defenseGR: 0, resistanceGR: 0, movementGR: 0,
};

interface Recruit {
    id: string;
    name: string;
    unitClass: UnitClass;
    at: [number, number];
    weapon: WeaponDefinition;
    level: number;
    /** HP, Str, Mag, Skl, Spd, Lck, Def, Res, Con, Mov */
    stats: [number, number, number, number, number, number, number, number, number, number];
    ai?: AiBehavior;
}

const army = (faction: UnitFaction, recruits: Recruit[]): UnitTemplate[] => recruits.map(({ id, name, unitClass, at, weapon, level, stats, ai }) => {
    const [hp, strength, magic, skill, speed, luck, defense, resistance, constitution, movement]: number[] = stats;
    const unitStats: UnitStats = {
        level, currentExperience: 0, currentHealth: hp, maxHealth: hp,
        strength, magic, skill, speed, luck, defense, resistance, constitution, movement,
    };

    return { id, unitTypeId: unitClass.id, name, position: { x: at[0], y: at[1] }, unitClass, stats: unitStats, growths: NO_GROWTHS, faction, weapons: [weapon], ai };
});

const players = army(UnitFaction.P1, [
    { id: "aldric", name: "Aldric", unitClass: c.lord, at: [3, 15], weapon: w.ironSword, level: 5, stats: [22, 7, 1, 9, 10, 7, 6, 3, 7, 5] },
    { id: "brienne", name: "Brienne", unitClass: c.cavalier, at: [5, 14], weapon: w.javelin, level: 5, stats: [24, 8, 0, 6, 7, 5, 7, 1, 10, 7] },
    { id: "corin", name: "Corin", unitClass: c.cavalier, at: [6, 16], weapon: w.armorslayer, level: 6, stats: [25, 9, 0, 7, 6, 3, 8, 0, 11, 7] },
    { id: "dagny", name: "Dagny", unitClass: c.armorKnight, at: [2, 14], weapon: w.ironLance, level: 5, stats: [26, 9, 0, 5, 3, 3, 12, 1, 13, 4] },
    { id: "elowen", name: "Elowen", unitClass: c.pegasusKnight, at: [1, 16], weapon: w.ironLance, level: 5, stats: [18, 6, 2, 9, 11, 8, 4, 7, 5, 7] },
    { id: "fenn", name: "Fenn", unitClass: c.archer, at: [2, 16], weapon: w.ironBow, level: 5, stats: [20, 7, 0, 9, 7, 4, 5, 2, 7, 5] },
    { id: "gwyn", name: "Gwyn", unitClass: c.mage, at: [4, 16], weapon: w.fire, level: 5, stats: [18, 1, 8, 7, 7, 4, 2, 6, 5, 5] },
    { id: "hale", name: "Hale", unitClass: c.fighter, at: [5, 15], weapon: w.handAxe, level: 5, stats: [28, 10, 0, 5, 7, 3, 4, 0, 11, 5] },
    { id: "isolde", name: "Isolde", unitClass: c.monk, at: [3, 17], weapon: w.lightning, level: 5, stats: [18, 0, 7, 8, 8, 6, 2, 8, 6, 5] },
]);

// Villagers who hold their ground until raiders come close
const allies = army(UnitFaction.P2, [
    { id: "brom", name: "Brom", unitClass: c.fighter, at: [4, 2], weapon: w.ironAxe, level: 3, stats: [24, 8, 0, 4, 5, 2, 3, 0, 10, 5], ai: "ambush" },
    { id: "wren", name: "Wren", unitClass: c.archer, at: [2, 1], weapon: w.ironBow, level: 3, stats: [18, 6, 0, 7, 6, 3, 3, 1, 7, 5], ai: "ambush" },
    { id: "rowan", name: "Rowan", unitClass: c.cavalier, at: [3, 4], weapon: w.steelSword, level: 4, stats: [22, 7, 0, 6, 7, 4, 6, 1, 9, 7], ai: "ambush" },
]);

const enemies = army(UnitFaction.ENEMY, [
    // Raiders heading over the north bridge for the village
    { id: "raider-soldier-1", name: "Soldier", unitClass: c.soldier, at: [15, 4], weapon: w.ironLance, level: 3, stats: [20, 6, 0, 4, 4, 0, 5, 0, 7, 5] },
    { id: "raider-soldier-2", name: "Soldier", unitClass: c.soldier, at: [16, 6], weapon: w.ironLance, level: 3, stats: [20, 6, 0, 4, 4, 0, 5, 0, 7, 5] },
    { id: "raider-mercenary", name: "Mercenary", unitClass: c.mercenary, at: [16, 1], weapon: w.killingEdge, level: 5, stats: [22, 7, 0, 9, 9, 2, 5, 1, 8, 5] },
    { id: "raider-cavalier", name: "Cavalier", unitClass: c.cavalier, at: [17, 3], weapon: w.javelin, level: 4, stats: [22, 7, 0, 5, 6, 1, 6, 0, 10, 7] },

    // The castle: the general and his guard hold; archers and a mage fire on anyone who comes near
    { id: "varek", name: "General Varek", unitClass: c.general, at: [21, 2], weapon: w.silverLance, level: 10, stats: [34, 13, 0, 9, 6, 5, 14, 5, 15, 4], ai: "hold" },
    { id: "castle-knight-1", name: "Armor Knight", unitClass: c.armorKnight, at: [20, 4], weapon: w.ironLance, level: 5, stats: [25, 8, 0, 4, 2, 0, 11, 0, 13, 4], ai: "hold" },
    { id: "castle-knight-2", name: "Armor Knight", unitClass: c.armorKnight, at: [22, 4], weapon: w.ironLance, level: 5, stats: [25, 8, 0, 4, 2, 0, 11, 0, 13, 4], ai: "hold" },
    { id: "gate-guard", name: "Gate Guard", unitClass: c.soldier, at: [21, 6], weapon: w.horseslayer, level: 6, stats: [24, 8, 0, 6, 5, 1, 7, 1, 8, 5], ai: "hold" },
    { id: "castle-archer-1", name: "Archer", unitClass: c.archer, at: [19, 1], weapon: w.longbow, level: 4, stats: [19, 6, 0, 6, 5, 1, 4, 1, 7, 5], ai: "ambush" },
    { id: "castle-archer-2", name: "Archer", unitClass: c.archer, at: [24, 1], weapon: w.ironBow, level: 4, stats: [19, 6, 0, 6, 5, 1, 4, 1, 7, 5], ai: "ambush" },
    { id: "castle-mage", name: "Mage", unitClass: c.mage, at: [23, 3], weapon: w.thunder, level: 5, stats: [17, 0, 7, 5, 6, 1, 2, 5, 5, 5], ai: "ambush" },

    // Brigands waiting in the hills
    { id: "hill-brigand-1", name: "Brigand", unitClass: c.brigand, at: [20, 13], weapon: w.steelAxe, level: 4, stats: [26, 9, 0, 3, 5, 0, 3, 0, 12, 5], ai: "ambush" },
    { id: "hill-brigand-2", name: "Brigand", unitClass: c.brigand, at: [22, 12], weapon: w.handAxe, level: 4, stats: [26, 9, 0, 3, 5, 0, 3, 0, 12, 5], ai: "ambush" },
    { id: "hill-brigand-3", name: "Brigand", unitClass: c.brigand, at: [23, 15], weapon: w.hammer, level: 4, stats: [26, 9, 0, 3, 5, 0, 3, 0, 12, 5], ai: "ambush" },
    { id: "hill-archer", name: "Archer", unitClass: c.archer, at: [24, 14], weapon: w.longbow, level: 4, stats: [19, 6, 0, 6, 5, 1, 4, 1, 7, 5], ai: "ambush" },

    // A strike force sweeping the middle
    { id: "wyvern", name: "Wyvern Rider", unitClass: c.wyvernRider, at: [24, 9], weapon: w.steelAxe, level: 6, stats: [27, 10, 0, 6, 5, 1, 9, 0, 11, 7] },
    { id: "lancer", name: "Cavalier", unitClass: c.cavalier, at: [19, 9], weapon: w.horseslayer, level: 5, stats: [22, 7, 0, 5, 6, 1, 6, 0, 10, 7] },
    { id: "shaman", name: "Shaman", unitClass: c.shaman, at: [18, 11], weapon: w.flux, level: 5, stats: [18, 0, 7, 4, 4, 1, 2, 5, 6, 5], ai: "ambush" },
]);

export const borderFortScenario: Scenario = {
    map: MAP.map(row => row.split("")),
    legend: tileLegend,
    terrain: terrainTable,
    units: [...players, ...allies, ...enemies],
    turnOrder: [UnitFaction.P1, UnitFaction.P2, UnitFaction.ENEMY],
    controllers: { [UnitFaction.P2]: "ai", [UnitFaction.ENEMY]: "ai" },
    seed: 1337,
};
