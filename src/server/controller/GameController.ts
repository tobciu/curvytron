import { Collection } from '@shared/Collection.ts';
import { Compressor } from '@shared/service/Compressor.ts';
import { SocketGroup } from '../core/SocketGroup.ts';
import type { SocketClient } from '../core/SocketClient.ts';
import type { Game } from '../model/Game.ts';

/** In-game controller: streams position/angle/property/die/bonus events to clients. */
export class GameController {
  static readonly waitingTime = 30000;

  game: Game;
  clients = new Collection<SocketClient>();
  socketGroup: SocketGroup;
  compressor = new Compressor();
  waiting: ReturnType<typeof setTimeout> | null = null;

  callbacks: {
    onReady(this: SocketClient): void;
    onMove(this: SocketClient, data: any): void;
  };

  constructor(game: Game) {
    const controller = this;
    this.game = game;
    this.socketGroup = new SocketGroup(this.clients);

    for (const m of [
      'onGameStart', 'onGameStop', 'onDie', 'onPosition', 'onAngle', 'onPoint', 'onScore',
      'onRoundScore', 'onProperty', 'onBonusStack', 'onBonusPop', 'onBonusClear', 'onRoundNew',
      'onRoundEnd', 'onPlayerLeave', 'onClear', 'onBorderless', 'onEnd', 'stopWaiting',
    ] as const) {
      (this as any)[m] = (this as any)[m].bind(this);
    }

    this.callbacks = {
      onReady() {
        controller.onReady(this);
      },
      onMove(data: any) {
        controller.onMove(this, data);
      },
    };

    this.loadGame();
  }

  loadGame(): void {
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

    for (let i = (this.game.room as any).controller.clients.items.length - 1; i >= 0; i--) {
      this.attach((this.game.room as any).controller.clients.items[i]!);
    }

    this.waiting = setTimeout(this.stopWaiting, GameController.waitingTime);
  }

  unloadGame(): void {
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
      this.detach(this.clients.items[i]!);
    }
  }

  attach(client: SocketClient): void {
    if (this.clients.add(client)) {
      this.attachEvents(client);
      this.socketGroup.addEvent('game:spectators', this.countSpectators());
      client.pingLogger.start();
    }
  }

  detach(client: SocketClient): void {
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

  onPlayerLeave(data: any): void {
    this.socketGroup.addEvent('game:leave', data.player.id);
  }

  attachEvents(client: SocketClient): void {
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

  detachEvents(client: SocketClient): void {
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

  attachSpectator(client: SocketClient): void {
    const properties: Record<string, string> = {
      angle: 'angle',
      radius: 'radius',
      color: 'color',
      printing: 'printing',
      score: 'score',
    };
    const events: any[] = [
      [
        'spectate',
        {
          inRound: this.game.inRound,
          rendered: this.game.rendered ? true : false,
          maxScore: this.game.maxScore,
        },
      ],
    ];

    for (let i = this.game.avatars.items.length - 1; i >= 0; i--) {
      const avatar = this.game.avatars.items[i] as any;
      events.push([
        'position',
        [avatar.id, this.compressor.compress(avatar.x), this.compressor.compress(avatar.y)],
      ]);
      for (const property in properties) {
        events.push([
          'property',
          { avatar: avatar.id, property, value: avatar[properties[property]!] },
        ]);
      }
      if (!avatar.alive) {
        events.push(['die', { avatar: avatar.id }]);
      }
    }

    if (this.game.inRound) {
      for (let i = this.game.bonusManager.bonuses.items.length - 1; i >= 0; i--) {
        const bonus = this.game.bonusManager.bonuses.items[i] as any;
        events.push([
          'bonus:pop',
          [
            bonus.id,
            this.compressor.compress(bonus.x),
            this.compressor.compress(bonus.y),
            bonus.constructor.name,
          ],
        ]);
      }
    } else {
      this.socketGroup.addEvent('round:end', this.game.roundWinner ? this.game.roundWinner.id : null);
    }

    events.push(['game:spectators', this.countSpectators()]);
    client.addEvents(events);
  }

  countSpectators(): number {
    return this.clients.filter(function (this: SocketClient) {
      return !this.isPlaying();
    }).count();
  }

  onReady(client: SocketClient): void {
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

  checkReady(): void {
    if (this.game.isReady()) {
      if (this.waiting) {
        clearTimeout(this.waiting);
      }
      this.waiting = null;
      this.game.newRound();
    }
  }

  stopWaiting(): void {
    if (this.waiting && !this.game.isReady()) {
      clearTimeout(this.waiting);
      this.waiting = null;

      const avatars = this.game.getLoadingAvatars();
      for (let i = avatars.items.length - 1; i >= 0; i--) {
        this.detach((avatars.items[i] as any).player.client);
      }
      this.checkReady();
    }
  }

  onMove(client: SocketClient, data: any): void {
    const player = client.players.getById(data.avatar);
    if (player && player.avatar) {
      player.avatar.updateAngularVelocity(data.move);
    }
  }

  onPoint(data: any): void {
    if (data.important) {
      this.socketGroup.addEvent('point', data.avatar.id);
    }
  }

  onPosition(avatar: any): void {
    this.socketGroup.addEvent('position', [
      avatar.id,
      this.compressor.compress(avatar.x),
      this.compressor.compress(avatar.y),
    ]);
  }

  onAngle(avatar: any): void {
    this.socketGroup.addEvent('angle', [avatar.id, this.compressor.compress(avatar.angle)]);
  }

  onDie(data: any): void {
    this.socketGroup.addEvent('die', [
      data.avatar.id,
      data.killer ? data.killer.id : null,
      data.old,
    ]);
  }

  onBonusPop(bonus: any): void {
    this.socketGroup.addEvent('bonus:pop', [
      bonus.id,
      this.compressor.compress(bonus.x),
      this.compressor.compress(bonus.y),
      bonus.constructor.name,
    ]);
  }

  onBonusClear(bonus: any): void {
    this.socketGroup.addEvent('bonus:clear', bonus.id);
  }

  onScore(avatar: any): void {
    this.socketGroup.addEvent('score', [avatar.id, avatar.score]);
  }

  onRoundScore(avatar: any): void {
    this.socketGroup.addEvent('score:round', [avatar.id, avatar.roundScore]);
  }

  onProperty(data: any): void {
    this.socketGroup.addEvent('property', [data.avatar.id, data.property, data.value]);
  }

  onBonusStack(data: any): void {
    this.socketGroup.addEvent('bonus:stack', [
      data.avatar.id,
      data.method,
      data.bonus.id,
      data.bonus.constructor.name,
      data.bonus.duration,
    ]);
  }

  onGameStart(): void {
    this.socketGroup.addEvent('game:start');
  }

  onGameStop(): void {
    this.socketGroup.addEvent('game:stop');
  }

  onRoundNew(): void {
    this.socketGroup.addEvent('round:new');
  }

  onRoundEnd(data: any): void {
    this.socketGroup.addEvent('round:end', data.winner ? data.winner.id : null);
  }

  onClear(): void {
    this.socketGroup.addEvent('clear');
  }

  onBorderless(data: any): void {
    this.socketGroup.addEvent('borderless', data);
  }

  onEnd(): void {
    this.socketGroup.addEvent('end');
    this.unloadGame();
  }
}
