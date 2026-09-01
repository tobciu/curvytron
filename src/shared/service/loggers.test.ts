import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseFPSLogger } from './BaseFPSLogger.ts';
import { BaseTickrateLogger } from './BaseTickrateLogger.ts';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('BaseFPSLogger', () => {
  it('rolls the frame count into frequency once a second', () => {
    const fps = new BaseFPSLogger();
    fps.onFrame();
    fps.onFrame();
    fps.onFrame();
    expect(fps.frequency).toBe(0);
    vi.advanceTimersByTime(1000);
    expect(fps.frequency).toBe(3);
    expect(fps.frames).toBe(0);
    fps.stop();
  });

  it('stop() halts logging and zeroes frequency', () => {
    const fps = new BaseFPSLogger();
    fps.onFrame();
    vi.advanceTimersByTime(1000);
    expect(fps.frequency).toBe(1);
    fps.stop();
    fps.onFrame();
    vi.advanceTimersByTime(2000);
    expect(fps.frequency).toBe(0);
  });

  it('start() is idempotent', () => {
    const fps = new BaseFPSLogger();
    const handle = fps.interval;
    fps.start();
    expect(fps.interval).toBe(handle);
    fps.stop();
  });
});

describe('BaseTickrateLogger', () => {
  it('counts ticks per second', () => {
    const tr = new BaseTickrateLogger();
    tr.tick('a');
    tr.tick('b');
    vi.advanceTimersByTime(1000);
    expect(tr.frequency).toBe(2);
    expect(tr.ticks).toHaveLength(0);
    tr.stop();
  });
});
