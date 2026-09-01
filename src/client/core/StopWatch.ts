/** Logs an operation's duration if it exceeds `tolerance` ms. */
export class StopWatch {
  static readonly tolerance = 2;

  name: string;
  from: Date | null = null;
  to: Date | null = null;
  duration = 0;
  tolerance: number;

  constructor(name: string, tolerance?: number) {
    this.name = name;
    this.tolerance = typeof tolerance === 'number' ? tolerance : StopWatch.tolerance;
    this.start();
  }

  start(): void {
    this.from = new Date();
  }

  stop(): void {
    this.to = new Date();
    this.log(this.to.getTime() - (this.from as Date).getTime());
  }

  log(duration: number): void {
    if (duration >= this.tolerance) {
      this.duration = duration;
      console.info(this.name + ': ' + this.duration);
    }
  }
}
