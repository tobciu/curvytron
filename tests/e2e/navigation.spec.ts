import { expect, test } from '@playwright/test';
import { createRoom, openPlayer, roomName } from './helpers';

test('shows the room list with the tutorial', async ({ browser }) => {
    const page = await openPlayer(browser, 'Alice');

    await page.goto('/');

    await expect(page).toHaveTitle('Curvytron');
    await expect(page.locator('#intro .tuto')).toHaveCount(3);
    await expect(page.locator('#intro')).toContainText('A multiplayer tron-like game... with curves!');
    await expect(page.locator('.profile-link .name')).toHaveText('Alice');
});

test('about page tells about the fork and lists the original team', async ({ browser }) => {
    const page = await openPlayer(browser, 'Alice');

    await page.goto('/#/about');

    await expect(page.locator('#about h1').first()).toHaveText('This version');
    await expect(page.locator('#about')).toContainText('Original team');
    await expect(page.locator('#about')).toContainText('Thomas JARRAND');
    await expect(page.locator('#about')).toContainText('Johan DUFOUR');
});

test('footer links to about page', async ({ browser }) => {
    const page = await openPlayer(browser, 'Alice');

    await page.goto('/');
    await page.getByRole('link', { name: 'About Us' }).click();

    await expect(page).toHaveURL(/#\/about$/);
});

test('footer links to the rules, which explain the statistics', async ({ browser }) => {
    const page = await openPlayer(browser, 'Alice');

    await page.goto('/');
    await page.getByRole('link', { name: 'Rules' }).first().click();

    await expect(page).toHaveURL(/#\/rules$/);
    await expect(page.locator('#rules')).toContainText('Close calls');
    await expect(page.locator('#rules .bonus-table li').first()).toBeVisible();

    await page.goto('/#/rules/statistics');

    await expect(page.locator('#rules-statistics')).toBeInViewport();
});

test('unknown routes redirect to the room list', async ({ browser }) => {
    const page = await openPlayer(browser, 'Alice');

    await page.goto('/#/nothing/here');

    await expect(page).toHaveURL(/#\/$/);
    await expect(page.locator('.room-list')).toBeVisible();
});

test('joining an unknown room goes back to the list', async ({ browser }) => {
    const page = await openPlayer(browser, 'Alice');

    await page.goto('/#/room/doesnotexist');

    await expect(page).toHaveURL(/#\/$/);
});

test('created rooms are listed for other players, with their player count', async ({ browser }) => {
    const name = roomName('list');
    const alice = await openPlayer(browser, 'Alice');
    const bob = await openPlayer(browser, 'Bob');

    await bob.goto('/');
    await createRoom(alice, name);

    const row = bob.locator('#rooms tr.room', { hasText: name });

    await expect(row).toBeVisible();
    await expect(row.locator('.room-nb-players')).toContainText('1 player');

    await alice.locator('#add-user-name').fill('Second');
    await alice.keyboard.press('Enter');

    await expect(row.locator('.room-nb-players')).toContainText('2 players');
});

test('a room can be created with a tag, which is cleaned and shown in the list and in the room', async ({
    browser
}) => {
    const name = roomName('tag');
    const alice = await openPlayer(browser, 'Alice');
    const bob = await openPlayer(browser, 'Bob');

    await bob.goto('/');
    await alice.goto('/');
    await alice.locator('#room-tag').fill(' Daily Runde ');
    await alice.locator('.room-list .top-right-form input').fill(name);
    await alice.keyboard.press('Enter');

    await expect(alice.locator('.room .header')).toContainText('#daily-runde');
    await expect(bob.locator('#rooms tr.room', { hasText: name }).locator('.tag')).toHaveText('#daily-runde');
});

test('the room header counts the rooms', async ({ browser }) => {
    const alice = await openPlayer(browser, 'Alice');

    await createRoom(alice, roomName('count'));
    await alice.goto('/');

    await expect(alice.locator('.room-list .header .title')).toContainText(/You can join \d+ rooms?!/);
});
