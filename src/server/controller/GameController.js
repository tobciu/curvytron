import Collection from '../../shared/Collection.js';
import SocketGroup from '../core/SocketGroup.js';
import Compressor from '../../shared/service/Compressor.js';

/**
 * Game Controller
 */
class GameController {
    /**
     * Waiting time
     *
     * @type {Number}
     */
    waitingTime = 30000;

    constructor(game) {
        this.game = game;
        this.clients = new Collection();
        this.socketGroup = new SocketGroup(this.clients);
        this.compressor = new Compressor();
        this.waiting = null;

        this.onGameStart = this.onGameStart.bind(this);
        this.onGameStop = this.onGameStop.bind(this);
        this.onDie = this.onDie.bind(this);
        this.onPosition = this.onPosition.bind(this);
        this.onAngle = this.onAngle.bind(this);
        this.onPoint = this.onPoint.bind(this);
        this.onScore = this.onScore.bind(this);
        this.onRoundScore = this.onRoundScore.bind(this);
        this.onProperty = this.onProperty.bind(this);
        this.onBonusStack = this.onBonusStack.bind(this);
        this.onBonusPop = this.onBonusPop.bind(this);
        this.onBonusClear = this.onBonusClear.bind(this);
        this.onRoundNew = this.onRoundNew.bind(this);
        this.onRoundEnd = this.onRoundEnd.bind(this);
        this.onPlayerLeave = this.onPlayerLeave.bind(this);
        this.onClear = this.onClear.bind(this);
        this.onBorderless = this.onBorderless.bind(this);
        this.onEnd = this.onEnd.bind(this);
        this.stopWaiting = this.stopWaiting.bind(this);

        this.callbacks = {
            onReady: () => this.onReady(this),
            onMove: (data) => this.onMove(this, data)
        };

        this.loadGame();
    }

    /**
     * Load game
     */
    loadGame() {
        this.game.on('game:start', this.onGameStart);
        this.game.on('game:stop', this.onGameStop);
        this.game.on('end', this.onEnd);
        this.game.on('clear', this.onClear);
        this.game.on('player:leave', this.onPlayerLeave);
        this.game.on('round:new', this.onRoundNew);
        this.game.on('round:end', this.onRoundEnd);
        this.game.on('borderless', this.onBorderless);
        this.game.bonusManager.on('bonus:pop', this.onBonusPop);
        this.game.bonusManager.on('bonus:clear', this.onBonusClear);

        for (let i = this.game.room.controller.clients.items.length - 1; i >= 0; i--) {
            this.attach(this.game.room.controller.clients.items[i]);
        }

        this.waiting = setTimeout(this.stopWaiting, this.waitingTime);
    }

    /**
     * Remove game
     *
     * @param {Game} game
     */
    unloadGame() {
        this.game.removeListener('game:start', this.onGameStart);
        this.game.removeListener('game:stop', this.onGameStop);
        this.game.removeListener('end', this.onEnd);
        this.game.removeListener('clear', this.onClear);
        this.game.removeListener('player:leave', this.onPlayerLeave);
        this.game.removeListener('round:new', this.onRoundNew);
        this.game.removeListener('round:end', this.onRoundEnd);
        this.game.removeListener('borderless', this.onBorderless);
        this.game.bonusManager.removeListener('bonus:pop', this.onBonusPop);
        this.game.bonusManager.removeListener('bonus:clear', this.onBonusClear);

        for (let i = this.clients.items.length - 1; i >= 0; i--) {
            this.detach(this.clients.items[i]);
        }
    }

    /**
     * Attach events
     *
     * @param {SocketClient} client
     */
    attach(client) {
        if (this.clients.add(client)) {
            this.attachEvents(client);
            this.socketGroup.addEvent('game:spectators', this.countSpectators());
            client.pingLogger.start();
        }
    }

    /**
     * Attach events
     *
     * @param {SocketClient} client
     */
    detach(client) {
        this.detachEvents(client);
        if (this.clients.remove(client)) {
            for (let i = client.players.items.length - 1; i >= 0; i--) {
                if (client.players.items[i].avatar) {
                    this.game.removeAvatar(client.players.items[i].avatar);
                }
            }
            this.socketGroup.addEvent('game:spectators', this.countSpectators());
            client.pingLogger.stop();
        }
    }

    /**
     * On player leave
     */
    onPlayerLeave(data) {
        this.socketGroup.addEvent('game:leave', data.player.id);
    }

    /**
     * Detach events
     *
     * @param {SocketClient} client
     */
    attachEvents(client) {
        client.on('ready', this.callbacks.onReady);

        if (!client.players.isEmpty()) {
            client.on('player:move', this.callbacks.onMove);
        }

        for (let i = client.players.items.length - 1; i >= 0; i--) {
            const avatar = client.players.items[i].getAvatar();
            avatar.on('die', this.onDie);
            avatar.on('position', this.onPosition);
            avatar.on('angle', this.onAngle);
            avatar.on('point', this.onPoint);
            avatar.on('score', this.onScore);
            avatar.on('score:round', this.onRoundScore);
            avatar.on('property', this.onProperty);
            avatar.bonusStack.on('change', this.onBonusStack);
        }
    }

    /**
     * Detach events
     *
     * @param {SocketClient} client
     */
    detachEvents(client) {
        client.removeListener('ready', this.callbacks.onReady);

        if (!client.players.isEmpty()) {
            client.removeListener('player:move', this.callbacks.onMove);
        }

        for (let i = client.players.items.length - 1; i >= 0; i--) {
            const avatar = client.players.items[i].avatar;
            if (avatar) {
                avatar.removeListener('die', this.onDie);
                avatar.removeListener('position', this.onPosition);
                avatar.removeListener('point', this.onPoint);
                avatar.removeListener('score', this.onScore);
                avatar.removeListener('score:round', this.onRoundScore);
                avatar.removeListener('property', this.onProperty);
                avatar.bonusStack.removeListener('change', this.onBonusStack);
            }
        }
    }

    /**
     * Attach spectator
     *
     * @param {SocketClient} client
     */
    attachSpectator(client) {
        const properties = {
            angle: 'angle',
            radius: 'radius',
            color: 'color',
            printing: 'printing',
            score: 'score'
        };
        const events = [['spectate', {
            inRound: this.game.inRound,
            rendered: !!this.game.rendered,
            maxScore: this.game.maxScore
        }]];

        for (let i = this.game.avatars.items.length - 1; i >= 0; i--) {
            const avatar = this.game.avatars.items[i];
            events.push(['position', [avatar.id, this.compressor.compress(avatar.x), this.compressor.compress(avatar.y)]]);

            for (const property in properties) {
                if (properties.hasOwnProperty(property)) {
                    events.push(['property', { avatar: avatar.id, property: property, value: avatar[properties[property]] }]);
                }
            }

            if (!avatar.alive) {
                events.push(['die', { avatar: avatar.id }]);
            }
        }

        if (this.game.inRound) {
            for (let i = this.game.bonusManager.bonuses.items.length - 1; i >= 0; i--) {
                const bonus = this.game.bonusManager.bonuses.items[i];
                events.push(['bonus:pop', [
                    bonus.id,
                    this.compressor.compress(bonus.x),
                    this.compressor.compress(bonus.y),
                    bonus.constructor.name
                ]]);
            }
        } else {
            this.socketGroup.addEvent('round:end', this.game.roundWinner ? this.game.roundWinner.id : null);
        }

        events.push(['game:spectators', this.countSpectators()]);
        client.addEvents(events);
    }

    /**
     * Count spectators
     *
     * @return {Number}
     */
    countSpectators() {
        return this.clients.filter(function () { return !this.isPlaying(); }).count();
    }

    /**
     * On game loaded
     *
     * @param {SocketClient} client
     */
    onReady(client) {
        if (this.game.started) {
            this.attachSpectator(client);
        } else {
            for (let i = client.players.items.length - 1; i >= 0; i--) {
                const avatar = client.players.items[i].getAvatar();
                avatar.ready = true;
                this.socketGroup.addEvent('ready', avatar.id);
            }
            this.checkReady();
        }
    }

    /**
     * Check if all players are ready
     */
    checkReady() {
        if (this.game.isReady()) {
            this.waiting = clearTimeout(this.waiting);
            this.game.newRound();
        }
    }

    /**
     * Stop waiting for loading players
     */
    stopWaiting() {
        if (this.waiting && !this.game.isReady()) {
            this.waiting = clearTimeout(this.waiting);
            const avatars = this.game.getLoadingAvatars();
            for (let i = avatars.items.length - 1; i >= 0; i--) {
                this.detach(avatars.items[i].player.client);
            }
            this.checkReady();
        }
    }

    /**
     * On move
     *
     * @param {SocketClient} client
     * @param {Number} move
     */
    onMove(client, data) {
        const player = client.players.getById(data.avatar);
        if (player && player.avatar) {
            player.avatar.updateAngularVelocity(data.move);
        }
    }

    /**
     * On point
     *
     * @param {Object} data
     */
    onPoint(data) {
        if (data.important) {
            this.socketGroup.addEvent('point', data.avatar.id);
        }
    }

    /**
     * On position
     *
     * @param {Avatar} avatar
     */
    onPosition(avatar) {
        this.socketGroup.addEvent('position', [
            avatar.id,
            this.compressor.compress(avatar.x),
            this.compressor.compress(avatar.y)
        ]);
    }

    /**
     * On angle
     *
     * @param {Avatar} avatar
     */
    onAngle(avatar) {
        this.socketGroup.addEvent('angle', [
            avatar.id,
            this.compressor.compress(avatar.angle)
        ]);
    }

    /**
     * On die
     *
     * @param {Object} data
     */
    onDie(data) {
        this.socketGroup.addEvent('die', [
            data.avatar.id,
            data.killer ? data.killer.id : null,
            data.old
        ]);
    }

    /**
     * On bonus pop
     *
     * @param {Bonus} bonus
     */
    onBonusPop(bonus) {
        this.socketGroup.addEvent('bonus:pop', [
            bonus.id,
            this.compressor.compress(bonus.x),
            this.compressor.compress(bonus.y),
            bonus.constructor.name
        ]);
    }

    /**
     * On bonus clear
     *
     * @param {Bonus} bonus
     */
    onBonusClear(bonus) {
        this.socketGroup.addEvent('bonus:clear', bonus.id);
    }

    /**
     * On score
     *
     * @param {Avatar} avatar
     */
    onScore(avatar) {
        this.socketGroup.addEvent('score', [avatar.id, avatar.score]);
    }

    /**
     * On round score
     *
     * @param {Avatar} avatar
     */
    onRoundScore(avatar) {
        this.socketGroup.addEvent('score:round', [avatar.id, avatar.roundScore]);
    }

    /**
     * On property
     *
     * @param {Object} data
     */
    onProperty(data) {
        this.socketGroup.addEvent('property', [
            data.avatar.id,
            data.property,
            data.value
        ]);
    }

    /**
     * On bonus stack add
     *
     * @param {Object} data
     */
    onBonusStack(data) {
        this.socketGroup.addEvent('bonus:stack', [
            data.avatar.id,
            data.method,
            data.bonus.id,
            data.bonus.constructor.name,
            data.bonus.duration
        ]);
    }

    /**
     * On game start
     *
     * @param {Object} data
     */
    onGameStart(data) {
        this.socketGroup.addEvent('game:start');
    }

    /**
     * On game stop
     *
     * @param {Object} data
     */
    onGameStop(data) {
        this.socketGroup.addEvent('game:stop');
    }

    /**
     * On round new
     *
     * @param {Object} data
     */
    onRoundNew(data) {
        this.socketGroup.addEvent('round:new');
    }

    /**
     * On round end
     *
     * @param {Object} data
     */
    onRoundEnd(data) {
        this.socketGroup.addEvent('round:end', data.winner ? data.winner.id : null);
    }

    /**
     * On clear
     *
     * @param {Object} data
     */
    onClear(data) {
        this.socketGroup.addEvent('clear');
    }

    /**
     * On borderless
     *
     * @param {Object} data
     */
    onBorderless(data) {
        this.socketGroup.addEvent('borderless', data);
    }

    /**
     * On end
     *
     * @param {Object} data
     */
    onEnd(data) {
        this.socketGroup.addEvent('end');
        this.unloadGame();
    }
}

export default GameController;
