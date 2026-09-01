import { EventEmitter } from 'eventemitter3';
import type { BonusEffect } from '@shared/model/BaseBonusStack.ts';

/**
 * A bonus shown in an avatar's on-screen bonus stack. Purely visual: after
 * `duration - warning` it starts blinking (opacity toggles) until it is removed.
 */
export class StackedBonus extends EventEmitter {
  id: number;
  duration: number;
  asset: CanvasImageSource | undefined;
  changed = true;
  opacity = 1;
  private timeout: ReturnType<typeof setTimeout> | ReturnType<typeof setInterval> | null = null;

  constructor(id: number, asset: CanvasImageSource | undefined, duration: number) {
    super();
    this.id = id;
    this.asset = asset;
    this.duration = duration;

    this.setEnding = this.setEnding.bind(this);
    this.toggleOpacity = this.toggleOpacity.bind(this);
  }

  /** No effects — the stack only renders these client-side. */
  getEffects(_target: unknown): BonusEffect[] {
    return [];
  }

  clear(): void {
    if (this.timeout) {
      clearInterval(this.timeout as ReturnType<typeof setInterval>);
      this.timeout = null;
    }
  }

  setEndingTimeout(warning: number): void {
    this.timeout = setTimeout(this.setEnding, this.duration - warning);
  }

  setEnding(): void {
    this.timeout = setInterval(this.toggleOpacity, 100);
  }

  toggleOpacity(): void {
    this.opacity = this.opacity === 1 ? 0.5 : 1;
    this.changed = true;
    this.emit('change');
  }
}
