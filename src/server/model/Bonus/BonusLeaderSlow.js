/**
 * Slow Leader Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
function BonusLeaderSlow(x, y)
{
    BonusEnemy.call(this, x, y);
}

BonusLeaderSlow.prototype = Object.create(BonusLeader.prototype);
BonusLeaderSlow.prototype.constructor = BonusLeaderSlow;

/**
 * Get effects
 *
 * @param {Avatar} avatar
 *
 * @return {Array}
 */
BonusLeaderSlow.prototype.getEffects = function(avatar)
{
    return [['velocity', -BaseAvatar.prototype.velocity/2]];
};
