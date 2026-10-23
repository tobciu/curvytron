import { SocketGroup } from '../core/SocketGroup.ts';
import { Collection } from '../../shared/Collection.ts';
import { Compressor } from '../../shared/service/Compressor.ts';
import { isShape, rules } from '../core/validate.ts';
import type { ServerMessage, ClientEvents, ServerEvents } from '../../shared/protocol.ts';
import type { SocketClient } from '../core/SocketClient.ts';
import type { MissionStanding } from '../../shared/missions.ts';
import type { Avatar } from '../model/Avatar.ts';
import type { Bonus } from '../model/Bonus/Bonus.ts';
import type { Game } from '../model/Game.ts';
import type { Player } from '../model/Player.ts';

/**
 * Game Controller
 */
export class GameController {
    game: Game;
    clients: Collection;
    socketGroup: SocketGroup;
    compressor: Compressor;
    waiting: ReturnType<typeof setTimeout> | null;
    callbacks: Record<string, (this: SocketClient, data?: any) => void>;

    /**
     * Waiting time
     */
    waitingTime: number = 30000;

    constructor(game: Game) {
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
        this.onRoundMissions = this.onRoundMissions.bind(this);
        this.onMissionProgress = this.onMissionProgress.bind(this);
        this.onPlayerLeave = this.onPlayerLeave.bind(this);
        this.onPlayerJoin = this.onPlayerJoin.bind(this);
        this.onClear = this.onClear.bind(this);
        this.onBorderless = this.onBorderless.bind(this);
        this.onEnd = this.onEnd.bind(this);
        this.stopWaiting = this.stopWaiting.bind(this);

        this.callbacks = this.createCallbacks(this);

        this.loadGame();
    }

    /**
     * Socket event handlers: the emitter calls them with the client as this, the controller comes in as a parameter
     */
    createCallbacks(controller: GameController): GameController['callbacks'] {
        return {
            onReady: function () {
                controller.onReady(this);
            },
            onMove: function (this: SocketClient, data: any) {
                controller.onMove(this, data);
            }
        };
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
        this.game.on('player:join', this.onPlayerJoin);
        this.game.on('round:new', this.onRoundNew);
        this.game.on('round:end', this.onRoundEnd);
        this.game.on('round:missions', this.onRoundMissions);
        this.game.on('mission:progress', this.onMissionProgress);
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
     */
    unloadGame() {
        this.game.removeListener('game:start', this.onGameStart);
        this.game.removeListener('game:stop', this.onGameStop);
        this.game.removeListener('end', this.onEnd);
        this.game.removeListener('clear', this.onClear);
        this.game.removeListener('player:leave', this.onPlayerLeave);
        this.game.removeListener('player:join', this.onPlayerJoin);
        this.game.removeListener('round:new', this.onRoundNew);
        this.game.removeListener('round:end', this.onRoundEnd);
        this.game.removeListener('round:missions', this.onRoundMissions);
        this.game.removeListener('mission:progress', this.onMissionProgress);
        this.game.removeListener('borderless', this.onBorderless);
        this.game.bonusManager.removeListener('bonus:pop', this.onBonusPop);
        this.game.bonusManager.removeListener('bonus:clear', this.onBonusClear);

        for (let i = this.clients.items.length - 1; i >= 0; i--) {
            this.detach(this.clients.items[i]);
        }
    }

    /**
     * Attach events
     */
    attach(client: SocketClient) {
        if (this.clients.add(client)) {
            this.attachEvents(client);
            this.socketGroup.addEvent('game:spectators', this.countSpectators());
            client.pingLogger.start();
        }
    }

    /**
     * Attach events
     */
    detach(client: SocketClient) {
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
    onPlayerLeave(data: { player: Player }) {
        this.socketGroup.addEvent('game:leave', data.player.id as number);
    }

    /**
     * On player join: back, or new, in the middle of the game
     */
    onPlayerJoin(data: { player: Player }) {
        this.socketGroup.addEvent('game:join', data.player.id as number);
    }

    /**
     * Follow an avatar that was added after the start of the game
     */
    addAvatar(avatar: Avatar) {
        const client = avatar.player.client;

        this.attachAvatar(avatar);

        if (this.clients.exists(client)) {
            // Once is enough
            client.removeListener('player:move', this.callbacks.onMove);
            client.on('player:move', this.callbacks.onMove);
        }
    }

    /**
     * Follow an avatar
     */
    attachAvatar(avatar: Avatar) {
        avatar.on('die', this.onDie);
        avatar.on('position', this.onPosition);
        avatar.on('angle', this.onAngle);
        avatar.on('point', this.onPoint);
        avatar.on('score', this.onScore);
        avatar.on('score:round', this.onRoundScore);
        avatar.on('property', this.onProperty);
        avatar.bonusStack.on('change', this.onBonusStack);
    }

    /**
     * Detach events
     */
    attachEvents(client: SocketClient) {
        client.on('ready', this.callbacks.onReady);

        if (!client.players.isEmpty()) {
            client.on('player:move', this.callbacks.onMove);
        }

        for (let i = client.players.items.length - 1; i >= 0; i--) {
            this.attachAvatar(client.players.items[i].getAvatar());
        }
    }

    /**
     * Detach events
     */
    detachEvents(client: SocketClient) {
        let avatar;

        client.removeListener('ready', this.callbacks.onReady);

        if (!client.players.isEmpty()) {
            client.removeListener('player:move', this.callbacks.onMove);
        }

        for (let i = client.players.items.length - 1; i >= 0; i--) {
            avatar = client.players.items[i].avatar;

            if (avatar) {
                avatar.removeListener('die', this.onDie);
                avatar.removeListener('position', this.onPosition);
                avatar.removeListener('angle', this.onAngle);
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
     */
    attachSpectator(client: SocketClient) {
        const properties: Record<string, keyof Avatar> = {
            angle: 'angle',
            radius: 'radius',
            color: 'color',
            printing: 'printing',
            score: 'score'
        };

        const events: ServerMessage[] = [
            [
                'spectate',
                {
                    inRound: this.game.inRound,
                    rendered: !!this.game.rendered,
                    maxScore: this.game.maxScore,
                    winCondition: this.game.winCondition,
                    rounds: this.game.rounds,
                    minutes: this.game.minutes,
                    size: this.game.size,
                    away: this.game.avatars.items.filter((avatar) => !avatar.present).map((avatar) => avatar.id)
                }
            ]
        ];

        let avatar;
        let bonus;
        let i;

        for (i = this.game.avatars.items.length - 1; i >= 0; i--) {
            avatar = this.game.avatars.items[i];
            events.push([
                'position',
                [avatar.id, this.compressor.compress(avatar.x), this.compressor.compress(avatar.y)]
            ]);

            for (const property in properties) {
                if (Object.hasOwn(properties, property)) {
                    events.push(['property', [avatar.id, property, avatar[properties[property]]]]);
                }
            }

            if (!avatar.alive) {
                events.push(['die', [avatar.id, null, null]]);
            }
        }

        events.push(['round:info', this.game.round]);

        // A client that comes in the middle of a round sees the missions with their standing, and the summary of the round
        // that just ended
        if (this.game.missions) {
            events.push(['round:missions', this.game.missions.standings()]);
        }

        if (!this.game.inRound && this.game.summary) {
            events.push(['round:summary', this.game.summary]);
        }

        if (this.game.inRound) {
            for (i = this.game.bonusManager.bonuses.items.length - 1; i >= 0; i--) {
                bonus = this.game.bonusManager.bonuses.items[i];
                events.push(['bonus:pop', this.describeBonus(bonus as Bonus)]);
            }
        } else {
            events.push(['round:end', this.game.roundWinner ? this.game.roundWinner.id : null]);
        }

        events.push(['game:spectators', this.countSpectators()]);

        client.addEvents(events);
    }

    /**
     * Count spectators
     */
    countSpectators(): number {
        return this.clients
            .filter(function () {
                return !this.isPlaying();
            })
            .count();
    }

    /**
     * On game loaded
     */
    onReady(client: SocketClient) {
        // A client that comes back to the game: pings restart, its players are not absent any more
        client.pingLogger.start();
        client.setAway(false);

        if (this.game.started) {
            this.attachSpectator(client);
        } else {
            for (let avatar, i = client.players.items.length - 1; i >= 0; i--) {
                avatar = client.players.items[i].getAvatar();
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
            clearTimeout(this.waiting ?? undefined);
            this.waiting = null;
            // The players that are not there do not wait for the first round
            this.game.syncPresence(true);
            this.game.newRound();
        }
    }

    /**
     * Stop waiting for loading players
     */
    stopWaiting() {
        if (this.waiting && !this.game.isReady()) {
            clearTimeout(this.waiting ?? undefined);
            this.waiting = null;

            // The ones that are still loading follow as spectators, and play from the next round on
            this.game.loadingOver = true;

            this.checkReady();
        }
    }

    /**
     * On move
     */
    onMove(client: SocketClient, data: ClientEvents['player:move']['data']) {
        if (!isShape(data, { avatar: rules.id, move: rules.integer(-1, 1) })) {
            return;
        }

        const player = client.players.getById(data.avatar);

        if (player?.avatar) {
            player.avatar.updateAngularVelocity(data.move);
        }
    }

    /**
     * On point
     */
    onPoint(data: { avatar: Avatar; important?: boolean }) {
        if (data.important) {
            this.socketGroup.addEvent('point', data.avatar.id);
        }
    }

    /**
     * On position
     */
    onPosition(avatar: Avatar) {
        this.socketGroup.addEvent('position', [
            avatar.id,
            this.compressor.compress(avatar.x),
            this.compressor.compress(avatar.y)
        ]);
    }

    /**
     * On angle
     */
    onAngle(avatar: Avatar) {
        this.socketGroup.addEvent('angle', [avatar.id, this.compressor.compress(avatar.angle)]);
    }

    /**
     * On die
     */
    onDie(data: { avatar: Avatar; killer: Avatar | null; old: boolean | null }) {
        this.socketGroup.addEvent('die', [data.avatar.id, data.killer ? data.killer.id : null, data.old]);
    }

    /**
     * On bonus pop
     */
    onBonusPop(bonus: Bonus) {
        this.socketGroup.addEvent('bonus:pop', this.describeBonus(bonus));
    }

    /**
     * How a bonus is told to the clients: a bonus with a lifetime also tells how long it lives, and how long is left
     */
    describeBonus(bonus: Bonus): ServerEvents['bonus:pop'] {
        const description: ServerEvents['bonus:pop'] = [
            bonus.id as number,
            this.compressor.compress(bonus.x),
            this.compressor.compress(bonus.y),
            bonus.constructor.name
        ];

        if (bonus.lifetime !== null && bonus.expiresAt !== null) {
            description.push(bonus.lifetime, Math.max(bonus.expiresAt - Date.now(), 0));
        }

        return description;
    }

    /**
     * On bonus clear
     */
    onBonusClear(bonus: Bonus) {
        this.socketGroup.addEvent('bonus:clear', bonus.id as number);
    }

    /**
     * On score
     */
    onScore(avatar: Avatar) {
        this.socketGroup.addEvent('score', [avatar.id, avatar.score]);
    }

    /**
     * On round score
     */
    onRoundScore(avatar: Avatar) {
        this.socketGroup.addEvent('score:round', [avatar.id, avatar.roundScore]);
    }

    /**
     * On property
     */
    onProperty(data: { avatar: Avatar; property: string; value: unknown }) {
        this.socketGroup.addEvent('property', [data.avatar.id, data.property, data.value]);
    }

    /**
     * On bonus stack add
     */
    onBonusStack(data: { avatar: Avatar; method: string; bonus: Bonus }) {
        this.socketGroup.addEvent('bonus:stack', [
            data.avatar.id,
            data.method,
            data.bonus.id as number,
            data.bonus.constructor.name,
            data.bonus.duration
        ]);
    }

    // Game events:

    /**
     * On game start
     */
    onGameStart(data?: unknown) {
        this.socketGroup.addEvent('game:start');
    }

    /**
     * On game stop
     */
    onGameStop(data?: unknown) {
        this.socketGroup.addEvent('game:stop');
    }

    /**
     * On round new
     */
    onRoundNew(data?: unknown) {
        this.socketGroup.addEvent('round:new');
        this.socketGroup.addEvent('round:info', this.game.round);
    }

    /**
     * On round missions: the missions of the round that is prepared
     */
    onRoundMissions(missions: MissionStanding[]) {
        this.socketGroup.addEvent('round:missions', missions);
    }

    /**
     * On mission progress: only the missions that changed
     */
    onMissionProgress(missions: MissionStanding[]) {
        this.socketGroup.addEvent('mission:progress', missions);
    }

    /**
     * On round end
     */
    onRoundEnd(data: { winner: Avatar | null }) {
        this.socketGroup.addEvent('round:end', data.winner ? data.winner.id : null);

        if (this.game.summary) {
            this.socketGroup.addEvent('round:summary', this.game.summary);
        }

        this.socketGroup.addEvent('game:stats', this.game.stats.serialize());
    }

    /**
     * On clear
     */
    onClear(data?: unknown) {
        this.socketGroup.addEvent('clear');
    }

    /**
     * On borderless
     */
    onBorderless(data: boolean) {
        this.socketGroup.addEvent('borderless', data);
    }

    /**
     * On end
     */
    onEnd(data?: unknown) {
        this.socketGroup.addEvent('end');
        this.unloadGame();
    }
}
