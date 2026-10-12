'use client'
import { CSSProperties, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { Coordinate } from "@/engine/models/grid/coordinate";
import { TileType } from "@/engine/models/grid/itile";
import { UnitFaction } from "@/engine/models/units/iunit";
import { MovementType } from "@/engine/models/units/unitclass";
import WeaponIcon from "@/app/components/icons/weaponicon";
import UnitToken from "@/app/components/unit/unittoken";
import { factionClass } from "@/app/components/unit/faction";
import { hairOf } from "@/app/components/pixel/palettes";
import { PixelText } from "@/app/components/pixel/pixeltext";
import { BattleFrame, BattleScript, FRAME_MS, sampleBattle, Side, SideInfo, STAGE_HEIGHT } from "./battlescript";
import { FieldFighter, FieldLayout, FieldRenderer } from "./battlefield";
import "./battlescene.scss";

/** Who's fighting, as the battle screen draws them. */
export interface BattleFighter {
    id: string;
    name: string;
    faction: UnitFaction;
    movement: MovementType;
    maxHp: number;
    /** The tile it fights from, and the terrain there. */
    tile: Coordinate;
    terrain: TileType;
}

interface BattleSceneProps {
    script: BattleScript;
    attacker: BattleFighter;
    defender: BattleFighter;
    /** The map's size in tiles, to zoom the fighters out of their tiles. */
    cols: number;
    rows: number;
    /** performance.now() when the scene started. */
    startedAt: number;
    /** Duration multiplier: 1 is normal, smaller is faster. */
    speed: number;
}

const SIDES: Side[] = ["left", "right"];
/** The share of the screen above the bottom window. */
const FIELD = 0.7;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (onChange: () => void) => {
    const query = window.matchMedia(MOTION_QUERY);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
};

/** With reduced motion: no screen shake, no full-screen flashes, no blinking. */
const useReducedMotion = () => useSyncExternalStore(subscribeMotion, () => window.matchMedia(MOTION_QUERY).matches, () => false);

/** The frame the scene is on, counted from when it started. */
function useFrame(total: number, startedAt: number, speed: number) {
    const [frame, setFrame] = useState(0);

    useEffect(() => {
        let request = 0;
        const tick = () => {
            const next = Math.min(total, Math.floor((performance.now() - startedAt) / (FRAME_MS * speed)));
            setFrame(next);
            if (next < total) request = requestAnimationFrame(tick);
        };

        request = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(request);
    }, [total, startedAt, speed]);

    return frame;
}

function useSize() {
    const ref = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });

    useLayoutEffect(() => {
        const element = ref.current!;
        const measure = () => setSize({ width: element.clientWidth, height: element.clientHeight });

        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    return [ref, size] as const;
}

/**
 * How big one pixel of the battle screen is, in CSS pixels: as big as the field
 * allows, rounded down to whole screen pixels when there's room, so every art
 * pixel comes out the same size.
 */
function pixelSize(width: number, height: number) {
    const ratio = window.devicePixelRatio || 1;
    const fit = (Math.min(width, (height * FIELD * 240) / STAGE_HEIGHT) / 240) * ratio;
    return Math.max(0.5, fit >= 2 ? Math.floor(fit) : fit) / ratio;
}

// --- The windows ---

const TRIANGLE: Record<-1 | 0 | 1, string | null> = { [-1]: "▼", 0: null, 1: "▲" };

/** One HP tick per point, a pixel wide with a pixel between, in rows of up to 40 as on the GBA. */
const HpTicks = ({ hp, maxHp, flash }: { hp: number; maxHp: number; flash: boolean }) => {
    const perTick = Math.max(1, Math.ceil(maxHp / 80));
    const ticks = Math.ceil(maxHp / perTick);
    const rows = ticks > 40 ? 2 : 1;
    const perRow = Math.ceil(ticks / rows);
    const filled = Math.ceil(hp / perTick);
    const width = perRow * 2 - 1;
    const height = rows * 7 - 2;

    return (
        <svg
            className={`ge-bs-ticks${flash ? " is-flashing" : ""}`}
            viewBox={`0 0 ${width} ${height}`}
            shapeRendering="crispEdges"
            style={{ width: `calc(var(--px) * ${width})`, height: `calc(var(--px) * ${height})` }}
            aria-hidden="true"
        >
            {Array.from({ length: ticks }, (_, i) => (
                <rect key={i} className={i < filled ? "is-full" : ""} x={(i % perRow) * 2} y={Math.floor(i / perRow) * 7} width={1} height={5} />
            ))}
        </svg>
    );
};

const Gauge = ({ side, info, fighter, frame, clock }: { side: Side; info: SideInfo; fighter: BattleFighter; frame: BattleFrame; clock: number }) => {
    const { stats } = info;
    const view = frame[side];
    const triangle = stats.canAttack ? TRIANGLE[stats.triangle] : null;
    // Numbers in the bitmap font, as the game draws them
    const value = (number: number) => <PixelText text={stats.canAttack ? String(number) : "--"} />;

    return (
        <div className={`ge-bs-gauge-side is-${side} ${factionClass(fighter.faction)}`}>
            <dl className="ge-bs-stats">
                <div><dt>HIT</dt><dd>{value(stats.hitRate)}</dd></div>
                <div><dt>DMG</dt><dd>{value(stats.damage)}</dd></div>
                <div><dt>CRT</dt><dd>{value(stats.critRate)}</dd></div>
            </dl>
            <div className="ge-bs-gauge-main">
                <div className="ge-bs-weapon">
                    <span className={`ge-bs-weapon-icon${stats.canAttack && stats.effective && Math.floor(clock / 8) % 2 === 0 ? " is-effective" : ""}`}>
                        <WeaponIcon type={stats.weaponType} />
                    </span>
                    <span className="ge-bs-weapon-name">{stats.weaponName ?? "Unarmed"}</span>
                    {triangle && (
                        <span className={`ge-bs-triangle is-${stats.triangle > 0 ? "up" : "down"}`} style={{ translate: `0 calc(var(--px) * ${Math.round(Math.sin(clock / 6))})` }}>
                            {triangle}
                        </span>
                    )}
                </div>
                <div className="ge-bs-hp">
                    <PixelText className={`ge-bs-hp-number${view.hpPulse ? " is-pulsing" : ""}`} text={String(view.hp)} />
                    <HpTicks hp={view.hp} maxHp={fighter.maxHp} flash={view.hpFlash} />
                </div>
            </div>
        </div>
    );
};

/**
 * The side-on battle screen, played over the map for one fight. It draws
 * whatever frame of the battle script it's on: the map darkening and the
 * fighters zooming out of their tiles, the strikes, and the way back. The field
 * is a canvas at the GBA's resolution, scaled up into big hard pixels; the
 * windows over it are HTML on the same pixel grid.
 */
const BattleScene = ({ script, attacker, defender, cols, rows, startedAt, speed }: BattleSceneProps) => {
    const [ref, { width, height }] = useSize();
    const frame = useFrame(script.total, startedAt, speed);
    const calm = useReducedMotion();
    const canvas = useRef<HTMLCanvasElement>(null);
    const renderer = useRef<FieldRenderer | null>(null);

    const view = sampleBattle(script, frame);
    const fighters: Record<Side, BattleFighter> = script.sides.left.role === "attacker"
        ? { left: attacker, right: defender }
        : { left: defender, right: attacker };

    const pixel = width > 0 ? pixelSize(width, height) : 1;
    const layout: FieldLayout = {
        width: Math.ceil(width / pixel),
        height: Math.ceil(height / pixel),
        stageLeft: Math.round((width / pixel - 240) / 2),
        stageTop: Math.round((height * FIELD) / pixel) - STAGE_HEIGHT,
    };

    // The middle of each fighter's tile, in CSS pixels and in field pixels
    const tileCenter = (tile: Coordinate) => ({ x: ((tile.x + 0.5) * width) / cols, y: ((tile.y + 0.5) * height) / rows });
    const field = (side: Side): FieldFighter => {
        const fighter = fighters[side];
        const center = tileCenter(fighter.tile);
        return {
            movement: fighter.movement,
            weapon: script.sides[side].stats.weaponType,
            faction: fighter.faction,
            hair: hairOf(fighter.id),
            terrain: fighter.terrain,
            tile: { x: center.x / pixel - layout.stageLeft, y: center.y / pixel - layout.stageTop },
        };
    };

    useLayoutEffect(() => {
        if (!canvas.current || width === 0) return;
        renderer.current ??= new FieldRenderer();
        renderer.current.render(canvas.current, { script, view, fighters: { left: field("left"), right: field("right") }, layout, clock: frame, calm });
    });

    // The dimming closes in on the point between the two fighters
    const a = tileCenter(fighters.left.tile);
    const b = tileCenter(fighters.right.tile);
    const middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const hole: CSSProperties = {
        left: lerp(0, middle.x, view.focus),
        top: lerp(0, middle.y, view.focus),
        width: lerp(width, 0, view.focus),
        height: lerp(height, 0, view.focus),
    };

    // The windows shake with the field (the canvas shakes itself)
    const quake = calm ? { x: 0, y: 0 } : view.quake;
    const shake: CSSProperties = { transform: `translate(${quake.x * pixel}px, ${-quake.y * pixel}px)` };
    const popupAlpha = view.popup ? Math.min(1, view.popup.progress * 14, (1 - view.popup.progress) * 14) : 0;

    return (
        // One label for the whole scene: the battle log says what happened, and the HP counting down would be noise
        <div ref={ref} className="ge-battle-scene" role="img" aria-label={`${attacker.name} attacks ${defender.name}`} style={{ "--px": `${pixel}px` } as CSSProperties}>
            <div className="ge-bs-dim" style={hole} />

            <div className="ge-bs-tokens" style={{ opacity: view.tokens }}>
                {view.tokens > 0 && SIDES.map(side => (
                    <UnitToken
                        key={side}
                        x={fighters[side].tile.x}
                        y={fighters[side].tile.y}
                        name={fighters[side].name}
                        faction={fighters[side].faction}
                        weaponType={script.sides[side].stats.weaponType}
                        movement={fighters[side].movement}
                        seed={fighters[side].id}
                        hp={view[side].hp}
                        maxHp={fighters[side].maxHp}
                        acted={script.sides[side].role === "attacker" && frame >= script.outro}
                    />
                ))}
            </div>

            <div className="ge-bs-black" style={{ opacity: view.black }} />

            <canvas ref={canvas} className="ge-bs-field" style={{ width: layout.width * pixel, height: layout.height * pixel }} aria-hidden="true" />

            <div className="ge-bs-shake" style={shake}>
                <div className="ge-bs-names" style={{ translate: `0 ${-(1 - view.names) * 160}%`, fontSize: Math.max(10, pixel * 8) }}>
                    {SIDES.map(side => (
                        <div key={side} className={`ge-bs-name is-${side} ${factionClass(fighters[side].faction)}`}>{fighters[side].name}</div>
                    ))}
                </div>

                <div className="ge-bs-gauge" style={{ height: `${(1 - FIELD) * 100}%`, translate: `0 ${(1 - view.windows) * 100}%`, fontSize: Math.max(10, pixel * 7) }}>
                    {SIDES.map(side => (
                        <Gauge key={side} side={side} info={script.sides[side]} fighter={fighters[side]} frame={view} clock={frame} />
                    ))}
                </div>
            </div>

            {view.whiteFlash && !calm && <div className="ge-bs-white" />}

            {view.popup && (
                <div className="ge-bs-popup" style={{ opacity: popupAlpha, fontSize: Math.max(11, pixel * 8) }}>
                    <WeaponIcon type={view.popup.popup.weapon} />
                    <span>{view.popup.popup.text}</span>
                </div>
            )}
        </div>
    );
};

export default BattleScene;
