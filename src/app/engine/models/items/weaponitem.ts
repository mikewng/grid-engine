interface WeaponItem extends Item {
    attack: number;
    weaponType: WeaponType;
    range: number;
    baseHitRate: number;
    baseCritRate: number;
}

enum WeaponType {
    SWORD,
    AXE,
    SPEAR,
    BOW,
    STAFF,
    BMAGIC,
    WMAGIC,
}