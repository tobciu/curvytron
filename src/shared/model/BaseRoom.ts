import { EventEmitter } from 'eventemitter3';
import { Collection } from '../Collection.ts';
import { BaseRoomConfig } from './BaseRoomConfig.ts';
import { BaseGame } from './BaseGame.ts';
import type { BasePlayer } from './BasePlayer.ts';

/**
 * A lobby: its players, its config, and (once launched) its game.
 * The client/server Room subclasses override the injected config/game classes.
 */
export class BaseRoom extends EventEmitter {
  static readonly minPlayer = 1;
  static readonly maxLength = 25;
  static readonly launchTime = 5000;

  static RoomConfigClass: new (room: any) => BaseRoomConfig = BaseRoomConfig;
  static GameClass: new (room: any) => BaseGame = BaseGame;

  name: string;
  players = new Collection<BasePlayer>([], 'id', true);
  config: BaseRoomConfig;
  game?: BaseGame;

  constructor(name: string) {
    super();

    this.name = name;
    this.config = new (this.constructor as typeof BaseRoom).RoomConfigClass(this);
    this.closeGame = this.closeGame.bind(this);
  }

  addPlayer(player: BasePlayer): boolean {
    return this.players.add(player);
  }

  equal(room: BaseRoom | null | undefined): boolean {
    return room ? this.name === room.name : false;
  }

  isNameAvailable(name: string): boolean {
    return !this.players.match(function (this: BasePlayer) {
      return this.name === name;
    });
  }

  removePlayer(player: BasePlayer): boolean {
    return this.players.remove(player);
  }

  isReady(): boolean {
    return (
      !this.game &&
      this.players.count() >= BaseRoom.minPlayer &&
      this.players
        .filter(function (this: BasePlayer) {
          return !this.ready;
        })
        .isEmpty()
    );
  }

  newGame(): BaseGame | null {
    if (!this.game) {
      this.game = new (this.constructor as typeof BaseRoom).GameClass(this);
      this.game.on('end', this.closeGame);
      this.emit('game:new', { room: this, game: this.game });

      return this.game;
    }

    return null;
  }

  closeGame(): void {
    if (this.game) {
      this.game = undefined;
      this.emit('game:end', { room: this });

      this.players = this.players.filter(function (this: BasePlayer) {
        return this.client;
      });

      for (let i = this.players.items.length - 1; i >= 0; i--) {
        this.players.items[i]!.reset();
      }
    }
  }

  serialize(full?: boolean): {
    name: string;
    players: unknown[] | number;
    game: boolean;
    open: boolean;
    config?: ReturnType<BaseRoomConfig['serialize']>;
  } {
    const isFull = typeof full === 'undefined' || full;

    const data: {
      name: string;
      players: unknown[] | number;
      game: boolean;
      open: boolean;
      config?: ReturnType<BaseRoomConfig['serialize']>;
    } = {
      name: this.name,
      players: isFull
        ? this.players
            .map(function (this: BasePlayer) {
              return this.serialize();
            })
            .items
        : this.players.count(),
      game: this.game ? true : false,
      open: this.config.open,
    };

    if (isFull) {
      data.config = this.config.serialize();
    }

    return data;
  }
}
