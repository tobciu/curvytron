import EventEmitter from 'tom32i-event-emitter.js';
import BaseFPSLogger from '../service/BaseFPSLogger.js';
import BaseBonusManager from '../manager/BaseBonusManager.js';
import BaseAvatar from './BaseAvatar.js';

/**
 * BaseGame
 */
class BaseGame extends EventEmitter {
    /**
     * Loop frame rate
     *
     * @type {Number}
     */
    framerate = 1 / 60 * 1000;

    /**
     * Map size factor per player
     *
     * @type {Number}
     */
    perPlayerSize = 80;

    /**
     * Time before round start
     *
     * @type {Number}
     */
    warmupTime = 3000;

    /**
     * Time after round end
     *
     * @type {Number}
     */
    warmdownTime = 5000;

    /**
     * Margin from borders
     *
     * @type {Number}
     */
    spawnMargin = 0.05;

    /**
     * Angle margin from borders
     *
     * @type {Number}
     */
    spawnAngleMargin = 0.3;

    /**
     * Borderless
     *
     * @type {Boolean}
     */
    borderless = false;

    constructor(room) {
        super();

        this.room = room;
        this.name = this.room.name;
        this.frame = null;
        this.avatars = this.room.players.map(player => new BaseAvatar(player));
        this.size = this.getSize(this.avatars.count());
        this.rendered = null;
        this.maxScore = room.config.getMaxScore();
        this.fps = new BaseFPSLogger();
        this.started = false;
        this.bonusManager = new BaseBonusManager(this);
        this.inRound = false;

        this.start = this.start.bind(this);
        this.stop = this.stop.bind(this);
        this.loop = this.loop.bind(this);
        this.newRound = this.newRound.bind(this);
        this.endRound = this.endRound.bind(this);
        this.end = this.end.bind(this);
        this.onFrame = this.onFrame.bind(this);
    }

    /**
     * Update
     *
     * @param {Number} step
     */
    update(step) { }

    /**
     * Remove a avatar from the game
     *
     * @param {Avatar} avatar
     */
    removeAvatar(avatar) {
        if (this.avatars.exists(avatar)) {
            avatar.die();
            avatar.destroy();
        }
    }

    /**
     * Start loop
     */
    start() {
        if (!this.frame) {
            this.onStart();
            this.loop();
        }
    }

    /**
     * Stop loop
     */
    stop() {
        if (this.frame) {
            this.clearFrame();
            this.onStop();
        }
    }

    /**
     * Animation loop
     */
    loop() {
        this.newFrame();

        const now = new Date().getTime();
        const step = now - this.rendered;

        this.rendered = now;

        this.onFrame(step);
        this.fps.onFrame();
    }

    /**
     * On start
     */
    onStart() {
        this.rendered = new Date().getTime();
        this.bonusManager.start();
        this.fps.start();
    }

    /**
     * Onn stop
     */
    onStop() {
        this.rendered = null;
        this.bonusManager.stop();
        this.fps.stop();

        const size = this.getSize(this.getPresentAvatars().count());

        if (this.size !== size) {
            this.setSize(size);
        }
    }

    /**
     * On round new
     */
    onRoundNew() {
        this.borderless = BaseGame.prototype.borderless;
        this.bonusManager.clear();

        for (let i = this.avatars.items.length - 1; i >= 0; i--) {
            if (this.avatars.items[i].present) {
                this.avatars.items[i].clear();
            }
        }
    }

    /**
     * On round end
     */
    onRoundEnd() { }

    /**
     * Get new frame
     */
    newFrame() {
        this.frame = window.requestAnimationFrame(this.loop);
    }

    /**
     * Clear frame
     */
    clearFrame() {
        window.cancelAnimationFrame(this.frame);
        this.frame = null;
    }

    /**
     * On frame
     *
     * @param {Number} step
     */
    onFrame(step) {
        this.update(step);
    }

    /**
     * Update game size
     */
    setSize() {
        this.size = this.getSize(this.getPresentAvatars().count());
    }

    /**
     * Get size by players
     *
     * @param {Number} players
     *
     * @return {Number}
     */
    getSize(players) {
        const square = this.perPlayerSize * this.perPlayerSize;
        const size = Math.sqrt(square + ((players - 1) * square / 5));
        return Math.round(size);
    }

    /**
     * Are all avatars ready?
     *
     * @return {Boolean}
     */
    isReady() {
        return this.getLoadingAvatars().isEmpty();
    }

    /**
     * Get still loading avatars
     *
     * @return {Collection}
     */
    getLoadingAvatars() {
        return this.avatars.filter(function () { return this.present && !this.ready; });
    }



    /**
     * Get alive avatars
     *
     * @return {Collection}
     */
    getAliveAvatars() {
        return this.avatars.filter(function () { return this.alive; });
    }

    /**
     * Get present avatars
     *
     * @return {Collection}
     */
    getPresentAvatars() {
        return this.avatars.filter(function () { return this.present; });
    }

    /**
     * Sort avatars
     *
     * @param {Object} avatars
     *
     * @return {Object}
     */
    sortAvatars(avatars) {
        avatars = typeof (avatars) !== 'undefined' ? avatars : this.avatars;
        avatars.sort((a, b) => (a.score > b.score ? -1 : (a.score < b.score ? 1 : 0)));
        return avatars;
    }

    /**
     * Set borderless
     *
     * @param {Boolean} borderless
     */
    setBorderless(borderless) {
        this.borderless = !!borderless;
    }

    /**
     * Serialize
     *
     * @return {Object}
     */
    serialize() {
        return {
            name: this.name,
            players: this.avatars.map(function () { return this.serialize(); }).items,
            maxScore: this.maxScore
        };
    }

    /**
     * New round
     */
    newRound(time) {
        this.started = true;

        if (!this.inRound) {
            this.inRound = true;
            this.onRoundNew();
            setTimeout(this.start, typeof (time) !== 'undefined' ? time : this.warmupTime);
        }
    }

    /**
     * Check end of round
     */
    endRound() {
        if (this.inRound) {
            this.inRound = false;
            this.onRoundEnd();
            setTimeout(this.stop, this.warmdownTime);
        }
    }

    /**
     * FIN DU GAME
     */
    end() {
        if (this.started) {
            this.started = false;
            this.stop();
            this.emit('end', { game: this });
            return true;
        }
        return false;
    }
}

export default BaseGame;
