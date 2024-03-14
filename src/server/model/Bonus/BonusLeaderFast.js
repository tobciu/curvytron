/**
 * Fast Leader Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
function BonusLeaderFast(x, y)
{
    BonusEnemy.call(this, x, y);
}

BonusLeaderFast.prototype = Object.create(BonusLeader.prototype);
BonusLeaderFast.prototype.constructor = BonusLeaderFast;

/**
 * Duration
 *
 * @type {Number}
 */
BonusLeaderFast.prototype.duration = 6000;

/**
 * Get effects
 *
 * @param {Avatar} avatar
 *
 * @return {Array}
 */
BonusLeaderFast.prototype.getEffects = function(avatar)
{
    return [['velocity', 0.75 * BaseAvatar.prototype.velocity]];
};
