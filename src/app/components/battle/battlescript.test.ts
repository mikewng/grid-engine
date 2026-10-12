import { describe, expect, it } from "vitest";
import { WeaponType } from "@/engine/models/items/weaponitem";
import { UnitFaction } from "@/engine/models/units/iunit";
import { CombatOutcome, CombatSideStats, Strike } from "@/engine/rules/combatresolver";
import { attackerSide, buildBattleScript, rangeOf, sampleBattle } from "./battlescript";

const stats = (overrides: Partial<CombatSideStats>): CombatSideStats => ({
    unitId: "unit",
    weaponName: "Iron Sword",
    weaponType: WeaponType.SWORD,
    hp: 20,
    canAttack: true,
    damage: 5,
    hitRate: 80,
    critRate: 0,
    attackSpeed: 5,
    strikes: 1,
    effective: false,
    triangle: 0,
    ...overrides,
});

interface Blow {
    by: Strike["by"];
    hit?: boolean;
    crit?: boolean;
    damage?: number;
    weaponBroke?: boolean;
}

/** A fight made of the given blows, with HP worked out as they land. Both sides start on 20 HP. */
function fight(blows: Blow[], options: { distance?: number; attacker?: Partial<CombatSideStats>; defender?: Partial<CombatSideStats> } = {}): CombatOutcome {
    const attacker = stats({ unitId: "a", ...options.attacker });
    const defender = stats({ unitId: "d", ...options.defender });
    const hp = { attacker: attacker.hp, defender: defender.hp };

    const strikes = blows.map((blow): Strike => {
        const hit = blow.hit ?? true;
        const target = blow.by === "attacker" ? "defender" : "attacker";
        const damage = hit ? Math.min(hp[target], blow.damage ?? 5) : 0;
        hp[target] -= damage;

        return { by: blow.by, hit, crit: blow.crit ?? false, damage, attackerHp: hp.attacker, defenderHp: hp.defender, weaponBroke: blow.weaponBroke ?? false };
    });

    return {
        distance: options.distance ?? 1,
        attacker,
        defender,
        strikes,
        attackerHp: hp.attacker,
        defenderHp: hp.defender,
        attackerWeaponUses: undefined,
        defenderWeaponUses: undefined,
        attackerKilled: hp.attacker <= 0,
        defenderKilled: hp.defender <= 0,
    };
}

/** The player attacking from the right, as in most fights. */
const script = (outcome: CombatOutcome) => buildBattleScript({ outcome, attackerSide: "right" });

describe("battle script", () => {
    it("puts player and allied units on the right", () => {
        expect(attackerSide(UnitFaction.P1, UnitFaction.ENEMY)).toBe("right");
        expect(attackerSide(UnitFaction.ENEMY, UnitFaction.P1)).toBe("left");
        expect(attackerSide(UnitFaction.ENEMY, UnitFaction.P2)).toBe("left");
        expect(attackerSide(UnitFaction.ENEMY, UnitFaction.NEUTRAL)).toBe("right");
    });

    it("sorts distances into close, far and farther", () => {
        expect([1, 2, 3, 4].map(rangeOf)).toEqual(["close", "far", "far", "farfar"]);
    });

    it("comes in from the map and goes back to it", () => {
        const battle = script(fight([{ by: "attacker" }]));
        const first = sampleBattle(battle, 0);
        const middle = sampleBattle(battle, battle.rounds[0].start);
        const last = sampleBattle(battle, battle.total);

        expect(first).toMatchObject({ focus: 0, zoom: 0, tokens: 1, background: 0 });
        expect(middle).toMatchObject({ focus: 1, zoom: 1, tokens: 0, background: 1, windows: 1, names: 1 });
        expect(last).toMatchObject({ focus: 0, zoom: 0, tokens: 1, background: 0 });
    });

    it("drains HP a point every two frames, for at least half a second", () => {
        const battle = script(fight([{ by: "attacker", damage: 6 }]));
        const round = battle.rounds[0];

        expect(round).toMatchObject({ striker: "right", target: "left", result: "hit" });
        expect(sampleBattle(battle, round.impact - 1).left.hp).toBe(20);
        expect(sampleBattle(battle, round.impact + 2).left.hp).toBe(19);
        expect(sampleBattle(battle, round.impact + 12).left.hp).toBe(14);
        expect(sampleBattle(battle, battle.total).left.hp).toBe(14);
        expect(round.settled - round.impact).toBe(30);

        const hit = sampleBattle(battle, round.impact);
        expect(hit.left).toMatchObject({ action: "hurt", flash: true, hpPulse: true });
        expect(hit.whiteFlash).toBe(true);
        expect(hit.quake).not.toEqual({ x: 0, y: 0 });
    });

    it("runs in to strike up close, and walks back", () => {
        const battle = script(fight([{ by: "attacker" }]));
        const round = battle.rounds[0];
        const home = sampleBattle(battle, round.start).right.x;

        expect(sampleBattle(battle, round.impact).right.x).toBeLessThan(home);
        expect(sampleBattle(battle, round.end).right.x).toBe(home);
    });

    it("dodges a miss", () => {
        const battle = script(fight([{ by: "attacker", hit: false }]));
        const round = battle.rounds[0];
        const frame = sampleBattle(battle, round.impact + 2);

        expect(round.result).toBe("miss");
        expect(frame.left.action).toBe("dodge");
        expect(frame.left.x).toBeLessThan(sampleBattle(battle, round.start).left.x);
        expect(frame.texts.map(text => text.text)).toEqual(["MISS"]);
        expect(frame.left.hp).toBe(20);
        expect(sampleBattle(battle, round.end).left.x).toBe(sampleBattle(battle, round.start).left.x);
    });

    it("shows NO DAMAGE for a hit that does nothing", () => {
        const battle = script(fight([{ by: "attacker", damage: 0 }]));
        const round = battle.rounds[0];

        expect(round.result).toBe("noDamage");
        expect(round.drain).toBeNull();
        expect(sampleBattle(battle, round.impact + 1).texts.map(text => text.text)).toEqual(["NO DAMAGE"]);
    });

    it("glints before a critical, then hits harder", () => {
        const normal = script(fight([{ by: "attacker" }]));
        const crit = script(fight([{ by: "attacker", crit: true }]));
        const round = crit.rounds[0];
        const charge = round.phases.find(phase => phase.action === "charge")!;

        expect(round.impact).toBeGreaterThan(normal.rounds[0].impact);
        expect(sampleBattle(crit, charge.start).right.charge).toBe(0);
        expect(sampleBattle(crit, round.impact).critBurst).toMatchObject({ side: "left", step: 0 });
        expect(sampleBattle(crit, round.impact).whiteFlash).toBe(false);
    });

    it("blinks out a fighter that falls, and waits for it", () => {
        const battle = script(fight([{ by: "attacker", damage: 20 }]));
        const round = battle.rounds[0];
        const death = round.death!;

        expect(death).toBe(round.impact + 40);
        expect(round.settled).toBe(death + 50);
        expect(sampleBattle(battle, death + 1).left.visible).toBe(false);
        expect(sampleBattle(battle, death + 6).left.visible).toBe(true);
        expect(sampleBattle(battle, death + 60).left.opacity).toBeCloseTo(0.5);
        expect(sampleBattle(battle, death + 90).left.visible).toBe(false);
        expect(battle.outro).toBeGreaterThan(death + 90);
    });

    it("starts a counter as the attacker heads back", () => {
        const battle = script(fight([{ by: "attacker" }, { by: "defender" }, { by: "attacker" }]));
        const [first, counter, followUp] = battle.rounds;

        expect(counter.striker).toBe("left");
        expect(counter.start).toBe(first.end - 6);
        expect(followUp.start).toBe(counter.end - 6);
        expect(sampleBattle(battle, battle.total).left.hp).toBe(10);
        expect(sampleBattle(battle, battle.total).right.hp).toBe(15);
    });

    it("lets the same fighter finish before striking again", () => {
        const battle = script(fight([{ by: "attacker" }, { by: "attacker" }]));

        expect(battle.rounds[1].start).toBe(battle.rounds[0].end);
    });

    it("follows a shot across the screen", () => {
        const battle = buildBattleScript({
            outcome: fight([{ by: "attacker" }, { by: "attacker" }], { distance: 2, attacker: { weaponType: WeaponType.BOW, weaponName: "Iron Bow" } }),
            attackerSide: "left",
        });
        const [shot, second] = battle.rounds;

        expect(battle.range).toBe("far");
        expect(shot.style).toBe("bow");
        expect(sampleBattle(battle, shot.release).projectile).toMatchObject({ style: "bow", from: "left" });
        expect(sampleBattle(battle, shot.impact).projectile).toBeNull();

        // On the archer, then on the target, then back to the archer for the second shot
        expect(sampleBattle(battle, shot.release).camera).toBe(32);
        expect(sampleBattle(battle, shot.impact).camera).toBe(0);
        expect(sampleBattle(battle, second.start).camera).toBe(32);
    });

    it("throws a melee weapon at range", () => {
        const battle = script(fight([{ by: "attacker" }], { distance: 2, attacker: { weaponType: WeaponType.AXE } }));
        const round = battle.rounds[0];

        expect(round.style).toBe("thrown");
        expect(sampleBattle(battle, round.release + 1).right.armed).toBe(false);
        expect(sampleBattle(battle, round.end - 1).right.armed).toBe(true);
    });

    it("casts magic from where the caster stands", () => {
        const battle = script(fight([{ by: "attacker" }], { attacker: { weaponType: WeaponType.BMAGIC, weaponName: "Fire" } }));
        const round = battle.rounds[0];
        const home = sampleBattle(battle, round.start).right.x;

        expect(round.style).toBe("magic");
        for (let frame = round.start; frame < round.end; frame++) {
            expect(sampleBattle(battle, frame).right.x).toBe(home);
        }
        expect(sampleBattle(battle, round.impact).spell).toMatchObject({ stage: "effect", side: "left" });
    });

    it("says when a weapon breaks before leaving", () => {
        const battle = script(fight([{ by: "attacker", weaponBroke: true }]));

        expect(battle.popups).toEqual([expect.objectContaining({ side: "right", text: "Iron Sword broke!" })]);
        expect(sampleBattle(battle, battle.popups[0].start + 10).popup?.popup.text).toBe("Iron Sword broke!");
        expect(battle.outro).toBeGreaterThan(battle.popups[0].start + 96);
    });
});
