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
import type { Body } from '../core/Body.ts';
import type { Room } from './Room.ts';

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

    constructor(room: Room) {
        super(room);

        this.world = new World(this.size);
        this.deaths = new Collection<Avatar>([], 'id');
        // Before the controller: it sends the statistics when the round ends, after they are updated
        this.stats = new GameStats(this);
        this.controller = new GameController(this);
        this.bonusStack = new GameBonusStack(this);
        this.roundWinner = null;
        this.gameWinner = null;
        this.deathInFrame = false;

        this.onPoint = this.onPoint.bind(this);

        let avatar, i;

        for (i = this.avatars.items.length - 1; i >= 0; i--) {
            avatar = this.avatars.items[i];
            avatar.clear();
            avatar.on('point', this.onPoint);
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
     * Update
     */
    update(step: number) {
        const score = this.deaths.count();
        let avatar;
        let border;
        let i;
        let position;
        let killer;

        this.deathInFrame = false;

        for (i = this.avatars.items.length - 1; i >= 0; i--) {
            avatar = this.avatars.items[i];

            if (avatar.alive) {
                avatar.update(step);

                border = this.world.getBoundIntersect(avatar.body, this.borderless || avatar.ghost ? 0 : avatar.radius);

                if (border) {
                    if (this.borderless || avatar.ghost) {
                        position = this.world.getOposite(border[0], border[1]);
                        avatar.setPosition(position[0], position[1]);
                    } else {
                        this.kill(avatar, null, score);
                    }
                } else {
                    if (!avatar.invincible) {
                        killer = this.world.getBody(avatar.body);

                        if (killer) {
                            this.kill(avatar, killer, score);
                        }
                    }
                }

                if (avatar.alive) {
                    avatar.printManager.test();
                    this.bonusManager.testCatch(avatar);
                }
            }
        }

        if (this.deathInFrame) {
            this.checkRoundEnd();
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
    removeAvatar(avatar: Avatar) {
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
                if (!alive) {
                    alive = true;
                } else {
                    return;
                }
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
    setSize() {
        super.setSize();

        this.world.clear();
        this.world = new World(this.size);

        this.bonusManager.setSize();
    }

    /**
     * Check end of round
     */
    onRoundEnd() {
        this.resolveScores();
        this.emit('round:end', { winner: this.roundWinner });
    }

    /**
     * New round
     */
    onRoundNew() {
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
    onStart() {
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
    onStop() {
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
    setBorderless(borderless: boolean) {
        if (this.borderless !== borderless) {
            super.setBorderless(borderless);
            this.emit('borderless', this.borderless);
        }
    }

    /**
     * FIN DU GAME
     */
    end(): boolean {
        if (super.end()) {
            this.stats.destroy();
            this.avatars.clear();
            this.world.clear();

            delete (this as Partial<Game>).world;
            delete (this as Partial<Game>).avatars;
            delete (this as Partial<Game>).deaths;
            delete (this as Partial<Game>).bonusManager;
            delete (this as Partial<Game>).controller;

            return true;
        }

        return false;
    }
}
