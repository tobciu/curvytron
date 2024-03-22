/**
 * Default Preset
 */
function RandomPreset ()
{
    Preset.call(this);
}

RandomPreset.prototype = Object.create(Preset.prototype);
RandomPreset.prototype.constructor = RandomPreset;

/**
 * Name
 *
 * @type {String}
 */
RandomPreset.prototype.name = 'Random';

/**
 * Bonuses
 *
 * @type {Array}
 */
RandomPreset.prototype.bonuses = [
    'BonusSelfFast',
    'BonusEnemyFast',
    'BonusSelfSlow',
    'BonusEnemySlow',
    'BonusGameBorderless',
    'BonusSelfMaster',
    'BonusEnemyBig',
    'BonusAllColor',
    'BonusEnemyInverse',
    'BonusSelfSmall',
    'BonusGameClear',
    'BonusEnemyStraightAngle',
    'BonusSelfRandom',
    'BonusLeaderRandom',
    'BonusEnemyRandom',
    'BonusLeaderFast',
    'BonusLeaderInverse',
    'BonusLeaderSlow',
    'BonusSelfBorderless'
].sort(function() {return 0.5 - Math.random();}).slice(0, Math.floor(Math.random() * 17));
