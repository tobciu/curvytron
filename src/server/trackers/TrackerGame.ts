import { Tracker, type TrackerValues } from './Tracker.ts';
import type { Game } from '../model/Game.ts';

/** Tracks one game: round count, whether it finished, and periodic FPS samples. */
export class TrackerGame extends Tracker {
  static readonly fpsFrequency = 1000;

  game: Game;
  size: number;
  rounds = 0;
  finished = false;
  private fpsInterval: ReturnType<typeof setInterval> | null = null;

  constructor(game: Game) {
    super(game.name);
    this.game = game;
    this.size = game.avatars.count();

    this.onRound = this.onRound.bind(this);
    this.onStart = this.onStart.bind(this);
    this.onStop = this.onStop.bind(this);
    this.onEnd = this.onEnd.bind(this);
    this.sendFPS = this.sendFPS.bind(this);

    this.game.on('round:new', this.onRound);
    this.game.on('game:start', this.onStart);
    this.game.on('game:stop', this.onStop);
    this.game.on('end', this.onEnd);
  }

  onRound(): void {
    this.rounds++;
  }

  onEnd(): void {
    this.finished = this.game.gameWinner !== null;
  }

  onStart(): void {
    this.fpsInterval ??= setInterval(this.sendFPS, TrackerGame.fpsFrequency);
  }

  onStop(): void {
    if (this.fpsInterval) {
      clearInterval(this.fpsInterval);
      this.fpsInterval = null;
    }
  }

  sendFPS(): void {
    if (this.game.fps.frequency) {
      this.emit('fps', { tracker: this, fps: this.game.fps.frequency });
    }
  }

  override destroy(): this {
    this.onStop();
    this.game.removeListener('end', this.onEnd);
    this.game.removeListener('round:new', this.onRound);
    return super.destroy();
  }

  override getValues(): TrackerValues {
    return { ...super.getValues(), size: this.size, rounds: this.rounds, finished: this.finished };
  }
}
