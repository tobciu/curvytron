import { EventEmitter } from '#event-emitter';
import type { BaseAvatar } from './BaseAvatar.ts';

/**
 * BaseTrail
 */
export class BaseTrail extends EventEmitter {
    avatar: BaseAvatar;
    color: string;
    radius: number;
    points: number[][];
    lastX: number | null;
    lastY: number | null;

    constructor(avatar: BaseAvatar) {
        super();

        this.avatar = avatar;
        this.color = this.avatar.color;
        this.radius = this.avatar.radius;
        this.points = [];
        this.lastX = null;
        this.lastY = null;
    }

    /**
     * Add point
     */
    addPoint(x: number, y: number) {
        this.points.push([x, y]);
        this.lastX = x;
        this.lastY = y;
    }

    /**
     * Clear
     */
    clear() {
        this.points.length = 0;
        this.lastX = null;
        this.lastY = null;
    }
}
