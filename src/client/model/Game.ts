import { BaseGame, type GameRoom } from '@shared/model/BaseGame.ts';
import type { Collection } from '@shared/Collection.ts';
import { Canvas } from '../core/Canvas.ts';
import { BonusManager } from '../manager/BonusManager.ts';
import { Explode } from '../animation/Explode.ts';
import type { Avatar } from './Avatar.ts';

export interface GameCanvases {
  background: HTMLCanvasElement;
  bonus: HTMLCanvasElement;
  game: HTMLCanvasElement;
  effect: HTMLCanvasElement;
}

/**
 * Client-side game: an rAF render loop over the server-authoritative state.
 * Draws to four stacked `<canvas>` layers — trails (background), map bonuses,
 * avatar heads (front), death particles (effect) — kept out of Svelte's cycle.
 */
export class Game extends BaseGame {
  static override readonly FpsLoggerClass = BaseGame.FpsLoggerClass;
  static override readonly BonusManagerClass = BonusManager;

  /** Margin between an avatar head and its bonus stack strip. */
  static readonly stackMargin = 15;
  static readonly backgroundColor = '#222222';

  declare avatars: Collection<Avatar>;
  declare bonusManager: BonusManager;

  animations: Explode[] = [];
  roundWinner: Avatar | null = null;

  canvas: Canvas | null = null;
  background: Canvas | null = null;
  effect: Canvas | null = null;
  width = 0;

  constructor(room: GameRoom) {
    super(room);
    this.onDie = this.onDie.bind(this);
    this.draw = this.draw.bind(this);

    for (let i = this.avatars.items.length - 1; i >= 0; i--) {
      this.avatars.items[i]!.on('die', this.onDie);
    }
  }

  /** Bind the four canvas layers and the bonus layer. */
  attachCanvases(els: GameCanvases): void {
    this.canvas = new Canvas(0, 0, els.game);
    this.background = new Canvas(0, 0, els.background);
    this.effect = new Canvas(0, 0, els.effect);
    this.bonusManager.attachCanvas(els.bonus);
  }

  /** Resize every layer to a square of `width` px (scale = width / arena size). */
  setDimensions(width: number): void {
    if (!this.canvas || !this.background || !this.effect) {
      return;
    }

    this.width = width;
    const scale = width / this.size;

    this.canvas.setDimension(width, width, scale);
    this.effect.setDimension(width, width, scale);
    this.background.setDimension(width, width, scale, true);
    this.bonusManager.setDimension(width, scale);

    for (let i = this.avatars.items.length - 1; i >= 0; i--) {
      const avatar = this.avatars.items[i]!;
      avatar.setScale(scale);
      avatar.input?.setWidth(window.innerWidth);
    }

    this.clearBackground();
    this.draw();
  }

  override newFrame(): void {
    this.frame = window.requestAnimationFrame(this.loop) as unknown as ReturnType<
      typeof setTimeout
    >;
  }

  override clearFrame(): void {
    if (this.frame) {
      window.cancelAnimationFrame(this.frame as unknown as number);
    }
    this.frame = null;
  }

  override onFrame(step: number): void {
    this.draw(step);
  }

  override onRoundNew(): void {
    super.onRoundNew();
    this.repaint();
  }

  override onStart(): void {
    this.effect?.clear();
    super.onStart();
  }

  isTieBreak(): boolean {
    const maxScore = this.maxScore;
    return this.avatars.match(function (this: Avatar) {
      return this.score >= maxScore;
    }) !== null;
  }

  override isReady(): boolean {
    return this.started ? true : super.isReady();
  }

  clearTrails(): void {
    this.clearBackground();
  }

  override end(): boolean {
    return super.end();
  }

  override setSize(): void {
    super.setSize();
    if (this.width) {
      this.setDimensions(this.width);
    }
  }

  repaint(): void {
    this.animations.length = 0;
    this.clearBackground();
    this.effect?.clear();
    this.canvas?.clear();
    this.draw();
  }

  draw(step?: number): void {
    if (!this.canvas || !this.background || !this.effect) {
      return;
    }

    for (let a = this.animations.length - 1; a >= 0; a--) {
      const animation = this.animations[a]!;
      animation.draw();
      if (animation.done && animation.cleared) {
        this.animations.splice(a, 1);
      }
    }

    for (let i = this.avatars.items.length - 1; i >= 0; i--) {
      const avatar = this.avatars.items[i]!;
      if (avatar.present && (avatar.alive || avatar.changed)) {
        this.clearAvatar(avatar);
        this.clearBonusStack(avatar);
      }
    }

    for (let i = this.avatars.items.length - 1; i >= 0; i--) {
      const avatar = this.avatars.items[i]!;
      if (avatar.present && (avatar.alive || avatar.changed)) {
        if (avatar.alive) {
          avatar.update(this.frame ? (step ?? 0) : 0);
        }

        this.drawTail(avatar);
        this.drawAvatar(avatar);
        this.drawBonusStack(avatar);

        if (!this.frame && avatar.local) {
          this.drawArrow(avatar);
        }
      }
    }

    this.bonusManager.draw();
  }

  drawTail(avatar: Avatar): void {
    const points = avatar.trail.getLastSegment();
    if (points) {
      this.background!.drawLineScaled(points, avatar.width, avatar.color, 'round');
    }
  }

  drawAvatar(avatar: Avatar): void {
    this.canvas!.drawImageTo(avatar.canvas.element, avatar.startX, avatar.startY);
    avatar.clearX = avatar.startX;
    avatar.clearY = avatar.startY;
    avatar.clearWidth = avatar.canvas.element.width;
  }

  clearAvatar(avatar: Avatar): void {
    this.canvas!.clearZone(avatar.clearX, avatar.clearY, avatar.clearWidth, avatar.clearWidth);
  }

  clearBonusStack(avatar: Avatar): void {
    if (avatar.bonusStack.lastWidth) {
      this.canvas!.clearZone(
        avatar.startX + Game.stackMargin,
        avatar.startY + Game.stackMargin,
        avatar.bonusStack.lastWidth,
        avatar.bonusStack.lastHeight,
      );
    }
  }

  drawBonusStack(avatar: Avatar): void {
    if (avatar.hasBonus()) {
      avatar.bonusStack.lastWidth = avatar.bonusStack.canvas.element.width;
      avatar.bonusStack.lastHeight = avatar.bonusStack.canvas.element.height;

      this.canvas!.drawImageTo(
        avatar.bonusStack.canvas.element,
        avatar.startX + Game.stackMargin,
        avatar.startY + Game.stackMargin,
      );
    }
  }

  drawArrow(avatar: Avatar): void {
    this.effect!.drawImageScaledAngle(
      avatar.arrow.element,
      avatar.x - 5,
      avatar.y - 5,
      10,
      10,
      avatar.angle,
    );
  }

  clearBackground(): void {
    this.background?.color(Game.backgroundColor);
  }

  onDie(avatar: Avatar): void {
    if (this.effect) {
      this.animations.push(new Explode(avatar, this.effect));
    }
  }
}
