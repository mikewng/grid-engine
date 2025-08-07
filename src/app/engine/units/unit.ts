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
    Stunned,
    Poisoned,
    Slowed,
    Hastened
}