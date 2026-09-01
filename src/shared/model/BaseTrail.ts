import { EventEmitter } from 'eventemitter3';

export interface TrailOwner {
  color: string;
  radius: number;
}

export type Point = [number, number];

/**
 * The list of points an avatar has laid down. Just a buffer here; whether new
 * points are *solid* is the avatar's `printing` state (timed server-side by
 * `PrintManager`).
 */
export class BaseTrail extends EventEmitter {
  avatar: TrailOwner;
  color: string;
  radius: number;
  points: Point[] = [];
  lastX: number | null = null;
  lastY: number | null = null;

  constructor(avatar: TrailOwner) {
    super();

    this.avatar = avatar;
    this.color = avatar.color;
    this.radius = avatar.radius;
  }

  addPoint(x: number, y: number): void {
    this.points.push([x, y]);
    this.lastX = x;
    this.lastY = y;
  }

  clear(): void {
    this.points.length = 0;
    this.lastX = null;
    this.lastY = null;
  }
}
