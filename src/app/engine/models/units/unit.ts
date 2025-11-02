import { UnitStats, UnitGrowths, UnitStatusEffect, UnitStatusType, UnitFaction, IUnit } from "@/app/engine/models/units/iunit";
import { UnitClass } from "./unitclass";
import { UnitSkill } from "./unitskills";
import { WeaponItem } from "../items/weaponitem";
import { BaseItem } from "../items/item";

export class Unit implements IUnit {
    readonly id: string;
    readonly unitTypeId: string;
    name: string;
    position: { x: number; y: number };
    unitClass: UnitClass;
    stats: UnitStats;
    growths: UnitGrowths;
    skills: UnitSkill[];
    equippedWeapon: WeaponItem | undefined;
    items: BaseItem[];
    range: number;
    isAlive: boolean;
    hasActed: boolean;
    statusEffects: UnitStatusEffect[];
    unitFaction: UnitFaction;

    constructor(
        id: string,
        unitTypeId: string,
        name: string,
        position: { x: number; y: number },
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
        this.range = 1;
        this.isAlive = true;
        this.hasActed = false;
        this.statusEffects = [];
    }

    equipWeapon(weapon: WeaponItem): void {
        this.equippedWeapon = weapon;
        this.range = weapon.range;
    }

    unequipWeapon(): void {
        this.equippedWeapon = undefined;
        this.range = 1;
    }

    addItem(item: BaseItem): void {
        this.items.push(item);
    }

    removeItem(itemId: string): boolean {
        const index = this.items.findIndex(item => item.id === itemId);
        if (index !== -1) {
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
            existingEffect.instensity = Math.max(existingEffect.instensity, effect.instensity);
        } else {
            this.statusEffects.push(effect);
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
        this.hasActed = false;
    }

    markActed(): void {
        this.hasActed = true;
    }

    processStatusEffects(): void {
        this.statusEffects.forEach(effect => {
            switch (effect.type) {
                case UnitStatusType.POISON:
                    this.takeDamage(effect.instensity);
                    break;
                case UnitStatusType.SLOW:
                    break;
                case UnitStatusType.HASTE:
                    break;
                case UnitStatusType.STUN:
                    this.hasActed = true;
                    break;
            }
            effect.duration--;
        });

        this.statusEffects = this.statusEffects.filter(effect => effect.duration > 0);
    }

    getCurrentMovement(): number {
        const baseMovement = this.stats.movement;
        const hasteBonus = this.statusEffects.find(e => e.type === UnitStatusType.HASTE)?.instensity || 0;
        const slowPenalty = this.statusEffects.find(e => e.type === UnitStatusType.SLOW)?.instensity || 0;

        return Math.max(1, baseMovement + hasteBonus - slowPenalty);
    }

    getEffectiveStats(): UnitStats {
        return { ...this.stats };
    }

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
        cloned.equippedWeapon = this.equippedWeapon;
        cloned.items = [...this.items];
        cloned.range = this.range;
        cloned.isAlive = this.isAlive;
        cloned.hasActed = this.hasActed;
        cloned.statusEffects = [...this.statusEffects];

        return cloned;
    }
}