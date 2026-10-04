import { ICombatManager, IGridManager, IUnitManager } from "./interfaces/manager-interfaces";
import { Result } from "../utils/resultclass";
import { Rng } from "../utils/rng";
import { IUnit } from "../models/units/iunit";
import { Coordinate } from "../models/grid/coordinate";
import { weaponCoversDistance } from "../models/items/weaponitem";
import { Combatant, DisplayStats, Ruleset } from "../rules/ruleset";
import { CombatOutcome, CombatSetup, forecastRoller, resolveCombat, rngRoller } from "../rules/combatresolver";

export class CombatManager implements ICombatManager {
    constructor(
        private units: IUnitManager,
        private grid: IGridManager,
        private rules: Ruleset,
        private rng: Rng,
    ) { }

    forecast(attackerId: string, defenderId: string, from?: Coordinate): Result<CombatOutcome> {
        const setup = this.prepare(attackerId, defenderId, from);
        if (!setup.success) return Result.Fail(setup.err);

        return Result.Success(resolveCombat(setup.value, this.rules.combat, forecastRoller));
    }

    initiateAttack(attackerId: string, defenderId: string): Result<CombatOutcome> {
        const setup = this.prepare(attackerId, defenderId);
        if (!setup.success) return Result.Fail(setup.err);

        const attacker = setup.value.attacker.unit;
        const defender = setup.value.defender.unit;

        if (attacker.hasActed) return Result.Fail(`${attacker.name} has already acted this turn`);

        const outcome = resolveCombat(setup.value, this.rules.combat, rngRoller(this.rng, this.rules.combat.hitRoll));

        this.applyOutcome(attacker, outcome.attackerHp, outcome.attackerWeaponUses);
        this.applyOutcome(defender, outcome.defenderHp, outcome.defenderWeaponUses);
        this.units.markUnitActed(attacker.id);
        this.grid.refreshOccupancy(this.units.getAllUnits().value!);

        return Result.Success(outcome);
    }

    getAttackRange(unitId: string, from?: Coordinate): Result<Coordinate[]> {
        const unitResult = this.units.getUnitById(unitId);
        if (!unitResult.success) return Result.Fail(unitResult.err);

        const unit = unitResult.value;
        const weapon = unit.equippedWeapon;
        const origin = from ?? unit.position;

        if (!weapon || !this.rules.combat.canAttackWith(weapon)) return Result.Success([]);

        const attackRange: Coordinate[] = [];

        for (let dy = -weapon.maxRange; dy <= weapon.maxRange; dy++) {
            for (let dx = -weapon.maxRange; dx <= weapon.maxRange; dx++) {
                const x = origin.x + dx;
                const y = origin.y + dy;

                if (weaponCoversDistance(weapon, Math.abs(dx) + Math.abs(dy)) && this.grid.isValidPosition(x, y)) {
                    attackRange.push({ x, y });
                }
            }
        }

        return Result.Success(attackRange);
    }

    getAttackableTargets(unitId: string, from?: Coordinate): Result<IUnit[]> {
        const range = this.getAttackRange(unitId, from);
        if (!range.success) return Result.Fail(range.err);

        const targets: IUnit[] = [];

        for (const tile of range.value) {
            const target = this.units.getUnitAtPosition(tile.x, tile.y);

            if (target.success && this.canAttackTarget(unitId, target.value.id, from).value) {
                targets.push(target.value);
            }
        }

        return Result.Success(targets);
    }

    canAttackTarget(attackerId: string, targetId: string, from?: Coordinate): Result<boolean> {
        const setup = this.prepare(attackerId, targetId, from);
        if (!setup.success) {
            // A missing unit is an error; anything else is just "no"
            const missing = !this.units.getUnitById(attackerId).success || !this.units.getUnitById(targetId).success;
            return missing ? Result.Fail(setup.err) : Result.Success(false);
        }

        return Result.Success(true);
    }

    getDisplayStats(unitId: string): Result<DisplayStats> {
        const unitResult = this.units.getUnitById(unitId);
        if (!unitResult.success) return Result.Fail(unitResult.err);

        const combatant = this.combatant(unitResult.value, unitResult.value.position);
        if (!combatant.success) return Result.Fail(combatant.err);

        return Result.Success(this.rules.combat.displayStats(combatant.value));
    }

    /** Everything resolveCombat needs, after checking the attack is legal (turn state aside). */
    private prepare(attackerId: string, defenderId: string, from?: Coordinate): Result<CombatSetup> {
        const attackerResult = this.units.getUnitById(attackerId);
        const defenderResult = this.units.getUnitById(defenderId);

        if (!attackerResult.success || !defenderResult.success) {
            return Result.Fail("Could not find one or both units for combat");
        }

        const attacker = attackerResult.value;
        const defender = defenderResult.value;
        const position = from ?? attacker.position;

        if (!attacker.isAlive || !defender.isAlive) return Result.Fail("Both units must be alive to fight");
        if (attacker.id === defender.id) return Result.Fail("A unit can't attack itself");

        if (!this.rules.factions.areHostile(attacker.unitFaction, defender.unitFaction)) {
            return Result.Fail(`${attacker.name} and ${defender.name} are not enemies`);
        }

        const weapon = attacker.equippedWeapon;
        const distance = Math.abs(position.x - defender.position.x) + Math.abs(position.y - defender.position.y);

        if (!weapon || !this.rules.combat.canAttackWith(weapon)) return Result.Fail(`${attacker.name} has no weapon to attack with`);
        if (!weaponCoversDistance(weapon, distance)) return Result.Fail(`${defender.name} is out of range of the ${weapon.name}`);

        const attackerSide = this.combatant(attacker, position);
        const defenderSide = this.combatant(defender, defender.position);
        if (!attackerSide.success) return Result.Fail(attackerSide.err);
        if (!defenderSide.success) return Result.Fail(defenderSide.err);

        return Result.Success({ attacker: attackerSide.value, defender: defenderSide.value, distance });
    }

    private combatant(unit: IUnit, position: Coordinate): Result<Combatant> {
        const terrain = this.grid.getTerrainAt(position.x, position.y);
        if (!terrain.success) return Result.Fail(terrain.err);

        return Result.Success({ unit, weapon: unit.equippedWeapon, terrain: terrain.value });
    }

    /** Write a fight's result back to one unit: HP, weapon wear (a broken weapon is discarded) and death. */
    private applyOutcome(unit: IUnit, hp: number, weaponUses: number | undefined): void {
        unit.stats.currentHealth = hp;

        const weapon = unit.equippedWeapon;

        if (weapon && weaponUses !== undefined) {
            weapon.durability = weaponUses;

            if (weaponUses <= 0) {
                unit.items = unit.items.filter(item => item !== weapon);
                unit.equippedWeapon = undefined;
            }
        }

        if (hp <= 0) this.units.killUnit(unit.id);
    }
}
