/**
 * Counts how many batches are sent per second: {@link tick} per batch,
 * {@link frequency} updated once a second.
 */
export class BaseTickrateLogger {
  interval: ReturnType<typeof setInterval> | null = null;
  frequency = 0;
  ticks: unknown[] = [];

  constructor() {
    this.log = this.log.bind(this);
    this.tick = this.tick.bind(this);

    this.start();
  }

  tick(data: unknown): void {
    this.ticks.push(data);
  }

  log(): void {
    this.frequency = this.ticks.length;
    this.ticks.length = 0;
  }

  start(): void {
    if (!this.interval) {
      this.interval = setInterval(this.log, 1000);
    }
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}
