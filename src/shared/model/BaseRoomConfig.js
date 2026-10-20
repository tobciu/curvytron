import { EventEmitter } from '#event-emitter';

/**
 * Base room configuration
 */
export class BaseRoomConfig extends EventEmitter {
    /**
     * Password length
     *
     * @type {Number}
     */
    passwordLength = 4;

    constructor(room) {
        super();

        this.room = room;
        this.maxScore = null;
        this.open = true;
        this.password = null;

        this.variables = {
            bonusRate: 0
        };

        this.bonuses = {
            BonusSelfSmall: true,
            BonusSelfSlow: true,
            BonusSelfFast: true,
            BonusSelfMaster: true,
            BonusEnemySlow: true,
            BonusEnemyFast: true,
            BonusEnemyBig: true,
            BonusEnemyInverse: true,
            BonusEnemyStraightAngle: true,
            BonusGameBorderless: true,
            BonusAllColor: true,
            BonusGameClear: true,
            BonusSelfRandom: false,
            BonusLeaderRandom: false,
            BonusEnemyRandom: false,
            BonusLeaderFast: true,
            BonusLeaderInverse: true,
            BonusLeaderSlow: true,
            BonusSelfBorderless: true
        };
    }

    /**
     * Set max score
     *
     * @param {Number} maxScore
     */
    setMaxScore(maxScore) {
        maxScore = parseInt(maxScore, 10);

        this.maxScore = maxScore ? maxScore : null;

        return true;
    }

    /**
     * Variable exists
     *
     * @param {String} variable
     *
     * @return {Boolean}
     */
    variableExists(variable) {
        return typeof this.variables[variable] !== 'undefined';
    }

    /**
     * Set variable
     *
     * @param {String} variable
     * @param {Float} value
     */
    setVariable(variable, value) {
        if (!this.variableExists(variable)) {
            return false;
        }

        value = parseFloat(value);

        if (-1 > value || value > 1) {
            return false;
        }

        this.variables[variable] = value;

        return true;
    }

    /**
     * Get variable
     *
     * @param {String} variable
     *
     * @return {Float}
     */
    getVariable(variable) {
        if (!this.variableExists(variable)) {
            return;
        }

        return this.variables[variable];
    }

    /**
     * Bonus exists
     *
     * @param {String} bonus
     *
     * @return {Boolean}
     */
    bonusExists(bonus) {
        return typeof this.bonuses[bonus] !== 'undefined';
    }

    /**
     * Toggle bonus
     *
     * @param {String} bonus
     *
     * @return {Boolean}
     */
    toggleBonus(bonus) {
        if (!this.bonusExists(bonus)) {
            return false;
        }

        this.bonuses[bonus] = !this.bonuses[bonus];

        return true;
    }

    /**
     * Get bonus value
     *
     * @param {String} bonus
     *
     * @return {Boolean}
     */
    getBonus(bonus) {
        if (!this.bonusExists(bonus)) {
            return;
        }

        return this.bonuses[bonus];
    }

    /**
     * Set bonus value
     *
     * @param {String} bonus
     * @param {Boolean} value
     *
     * @return {Boolean}
     */
    setBonus(bonus, value) {
        if (!this.bonusExists(bonus)) {
            return;
        }

        this.bonuses[bonus] = value ? true : false;
    }

    /**
     * Get max score
     *
     * @return {Number}
     */
    getMaxScore() {
        return this.maxScore ? this.maxScore : this.getDefaultMaxScore();
    }

    /**
     * Get max score
     *
     * @param {Number} players
     *
     * @return {Number}
     */
    getDefaultMaxScore() {
        return Math.max(1, (this.room.players.count() - 1) * 10);
    }

    /**
     * Authorise joinning the room
     *
     * @param {String} password
     *
     * @return {Boolean}
     */
    allow(password) {
        return this.open || this.password === password;
    }

    /**
     * Generate password
     *
     * @return {String}
     */
    generatePassword() {
        let password = '';

        for (let i = 0; i < this.passwordLength; i++) {
            password += Math.ceil(Math.random() * 9).toString();
        }

        return password;
    }

    /**
     * Serialize
     *
     * @return {Object}
     */
    serialize() {
        return {
            maxScore: this.maxScore,
            variables: this.variables,
            bonuses: this.bonuses,
            open: this.open,
            password: this.password
        };
    }
}
