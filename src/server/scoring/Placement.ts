import { Body } from '../core/Body.ts';
import type { Game } from '../model/Game.ts';

/** A position is risky when it is this close to a border, or to a trail */
export const riskDistance = 8;

/** How many positions are tried to find a risky one */
const positionTries = 60;

/**
 * A free position for a bonus of the given radius, anywhere.
 */
export function findFreePosition(game: Game, radius: number): [number, number] {
    return game.bonusManager.getRandomPosition(radius, game.bonusManager.bonusPopingMargin) as [number, number];
}

/**
 * A free position close to a border or to a trail, where it takes a risk to catch the bonus. Without one, the one
 * closest to a border.
 */
export function findRiskyPosition(game: Game, radius: number): [number, number] {
    const world = game.world;
    const margin = radius + 1;
    const body = new Body(0, 0, radius);
    const probe = new Body(0, 0, riskDistance);
    let best: [number, number] | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let i = 0; i < positionTries; i++) {
        body.x = probe.x = world.getRandomPoint(margin);
        body.y = probe.y = world.getRandomPoint(margin);

        if (!world.testBody(body) || !game.bonusManager.world.testBody(body)) {
            continue;
        }

        const wall = Math.min(body.x, body.y, game.size - body.x, game.size - body.y);

        if (wall <= riskDistance || world.getBody(probe)) {
            return [body.x, body.y];
        }

        if (wall < bestDistance) {
            bestDistance = wall;
            best = [body.x, body.y];
        }
    }

    return best ?? findFreePosition(game, radius);
}
