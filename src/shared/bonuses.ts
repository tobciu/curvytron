/**
 * The bonuses of the game, in one place.
 *
 * The order is the order of the images in the sprite `public/images/bonus.png` (3 per line), see `doc/bonuses.md` to
 * add a bonus. The class that implements the effect is in `src/server/model/Bonus/<name>.ts`.
 */
export interface BonusDefinition {
    /** Name of the server class, it identifies the bonus on the network and in the configuration of a room */
    name: string;
    /** CSS class in the room parameters, also the name of the image in `assets/bonuses/` (without `bonus-`) */
    css: string;
    /** Is the bonus enabled in a new room? */
    enabled: boolean;
    /** The presets of the room parameters that include the bonus (the presets "No bonuses" and "Random" need no list) */
    presets?: readonly PresetId[];
}

export type PresetId = 'all' | 'speed' | 'size' | 'solo';

export const bonusDefinitions: readonly BonusDefinition[] = [
    { name: 'BonusSelfFast', css: 'bonus-self-fast', enabled: true, presets: ['all', 'speed', 'solo'] },
    { name: 'BonusEnemyFast', css: 'bonus-enemy-fast', enabled: true, presets: ['all', 'speed'] },
    { name: 'BonusSelfSlow', css: 'bonus-self-slow', enabled: true, presets: ['all', 'solo'] },
    { name: 'BonusEnemySlow', css: 'bonus-enemy-slow', enabled: true, presets: ['all'] },
    { name: 'BonusGameBorderless', css: 'bonus-game-borderless', enabled: true, presets: ['all', 'solo'] },
    { name: 'BonusSelfMaster', css: 'bonus-self-master', enabled: true, presets: ['all', 'solo'] },
    { name: 'BonusEnemyBig', css: 'bonus-enemy-big', enabled: true, presets: ['all', 'size'] },
    { name: 'BonusAllColor', css: 'bonus-all-color', enabled: true, presets: ['all'] },
    { name: 'BonusEnemyInverse', css: 'bonus-enemy-inverse', enabled: true, presets: ['all'] },
    { name: 'BonusSelfSmall', css: 'bonus-self-small', enabled: true, presets: ['all', 'solo'] },
    { name: 'BonusGameClear', css: 'bonus-all-clear', enabled: true, presets: ['all', 'solo'] },
    { name: 'BonusEnemyStraightAngle', css: 'bonus-enemy-straight-angle', enabled: true, presets: ['all'] },
    { name: 'BonusSelfRandom', css: 'bonus-self-random', enabled: false },
    { name: 'BonusLeaderRandom', css: 'bonus-leader-random', enabled: false },
    { name: 'BonusEnemyRandom', css: 'bonus-enemy-random', enabled: false },
    { name: 'BonusLeaderFast', css: 'bonus-leader-fast', enabled: true },
    { name: 'BonusLeaderInverse', css: 'bonus-leader-inverse', enabled: true },
    { name: 'BonusLeaderSlow', css: 'bonus-leader-slow', enabled: true },
    { name: 'BonusSelfBorderless', css: 'bonus-self-borderless', enabled: true }
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

/** Names of the bonuses of a preset */
export function presetBonuses(preset: PresetId): string[] {
    return bonusDefinitions.filter(({ presets }) => presets?.includes(preset)).map(({ name }) => name);
}

/** Names of all the bonuses */
export const bonusNames: readonly string[] = bonusDefinitions.map(({ name }) => name);
