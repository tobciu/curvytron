import { EventEmitter } from '#event-emitter';
import { PlayerControl } from '../model/PlayerControl.ts';
import { BasePlayer } from '../../shared/model/BasePlayer.ts';

/**
 * Remembered profile
 */
export class Profile extends EventEmitter {
    name: any;
    color: any;
    sound: any;
    loading: boolean;
    controls: any[];

    /**
     * Local storage key
     */
    localKey: string = 'PROFILE';

    constructor() {
        super();

        this.name = null;
        this.color = null;
        this.sound = true;
        this.loading = false;
        this.controls = [new PlayerControl(37, 'icon-left-dir'), new PlayerControl(39, 'icon-right-dir')];

        // Binding
        this.onControlChange = this.onControlChange.bind(this);

        const labels = ['Left', 'Right'];

        for (let i = this.controls.length - 1; i >= 0; i--) {
            this.controls[i].label = labels[i];
            this.controls[i].on('change', this.onControlChange);
        }

        this.load();
        this.persist();
    }

    /**
     * Get data
     */
    serialize() {
        return {
            name: this.name,
            color: this.color,
            sound: this.sound,
            controls: this.getMapping()
        };
    }

    /**
     * Unserialize
     */
    unserialize(data?: any) {
        if (typeof data.name !== 'undefined') {
            this.setName(data.name);
        }

        if (typeof data.color !== 'undefined') {
            this.setColor(data.color);
        }

        if (typeof data.sound !== 'undefined') {
            this.setSound(data.sound);
        }

        if (typeof data.controls !== 'undefined') {
            this.setControls(data.controls);
        }
    }

    /**
     * Persist
     */
    persist() {
        if (this.loading) {
            return;
        }

        if (this.isValid()) {
            window.localStorage.setItem(this.localKey, JSON.stringify(this.serialize()));
            this.emit('change');
        } else {
            this.load();
        }
    }

    /**
     * Persist
     */
    load() {
        this.loading = true;

        const data = window.localStorage.getItem(this.localKey);

        if (data) {
            this.unserialize(JSON.parse(data));
            this.emit('change');
        }

        if (!this.color) {
            this.setColor(BasePlayer.prototype.getRandomColor());
        }

        this.loading = false;
    }

    /**
     * Get mapping
     */
    getMapping() {
        const mapping = new Array(this.controls.length);

        for (let i = this.controls.length - 1; i >= 0; i--) {
            mapping[i] = this.controls[i].getMapping();
        }

        return mapping;
    }

    /**
     * Set name
     */
    setName(name: any) {
        name = name.trim();

        if (name.length && this.name !== name) {
            this.name = name;
            this.persist();
        }
    }

    /**
     * Set color
     */
    setColor(color: string) {
        if (BasePlayer.prototype.validateColor(color)) {
            this.color = color;
            this.persist();
        }
    }

    /**
     * Set controls
     */
    setControls(controls: any) {
        for (let i = controls.length - 1; i >= 0; i--) {
            this.controls[i].loadMapping(controls[i]);
        }
        this.persist();
    }

    /**
     * Set sound
     */
    setSound(sound: boolean) {
        if (this.sound !== sound) {
            this.sound = sound;
            this.persist();
        }
    }

    /**
     *
     * Profile
     */
    onControlChange(e: any) {
        this.persist();
    }

    /**
     * Is profile complete?
     */
    isComplete(): boolean {
        return this.name && this.color;
    }

    /**
     * Is profile valid?
     */
    isValid(): boolean {
        if (!this.name || !this.name.trim().length) {
            return false;
        }
        if (!this.color || !BasePlayer.prototype.validateColor(this.color)) {
            return false;
        }

        return true;
    }
}
