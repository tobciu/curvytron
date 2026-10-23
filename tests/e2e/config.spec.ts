import { expect, test } from '@playwright/test';
import { createRoom, joinRoom, openPlayer, playerRows, roomName } from './helpers';

test('room parameters can be toggled', async ({ browser }) => {
    const page = await openPlayer(browser, 'Alice');

    await createRoom(page, roomName('params'));

    await expect(page.locator('#room-parameters')).toHaveCount(0);

    await page.locator('.icon-params').click();
    await expect(page.locator('#room-parameters')).toBeVisible();
    await expect(page.locator('.icon-params')).toHaveClass(/active/);

    await page.locator('.icon-params').click();
    await expect(page.locator('#room-parameters')).toHaveCount(0);
});

test('master changes are synchronized to other players', async ({ browser }) => {
    const name = roomName('config');
    const alice = await openPlayer(browser, 'Alice');
    const bob = await openPlayer(browser, 'Bob');

    await createRoom(alice, name);
    await joinRoom(bob, name);
    await expect(playerRows(bob)).toHaveCount(2);

    await alice.locator('.icon-params').click();
    await bob.locator('.icon-params').click();

    // Victory score
    await expect(bob.locator('#max-score')).toBeDisabled();
    await alice.locator('#max-score').fill('42');
    await expect(bob.locator('#max-score')).toHaveValue('42');

    // When the game is over: the value that goes with the condition changes with it
    await expect(bob.locator('#win-condition')).toBeDisabled();
    await alice.locator('#win-condition').selectOption('rounds');
    await expect(bob.locator('#win-condition')).toHaveValue('rounds');
    await expect(bob.locator('#max-score')).toHaveCount(0);
    await alice.locator('#win-rounds').fill('5');
    await expect(bob.locator('#win-rounds')).toHaveValue('5');
    await alice.locator('#win-condition').selectOption('time');
    await expect(bob.locator('#win-minutes')).toHaveAttribute('placeholder', '15');
    await alice.locator('#win-condition').selectOption('points');
    await expect(bob.locator('#max-score')).toHaveValue('42');

    // Public / private
    await expect(alice.locator('#is-open')).toHaveClass(/active/);
    await alice.locator('#is-private').click();
    await expect(alice.locator('#is-private')).toHaveClass(/active/);
    await expect(bob.locator('#is-private')).toHaveClass(/active/);
    await expect(alice.locator('.password-container')).toBeVisible();
    await alice.locator('#is-open').click();
    await expect(bob.locator('#is-open')).toHaveClass(/active/);
    await expect(bob.locator('.password-container')).toHaveCount(0);

    // Bonus quantity
    await alice.locator('#config-bonusRate').fill('0.5');
    await expect(bob.locator('#config-bonusRate')).toHaveValue('0.5');
});

test('presets and individual bonuses', async ({ browser }) => {
    const name = roomName('bonus');
    const alice = await openPlayer(browser, 'Alice');
    const bob = await openPlayer(browser, 'Bob');

    await createRoom(alice, name);
    await joinRoom(bob, name);
    await expect(playerRows(bob)).toHaveCount(2);
    await alice.locator('.icon-params').click();
    await bob.locator('.icon-params').click();

    const included = (page: typeof alice) => page.locator('.bonus-selection.selected .bonus');
    const excluded = (page: typeof alice) => page.locator('.bonus-selection.available .bonus');

    const total = (await included(alice).count()) + (await excluded(alice).count());

    await alice.locator('.preset', { hasText: 'All' }).click();
    await expect(alice.locator('.preset.active')).toHaveText('All');

    // Excluding a bonus switches to the "Custom" preset
    const before = await included(alice).count();

    await included(alice).first().click();
    await expect(included(alice)).toHaveCount(before - 1);
    await expect(included(bob)).toHaveCount(before - 1);
    await expect(alice.locator('.preset.active')).toHaveText('Custom');

    // "No bonuses" empties the selection
    await alice.locator('.preset', { hasText: 'No bonuses' }).click();
    await expect(included(alice)).toHaveCount(0);
    await expect(excluded(alice)).toHaveCount(total);
    await expect(included(bob)).toHaveCount(0);

    // Back to every bonus
    await alice.locator('.preset', { hasText: 'All' }).click();
    await expect(included(alice)).toHaveCount(before);
    await expect(alice.locator('.preset.active')).toHaveText('All');

    // Only the master can change anything
    await expect(bob.locator('.preset').first()).toHaveClass(/disabled/);
    await bob.locator('.preset', { hasText: 'Solo' }).click();
    await expect(included(bob)).toHaveCount(before);
});
