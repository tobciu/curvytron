/**
 * Random Self Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
function BonusSelfRandom(x, y)
{
    BonusSelf.call(this, x, y);
}

BonusSelfRandom.prototype = Object.create(BonusSelf.prototype);
BonusSelfRandom.prototype.constructor = BonusSelfRandom;

/**
 * Duration
 *
 * @type {Number}
 */
BonusSelfRandom.prototype.duration = 7500;

/**
 * Get effects
 *
 * @param {Avatar} avatar
 *
 * @return {Array}
 */
BonusSelfRandom.prototype.getEffects = function(avatar)
{
    return [['directionInLoop', false], ['angularVelocityBase', Math.PI / 4]];
};
