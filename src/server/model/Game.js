import BaseGame from '../../shared/model/BaseGame.js';
import World from '../core/World.js';
import Collection from '../../shared/Collection.js';
import GameController from '../controller/GameController.js';
import GameBonusStack from './GameBonusStack.js';
import AvatarBody from '../core/AvatarBody.js';
import Avatar from './Avatar.js';

/**
 * Game
 */
class Game extends BaseGame {
    constructor(room) {
        super(room);

        this.world = new World(this.size);
        this.deaths = new Collection([], 'id');
        this.controller = new GameController(this);
        this.bonusStack = new GameBonusStack(this);
        this.roundWinner = null;
        this.gameWinner = null;
        this.deathInFrame = false;

        this.onPoint = this.onPoint.bind(this);

        for (let i = this.avatars.items.length - 1; i >= 0; i--) {
            const avatar = this.avatars.items[i];
            avatar.clear();
            avatar.on('point', this.onPoint);
        }
    }

    /**
     * Update
     *
     * @param {Number} step
     */
    update(step) {
        const score = this.deaths.count();
        this.deathInFrame = false;

        for (let i = this.avatars.items.length - 1; i >= 0; i--) {
            const avatar = this.avatars.items[i];

            if (avatar.alive) {
                avatar.update(step);

                const border = this.world.getBoundIntersect(avatar.body, this.borderless || avatar.ghost ? 0 : avatar.radius);

                if (border) {
                    if (this.borderless || avatar.ghost) {
                        const position = this.world.getOposite(border[0], border[1]);
                        avatar.setPosition(position[0], position[1]);
                    } else {
                        this.kill(avatar, null, score);
                    }
                } else {
                    if (!avatar.invincible) {
                        const killer = this.world.getBody(avatar.body);
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
     *
     * @param {Avatar} avatar
     * @param {Body|null} killer
     * @param {Number} score
     */
    kill(avatar, killer, score) {
        avatar.die(killer);
        avatar.addScore(score);
        this.deaths.add(avatar);
        this.deathInFrame = true;
    }

    /**
     * Remove a avatar from the game
     *
     * @param {Avatar} avatar
     */
    removeAvatar(avatar) {
        super.removeAvatar(avatar);
        this.emit('player:leave', { player: avatar.player });
        this.checkRoundEnd();
    }

    /**
     * On avatar add point
     *
     * @param {Object} data
     */
    onPoint(data) {
        if (this.started && this.world.active) {
            this.world.addBody(new AvatarBody(data.x, data.y, data.avatar));
        }
    }

    /**
     * Is done
     *
     * @return {Boolean}
     */
    isWon() {
        const present = this.getPresentAvatars().count();

        if (present <= 0) { return true; }
        if (this.avatars.count() > 1 && present <= 1) { return true; }

        const maxScore = this.maxScore;
        const players = this.avatars.filter(function () { return this.present && this.score >= maxScore; });

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
            winner = this.avatars.match(function () { return this.alive; });
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

        this.roundWinner = null;
        this.world.clear();
        this.deaths.clear();
        this.bonusStack.clear();

        const scoreLeader = this.sortAvatars(this.avatars).getFirst().score;
        for (let i = this.avatars.items.length - 1; i >= 0; i--) {
            const avatar = this.avatars.items[i];
            if (avatar.present) {
                const position = this.world.getRandomPosition(avatar.radius, this.spawnMargin);
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

        for (let i = this.avatars.items.length - 1; i >= 0; i--) {
            const avatar = this.avatars.items[i];
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
     *
     * @param {Boolean} borderless
     */
    setBorderless(borderless) {
        if (this.borderless !== borderless) {
            super.setBorderless(borderless);
            this.emit('borderless', this.borderless);
        }
    }

    /**
     * FIN DU GAME
     */
    end() {
        if (super.end()) {
            this.avatars.clear();
            this.world.clear();

            delete this.world;
            delete this.avatars;
            delete this.deaths;
            delete this.bonusManager;
            delete this.controller;
        }
    }
}

export default Game;
