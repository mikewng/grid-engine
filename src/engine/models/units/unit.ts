import { UnitStats, UnitGrowths, UnitStatusEffect, UnitStatusType, UnitFaction, IUnit } from "./iunit";
import { UnitClass } from "./unitclass";
import { UnitSkill } from "./unitskills";
import { createWeapon, WeaponDefinition, WeaponItem } from "../items/weaponitem";
import { BaseItem } from "../items/item";
import { Coordinate } from "../grid/coordinate";
import { currentMovement, tickStatusEffects } from "./statuseffects";

export class Unit implements IUnit {
    readonly id: string;
    readonly unitTypeId: string;
    name: string;
    position: Coordinate;
    unitClass: UnitClass;
    stats: UnitStats;
    growths: UnitGrowths;
    skills: UnitSkill[];
    equippedWeapon: WeaponItem | undefined;
    items: BaseItem[];
    isAlive: boolean;
    hasMoved: boolean;
    hasActed: boolean;
    statusEffects: UnitStatusEffect[];
    unitFaction: UnitFaction;

    constructor(
        id: string,
        unitTypeId: string,
        name: string,
        position: Coordinate,
        unitClass: UnitClass,
        stats: UnitStats,
        growths: UnitGrowths,
        unitFaction: UnitFaction
    ) {
        this.id = id;
        this.unitTypeId = unitTypeId;
        this.name = name;
        this.position = position;
        this.unitClass = unitClass;
        this.stats = stats;
        this.growths = growths;
        this.unitFaction = unitFaction;

        this.skills = [];
        this.equippedWeapon = undefined;
        this.items = [];
        this.isAlive = true;
        this.hasMoved = false;
        this.hasActed = false;
        this.statusEffects = [];
    }

    /** Equip a weapon, adding it to the inventory if it isn't there yet. */
    equipWeapon(weapon: WeaponItem): void {
        if (!this.items.includes(weapon)) {
            this.items.push(weapon);
        }

        this.equippedWeapon = weapon;
    }

    unequipWeapon(): void {
        this.equippedWeapon = undefined;
    }

    addItem(item: BaseItem): void {
        this.items.push(item);
    }

    removeItem(itemId: string): boolean {
        const index = this.items.findIndex(item => item.id === itemId);
        if (index !== -1) {
            if (this.equippedWeapon?.id === itemId) {
                this.equippedWeapon = undefined;
            }

            this.items.splice(index, 1);
            return true;
        }
        return false;
    }

    addSkill(skill: UnitSkill): void {
        if (!this.skills.find(s => s.id === skill.id)) {
            this.skills.push(skill);
        }
    }

    removeSkill(skillId: string): boolean {
        const index = this.skills.findIndex(skill => skill.id === skillId);
        if (index !== -1) {
            this.skills.splice(index, 1);
            return true;
        }
        return false;
    }

    addStatusEffect(effect: UnitStatusEffect): void {
        const existingEffect = this.statusEffects.find(e => e.type === effect.type);
        if (existingEffect) {
            existingEffect.duration = Math.max(existingEffect.duration, effect.duration);
            existingEffect.intensity = Math.max(existingEffect.intensity, effect.intensity);
        } else {
            this.statusEffects.push({ ...effect });
        }
    }

    removeStatusEffect(effectType: UnitStatusType): boolean {
        const index = this.statusEffects.findIndex(effect => effect.type === effectType);
        if (index !== -1) {
            this.statusEffects.splice(index, 1);
            return true;
        }
        return false;
    }

    takeDamage(damage: number): void {
        this.stats.currentHealth = Math.max(0, this.stats.currentHealth - damage);
        if (this.stats.currentHealth <= 0) {
            this.isAlive = false;
        }
    }

    heal(amount: number): void {
        this.stats.currentHealth = Math.min(this.stats.maxHealth, this.stats.currentHealth + amount);
        if (this.stats.currentHealth > 0) {
            this.isAlive = true;
        }
    }

    resetActionState(): void {
        this.hasMoved = false;
        this.hasActed = false;
    }

    markActed(): void {
        this.hasMoved = true;
        this.hasActed = true;
    }

    processStatusEffects(): number {
        return tickStatusEffects(this).damage;
    }

    getCurrentMovement(): number {
        return currentMovement(this);
    }

    getEffectiveStats(): UnitStats {
        return { ...this.stats };
    }

    /** A copy that shares nothing mutable with this unit, including its items. */
    clone(): Unit {
        const cloned = new Unit(
            this.id,
            this.unitTypeId,
            this.name,
            { ...this.position },
            { ...this.unitClass },
            { ...this.stats },
            { ...this.growths },
            this.unitFaction
        );

        cloned.skills = [...this.skills];
        cloned.items = this.items.map(item => ({ ...item }));
        cloned.equippedWeapon = this.equippedWeapon
            ? cloned.items[this.items.indexOf(this.equippedWeapon)] as WeaponItem
            : undefined;
        cloned.isAlive = this.isAlive;
        cloned.hasMoved = this.hasMoved;
        cloned.hasActed = this.hasActed;
        cloned.statusEffects = this.statusEffects.map(effect => ({ ...effect }));

        return cloned;
    }
}

/** A unit as written in game data, before the engine creates it. */
export interface UnitTemplate {
    id: string;
    unitTypeId: string;
    name: string;
    position: Coordinate;
    unitClass: UnitClass;
    stats: UnitStats;
    growths: UnitGrowths;
    faction: UnitFaction;
    /** Weapons it carries; the first one is equipped. */
    weapons?: WeaponDefinition[];
    skills?: UnitSkill[];
}

/**
 * A fresh unit from a template, with its own copies of its stats and weapons,
 * so starting a game twice never shares state between the two.
 */
export function createUnit(template: UnitTemplate): Unit {
    const unit = new Unit(
        template.id,
        template.unitTypeId,
        template.name,
        { ...template.position },
        { ...template.unitClass },
        { ...template.stats },
        { ...template.growths },
        template.faction
    );

    (template.weapons ?? []).forEach((definition, i) => {
        const weapon = createWeapon(definition, `${template.id}-${definition.itemTypeId}-${i}`);

        if (i === 0) unit.equipWeapon(weapon);
        else unit.addItem(weapon);
    });

    for (const skill of template.skills ?? []) {
        unit.addSkill(skill);
    }

    return unit;
}
