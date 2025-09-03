import BaseGame from '../../shared/model/BaseGame.js';
import Canvas from '../core/Canvas.js';
import Explode from '../animation/Explode.js';
import BonusManager from '../manager/BonusManager.js';

/**
 * Game
 */
export default class Game extends BaseGame {
    constructor(room) {
        super(room);

        // Game properties:
        this.animations = [];
        this.backgroundColor = '#222222';
        this.stackMargin = 15;

        this.onResize = this.onResize.bind(this);
        this.onDie = this.onDie.bind(this);

        window.addEventListener('error', this.stop);
        window.addEventListener('resize', this.onResize);

        for (let i = this.avatars.items.length - 1; i >= 0; i--) {
            this.avatars.items[i].on('die', this.onDie);
        }
    }

    loadDOM(elements) {
        this.render = elements.render;
        this.gameInfos = elements.infos;
        this.canvas = new Canvas(0, 0, elements.game);
        this.background = new Canvas(0, 0, elements.background);
        this.effect = new Canvas(0, 0, elements.effect);

        this.bonusManager.loadDOM(elements.bonus);
        this.onResize();
    }


    onFrame(step) {
        for (let i = this.avatars.items.length - 1; i >= 0; i--) {
            const avatar = this.avatars.items[i];
            if (avatar.alive) {
                avatar.update(step);
                this.checkCollision(avatar);
            }
        }

        this.bonusManager.update(step);
        this.draw(step);
    }

    /**
     * Check avatar collision
     *
     * @param {Avatar} avatar
     */
    checkCollision(avatar) {
        // Wall collision
        if (!this.borderless) {
            if (avatar.x - avatar.radius < 0 || avatar.x + avatar.radius > this.size ||
                avatar.y - avatar.radius < 0 || avatar.y + avatar.radius > this.size) {
                avatar.die();
                return;
            }
        }

        // Other players collision
        for (let i = this.avatars.items.length - 1; i >= 0; i--) {
            const other = this.avatars.items[i];
            if (other.alive && avatar.trail.isCollision(other.trail)) {
                 avatar.die();
                 return;
            }
        }

        // Self collision
        if (avatar.trail.isSelfCollision()) {
            avatar.die();
            return;
        }

        // Bonus collision
        for (let i = this.bonusManager.bonuses.items.length - 1; i >= 0; i--) {
            const bonus = this.bonusManager.bonuses.items[i];
            if (bonus.active && avatar.isColliding(bonus)) {
                this.bonusManager.add(bonus.constructor, avatar);
            }
        }
    }

    onRoundNew() {
        this.repaint();
    }

    onStart() {
        this.effect.clear();
    }

    end() {
        this.stop();
        window.removeEventListener('error', this.stop);
        window.removeEventListener('resize', this.onResize);
    }

    setSize(size) {
        this.size = size;
        this.onResize();
    }

    setBorderless(borderless) {
        this.borderless = borderless;
    }

    getLeader() {
        let leader = null;
        for (let i = this.avatars.items.length - 1; i >= 0; i--) {
            const avatar = this.avatars.items[i];
            if (avatar.alive && (!leader || avatar.score > leader.score)) {
                leader = avatar;
            }
        }
        return leader;
    }

    getRandomEnemy(avatar) {
        const enemies = this.avatars.items.filter(a => a !== avatar && a.alive);
        if (enemies.length > 0) {
            return enemies[Math.floor(Math.random() * enemies.length)];
        }
        return null;
    }

    repaint() {
        this.animations.length = 0;
        this.clearBackground();
        this.effect.clear();
        this.canvas.clear();
        this.draw();
    }

    draw(step) {
        this.animations.forEach(animation => {
            animation.draw();
            // simplified cleanup
        });

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
                this.drawTail(avatar);
                this.drawAvatar(avatar);
                this.drawBonusStack(avatar);
            }
        }

        this.bonusManager.draw();
    }

    drawTail(avatar) {
        const points = avatar.trail.getLastSegment();
        if (points) {
            this.background.drawLineScaled(points, avatar.width, avatar.color, 'round');
        }
    }

    drawAvatar(avatar) {
        this.canvas.drawImageTo(avatar.canvas.element, avatar.startX, avatar.startY);
        avatar.clearX = avatar.startX;
        avatar.clearY = avatar.startY;
        avatar.clearWidth = avatar.canvas.element.width;
    }

    clearAvatar(avatar) {
        this.canvas.clearZone(avatar.clearX, avatar.clearY, avatar.clearWidth, avatar.clearWidth);
    }

    clearBackground() {
        this.background.color(this.backgroundColor);
    }

    clearTrails() {
        for (let i = this.avatars.items.length - 1; i >= 0; i--) {
            this.avatars.items[i].trail.clear();
        }
        this.clearBackground();
    }

    onDie(event) {
        this.animations.push(new Explode(event.detail, this.effect));
    }

    drawBonusStack(avatar) {
        const bonuses = avatar.bonusStack.bonuses.items;
        const width = avatar.canvas.element.width;
        const margin = this.stackMargin * avatar.canvas.scale;
        let x = avatar.startX + width + margin;
        let y = avatar.startY;

        for (let i = 0; i < bonuses.length; i++) {
            const bonus = bonuses[i];
            this.canvas.drawImageTo(bonus.asset, x, y, width, width);
            x += width + margin;
        }
    }

    clearBonusStack(avatar) {
        const bonuses = avatar.bonusStack.bonuses.items;
        if (bonuses.length > 0) {
            const width = avatar.canvas.element.width;
            const margin = this.stackMargin * avatar.canvas.scale;
            const x = avatar.startX + width + margin;
            const y = avatar.startY;
            const zoneWidth = (width + margin) * bonuses.length;
            this.canvas.clearZone(x, y, zoneWidth, width);
        }
    }

    onResize() {
        const w = window,
            d = document,
            e = d.documentElement,
            g = document.body,
            x = w.innerWidth || e.clientWidth || g.clientWidth,
            y = w.innerHeight || e.clientHeight || g.clientHeight;

        const width = Math.min(x - this.gameInfos.clientWidth - 8, y - 8);
        const scale = width / this.size;

        this.render.style.width = (width + 8) + 'px';
        this.render.style.height = (width + 8) + 'px';
        this.canvas.setDimension(width, width, scale);
        this.effect.setDimension(width, width, scale);
        this.background.setDimension(width, width, scale, true);
        this.bonusManager.setDimension(width, scale);

        for (let i = this.avatars.items.length - 1; i >= 0; i--) {
            const avatar = this.avatars.items[i];
            avatar.setScale(scale);
            if (avatar.input) {
                avatar.input.setWidth(x);
            }
        }
    }
}
