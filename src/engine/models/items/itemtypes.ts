import { BaseItem, ItemCategory } from "./item";
import { UnitStats } from "../units/iunit";

export interface ConsumableItem extends BaseItem {
    category: ItemCategory.CONSUMABLE;
    uses: number;
    maxUses: number;
    stackable?: boolean;
    maxStack?: number;
}

export interface HealingItem extends ConsumableItem {
    healAmount: number;
    healType: 'HP' | 'MP' | 'STATUS';
    targetType: 'SELF' | 'ALLY' | 'ANY_UNIT';
}

export interface StatBoostItem extends ConsumableItem {
    statModifiers: Partial<UnitStats>;
    duration: number;
    isPermanent: boolean;
}

export interface EquipmentItem extends BaseItem {
    category: ItemCategory.EQUIPMENT;
    slot: EquipmentSlot;
    statModifiers?: Partial<UnitStats>;
    resistances?: { [key in DamageType]?: number };
    restrictions?: ItemRestrictions;
}

export interface KeyItem extends BaseItem {
    category: ItemCategory.KEY_ITEM;
    questId?: string;
    isDroppable: false;
    uniqueId?: string;
}

export interface MaterialItem extends BaseItem {
    category: ItemCategory.MATERIAL;
    materialType: MaterialType;
    stackable: true;
    maxStack: number;
    craftingValue: number;
}

export interface ToolItem extends BaseItem {
    category: ItemCategory.TOOL;
    durability: number;
    maxDurability: number;
    toolType: ToolType;
    usesPerTurn?: number;
}

export enum EquipmentSlot {
    ARMOR = 'armor',
    ACCESSORY = 'accessory',
    BOOTS = 'boots',
    RING = 'ring',
    HELMET = 'helmet',
    SHIELD = 'shield'
}

export enum DamageType {
    PHYSICAL = 'physical',
    MAGICAL = 'magical',
    FIRE = 'fire',
    ICE = 'ice',
    LIGHTNING = 'lightning',
    DARK = 'dark',
    LIGHT = 'light'
}

export enum MaterialType {
    METAL = 'metal',
    WOOD = 'wood',
    STONE = 'stone',
    CLOTH = 'cloth',
    CRYSTAL = 'crystal',
    ESSENCE = 'essence'
}

export enum ToolType {
    LOCKPICK = 'lockpick',
    TORCH = 'torch',
    ROPE = 'rope',
    SHOVEL = 'shovel',
    MAP = 'map',
    COMPASS = 'compass'
}

export interface ItemRestrictions {
    requiredLevel?: number;
    allowedClasses?: string[];
    requiredStats?: Partial<UnitStats>;
    forbiddenClasses?: string[];
}