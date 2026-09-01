import { Collection } from '@shared/Collection.ts';

/** A circle in the collision grid. */
export class Body {
  x: number;
  y: number;
  radius: number;
  data: unknown;
  islands = new Collection<any>();
  id: number | null = null;

  constructor(x: number, y: number, radius: number, data?: unknown) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.data = data;
  }

  /** Whether a touch with `body` should count as a collision. */
  match(_body: Body): boolean {
    return true;
  }
}
