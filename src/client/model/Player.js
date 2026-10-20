import { PlayerControl } from './PlayerControl.js';
import { BasePlayer } from '../../shared/model/BasePlayer.ts';
import { Avatar } from './Avatar.js';

/**
 * Player
 *
 * @param {Number} id
 * @param {String} client
 * @param {String} name
 * @param {String} color
 * @param {Boolean} ready
 */
export class Player extends BasePlayer {
    constructor(id, client, name, color, ready) {
        super(client, name, color, ready);

        this.id = id;
        this.local = false;
        this.controls = null;
        this.vote = false;
        this.kicked = false;
        this.position = `${this.client.id}-${this.id}`;

        this.onControlChange = this.onControlChange.bind(this);

        this.client.players.add(this);
    }

    /**
     * Create the avatar
     *
     * @return {Avatar}
     */
    createAvatar() {
        return new Avatar(this);
    }

    /**
     * Set local
     *
     * @param {Boolean} local
     */
    setLocal(local) {
        this.local = local;

        this.initControls();
    }

    /**
     * Init controls
     */
    initControls() {
        if (!this.controls) {
            this.controls = [new PlayerControl(37, 'icon-left-dir'), new PlayerControl(39, 'icon-right-dir')];

            for (let i = this.controls.length - 1; i >= 0; i--) {
                this.controls[i].on('change', this.onControlChange);
            }
        }
    }

    /**
     * Get controls mapping
     *
     * @return {Array}
     */
    getMapping() {
        const mapping = new Array(this.controls.length);

        for (let i = this.controls.length - 1; i >= 0; i--) {
            mapping[i] = this.controls[i].getMapping();
        }

        return mapping;
    }

    /**
     * Set touch
     */
    setTouch() {
        const touch = document.createTouch(window, window, new Date().getTime(), 0, 0, 0, 0);

        for (let i = this.controls.length - 1; i >= 0; i--) {
            this.controls[i].mappers.getById('touch').setValue(touch);
        }
    }

    /**
     * On change
     *
     * @param {Event} e
     */
    onControlChange(e) {
        this.emit('control:change');
    }

    /**
     * Get binding
     *
     * @return {Array}
     */
    getBinding() {
        return [this.controls[0].mapper.value, this.controls[1].mapper.value];
    }

    /**
     * Should this player be considered master?
     *
     * @return {Boolean}
     */
    isMaster() {
        return this.client.master && this.client.players.getIdIndex(this.id) === 0;
    }
}
