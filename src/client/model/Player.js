import Avatar from './Avatar.js';
import BasePlayer from '../../shared/model/BasePlayer.js';
import PlayerControl from './PlayerControl.js';

/**
 * Player
 */
export default class Player extends BasePlayer {
    constructor(id, client, name, color, ready) {
        super(client, name, color, ready);

        this.id = id;
        this.local = false;
        this.controls = null;
        this.vote = false;
        this.kicked = false;
        this.position = `${this.client.id}-${this.id}`;
        this.avatar = null;

        this.client.players.add(this);
    }

    setLocal(local) {
        this.local = local;
        this.initControls();
    }

    initControls() {
        if (!this.controls) {
            this.controls = [
                new PlayerControl(37, 'icon-left-dir'),
                new PlayerControl(39, 'icon-right-dir')
            ];

            for (const control of this.controls) {
                control.on('change', this.onControlChange);
            }
        }
    }

    onControlChange = (e) => {
        this.emit('control:change');
    };

    getMapping() {
        return this.controls.map(control => control.getMapping());
    }

    setTouch() {
        const touch = document.createTouch(window, window, new Date().getTime(), 0, 0, 0, 0);
        for (const control of this.controls) {
            control.mappers.getById('touch').setValue(touch);
        }
    }

    getBinding() {
        return [this.controls[0].mapper.value, this.controls[1].mapper.value];
    }

    isMaster() {
        return this.client.master && this.client.players.getIdIndex(this.id) === 0;
    }

    /**
     * Get avatar
     *
     * @return {Avatar}
     */
    getAvatar() {
        if (!this.avatar) {
            this.avatar = new Avatar(this);
        }

        return this.avatar;
    }

    /**
     * Reset player after a game
     */
    reset() {
        super.reset();

        if (this.avatar) {
            this.avatar.destroy();
            this.avatar = null;
        }
    }
}
