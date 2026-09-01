import { BaseTrail } from '@shared/model/BaseTrail.ts';

/**
 * Client trail — coalesces the rendered history: {@link getLastSegment} hands the
 * renderer the points drawn so far and trims the buffer; big jumps (teleport /
 * borderless wrap) start a fresh segment instead of drawing a line across the map.
 */
export class Trail extends BaseTrail {
  /** Distance beyond which a new point starts a fresh segment. */
  readonly tolerance = 1;

  clearAsked = false;
  queueX: number | null = null;
  queueY: number | null = null;

  getLastSegment(): Array<[number, number]> | null {
    const length = this.points.length;
    let points: Array<[number, number]> | null = null;

    if (length) {
      points = this.points.slice(0);

      if (this.clearAsked) {
        super.clear();
        if (this.queueX !== null) {
          super.addPoint(this.queueX, this.queueY as number);
          this.queueX = null;
          this.queueY = null;
        }
        this.clearAsked = false;
      } else if (length > 1) {
        this.points.splice(0, length - 1);
      }
    }

    return points;
  }

  addPoint(x: number, y: number): void {
    if (
      this.lastX !== null &&
      (Math.abs(this.lastX - x) > this.tolerance ||
        Math.abs((this.lastY as number) - y) > this.tolerance)
    ) {
      this.clear();
      this.queueX = x;
      this.queueY = y;
    } else {
      super.addPoint(x, y);
    }
  }

  clear(): void {
    this.clearAsked = true;
  }
}
