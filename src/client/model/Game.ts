import { Explode } from '../animation/Explode.ts';
import { Canvas } from '../core/Canvas.ts';
import { BaseGame } from '../../shared/model/BaseGame.ts';
import { FPSLogger } from '../service/FPSLogger.ts';
import { BonusManager } from '../manager/BonusManager.ts';
import type { Avatar } from './Avatar.ts';
import type { Room } from './Room.ts';
import type { GameStatsData } from '../../shared/model/GameStats.ts';
import type { Collection } from '../../shared/Collection.ts';

/**
 * Game
 */
export class Game extends BaseGame {
    animations: any[];
    render: any;
    gameInfos: any;
    declare room: Room;
    declare avatars: Collection<Avatar>;
    declare bonusManager: BonusManager;
    roundWinner: Avatar | null = null;
    /** Statistics of the game, as of the last round */
    stats: GameStatsData | null = null;
    // Created by `loadDOM()`
    canvas!: Canvas;
    background!: Canvas;
    effect!: Canvas;

    /**
     * Margin between player an bonus stack
     */
    stackMargin: number = 15;

    /**
     * Background color
     */
    backgroundColor: string = '#222222';

    constructor(room: Room) {
        super(room);

        this.animations = [];

        this.onResize = this.onResize.bind(this);
        this.onDie = this.onDie.bind(this);

        window.addEventListener('error', this.stop);
        window.addEventListener('resize', this.onResize);

        for (let i = this.avatars.items.length - 1; i >= 0; i--) {
            this.avatars.items[i].on('die', this.onDie);
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
        return new BonusManager(this);
    }

    /**
     * Load DOM
     */
    loadDOM() {
        this.render = document.getElementById('render');
        this.gameInfos = document.getElementById('game-infos');
        this.canvas = new Canvas(0, 0, document.getElementById('game'));
        this.background = new Canvas(0, 0, document.getElementById('background'));
        this.effect = new Canvas(0, 0, document.getElementById('effect'));

        this.bonusManager.loadDOM();
        this.onResize();
    }

    /**
     * Get new frame
     */
    override newFrame() {
        this.frame = window.requestAnimationFrame(this.loop);
    }

    /**
     * Clear frame
     */
    override clearFrame() {
        window.cancelAnimationFrame(this.frame as number);
        this.frame = null;
    }

    /**
     * On frame
     */
    override onFrame(step: number) {
        this.draw(step);
    }

    /**
     * On round new
     */
    override onRoundNew() {
        super.onRoundNew();
        this.repaint();
    }

    /**
     * On start
     */
    override onStart() {
        this.effect.clear();
        super.onStart();
    }

    /**
     * Is tie break
     */
    isTieBreak(): boolean {
        const maxScore = this.maxScore;

        return (
            this.avatars.match(function () {
                return this.score >= maxScore;
            }) !== null
        );
    }

    /**
     * Are all avatars ready?
     */
    override isReady(): boolean {
        return this.started ? true : super.isReady();
    }

    /**
     * Clear trails
     */
    clearTrails() {
        this.clearBackground();
    }

    /**
     * End
     */
    override end(): boolean {
        const ended = super.end();

        if (ended) {
            window.removeEventListener('error', this.stop);
            window.removeEventListener('resize', this.onResize);
        }

        return ended;
    }

    /**
     * Update size
     */
    override setSize() {
        super.setSize();
        this.onResize();
    }

    /**
     * Repaint
     */
    repaint() {
        this.animations.length = 0;
        this.clearBackground();
        this.effect.clear();
        this.canvas.clear();
        this.draw();
    }

    /**
     * Draw
     */
    draw(step: number = 0) {
        for (let animation, a = this.animations.length - 1; a >= 0; a--) {
            animation = this.animations[a];
            animation.draw();
            if (animation.done && animation.cleared) {
                this.animations.splice(a, 1);
            }
        }

        for (let i = this.avatars.items.length - 1; i >= 0; i--) {
            const avatar = this.avatars.items[i];
            if (avatar.present && (avatar.alive || avatar.changed)) {
                this.clearAvatar(avatar);
                this.clearBonusStack(avatar);
            }
        }

        for (let i = this.avatars.items.length - 1; i >= 0; i--) {
            const avatar = this.avatars.items[i];
            if (avatar.present && (avatar.alive || avatar.changed)) {
                if (avatar.alive) {
                    avatar.update(this.frame ? step : 0);
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

    /**
     * Draw tail
     */
    drawTail(avatar: Avatar) {
        const points = avatar.trail.getLastSegment();

        if (points) {
            this.background.drawLineScaled(points, avatar.width, avatar.color, 'round');
        }
    }

    /**
     * Draw avatar
     */
    drawAvatar(avatar: Avatar) {
        this.canvas.drawImageTo(avatar.canvas.element, avatar.startX, avatar.startY);
        avatar.clearX = avatar.startX;
        avatar.clearY = avatar.startY;
        avatar.clearWidth = avatar.canvas.element.width;
    }

    /**
     * Clear bonus from the canvas
     */
    clearAvatar(avatar: any) {
        this.canvas.clearZone(avatar.clearX, avatar.clearY, avatar.clearWidth, avatar.clearWidth);
    }

    /**
     * Clear bonus stack
     */
    clearBonusStack(avatar: Avatar) {
        if (avatar.bonusStack.lastWidth) {
            this.canvas.clearZone(
                avatar.startX + this.stackMargin,
                avatar.startY + this.stackMargin,
                avatar.bonusStack.lastWidth,
                avatar.bonusStack.lastHeight
            );
        }
    }

    /**
     * Draw bonus stack
     */
    drawBonusStack(avatar: Avatar) {
        if (avatar.hasBonus()) {
            avatar.bonusStack.lastWidth = avatar.bonusStack.canvas.element.width;
            avatar.bonusStack.lastHeight = avatar.bonusStack.canvas.element.height;

            this.canvas.drawImageTo(
                avatar.bonusStack.canvas.element,
                avatar.startX + this.stackMargin,
                avatar.startY + this.stackMargin
            );
        }
    }

    /**
     * Draw arrow
     */
    drawArrow(avatar: Avatar) {
        this.effect.drawImageScaledAngle(avatar.arrow.element, avatar.x - 5, avatar.y - 5, 10, 10, avatar.angle);
    }

    /**
     * Clear background with color
     */
    clearBackground() {
        this.background.color(this.backgroundColor);
    }

    /**
     * On die
     */
    onDie(event: any) {
        this.animations.push(new Explode(event.detail, this.effect));
    }

    /**
     * On resize
     */
    onResize() {
        const w = window,
            d = document,
            e = d.documentElement,
            g = document.body,
            x = w.innerWidth || e.clientWidth || g.clientWidth,
            y = w.innerHeight || e.clientHeight || g.clientHeight;

        const width = Math.min(x - this.gameInfos.clientWidth - 8, y - 8);
        const scale = width / this.size;
        let avatar;

        this.render.style.width = `${width + 8}px`;
        this.render.style.height = `${width + 8}px`;
        this.canvas.setDimension(width, width, scale);
        this.effect.setDimension(width, width, scale);
        this.background.setDimension(width, width, scale, true);
        this.bonusManager.setDimension(width, scale);

        for (let i = this.avatars.items.length - 1; i >= 0; i--) {
            avatar = this.avatars.items[i];

            avatar.setScale(scale);

            if (typeof avatar.input !== 'undefined') {
                avatar.input.setWidth(x);
            }
        }
    }
}
