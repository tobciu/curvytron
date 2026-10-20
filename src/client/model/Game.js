import { Explode } from '../animation/Explode.js';
import { Canvas } from '../core/Canvas.js';
import { BaseGame } from '../../shared/model/BaseGame.js';
import { FPSLogger } from '../service/FPSLogger.js';
import { BonusManager } from '../manager/BonusManager.js';

/**
 * Game
 *
 * @param {Room} room
 */
export class Game extends BaseGame {
    constructor(room) {
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
     *
     * @return {FPSLogger}
     */
    createFPSLogger() {
        return new FPSLogger();
    }

    /**
     * Create the bonus manager
     *
     * @return {BonusManager}
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
    newFrame() {
        this.frame = window.requestAnimationFrame(this.loop);
    }

    /**
     * Clear frame
     */
    clearFrame() {
        window.cancelAnimationFrame(this.frame);
        this.frame = null;
    }

    /**
     * On frame
     *
     * @param {Number} step
     */
    onFrame(step) {
        this.draw(step);
    }

    /**
     * On round new
     */
    onRoundNew() {
        super.onRoundNew();
        this.repaint();
    }

    /**
     * On start
     */
    onStart() {
        this.effect.clear();
        super.onStart();
    }

    /**
     * Is tie break
     *
     * @return {Boolean}
     */
    isTieBreak() {
        const maxScore = this.maxScore;

        return (
            this.avatars.match(function () {
                return this.score >= maxScore;
            }) !== null
        );
    }

    /**
     * Are all avatars ready?
     *
     * @return {Boolean}
     */
    isReady() {
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
    end() {
        if (super.end()) {
            window.removeEventListener('error', this.stop);
            window.removeEventListener('resize', this.onResize);
        }
    }

    /**
     * Update size
     */
    setSize() {
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
     *
     * @param {Number} step
     */
    draw(step) {
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
     *
     * @param {Avatar} avatar
     */
    drawTail(avatar) {
        const points = avatar.trail.getLastSegment();

        if (points) {
            this.background.drawLineScaled(points, avatar.width, avatar.color, 'round');
        }
    }

    /**
     * Draw avatar
     *
     * @param {Avatar} avatar
     */
    drawAvatar(avatar) {
        this.canvas.drawImageTo(avatar.canvas.element, avatar.startX, avatar.startY);
        avatar.clearX = avatar.startX;
        avatar.clearY = avatar.startY;
        avatar.clearWidth = avatar.canvas.element.width;
    }

    /**
     * Clear bonus from the canvas
     *
     * @param {Bonus} bonus
     */
    clearAvatar(avatar) {
        this.canvas.clearZone(avatar.clearX, avatar.clearY, avatar.clearWidth, avatar.clearWidth);
    }

    /**
     * Clear bonus stack
     *
     * @param {Avatar} avatar
     */
    clearBonusStack(avatar) {
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
     *
     * @param {Avatar} avatar
     */
    drawBonusStack(avatar) {
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
     *
     * @param {Avatar} avatar
     */
    drawArrow(avatar) {
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
     *
     * @param {Event} event
     */
    onDie(event) {
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

/**
 * Margin between player an bonus stack
 *
 * @type {Number}
 */
Game.prototype.stackMargin = 15;

/**
 * Background color
 *
 * @type {String}
 */
Game.prototype.backgroundColor = '#222222';
