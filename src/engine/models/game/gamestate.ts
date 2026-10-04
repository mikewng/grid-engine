import { CombatOutcome } from "../../rules/combatresolver";
import { Coordinate } from "../grid/coordinate";
import { UnitFaction } from "../units/iunit";

/** Who plays a faction. */
export type Controller = "human" | "ai";

export interface TurnState {
    turn: number;
    activeFaction: UnitFaction;
    isOver: boolean;
    /** The faction left standing, once the game is over (null if nobody is). */
    winner: UnitFaction | null;
}

/**
 * Everything a player (or the AI, or a network peer) can ask the game to do.
 * Commands are plain data, so they can be logged, replayed or sent over a socket.
 */
export type GameCommand =
    | { type: "move"; unitId: string; path: Coordinate[] }
    | { type: "moveTo"; unitId: string; destination: Coordinate }
    /** Take back this turn's move, as long as the unit hasn't acted yet. */
    | { type: "undoMove"; unitId: string }
    | { type: "attack"; unitId: string; targetId: string }
    | { type: "wait"; unitId: string }
    | { type: "endTurn" };

/** What happened as a result of a command, in order. */
export type GameEvent =
    | { type: "turnStarted"; turn: number; faction: UnitFaction }
    | { type: "unitMoved"; unitId: string; path: Coordinate[] }
    | { type: "moveUndone"; unitId: string; to: Coordinate }
    | { type: "combat"; attackerId: string; defenderId: string; outcome: CombatOutcome }
    | { type: "unitWaited"; unitId: string }
    | { type: "statusDamage"; unitId: string; damage: number }
    | { type: "unitDefeated"; unitId: string }
    | { type: "gameOver"; winner: UnitFaction | null };
