import { expect, test } from '@playwright/test';
import { roomName, startDuo } from './helpers';

test('a game of two browsers is kept, and shown in the leaderboard, the games and the records', async ({ browser }) => {
    const name = roomName('kept');
    // Victory score 1: the game is over after a round
    const { alice } = await startDuo(browser, name, '1');

    await expect(alice.locator('#end .btn-back-to-room').first()).toBeVisible({ timeout: 60_000 });
    await alice.goto('/#/stats');

    // The leaderboard: the viewer is marked
    await expect(alice.locator('#stats .stats-table tbody tr.mine')).toContainText('Alice');
    await expect(alice.locator('#stats .stats-table tbody')).toContainText('Bob');

    // The games, with the statistics of the game as it was shown at its end
    await alice.locator('#stats .tabs a', { hasText: 'Games' }).click();

    const game = alice.locator('#stats .games li', { hasText: name });

    await expect(game).toBeVisible();
    await game.locator('.game-head').click();
    await expect(game.locator('.game-detail .game-stats table')).toBeVisible();

    // The records
    await alice.locator('#stats .tabs a', { hasText: 'Records' }).click();
    await expect(alice.locator('#stats .records li').first()).toBeVisible();
});

test('the statistics page says so when it has nothing to show yet', async ({ browser }) => {
    const page = await browser.newPage();

    await page.goto('/#/stats/records');
    await expect(page.locator('#stats h1')).toHaveText('Stats');
    await page.close();
});
