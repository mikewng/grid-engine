import { UnitStats, UnitStatusType } from "../units/iunit";
import { BaseItem } from "./item";

export interface ItemEffect {
    id: string;
    type: EffectType;
    trigger: EffectTrigger;
    conditions?: EffectCondition[];
    modifiers: EffectModifier[];
    duration?: number;
    stackable?: boolean;
}

export enum EffectType {
    HEAL = 'heal',
    DAMAGE = 'damage',
    STAT_CHANGE = 'stat_change',
    STATUS_EFFECT = 'status_effect',
    STAT_BOOST = 'stat_boost',
    RESISTANCE = 'resistance',
    SKILL_GRANT = 'skill_grant',
    TELEPORT = 'teleport',
    REVEAL_MAP = 'reveal_map',
    UNLOCK_DOOR = 'unlock_door',
    WEAPON_TRIANGLE_BOOST = 'weapon_triangle_boost',
    CRITICAL_RATE_BOOST = 'critical_rate_boost',
    FOLLOW_UP_ATTACK = 'follow_up_attack',
    MOVEMENT_BOOST = 'movement_boost',
    RANGE_BOOST = 'range_boost'
}

export enum EffectTrigger {
    ON_USE = 'on_use',
    ON_EQUIP = 'on_equip',
    ON_UNEQUIP = 'on_unequip',
    ON_COMBAT_START = 'on_combat_start',
    ON_COMBAT_END = 'on_combat_end',
    ON_TURN_START = 'on_turn_start',
    ON_TURN_END = 'on_turn_end',
    ON_DAMAGE_TAKEN = 'on_damage_taken',
    ON_DAMAGE_DEALT = 'on_damage_dealt',
    ON_KILL = 'on_kill',
    ON_MOVE = 'on_move',
    PASSIVE = 'passive'
}

export interface EffectCondition {
    type: ConditionType;
    value: any;
    comparison?: 'equals' | 'greater' | 'less' | 'greater_equal' | 'less_equal';
}

export enum ConditionType {
    HEALTH_PERCENTAGE = 'health_percentage',
    STAT_VALUE = 'stat_value',
    ENEMY_TYPE = 'enemy_type',
    TERRAIN_TYPE = 'terrain_type',
    TIME_OF_DAY = 'time_of_day',
    ADJACENT_ALLIES = 'adjacent_allies',
    EQUIPPED_WEAPON_TYPE = 'equipped_weapon_type',
    STATUS_EFFECT_ACTIVE = 'status_effect_active'
}

export interface EffectModifier {
    type: ModifierType;
    value: number | string | Partial<UnitStats>;
    target?: EffectTarget;
    range?: number;
}

export enum ModifierType {
    STAT_FLAT = 'stat_flat',
    STAT_PERCENTAGE = 'stat_percentage',
    HEAL_FLAT = 'heal_flat',
    HEAL_PERCENTAGE = 'heal_percentage',
    DAMAGE_FLAT = 'damage_flat',
    DAMAGE_PERCENTAGE = 'damage_percentage',
    STATUS_APPLY = 'status_apply',
    STATUS_REMOVE = 'status_remove',
    TELEPORT_TO = 'teleport_to',
    GRANT_SKILL = 'grant_skill'
}

export enum EffectTarget {
    SELF = 'self',
    TARGET = 'target',
    ALL_ALLIES = 'all_allies',
    ALL_ENEMIES = 'all_enemies',
    ADJACENT_ALLIES = 'adjacent_allies',
    ADJACENT_ENEMIES = 'adjacent_enemies',
    AREA_OF_EFFECT = 'area_of_effect'
}

export interface ItemUseResult {
    success: boolean;
    effects: AppliedEffect[];
    itemConsumed: boolean;
    message?: string;
}

export interface AppliedEffect {
    effectId: string;
    targetUnitId: string;
    type: EffectType;
    value: any;
    duration?: number;
}