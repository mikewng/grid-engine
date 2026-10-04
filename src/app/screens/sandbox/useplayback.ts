'use client'
import { useCallback, useEffect, useRef, useState } from "react";
import { GameEvent } from "@/engine/models/game/gamestate";
import { Coordinate } from "@/engine/models/grid/coordinate";
import { IUnit, UnitFaction } from "@/engine/models/units/iunit";
import { CombatOutcome } from "@/engine/rules/combatresolver";
import { FloatingText } from "@/app/components/map/mapoverlays";

/** How a unit looks at one moment of a replay. */
export interface UnitVisual {
    x: number;
    y: number;
    hp: number;
    alive: boolean;
    acted: boolean;
    dying?: boolean;
}

export type Visuals = Record<string, UnitVisual>;

export interface BannerInfo {
    title: string;
    subtitle?: string;
    tone: "player" | "enemy" | "ally" | "neutral";
}

export interface BattleView {
    attackerId: string;
    defenderId: string;
    outcome: CombatOutcome;
    attackerHp: number;
    defenderHp: number;
    active: "attacker" | "defender" | null;
}

export interface Motion {
    lunge?: { unitId: string; dx: number; dy: number };
    hurt?: { unitId: string; kind: "hit" | "crit" };
}

export interface PlaybackContext {
    /** The banner that opens a faction's phase. */
    banner(faction: UnitFaction, turn: number): BannerInfo;
    /** AI units get a beat of focus before they move, so the player can follow along. */
    isAi(unitId: string): boolean;
}

/** Where every unit is and how it looks right now, to replay events from. */
export function snapshotUnits(units: readonly IUnit[]): Visuals {
    return Object.fromEntries(units.map(unit => [unit.id, {
        x: unit.position.x,
        y: unit.position.y,
        hp: unit.stats.currentHealth,
        alive: unit.isAlive,
        acted: unit.hasActed,
    }]));
}

const STEP_MS = 110;

/**
 * Replays engine events as animation. The engine has already applied them, so
 * the replay draws from a snapshot taken before the command and steps it
 * forward event by event. When it ends (or is skipped) the UI goes back to
 * drawing the engine's state, which is where the replay ends up anyway.
 *
 * @param speed duration multiplier: 1 is normal, smaller is faster
 */
export function usePlayback(speed: number) {
    const [visuals, setVisuals] = useState<Visuals | null>(null);
    const [floats, setFloats] = useState<FloatingText[]>([]);
    const [banner, setBanner] = useState<BannerInfo | null>(null);
    const [battle, setBattle] = useState<BattleView | null>(null);
    const [motion, setMotion] = useState<Motion>({});
    const [focus, setFocus] = useState<Coordinate | null>(null);
    const [playing, setPlaying] = useState(false);

    const runId = useRef(0);
    const wake = useRef<(() => void) | null>(null);
    const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
    const nextFloatId = useRef(0);
    const speedRef = useRef(speed);

    useEffect(() => {
        speedRef.current = speed;
    }, [speed]);

    const clear = useCallback(() => {
        for (const timer of timers.current) clearTimeout(timer);
        timers.current.clear();

        setVisuals(null);
        setFloats([]);
        setBanner(null);
        setBattle(null);
        setMotion({});
        setFocus(null);
        setPlaying(false);
    }, []);

    /** Jump to the end of whatever is playing. */
    const skip = useCallback(() => {
        runId.current++;
        wake.current?.();
        wake.current = null;
        clear();
    }, [clear]);

    useEffect(() => {
        const run = runId;
        const pending = timers.current;

        return () => {
            run.current++;
            for (const timer of pending) clearTimeout(timer);
        };
    }, []);

    const play = useCallback(async (events: readonly GameEvent[], before: Visuals, context: PlaybackContext) => {
        // A new replay replaces any that's still going
        runId.current++;
        wake.current?.();
        const id = runId.current;

        const current: Visuals = Object.fromEntries(Object.entries(before).map(([unitId, visual]) => [unitId, { ...visual }]));
        const show = () => setVisuals(Object.fromEntries(Object.entries(current).map(([unitId, visual]) => [unitId, { ...visual }])));

        /** Pause, unless skipped. Resolves false if this replay should stop. */
        const pause = (ms: number) => new Promise<boolean>(resolve => {
            if (runId.current !== id) return resolve(false);

            const timer = setTimeout(() => {
                timers.current.delete(timer);
                wake.current = null;
                resolve(runId.current === id);
            }, ms * speedRef.current);

            timers.current.add(timer);
            wake.current = () => {
                clearTimeout(timer);
                timers.current.delete(timer);
                resolve(false);
            };
        });

        const float = (tile: Coordinate, text: string, kind: FloatingText["kind"]) => {
            const floatId = nextFloatId.current++;
            setFloats(items => [...items, { id: floatId, x: tile.x, y: tile.y, text, kind }]);

            const timer = setTimeout(() => {
                timers.current.delete(timer);
                setFloats(items => items.filter(item => item.id !== floatId));
            }, 1100);
            timers.current.add(timer);
        };

        setPlaying(true);
        show();

        for (const event of events) {
            if (runId.current !== id) return;

            switch (event.type) {
                case "turnStarted": {
                    for (const visual of Object.values(current)) visual.acted = false;
                    show();

                    setBanner(context.banner(event.faction, event.turn));
                    if (!await pause(1150)) return;
                    setBanner(null);
                    if (!await pause(120)) return;
                    break;
                }

                case "unitMoved": {
                    const visual = current[event.unitId];
                    if (!visual) break;

                    const ai = context.isAi(event.unitId);

                    if (ai) {
                        setFocus({ x: visual.x, y: visual.y });
                        if (!await pause(280)) return;
                    }

                    for (const step of event.path) {
                        visual.x = step.x;
                        visual.y = step.y;
                        show();
                        if (ai) setFocus(step);
                        if (!await pause(STEP_MS)) return;
                    }

                    if (ai && !await pause(120)) return;
                    break;
                }

                case "moveUndone": {
                    const visual = current[event.unitId];
                    if (!visual) break;

                    visual.x = event.to.x;
                    visual.y = event.to.y;
                    show();
                    break;
                }

                case "combat": {
                    const { attackerId, defenderId, outcome } = event;
                    const attacker = current[attackerId];
                    const defender = current[defenderId];
                    if (!attacker || !defender) break;

                    setFocus(null);
                    setBattle({ attackerId, defenderId, outcome, attackerHp: attacker.hp, defenderHp: defender.hp, active: null });
                    if (!await pause(380)) return;

                    for (const strike of outcome.strikes) {
                        const byAttacker = strike.by === "attacker";
                        const striker = byAttacker ? attacker : defender;
                        const target = byAttacker ? defender : attacker;

                        setBattle(view => view && { ...view, active: strike.by });
                        setMotion({
                            lunge: {
                                unitId: byAttacker ? attackerId : defenderId,
                                dx: Math.sign(target.x - striker.x),
                                dy: Math.sign(target.y - striker.y),
                            },
                        });
                        if (!await pause(strike.crit ? 360 : 200)) return;

                        attacker.hp = strike.attackerHp;
                        defender.hp = strike.defenderHp;
                        show();
                        setBattle(view => view && { ...view, attackerHp: strike.attackerHp, defenderHp: strike.defenderHp });
                        setMotion(strike.hit ? { hurt: { unitId: byAttacker ? defenderId : attackerId, kind: strike.crit ? "crit" : "hit" } } : {});

                        if (!strike.hit) float(target, "MISS", "miss");
                        else if (strike.crit) float(target, `CRIT ${strike.damage}`, "crit");
                        else float(target, `${strike.damage}`, "damage");

                        if (strike.weaponBroke) float(striker, "Weapon broke!", "break");

                        if (!await pause(560)) return;
                        setMotion({});
                        if (!await pause(140)) return;
                    }

                    attacker.acted = true;
                    show();
                    if (!await pause(300)) return;
                    setBattle(null);
                    break;
                }

                case "unitWaited": {
                    const visual = current[event.unitId];
                    if (!visual) break;

                    visual.acted = true;
                    show();
                    if (context.isAi(event.unitId) && !await pause(100)) return;
                    break;
                }

                case "statusDamage": {
                    const visual = current[event.unitId];
                    if (!visual) break;

                    visual.hp = Math.max(0, visual.hp - event.damage);
                    show();
                    float(visual, `${event.damage}`, "poison");
                    if (!await pause(650)) return;
                    break;
                }

                case "unitDefeated": {
                    const visual = current[event.unitId];
                    if (!visual) break;

                    visual.dying = true;
                    show();
                    if (!await pause(560)) return;
                    visual.alive = false;
                    visual.dying = false;
                    show();
                    break;
                }

                case "gameOver":
                    if (!await pause(250)) return;
                    break;
            }
        }

        if (runId.current === id) clear();
    }, [clear]);

    return { playing, visuals, floats, banner, battle, motion, focus, play, skip };
}
