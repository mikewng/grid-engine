/** How a class crosses terrain. Each terrain lists a cost per movement type. */
export enum MovementType {
    INFANTRY = 'infantry',
    ARMORED = 'armored',
    MOUNTED = 'mounted',
    FLYING = 'flying'
}

export interface UnitClass {
    id: string;
    name: string;
    movementType: MovementType;
}
