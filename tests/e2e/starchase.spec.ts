import { expect, test } from '@playwright/test';
import { addLocalPlayer, createRoom, openPlayer, readyAll, roomName } from './helpers';

test('Star Chase: shows the missions during the round and what everybody got after it', async ({ browser }) => {
    const name = roomName('starchase');
    const alice = await openPlayer(browser, 'Alice', { color: '#ff0000' });

    await createRoom(alice, name);
    await addLocalPlayer(alice, 'Bob');
    await addLocalPlayer(alice, 'Carl');
    await alice.locator('.icon-params').click();
    await alice.locator('#scoring-mode').selectOption('starchase');
    // The mode ends the game after rounds, as it tells the room
    await expect(alice.locator('#win-condition')).toHaveValue('rounds');
    await expect(alice.locator('#win-rounds')).toHaveAttribute('placeholder', '8');
    await alice.locator('.icon-params').click();
    await readyAll(alice);

    // Two missions for three players, with their standing, from the countdown on
    await expect(alice.locator('#missions .mission')).toHaveCount(2, { timeout: 15_000 });
    await expect(alice.locator('#missions .mission').first()).toContainText(/you:|nobody yet|open/);
    await expect(alice.locator('#game-infos .maxScore')).toContainText('1 / 8');

    // Nobody steers: the round ends, and the recap tells the places and the missions
    await expect(alice.locator('#end .recap-view')).toHaveClass(/round/, { timeout: 45_000 });
    await expect(alice.locator('#round-summary .mission-results li')).toHaveCount(2);
    await expect(alice.locator('#round-summary table tbody tr')).toHaveCount(3);

    // After 8 s the next round starts with new missions
    await expect(alice.locator('#end')).toBeHidden({ timeout: 20_000 });
    await expect(alice.locator('#missions .mission')).toHaveCount(2);
    await expect(alice.locator('#game-infos .maxScore')).toContainText('2 / 8');
});
