import { TileType } from "@/engine/models/grid/itile";
import { WeaponType } from "@/engine/models/items/weaponitem";
import { MovementType } from "@/engine/models/units/unitclass";
import { COLORS } from "@/app/components/pixel/palettes";
import { crisp, CrispOptions, drawText, fillEllipse, fillRows, RGB, rgb } from "@/app/components/pixel/pixelcanvas";
import { BattleFrame, BattleScript, cameraShare, FEET_Y, Side } from "./battlescript";
import { drawFighter, drawWeapon, FIGURE, FighterLook, fighterPalette } from "./fighterart";

// Draws the battle screen's field (scenery, platforms, fighters and effects) on a
// canvas at the GBA's pixel scale. The page scales the canvas up with
// image-rendering: pixelated, so everything shares one grid of big, hard pixels.

export interface FieldFighter extends FighterLook {
    terrain: TileType;
    /** The middle of its map tile, in field pixels: where it zooms in from. */
    tile: { x: number; y: number };
}

export interface FieldLayout {
    /** The canvas, in art pixels. */
    width: number;
    height: number;
    /** Where the 240-wide field starts. */
    stageLeft: number;
    stageTop: number;
}

export interface FieldInput {
    script: BattleScript;
    view: BattleFrame;
    fighters: Record<Side, FieldFighter>;
    layout: FieldLayout;
    /** Frames since the scene started. */
    clock: number;
    /** Reduced motion: no shaking, no blinking, no strobing colours. */
    calm: boolean;
}

/** Fighters start this small on their tiles and grow into place (the 0x250 scale in UnitKakudaiMain). */
const MAP_SCALE = 1 / 2.3125;
/** The scenery is drawn this much wider on each side, to slide behind the camera. */
const MARGIN = 24;
/** Where the far scenery meets the ground, in field pixels. */
const HORIZON = 62;
const CHEST = FEET_Y - 32;

const INK = rgb(COLORS.ink);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Fades go in sixteenths, like the GBA's blending. */
const steps = (alpha: number) => Math.round(alpha * 16) / 16;

/** The same random numbers every time, so scenery doesn't change between battles. */
function seeded(seed: number) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// --- Scenery ---

const SKY = ["#4a86d4", "#5b95db", "#6fa5e2", "#86b6e9", "#a0c8ef", "#bcdaf4"];

/** Horizontal bands of colour, dithered where they meet. */
function bands(ctx: CanvasRenderingContext2D, colors: string[], top: number, bottom: number, width: number) {
    const height = (bottom - top) / colors.length;

    colors.forEach((color, i) => {
        const start = Math.round(top + i * height);
        ctx.fillStyle = color;
        ctx.fillRect(0, start, width, Math.round(top + (i + 1) * height) - start);

        if (i === 0) return;
        // Two rows of checkerboard with the band above
        ctx.fillStyle = colors[i - 1];
        for (let x = 0; x < width; x++) {
            if (x % 2 === 0) ctx.fillRect(x, start, 1, 1);
            if (x % 4 === 1) ctx.fillRect(x, start + 1, 1, 1);
        }
    });
}

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
    const rows: [number, number][] = [[0.3, 0.4], [0.15, 0.7], [0, 1], [0.05, 0.9]];
    rows.forEach(([offset, share], i) => {
        ctx.fillStyle = i === rows.length - 1 ? "#d6e6f4" : "#fdfdff";
        ctx.fillRect(Math.round(x + offset * size), y + i, Math.round(share * size), 1);
    });
}

/** A pine, as stacked rows that widen toward the bottom with a notch every few rows. */
function pine(ctx: CanvasRenderingContext2D, x: number, base: number, height: number, color: string, light: string) {
    for (let row = 0; row < height; row++) {
        const half = Math.floor(row * 0.42) - (row % 5 === 4 ? 1 : 0);
        const y = base - height + row;
        ctx.fillStyle = color;
        ctx.fillRect(x - half, y, half * 2 + 1, 1);
        ctx.fillStyle = light;
        ctx.fillRect(x - half, y, 1, 1);
    }
}

function ground(ctx: CanvasRenderingContext2D, top: number, width: number, height: number, base: string, stripe: string, speck: string, random: () => number) {
    ctx.fillStyle = base;
    ctx.fillRect(0, top, width, height - top);
    ctx.fillStyle = stripe;
    for (let y = top + 3; y < height; y += 5 + Math.floor((y - top) / 10)) ctx.fillRect(0, y, width, 1);
    ctx.fillStyle = speck;
    for (let i = 0; i < width / 6; i++) {
        const x = Math.floor(random() * width);
        const y = top + 2 + Math.floor(random() * (height - top - 2));
        ctx.fillRect(x, y, 1, 1);
        ctx.fillRect(x + 2, y, 1, 1);
        ctx.fillRect(x + 1, y + 1, 1, 1);
    }
}

/** The scenery behind the fight, picked from the terrain the left fighter stands on (as the game does). */
function drawScenery(ctx: CanvasRenderingContext2D, terrain: TileType, width: number, height: number, horizon: number) {
    const random = seeded(terrain + 1);

    if (terrain === TileType.Block) {
        // Indoors: a stone wall and a flagstone floor
        ctx.fillStyle = "#5c5850";
        ctx.fillRect(0, 0, width, horizon);
        for (let y = 0; y < horizon; y += 8) {
            ctx.fillStyle = "#34312c";
            ctx.fillRect(0, y + 7, width, 1);
            const offset = (y / 8) % 2 === 0 ? 0 : 8;
            for (let x = -offset; x < width; x += 16) {
                ctx.fillRect(x + 15, y, 1, 7);
                ctx.fillStyle = "#77736a";
                ctx.fillRect(x, y, 15, 1);
                ctx.fillStyle = "#34312c";
            }
        }
        ground(ctx, horizon, width, height, "#4a463f", "#3d3a34", "#5c5850", random);
        return;
    }

    bands(ctx, terrain === TileType.Mountain ? ["#5f93d0", ...SKY.slice(1)] : SKY, 0, horizon, width);
    for (let i = 0; i < width / 70; i++) {
        cloud(ctx, Math.floor(random() * width), 6 + Math.floor(random() * (horizon / 2.5)), 18 + Math.floor(random() * 22));
    }

    switch (terrain) {
        case TileType.Forest:
            for (let x = 2; x < width; x += 7) pine(ctx, x, horizon, 14 + Math.floor(random() * 10), "#2f6a34", "#3d7f40");
            for (let x = 6; x < width; x += 11) pine(ctx, x, horizon + 3, 20 + Math.floor(random() * 12), "#22502a", "#2f6a34");
            ground(ctx, horizon + 3, width, height, "#4f8f3f", "#468236", "#62a548", random);
            break;

        case TileType.Mountain: {
            const peaks = Array.from({ length: Math.ceil(width / 55) + 1 }, (_, i) => ({ x: i * 55 + Math.floor(random() * 30) - 15, top: horizon - 26 - Math.floor(random() * 22) }));
            for (let x = 0; x < width; x++) {
                let top = horizon;
                let owner = peaks[0];
                for (const peak of peaks) {
                    const y = peak.top + Math.abs(x - peak.x) * 0.9;
                    if (y < top) {
                        top = y;
                        owner = peak;
                    }
                }
                const y = Math.round(top);
                ctx.fillStyle = x > owner.x ? "#6f6150" : "#8a7a62";
                ctx.fillRect(x, y, 1, horizon - y);
                ctx.fillStyle = "#f4f1e8";
                const snow = Math.max(0, owner.top + 7 - y);
                if (snow > 0) ctx.fillRect(x, y, 1, snow + (x % 3 === 0 ? 1 : 0));
            }
            ground(ctx, horizon, width, height, "#a39271", "#94845f", "#7d6d50", random);
            break;
        }

        case TileType.Sand: {
            // Dunes rolling away, then the sand itself
            for (let x = 0; x < width; x++) {
                const y = Math.round(horizon - 7 - Math.sin(x / 23) * 4 - Math.sin(x / 9 + 2) * 2);
                ctx.fillStyle = "#d9bb7a";
                ctx.fillRect(x, y, 1, horizon - y);
                ctx.fillStyle = "#ecd39a";
                ctx.fillRect(x, y, 1, 1);
            }
            ground(ctx, horizon, width, height, "#e2c98a", "#d4b878", "#c9ad6c", random);
            break;
        }

        case TileType.Water:
        case TileType.Bridge: {
            ctx.fillStyle = "#6f9a5a";
            fillEllipse(ctx, width * 0.75, horizon, 22, 6);
            ctx.fillStyle = "#3d7fcb";
            ctx.fillRect(0, horizon, width, height - horizon);
            ctx.fillStyle = "#5a95d6";
            ctx.fillRect(0, horizon, width, 2);
            for (let i = 0; i < width / 4; i++) {
                const x = Math.floor(random() * width);
                const y = horizon + 3 + Math.floor(random() * (height - horizon - 3));
                ctx.fillStyle = random() < 0.25 ? "#d8ecff" : "#8ec3f2";
                ctx.fillRect(x, y, 2 + Math.floor(random() * 3), 1);
            }
            break;
        }

        default: {
            // Rolling hills, then a field
            for (let x = 0; x < width; x++) {
                const y = Math.round(horizon - 9 - Math.sin(x / 19) * 5 - Math.sin(x / 7.3 + 1) * 3);
                ctx.fillStyle = "#8cc06c";
                ctx.fillRect(x, y, 1, horizon - y);
                ctx.fillStyle = "#a7d684";
                ctx.fillRect(x, y, 1, 1);
            }
            ground(ctx, horizon, width, height, "#6aa84f", "#62a048", "#4e8c3c", random);
        }
    }
}

// --- Platforms ---

const PLATFORM: Record<TileType, { top: string; edge: string; front: string; side: string; base: string; detail: string }> = {
    [TileType.Grass]: { top: "#78b85a", edge: "#9bd47a", front: "#5f9a46", side: "#7a5a3a", base: "#5e4229", detail: "#4e8c3c" },
    [TileType.Forest]: { top: "#3f7d36", edge: "#58ad4a", front: "#2e6a2a", side: "#6b4a2e", base: "#4f3520", detail: "#1d5a24" },
    [TileType.Mountain]: { top: "#b19f7c", edge: "#cdbd98", front: "#94845f", side: "#75654a", base: "#5a4c36", detail: "#7d6d50" },
    [TileType.Water]: { top: "#4a8fd8", edge: "#8ec3f2", front: "#3d7fcb", side: "#2d63a3", base: "#21508a", detail: "#d8ecff" },
    [TileType.Block]: { top: "#8a857a", edge: "#a5a095", front: "#77736a", side: "#5c5850", base: "#46433d", detail: "#6a665d" },
    [TileType.Road]: { top: "#c4a374", edge: "#dcc394", front: "#a3845c", side: "#7a5a3a", base: "#5e4229", detail: "#a3845c" },
    [TileType.Bridge]: { top: "#b8874d", edge: "#d4a56c", front: "#94683a", side: "#5e3d1c", base: "#3d7fcb", detail: "#5e3d1c" },
    [TileType.Fort]: { top: "#a8a294", edge: "#cfc9b8", front: "#7d786c", side: "#5c5850", base: "#46433d", detail: "#7d786c" },
    [TileType.Sand]: { top: "#e2c98a", edge: "#f2e2b0", front: "#c9ad6c", side: "#a88a52", base: "#7d6638", detail: "#c9ad6c" },
    [TileType.Village]: { top: "#78b85a", edge: "#9bd47a", front: "#5f9a46", side: "#7a5a3a", base: "#5e4229", detail: "#4e8c3c" },
};

/** The slab a fighter stands on, made of whole-pixel rows. Up close, the two meet in the middle. */
function drawPlatform(ctx: CanvasRenderingContext2D, x: number, terrain: TileType, close: boolean, side: Side) {
    const colors = PLATFORM[terrain] ?? PLATFORM[TileType.Grass];
    const half = close ? 28 : 42;
    const left = x - half;
    const right = x + half;
    const backLeft = left + (close && side === "right" ? 0 : 5);
    const backRight = right - (close && side === "left" ? 0 : 5);
    const top = FEET_Y - 6;
    const front = FEET_Y + 6;

    ctx.fillStyle = colors.top;
    fillRows(ctx, top, front, y => {
        const t = (y - top) / (front - top);
        return [lerp(backLeft, left, t), lerp(backRight, right, t)];
    });
    ctx.fillStyle = colors.edge;
    ctx.fillRect(backLeft, top, backRight - backLeft, 1);
    ctx.fillStyle = colors.front;
    ctx.fillRect(left, front - 1, right - left, 1);

    ctx.fillStyle = colors.side;
    ctx.fillRect(left, front, right - left, 12);
    ctx.fillStyle = colors.base;
    ctx.fillRect(left, front + 12, right - left, 2);

    // A few marks on top
    ctx.fillStyle = colors.detail;
    for (const [dx, dy] of [[-20, 2], [12, -1], [-4, 4], [22, 3]] as const) {
        if (x + dx <= left + 2 || x + dx >= right - 3) continue;
        ctx.fillRect(x + dx, FEET_Y + dy, 1, 1);
        ctx.fillRect(x + dx + 2, FEET_Y + dy, 1, 1);
        ctx.fillRect(x + dx + 1, FEET_Y + dy + 1, 1, 1);
    }
}

// --- Effects ---

const EFFECT_COLORS = ["#ffffff", "#fff6c8", "#ffe58a", "#ffd34a", "#ff8a3d", "#c8452d", "#9df0c0", "#f2fff6", COLORS.steel, COLORS.steelDark, COLORS.wood, COLORS.leather, COLORS.gold, COLORS.ink, COLORS.pages];
const EFFECT_PALETTE = EFFECT_COLORS.map(rgb);

/** The starburst on a normal hit. */
function drawSpark(ctx: CanvasRenderingContext2D, x: number, progress: number) {
    ctx.strokeStyle = progress < 0.5 ? "#ffffff" : "#fff6c8";
    ctx.lineCap = "square";
    ctx.lineWidth = 2.2 * (1 - progress) + 0.8;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
        const angle = ((i * 45 + 22.5) * Math.PI) / 180;
        const inner = 4 + progress * 8;
        const outer = 11 + progress * 18;
        ctx.moveTo(x + Math.cos(angle) * inner, CHEST + Math.sin(angle) * inner);
        ctx.lineTo(x + Math.cos(angle) * outer, CHEST + Math.sin(angle) * outer);
    }
    ctx.stroke();

    ctx.strokeStyle = "#ffe58a";
    ctx.lineWidth = 1.6 * (1 - progress) + 0.8;
    ctx.beginPath();
    ctx.ellipse(x, CHEST, 6 + progress * 14, 6 + progress * 14, 0, 0, Math.PI * 2);
    ctx.stroke();
}

function drawRays(ctx: CanvasRenderingContext2D, x: number, step: number, turning: boolean) {
    ctx.save();
    ctx.translate(x, CHEST);
    ctx.rotate(((turning ? step * 3 : 0) * Math.PI) / 180);
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 12; i++) {
        const spread = 7 + (i % 2) * 5;
        ctx.beginPath();
        ctx.moveTo(0, -2);
        ctx.lineTo(160, -spread);
        ctx.lineTo(160, spread);
        ctx.lineTo(0, 2);
        ctx.fill();
        ctx.rotate(Math.PI / 6);
    }
    ctx.restore();
}

/** An arrow in flight, pixel by pixel, pointing the way it travels. */
function drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, dir: 1 | -1) {
    const px = (dx: number, dy: number, w = 1) => ctx.fillRect(dir === 1 ? x + dx : x - dx - w + 1, y + dy, w, 1);

    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    for (let dx = -34; dx < -14; dx += 4) px(dx, 0, 2);
    ctx.fillStyle = "#c49a62";
    px(-12, 0, 16);
    ctx.fillStyle = COLORS.steel;
    px(4, -1, 2);
    px(4, 0, 4);
    px(4, 1, 2);
    ctx.fillStyle = COLORS.white;
    px(-14, -1, 2);
    px(-14, 1, 2);
}

const SPELL_COLORS: Record<string, { main: string; core: string }> = {
    fire: { main: "#ff8a3d", core: "#ffe066" },
    light: { main: "#ffe58a", core: "#fff6c8" },
    heal: { main: "#9df0c0", core: "#f2fff6" },
};

const spellKind = (weapon: WeaponType | undefined) => (weapon === WeaponType.BMAGIC ? "fire" : weapon === WeaponType.STAFF ? "heal" : "light");

/** A dashed ring of pixels around an ellipse. */
function ring(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, offset: number, dash = 4, gap = 3) {
    const around = Math.max(12, Math.round(Math.PI * (rx + ry)));
    for (let i = 0; i < around; i++) {
        if ((i + Math.round(offset)) % (dash + gap) >= dash) continue;
        const angle = (i / around) * Math.PI * 2;
        ctx.fillRect(Math.round(cx + Math.cos(angle) * rx), Math.round(cy + Math.sin(angle) * ry), 1, 1);
    }
}

/** The caster's circle at its feet. */
function drawCircle(ctx: CanvasRenderingContext2D, spell: NonNullable<BattleFrame["spell"]>, clock: number) {
    const colors = SPELL_COLORS[spellKind(spell.weapon)];
    const grow = Math.min(1, spell.progress * 3);

    ctx.fillStyle = colors.main;
    ring(ctx, spell.x, FEET_Y, 22 * grow, 5.5 * grow, clock * 0.8);
    ring(ctx, spell.x, FEET_Y, 14 * grow, 3.5 * grow, -clock * 0.8, 2, 4);

    ctx.fillStyle = colors.core;
    for (let i = 0; i < 7; i++) {
        const rise = ((clock * 0.9 + i * 9) % 40) / 40;
        const size = rise < 0.6 ? 2 : 1;
        ctx.fillRect(Math.round(spell.x + Math.cos(i * 2.4) * 16), Math.round(FEET_Y - rise * 44), size, size);
    }
}

/** The spell on its target: fire gathers and bursts (soft shapes, on `layer`); light falls in a pillar (pixels, on `ctx`). */
function drawSpell(ctx: CanvasRenderingContext2D, layer: CanvasRenderingContext2D, spell: NonNullable<BattleFrame["spell"]>, clock: number) {
    const kind = spellKind(spell.weapon);
    const colors = SPELL_COLORS[kind];
    const before = spell.progress < spell.impactAt;
    const local = before ? spell.progress / spell.impactAt : (spell.progress - spell.impactAt) / (1 - spell.impactAt);
    const x = Math.round(spell.x);

    if (kind === "fire") {
        const y = CHEST + 6;
        if (before) {
            layer.fillStyle = colors.main;
            fillEllipse(layer, x, y, 3 + local * 9, 3 + local * 9);
            layer.fillStyle = colors.core;
            for (let i = 0; i < 6; i++) {
                const angle = i * 1.05 + local * 4;
                const distance = 30 * (1 - local);
                layer.fillRect(Math.round(x + Math.cos(angle) * distance), Math.round(y + Math.sin(angle) * distance * 0.6), 2, 2);
            }
            return;
        }

        const fade = 1 - local;
        layer.save();
        layer.translate(x, y);
        layer.fillStyle = colors.main;
        layer.beginPath();
        layer.ellipse(0, 0, 14 + local * 10, 14 + local * 10, 0, 0, Math.PI * 2);
        if (fade > 0.35) layer.fill();
        for (let i = 0; i < 6; i++) {
            layer.save();
            layer.rotate(((i * 60 + local * 30) * Math.PI) / 180);
            layer.translate(0, -6 - local * 10);
            layer.scale(0.8 + local * 0.7, 0.8 + local * 0.7);
            layer.fillStyle = i % 2 ? "#c8452d" : colors.main;
            layer.fill(new Path2D("M0,-14 C5,-6 7,0 0,6 C-7,0 -5,-6 0,-14Z"));
            layer.restore();
        }
        layer.scale(1.2 + local, 1.2 + local);
        layer.fillStyle = colors.core;
        layer.fill(new Path2D("M0,-16 C6,-6 8,2 0,8 C-8,2 -6,-6 0,-16Z"));
        layer.restore();
        return;
    }

    // Light (and healing) falls from above
    const width = Math.max(1, Math.round(before ? 2 + local * 6 : 14 * (1 - local) + 2));
    ctx.fillStyle = colors.main;
    ctx.fillRect(x - Math.ceil(width / 2) - 1, -40, width + 2, FEET_Y + 40);
    ctx.fillStyle = colors.core;
    ctx.fillRect(x - Math.ceil(width / 2), -40, width, FEET_Y + 40);
    ctx.fillStyle = colors.main;
    ring(ctx, x, FEET_Y, before ? 6 + local * 12 : 18 + local * 14, before ? 2 + local * 3 : 5 + local * 3, 0, 6, 2);
    ctx.fillStyle = colors.core;
    for (let i = 0; i < 6; i++) {
        const fall = ((clock * 1.4 + i * 13) % 60) / 60;
        ctx.fillRect(Math.round(x + Math.sin(i * 1.7) * 14), Math.round(fall * FEET_Y), 2, 2);
    }
}

// --- Putting it together ---

/** Draws frames of the battle screen, keeping scratch canvases and the scenery between frames. */
export class FieldRenderer {
    private layer = document.createElement("canvas");
    private layerContext = this.layer.getContext("2d", { willReadFrequently: true })!;
    private scenery: { key: string; canvas: HTMLCanvasElement } | null = null;
    private palettes = new Map<string, RGB[]>();

    render(canvas: HTMLCanvasElement, { script, view, fighters, layout, clock, calm }: FieldInput) {
        const { width, height } = layout;
        if (canvas.width !== width) canvas.width = width;
        if (canvas.height !== height) canvas.height = height;
        if (this.layer.width !== width) this.layer.width = width;
        if (this.layer.height !== height) this.layer.height = height;

        const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, width, height);

        // Scenery, which slides a little as the camera pans, but doesn't shake
        if (view.background > 0) {
            const shift = Math.round((cameraShare(script.range, view.camera) - 0.5) * MARGIN);
            ctx.globalAlpha = steps(view.background);
            ctx.drawImage(this.sceneryFor(fighters.left.terrain, layout), -MARGIN + shift, 0);
            ctx.globalAlpha = 1;
        }

        const quakeX = calm ? 0 : view.quake.x;
        const quakeY = calm ? 0 : -view.quake.y;
        const originX = layout.stageLeft + quakeX;
        const originY = layout.stageTop + quakeY;
        const sides: Side[] = ["left", "right"];

        // Platforms and shadows rise from below as the battle opens
        ctx.save();
        ctx.translate(originX, originY + Math.round((1 - view.windows) * 80));
        for (const side of sides) {
            drawPlatform(ctx, Math.round(view.home[side]), fighters[side].terrain, script.range === "close", side);
        }
        for (const side of sides) {
            const state = view[side];
            if (!state.visible && !calm) continue;
            const flying = fighters[side].movement === MovementType.FLYING;
            ctx.fillStyle = `rgba(0, 0, 0, ${steps(0.32 * view.zoom * state.opacity)})`;
            fillEllipse(ctx, state.x, FEET_Y, (flying ? 12 : 15) - state.lift * 0.4, 3);
        }
        ctx.restore();

        // The critical burst floods the screen behind the fighters
        if (view.critBurst) {
            const t = view.critBurst.step / 15;
            ctx.globalAlpha = calm ? 0.25 : 0.55;
            ctx.fillStyle = calm ? "#f2d88a" : `hsl(${48 - t * 48} 95% ${92 - t * 52}%)`;
            ctx.fillRect(0, 0, width, height);
            ctx.globalAlpha = 1;

            this.drawLayer(ctx, originX, originY, layer => drawRays(layer, view.critBurst!.x, view.critBurst!.step, !calm), { palette: [rgb("#ffffff")] }, calm ? 0.3 : 0.6 - t * 0.4);
        }

        if (view.spell?.stage === "circle") {
            ctx.save();
            ctx.translate(originX, originY);
            drawCircle(ctx, view.spell, clock);
            ctx.restore();
        }

        // Fighters, whoever is striking in front
        const striking = (side: Side) => !["idle", "hurt", "dodge"].includes(view[side].action);
        const order: Side[] = striking("left") && !striking("right") ? ["right", "left"] : ["left", "right"];

        for (const side of order) {
            const state = view[side];
            const fighter = fighters[side];
            const visible = state.visible || (calm && state.opacity > 0);
            if (!visible || view.tokens >= 1) continue;

            const scale = 1 / lerp(1 / MAP_SCALE, 1, view.zoom);
            const x = lerp(fighter.tile.x, state.x, view.zoom);
            const y = lerp(fighter.tile.y + 10, FEET_Y - state.lift, view.zoom);
            const flash = state.flash && !(calm && state.charge !== null);

            this.drawLayer(ctx, Math.round(originX + x), Math.round(originY + y), layer => {
                layer.scale(scale * (side === "left" ? 1 : -1), scale);
                layer.translate(-FIGURE.footX, -FIGURE.footY);
                drawFighter(layer, fighter, state, clock);
            }, { palette: this.paletteFor(fighter), outline: INK, white: flash }, steps(state.opacity * (1 - view.tokens)));
        }

        // Shots and spells over the fighters
        const spell = view.spell?.stage === "effect" ? view.spell : null;
        const projectile = view.projectile;

        if (spell) {
            ctx.save();
            ctx.translate(originX, originY);
            this.drawLayer(ctx, originX, originY, layer => drawSpell(ctx, layer, spell, clock), { palette: EFFECT_PALETTE });
            ctx.restore();
        }

        if (projectile) {
            const dir = projectile.from === "left" ? 1 : -1;
            if (projectile.style === "bow") {
                ctx.save();
                ctx.translate(originX, originY);
                drawArrow(ctx, Math.round(projectile.x), Math.round(projectile.y), dir);
                ctx.restore();
            } else {
                this.drawLayer(ctx, Math.round(originX + projectile.x), Math.round(originY + projectile.y), layer => {
                    layer.scale(dir, 1);
                    layer.rotate(projectile.progress * Math.PI * 4);
                    layer.translate(-10, 0);
                    drawWeapon(layer, projectile.weapon);
                }, { palette: EFFECT_PALETTE, outline: INK });
            }
        }

        if (view.spark) {
            const { x, progress } = view.spark;
            this.drawLayer(ctx, originX, originY, layer => drawSpark(layer, x, progress), { palette: EFFECT_PALETTE });
        }

        // "MISS" and "NO DAMAGE" pop up over the target
        for (const text of view.texts) {
            const scale = text.age < 2 ? 1 : text.age < 5 ? 3 : 2;
            drawText(ctx, text.text, originX + text.x, originY + FEET_Y - 62 - Math.min(text.age, 10) / 3, scale, "#ffffff", COLORS.ink);
        }
    }

    /**
     * Draw something on the scratch layer (with the origin at x, y), snap it to
     * hard pixels, then copy it onto the screen.
     */
    private drawLayer(target: CanvasRenderingContext2D, x: number, y: number, draw: (layer: CanvasRenderingContext2D) => void, options: CrispOptions, alpha = 1) {
        if (alpha <= 0) return;
        const layer = this.layerContext;

        layer.setTransform(1, 0, 0, 1, 0, 0);
        layer.clearRect(0, 0, this.layer.width, this.layer.height);
        layer.translate(x, y);
        layer.save();
        draw(layer);
        layer.restore();
        layer.setTransform(1, 0, 0, 1, 0, 0);
        crisp(layer, this.layer.width, this.layer.height, options);

        target.save();
        target.setTransform(1, 0, 0, 1, 0, 0);
        target.globalAlpha = alpha;
        target.drawImage(this.layer, 0, 0);
        target.restore();
    }

    private paletteFor(fighter: FieldFighter): RGB[] {
        const key = `${fighter.faction}-${fighter.hair}-${fighter.weapon}`;
        if (!this.palettes.has(key)) this.palettes.set(key, fighterPalette(fighter.faction, fighter.hair, fighter.weapon).map(rgb));
        return this.palettes.get(key)!;
    }

    private sceneryFor(terrain: TileType, layout: FieldLayout): HTMLCanvasElement {
        const width = layout.width + MARGIN * 2;
        const key = `${terrain}-${width}-${layout.height}-${layout.stageTop}`;
        if (this.scenery?.key === key) return this.scenery.canvas;

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = layout.height;
        drawScenery(canvas.getContext("2d")!, terrain, width, layout.height, layout.stageTop + HORIZON);
        this.scenery = { key, canvas };
        return canvas;
    }
}
