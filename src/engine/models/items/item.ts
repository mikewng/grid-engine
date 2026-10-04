export interface BaseItem {
    id: string;
    itemTypeId: string;
    name: string;
    category: ItemCategory;
    rarity?: ItemRarity;
    value?: number;
    description?: string;
}

export enum ItemCategory {
    WEAPON = 'weapon',
    CONSUMABLE = 'consumable',
    EQUIPMENT = 'equipment',
    KEY_ITEM = 'key_item',
    MATERIAL = 'material',
    TOOL = 'tool'
}

export enum ItemRarity {
    COMMON = 'common',
    UNCOMMON = 'uncommon',
    RARE = 'rare',
    EPIC = 'epic',
    LEGENDARY = 'legendary'
}
