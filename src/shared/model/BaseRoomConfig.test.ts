import { describe, expect, it } from 'vitest';
import { BaseRoomConfig, type RoomConfigRoom } from './BaseRoomConfig.ts';

const room = (playerCount: number): RoomConfigRoom => ({ players: { count: () => playerCount } });

describe('BaseRoomConfig', () => {
  it('max score: explicit value, else (players-1)*10 floored at 1', () => {
    const cfg = new BaseRoomConfig(room(4));
    expect(cfg.getMaxScore()).toBe(30); // default: (4-1)*10
    expect(cfg.setMaxScore(50)).toBe(true);
    expect(cfg.getMaxScore()).toBe(50);
    cfg.setMaxScore('0'); // 0 → null → back to default
    expect(cfg.maxScore).toBeNull();
    expect(new BaseRoomConfig(room(1)).getMaxScore()).toBe(1); // floor
  });

  it('variables: only known names, clamped to [-1, 1]', () => {
    const cfg = new BaseRoomConfig(room(2));
    expect(cfg.variableExists('bonusRate')).toBe(true);
    expect(cfg.variableExists('nope')).toBe(false);

    expect(cfg.setVariable('bonusRate', 0.5)).toBe(true);
    expect(cfg.getVariable('bonusRate')).toBe(0.5);

    expect(cfg.setVariable('bonusRate', 2)).toBe(false); // out of range
    expect(cfg.getVariable('bonusRate')).toBe(0.5); // unchanged
    expect(cfg.setVariable('unknown', 0)).toBe(false);
  });

  it('bonuses: toggle / get / set only for known names', () => {
    const cfg = new BaseRoomConfig(room(2));
    expect(cfg.getBonus('BonusSelfFast')).toBe(true);
    expect(cfg.toggleBonus('BonusSelfFast')).toBe(true);
    expect(cfg.getBonus('BonusSelfFast')).toBe(false);

    expect(cfg.getBonus('BonusSelfRandom')).toBe(false); // default-off
    expect(cfg.toggleBonus('Nonexistent')).toBe(false);
    expect(cfg.getBonus('Nonexistent')).toBeUndefined();

    cfg.setBonus('BonusGameClear', 0);
    expect(cfg.getBonus('BonusGameClear')).toBe(false);
  });

  it('19 bonuses; 16 on by default, only the three *Random ones off', () => {
    const cfg = new BaseRoomConfig(room(2));
    const names = Object.keys(cfg.bonuses);
    expect(names).toHaveLength(19);
    expect(names.filter((n) => cfg.bonuses[n])).toHaveLength(16);
    expect(names.filter((n) => !cfg.bonuses[n])).toEqual([
      'BonusSelfRandom',
      'BonusLeaderRandom',
      'BonusEnemyRandom',
    ]);
  });

  it('privacy: allow() honours open flag then password', () => {
    const cfg = new BaseRoomConfig(room(2));
    expect(cfg.allow(null)).toBe(true); // open
    cfg.open = false;
    cfg.password = '1234';
    expect(cfg.allow(null)).toBe(false);
    expect(cfg.allow('9999')).toBe(false);
    expect(cfg.allow('1234')).toBe(true);
  });

  it('generatePassword makes a 4-digit string', () => {
    const cfg = new BaseRoomConfig(room(2));
    const pw = cfg.generatePassword();
    expect(pw).toMatch(/^[1-9]{4}$/);
  });

  it('serialize exposes the config shape', () => {
    const cfg = new BaseRoomConfig(room(3));
    cfg.setMaxScore(20);
    expect(cfg.serialize()).toEqual({
      maxScore: 20,
      variables: { bonusRate: 0 },
      bonuses: cfg.bonuses,
      open: true,
      password: null,
    });
  });
});
