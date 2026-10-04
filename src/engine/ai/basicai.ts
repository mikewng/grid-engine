import { Coordinate, coordinateKey } from "../models/grid/coordinate";
import { GameCommand } from "../models/game/gamestate";
import { IUnit } from "../models/units/iunit";
import { currentMovement } from "../models/units/statuseffects";
import { ICombatManager, IMovementManager, IUnitManager } from "../managers/interfaces/manager-interfaces";
import { AiController } from "../managers/gamemanager";
import { Ruleset } from "../rules/ruleset";
import { costAt, pathTo } from "../utils/pathing/distancemap";

const KILL_BONUS = 50;

/**
 * A straightforward AI. If the unit can reach an attack this turn it takes the
 * best-scoring one (expected damage dealt, a bonus for kills, minus expected
 * damage taken). Otherwise it marches toward the nearest enemy it can reach.
 */
export class BasicAi implements AiController {
    constructor(
        private units: IUnitManager,
        private movement: IMovementManager,
        private combat: ICombatManager,
        private rules: Ruleset,
    ) { }

    planUnit(unitId: string): GameCommand[] {
        const unit = this.units.getUnitById(unitId).value;
        if (!unit || !unit.isAlive) return [];

        const attack = this.bestAttack(unit);

        if (attack) {
            const commands: GameCommand[] = [];

            if (attack.from.x !== unit.position.x || attack.from.y !== unit.position.y) {
                commands.push({ type: "moveTo", unitId, destination: attack.from });
            }

            commands.push({ type: "attack", unitId, targetId: attack.targetId });
            return commands;
        }

        const approach = this.approachTile(unit);

        if (approach && (approach.x !== unit.position.x || approach.y !== unit.position.y)) {
            return [{ type: "moveTo", unitId, destination: approach }, { type: "wait", unitId }];
        }

        return [{ type: "wait", unitId }];
    }

    private bestAttack(unit: IUnit): { from: Coordinate; targetId: string } | null {
        const range = this.movement.getMovementRange(unit.id);
        const map = this.movement.getDistanceMap(unit.id);
        if (!range.success || !map.success) return null;

        let best: { from: Coordinate; targetId: string; score: number; cost: number } | null = null;

        for (const tile of range.value) {
            const targets = this.combat.getAttackableTargets(unit.id, tile).value ?? [];

            for (const target of targets) {
                const forecast = this.combat.forecast(unit.id, target.id, tile);
                if (!forecast.success) continue;

                const f = forecast.value;
                const dealt = (f.defender.hp - f.defenderHp) * (f.attacker.hitRate / 100);
                const taken = (f.attacker.hp - f.attackerHp) * (f.defender.hitRate / 100);
                const score = dealt - taken + (f.defenderKilled ? KILL_BONUS * (f.attacker.hitRate / 100) : 0);
                const cost = costAt(map.value, tile) ?? 0;

                // Prefer higher scores, then shorter moves
                if (!best || score > best.score || (score === best.score && cost < best.cost)) {
                    best = { from: tile, targetId: target.id, score, cost };
                }
            }
        }

        return best;
    }

    /** The farthest tile this turn along the cheapest route to a tile next to the nearest reachable enemy. */
    private approachTile(unit: IUnit): Coordinate | null {
        const map = this.movement.getDistanceMap(unit.id, { budget: Infinity });
        if (!map.success) return null;

        const enemies = (this.units.getAliveUnits().value ?? [])
            .filter(other => this.rules.factions.areHostile(unit.unitFaction, other.unitFaction))
            .sort((a, b) => a.id.localeCompare(b.id));

        let goal: { tile: Coordinate; cost: number } | null = null;

        for (const enemy of enemies) {
            for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
                const tile = { x: enemy.position.x + dx, y: enemy.position.y + dy };
                const cost = costAt(map.value, tile);

                if (cost !== undefined && (!goal || cost < goal.cost)) goal = { tile, cost };
            }
        }

        if (!goal) return null;

        const path = pathTo(map.value, goal.tile) ?? [];
        const budget = currentMovement(unit);
        const stops = new Set((this.movement.getMovementRange(unit.id).value ?? []).map(coordinateKey));

        // Walk back from the farthest affordable step to one we're allowed to stop on
        for (let i = path.length - 1; i >= 0; i--) {
            const cost = costAt(map.value, path[i]) ?? Infinity;

            if (cost <= budget && stops.has(coordinateKey(path[i]))) return path[i];
        }

        return null;
    }
}
