import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseSocketClient, type SocketLike } from './BaseSocketClient.ts';

class FakeSocket implements SocketLike {
  sent: string[] = [];
  private listeners: Record<string, ((e: { data?: string }) => void)[]> = {};

  send(data: string): void {
    this.sent.push(data);
  }
  addEventListener(type: 'message' | 'close', l: (e: { data?: string }) => void): void {
    (this.listeners[type] ??= []).push(l);
  }
  removeEventListener(type: 'message' | 'close', l: (e: { data?: string }) => void): void {
    this.listeners[type] = (this.listeners[type] ?? []).filter((x) => x !== l);
  }
  /** Simulate the peer sending us a frame. */
  receive(entries: unknown[]): void {
    for (const l of this.listeners.message ?? []) {
      l({ data: JSON.stringify(entries) });
    }
  }
  get lastFrame(): unknown[] {
    return JSON.parse(this.sent[this.sent.length - 1]!) as unknown[];
  }
}

describe('BaseSocketClient', () => {
  describe('interval = 0 (immediate send)', () => {
    it('sends one event immediately, no data / with data', () => {
      const s = new FakeSocket();
      const c = new BaseSocketClient(s);

      c.addEvent('ping');
      expect(s.lastFrame).toEqual([['ping']]);

      c.addEvent('move', { dir: 1 });
      expect(s.lastFrame).toEqual([['move', { dir: 1 }]]);
    });

    it('ships a callback id as the 3rd slot and resolves it on reply', () => {
      const s = new FakeSocket();
      const c = new BaseSocketClient(s);
      const cb = vi.fn();

      c.addEvent('room:join', { name: 'x' }, cb);
      const [[name, data, id]] = s.lastFrame as [[string, unknown, number]];
      expect(name).toBe('room:join');
      expect(data).toEqual({ name: 'x' });
      expect(typeof id).toBe('number');

      // peer replies: [id, replyData]
      s.receive([[id, { success: true }]]);
      expect(cb).toHaveBeenCalledExactlyOnceWith({ success: true });

      // a second reply for the same id is ignored
      s.receive([[id, { success: false }]]);
      expect(cb).toHaveBeenCalledTimes(1);
    });
  });

  describe('interval > 0 (batched)', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('queues events and flushes them as one frame on the interval', () => {
      const s = new FakeSocket();
      const c = new BaseSocketClient(s, 1);
      s.sent.length = 0; // ignore the flush start() does

      c.addEvent('a', 1);
      c.addEvent('b', 2);
      expect(s.sent).toHaveLength(0);

      vi.advanceTimersByTime(1);
      expect(s.sent).toHaveLength(1);
      expect(s.lastFrame).toEqual([
        ['a', 1],
        ['b', 2],
      ]);
    });

    it('force bypasses the queue', () => {
      const s = new FakeSocket();
      const c = new BaseSocketClient(s, 5);
      s.sent.length = 0;

      c.addEvent('now', 'x', undefined, true);
      expect(s.lastFrame).toEqual([['now', 'x']]);
    });
  });

  describe('onMessage dispatch', () => {
    it('emits string-named entries as events', () => {
      const s = new FakeSocket();
      const c = new BaseSocketClient(s);
      const handler = vi.fn();
      c.on('score', handler);

      s.receive([['score', [7, 42]]]);
      expect(handler).toHaveBeenCalledWith([7, 42]);
    });

    it('a 3-element incoming entry passes [data, replyFn]; replyFn sends [id, data]', () => {
      const s = new FakeSocket();
      const c = new BaseSocketClient(s);
      let replyFn: ((d?: unknown) => void) | undefined;
      c.on('ask', ([, reply]: [unknown, (d?: unknown) => void]) => {
        replyFn = reply;
      });

      s.receive([['ask', { q: 1 }, 99]]);
      expect(replyFn).toBeTypeOf('function');
      replyFn!({ a: 2 });
      expect(s.lastFrame).toEqual([[99, { a: 2 }]]);
    });

    it('processes every entry in a multi-entry frame', () => {
      const s = new FakeSocket();
      const c = new BaseSocketClient(s);
      const a = vi.fn();
      const b = vi.fn();
      c.on('a', a);
      c.on('b', b);

      s.receive([
        ['a', 1],
        ['b', 2],
      ]);
      expect(a).toHaveBeenCalledWith(1);
      expect(b).toHaveBeenCalledWith(2);
    });
  });

  it('onClose marks disconnected and emits close', () => {
    const s = new FakeSocket();
    const c = new BaseSocketClient(s);
    const closed = vi.fn();
    c.on('close', closed);

    c.onClose();
    expect(c.connected).toBe(false);
    expect(closed).toHaveBeenCalledWith(c);
  });
});
