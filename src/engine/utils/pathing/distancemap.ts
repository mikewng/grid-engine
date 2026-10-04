import { Coordinate } from "../../models/grid/coordinate";

/**
 * The cheapest cost from one tile to every tile reachable within a budget, plus
 * where each cheapest route came from. One of these answers several questions:
 * the movement range, the path to any tile in it, and (with an unlimited
 * budget) how far everything is, which the AI uses to approach targets.
 */
export interface DistanceMap {
    readonly width: number;
    readonly height: number;
    readonly origin: Coordinate;
    /** Cost to reach each tile (index y * width + x), or -1 if it can't be reached. */
    readonly cost: Int32Array;
    /** Index of the tile the cheapest route arrives from, or -1. */
    readonly previous: Int32Array;
}

/** Cost to step onto `to` (coming from `from`), or null if the step isn't allowed. */
export type StepCost = (to: Coordinate, from: Coordinate) => number | null;

// North, east, south, west: a fixed order keeps paths deterministic
const DIRECTIONS: readonly Coordinate[] = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
];

/**
 * Dijkstra's algorithm over the grid. Unlike a breadth-first search, a tile is
 * only settled at its cheapest cost, so a long route through cheap terrain
 * correctly beats a short one through expensive terrain.
 */
export function computeDistanceMap(
    width: number,
    height: number,
    origin: Coordinate,
    budget: number,
    stepCost: StepCost,
): DistanceMap {
    const cost = new Int32Array(width * height).fill(-1);
    const previous = new Int32Array(width * height).fill(-1);
    const heap = new MinHeap();

    const start = origin.y * width + origin.x;
    cost[start] = 0;
    heap.push(0, start);

    while (heap.size > 0) {
        const { priority, index } = heap.pop();

        // A cheaper route to this tile was already settled
        if (priority > cost[index]) continue;

        const from = { x: index % width, y: Math.floor(index / width) };

        for (const direction of DIRECTIONS) {
            const to = { x: from.x + direction.x, y: from.y + direction.y };

            if (to.x < 0 || to.y < 0 || to.x >= width || to.y >= height) continue;

            const step = stepCost(to, from);

            if (step === null) continue;

            const total = priority + step;
            const target = to.y * width + to.x;

            if (total > budget) continue;
            if (cost[target] !== -1 && total >= cost[target]) continue;

            cost[target] = total;
            previous[target] = index;
            heap.push(total, target);
        }
    }

    return { width, height, origin: { ...origin }, cost, previous };
}

/** Cost to reach a tile, or undefined if it's off the map or unreachable. */
export function costAt(map: DistanceMap, tile: Coordinate): number | undefined {
    if (tile.x < 0 || tile.y < 0 || tile.x >= map.width || tile.y >= map.height) return undefined;

    const cost = map.cost[tile.y * map.width + tile.x];
    return cost === -1 ? undefined : cost;
}

/** Every reachable tile, including the origin, in row order. */
export function reachableTiles(map: DistanceMap): Coordinate[] {
    const tiles: Coordinate[] = [];

    for (let index = 0; index < map.cost.length; index++) {
        if (map.cost[index] !== -1) {
            tiles.push({ x: index % map.width, y: Math.floor(index / map.width) });
        }
    }

    return tiles;
}

/**
 * The cheapest route from the origin to a tile: each step after the origin, up
 * to and including the target. Empty when the target is the origin; undefined
 * when it can't be reached.
 */
export function pathTo(map: DistanceMap, target: Coordinate): Coordinate[] | undefined {
    if (costAt(map, target) === undefined) return undefined;

    const path: Coordinate[] = [];
    let index = target.y * map.width + target.x;
    const start = map.origin.y * map.width + map.origin.x;

    while (index !== start) {
        path.push({ x: index % map.width, y: Math.floor(index / map.width) });
        index = map.previous[index];
    }

    return path.reverse();
}

/** A binary min-heap of tile indices. Equal priorities come out in insertion order. */
class MinHeap {
    private items: { priority: number; order: number; index: number }[] = [];
    private pushes = 0;

    get size(): number {
        return this.items.length;
    }

    push(priority: number, index: number): void {
        this.items.push({ priority, order: this.pushes++, index });
        this.siftUp(this.items.length - 1);
    }

    pop(): { priority: number; index: number } {
        const top = this.items[0];
        const last = this.items.pop()!;

        if (this.items.length > 0) {
            this.items[0] = last;
            this.siftDown(0);
        }

        return top;
    }

    private less(a: number, b: number): boolean {
        const x = this.items[a];
        const y = this.items[b];
        return x.priority < y.priority || (x.priority === y.priority && x.order < y.order);
    }

    private siftUp(i: number): void {
        while (i > 0) {
            const parent = (i - 1) >> 1;

            if (!this.less(i, parent)) break;

            [this.items[i], this.items[parent]] = [this.items[parent], this.items[i]];
            i = parent;
        }
    }

    private siftDown(i: number): void {
        for (;;) {
            const left = 2 * i + 1;
            const right = left + 1;
            let smallest = i;

            if (left < this.items.length && this.less(left, smallest)) smallest = left;
            if (right < this.items.length && this.less(right, smallest)) smallest = right;
            if (smallest === i) break;

            [this.items[i], this.items[smallest]] = [this.items[smallest], this.items[i]];
            i = smallest;
        }
    }
}
