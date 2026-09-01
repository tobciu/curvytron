import { EventEmitter } from 'eventemitter3';

/**
 * Counts frames per second: {@link onFrame} on every rendered frame,
 * {@link frequency} updated once a second.
 */
export class BaseFPSLogger extends EventEmitter {
  interval: ReturnType<typeof setInterval> | null = null;
  frames = 0;
  frequency = 0;

  constructor() {
    super();

    this.onFrame = this.onFrame.bind(this);
    this.log = this.log.bind(this);

    this.start();
  }

  onFrame(): void {
    this.frames++;
  }

  log(): void {
    this.frequency = this.frames;
    this.frames = 0;
  }

  start(): void {
    if (!this.interval) {
      this.frames = 0;
      this.interval = setInterval(this.log, 1000);
    }
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      this.frequency = 0;
    }
  }
}
