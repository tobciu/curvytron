import BaseBonusManager from '../../shared/manager/BaseBonusManager.js';
import Collection from '../../shared/Collection.js';
import Canvas from '../core/Canvas.js';
import SpriteAsset from '../lib/SpriteAsset.js';
import BonusSelfFast from '../model/bonus/BonusSelfFast.js';
import BonusEnemyFast from '../model/bonus/BonusEnemyFast.js';
import BonusSelfSlow from '../model/bonus/BonusSelfSlow.js';
import BonusEnemySlow from '../model/bonus/BonusEnemySlow.js';
import BonusGameBorderless from '../model/bonus/BonusGameBorderless.js';
import BonusSelfMaster from '../model/bonus/BonusSelfMaster.js';
import BonusEnemyBig from '../model/bonus/BonusEnemyBig.js';
import BonusAllColor from '../model/bonus/BonusAllColor.js';
import BonusEnemyInverse from '../model/bonus/BonusEnemyInverse.js';
import BonusSelfSmall from '../model/bonus/BonusSelfSmall.js';
import BonusGameClear from '../model/bonus/BonusGameClear.js';
import BonusEnemyStraightAngle from '../model/bonus/BonusEnemyStraightAngle.js';
import BonusSelfRandom from '../model/bonus/BonusSelfRandom.js';
import BonusLeaderRandom from '../model/bonus/BonusLeaderRandom.js';
import BonusEnemyRandom from '../model/bonus/BonusEnemyRandom.js';
import BonusLeaderFast from '../model/bonus/BonusLeaderFast.js';
import BonusLeaderInverse from '../model/bonus/BonusLeaderInverse.js';
import BonusLeaderSlow from '../model/bonus/BonusLeaderSlow.js';
import BonusSelfBorderless from '../model/bonus/BonusSelfBorderless.js';

/**
 * Bonus Manager
 */
export default class BonusManager extends BaseBonusManager {
    constructor(game) {
        super(game);

        this.bonuses.index = false;
        this.onLoad = this.onLoad.bind(this);
        this.loaded = false;
        this.assets = {};
        this.spritePosition = [
            'BonusSelfFast', 'BonusEnemyFast', 'BonusSelfSlow', 'BonusEnemySlow',
            'BonusGameBorderless', 'BonusSelfMaster', 'BonusEnemyBig', 'BonusAllColor',
            'BonusEnemyInverse', 'BonusSelfSmall', 'BonusGameClear', 'BonusEnemyStraightAngle',
            'BonusSelfRandom', 'BonusLeaderRandom', 'BonusEnemyRandom', 'BonusLeaderFast',
            'BonusLeaderInverse', 'BonusLeaderSlow', 'BonusSelfBorderless'
        ];

        this.sprite = new SpriteAsset('/images/bonus.png', 3, 7, this.onLoad, true);

        this.bonusTypes = {
            BonusSelfFast,
            BonusEnemyFast,
            BonusSelfSlow,
            BonusEnemySlow,
            BonusGameBorderless,
            BonusSelfMaster,
            BonusEnemyBig,
            BonusAllColor,
            BonusEnemyInverse,
            BonusSelfSmall,
            BonusGameClear,
            BonusEnemyStraightAngle,
            BonusSelfRandom,
            BonusLeaderRandom,
            BonusEnemyRandom,
            BonusLeaderFast,
            BonusLeaderInverse,
            BonusLeaderSlow,
            BonusSelfBorderless,
        };
    }

    loadDOM(element) {
        this.canvas = new Canvas(0, 0, element);
    }

    onLoad() {
        const images = this.sprite.getImages();
        for (let i = this.spritePosition.length - 1; i >= 0; i--) {
            this.assets[this.spritePosition[i]] = images[i];
        }
        this.loaded = true;
        this.emit('load');
    }

    add(bonus, avatar) {
        if (typeof(bonus) === 'string') {
            const BonusClass = this.bonusTypes[bonus];
            if (BonusClass) {
                const asset = this.assets[bonus];
                if (asset) {
                    bonus = new BonusClass(null, 0, 0, asset);
                }
            }
        }

        if (bonus) {
            bonus.applyTo(avatar, this.game);
        }
    }

    update(step) {
        for (let i = this.bonuses.items.length - 1; i >= 0; i--) {
            const bonus = this.bonuses.items[i];
            if (bonus.isExpired()) {
                this.remove(bonus);
            }
        }
    }

    remove(bonus) {
        this.clearBonus(bonus);
        super.remove(bonus);
    }

    clear() {
        if (this.canvas) {
            this.canvas.clear();
        }
        super.clear();
    }

    draw() {
        for (let i = this.bonuses.items.length - 1; i >= 0; i--) {
            const bonus = this.bonuses.items[i];
            if (!bonus.animation.done && bonus.drawWidth) {
                this.clearBonus(bonus);
            }
        }
        for (let i = this.bonuses.items.length - 1; i >= 0; i--) {
            const bonus = this.bonuses.items[i];
            if (!bonus.animation.done) {
                bonus.update();
                this.drawBonus(bonus);
            }
        }
    }

    drawBonus(bonus) {
        if (this.canvas) {
            this.canvas.drawImageScaled(bonus.asset, bonus.drawX, bonus.drawY, bonus.drawWidth, bonus.drawWidth);
        }
    }

    clearBonus(bonus) {
        if (this.canvas) {
            this.canvas.clearZoneScaled(bonus.drawX, bonus.drawY, bonus.drawWidth, bonus.drawWidth);
        }
    }

    setDimension(width, scale) {
        if (this.canvas) {
            this.canvas.setDimension(width, width, scale);
            this.draw();
        }
    }

    getRandomBonus() {
        const bonusNames = Object.keys(this.bonusTypes);
        const randomBonusName = bonusNames[Math.floor(Math.random() * bonusNames.length)];
        const BonusClass = this.bonusTypes[randomBonusName];
        const asset = this.assets[randomBonusName];
        return new BonusClass(null, 0, 0, asset);
    }
}
