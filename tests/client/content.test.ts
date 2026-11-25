import { describe, expect, it } from 'vitest';
import { bonusDefinitions, bonusTarget } from '../../src/shared/bonuses.ts';
import { awardFields } from '../../src/server/service/GameStats.ts';
import { recordIds } from '../../src/server/storage/queries.ts';
import { awardInfo, recordInfo, statInfo } from '../../src/client/content/stats.ts';
import { featIds } from '../../src/server/service/Feats.ts';
import { featInfo } from '../../src/client/content/feats.ts';
import { applyServerInfo, gameModes, setClientEnabledModes } from '../../src/client/content/modes.ts';
import { defaultScoringMode, enabledScoringModes, getEnabledScoringModes, scoringModes } from '../../src/shared/scoring.ts';

describe('texts of the rules page', () => {
    it('describes every bonus', () => {
        for (const definition of bonusDefinitions) {
            expect(definition.label, definition.name).not.toBe('');
            expect(definition.description, definition.name).not.toBe('');

            // The special bonuses are not on the page: no group
            if (!definition.special) {
                expect(['self', 'enemy', 'leader', 'all', 'game']).toContain(bonusTarget(definition));
            }
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
        expect(gameModes.value.length).toBeGreaterThan(0);
        expect(gameModes.value.every((mode) => mode.rules.length > 0)).toBe(true);
    });

    it('offers only the enabled modes, with a text for each one', () => {
        // The toggle hides the modes that are still in development
        expect(gameModes.value.map((mode) => mode.id).toSorted()).toEqual([...enabledScoringModes].toSorted());

        // A mode behind the toggle is not offered, but keeps its text, for when the toggle is flipped
        for (const id of scoringModes.filter((mode) => !getEnabledScoringModes().includes(mode))) {
            expect(gameModes.value.some((mode) => mode.id === id)).toBe(false);
        }

        for (const mode of gameModes.value) {
            expect(mode.summary.trim().length).toBeGreaterThan(0);
        }
    });

    it('shows the modes the server announces through the runtime toggle', () => {
        // The server tells the page which modes are enabled: the settings and the rules page follow
        setClientEnabledModes(['classic', 'starchase']);
        expect(gameModes.value.map((mode) => mode.id).toSorted()).toEqual(['classic', 'starchase']);

        // Unknown ids are dropped, and back to the default
        setClientEnabledModes(['chaos' as never]);
        expect(gameModes.value.map((mode) => mode.id)).toEqual(['classic']);

        setClientEnabledModes([defaultScoringMode]);
        expect(gameModes.value.map((mode) => mode.id)).toEqual(['classic']);
    });

    it('reads the payload out of the DOM-like event the client emitter wraps', () => {
        // The client emitter passes listeners a DOM-like event: `{ type, detail }`
        // (the server sends the payload itself, when it is subscribed there)
        applyServerInfo({ type: 'server:info', detail: { enabledModes: ['classic', 'starchase'] } });
        expect(gameModes.value.map((mode) => mode.id).toSorted()).toEqual(['classic', 'starchase']);

        // The payload itself (no wrapping) is read too
        applyServerInfo({ enabledModes: ['starchase'] });
        expect(gameModes.value.map((mode) => mode.id)).toEqual(['starchase']);

        // Garbage is ignored, the default stays
        applyServerInfo(null);
        applyServerInfo({ detail: { enabledModes: 'classic' } });
        expect(gameModes.value.map((mode) => mode.id)).toEqual(['starchase']);

        setClientEnabledModes([defaultScoringMode]);
        expect(gameModes.value.map((mode) => mode.id)).toEqual(['classic']);
    });
});
