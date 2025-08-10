interface WeaponItem extends Item {
    attack: number;
    weaponType: WeaponType;
    range: number;
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