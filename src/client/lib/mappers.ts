import { EventEmitter } from 'eventemitter3';

/**
 * A control "mapper": while `listening`, it captures the next keyboard key /
 * touch / gamepad input and exposes it as `value`. Vendored replacement for
 * `tom32i-key-mapper.js`. Emits `change` / `listening:start` / `listening:stop`.
 */
export abstract class Mapper<V = unknown> extends EventEmitter {
  id = '';
  listening = false;
  value: V | null = null;

  abstract start(): void;
  abstract stop(): void;

  setValue(value: V): void {
    if (this.value !== value) {
      this.value = value;
      this.emit('change');
    }
  }
}

export class KeyboardMapper extends Mapper<number> {
  private readonly onKeyDown = (e: KeyboardEvent): void => {
    this.setValue(e.keyCode);
    this.stop();
  };

  start(): void {
    if (!this.listening) {
      this.listening = true;
      window.addEventListener('keydown', this.onKeyDown);
      this.emit('listening:start');
    }
  }

  stop(): void {
    if (this.listening) {
      this.listening = false;
      window.removeEventListener('keydown', this.onKeyDown);
      this.emit('listening:stop');
    }
  }
}

export class TouchMapper extends Mapper<Touch> {
  private readonly onTouch = (e: TouchEvent): void => {
    if (e.touches[0]) {
      this.setValue(e.touches[0]);
    }
    this.stop();
  };

  start(): void {
    if (!this.listening) {
      this.listening = true;
      window.addEventListener('touchstart', this.onTouch);
      this.emit('listening:start');
    }
  }

  stop(): void {
    if (this.listening) {
      this.listening = false;
      window.removeEventListener('touchstart', this.onTouch);
      this.emit('listening:stop');
    }
  }
}

export class GamepadMapper extends Mapper<string> {
  // Gamepad capture is deferred (was never finished upstream either); the
  // mapper still exists so PlayerControl can offer the slot.
  start(): void {
    if (!this.listening) {
      this.listening = true;
      this.emit('listening:start');
    }
  }

  stop(): void {
    if (this.listening) {
      this.listening = false;
      this.emit('listening:stop');
    }
  }
}
