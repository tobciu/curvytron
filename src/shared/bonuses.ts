/**
 * The bonuses of the game, in one place.
 *
 * The order is the order of the images in the sprite `public/images/bonus.png` (3 per line), see `doc/bonuses.md` to
 * add a bonus. The class that implements the effect is in `src/server/model/Bonus/<name>.ts`.
 */
export interface BonusDefinition {
    /** Name of the server class, it identifies the bonus on the network and in the configuration of a room */
    name: string;
    /** Short name for the players, shown on the rules page */
    label: string;
    /** What the bonus does, for the players */
    description: string;
    /** CSS class in the room parameters, also the name of the image in `assets/bonuses/` (without `bonus-`) */
    css: string;
    /** Is the bonus enabled in a new room? */
    enabled: boolean;
    /** The presets of the room parameters that include the bonus (the presets "No bonuses" and "Random" need no list) */
    presets?: readonly PresetId[];
}

export type PresetId = 'all' | 'speed' | 'size' | 'solo';

export const bonusDefinitions: readonly BonusDefinition[] = [
    {
        name: 'BonusSelfFast',
        label: 'Speed up',
        description: 'You drive faster for a few seconds.',
        css: 'bonus-self-fast',
        enabled: true,
        presets: ['all', 'speed', 'solo']
    },
    {
        name: 'BonusEnemyFast',
        label: 'Enemies faster',
        description: 'All the other players drive faster for a few seconds.',
        css: 'bonus-enemy-fast',
        enabled: true,
        presets: ['all', 'speed']
    },
    {
        name: 'BonusSelfSlow',
        label: 'Slow down',
        description: 'You drive slower, which makes tight turns easier.',
        css: 'bonus-self-slow',
        enabled: true,
        presets: ['all', 'solo']
    },
    {
        name: 'BonusEnemySlow',
        label: 'Enemies slower',
        description: 'All the other players drive slower for a few seconds.',
        css: 'bonus-enemy-slow',
        enabled: true,
        presets: ['all']
    },
    {
        name: 'BonusGameBorderless',
        label: 'Borderless',
        description:
            'The borders disappear for everybody: whoever crosses one comes out on the opposite side instead of dying.',
        css: 'bonus-game-borderless',
        enabled: true,
        presets: ['all', 'solo']
    },
    {
        name: 'BonusSelfMaster',
        label: 'Master',
        description: 'You are invincible and leave no trail for a while.',
        css: 'bonus-self-master',
        enabled: true,
        presets: ['all', 'solo']
    },
    {
        name: 'BonusEnemyBig',
        label: 'Big enemies',
        description: 'The trails of all the other players get thicker.',
        css: 'bonus-enemy-big',
        enabled: true,
        presets: ['all', 'size']
    },
    {
        name: 'BonusAllColor',
        label: 'Color swap',
        description: 'Every player gets the color of another player for a while, so it is hard to tell who is who.',
        css: 'bonus-all-color',
        enabled: true,
        presets: ['all']
    },
    {
        name: 'BonusEnemyInverse',
        label: 'Inverse enemies',
        description: 'The controls of all the other players are reversed: left is right.',
        css: 'bonus-enemy-inverse',
        enabled: true,
        presets: ['all']
    },
    {
        name: 'BonusSelfSmall',
        label: 'Small',
        description: 'Your trail gets thinner, so it is easier to slip through gaps.',
        css: 'bonus-self-small',
        enabled: true,
        presets: ['all', 'solo']
    },
    {
        name: 'BonusGameClear',
        label: 'Clear',
        description: 'Removes every trail from the map. It shows up more often the more players are dead.',
        css: 'bonus-all-clear',
        enabled: true,
        presets: ['all', 'solo']
    },
    {
        name: 'BonusEnemyStraightAngle',
        label: 'Right angles',
        description: 'The other players can only turn in sharp right angles.',
        css: 'bonus-enemy-straight-angle',
        enabled: true,
        presets: ['all']
    },
    {
        name: 'BonusSelfRandom',
        label: 'Angular',
        description: 'You steer in fixed steps of 45° instead of smooth curves.',
        css: 'bonus-self-random',
        enabled: false
    },
    {
        name: 'BonusLeaderRandom',
        label: 'Angular leader',
        description: 'The leader steers in fixed steps of 45° instead of smooth curves.',
        css: 'bonus-leader-random',
        enabled: false
    },
    {
        name: 'BonusEnemyRandom',
        label: 'Angular enemies',
        description: 'The other players steer in fixed steps of 45° instead of smooth curves.',
        css: 'bonus-enemy-random',
        enabled: false
    },
    {
        name: 'BonusLeaderFast',
        label: 'Leader faster',
        description: 'The other player with the most points who is still alive drives faster.',
        css: 'bonus-leader-fast',
        enabled: true
    },
    {
        name: 'BonusLeaderInverse',
        label: 'Leader inverse',
        description: 'The controls of the leader are reversed.',
        css: 'bonus-leader-inverse',
        enabled: true
    },
    {
        name: 'BonusLeaderSlow',
        label: 'Leader slower',
        description: 'The leader drives slower for a few seconds.',
        css: 'bonus-leader-slow',
        enabled: true
    },
    {
        name: 'BonusSelfBorderless',
        label: 'Ghost',
        description: 'You can cross the borders and come out on the opposite side.',
        css: 'bonus-self-borderless',
        enabled: true
    }
];

/** Images of the sprite per line */
export const spriteColumns = 3;

/** Empty frames after the bonuses in the sprite (`assets/bonuses/_*.png`), for the designers of new bonuses */
export const spriteTemplates = 2;

/** Lines of the sprite */
export function spriteLines(): number {
    return Math.ceil((bonusDefinitions.length + spriteTemplates) / spriteColumns);
}

/** Size of an image of the sprite, in pixels */
export const spriteImageSize = 100;

/** Position of a bonus in the sprite: column and line */
export function spritePosition(name: string): { column: number; line: number } {
    const index = bonusDefinitions.findIndex((definition) => definition.name === name);

    if (index < 0) {
        throw new Error(`Unknown bonus "${name}"`);
    }

    return { column: index % spriteColumns, line: Math.floor(index / spriteColumns) };
}

/** Name of the image of a bonus in `assets/bonuses/` */
export function bonusImage(definition: BonusDefinition): string {
    return `${definition.css.replace(/^bonus-/, '')}.png`;
}

/** Who is affected by a bonus, from the CSS class: `bonus-<target>-<effect>` */
export type BonusTarget = 'self' | 'enemy' | 'leader' | 'all' | 'game';

export function bonusTarget(definition: BonusDefinition): BonusTarget {
    return definition.css.split('-')[1] as BonusTarget;
}

/** Names of the bonuses of a preset */
export function presetBonuses(preset: PresetId): string[] {
    return bonusDefinitions.filter(({ presets }) => presets?.includes(preset)).map(({ name }) => name);
}

/** Names of all the bonuses */
export const bonusNames: readonly string[] = bonusDefinitions.map(({ name }) => name);
