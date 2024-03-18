/**
 * Leader Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
function BonusLeader(x, y)
{
    Bonus.call(this, x, y);

    this.off = this.off.bind(this);
}

BonusLeader.prototype = Object.create(Bonus.prototype);
BonusLeader.prototype.constructor = BonusLeader;

/**
 * Affect leader
 *
 * @type {String}
 */
BonusLeader.prototype.affect = 'leader';

/**
 * Get target
 *
 * @param {Avatar} avatar
 * @param {Game} game
 *
 * @return {Object}
 */
BonusLeader.prototype.getTarget = function(avatar, game)
{
    var sortAvatars = game.sortAvatars(game.avatars.filter(function () {
        return this.alive && !this.equal(avatar);
    }));
    var leader = sortAvatars.getFirst();
    if (leader !== null) {
        return sortAvatars.filter(function () {
            return this.score === leader.score;
        }).items;
    }
    return [];
};

/**
 * Apply on
 */
BonusLeader.prototype.on = function()
{
    for (var i = this.target.length - 1; i >= 0; i--) {
        this.target[i].bonusStack.add(this);
    }
};

/**
 * Apply on
 */
BonusLeader.prototype.off = function()
{
    for (var i = this.target.length - 1; i >= 0; i--) {
        this.target[i].bonusStack.remove(this);
    }
};

/**
 * Probability
 *
 * @type {Number}
 */
BonusLeader.prototype.probability = 0.5;

/**
 * Get probability
 *
 * @param {Game} game
 *
 * @return {Number}
 */
BonusLeader.prototype.getProbability = function (game)
{
    var leader = game.sortAvatars(game.avatars.filter(function () {
        return this.alive;
    })).getFirst();
    if (leader === null) {
        return 0;
    } else if (leader.score === 0) {
        return 0;
    }
    return BonusLeader.prototype.probability;
};