import { EventEmitter } from '#event-emitter';
import type { BaseAvatar } from './BaseAvatar.ts';

/**
 * BasePlayer
 */
export abstract class BasePlayer extends EventEmitter {
    client: { id: number | null };
    name: string;
    color: string;
    ready: boolean;
    id: number | null;
    avatar: BaseAvatar | null;

    /**
     * Max length for name
     */
    static maxLength = 25;

    /**
     * Max length for color
     */
    static colorMaxLength = 20;

    /** Create the avatar of the player */
    abstract createAvatar(): BaseAvatar;

    constructor(client: { id: number | null }, name: string, color?: string, ready?: boolean) {
        super();

        this.client = client;
        this.name = name;
        this.color = typeof color !== 'undefined' && this.validateColor(color) ? color : this.getRandomColor();
        this.ready = typeof ready !== 'undefined' && ready;
        this.id = null;
        this.avatar = null;
    }

    /**
     * Set name
     */
    setName(name: string) {
        this.name = name;
    }

    /**
     * Set color
     */
    setColor(color: string) {
        if (!this.validateColor(color, true)) {
            return false;
        }

        this.color = color;

        return true;
    }

    /**
     * Equal
     */
    equal(player: BasePlayer): boolean {
        return this.id === player.id;
    }

    /**
     * Toggle Ready
     */
    toggleReady(toggle?: boolean) {
        this.ready = typeof toggle !== 'undefined' ? (toggle ? true : false) : !this.ready;
    }

    /**
     * Get avatar
     */
    getAvatar() {
        if (!this.avatar) {
            this.avatar = this.createAvatar();
        }

        return this.avatar;
    }

    /**
     * Reset player after a game
     */
    reset() {
        this.avatar?.destroy();
        this.avatar = null;
        this.ready = false;
    }

    /**
     * Serialize
     */
    serialize(): Record<string, any> {
        return {
            client: this.client.id,
            id: this.id,
            name: this.name,
            color: this.color,
            ready: this.ready
        };
    }

    /**
     * Get random Color
     */
    getRandomColor(): string {
        let color = '';
        const randomNum = function () {
            return Math.ceil(Math.random() * 255).toString(16);
        };

        while (!this.validateColor(color, true)) {
            color = `#${randomNum()}${randomNum()}${randomNum()}`;
        }

        return color;
    }

    /**
     * Validate color
     */
    validateColor(color?: unknown, yiq?: boolean): boolean {
        if (typeof color !== 'string') {
            return false;
        }

        const matches = color.match(new RegExp('^#([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})$'));

        if (matches && yiq) {
            const ratio =
                (parseInt(matches[1], 16) * 0.4 + parseInt(matches[2], 16) * 0.5 + parseInt(matches[3], 16) * 0.3) /
                255;

            return ratio > 0.3;
        }

        return matches ? true : false;
    }
}
