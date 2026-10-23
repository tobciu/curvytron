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
    /** The presets of the room parameters that include the bonus (the presets "All", "No bonuses" and "Random" need no list) */
    presets?: readonly PresetId[];
    /** Radius on the map, the default is `defaultBonusRadius` */
    radius?: number;
    /**
     * A bonus that is no choice of the room: it is not in the room parameters nor in the presets, and does not pop by
     * itself. A mode makes it appear (the star of Star Chase).
     */
    special?: boolean;
}

/** Radius of a bonus on the map */
export const defaultBonusRadius = 3;

export type PresetId = 'speed' | 'size' | 'solo';

export const bonusDefinitions: readonly BonusDefinition[] = [
    {
        name: 'BonusSelfFast',
        label: 'Speed up',
        description: 'You drive faster for a few seconds.',
        css: 'bonus-self-fast',
        enabled: true,
        presets: ['speed', 'solo']
    },
    {
        name: 'BonusEnemyFast',
        label: 'Enemies faster',
        description: 'All the other players drive faster for a few seconds.',
        css: 'bonus-enemy-fast',
        enabled: true,
        presets: ['speed']
    },
    {
        name: 'BonusSelfSlow',
        label: 'Slow down',
        description: 'You drive slower, which makes tight turns easier.',
        css: 'bonus-self-slow',
        enabled: true,
        presets: ['solo']
    },
    {
        name: 'BonusEnemySlow',
        label: 'Enemies slower',
        description: 'All the other players drive slower for a few seconds.',
        css: 'bonus-enemy-slow',
        enabled: true
    },
    {
        name: 'BonusGameBorderless',
        label: 'Borderless',
        description:
            'The borders disappear for everybody: whoever crosses one comes out on the opposite side instead of dying.',
        css: 'bonus-game-borderless',
        enabled: true,
        presets: ['solo']
    },
    {
        name: 'BonusSelfMaster',
        label: 'Master',
        description: 'You are invincible and leave no trail for a while.',
        css: 'bonus-self-master',
        enabled: true,
        presets: ['solo']
    },
    {
        name: 'BonusEnemyBig',
        label: 'Big enemies',
        description: 'The trails of all the other players get thicker.',
        css: 'bonus-enemy-big',
        enabled: true,
        presets: ['size']
    },
    {
        name: 'BonusAllColor',
        label: 'Color swap',
        description: 'Every player gets the color of another player for a while, so it is hard to tell who is who.',
        css: 'bonus-all-color',
        enabled: true
    },
    {
        name: 'BonusEnemyInverse',
        label: 'Inverse enemies',
        description: 'The controls of all the other players are reversed: left is right.',
        css: 'bonus-enemy-inverse',
        enabled: true
    },
    {
        name: 'BonusSelfSmall',
        label: 'Small',
        description: 'Your trail gets thinner, so it is easier to slip through gaps.',
        css: 'bonus-self-small',
        enabled: true,
        presets: ['solo']
    },
    {
        name: 'BonusGameClear',
        label: 'Clear',
        description: 'Removes every trail from the map. It shows up more often the more players are dead.',
        css: 'bonus-all-clear',
        enabled: true,
        presets: ['solo']
    },
    {
        name: 'BonusEnemyStraightAngle',
        label: 'Right angles',
        description: 'Every key press turns the other players by exactly 90°, instead of a smooth curve.',
        css: 'bonus-enemy-straight-angle',
        enabled: true
    },
    {
        name: 'BonusSelfRandom',
        label: 'Angular',
        description: 'Every key press turns you by exactly 45°, instead of a smooth curve.',
        css: 'bonus-self-random',
        enabled: false
    },
    {
        name: 'BonusLeaderRandom',
        label: 'Angular leader',
        description: 'Every key press turns the leader by exactly 45°, instead of a smooth curve.',
        css: 'bonus-leader-random',
        enabled: false
    },
    {
        name: 'BonusEnemyRandom',
        label: 'Angular enemies',
        description: 'Every key press turns the other players by exactly 45°, instead of a smooth curve.',
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
    },
    {
        name: 'BonusStar',
        label: 'Star',
        description: 'Star Chase only: a small star at a risky place that gives points to whoever catches it.',
        css: 'bonus-star',
        enabled: false,
        radius: 2,
        special: true
    }
];

/** Radius of a bonus on the map, from the registry */
export function bonusRadius(name: string): number {
    return bonusDefinitions.find((definition) => definition.name === name)?.radius ?? defaultBonusRadius;
}

/** The bonuses a room can choose from: everything but the special ones */
export const selectableBonuses: readonly BonusDefinition[] = bonusDefinitions.filter(({ special }) => !special);

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

/** Names of all the bonuses a room can choose from */
export const bonusNames: readonly string[] = selectableBonuses.map(({ name }) => name);
