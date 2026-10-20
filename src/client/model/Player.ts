import { PlayerControl } from './PlayerControl.ts';
import { BasePlayer } from '../../shared/model/BasePlayer.ts';
import { Avatar } from './Avatar.ts';
import type { Client } from './Client.ts';

/**
 * Player
 */
export class Player extends BasePlayer {
    declare client: Client;
    declare avatar: Avatar | null;
    id: any;
    local: any;
    controls: any;
    vote: boolean;
    kicked: boolean;
    /** Is it the player of the profile? Set by the room view */
    profile: boolean = false;
    position: string;

    constructor(id: any, client: Client, name: any, color: any, ready: any) {
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
     */
    createAvatar() {
        return new Avatar(this);
    }

    /**
     * Set local
     */
    setLocal(local: boolean) {
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
        const touch = (document as any).createTouch(window, window, new Date().getTime(), 0, 0, 0, 0);

        for (let i = this.controls.length - 1; i >= 0; i--) {
            this.controls[i].mappers.getById('touch').setValue(touch);
        }
    }

    /**
     * On change
     */
    onControlChange(e: any) {
        this.emit('control:change');
    }

    /**
     * Get binding
     */
    getBinding() {
        return [this.controls[0].mapper.value, this.controls[1].mapper.value];
    }

    /**
     * Should this player be considered master?
     */
    isMaster(): boolean {
        return this.client.master && this.client.players.getIdIndex(this.id) === 0;
    }
}
