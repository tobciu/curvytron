/**
 * Random Leader Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
function BonusLeaderRandom(x, y)
{
    BonusEnemy.call(this, x, y);
}

BonusLeaderRandom.prototype = Object.create(BonusLeader.prototype);
BonusLeaderRandom.prototype.constructor = BonusLeaderRandom;

/**
 * Duration
 *
 * @type {Number}
 */
BonusLeaderRandom.prototype.duration = 7500;

/**
 * Get effects
 *
 * @param {Avatar} avatar
 *
 * @return {Array}
 */
BonusLeaderRandom.prototype.getEffects = function(avatar)
{
    return [['directionInLoop', false], ['angularVelocityBase', Math.PI / 4]];
};
