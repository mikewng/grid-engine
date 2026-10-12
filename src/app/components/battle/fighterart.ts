import { WeaponType } from "@/engine/models/items/weaponitem";
import { UnitFaction } from "@/engine/models/units/iunit";
import { MovementType } from "@/engine/models/units/unitclass";
import { COLORS, FACTION_COLORS, hairShadow } from "@/app/components/pixel/palettes";
import { FighterFrame } from "./battlescript";

// A fighter on the battle screen, drawn on a canvas facing right in an 80 x 72
// box with its feet at (40, 70); flip the canvas to face left. One unit is one
// pixel of the battle screen. The pose comes from what the battle script says
// the fighter is doing, so the same figure winds up, swings, dodges and casts.
// The scene snaps the result to hard pixels and outlines it afterwards.

export const FIGURE = { width: 80, height: 72, footX: 40, footY: 70 };

type Grip = "blade" | "axe" | "spear" | "bow" | "tome" | "staff" | "none";

const GRIPS: Record<WeaponType, Grip> = {
    [WeaponType.SWORD]: "blade",
    [WeaponType.AXE]: "axe",
    [WeaponType.SPEAR]: "spear",
    [WeaponType.BOW]: "bow",
    [WeaponType.STAFF]: "staff",
    [WeaponType.BMAGIC]: "tome",
    [WeaponType.WMAGIC]: "tome",
};

const gripOf = (weapon: WeaponType | undefined): Grip => (weapon === undefined ? "none" : GRIPS[weapon]);

interface Pose {
    /** Degrees, forward is positive. */
    lean: number;
    /** Front arm, degrees from pointing straight ahead; down is positive. */
    arm: number;
    /** The weapon's angle in the hand, relative to the arm. */
    grip: number;
    /** The arm pushed forward, in pixels (a thrust). */
    reach: number;
    crouch: number;
    /** Legs apart while running, from -1 to 1. */
    stride: number;
    /** Pixels, up is negative. */
    bob: number;
    /** Bowstring drawn, 0 to 1. */
    pull: number;
}

const BASE: Pose = { lean: 0, arm: 60, grip: 0, reach: 0, crouch: 0.05, stride: 0, bob: 0, pull: 0 };

/** Standing ready. */
const STANCE: Record<Grip, Partial<Pose>> = {
    blade: { arm: 55, grip: -105 },
    axe: { arm: 62, grip: -120 },
    spear: { arm: 35, grip: -45 },
    bow: { arm: 70, grip: -10 },
    tome: { arm: 40, grip: -40 },
    staff: { arm: 65, grip: -155 },
    none: { arm: 60 },
};

/** Weapon drawn back, about to strike. */
const RAISED: Record<Grip, Partial<Pose>> = {
    blade: { lean: -10, arm: -125, grip: -50, crouch: 0.35 },
    axe: { lean: -12, arm: -150, grip: -30, crouch: 0.4 },
    spear: { lean: -8, arm: 25, grip: -25, reach: -7, crouch: 0.35 },
    bow: { arm: 0, grip: 0, lean: -2 },
    tome: { arm: -55, grip: -20, lean: -6 },
    staff: { arm: -60, grip: -40, lean: -6 },
    none: { lean: -8, arm: -40, crouch: 0.3, reach: -4 },
};

/** The blow just landed (or the shot or spell is away). */
const STRUCK: Record<Grip, Partial<Pose>> = {
    blade: { lean: 22, arm: 70, grip: -10, crouch: 0.45 },
    axe: { lean: 26, arm: 85, grip: -15, crouch: 0.5 },
    spear: { lean: 20, arm: 5, grip: -5, reach: 12, crouch: 0.4 },
    bow: { arm: 0, grip: 0, lean: -4 },
    tome: { arm: -25, grip: -30, lean: 4 },
    staff: { arm: -30, grip: -60, lean: 4 },
    none: { lean: 18, arm: 0, reach: 8, crouch: 0.3 },
};

const smooth = (t: number) => t * t * (3 - 2 * t);
const easeIn = (t: number) => t * t;

function blend(a: Pose, b: Pose, t: number): Pose {
    const mix = (key: keyof Pose) => a[key] + (b[key] - a[key]) * t;
    return {
        lean: mix("lean"), arm: mix("arm"), grip: mix("grip"), reach: mix("reach"),
        crouch: mix("crouch"), stride: mix("stride"), bob: mix("bob"), pull: mix("pull"),
    };
}

function poseOf(grip: Grip, frame: FighterFrame, clock: number): Pose {
    const idle: Pose = { ...BASE, ...STANCE[grip], bob: Math.sin(clock / 18) * 0.6 };
    const raised: Pose = { ...idle, ...RAISED[grip], bob: 0 };
    const struck: Pose = { ...idle, ...STRUCK[grip], bob: 0 };
    const t = frame.progress;

    switch (frame.action) {
        case "idle":
            return idle;
        case "windup":
        case "raise":
            return blend(idle, raised, smooth(t));
        case "draw":
            return { ...blend(idle, raised, smooth(t)), pull: smooth(t) };
        case "charge":
            return { ...raised, arm: raised.arm + Math.sin(clock * 1.3) * 3, crouch: raised.crouch + 0.05, pull: grip === "bow" ? 1 : 0 };
        case "aim":
            return { ...raised, pull: 1, arm: raised.arm + Math.sin(clock * 0.9) * 0.6 };
        case "cast":
            return { ...raised, arm: raised.arm + Math.sin(clock / 5) * 3 };
        case "dash":
            return { ...raised, lean: raised.lean + 26, stride: Math.sin(t * Math.PI * 2), bob: grip === "axe" ? -Math.sin(Math.PI * t) * 8 : 0 };
        case "swing":
            return blend({ ...raised, lean: raised.lean + 26 }, struck, easeIn(t));
        case "throw":
            return blend(raised, struck, easeIn(t));
        case "loose":
        case "follow":
        case "hold":
            return struck;
        case "recover":
            return blend(struck, idle, smooth(t));
        case "return":
            return { ...idle, lean: -4, stride: Math.sin(t * Math.PI * 3) * 0.8 };
        case "dodge":
            return { ...idle, lean: -16, crouch: 0.25 };
        case "hurt":
            return { ...idle, lean: -7 * (1 - t) };
    }
}

/** How far along the weapon its tip is, for the critical glint. */
const TIP: Record<Grip, number> = { blade: 24, axe: 18, spear: 32, bow: 18, tome: 4, staff: 24, none: 2 };

const ARROW = "#c49a62";
const SPARKLE = "#fffbe0";
const SPARKLE_EDGE = "#ffd34a";

/** Everything a fighter is drawn in, given its faction and hair. */
function colorsOf(faction: UnitFaction, hair: string) {
    const cloth = FACTION_COLORS[faction];
    return { ...COLORS, ...cloth, hair, hairShadow: hairShadow(hair) };
}

/** The colours a fighter can come out in once it's snapped to pixels. */
export function fighterPalette(faction: UnitFaction, hair: string, weapon: WeaponType | undefined): string[] {
    const c = colorsOf(faction, hair);
    return [
        c.ink, c.skin, c.skinShadow, c.hair, c.hairShadow, c.main, c.dark, c.light, c.leather, c.pants, c.gold,
        c.steel, c.steelDark, c.white, c.wood, c.horse, c.horseDark, c.mane, c.pegasus, c.pegasusDark, c.pegasusMane,
        c.hoof, c.pages, c.orb, ARROW, SPARKLE, SPARKLE_EDGE,
        weapon === WeaponType.WMAGIC ? c.tomeLight : c.tomeAnima,
    ];
}

// --- Drawing helpers ---

type Ctx = CanvasRenderingContext2D;

function fillPath(ctx: Ctx, color: string, d: string) {
    ctx.fillStyle = color;
    ctx.fill(new Path2D(d));
}

function fillRect(ctx: Ctx, color: string, x: number, y: number, width: number, height: number, radius = 0) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();
}

function fillEllipse(ctx: Ctx, color: string, cx: number, cy: number, rx: number, ry: number, rotation = 0) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, (rotation * Math.PI) / 180, 0, Math.PI * 2);
    ctx.fill();
}

/** A thick stroke for an arm, a leg or the like, with a dark edge to set it apart from what's behind. */
function limb(ctx: Ctx, color: string, d: string, width: number) {
    const path = new Path2D(d);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = width + 2;
    ctx.stroke(path);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke(path);
}

function line(ctx: Ctx, color: string, d: string, width: number) {
    ctx.lineCap = "round";
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke(new Path2D(d));
}

function rotateAbout(ctx: Ctx, degrees: number, x: number, y: number) {
    ctx.translate(x, y);
    ctx.rotate((degrees * Math.PI) / 180);
    ctx.translate(-x, -y);
}

/** A weapon held in a hand at (0, 0), pointing along +x. Also used for thrown weapons in flight. */
export function drawWeapon(ctx: Ctx, weapon: WeaponType | undefined, pull = 0, armed = true) {
    const c = COLORS;

    switch (gripOf(weapon)) {
        case "blade":
            fillRect(ctx, c.leather, -3, -1.2, 4, 2.4);
            fillRect(ctx, c.gold, 1, -3.6, 1.6, 7.2);
            fillPath(ctx, c.steel, "M2.6,-1.4 L21,-1.1 L24.5,0 L21,1.1 L2.6,1.4Z");
            break;
        case "axe":
            // A crescent head: darker where it meets the haft, with a bright edge
            fillRect(ctx, c.wood, -4, -1.1, 23, 2.2);
            fillPath(ctx, c.steel, "M13,-1.8 L18,-1.8 L18,1.2 Q20.5,3.5 21,8.5 Q15.5,11 10.5,8.5 Q13.5,5 13,1.2Z");
            fillPath(ctx, c.steelDark, "M13,-1.8 L18,-1.8 L18,1.2 Q15.5,3.4 13,1.2Z");
            line(ctx, c.white, "M21,8.5 Q15.5,11 10.5,8.5", 1.2);
            break;
        case "spear":
            fillRect(ctx, c.wood, -16, -0.9, 40, 1.8);
            fillRect(ctx, c.gold, 22.5, -1.6, 1.6, 3.2);
            fillPath(ctx, c.steel, "M24,-2.4 L32,0 L24,2.4Z");
            break;
        case "bow": {
            const nock = -3 - pull * 9;
            line(ctx, c.pages, `M-3,-15 L${nock},0 L-3,15`, 0.8);
            limb(ctx, c.wood, "M-3,-15 Q9,0 -3,15", 2);
            if (armed && pull > 0.05) {
                limb(ctx, ARROW, `M${nock},0 L14,0`, 1);
                fillPath(ctx, c.steel, "M14,-1.8 L18,0 L14,1.8Z");
                line(ctx, c.white, `M${nock},0 l2,-2 M${nock},0 l2,2`, 1);
            }
            break;
        }
        case "tome":
            fillRect(ctx, weapon === WeaponType.WMAGIC ? c.tomeLight : c.tomeAnima, -1, -5, 8, 10, 1);
            fillRect(ctx, c.pages, 6, -4.4, 1.4, 8.8);
            fillEllipse(ctx, c.gold, 3, 0, 1.6, 1.6);
            break;
        case "staff":
            fillRect(ctx, c.wood, -8, -1, 30, 2);
            fillEllipse(ctx, c.orb, 24, 0, 3, 3);
            break;
        case "none":
            break;
    }
}

function sparkle(ctx: Ctx, x: number, size: number) {
    ctx.save();
    ctx.translate(x, 0);
    ctx.scale(size, size);
    fillPath(ctx, SPARKLE_EDGE, "M0,-7 L1.6,-1.6 L7,0 L1.6,1.6 L0,7 L-1.6,1.6 L-7,0 L-1.6,-1.6Z");
    fillPath(ctx, SPARKLE, "M0,-5 L1,-1 L5,0 L1,1 L0,5 L-1,1 L-5,0 L-1,-1Z");
    ctx.restore();
}

type Colors = ReturnType<typeof colorsOf>;

interface BodyOptions {
    pose: Pose;
    grip: Grip;
    weapon: WeaponType | undefined;
    armed: boolean;
    armored: boolean;
    charge: number | null;
    clock: number;
    c: Colors;
}

/** Torso, head and arms, turning about the hips at (x, y). */
function drawUpperBody(ctx: Ctx, x: number, y: number, { pose, grip, weapon, armed, armored, charge, clock, c }: BodyOptions) {
    const shoulder = { x: x + 2, y: y - 14 };
    const width = armored ? 16 : 12;

    ctx.save();
    rotateAbout(ctx, pose.lean, x, y);

    // Back arm, or a shield
    if (armored) {
        fillRect(ctx, c.ink, x - 12.5, y - 19.5, 9, 18, 2);
        fillRect(ctx, c.main, x - 12, y - 19, 8, 17, 2);
        fillRect(ctx, c.gold, x - 9, y - 12, 2, 3);
    } else {
        limb(ctx, c.dark, `M${x - 3},${y - 14} L${x - 5},${y - 5}`, 3.4);
    }

    fillRect(ctx, c.main, x - width / 2, y - 17, width, 19, 3);
    fillRect(ctx, c.light, x - width / 2, y - 17, width, 3, 1.5);
    fillRect(ctx, c.dark, x - width / 2, y - 8, width, 4);
    fillRect(ctx, c.leather, x - width / 2, y - 4, width, 2.5);
    fillRect(ctx, c.gold, x - 1, y - 4, 2, 2.5);
    if (armored) fillRect(ctx, c.steel, x - 9, y - 18, 7, 5, 2);

    // Head
    fillEllipse(ctx, c.skin, x + 1.5, y - 23.5, 5.5, 5.5);
    if (armored) {
        fillPath(ctx, c.steel, `M${x - 4.5},${y - 21} Q${x - 4},${y - 31} ${x + 2},${y - 30.5} Q${x + 8},${y - 30} ${x + 7.5},${y - 24} L${x + 7.5},${y - 21} L${x - 4.5},${y - 19}Z`);
        fillRect(ctx, c.steelDark, x - 4.5, y - 22, 4, 3);
        fillRect(ctx, c.ink, x + 3, y - 25.5, 5, 1.6);
        limb(ctx, c.main, `M${x},${y - 30} Q${x - 6},${y - 34} ${x - 9},${y - 28}`, 2.2);
    } else {
        fillPath(ctx, c.hair, `M${x - 4},${y - 20} Q${x - 4.5},${y - 31} ${x + 2},${y - 30} Q${x + 8},${y - 29.5} ${x + 7.2},${y - 25} L${x + 2},${y - 26.5} Q${x},${y - 23} ${x - 4},${y - 19}Z`);
        fillPath(ctx, c.hairShadow, `M${x - 4},${y - 20} Q${x - 4.5},${y - 25} ${x - 2},${y - 26} L${x - 1},${y - 22} Q${x - 2},${y - 20.5} ${x - 4},${y - 19}Z`);
        fillRect(ctx, c.ink, x + 4.6, y - 24.6, 1.2, 2);
        fillRect(ctx, c.skinShadow, x - 1, y - 19.5, 5, 1.2);
    }

    // Front arm and weapon
    ctx.save();
    ctx.translate(pose.reach, 0);
    rotateAbout(ctx, pose.arm, shoulder.x, shoulder.y);
    limb(ctx, c.main, `M${shoulder.x},${shoulder.y} L${shoulder.x + 10},${shoulder.y}`, 3.6);

    ctx.save();
    ctx.translate(shoulder.x + 11, shoulder.y);
    ctx.rotate((pose.grip * Math.PI) / 180);
    if (armed || grip === "bow") drawWeapon(ctx, weapon, pose.pull, armed);
    if (charge !== null) sparkle(ctx, TIP[grip], 0.6 + 0.5 * Math.abs(Math.sin(clock / 3)));
    ctx.restore();

    fillEllipse(ctx, c.skin, shoulder.x + 11, shoulder.y, 2, 2);
    ctx.restore();

    ctx.restore();
}

function drawLegs(ctx: Ctx, x: number, y: number, pose: Pose, armored: boolean, c: Colors) {
    const feet = [34 - pose.stride * 7, 46 + pose.stride * 7];
    const bend = pose.crouch * 6 + Math.abs(pose.stride) * 2;

    for (const footX of feet) {
        const kneeX = (x + footX) / 2 + bend;
        const kneeY = (y + 70) / 2;
        limb(ctx, armored ? c.steelDark : c.pants, `M${x},${y} L${kneeX},${kneeY} L${footX},68.5`, armored ? 5.6 : 4.6);
        fillEllipse(ctx, c.leather, footX + 1, 69, 3.4, 1.8);
    }
}

/** A horse, or with wings, a pegasus. The near wing is drawn separately, over the rider. */
function drawMount(ctx: Ctx, pose: Pose, flying: boolean, clock: number, c: Colors, nearWing: boolean) {
    const body = flying ? c.pegasus : c.horse;
    const shadow = flying ? c.pegasusDark : c.horseDark;
    const mane = flying ? c.pegasusMane : c.mane;
    const bodyY = 47 + pose.bob * 0.5;
    const flap = Math.sin(clock / 7) * 22;

    const wing = (far: boolean) => {
        ctx.save();
        ctx.translate(36, bodyY - 6);
        ctx.rotate(((far ? flap - 8 : flap) * Math.PI) / 180);
        fillPath(ctx, far ? c.pegasusDark : c.white, "M0,0 C-6,-10 -14,-20 -27,-25 C-21,-19 -23,-15 -19,-12 C-23,-10 -21,-6 -15,-6 C-15,-3 -9,-1 0,3Z");
        ctx.restore();
    };

    if (nearWing) {
        if (flying) wing(false);
        return;
    }

    const leg = (topX: number, phase: number, far: boolean) => {
        const swing = flying ? 28 + phase * 4 : pose.stride * 24 * (phase > 0 ? 1 : -1) + phase * 3;
        const angle = (swing * Math.PI) / 180;
        const footX = topX + Math.sin(angle) * 18 * (flying ? -1 : 1);
        const footY = bodyY + 5 + Math.cos(angle) * 18;
        limb(ctx, far ? shadow : body, `M${topX},${bodyY + 4} L${footX},${footY}`, 3.4);
        fillRect(ctx, c.hoof, footX - 1.8, footY - 1, 3.6, 2);
    };

    if (flying) wing(true);
    leg(29, 1, true);
    leg(48, -1, true);
    limb(ctx, mane, `M22,${bodyY - 4} Q12,${bodyY} 15,${bodyY + 11}`, 3);
    fillEllipse(ctx, body, 38, bodyY, 17, 8.5);
    fillEllipse(ctx, shadow, 38, bodyY + 4, 14, 3.5);
    fillPath(ctx, body, `M47,${bodyY - 5} L53,${bodyY - 18} L58,${bodyY - 18} L56,${bodyY - 2}Z`);
    fillEllipse(ctx, body, 61, bodyY - 15, 6.5, 3.6, 32);
    limb(ctx, mane, `M53,${bodyY - 19} Q49,${bodyY - 11} 47,${bodyY - 4}`, 2.4);
    fillRect(ctx, c.ink, 60.5, bodyY - 17.5, 1.2, 1.2);
    fillRect(ctx, c.main, 30, bodyY - 10, 14, 7, 2);
    fillRect(ctx, c.gold, 30, bodyY - 5, 14, 1.5);
    leg(25, -1, false);
    leg(51, 1, false);
}

export interface FighterLook {
    movement: MovementType;
    weapon: WeaponType | undefined;
    faction: UnitFaction;
    hair: string;
}

/** Draw a fighter facing right with its feet at (40, 70), as it is on this frame. */
export function drawFighter(ctx: Ctx, look: FighterLook, frame: FighterFrame, clock: number) {
    const { movement, weapon } = look;
    const c = colorsOf(look.faction, look.hair);
    const grip = gripOf(weapon);
    const pose = poseOf(grip, frame, clock);
    const flying = movement === MovementType.FLYING;
    const options = { grip, weapon, armed: frame.armed, charge: frame.charge, clock, c };

    if (movement === MovementType.MOUNTED || flying) {
        const hipX = 37;
        const hipY = 38 + pose.bob * 0.5;

        ctx.save();
        if (flying) ctx.translate(0, -8 + Math.round(Math.sin(clock / 10) * 1.5));
        drawMount(ctx, pose, flying, clock, c, false);
        limb(ctx, c.pants, `M${hipX},${hipY} L${hipX + 5},${hipY + 7} L${hipX + 2},${hipY + 13}`, 4.4);
        fillEllipse(ctx, c.leather, hipX + 3, hipY + 13.5, 2.6, 1.6);
        drawUpperBody(ctx, hipX, hipY, { ...options, pose: { ...pose, lean: pose.lean * 0.5, crouch: 0 }, armored: false });
        drawMount(ctx, pose, flying, clock, c, true);
        ctx.restore();
        return;
    }

    const armored = movement === MovementType.ARMORED;
    const hipX = 40;
    const hipY = 47 + pose.crouch * 6 + pose.bob;

    drawLegs(ctx, hipX, hipY, pose, armored, c);
    drawUpperBody(ctx, hipX, hipY, { ...options, pose, armored });
}
