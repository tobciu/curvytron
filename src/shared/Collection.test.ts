import { describe, expect, it, vi } from 'vitest';
import { Collection } from './Collection.ts';

const item = (id: number, extra: Record<string, unknown> = {}) => ({ id, ...extra });

describe('Collection', () => {
  it('adds items and reports size', () => {
    const c = new Collection<{ id: number }>();
    expect(c.isEmpty()).toBe(true);
    expect(c.add(item(1))).toBe(true);
    expect(c.add(item(2))).toBe(true);
    expect(c.count()).toBe(2);
    expect(c.isEmpty()).toBe(false);
  });

  it('rejects a duplicate by key', () => {
    const c = new Collection<{ id: number }>();
    const a = item(1);
    expect(c.add(a)).toBe(true);
    expect(c.add(item(1))).toBe(false);
    expect(c.count()).toBe(1);
  });

  it('honours a custom key', () => {
    const c = new Collection<{ name: string }>([], 'name');
    c.add({ name: 'a' });
    c.add({ name: 'b' });
    expect(c.getById('b')).toEqual({ name: 'b' });
    expect(c.getById('missing')).toBeNull();
  });

  it('auto-assigns ids when index is enabled', () => {
    const c = new Collection<{ id?: number }>([], 'id', true);
    const a: { id?: number } = {};
    const b: { id?: number } = {};
    c.add(a);
    c.add(b);
    expect(a.id).toBe(1);
    expect(b.id).toBe(2);
    // an explicit higher id bumps the counter
    c.add({ id: 10 });
    const d: { id?: number } = {};
    c.add(d);
    expect(d.id).toBe(11);
  });

  it('removes by element and by id', () => {
    const c = new Collection<{ id: number }>();
    const a = item(1);
    c.add(a);
    c.add(item(2));
    expect(c.remove(a)).toBe(true);
    expect(c.remove(a)).toBe(false);
    expect(c.removeById(2)).toBe(true);
    expect(c.isEmpty()).toBe(true);
  });

  it('getFirst / getLast / getByIndex', () => {
    const c = new Collection<{ id: number }>([item(1), item(2), item(3)]);
    // constructor iterates input in reverse → stored order is [3, 2, 1]
    expect(c.getFirst()).toEqual(item(3));
    expect(c.getLast()).toEqual(item(1));
    expect(c.getByIndex(1)).toEqual(item(2));
    expect(c.getByIndex(99)).toBeNull();
  });

  // NOTE: legacy quirk preserved — both the constructor and map/filter/walk iterate
  // their input in reverse, so a value passed through the constructor is reversed once
  // and again by the map/filter result constructor. Callers must not rely on order;
  // ranking goes through an explicit sort().
  it('map applies the callback and returns a Collection (double-reversed order)', () => {
    const c = new Collection<{ id: number }>([item(1), item(2)]); // stored [2,1]
    const mapped = c.map(function () {
      return { id: this.id * 10 };
    });
    expect(mapped).toBeInstanceOf(Collection);
    expect(new Set(mapped.items.map((x) => x.id))).toEqual(new Set([10, 20]));
    expect(mapped.items.map((x) => x.id)).toEqual([20, 10]);
  });

  it('filter keeps matching items', () => {
    const c = new Collection<{ id: number }>([item(1), item(2), item(3), item(4)]);
    const evens = c.filter(function () {
      return this.id % 2 === 0;
    });
    expect(new Set(evens.items.map((x) => x.id))).toEqual(new Set([2, 4]));
    expect(evens.items.map((x) => x.id)).toEqual([4, 2]);
  });

  it('match returns the first hit in stored order, or null', () => {
    const c = new Collection<{ id: number }>([item(1), item(2), item(3)]); // stored [3,2,1]
    expect(c.match(function () {
      return this.id < 3;
    })).toEqual(item(2));
    expect(c.match(function () {
      return this.id > 100;
    })).toBeNull();
  });

  it('sort reorders items and rebuilds ids', () => {
    const c = new Collection<{ id: number }>([item(3), item(1), item(2)]);
    c.sort((a, b) => a.id - b.id);
    expect(c.items.map((x) => x.id)).toEqual([1, 2, 3]);
    expect(c.ids).toEqual([1, 2, 3]);
    expect(c.getById(2)).toEqual(item(2));
  });

  it('ttl schedules removal', () => {
    vi.useFakeTimers();
    const c = new Collection<{ id: number }>();
    const a = item(1);
    c.add(a, 1000);
    expect(c.count()).toBe(1);
    vi.advanceTimersByTime(1000);
    expect(c.count()).toBe(0);
    vi.useRealTimers();
  });
});
