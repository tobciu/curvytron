import { GameController } from '../controller/GameController.ts';
import { AvatarBody } from '../core/AvatarBody.ts';
import { World } from '../core/World.ts';
import { Avatar } from './Avatar.ts';
import { GameBonusStack } from './GameBonusStack.ts';
import { Collection } from '../../shared/Collection.ts';
import { BaseGame } from '../../shared/model/BaseGame.ts';
import { FPSLogger } from '../service/FPSLogger.ts';
import { BonusManager } from '../manager/BonusManager.ts';
import { GameStats } from '../service/GameStats.ts';
import { metrics } from '../service/Metrics.ts';
import { buildGameResult } from '../storage/result.ts';
import type { Body } from '../core/Body.ts';
import type { Room } from './Room.ts';
import type { Player } from './Player.ts';

/**
 * Game
 */
export class Game extends BaseGame {
    declare room: Room;
    declare avatars: Collection<Avatar>;
    declare bonusManager: BonusManager;
    // Released by `end()`
    world!: World;
    deaths!: Collection<Avatar>;
    controller!: GameController;
    bonusStack: GameBonusStack;
    stats: GameStats;
    roundWinner: Avatar | null;
    gameWinner: Avatar | null;
    deathInFrame: boolean;
    /** The players that did not load the game in time are not waited for any more */
    loadingOver: boolean = false;

    constructor(room: Room) {
        super(room);

        this.world = new World(this.size);
        this.deaths = new Collection<Avatar>([], 'id');
        // Before the controller: it sends the statistics when the round ends, after they are updated
        metrics.games.inc();
        this.stats = new GameStats(this);
        this.controller = new GameController(this);
        this.bonusStack = new GameBonusStack(this);
        this.roundWinner = null;
        this.gameWinner = null;
        this.deathInFrame = false;

        this.onPoint = this.onPoint.bind(this);
        this.saveResult = this.saveResult.bind(this);

        // Before the end releases the avatars
        this.on('end', this.saveResult);

        let avatar, i;

        for (i = this.avatars.items.length - 1; i >= 0; i--) {
            avatar = this.avatars.items[i];
            avatar.clear();
            avatar.on('point', this.onPoint);
        }
    }

    /**
     * Keep the result of the game. A game that did not finish a round has none; a problem of the storage is told and
     * counted, and never reaches the game.
     */
    saveResult() {
        const storage = this.room.storage;

        if (!storage || !this.stats || this.stats.rounds.length === 0) {
            return;
        }

        const start = performance.now();

        try {
            storage.saveGame(buildGameResult(this));
            metrics.gamesSaved.inc();
            metrics.storageWrite.observe((performance.now() - start) / 1000);
        } catch (error) {
            metrics.storageErrors.inc();
            console.error('Can not keep the game "%s":', this.name, error);
        }
    }

    /**
     * Create the FPS logger
     */
    createFPSLogger() {
        return new FPSLogger();
    }

    /**
     * Create the bonus manager
     */
    createBonusManager() {
        return new BonusManager(this, this.room.config.getBonuses(), this.room.config.getVariable('bonusRate') ?? 0);
    }

    /**
     * On frame: measure it for the metrics
     */
    override onFrame(step: number) {
        const start = performance.now();

        try {
            super.onFrame(step);
        } catch (error) {
            // A bug in one game must not stop the others: end this one
            metrics.gameErrors.inc();
            console.error('Error in the game "%s", it is ended:', this.name, error);
            this.abort();

            return;
        }

        metrics.tickDuration.observe((performance.now() - start) / 1000);
        metrics.tickInterval.observe(step / 1000);
    }

    /**
     * Get still loading avatars
     */
    override getLoadingAvatars(): Collection<Avatar> {
        if (this.loadingOver) {
            return new Collection<Avatar>([], 'id');
        }

        // An absent player is not waited for
        return (super.getLoadingAvatars() as Collection<Avatar>).filter(function () {
            return !this.player.client.away;
        });
    }

    /**
     * Who takes part in the next round? The players that are in the room and connected (and loaded, at the very start).
     * The others sit out, with their score: they come back at the start of a round, never in the middle of it.
     */
    syncPresence(requireReady: boolean = false) {
        for (const avatar of this.avatars.items.slice()) {
            const player = avatar.player;
            const present = this.room.players.exists(player) && !player.client.away && (!requireReady || avatar.ready);

            if (present === avatar.present) {
                continue;
            }

            if (present) {
                avatar.present = true;
                this.emit('player:join', { player });
            } else {
                avatar.destroy();
                this.emit('player:leave', { player });
            }
        }
    }

    /**
     * A player comes in the middle of the game: the avatar takes part from the next round on
     */
    addPlayer(player: Player) {
        const avatar = player.getAvatar();

        if (!this.avatars.add(avatar)) {
            return;
        }

        avatar.clear();
        avatar.destroy();
        avatar.on('point', this.onPoint);
        this.stats.addAvatar(avatar);
        this.controller.addAvatar(avatar);
    }

    /**
     * Update
     */
    override update(step: number) {
        const score = this.deaths.count();

        this.deathInFrame = false;

        for (let i = this.avatars.items.length - 1; i >= 0; i--) {
            const avatar = this.avatars.items[i];

            if (avatar.alive) {
                this.updateAvatar(avatar, step, score);

                if (avatar.alive) {
                    avatar.printManager.test();
                    this.bonusManager.testCatch(avatar);
                    this.stats.testSurroundings(avatar);
                }
            }
        }

        if (this.deathInFrame) {
            this.checkRoundEnd();
        }
    }

    /**
     * Move an avatar and kill it when it hits the border or another body
     */
    updateAvatar(avatar: Avatar, step: number, score: number) {
        avatar.update(step);

        const border = this.world.getBoundIntersect(avatar.body, this.borderless || avatar.ghost ? 0 : avatar.radius);

        if (border) {
            if (this.borderless || avatar.ghost) {
                const position = this.world.getOposite(border[0], border[1]);
                avatar.setPosition(position[0], position[1]);
            } else {
                this.kill(avatar, null, score);
            }
        } else if (!avatar.invincible) {
            const killer = this.world.getBody(avatar.body);

            if (killer) {
                this.kill(avatar, killer, score);
            }
        }
    }

    /**
     * Kill an avatar
     */
    kill(avatar: Avatar, killer: Body | null, score: number) {
        avatar.die(killer);
        avatar.addScore(score);
        this.deaths.add(avatar);
        this.deathInFrame = true;
    }

    /**
     * Remove a avatar from the game
     */
    override removeAvatar(avatar: Avatar) {
        super.removeAvatar(avatar);
        this.emit('player:leave', { player: avatar.player });
        this.checkRoundEnd();
    }

    /**
     * On avatar add point
     */
    onPoint(data: any) {
        if (this.started && this.world.active) {
            this.world.addBody(new AvatarBody(data.x, data.y, data.avatar));
        }
    }

    /**
     * Is done
     */
    isWon(): boolean | Avatar | null {
        const present = this.getPresentAvatars().count();

        if (present <= 0) {
            return true;
        }
        if (this.avatars.count() > 1 && present <= 1) {
            return true;
        }

        const maxScore = this.maxScore,
            players = this.avatars.filter(function () {
                return this.present && this.score >= maxScore;
            });

        if (players.count() === 0) {
            return null;
        }

        if (players.count() === 1) {
            return players.getFirst();
        }

        this.sortAvatars(players);

        return players.items[0].score === players.items[1].score ? null : players.getFirst();
    }

    /**
     * Check if the round should end
     */
    checkRoundEnd() {
        if (!this.inRound) {
            return;
        }

        let alive = false;

        for (let i = this.avatars.items.length - 1; i >= 0; i--) {
            if (this.avatars.items[i].alive) {
                if (alive) {
                    return;
                }

                alive = true;
            }
        }

        this.endRound();
    }

    /**
     * Resolve scores
     */
    resolveScores() {
        let winner;

        if (this.avatars.count() === 1) {
            winner = this.avatars.getFirst();
        } else {
            winner = this.avatars.match(function () {
                return this.alive;
            });
        }

        if (winner) {
            winner.addScore(Math.max(this.avatars.count() - 1, 1));
            this.roundWinner = winner;
        }

        for (let i = this.avatars.items.length - 1; i >= 0; i--) {
            this.avatars.items[i].resolveScore();
        }
    }

    /**
     * Clear trails
     */
    clearTrails() {
        this.world.clear();
        this.world.activate();
        this.emit('clear', { game: this });
    }

    /**
     * Update size
     */
    override setSize() {
        super.setSize();

        this.world.clear();
        this.world = new World(this.size);

        this.bonusManager.setSize();
    }

    /**
     * Check end of round
     */
    override onRoundEnd() {
        this.resolveScores();
        this.emit('round:end', { winner: this.roundWinner });
    }

    /**
     * New round
     */
    override onRoundNew() {
        metrics.rounds.inc();
        this.emit('round:new', { game: this });
        super.onRoundNew();

        let avatar, position, i;

        this.roundWinner = null;
        this.world.clear();
        this.deaths.clear();
        this.bonusStack.clear();

        const scoreLeader = (this.sortAvatars(this.avatars).getFirst() as Avatar).score;
        for (i = this.avatars.items.length - 1; i >= 0; i--) {
            avatar = this.avatars.items[i];
            if (avatar.present) {
                position = this.world.getRandomPosition(avatar.radius, this.spawnMargin);
                avatar.setPosition(position[0], position[1]);
                avatar.setAngle(this.world.getRandomDirection(avatar.x, avatar.y, this.spawnAngleMargin));
                if (scoreLeader !== 0 && avatar.score === scoreLeader) {
                    avatar.setBorderColor('#FFD700');
                }
            } else {
                this.deaths.add(avatar);
            }
        }
    }

    /**
     * On start
     */
    override onStart() {
        this.emit('game:start', { game: this });

        for (let avatar, i = this.avatars.items.length - 1; i >= 0; i--) {
            avatar = this.avatars.items[i];
            setTimeout(avatar.printManager.start, 3000);
        }

        this.world.activate();

        super.onStart();
    }

    /**
     * On stop
     */
    override onStop() {
        // Before the clients compute the size of the map, which depends on who takes part
        this.syncPresence();
        this.emit('game:stop', { game: this });

        super.onStop();

        const won = this.isWon();

        if (won) {
            if (won instanceof Avatar) {
                this.gameWinner = won;
            }
            this.end();
        } else {
            this.newRound();
        }
    }

    /**
     * Set borderless
     */
    override setBorderless(borderless: boolean) {
        if (this.borderless !== borderless) {
            super.setBorderless(borderless);
            this.emit('borderless', this.borderless);
        }
    }

    /**
     * FIN DU GAME
     */
    override end(): boolean {
        if (super.end()) {
            this.release();

            return true;
        }

        return false;
    }

    /**
     * Stop the game for good, whatever it is doing: after an error, when its state can not be trusted
     */
    abort() {
        this.clearFrame();
        this.fps.stop();
        this.bonusManager.stop();

        if (this.started) {
            this.started = false;
            this.inRound = false;
            this.emit('end', { game: this });
            this.release();
        }
    }

    /**
     * Let go of everything the game holds
     */
    release() {
        this.stats.destroy();
        this.avatars.clear();
        this.world.clear();

        delete (this as Partial<Game>).world;
        delete (this as Partial<Game>).avatars;
        delete (this as Partial<Game>).deaths;
        delete (this as Partial<Game>).bonusManager;
        delete (this as Partial<Game>).controller;
    }
}
