import { EventEmitter } from 'eventemitter3';
import { Collection } from '../Collection.ts';
import { BaseFPSLogger } from '../service/BaseFPSLogger.ts';
import { BaseBonusManager } from '../manager/BaseBonusManager.ts';
import type { BaseAvatar } from './BaseAvatar.ts';

export interface GameRoom {
  name: string;
  players: Collection<{ getAvatar(): BaseAvatar }>;
  config: {
    getMaxScore(): number;
    getBonuses(): unknown[];
    getVariable(name: string): number | undefined;
  };
}

/**
 * One running game: the fixed-timestep loop, round lifecycle and map sizing.
 * `update(step)` (the authoritative simulation) is implemented by the server
 * subclass; the client subclass runs its own render loop over the same base.
 */
export class BaseGame extends EventEmitter {
  /** Loop frame time (ms). */
  static readonly framerate = (1 / 60) * 1000;
  static readonly perPlayerSize = 80;
  static readonly warmupTime = 3000;
  static readonly warmdownTime = 5000;
  static readonly spawnMargin = 0.05;
  static readonly spawnAngleMargin = 0.3;
  static readonly borderlessDefault = false;

  /** Concrete FPS logger / bonus manager — overridden by the client/server Game. */
  static FpsLoggerClass: new () => BaseFPSLogger = BaseFPSLogger;
  static BonusManagerClass: new (game: any, bonuses: unknown[], rate: number) => BaseBonusManager =
    BaseBonusManager;

  room: GameRoom;
  name: string;
  frame: ReturnType<typeof setTimeout> | null = null;
  avatars: Collection<BaseAvatar>;
  size: number;
  rendered: number | null = null;
  maxScore: number;
  fps: BaseFPSLogger;
  started = false;
  bonusManager: BaseBonusManager;
  inRound = false;
  borderless = BaseGame.borderlessDefault;

  constructor(room: GameRoom) {
    super();

    this.room = room;
    this.name = room.name;
    this.avatars = room.players.map(function (this: { getAvatar(): BaseAvatar }) {
      return this.getAvatar();
    });
    this.size = this.getSize(this.avatars.count());
    this.maxScore = room.config.getMaxScore();
    const ctor = this.constructor as typeof BaseGame;
    this.fps = new ctor.FpsLoggerClass();
    this.bonusManager = new ctor.BonusManagerClass(
      this,
      room.config.getBonuses(),
      room.config.getVariable('bonusRate') ?? 0,
    );

    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);
    this.loop = this.loop.bind(this);
    this.newRound = this.newRound.bind(this);
    this.endRound = this.endRound.bind(this);
    this.end = this.end.bind(this);
    this.onFrame = this.onFrame.bind(this);
  }

  update(_step: number): void {}

  removeAvatar(avatar: BaseAvatar): void {
    if (this.avatars.exists(avatar)) {
      avatar.die();
      avatar.destroy();
    }
  }

  start(): void {
    if (!this.frame) {
      this.onStart();
      this.loop();
    }
  }

  stop(): void {
    if (this.frame) {
      this.clearFrame();
      this.onStop();
    }
  }

  loop(): void {
    this.newFrame();

    const now = new Date().getTime();
    const step = now - (this.rendered as number);

    this.rendered = now;

    this.onFrame(step);
    this.fps.onFrame();
  }

  onStart(): void {
    this.rendered = new Date().getTime();
    this.bonusManager.start();
    this.fps.start();
  }

  onStop(): void {
    this.rendered = null;
    this.bonusManager.stop();
    this.fps.stop();

    const size = this.getSize(this.getPresentAvatars().count());

    if (this.size !== size) {
      this.setSize();
    }
  }

  onRoundNew(): void {
    this.borderless = BaseGame.borderlessDefault;

    this.bonusManager.clear();

    for (let i = this.avatars.items.length - 1; i >= 0; i--) {
      if (this.avatars.items[i]!.present) {
        this.avatars.items[i]!.clear();
      }
    }
  }

  onRoundEnd(): void {}

  newFrame(): void {
    this.frame = setTimeout(this.loop, BaseGame.framerate);
  }

  clearFrame(): void {
    if (this.frame) {
      clearTimeout(this.frame);
    }
    this.frame = null;
  }

  onFrame(step: number): void {
    this.update(step);
  }

  setSize(): void {
    this.size = this.getSize(this.getPresentAvatars().count());
  }

  getSize(players: number): number {
    const square = BaseGame.perPlayerSize * BaseGame.perPlayerSize;
    const size = Math.sqrt(square + ((players - 1) * square) / 5);

    return Math.round(size);
  }

  isReady(): boolean {
    return this.getLoadingAvatars().isEmpty();
  }

  getLoadingAvatars(): Collection<BaseAvatar> {
    return this.avatars.filter(function (this: BaseAvatar) {
      return this.present && !this.ready;
    });
  }

  getAliveAvatars(): Collection<BaseAvatar> {
    return this.avatars.filter(function (this: BaseAvatar) {
      return this.alive;
    });
  }

  getPresentAvatars(): Collection<BaseAvatar> {
    return this.avatars.filter(function (this: BaseAvatar) {
      return this.present;
    });
  }

  sortAvatars(avatars?: Collection<BaseAvatar>): Collection<BaseAvatar> {
    const target = typeof avatars !== 'undefined' ? avatars : this.avatars;

    target.sort((a, b) => (a.score > b.score ? -1 : a.score < b.score ? 1 : 0));

    return target;
  }

  setBorderless(borderless: boolean): void {
    this.borderless = borderless ? true : false;
  }

  serialize(): { name: string; players: unknown[]; maxScore: number } {
    return {
      name: this.name,
      players: this.avatars
        .map(function (this: BaseAvatar) {
          return this.serialize();
        })
        .items,
      maxScore: this.maxScore,
    };
  }

  newRound(time?: number): void {
    this.started = true;

    if (!this.inRound) {
      this.inRound = true;
      this.onRoundNew();
      setTimeout(this.start, typeof time !== 'undefined' ? time : BaseGame.warmupTime);
    }
  }

  endRound(): void {
    if (this.inRound) {
      this.inRound = false;
      this.onRoundEnd();
      setTimeout(this.stop, BaseGame.warmdownTime);
    }
  }

  end(): boolean {
    if (this.started) {
      this.started = false;
      this.stop();
      this.emit('end', { game: this });

      return true;
    }

    return false;
  }
}
