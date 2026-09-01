import { Collection } from '@shared/Collection.ts';
import { Island } from './Island.ts';
import { Body } from './Body.ts';

/**
 * The arena's spatial hash: a grid of {@link Island}s. A body is registered into
 * the (up to 4) islands its bounding box touches; lookups only test those.
 */
export class World {
  /** Target island side length. */
  static readonly islandGridSize = 40;

  size: number;
  islands = new Collection<Island>();
  islandSize: number;
  active = false;
  bodyCount = 0;

  constructor(size: number, islands?: number) {
    const count =
      typeof islands === 'number' ? islands : Math.round(size / World.islandGridSize);

    this.size = size;
    this.islandSize = this.size / count;

    for (let y = count - 1; y >= 0; y--) {
      for (let x = count - 1; x >= 0; x--) {
        const id = x.toString() + ':' + y.toString();
        this.islands.add(new Island(id, this.islandSize, x * this.islandSize, y * this.islandSize));
      }
    }
  }

  getIslandByPoint(pX: number, pY: number): Island | null {
    const x = Math.floor(pX / this.islandSize);
    const y = Math.floor(pY / this.islandSize);
    const id = x.toString() + ':' + y.toString();

    return this.islands.getById(id);
  }

  addBody(body: Body): void {
    if (!this.active) {
      return;
    }

    body.id = this.bodyCount++;

    this.addBodyByPoint(body, body.x - body.radius, body.y - body.radius);
    this.addBodyByPoint(body, body.x + body.radius, body.y - body.radius);
    this.addBodyByPoint(body, body.x - body.radius, body.y + body.radius);
    this.addBodyByPoint(body, body.x + body.radius, body.y + body.radius);
  }

  addBodyByPoint(body: Body, x: number, y: number): void {
    this.getIslandByPoint(x, y)?.addBody(body);
  }

  removeBody(body: Body): void {
    if (!this.active) {
      return;
    }

    for (let i = body.islands.items.length - 1; i >= 0; i--) {
      (body.islands.items[i] as Island).removeBody(body);
    }
  }

  getBody(body: Body): Body | null {
    return (
      this.getBodyByPoint(body, body.x - body.radius, body.y - body.radius) ||
      this.getBodyByPoint(body, body.x + body.radius, body.y - body.radius) ||
      this.getBodyByPoint(body, body.x - body.radius, body.y + body.radius) ||
      this.getBodyByPoint(body, body.x + body.radius, body.y + body.radius)
    );
  }

  getBodyByPoint(body: Body, x: number, y: number): Body | null {
    const island = this.getIslandByPoint(x, y);
    return island ? island.getBody(body) : null;
  }

  testBody(body: Body): boolean {
    return (
      this.testBodyByPoint(body, body.x - body.radius, body.y - body.radius) &&
      this.testBodyByPoint(body, body.x + body.radius, body.y - body.radius) &&
      this.testBodyByPoint(body, body.x - body.radius, body.y + body.radius) &&
      this.testBodyByPoint(body, body.x + body.radius, body.y + body.radius)
    );
  }

  testBodyByPoint(body: Body, x: number, y: number): boolean {
    const island = this.getIslandByPoint(x, y);
    return island ? island.testBody(body) : false;
  }

  getRandomPosition(radius: number, border: number): [number, number] {
    const margin = radius + border * this.size;
    const body = new Body(this.getRandomPoint(margin), this.getRandomPoint(margin), margin);

    while (!this.testBody(body)) {
      body.x = this.getRandomPoint(margin);
      body.y = this.getRandomPoint(margin);
    }

    return [body.x, body.y];
  }

  getRandomDirection(x: number, y: number, tolerance: number): number {
    let direction = this.getRandomAngle();
    const margin = tolerance * this.size;

    while (!this.isDirectionValid(direction, x, y, margin)) {
      direction = this.getRandomAngle();
    }

    return direction;
  }

  isDirectionValid(angle: number, x: number, y: number, margin: number): boolean {
    const quarter = Math.PI / 2;

    for (let i = 0; i < 4; i++) {
      const from = quarter * i;
      const to = quarter * (i + 1);

      if (angle >= from && angle < to) {
        if (this.getHypotenuse(angle - from, this.getDistanceToBorder(i, x, y)) < margin) {
          return false;
        }

        if (
          this.getHypotenuse(to - angle, this.getDistanceToBorder(i < 3 ? i + 1 : 0, x, y)) < margin
        ) {
          return false;
        }

        return true;
      }
    }

    return false;
  }

  getHypotenuse(angle: number, adjacent: number): number {
    return adjacent / Math.cos(angle);
  }

  getRandomAngle(): number {
    return Math.random() * Math.PI * 2;
  }

  getRandomPoint(margin: number): number {
    return margin + Math.random() * (this.size - margin * 2);
  }

  getBoundIntersect(body: Body, margin: number): [number, number] | null {
    if (body.x - margin < 0) {
      return [0, body.y];
    }
    if (body.x + margin > this.size) {
      return [this.size, body.y];
    }
    if (body.y - margin < 0) {
      return [body.x, 0];
    }
    if (body.y + margin > this.size) {
      return [body.x, this.size];
    }
    return null;
  }

  getOposite(x: number, y: number): [number, number] {
    if (x === 0) {
      return [this.size, y];
    }
    if (x === this.size) {
      return [0, y];
    }
    if (y === 0) {
      return [x, this.size];
    }
    if (y === this.size) {
      return [x, 0];
    }
    return [x, y];
  }

  getDistanceToBorder(border: number, x: number, y: number): number {
    if (border === 0) {
      return this.size - x;
    }
    if (border === 1) {
      return this.size - y;
    }
    if (border === 2) {
      return x;
    }
    return y;
  }

  clear(): void {
    this.active = false;
    this.bodyCount = 0;

    for (let i = this.islands.items.length - 1; i >= 0; i--) {
      this.islands.items[i]!.clear();
    }
  }

  activate(): void {
    this.active = true;
  }
}
