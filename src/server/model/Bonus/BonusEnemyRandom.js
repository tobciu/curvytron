/**
 * Random Enemy Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
function BonusEnemyRandom(x, y)
{
    BonusEnemy.call(this, x, y);
}

BonusEnemyRandom.prototype = Object.create(BonusEnemy.prototype);
BonusEnemyRandom.prototype.constructor = BonusEnemyRandom;

/**
 * Duration
 *
 * @type {Number}
 */
BonusEnemyRandom.prototype.duration = 7500;

/**
 * Get effects
 *
 * @param {Avatar} avatar
 *
 * @return {Array}
 */
BonusEnemyRandom.prototype.getEffects = function(avatar)
{
    return [['directionInLoop', false], ['angularVelocityBase', Math.PI / 4]];
};
