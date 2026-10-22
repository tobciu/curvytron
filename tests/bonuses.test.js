import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { bonusDefinitions, spriteLines, spritePosition } from '../src/shared/bonuses.ts';
import { RoomConfig } from '../src/server/model/RoomConfig.ts';
import { RoomConfig as ClientRoomConfig } from '../src/client/model/RoomConfig.ts';
import { buildSprite } from '../tools/build-sprite.ts';

describe('bonus registry', () => {
    it('has a name and a css class for every bonus, each only once', () => {
        const names = bonusDefinitions.map(({ name }) => name);
        const classes = bonusDefinitions.map(({ css }) => css);

        expect(new Set(names).size).toBe(names.length);
        expect(new Set(classes).size).toBe(classes.length);
        expect(names.every((name) => /^Bonus[A-Z][A-Za-z]+$/.test(name))).toBe(true);
    });

    it('has a class on the server for every bonus, and no class without a bonus', () => {
        const config = new RoomConfig({});

        expect(Object.keys(config.bonusTypes).toSorted()).toEqual(bonusDefinitions.map(({ name }) => name).toSorted());
    });

    it('is what the configuration of a room is made of, on both sides', () => {
        const server = new RoomConfig({});
        const client = new ClientRoomConfig({});

        for (const config of [server, client]) {
            expect(config.bonuses).toEqual(
                Object.fromEntries(bonusDefinitions.map(({ name, enabled }) => [name, enabled]))
            );
        }

        expect(client.bonusClasses).toEqual(Object.fromEntries(bonusDefinitions.map(({ name, css }) => [name, css])));
    });

    it('only has known bonuses in the presets', () => {
        const client = new ClientRoomConfig({});
        const names = bonusDefinitions.map(({ name }) => name);

        for (const preset of client.presets) {
            expect(
                preset.bonuses.filter((name) => !names.includes(name)),
                preset.name
            ).toEqual([]);
        }
    });

    it('gives the presets their bonuses, and "All" every bonus', () => {
        const client = new ClientRoomConfig({});
        const preset = (name) => client.presets.find((candidate) => candidate.name === name).bonuses.toSorted();

        expect(preset('All')).toEqual(bonusDefinitions.map(({ name }) => name).toSorted());
        expect(preset('Speed of light')).toEqual(['BonusEnemyFast', 'BonusSelfFast']);
        expect(preset('Super size me')).toEqual(['BonusEnemyBig']);
        expect(preset('Solo')).toEqual(
            [
                'BonusSelfSmall',
                'BonusSelfSlow',
                'BonusSelfFast',
                'BonusSelfMaster',
                'BonusGameBorderless',
                'BonusGameClear'
            ].toSorted()
        );
        expect(preset('No bonuses')).toEqual([]);
    });

    it('loads the class of every bonus, with the name of the bonus', () => {
        const config = new RoomConfig({});

        for (const { name } of bonusDefinitions) {
            expect(config.bonusTypes[name].name).toBe(name);
        }
    });

    it('finds the position of a bonus in the sprite', () => {
        expect(spritePosition('BonusSelfFast')).toEqual({ column: 0, line: 0 });
        expect(spritePosition('BonusSelfSlow')).toEqual({ column: 2, line: 0 });
        expect(spritePosition('BonusEnemySlow')).toEqual({ column: 0, line: 1 });
        expect(spritePosition('BonusSelfBorderless')).toEqual({ column: 0, line: 6 });
        expect(() => spritePosition('BonusNothing')).toThrow('Unknown bonus');
    });
});

describe('bonus sprite', () => {
    it('is built from the images of assets/bonuses, as it is in public/images/bonus.png', () => {
        const built = buildSprite();
        const committed = PNG.sync.read(readFileSync('public/images/bonus.png'));

        expect(built.height / 100).toBe(spriteLines());
        expect([built.width, built.height]).toEqual([committed.width, committed.height]);
        // Same pixels: run `npm run sprite` after changing an image or the list of the bonuses
        expect(Buffer.compare(built.data, committed.data) === 0).toBe(true);
    });
});
