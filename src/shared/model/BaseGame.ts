import { EventEmitter } from '#event-emitter';
import { Collection } from '../Collection.ts';
import type { BaseBonusManager } from '../manager/BaseBonusManager.ts';
import type { BaseFPSLogger } from '../service/BaseFPSLogger.ts';
import type { BaseAvatar } from './BaseAvatar.ts';
import type { BaseRoom } from './BaseRoom.ts';
import type { RoundInfo, WinConditionId } from '../scoring.ts';

/**
 * BaseGame
 */
export abstract class BaseGame extends EventEmitter {
    room: BaseRoom;
    name: string;
    frame: ReturnType<typeof setTimeout> | number | null;
    avatars: Collection<BaseAvatar>;
    size: number;
    rendered: number | null;
    maxScore: number;
    /** When the game is over: the score, the number of rounds or the minutes */
    winCondition: WinConditionId;
    rounds: number;
    minutes: number;
    /** Where the running round is on the way to the end of the game */
    round: RoundInfo = { round: 0, last: false, finale: false, tiebreak: false };
    fps: BaseFPSLogger;
    started: boolean;
    bonusManager: BaseBonusManager;
    inRound: boolean;

    /**
     * Loop frame rate
     */
    framerate: number = (1 / 60) * 1000;

    /**
     * Map size factor per player
     */
    perPlayerSize: number = 80;

    /**
     * Time before round start
     */
    warmupTime: number = 3000;

    /**
     * Time after round end
     */
    warmdownTime: number = 5000;

    /**
     * Margin from borders
     */
    spawnMargin: number = 0.05;

    /**
     * Angle margin from borders
     */
    spawnAngleMargin: number = 0.3;

    /**
     * Borderless
     */
    borderless: boolean = false;

    /** Create the FPS logger */
    abstract createFPSLogger(): BaseFPSLogger;

    /** Create the manager of the bonuses of the game */
    abstract createBonusManager(): BaseBonusManager;

    constructor(room: BaseRoom) {
        super();

        this.room = room;
        this.name = this.room.name;
        this.frame = null;
        this.avatars = this.room.players.map(function () {
            return this.getAvatar();
        });
        this.size = this.getSize(this.avatars.count());
        this.rendered = null;
        this.maxScore = room.config.getMaxScore();
        this.winCondition = room.config.winCondition;
        this.rounds = room.config.getRounds();
        this.minutes = room.config.getMinutes();
        this.fps = this.createFPSLogger();
        this.started = false;
        this.bonusManager = this.createBonusManager();
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
     */
    update(step: number) {
        // Overridden by client and server game implementations
    }

    /**
     * Remove a avatar from the game
     */
    removeAvatar(avatar: BaseAvatar) {
        if (this.avatars.exists(avatar)) {
            avatar.die();
            avatar.destroy();
        }
    }

    /**
     * Start loop
     */
    start() {
        // `started` is false for a game that ended before its countdown was over
        if (this.started && !this.frame) {
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

        const now = Date.now(),
            step = now - (this.rendered ?? now);

        this.rendered = now;

        this.onFrame(step);
        this.fps.onFrame();
    }

    /**
     * On start
     */
    onStart() {
        this.rendered = Date.now();
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
            this.setSize();
        }
    }

    /**
     * On round new
     */
    onRoundNew() {
        this.borderless = false;

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
    onRoundEnd() {}

    /**
     * Get new frame
     */
    newFrame() {
        this.frame = setTimeout(this.loop, this.framerate);
    }

    /**
     * Clear frame
     */
    clearFrame() {
        if (this.frame) {
            clearTimeout(this.frame);
        }

        this.frame = null;
    }

    /**
     * On frame
     */
    onFrame(step: number) {
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
     */
    getSize(players: number): number {
        const square = this.perPlayerSize * this.perPlayerSize,
            size = Math.sqrt(square + ((players - 1) * square) / 5);

        return Math.round(size);
    }

    /**
     * Are all avatars ready?
     */
    isReady(): boolean {
        return this.getLoadingAvatars().isEmpty();
    }

    /**
     * Get still loading avatars
     */
    getLoadingAvatars() {
        return this.avatars.filter(function () {
            return this.present && !this.ready;
        });
    }

    /**
     * Get alive avatars
     */
    getAliveAvatars() {
        return this.avatars.filter(function () {
            return this.alive;
        });
    }

    /**
     * Get present avatars
     */
    getPresentAvatars() {
        return this.avatars.filter(function () {
            return this.present;
        });
    }

    /**
     * Sort avatars
     */
    sortAvatars(avatars: Collection<BaseAvatar> = this.avatars): Collection<BaseAvatar> {
        avatars.sort(function (a, b) {
            return b.score - a.score;
        });

        return avatars;
    }

    /**
     * Set borderless
     */
    setBorderless(borderless: boolean) {
        this.borderless = borderless;
    }

    /**
     * Serialize
     */
    serialize() {
        return {
            name: this.name,
            players: this.avatars.map(function () {
                return this.serialize();
            }).items,
            maxScore: this.maxScore,
            winCondition: this.winCondition,
            rounds: this.rounds,
            minutes: this.minutes
        };
    }

    /**
     * New round
     */
    newRound(time?: number) {
        this.started = true;

        if (!this.inRound) {
            this.inRound = true;
            this.onRoundNew();
            setTimeout(this.start, time ?? this.warmupTime);
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
