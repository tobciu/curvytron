import { expect, test, type Page } from '@playwright/test';
import { roomName, startDuo } from './helpers';

/** The identity code of the page; while the page loads again there is none to read: the answer is the old one */
async function identity(page: Page, fallback: string | null): Promise<string | null> {
    try {
        return await page.evaluate(() => localStorage.getItem('curvytron.identity'));
    } catch {
        return fallback;
    }
}

test('a player can keep out of the public lists, get a new code with their history, and be forgotten', async ({
    browser
}) => {
    const name = roomName('who');
    const { alice, bob } = await startDuo(browser, name, '1');

    await expect(alice.locator('#end .btn-back-to-room').first()).toBeVisible({ timeout: 60_000 });

    const gameRow = (page: typeof alice) => page.locator('#stats .games li', { hasText: name });
    const players = async (page: typeof alice) => {
        await page.goto('/#/stats/games');
        // A page of the same address is not loaded again by goto, the list would be the old one
        await page.reload();
        await expect(gameRow(page)).toBeVisible();

        return gameRow(page).locator('.game-head .players');
    };

    // Everybody sees the names to begin with
    await expect(await players(bob)).toContainText('Alice');

    // Alice keeps out of the public lists: for Bob she is anonymous, for herself she is not
    await alice.goto('/');
    await alice.locator('.profile-link').click();
    await expect(alice.locator('#identity-public')).toBeChecked();

    const saved = alice.waitForResponse(
        (response) => response.request().method() === 'POST' && response.url().includes('/api/me')
    );

    await alice.locator('#identity-public').uncheck();
    await saved;

    await expect(await players(bob)).toContainText('Anonymous');
    await expect(await players(bob)).not.toContainText('Alice');
    await expect(await players(alice)).toContainText('Alice');

    // A new code with the history: the page loads again, Alice is still Alice
    await alice.goto('/');

    const before = await alice.evaluate(() => localStorage.getItem('curvytron.identity'));

    await alice.locator('.profile-link').click();
    await alice.locator('.identity .more summary').click();
    // The page loads again with the new code: wait for it, or the next step meets the old page with the open panel
    let reloaded = alice.waitForEvent('load');

    await alice.locator('#identity-rotate').click();
    await reloaded;

    const rotated = await identity(alice, before);

    expect(rotated).not.toBe(before);
    await alice.goto('/#/stats/me');
    await expect(alice.locator('#stats .who')).toContainText('Alice');
    await expect(alice.locator('#stats .who')).toContainText('not in the public lists');

    // Forgotten: nothing is kept for the new code, and the game has no name of Alice any more
    alice.on('dialog', (dialog) => void dialog.accept());
    await alice.locator('.profile-link').click();
    await alice.locator('.identity .more summary').click();
    reloaded = alice.waitForEvent('load');
    await alice.locator('#identity-forget').click();
    await reloaded;
    expect(await identity(alice, rotated)).not.toBe(rotated);
    await alice.goto('/#/stats/me');
    await expect(alice.locator('#stats .empty')).toContainText('Nothing kept for you yet');
    await expect(await players(alice)).toContainText('Anonymous');
    await expect(await players(alice)).not.toContainText('Alice');
});
