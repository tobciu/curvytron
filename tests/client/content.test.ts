import { describe, expect, it } from 'vitest';
import { bonusDefinitions, bonusTarget } from '../../src/shared/bonuses.ts';
import { awardFields } from '../../src/server/service/GameStats.ts';
import { recordIds } from '../../src/server/storage/queries.ts';
import { awardInfo, recordInfo, statInfo } from '../../src/client/content/stats.ts';
import { featIds } from '../../src/server/service/Feats.ts';
import { featInfo } from '../../src/client/content/feats.ts';
import { gameModes } from '../../src/client/content/modes.ts';

describe('texts of the rules page', () => {
    it('describes every bonus', () => {
        for (const definition of bonusDefinitions) {
            expect(definition.label, definition.name).not.toBe('');
            expect(definition.description, definition.name).not.toBe('');
            expect(['self', 'enemy', 'leader', 'all', 'game']).toContain(bonusTarget(definition));
        }
    });

    it('explains every award the server gives, and only those', () => {
        expect(Object.keys(awardInfo).toSorted()).toEqual(Object.keys(awardFields).toSorted());

        for (const [id, field] of Object.entries(awardFields)) {
            expect(awardInfo[id].field).toBe(field);
        }
    });

    it('explains how every statistic is got', () => {
        for (const info of Object.values(statInfo)) {
            expect(info.label).not.toBe('');
            expect(info.description).not.toBe('');
            expect(info.how).not.toBe('');
        }
    });

    it('has a text for every feat the server gives, and only those', () => {
        expect(Object.keys(featInfo).toSorted()).toEqual([...featIds].toSorted());

        for (const info of Object.values(featInfo)) {
            expect(info.label).not.toBe('');
            expect(info.description).not.toBe('');
        }
    });

    it('has a text for every record the server has, and only those', () => {
        expect(Object.keys(recordInfo).toSorted()).toEqual([...recordIds].toSorted());
    });

    it('has at least one game mode with rules', () => {
        expect(gameModes.length).toBeGreaterThan(0);
        expect(gameModes.every((mode) => mode.rules.length > 0)).toBe(true);
    });
});
