/** A short ease-out-back scale animation (0 → target) driven by wall-clock time. */
export class BounceIn {
  static readonly target = 1;
  static readonly factor = 1.77635683940025e-15;

  duration: number;
  created: number | null = null;
  done = false;
  private timeout: ReturnType<typeof setTimeout> | null = null;

  constructor(duration: number) {
    this.duration = duration;
    this.end = this.end.bind(this);
    this.start();
  }

  start(): void {
    this.created = new Date().getTime();
    this.timeout = setTimeout(this.end, this.duration);
  }

  getValue(): number {
    return this.easeOutBack(this.getAge(), 0, BounceIn.target, this.duration, BounceIn.factor);
  }

  getAge(): number {
    return new Date().getTime() - (this.created as number);
  }

  end(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    this.timeout = null;
    this.done = true;
  }

  easeOutBack(
    time: number,
    begin: number,
    target: number,
    duration: number,
    factor: number,
  ): number {
    const t = time / duration;
    const ts = t * t;
    const tc = ts * t;
    return begin + target * (factor * tc * ts + 4 * tc + -9 * ts + 6 * t);
  }
}
