import { bonusDefinitions } from '../../../shared/bonuses.ts';
import type { Bonus } from './Bonus.ts';

/**
 * The classes of the bonuses, by name: every bonus of the registry (`src/shared/bonuses.ts`) has its class in
 * `Bonus<name>.ts` of this directory, whose export has the name of the bonus.
 */
export const bonusTypes: Record<string, new (x: number, y: number) => Bonus> = Object.fromEntries(
    await Promise.all(
        bonusDefinitions.map(async ({ name }) => {
            const module = await import(`./${name}.ts`);

            if (typeof module[name] !== 'function') {
                throw new TypeError(`src/server/model/Bonus/${name}.ts has to export the class ${name}`);
            }

            return [name, module[name]];
        })
    )
);
