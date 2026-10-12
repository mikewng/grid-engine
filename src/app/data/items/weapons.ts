import { ItemCategory } from "@/engine/models/items/item";
import { WeaponDefinition, WeaponType } from "@/engine/models/items/weaponitem";
import { MovementType } from "@/engine/models/units/unitclass";

// The armory for the larger scenarios, with numbers close to Fire Emblem: The
// Sacred Stones'. Each unit gets its own copy (see createUnit).

type WeaponStats = Pick<WeaponDefinition, "attack" | "baseHitRate" | "weight" | "maxDurability" | "description"> & Partial<WeaponDefinition>;

const weapon = (name: string, weaponType: WeaponType, stats: WeaponStats): WeaponDefinition => ({
    name,
    itemTypeId: name.toLowerCase().replace(/ /g, "-"),
    category: ItemCategory.WEAPON,
    weaponType,
    minRange: 1,
    maxRange: 1,
    baseCritRate: 0,
    ...stats,
});

const { ARMORED, MOUNTED, FLYING } = MovementType;

// Swords
export const ironSword = weapon("Iron Sword", WeaponType.SWORD, { attack: 5, baseHitRate: 90, weight: 5, maxDurability: 46, description: "A plain iron sword." });
export const steelSword = weapon("Steel Sword", WeaponType.SWORD, { attack: 8, baseHitRate: 75, weight: 10, maxDurability: 30, description: "Heavier and harder-hitting than iron." });
export const killingEdge = weapon("Killing Edge", WeaponType.SWORD, { attack: 9, baseHitRate: 75, baseCritRate: 30, weight: 7, maxDurability: 20, description: "A blade made for critical hits." });
export const armorslayer = weapon("Armorslayer", WeaponType.SWORD, { attack: 8, baseHitRate: 80, weight: 11, maxDurability: 18, effectiveAgainst: [ARMORED], description: "Cuts through armor. Effective against armored units." });

// Lances
export const ironLance = weapon("Iron Lance", WeaponType.SPEAR, { attack: 7, baseHitRate: 80, weight: 8, maxDurability: 45, description: "A plain iron lance." });
export const silverLance = weapon("Silver Lance", WeaponType.SPEAR, { attack: 14, baseHitRate: 75, weight: 10, maxDurability: 20, description: "A fine lance of silver." });
export const javelin = weapon("Javelin", WeaponType.SPEAR, { attack: 6, baseHitRate: 65, weight: 11, maxDurability: 20, maxRange: 2, description: "A spear light enough to throw. Range 1-2." });
export const horseslayer = weapon("Horseslayer", WeaponType.SPEAR, { attack: 7, baseHitRate: 70, weight: 13, maxDurability: 16, effectiveAgainst: [MOUNTED], description: "Effective against mounted units." });

// Axes
export const ironAxe = weapon("Iron Axe", WeaponType.AXE, { attack: 8, baseHitRate: 75, weight: 10, maxDurability: 45, description: "A plain iron axe." });
export const steelAxe = weapon("Steel Axe", WeaponType.AXE, { attack: 11, baseHitRate: 65, weight: 15, maxDurability: 30, description: "Heavy, and hits hard." });
export const handAxe = weapon("Hand Axe", WeaponType.AXE, { attack: 7, baseHitRate: 60, weight: 12, maxDurability: 20, maxRange: 2, description: "An axe made for throwing. Range 1-2." });
export const hammer = weapon("Hammer", WeaponType.AXE, { attack: 10, baseHitRate: 55, weight: 15, maxDurability: 20, effectiveAgainst: [ARMORED], description: "Effective against armored units." });

// Bows: effective against fliers, and useless up close
export const ironBow = weapon("Iron Bow", WeaponType.BOW, { attack: 6, baseHitRate: 85, weight: 5, maxDurability: 45, minRange: 2, maxRange: 2, effectiveAgainst: [FLYING], description: "A plain iron bow." });
export const longbow = weapon("Longbow", WeaponType.BOW, { attack: 5, baseHitRate: 65, weight: 10, maxDurability: 20, minRange: 2, maxRange: 3, effectiveAgainst: [FLYING], description: "Reaches farther than other bows. Range 2-3." });

// Magic: hits resistance instead of defense
export const fire = weapon("Fire", WeaponType.BMAGIC, { attack: 5, baseHitRate: 90, weight: 4, maxDurability: 40, maxRange: 2, description: "Basic fire magic." });
export const thunder = weapon("Thunder", WeaponType.BMAGIC, { attack: 8, baseHitRate: 80, baseCritRate: 5, weight: 6, maxDurability: 35, maxRange: 2, description: "Lightning called down on the target." });
export const flux = weapon("Flux", WeaponType.BMAGIC, { attack: 7, baseHitRate: 80, weight: 8, maxDurability: 45, maxRange: 2, description: "Dark magic." });
export const lightning = weapon("Lightning", WeaponType.WMAGIC, { attack: 4, baseHitRate: 95, weight: 6, maxDurability: 35, maxRange: 2, description: "Holy light. Accurate." });
