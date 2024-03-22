/**
 * Ghost Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
function BonusSelfBorderless(x, y)
{
    BonusSelf.call(this, x, y);
}

BonusSelfBorderless.prototype = Object.create(BonusSelf.prototype);
BonusSelfBorderless.prototype.constructor = BonusSelfBorderless;

/**
 * Duration
 *
 * @type {Number}
 */
BonusSelfBorderless.prototype.duration = 7500;

/**
 * Get effects
 *
 * @param {Avatar} avatar
 *
 * @return {Array}
 */
BonusSelfBorderless.prototype.getEffects = function(avatar)
{
    return [
        ['ghost', true]
    ];
};
