import EventEmitter from 'tom32i-event-emitter.js';

export default class BaseBonus extends EventEmitter {
    constructor(id, x, y, asset) {
        super();
        this.id = id;
        this.x = x;
        this.y = y;
        this.asset = asset;
        this.radius = 1;
        this.animation = { done: false };
        this.duration = 0;
        this.created = new Date().getTime();
    }

    update() {
        // Placeholder for animation logic
    }

    get drawX() {
        return this.x - this.radius;
    }

    get drawY() {
        return this.y - this.radius;
    }

    get drawWidth() {
        return this.radius * 2;
    }

    applyTo(avatar, game) {
        // This method should be overridden by subclasses
    }

    isExpired() {
        return this.duration > 0 && new Date().getTime() > this.created + this.duration;
    }
}
