import { Controller, GameCommand, GameEvent, TurnState } from "../models/game/gamestate";
import { Coordinate } from "../models/grid/coordinate";
import { UnitFaction } from "../models/units/iunit";
import { Ruleset } from "../rules/ruleset";
import { Result } from "../utils/resultclass";
import { ICombatManager, IMovementManager, IUnitManager } from "./interfaces/manager-interfaces";
import { StatusManager } from "./statusmanager";

export interface TurnOptions {
    /** Factions in the order they take turns. */
    turnOrder: UnitFaction[];
    /** Who plays each faction. Anything not listed is human. */
    controllers?: Partial<Record<UnitFaction, Controller>>;
}

/** Plays a unit for an AI-controlled faction. */
export interface AiController {
    /** Commands for one unit, worked out against the current state of the game. */
    planUnit(unitId: string): GameCommand[];
}

/**
 * Owns the flow of play: whose turn it is, what each unit has done, and what
 * commands are allowed. The UI, the AI and (later) the network all go through
 * `execute`, so rules are enforced in one place.
 */
export class GameManager {
    private state: TurnState;
    private phaseIndex = 0;
    private history: GameEvent[] = [];
    private version = 0;
    private listeners = new Set<() => void>();
    private ai: AiController | null = null;
    /** Where each unit that moved this turn started from, so the move can be taken back. */
    private moveOrigins = new Map<string, Coordinate>();

    constructor(
        private units: IUnitManager,
        private movement: IMovementManager,
        private combat: ICombatManager,
        private status: StatusManager,
        private rules: Ruleset,
        private options: TurnOptions,
    ) {
        if (options.turnOrder.length === 0) throw new Error("turnOrder needs at least one faction");

        this.state = { turn: 1, activeFaction: options.turnOrder[0], isOver: false, winner: null };
    }

    setAi(ai: AiController): void {
        this.ai = ai;
    }

    /** Start the first turn (running it straight away if it belongs to the AI). */
    start(): GameEvent[] {
        const events = this.beginTurn(this.state.activeFaction);

        if (!this.state.isOver && this.controllerOf(this.state.activeFaction) === "ai") {
            events.push(...this.runAiTurn());
            events.push(...this.advanceTurn());
        }

        return this.record(events);
    }

    getState(): TurnState {
        return { ...this.state };
    }

    getHistory(): readonly GameEvent[] {
        return this.history;
    }

    controllerOf(faction: UnitFaction): Controller {
        return this.options.controllers?.[faction] ?? "human";
    }

    /** Run a command from a human player. Returns what happened, or why it was refused. */
    execute(command: GameCommand): Result<GameEvent[]> {
        if (this.controllerOf(this.state.activeFaction) !== "human") {
            return Result.Fail("It isn't a human player's turn");
        }

        const result = this.apply(command);
        if (!result.success) return result;

        return Result.Success(this.record(result.value));
    }

    /**
     * Play another round when no human is up, which only happens when every
     * faction is AI-controlled (simulations, balance testing).
     */
    continueAi(): Result<GameEvent[]> {
        if (this.state.isOver) return Result.Fail("The game is over");
        if (this.controllerOf(this.state.activeFaction) !== "ai") return Result.Fail("It's a human player's turn");

        return Result.Success(this.record(this.advanceTurn()));
    }

    /** For React's useSyncExternalStore: called whenever the game changes. */
    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    };

    /** Changes every time the game state changes. */
    getVersion = (): number => this.version;

    private apply(command: GameCommand): Result<GameEvent[]> {
        if (this.state.isOver) return Result.Fail("The game is over");

        if (command.type === "endTurn") return Result.Success(this.advanceTurn());

        const unitResult = this.units.getUnitById(command.unitId);
        if (!unitResult.success) return Result.Fail(unitResult.err);

        const unit = unitResult.value;

        if (unit.unitFaction !== this.state.activeFaction) return Result.Fail(`It isn't ${unit.name}'s turn`);
        if (!unit.isAlive) return Result.Fail(`${unit.name} has been defeated`);
        if (unit.hasActed) return Result.Fail(`${unit.name} has already acted this turn`);

        switch (command.type) {
            case "move":
            case "moveTo": {
                const origin = { ...unit.position };
                const moved = command.type === "move"
                    ? this.movement.moveUnit(unit.id, command.path)
                    : this.movement.moveUnitTo(unit.id, command.destination);

                if (!moved.success) return Result.Fail(moved.err);

                this.moveOrigins.set(unit.id, origin);
                return Result.Success([{ type: "unitMoved", unitId: unit.id, path: moved.value }]);
            }

            case "undoMove": {
                const origin = this.moveOrigins.get(unit.id);
                if (!origin || !unit.hasMoved) return Result.Fail(`${unit.name} hasn't moved this turn`);

                const returned = this.movement.returnUnit(unit.id, origin);
                if (!returned.success) return Result.Fail(returned.err);

                this.moveOrigins.delete(unit.id);
                return Result.Success([{ type: "moveUndone", unitId: unit.id, to: { ...origin } }]);
            }

            case "attack": {
                const fought = this.combat.initiateAttack(unit.id, command.targetId);
                if (!fought.success) return Result.Fail(fought.err);

                const outcome = fought.value;
                const events: GameEvent[] = [{ type: "combat", attackerId: unit.id, defenderId: command.targetId, outcome }];

                if (outcome.defenderKilled) events.push({ type: "unitDefeated", unitId: command.targetId });
                if (outcome.attackerKilled) events.push({ type: "unitDefeated", unitId: unit.id });

                events.push(...this.checkGameOver());
                return Result.Success(events);
            }

            case "wait":
                this.units.markUnitActed(unit.id);
                return Result.Success([{ type: "unitWaited", unitId: unit.id }]);
        }
    }

    /** End the current faction's turn and play on until a human faction is up (or the game ends). */
    private advanceTurn(): GameEvent[] {
        const events: GameEvent[] = [];
        const { turnOrder } = this.options;

        // One full round at most, so all-AI games advance a round per call instead of looping forever
        for (let step = 0; step < turnOrder.length && !this.state.isOver; step++) {
            // "Done for this turn" only means something during a faction's own turn
            this.units.resetTurnFlags(this.state.activeFaction);
            this.moveOrigins.clear();

            this.phaseIndex = (this.phaseIndex + 1) % turnOrder.length;
            if (this.phaseIndex === 0) this.state.turn++;

            const faction = turnOrder[this.phaseIndex];
            if (!this.hasLivingUnits(faction)) continue;

            this.state.activeFaction = faction;
            events.push(...this.beginTurn(faction));

            if (this.state.isOver || this.controllerOf(faction) === "human") break;

            events.push(...this.runAiTurn());
        }

        return events;
    }

    private beginTurn(faction: UnitFaction): GameEvent[] {
        const events: GameEvent[] = [{ type: "turnStarted", turn: this.state.turn, faction }];

        this.units.resetTurnFlags(faction);

        for (const tick of this.status.tickFaction(faction)) {
            if (tick.damage > 0) events.push({ type: "statusDamage", unitId: tick.unitId, damage: tick.damage });
            if (tick.defeated) events.push({ type: "unitDefeated", unitId: tick.unitId });
        }

        events.push(...this.checkGameOver());
        return events;
    }

    /** Let the AI play every unit of the active faction, one at a time. */
    private runAiTurn(): GameEvent[] {
        const events: GameEvent[] = [];
        if (!this.ai) return events;

        const faction = this.state.activeFaction;
        const ids = this.units.getUnitsByFaction(faction).value!.map(unit => unit.id).sort();

        for (const id of ids) {
            const unit = this.units.getUnitById(id).value;
            if (!unit || !unit.isAlive || unit.hasActed || this.state.isOver) continue;

            for (const command of this.ai.planUnit(id)) {
                const result = this.apply(command);
                if (result.success) events.push(...result.value);
            }

            // Whatever the plan did, this unit is done
            if (unit.isAlive && !unit.hasActed) {
                this.units.markUnitActed(id);
                events.push({ type: "unitWaited", unitId: id });
            }
        }

        return events;
    }

    /** The game ends when no two factions with living units are hostile to each other. */
    private checkGameOver(): GameEvent[] {
        if (this.state.isOver) return [];

        const standing = this.options.turnOrder.filter(faction => this.hasLivingUnits(faction));
        const fightLeft = standing.some(a => standing.some(b => this.rules.factions.areHostile(a, b)));

        if (fightLeft) return [];

        this.state.isOver = true;
        this.state.winner = standing[0] ?? null;
        return [{ type: "gameOver", winner: this.state.winner }];
    }

    private hasLivingUnits(faction: UnitFaction): boolean {
        return this.units.getUnitsByFaction(faction).value!.some(unit => unit.isAlive);
    }

    private record(events: GameEvent[]): GameEvent[] {
        this.history.push(...events);
        this.version++;

        for (const listener of this.listeners) listener();

        return events;
    }
}
