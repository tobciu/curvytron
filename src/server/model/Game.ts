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
import { buildGameResult, minPlayers } from '../storage/result.ts';
import { getScoringMode, winConditions } from '../scoring/index.ts';
import { finaleFactor } from '../../shared/scoring.ts';
import { defaultRoundTime } from '../scoring/WinCondition.ts';
import type { ScoringMode, WinCondition } from '../scoring/index.ts';
import type { Body } from '../core/Body.ts';
import type { Bonus } from './Bonus/Bonus.ts';
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
    /** How points are given, and when the game is over */
    scoring: ScoringMode;
    winRule: WinCondition;
    /** Rounds that are over */
    roundsPlayed: number = 0;
    /** When the first round started (ms), null before */
    startedAt: number | null = null;
    /** The last round of the game was played: the game is over, unless the score is tied */
    finalPlayed: boolean = false;
    /** The avatars that are tied after the last round: only they score in the tie break */
    tiebreakers: Set<Avatar> | null = null;
    /** Points count this many times in the running round (2 in the finale) */
    scoreFactor: number = 1;

    constructor(room: Room) {
        super(room);

        this.scoring = getScoringMode(room.config.mode);
        this.winRule = winConditions[this.winCondition];
        this.warmdownTime = this.scoring.warmdownTime;
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
        this.onBonusCatch = this.onBonusCatch.bind(this);
        this.saveResult = this.saveResult.bind(this);

        // Before the end releases the avatars
        this.on('end', this.saveResult);
        this.bonusManager.on('bonus:catch', this.onBonusCatch);

        let avatar, i;

        for (i = this.avatars.items.length - 1; i >= 0; i--) {
            avatar = this.avatars.items[i];
            avatar.clear();
            avatar.on('point', this.onPoint);
        }
    }

    /**
     * Keep the result of the game. A game that did not finish a round has none, nor has a game of fewer than two
     * players (browsers): nobody collects points alone. A problem of the storage is told and counted, and never reaches
     * the game.
     */
    saveResult() {
        const storage = this.room.storage;

        if (!storage || !this.stats || this.stats.rounds.length === 0) {
            return;
        }

        const start = performance.now();

        try {
            const result = buildGameResult(this);

            if (result.players.length < minPlayers) {
                return;
            }

            storage.saveGame(result);
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
        this.scoring.onKill(this, avatar, score);
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
     * Give points to an avatar: the finale counts twice, the tie break only for the avatars that are tied
     */
    award(avatar: Avatar, points: number) {
        if (this.tiebreakers && !this.tiebreakers.has(avatar)) {
            return;
        }

        avatar.addScore(points * this.scoreFactor);
    }

    /**
     * An avatar caught a bonus
     */
    onBonusCatch(data: { avatar: Avatar; bonus: Bonus }) {
        this.scoring.onBonusCatch(this, data.avatar, data.bonus);
    }

    /**
     * How long a round takes with its pauses (ms), as the rounds so far show
     */
    averageRoundTime(): number {
        const rounds = this.stats.rounds;

        if (rounds.length === 0) {
            return defaultRoundTime + this.warmupTime + this.warmdownTime;
        }

        const total = rounds.reduce((sum, { duration }) => sum + duration, 0);

        return total / rounds.length + this.warmupTime + this.warmdownTime;
    }

    /**
     * Where the round that starts now is on the way to the end of the game
     */
    planRound() {
        this.startedAt ??= Date.now();

        const tied = this.finalPlayed ? this.getTiedAvatars() : null;
        const plan = tied ? { last: true, finale: false } : this.winRule.plan(this);

        this.tiebreakers = tied;
        this.scoreFactor = plan.finale ? finaleFactor : 1;
        this.round = { round: this.roundsPlayed + 1, last: plan.last, finale: plan.finale, tiebreak: tied !== null };
    }

    /**
     * The avatars with the highest score, when the game is over but they are tied (null when the condition is points:
     * the game just goes on)
     */
    getTiedAvatars(): Set<Avatar> | null {
        if (this.winCondition === 'points') {
            return null;
        }

        const present = this.sortAvatars(this.getPresentAvatars()).items as Avatar[];
        const top = present[0]?.score;

        return new Set(present.filter(({ score }) => score === top));
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

        const players = this.winRule.candidates(this);

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

        this.scoring.onRoundEnd(this, winner ?? null);

        if (winner) {
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
        this.roundsPlayed++;
        this.finalPlayed ||= this.round.last;
        this.emit('round:end', { winner: this.roundWinner });
    }

    /**
     * New round
     */
    override onRoundNew() {
        metrics.rounds.inc();
        this.planRound();
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
