/**
 * Inverse Leader Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
function BonusLeaderInverse(x, y)
{
    BonusEnemy.call(this, x, y);
}

BonusLeaderInverse.prototype = Object.create(BonusLeader.prototype);
BonusLeaderInverse.prototype.constructor = BonusLeaderInverse;

/**
 * Probability
 *
 * @type {Number}
 */
BonusLeaderInverse.prototype.probability = 0.8;

/**
 * Get effects
 *
 * @param {Avatar} avatar
 *
 * @return {Array}
 */
BonusLeaderInverse.prototype.getEffects = function(avatar)
{
    return [['inverse', 1]];
};

/**
 * Get probability
 *
 * @param {Game} game
 *
 * @return {Number}
 */
BonusLeaderInverse.prototype.getProbability = function (game)
{
    return BonusLeader.prototype.probability * BonusLeaderInverse.prototype.probability;
};
