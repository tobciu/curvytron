/**
 * Build the sprite of the bonuses (`public/images/bonus.png`) from the images of `assets/bonuses/`
 * (one 100 x 100 PNG per bonus), in the order of `src/shared/bonuses.ts`.
 *
 *     npm run sprite                 write the sprite
 *     npm run sprite -- --split      the other way: cut an existing sprite into the single images
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import {
    bonusDefinitions,
    bonusImage,
    spriteColumns,
    spriteImageSize,
    spriteTemplates
} from '../src/shared/bonuses.ts';

const spritePath = 'public/images/bonus.png';
const imagesPath = 'assets/bonuses';

/** Empty frames for the designers of new bonuses, they come after the bonuses in the sprite */
const templates = ['_1-template-self.png', '_2-template-enemy.png'];

if (templates.length !== spriteTemplates) {
    throw new Error('The number of templates is `spriteTemplates` in src/shared/bonuses.ts');
}

/** File names of the images of the sprite, in order: the bonuses, then the templates */
export function spriteImages(): string[] {
    const extras = readdirSync(imagesPath)
        .filter((name) => name.startsWith('_') && name.endsWith('.png'))
        .toSorted((a, b) => a.localeCompare(b));

    return [...bonusDefinitions.map(bonusImage), ...extras];
}

/** Pixels of the sprite built from the single images */
export function buildSprite(): PNG {
    const images = spriteImages();
    const lines = Math.ceil(images.length / spriteColumns);
    const sprite = new PNG({ width: spriteColumns * spriteImageSize, height: lines * spriteImageSize });

    sprite.data.fill(0);

    images.forEach((file, index) => {
        const image = PNG.sync.read(readFileSync(`${imagesPath}/${file}`));

        if (image.width !== spriteImageSize || image.height !== spriteImageSize) {
            throw new Error(`${file} must be ${spriteImageSize} x ${spriteImageSize} pixels`);
        }

        PNG.bitblt(
            image,
            sprite,
            0,
            0,
            spriteImageSize,
            spriteImageSize,
            (index % spriteColumns) * spriteImageSize,
            Math.floor(index / spriteColumns) * spriteImageSize
        );
    });

    return sprite;
}

/** Cut the sprite into the single images */
function split(): void {
    const sprite = PNG.sync.read(readFileSync(spritePath));

    mkdirSync(imagesPath, { recursive: true });

    const files = [...bonusDefinitions.map(bonusImage), ...templates];

    files.forEach((file, index) => {
        const image = new PNG({ width: spriteImageSize, height: spriteImageSize });

        PNG.bitblt(
            sprite,
            image,
            (index % spriteColumns) * spriteImageSize,
            Math.floor(index / spriteColumns) * spriteImageSize,
            spriteImageSize,
            spriteImageSize,
            0,
            0
        );
        writeFileSync(`${imagesPath}/${file}`, PNG.sync.write(image));
    });
}

if (process.argv.includes('--split')) {
    split();
    console.info(`${bonusDefinitions.length + templates.length} images written in ${imagesPath}`);
} else if (import.meta.main) {
    writeFileSync(spritePath, PNG.sync.write(buildSprite()));
    console.info(`${spritePath} built from ${spriteImages().length} images`);
}
