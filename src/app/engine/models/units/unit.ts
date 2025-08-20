interface Unit {
    id: string;
    unitTypeId: string;
    name: string;
    position: { x: number, y: number }
    unitClass: UnitClass;
    stats: UnitStats;
    growths: UnitGrowths;
    skills: UnitSkill[]
    items: Item[]
    range: number;
    isAlive: boolean;
    hasActed: boolean;
    status: UnitStatus;
    unitFaction: UnitFaction;
}

interface UnitStats {
    level: number;
    health: number;
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

enum UnitStatus {
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