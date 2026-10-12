import { WeaponType } from "@/engine/models/items/weaponitem";
import { UnitFaction } from "@/engine/models/units/iunit";
import { CombatOutcome, CombatSideStats, Strike } from "@/engine/rules/combatresolver";

// The battle screen as a timeline counted in frames, 60 a second as on the GBA.
// The flow and the timings follow Fire Emblem: The Sacred Stones' battle
// animation code, as decompiled in fireemblem8u. Each constant names the
// routine it comes from. Building a script never touches the game, and
// sampleBattle() says what's on screen at any frame, so a scene can be drawn,
// skipped or tested at any point.

export const FRAME_MS = 1000 / 60;

export type Side = "left" | "right";
/** Next to each other, a few tiles apart, or too far apart to share the screen. */
export type Range = "close" | "far" | "farfar";
/** How a strike is delivered. A melee weapon used from range is thrown. */
export type AttackStyle = "melee" | "thrown" | "bow" | "magic";
/** What the blow does to the target. */
export type StrikeResult = "hit" | "noDamage" | "miss";

/** What a striker is doing, in order, for each style of attack. */
export type Action =
    | "windup" | "charge" | "dash" | "swing" | "follow" | "recover" | "return"
    | "draw" | "aim" | "loose"
    | "throw"
    | "raise" | "cast" | "hold";

export const opposite = (side: Side): Side => (side === "left" ? "right" : "left");

// --- Layout, in pixels of the GBA's 240-wide screen ---

/** Height of the field above the bottom window (160 minus its 57 pixels). */
export const STAGE_HEIGHT = 103;
/** Where the fighters' feet rest. */
export const FEET_Y = 94;

/**
 * Where each side stands, and how far the camera slides between them
 * (BanimTypesPosLeft/Right and BanimLeftDefaultPos in banim-ekrmain.c).
 * Far apart, the camera favours whoever is acting; farther still, only one
 * fighter fits on screen at a time.
 */
const LAYOUT: Record<Range, { left: number; right: number; pan: number }> = {
    close: { left: 92, right: 148, pan: 0 },
    far: { left: 36, right: 172, pan: 32 },
    farfar: { left: -172, right: 172, pan: 240 },
};

/** How far the camera has slid toward the left fighter, from 0 to 1 (0 when it never moves). */
export const cameraShare = (range: Range, camera: number) => (LAYOUT[range].pan === 0 ? 0 : camera / LAYOUT[range].pan);

/** How close a melee striker runs in to its target. */
const CONTACT = 24;
/** Where a shot leaves the hand and lands, measured from the fighters' feet. */
const HAND_X = 14;
const CHEST_Y = 34;

// --- Timings, in frames ---

/** The map darkens toward the fight (ekrBaStart_SreenFailIn). */
const DIM = 15;
/** Fighters zoom up from their tiles while the platforms and windows slide in (NewEkrUnitKakudai, NewEkrBaseAppear, NewEkrWindowAppear). */
const ZOOM = 11;
/** The map fades to black, then the background fades in (ekrBaStart_8055FE8, ekrBaStart_8056078). */
const FADE = 9;
/** A beat before the first strike (ekrBattleTriggerNewRoundStart). */
const FIRST_STRIKE_DELAY = 31;

/** Melee: wind up, run in, swing, then walk back once the hit has played out (banim_myrm_sw1 mode_attack_close). */
const MELEE = { windup: 24, critWindup: 16, dash: 6, swing: 5, follow: 3, recover: 8, back: 10 };
const BOW = { draw: 20, critDraw: 16, aim: 10, recover: 12 };
const THROWN = { windup: 18, critWindup: 14, toss: 6, recover: 12 };
const MAGIC = { raise: 12, cast: 26, lead: 14, linger: 16, recover: 12 };
/** The glint before a critical: the long hold in the critical animations. */
const CRIT_CHARGE = 36;
/** A shot in the air, which is also how long the camera takes to follow it (EfxHpBar_MoveCameraOnEnd). */
const FLIGHT: Record<Range, number> = { close: 8, far: 16, farfar: 20 };
/** The next striker starts this long before the last one is back in place (start_opposite_turn). */
const HANDOVER = 6;

/** One HP leaves the bar every two frames, and a hit lasts at least half a second (EfxHpBar_DeclineToDeath). */
const HP_STEP = 2;
const HIT_MIN = 30;
/** A dodge lasts as long as the avoid effect (EfxAvoid). */
const AVOID = 30;
/** A hit that does nothing: a short shake (EfxNoDamageYure). */
const NO_DAMAGE = 14;
/** The dodge starts as the swing begins to land (prepare_hp_deplete), and hops back in a few frames. */
const DODGE_LEAD = 3;
const DODGE_MOVE = 4;
const DODGE_DISTANCE = 16;

/** The screen whites out on a normal hit (NewEfxFlashBgWhite(anim, 4)). */
const WHITE_FLASH = 4;
/** The struck fighter flashes white (NewEfxFlashUnit(anim, 0, 8, 0)), and so does its HP bar (NewEfxFlashHPBar(anim, 0, 5)). */
const UNIT_FLASH = 8;
const HP_FLASH = 5;
/** The hit spark plays from frame 4 to frame 24 of a normal hit (efxNormalEffectMain). */
const SPARK_START = 4;
const SPARK_END = 24;
/** The critical background cycles through 16 colours, one a frame (efxCriticalEffectBGCOL). */
const CRIT_BURST = 17;
/** "MISS" and "NO DAMAGE" hang over the target (efxDamageMojiEffectOBJ). */
const TEXT = 50;

/**
 * Dying: the fighter blinks (shown one frame in seven, six times), starts to fade
 * 30 frames in and is gone 60 frames later. The fight carries on after 50
 * (efxDead, efxDeadPika, efxDeadAlpha).
 */
const DEATH = { blinks: 6, blinkCycle: 7, fadeStart: 30, fadeLength: 60, done: 50 };

/** A pause once the last strike is over (ekrBattle_WaitForPostBattleAct). */
const AFTERMATH = 30;
/** "Iron Sword broke!": slides in, stays for 96 frames, slides out (ekrPopup). */
const POPUP = { in: 8, hold: 96, out: 8 };
/** Leaving: name windows, background out, map in, fighters back to their tiles, map brightens (ekrBattleEnding). */
const OUTRO = { names: 7, background: FADE, map: FADE, shrink: 12, undim: 15 };

/** Screen shake per frame for a normal hit and a critical (gEfxQuakeVecs2 and gUnknown_080DA9F8 in banim-efxbattle.c). */
const QUAKE_HIT: readonly [number, number][] = [
    [3, 3], [0, 0], [0, 0], [0, 0], [-3, -3], [0, 0], [0, 0], [3, 3], [0, 0],
    [0, 0], [-3, -3], [0, 0], [3, 3], [0, 0], [-3, -3], [0, 0], [3, 3], [-3, -3],
];

const QUAKE_CRIT: readonly [number, number][] = [
    [6, 6], [0, 0], [0, 0], [0, 0], [-6, -6], [0, 0], [0, 0], [6, 6], [0, 0], [0, 0],
    [-6, -6], [0, 0], [6, 6], [0, 0], [-6, -6], [0, 0], [-4, -4], [0, 0], [4, 4], [0, 0],
    [-4, -4], [0, 0], [4, 4], [0, 0], [-4, -4], [0, 0], [2, 2], [0, 0], [-2, -2], [0, 0],
    [2, 2], [0, 0], [-2, -2], [0, 0], [1, 1], [0, 0], [-1, -1],
];

/** How far a target that took no damage is nudged, per frame (gEfxNoDmgBgShakeOff). */
const NO_DAMAGE_SHAKE = [0, 1, 2, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0];

// --- Choosing sides and styles ---

const friendly = (faction: UnitFaction) => faction === UnitFaction.P1 || faction === UnitFaction.P2;

/**
 * Player and allied units stand on the right and everyone else on the left.
 * When neither side is friendly, the attacker takes the right
 * (GetBanimAllyPosition in banim-ekrbattleintro.c).
 */
export function attackerSide(attacker: UnitFaction, defender: UnitFaction): Side {
    return friendly(attacker) || !friendly(defender) ? "right" : "left";
}

/** One tile apart is close, up to three is far, beyond that farther (PrepareBattleGraphicsMaybe). */
export function rangeOf(distance: number): Range {
    return distance <= 1 ? "close" : distance <= 3 ? "far" : "farfar";
}

export function attackStyle(weapon: WeaponType | undefined, range: Range): AttackStyle {
    switch (weapon) {
        case WeaponType.BOW:
            return "bow";
        case WeaponType.BMAGIC:
        case WeaponType.WMAGIC:
        case WeaponType.STAFF:
            return "magic";
        default:
            return range === "close" ? "melee" : "thrown";
    }
}

// --- The script ---

export interface Phase {
    action: Action;
    start: number;
    end: number;
}

export interface Round {
    strike: Strike;
    striker: Side;
    target: Side;
    style: AttackStyle;
    weapon: WeaponType | undefined;
    crit: boolean;
    result: StrikeResult;
    /** What the striker does, back to back, from its first move until it's back in place. */
    phases: Phase[];
    start: number;
    /** Bow and thrown: the shot leaves the hand. Magic: the spell starts to form at the target. */
    release: number;
    /** The blow lands, or misses. */
    impact: number;
    /** The target's HP bar draining, for a hit that does damage. */
    drain: { from: number; to: number; start: number; end: number } | null;
    /** When the target starts to die, if this blow kills it. */
    death: number | null;
    /** Everything the blow set off has played out, and the camera is on whoever strikes next. */
    settled: number;
    /** The striker is back in place. */
    end: number;
}

export interface Popup {
    side: Side;
    weapon: WeaponType | undefined;
    text: string;
    start: number;
}

export interface SideInfo {
    role: "attacker" | "defender";
    /** Its weapon, HP going in, and Hit, Dmg and Crit for the bottom window. */
    stats: CombatSideStats;
}

interface Pan {
    start: number;
    end: number;
    to: Side;
}

export interface BattleScript {
    range: Range;
    sides: Record<Side, SideInfo>;
    rounds: Round[];
    popups: Popup[];
    /** Camera moves, in order. The camera starts on the attacker. */
    pans: Pan[];
    /** When the windows start to leave. */
    outro: number;
    /** Every frame of the scene, from the map darkening to the map coming back. */
    total: number;
}

export interface BattleSetup {
    outcome: CombatOutcome;
    /** Which side of the screen the attacker stands on. See attackerSide. */
    attackerSide: Side;
}

interface Moves {
    /** Up to the blow (or the shot leaving the hand). */
    phases: Phase[];
    release: number;
    impact: number;
    /** What the striker does while the hit plays out, for at least `minHold` frames after impact. */
    hold: Action;
    minHold: number;
    /** Afterwards, back to standing. */
    after: [Action, number][];
}

/** The striker's moves for one strike, starting at frame `start`. `travel` is how long a shot or spell takes to arrive. */
function choreograph(style: AttackStyle, crit: boolean, start: number, travel: number): Moves {
    const phases: Phase[] = [];
    let at = start;
    const add = (action: Action, length: number) => {
        phases.push({ action, start: at, end: at + length });
        at += length;
    };

    switch (style) {
        case "melee":
            add("windup", crit ? MELEE.critWindup : MELEE.windup);
            if (crit) add("charge", CRIT_CHARGE);
            add("dash", MELEE.dash);
            add("swing", MELEE.swing);
            return { phases, release: at, impact: at, hold: "follow", minHold: MELEE.follow, after: [["recover", MELEE.recover], ["return", MELEE.back]] };

        case "bow":
            add("draw", crit ? BOW.critDraw : BOW.draw);
            if (crit) add("charge", CRIT_CHARGE);
            add("aim", BOW.aim);
            return { phases, release: at, impact: at + travel, hold: "loose", minHold: 0, after: [["recover", BOW.recover]] };

        case "thrown":
            add("windup", crit ? THROWN.critWindup : THROWN.windup);
            if (crit) add("charge", CRIT_CHARGE);
            add("throw", THROWN.toss);
            return { phases, release: at, impact: at + travel, hold: "follow", minHold: 0, after: [["recover", THROWN.recover]] };

        case "magic":
            add("raise", MAGIC.raise);
            if (crit) add("charge", CRIT_CHARGE);
            add("cast", MAGIC.cast);
            return { phases, release: at + travel, impact: at + travel + MAGIC.lead, hold: "hold", minHold: MAGIC.linger, after: [["recover", MAGIC.recover]] };
    }
}

/** Work out the whole battle screen for a fight, frame by frame. */
export function buildBattleScript({ outcome, attackerSide: side }: BattleSetup): BattleScript {
    const range = rangeOf(outcome.distance);
    const sideOf = (by: Strike["by"]): Side => (by === "attacker" ? side : opposite(side));

    const attacker: SideInfo = { role: "attacker", stats: outcome.attacker };
    const defender: SideInfo = { role: "defender", stats: outcome.defender };
    const sides: Record<Side, SideInfo> = side === "left" ? { left: attacker, right: defender } : { left: defender, right: attacker };

    const hp: Record<Side, number> = { left: sides.left.stats.hp, right: sides.right.stats.hp };
    const rounds: Round[] = [];
    const pans: Pan[] = [];
    const flight = FLIGHT[range];

    let camera = side;
    let start = DIM + ZOOM + FIRST_STRIKE_DELAY;

    const panTo = (to: Side, from: number) => {
        if (range === "close" || camera === to) return 0;
        pans.push({ start: from, end: from + flight, to });
        camera = to;
        return flight;
    };

    outcome.strikes.forEach((strike, index) => {
        const striker = sideOf(strike.by);
        const target = opposite(striker);
        const weapon = sides[striker].stats.weaponType;
        const style = attackStyle(weapon, range);
        const result: StrikeResult = !strike.hit ? "miss" : strike.damage > 0 ? "hit" : "noDamage";

        const travel = style === "melee" || (style === "magic" && range === "close") ? 0 : flight;
        const moves = choreograph(style, strike.crit, start, travel);
        const { phases, release, impact } = moves;

        // Shots and spells take the camera with them to the target
        if (travel > 0) panTo(target, release - (style === "magic" ? travel : 0));

        let drain: Round["drain"] = null;
        let death: number | null = null;
        let settled: number;

        const after = strike.by === "attacker" ? strike.defenderHp : strike.attackerHp;

        if (result === "hit") {
            drain = { from: hp[target], to: after, start: impact, end: impact + (hp[target] - after) * HP_STEP };
            settled = impact + Math.max(HIT_MIN, drain.end - impact);

            if (after <= 0) {
                death = settled;
                settled += DEATH.done;
            }
        } else {
            settled = impact + (result === "miss" ? AVOID : NO_DAMAGE);
        }

        hp[target] = after;

        // Once the hit has played out, the camera moves on to whoever strikes next
        const next = outcome.strikes[index + 1];
        if (next) settled += panTo(sideOf(next.by), settled);

        // The striker holds its follow-through until then, then recovers
        const holdStart = phases[phases.length - 1].end;
        const recoverAt = Math.max(settled, impact + moves.minHold);
        if (recoverAt > holdStart) phases.push({ action: moves.hold, start: holdStart, end: recoverAt });

        let at = recoverAt;
        for (const [action, length] of moves.after) {
            phases.push({ action, start: at, end: at + length });
            at += length;
        }

        rounds.push({ strike, striker, target, style, weapon, crit: strike.crit, result, phases, start, release, impact, drain, death, settled, end: at });

        // The next striker starts as this one heads back, unless it's the same fighter
        start = next && sideOf(next.by) !== striker ? Math.max(settled, at - HANDOVER) : at;
    });

    const lastFrame = Math.max(
        start,
        ...rounds.map(round => round.end),
        ...rounds.map(round => (round.death === null ? 0 : round.death + DEATH.fadeStart + DEATH.fadeLength)),
    );

    let at = lastFrame + AFTERMATH;
    const popups: Popup[] = [];

    for (const round of rounds) {
        if (!round.strike.weaponBroke) continue;

        const name = sides[round.striker].stats.weaponName ?? "Weapon";
        popups.push({ side: round.striker, weapon: round.weapon, text: `${name} broke!`, start: at });
        at += POPUP.in + POPUP.hold + POPUP.out;
    }

    const outro = at;
    const total = outro + OUTRO.names + OUTRO.background + OUTRO.map + OUTRO.shrink + OUTRO.undim;

    return { range, sides, rounds, popups, pans, outro, total };
}

// --- What's on screen at a given frame ---

export interface FighterFrame {
    /** Where its feet are, in screen pixels across the field (camera included). */
    x: number;
    /** Pixels above the platform. */
    lift: number;
    /** Leaning back while dodging or hurt, and the like. "idle" when doing nothing in particular. */
    action: Action | "idle" | "dodge" | "hurt";
    /** How far through that action, from 0 to 1. */
    progress: number;
    /** Drawn all white: just hit, or glinting before a critical. */
    flash: boolean;
    /** Charging a critical, from 0 to 1. */
    charge: number | null;
    /** Its weapon is in its hands (not in the air). */
    armed: boolean;
    /** Blinking out as it dies. */
    visible: boolean;
    opacity: number;
    hp: number;
    /** HP is draining: the number swells. */
    hpPulse: boolean;
    hpFlash: boolean;
}

export interface Projectile {
    weapon: WeaponType | undefined;
    style: "bow" | "thrown";
    from: Side;
    x: number;
    y: number;
    progress: number;
}

export interface Spell {
    weapon: WeaponType | undefined;
    /** The caster's circle while casting, then the spell on the target. */
    stage: "circle" | "effect";
    side: Side;
    x: number;
    /** 0 to 1. The blow lands at `impactAt`. */
    progress: number;
    impactAt: number;
}

export interface BattleFrame {
    left: FighterFrame;
    right: FighterFrame;
    /** Screen shake, in pixels. */
    quake: { x: number; y: number };
    /** The whole screen whited out. */
    whiteFlash: boolean;
    /** The critical burst behind the target: which of its 16 colours. */
    critBurst: { side: Side; x: number; step: number } | null;
    /** The hit spark on the target, 0 to 1. */
    spark: { side: Side; x: number; progress: number } | null;
    projectile: Projectile | null;
    spell: Spell | null;
    texts: { side: Side; x: number; text: string; age: number }[];
    /** Camera offset in pixels: the field slides right by this much. */
    camera: number;
    /** Where each side stands when not moving (camera included): the middle of its platform. */
    home: Record<Side, number>;
    popup: { popup: Popup; progress: number } | null;

    // Coming in and going out
    /** How far the dimming has closed in on the fight: 0 is none, 1 is the whole map. */
    focus: number;
    /** The map faded to black, 0 to 1. */
    black: number;
    /** The battle background, 0 to 1. */
    background: number;
    /** The bottom window and the platforms, slid in from 0 to 1. */
    windows: number;
    /** The name windows at the top, slid in from 0 to 1. */
    names: number;
    /** 0: fighters drawn small on their map tiles. 1: in place for the fight. */
    zoom: number;
    /** The units' map tokens, drawn over the map while it shows. */
    tokens: number;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const progressOf = (frame: number, start: number, end: number) => (end <= start ? 1 : clamp01((frame - start) / (end - start)));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

/** The camera offset at a frame: it starts on the attacker and follows the pans. */
function cameraAt(script: BattleScript, attacker: Side, frame: number): number {
    const { pan } = LAYOUT[script.range];
    const offset = (side: Side) => (side === "left" ? pan : 0);
    let at = offset(attacker);

    for (const step of script.pans) {
        if (frame < step.start) break;
        const t = progressOf(frame, step.start, step.end);
        at = lerp(at, offset(step.to), t);
        if (t < 1) break;
    }

    return at;
}

function hpAt(script: BattleScript, side: Side, frame: number): number {
    let hp = script.sides[side].stats.hp;

    for (const round of script.rounds) {
        if (round.target !== side || !round.drain || frame < round.drain.start) continue;
        const { from, to, start } = round.drain;
        hp = from - Math.min(from - to, Math.floor((frame - start) / HP_STEP));
    }

    return hp;
}

/** Ease in when sliding in (Interpolate SQUARE), ease out when sliding away (RSQUARE). */
const slideIn = (frame: number, start: number, length: number) => progressOf(frame, start, start + length) ** 2;
const slideOut = (frame: number, start: number, length: number) => (1 - progressOf(frame, start, start + length)) ** 2;

export function sampleBattle(script: BattleScript, frame: number): BattleFrame {
    const attacker: Side = script.sides.left.role === "attacker" ? "left" : "right";
    const layout = LAYOUT[script.range];
    const camera = cameraAt(script, attacker, frame);
    const home = (side: Side) => layout[side] + camera;
    const facing = (side: Side) => (side === "left" ? 1 : -1);

    const fighter = (side: Side): FighterFrame => ({
        x: home(side),
        lift: 0,
        action: "idle",
        progress: 0,
        flash: false,
        charge: null,
        armed: true,
        visible: true,
        opacity: 1,
        hp: hpAt(script, side, frame),
        hpPulse: false,
        hpFlash: false,
    });

    const view: BattleFrame = {
        left: fighter("left"),
        right: fighter("right"),
        quake: { x: 0, y: 0 },
        whiteFlash: false,
        critBurst: null,
        spark: null,
        projectile: null,
        spell: null,
        texts: [],
        camera,
        home: { left: home("left"), right: home("right") },
        popup: null,
        focus: 1,
        black: 1,
        background: 1,
        windows: 1,
        names: 1,
        zoom: 1,
        tokens: 0,
    };

    for (const round of script.rounds) {
        const striker = view[round.striker];
        const target = view[round.target];
        const contact = home(round.target) - facing(round.striker) * CONTACT;
        const since = frame - round.impact;

        // The striker
        const phase = round.phases.find(p => frame >= p.start && frame < p.end);
        if (phase) {
            const t = progressOf(frame, phase.start, phase.end);
            striker.action = phase.action;
            striker.progress = t;

            if (round.style === "melee") {
                if (phase.action === "dash") striker.x = lerp(home(round.striker), contact, easeOut(t));
                else if (phase.action === "swing" || phase.action === "follow" || phase.action === "recover") striker.x = contact;
                else if (phase.action === "return") striker.x = lerp(contact, home(round.striker), t);
            }

            if (phase.action === "charge") {
                striker.charge = t;
                striker.flash = Math.floor((frame - phase.start) / 4) % 2 === 0;
            }

            if (round.style === "thrown" && (phase.action === "follow" || (phase.action === "throw" && t >= 1))) striker.armed = false;
        }

        // The shot or spell on its way
        if (round.style === "bow" || round.style === "thrown") {
            if (frame >= round.release && frame < round.impact) {
                const t = progressOf(frame, round.release, round.impact);
                const fromX = home(round.striker) + facing(round.striker) * HAND_X;
                const toX = home(round.target) - facing(round.striker) * 6;
                const arc = round.style === "thrown" ? Math.sin(Math.PI * t) * 10 : 0;

                view.projectile = { weapon: round.weapon, style: round.style, from: round.striker, x: lerp(fromX, toX, t), y: FEET_Y - CHEST_Y - arc, progress: t };
            }
        } else if (round.style === "magic") {
            const cast = round.phases.find(p => p.action === "cast")!;

            if (frame >= cast.start && frame < cast.end) {
                view.spell = { weapon: round.weapon, stage: "circle", side: round.striker, x: home(round.striker), progress: progressOf(frame, cast.start, cast.end), impactAt: 1 };
            } else if (frame >= round.release && frame < round.impact + MAGIC.linger) {
                const length = round.impact + MAGIC.linger - round.release;
                view.spell = {
                    weapon: round.weapon,
                    stage: "effect",
                    side: round.target,
                    x: home(round.target),
                    progress: progressOf(frame, round.release, round.impact + MAGIC.linger),
                    impactAt: (round.impact - round.release) / length,
                };
            }
        }

        // The target
        if (round.result === "miss") {
            const dodgeStart = round.impact - DODGE_LEAD;
            const backStart = round.settled;

            if (frame >= dodgeStart && frame < backStart + DODGE_MOVE) {
                const out = progressOf(frame, dodgeStart, dodgeStart + DODGE_MOVE);
                const back = progressOf(frame, backStart, backStart + DODGE_MOVE);
                const away = easeOut(out) * (1 - back);

                // Hop back, away from the striker, and step in again once it's over
                target.action = "dodge";
                target.progress = frame < backStart ? out : 1 - back;
                target.x = home(round.target) - facing(round.target) * DODGE_DISTANCE * away;
                target.lift = frame < dodgeStart + DODGE_MOVE ? Math.sin(Math.PI * out) * 6 : 0;
            }

            if (since >= 0 && since < TEXT) view.texts.push({ side: round.target, x: home(round.target), text: "MISS", age: since });
        } else if (round.result === "noDamage") {
            if (since >= 0 && since < NO_DAMAGE_SHAKE.length) {
                target.x += (round.target === "left" ? 1 : -1) * NO_DAMAGE_SHAKE[since];
            }

            if (since >= 0 && since < TEXT) view.texts.push({ side: round.target, x: home(round.target), text: "NO DAMAGE", age: since });
        } else if (since >= 0) {
            if (since < UNIT_FLASH) {
                target.action = "hurt";
                target.progress = since / UNIT_FLASH;
                target.flash = true;
            }

            target.hpFlash ||= since < HP_FLASH;
            target.hpPulse ||= frame < round.impact + Math.max(HIT_MIN, round.drain!.end - round.impact);

            const quake = round.crit ? QUAKE_CRIT : QUAKE_HIT;
            if (since < quake.length) view.quake = { x: quake[since][0], y: quake[since][1] };

            if (round.crit) {
                if (since < CRIT_BURST) view.critBurst = { side: round.target, x: home(round.target), step: Math.min(15, since) };
            } else {
                view.whiteFlash ||= since < WHITE_FLASH;
                if (since >= SPARK_START && since < SPARK_END) {
                    view.spark = { side: round.target, x: home(round.target), progress: progressOf(since, SPARK_START, SPARK_END) };
                }
            }
        }

        if (round.death !== null && frame >= round.death) {
            const age = frame - round.death;
            const blinking = age < DEATH.blinks * DEATH.blinkCycle;

            target.visible = !blinking || age % DEATH.blinkCycle === DEATH.blinkCycle - 1;
            target.opacity = 1 - progressOf(age, DEATH.fadeStart, DEATH.fadeStart + DEATH.fadeLength);
            if (target.opacity <= 0) target.visible = false;
        }
    }

    for (const popup of script.popups) {
        const length = POPUP.in + POPUP.hold + POPUP.out;
        if (frame >= popup.start && frame < popup.start + length) view.popup = { popup, progress: (frame - popup.start) / length };
    }

    // Coming in
    const zoomStart = DIM;
    view.focus = progressOf(frame, 0, DIM);
    view.zoom = progressOf(frame, zoomStart, zoomStart + ZOOM);
    view.windows = slideIn(frame, zoomStart, ZOOM);
    view.names = view.windows;
    view.black = progressOf(frame, zoomStart + ZOOM, zoomStart + ZOOM + FADE);
    view.background = progressOf(frame, zoomStart + ZOOM + FADE, zoomStart + ZOOM + 2 * FADE);
    view.tokens = 1 - progressOf(frame, zoomStart, zoomStart + 3);

    // Going out
    if (frame >= script.outro) {
        let at = script.outro;
        view.names = slideOut(frame, at, OUTRO.names);
        at += OUTRO.names;
        view.background = 1 - progressOf(frame, at, at + OUTRO.background);
        at += OUTRO.background;
        view.black = 1 - progressOf(frame, at, at + OUTRO.map);
        at += OUTRO.map;
        view.windows = slideOut(frame, at, OUTRO.shrink);
        view.zoom = 1 - progressOf(frame, at, at + OUTRO.shrink);
        view.tokens = progressOf(frame, at + OUTRO.shrink - 3, at + OUTRO.shrink);
        at += OUTRO.shrink;
        view.focus = 1 - progressOf(frame, at, at + OUTRO.undim);
    }

    return view;
}
