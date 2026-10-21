# Bonuses

The list of the bonuses is in `src/shared/bonuses.ts`: name, CSS class and whether the bonus is enabled in a new room.
The order of the list is the order of the images in the sprite `public/images/bonus.png`.

## Add a bonus

1. **Effect**: add the class `src/server/model/Bonus/BonusXxx.ts`. Extend `BonusSelf`, `BonusEnemy`, `BonusAll`,
   `BonusGame` or `BonusLeader` (who is affected), set the `duration` and return the changes of the properties
   from `getEffects()`. Look at `BonusSelfFast` for the simplest one.
2. **Server**: add the class to `bonusTypes` in `src/server/model/RoomConfig.ts`.
3. **List**: add the bonus at the end of `bonusDefinitions` in `src/shared/bonuses.ts`. The CSS class is
   `bonus-self-xxx` / `bonus-enemy-xxx` / `bonus-all-xxx` ... (the part after `bonus-` is the name of the image).
4. **Image**: draw a 100 x 100 PNG with a transparent background in `assets/bonuses/<css class without bonus->.png`.
   Start from `assets/bonuses/_1-template-self.png` (green frame, for the bonuses of the player) or
   `_2-template-enemy.png` (red frame, for the bonuses of the enemies).
5. **Sprite**: run `npm run sprite` to build `public/images/bonus.png` from the images, and commit it.
6. **Presets** (optional): add the name to the presets in `src/client/model/preset/` that should have it.
7. **Test**: add the effect to `tests/game/bonus.test.js`, then run `npm test`.

The tests tell what is forgotten: every bonus of the list needs a server class (and the other way round), the presets
only use known bonuses, and the sprite has to be what `npm run sprite` builds from the images.

## Changing an image

Replace the PNG in `assets/bonuses/`, run `npm run sprite`, commit both. Do not edit `public/images/bonus.png` itself.
