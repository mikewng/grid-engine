/**
 * A seedable source of randomness. All engine randomness goes through one of
 * these, so a game can be replayed, tested, or kept in sync across clients by
 * sharing the seed (or the saved state).
 */
export interface Rng {
    /** A float in [0, 1). */
    next(): number;
    getState(): number;
    setState(state: number): void;
}

/** mulberry32: small and fast, and its whole state is one 32-bit number. */
export class SeededRng implements Rng {
    private state: number;

    constructor(seed: number) {
        this.state = seed >>> 0;
    }

    next(): number {
        this.state = (this.state + 0x6d2b79f5) >>> 0;

        let t = this.state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    getState(): number {
        return this.state;
    }

    setState(state: number): void {
        this.state = state >>> 0;
    }
}

/** A whole number from 0 to 99. */
export function roll100(rng: Rng): number {
    return Math.floor(rng.next() * 100);
}
