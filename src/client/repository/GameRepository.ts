import { EventEmitter } from '#event-emitter';
import { MapBonus } from '../model/bonus/MapBonus.ts';
import { StackedBonus } from '../model/bonus/StackedBonus.ts';
import { Compressor } from '../../shared/service/Compressor.ts';
import type { SocketClient } from '../core/SocketClient.ts';
import type { Player } from '../model/Player.ts';
import type { RoomRepository } from './RoomRepository.ts';
import type { SoundManager } from '../service/SoundManager.ts';
import type { ServerEvent } from '../../shared/protocol.ts';
import type { MissionStanding } from '../../shared/missions.ts';

/**
 * GameRepository
 */
export class GameRepository extends EventEmitter {
    client: SocketClient;
    parent: RoomRepository;
    sound: SoundManager;
    compressor: any;
    game: any;

    constructor(client: SocketClient, parent: RoomRepository, sound: SoundManager) {
        super();

        this.client = client;
        this.parent = parent;
        this.sound = sound;
        this.compressor = new Compressor();
        this.game = null;

        this.start = this.start.bind(this);
        this.stop = this.stop.bind(this);
        this.draw = this.draw.bind(this);
        this.onGameStart = this.onGameStart.bind(this);
        this.onGameStop = this.onGameStop.bind(this);
        this.onBonusPop = this.onBonusPop.bind(this);
        this.onBonusClear = this.onBonusClear.bind(this);
        this.onBonusStack = this.onBonusStack.bind(this);
        this.onPosition = this.onPosition.bind(this);
        this.onAngle = this.onAngle.bind(this);
        this.onPoint = this.onPoint.bind(this);
        this.onDie = this.onDie.bind(this);
        this.onProperty = this.onProperty.bind(this);
        this.onRoundNew = this.onRoundNew.bind(this);
        this.onRoundEnd = this.onRoundEnd.bind(this);
        this.onRoundInfo = this.onRoundInfo.bind(this);
        this.onRoundMissions = this.onRoundMissions.bind(this);
        this.onMissionProgress = this.onMissionProgress.bind(this);
        this.onRoundSummary = this.onRoundSummary.bind(this);
        this.onClear = this.onClear.bind(this);
        this.onBorderless = this.onBorderless.bind(this);
        this.onEnd = this.onEnd.bind(this);
        this.onStats = this.onStats.bind(this);
        this.onLeave = this.onLeave.bind(this);
        this.onJoin = this.onJoin.bind(this);
        this.onPlayerJoin = this.onPlayerJoin.bind(this);
        this.onSpectate = this.onSpectate.bind(this);
    }

    /**
     * Start
     */
    start() {
        if (this.parent.room) {
            this.game = this.parent.room.game;
            this.attachEvents();
            this.attachIdleEvents();
            this.parent.on('player:join', this.onPlayerJoin);
            // The players that came after the game was created
            this.game?.syncAvatars();
        }
    }

    /**
     * Pause
     */
    stop() {
        this.detachEvents();
        this.detachIdleEvents();
        this.parent.off('player:join', this.onPlayerJoin);
        this.game = null;
    }

    /**
     * Attach events
     */
    attachEvents() {
        this.client.on('game:start', this.onGameStart);
        this.client.on('game:stop', this.onGameStop);
        this.client.on('property', this.onProperty);
        this.client.on('position', this.onPosition);
        this.client.on('angle', this.onAngle);
        this.client.on('point', this.onPoint);
        this.client.on('die', this.onDie);
        this.client.on('bonus:pop', this.onBonusPop);
        this.client.on('bonus:clear', this.onBonusClear);
        this.client.on('bonus:stack', this.onBonusStack);
        this.client.on('round:new', this.onRoundNew);
        this.client.on('round:end', this.onRoundEnd);
        this.client.on('round:info', this.onRoundInfo);
        this.client.on('round:missions', this.onRoundMissions);
        this.client.on('mission:progress', this.onMissionProgress);
        this.client.on('round:summary', this.onRoundSummary);
        this.client.on('clear', this.onClear);
        this.client.on('borderless', this.onBorderless);
        this.client.on('end', this.onEnd);
        this.client.on('game:stats', this.onStats);
        this.client.on('game:leave', this.onLeave);
        this.client.on('game:join', this.onJoin);
        this.client.on('spectate', this.onSpectate);
    }

    /**
     * Attach events
     */
    detachEvents() {
        this.client.off('game:start', this.onGameStart);
        this.client.off('game:stop', this.onGameStop);
        this.client.off('property', this.onProperty);
        this.client.off('position', this.onPosition);
        this.client.off('angle', this.onAngle);
        this.client.off('point', this.onPoint);
        this.client.off('die', this.onDie);
        this.client.off('bonus:pop', this.onBonusPop);
        this.client.off('bonus:clear', this.onBonusClear);
        this.client.off('bonus:stack', this.onBonusStack);
        this.client.off('round:new', this.onRoundNew);
        this.client.off('round:end', this.onRoundEnd);
        this.client.off('round:info', this.onRoundInfo);
        this.client.off('round:missions', this.onRoundMissions);
        this.client.off('mission:progress', this.onMissionProgress);
        this.client.off('round:summary', this.onRoundSummary);
        this.client.off('clear', this.onClear);
        this.client.off('borderless', this.onBorderless);
        this.client.off('end', this.onEnd);
        this.client.off('game:stats', this.onStats);
        this.client.off('game:leave', this.onLeave);
        this.client.off('game:join', this.onJoin);
        this.client.off('spectate', this.onSpectate);
    }

    /**
     * Attach idle events
     */
    attachIdleEvents() {
        this.client.on('property', this.draw);
        this.client.on('position', this.draw);
        this.client.on('angle', this.draw);
    }

    /**
     * Detach idle events
     */
    detachIdleEvents() {
        this.client.off('property', this.draw);
        this.client.off('position', this.draw);
        this.client.off('angle', this.draw);
    }

    /**
     * Draw
     */
    draw() {
        if (!this.game.frame) {
            this.game.repaint();
        }
    }

    /**
     * On game start
     */
    onGameStart(e: ServerEvent<'game:start'>) {
        this.game.start();
        this.detachIdleEvents();
        this.emit('game:start');
    }

    /**
     * On game stop
     */
    onGameStop(e: ServerEvent<'game:stop'>) {
        this.game.stop();
        this.attachIdleEvents();
        this.emit('game:stop');
    }

    /**
     * On property
     */
    onProperty(e: ServerEvent<'property'>) {
        const data = e.detail,
            avatar = this.game.avatars.getById(data[0]);

        if (avatar) {
            avatar.set(data[1], data[2]);
        }
    }

    /**
     * On position
     */
    onPosition(e: ServerEvent<'position'>) {
        const avatar = this.game.avatars.getById(e.detail[0]);

        if (avatar) {
            avatar.setPositionFromServer(
                this.compressor.decompress(e.detail[1]),
                this.compressor.decompress(e.detail[2])
            );
        }
    }

    /**
     * On point
     */
    onPoint(e: ServerEvent<'point'>) {
        const avatar = this.game.avatars.getById(e.detail);

        if (avatar) {
            avatar.addPoint(avatar.x, avatar.y);
        }
    }

    /**
     * On angle
     */
    onAngle(e: ServerEvent<'angle'>) {
        const avatar = this.game.avatars.getById(e.detail[0]);

        if (avatar) {
            avatar.setAngle(this.compressor.decompress(e.detail[1]));
        }
    }

    /**
     * On die
     */
    onDie(e: ServerEvent<'die'>) {
        const avatar = this.game.avatars.getById(e.detail[0]);

        if (avatar) {
            avatar.die();
            this.sound.play('death');
        }
    }

    /**
     * On bonus pop
     */
    onBonusPop(e: ServerEvent<'bonus:pop'>) {
        const bonus = new MapBonus(
            e.detail[0],
            this.compressor.decompress(e.detail[1]),
            this.compressor.decompress(e.detail[2]),
            e.detail[3],
            e.detail[4],
            e.detail[5]
        );

        this.game.bonusManager.add(bonus);
        this.sound.play('bonus-pop');
    }

    /**
     * On bonus clear
     */
    onBonusClear(e: ServerEvent<'bonus:clear'>) {
        const bonus = this.game.bonusManager.bonuses.getById(e.detail);

        if (bonus) {
            this.game.bonusManager.remove(bonus);
            this.sound.play('bonus-clear');
        }
    }

    /**
     * On bonus stack
     */
    onBonusStack(e: ServerEvent<'bonus:stack'>) {
        const avatar = this.game.avatars.getById(e.detail[0]);

        if (avatar?.local) {
            avatar.bonusStack[e.detail[1]](new StackedBonus(e.detail[2], e.detail[3], e.detail[4]));
        }
    }

    /**
     * On round new
     */
    onRoundNew(e: ServerEvent<'round:new'>) {
        this.game.newRound();
        // A mode with missions tells them right after
        this.game.missions = [];
        this.game.summary = null;
        this.emit('round:new');
    }

    /**
     * On round info: where the round is on the way to the end of the game
     */
    onRoundInfo(e: ServerEvent<'round:info'>) {
        this.game.round = e.detail;
        this.emit('round:info', e.detail);
    }

    /**
     * On round missions: the missions of the round, with their standing
     */
    onRoundMissions(e: ServerEvent<'round:missions'>) {
        this.game.missions = e.detail;
        this.emit('round:missions');
    }

    /**
     * On mission progress: only the missions whose standing changed
     */
    onMissionProgress(e: ServerEvent<'mission:progress'>) {
        const changed = new Map(e.detail.map((standing): [string, MissionStanding] => [standing.id, standing]));

        this.game.missions = this.game.missions.map(
            (standing: MissionStanding) => changed.get(standing.id) ?? standing
        );
        this.emit('mission:progress');
    }

    /**
     * On round summary: what every player got in the round
     */
    onRoundSummary(e: ServerEvent<'round:summary'>) {
        this.game.summary = e.detail;
        this.emit('round:summary');
    }

    /**
     * On round end
     */
    onRoundEnd(e: ServerEvent<'round:end'>) {
        this.game.endRound();
        this.game.roundWinner = e.detail ? this.game.avatars.getById(e.detail) : null;
        this.emit('round:end');
    }

    /**
     * On clear
     */
    onClear(e: ServerEvent<'clear'>) {
        this.game.clearTrails();
    }

    /**
     * On borderless
     */
    onBorderless(e: ServerEvent<'borderless'>) {
        this.game.setBorderless(e.detail);
        this.emit('borderless');
    }

    /**
     * On statistics
     */
    onStats(e: ServerEvent<'game:stats'>) {
        this.game.stats = e.detail;
        this.emit('stats');
    }

    /**
     * On game end
     */
    onEnd(e: ServerEvent<'end'>) {
        this.game.end();
        this.sound.play('win');
        this.emit('end');
    }

    /**
     * On leave: the avatar sits out, or its player is gone
     */
    onLeave(e: ServerEvent<'game:leave'>) {
        const avatar = this.game.avatars.getById(e.detail);

        if (avatar) {
            if (avatar.alive) {
                this.game.removeAvatar(avatar);
            } else {
                avatar.sitOut();
            }

            this.emit('game:leave', { avatar });
        }
    }

    /**
     * On join: the avatar takes part again, from the next round on
     */
    onJoin(e: ServerEvent<'game:join'>) {
        const avatar = this.game.avatars.getById(e.detail);

        if (avatar) {
            avatar.rejoin();
            this.emit('game:join', { avatar });
        }
    }

    /**
     * A player came in the middle of the game
     */
    onPlayerJoin(e: { detail: { player: Player } }) {
        const avatar = this.game?.addAvatar(e.detail.player);

        if (avatar) {
            this.emit('game:player', { avatar });
        }
    }

    /**
     * On spectate
     */
    onSpectate(e: ServerEvent<'spectate'>) {
        const data = e.detail;

        this.game.maxScore = data.maxScore;
        this.game.winCondition = data.winCondition;
        this.game.rounds = data.rounds;
        this.game.minutes = data.minutes;

        // The size of the map depends on who takes part
        if (data.size !== this.game.size) {
            this.game.size = data.size;

            if (this.game.render) {
                this.game.onResize();
            }
        }

        for (let i = this.game.avatars.items.length - 1; i >= 0; i--) {
            this.game.avatars.items[i].local = true;
            this.game.avatars.items[i].ready = true;
        }

        for (const id of data.away) {
            this.game.avatars.getById(id)?.sitOut();
        }

        if (data.inRound) {
            if (data.rendered) {
                this.game.newRound(0);
            } else {
                this.game.newRound();
            }
        } else {
            this.game.start();
        }

        this.emit('spectate');
    }
}
