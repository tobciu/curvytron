import { Collection } from '@shared/Collection.ts';
import { Body } from './Body.ts';

/** One cell of the collision grid; holds the bodies overlapping it. */
export class Island {
  id: string;
  size: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  bodies = new Collection<Body>([], 'id');

  constructor(id: string, size: number, x: number, y: number) {
    this.id = id;
    this.size = size;
    this.fromX = x;
    this.fromY = y;
    this.toX = x + size;
    this.toY = y + size;
  }

  addBody(body: Body): void {
    if (this.bodies.add(body)) {
      body.islands.add(this);
    }
  }

  removeBody(body: Body): void {
    this.bodies.remove(body);
    body.islands.remove(this);
  }

  testBody(body: Body): boolean {
    return this.getBody(body) === null;
  }

  getBody(body: Body): Body | null {
    if (this.bodyInBound(body, this.fromX, this.fromY, this.toX, this.toY)) {
      for (let i = this.bodies.items.length - 1; i >= 0; i--) {
        if (this.bodiesTouch(this.bodies.items[i]!, body)) {
          return this.bodies.items[i]!;
        }
      }
    }

    return null;
  }

  bodiesTouch(bodyA: Body, bodyB: Body): boolean {
    const distance = this.getDistance(bodyA.x, bodyA.y, bodyB.x, bodyB.y);
    const radius = bodyA.radius + bodyB.radius;
    const match = bodyA.match(bodyB);

    return distance < radius && match;
  }

  bodyInBound(body: Body, fromX: number, fromY: number, toX: number, toY: number): boolean {
    return (
      body.x + body.radius > fromX &&
      body.x - body.radius < toX &&
      body.y + body.radius > fromY &&
      body.y - body.radius < toY
    );
  }

  getDistance(fromX: number, fromY: number, toX: number, toY: number): number {
    return Math.sqrt(Math.pow(fromX - toX, 2) + Math.pow(fromY - toY, 2));
  }

  clear(): void {
    this.bodies.clear();
  }
}
