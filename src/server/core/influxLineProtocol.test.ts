import { describe, expect, it } from 'vitest';
import { toLineProtocol } from './influxLineProtocol.ts';

describe('toLineProtocol', () => {
  it('formats a bare numeric point with no tags', () => {
    expect(toLineProtocol('client.total', {}, { value: 3 })).toBe('client.total value=3');
  });

  it('formats multiple tags and fields', () => {
    const line = toLineProtocol('game', { game: 'abc123' }, { rounds: 2, finished: true });
    expect(line).toBe('game,game=abc123 rounds=2,finished=true');
  });

  it('quotes and escapes string field values', () => {
    expect(toLineProtocol('deploy', {}, { version: '2.0.0' })).toBe('deploy version="2.0.0"');
    expect(toLineProtocol('m', {}, { s: 'has "quotes"' })).toBe(String.raw`m s="has \"quotes\""`);
  });

  it('escapes commas, spaces and equals signs in measurement/tags', () => {
    expect(toLineProtocol('has space', {}, { v: 1 })).toBe(String.raw`has\ space v=1`);
    expect(toLineProtocol('m', { 'a,b': 'c=d e' }, { v: 1 })).toBe(String.raw`m,a\,b=c\=d\ e v=1`);
  });
});
