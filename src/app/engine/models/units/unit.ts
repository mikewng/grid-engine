interface Unit {
    readonly id: string;
    readonly unitTypeId: string;
    name: string;
    position: { x: number, y: number }
    unitClass: UnitClass;
    stats: UnitStats;
    growths: UnitGrowths;
    skills: UnitSkill[];
    equippedWeapon: WeaponItem | undefined;
    items: Item[]
    range: number;
    isAlive: boolean;
    hasActed: boolean;
    statusEffects: UnitStatusEffect[];
    unitFaction: UnitFaction;
}

interface UnitStats {
    level: number;
    currentHealth: number;
    maxHealth: number;
    strength: number;
    magic: number;
    skill: number;
    speed: number;
    luck: number;
    defense: number;
    resistance: number;
    movement: number;
}

interface UnitGrowths {
    levelGR: number;
    healthGR: number;
    strengthGR: number;
    magicGR: number;
    skillGR: number;
    speedGR: number;
    luckGR: number;
    defenseGR: number;
    resistanceGR: number;
    movementGR: number;
}

interface UnitStatusEffect {
    type: UnitStatusType,
    duration: number;
    instensity: number;
}



enum UnitStatusType {
    STUN,
    POISON,
    SLOW,
    HASTE
}

enum UnitFaction {
    P1,
    P2,
    ENEMY,
    NEUTRAL
}