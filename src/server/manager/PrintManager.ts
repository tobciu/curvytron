interface PrintAvatar {
  x: number;
  y: number;
  printing: boolean;
  setPrinting(printing: boolean): void;
}

/**
 * Times the gaps in an avatar's trail: toggles `printing` when the avatar has
 * travelled the current solid/hole budget.
 */
export class PrintManager {
  static readonly holeDistance = 5;
  static readonly printDistance = 60;

  avatar: PrintAvatar;
  active = false;
  lastX = 0;
  lastY = 0;
  distance = 0;

  constructor(avatar: PrintAvatar) {
    this.avatar = avatar;
    this.start = this.start.bind(this);
  }

  togglePrinting(): void {
    this.setPrinting(!this.avatar.printing);
  }

  setPrinting(printing: boolean): void {
    this.avatar.setPrinting(printing);
    this.distance = this.getRandomDistance();
  }

  getRandomDistance(): number {
    return this.avatar.printing
      ? PrintManager.printDistance * (0.3 + Math.random() * 0.7)
      : PrintManager.holeDistance * (0.8 + Math.random() * 0.5);
  }

  start(): void {
    if (!this.active) {
      this.active = true;
      this.lastX = this.avatar.x;
      this.lastY = this.avatar.y;
      this.setPrinting(true);
    }
  }

  stop(): void {
    if (this.active) {
      this.active = false;
      this.setPrinting(false);
      this.clear();
    }
  }

  test(): void {
    if (this.active) {
      this.distance -= this.getDistance(this.lastX, this.lastY, this.avatar.x, this.avatar.y);
      this.lastX = this.avatar.x;
      this.lastY = this.avatar.y;
      if (this.distance <= 0) {
        this.togglePrinting();
      }
    }
  }

  getDistance(fromX: number, fromY: number, toX: number, toY: number): number {
    return Math.sqrt(Math.pow(fromX - toX, 2) + Math.pow(fromY - toY, 2));
  }

  clear(): void {
    this.active = false;
    this.distance = 0;
    this.lastX = 0;
    this.lastY = 0;
  }
}
