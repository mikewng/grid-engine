import { GameManagers } from "@/engine/gamesetup";
import { coordinateKey } from "@/engine/models/grid/coordinate";

export interface Threat {
    /** Tiles the unit can move to this turn. */
    move: Set<string>;
    /** Tiles it could attack after moving that it can't move to (the red fringe). */
    attackFringe: Set<string>;
    /** Every tile it could attack after moving, moveable or not. */
    attackable: Set<string>;
}

/** Where a unit can go and what it can hit this turn, as sets of coordinateKey() strings. */
export function threatOf({ movementManager, combatManager }: GameManagers, unitId: string): Threat {
    const reach = movementManager.getMovementRange(unitId).value ?? [];
    const move = new Set(reach.map(coordinateKey));
    const attackable = new Set<string>();

    for (const tile of reach) {
        for (const target of combatManager.getAttackRange(unitId, tile).value ?? []) {
            attackable.add(coordinateKey(target));
        }
    }

    const attackFringe = new Set([...attackable].filter(key => !move.has(key)));

    return { move, attackFringe, attackable };
}
