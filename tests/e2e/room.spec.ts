import { expect, test } from '@playwright/test';
import { addLocalPlayer, createRoom, joinRoom, openPlayer, playerRows, roomName } from './helpers';

/** The `ready` class, not the `player-ready` one */
const READY = /(^|\s)ready(\s|$)/;

test('joining a room adds the profile player as room master', async ({ browser }) => {
    const alice = await openPlayer(browser, 'Alice', { color: '#ff0000' });
    const name = roomName('master');

    await createRoom(alice, name);

    await expect(playerRows(alice)).toHaveCount(1);
    await expect(alice.locator('.room .count')).toHaveText('1 player');
    await expect(alice.locator('tr.local input.player-name')).toHaveValue('Alice');
    await expect(alice.locator('tr.local input.player-color')).toHaveValue('#ff0000');
    await expect(alice.locator('tr.local .icon-crown')).toBeVisible();
    await expect(alice.locator('.start-now')).toBeVisible();
    await expect(alice.locator('#chat-feed')).toContainText('Alice is now the room master.');
});

test('adds, renames and removes local players', async ({ browser }) => {
    const page = await openPlayer(browser, 'Alice');

    await createRoom(page, roomName('local'));
    await addLocalPlayer(page, 'Bob');
    await expect(page.locator('.room .count')).toHaveText('2 players');

    const bob = page.locator('tr.local').nth(1);

    await bob.locator('input.player-name').fill('Robert');
    await bob.locator('input.player-name').blur();
    await expect(bob.locator('input.player-name')).toHaveValue('Robert');

    await bob.hover();
    await bob.locator('.btn-remove').click();
    await expect(page.locator('.room .count')).toHaveText('1 player');
});

test('refuses duplicate names', async ({ browser }) => {
    const page = await openPlayer(browser, 'Alice');

    await createRoom(page, roomName('dupes'));
    await page.locator('#add-user-name').fill('Alice');
    await page.keyboard.press('Enter');

    await expect(page.locator('tr.local')).toHaveCount(1);
});

test('players of other clients are shown read-only, ready state is synchronized', async ({ browser }) => {
    const name = roomName('sync');
    const alice = await openPlayer(browser, 'Alice');
    const bob = await openPlayer(browser, 'Bob');

    await createRoom(alice, name);
    await joinRoom(bob, name);

    await expect(playerRows(alice)).toHaveCount(2);
    await expect(playerRows(bob)).toHaveCount(2);
    await expect(alice.locator('tr:not(.local) .player-name')).toHaveText('Bob');
    await expect(bob.locator('tr:not(.local) .player-name')).toHaveText('Alice');
    await expect(bob.locator('.start-now')).toBeHidden();

    await bob.locator('tr.local .player-ready').click();

    await expect(bob.locator('tr.local .player-ready')).toHaveClass(READY);
    await expect(alice.locator('tr:not(.local) .player-ready')).toHaveClass(READY);

    await bob.locator('tr.local .player-ready').click();
    await expect(alice.locator('tr:not(.local) .player-ready')).not.toHaveClass(READY);
});

test('the room master changes when the master leaves', async ({ browser }) => {
    const name = roomName('handover');
    const alice = await openPlayer(browser, 'Alice');
    const bob = await openPlayer(browser, 'Bob');

    await createRoom(alice, name);
    await joinRoom(bob, name);
    await expect(playerRows(bob)).toHaveCount(2);

    await alice.goto('/');

    await expect(bob.locator('.start-now')).toBeVisible();
    await expect(bob.locator('#chat-feed')).toContainText('Bob is now the room master.');
    await expect(playerRows(bob)).toHaveCount(1);
});

test('chat messages are shared', async ({ browser }) => {
    const name = roomName('chat');
    const alice = await openPlayer(browser, 'Alice');
    const bob = await openPlayer(browser, 'Bob');

    await createRoom(alice, name);
    await joinRoom(bob, name);
    await expect(playerRows(alice)).toHaveCount(2);

    await alice.locator('.sent-message').fill('hello <b>world</b>');
    await alice.keyboard.press('Enter');

    await expect(alice.locator('.sent-message')).toHaveValue('');

    for (const page of [alice, bob]) {
        const message = page.locator('#chat-feed .one-message', { hasText: 'hello' });

        await expect(message).toContainText('Alice:');
        // never interpreted as HTML
        await expect(message.locator('.message-content')).toHaveText('hello <b>world</b>');
        await expect(message.locator('b')).toHaveCount(0);
    }
});

test('muting a player hides its messages', async ({ browser }) => {
    const name = roomName('mute');
    const alice = await openPlayer(browser, 'Alice');
    const bob = await openPlayer(browser, 'Bob');

    await createRoom(alice, name);
    await joinRoom(bob, name);
    await expect(playerRows(alice)).toHaveCount(2);

    await bob.locator('.sent-message').fill('noise');
    await bob.keyboard.press('Enter');

    const message = alice.locator('#chat-feed .one-message', { hasText: 'noise' });

    await expect(message).toBeVisible();
    await message.locator('.message-name').hover();
    await message.locator('.mute').click();

    await expect(alice.locator('#chat-feed')).not.toContainText('noise');
    await expect(alice.locator('#chat-feed')).toContainText('You muted Bob.');

    await alice.locator('#chat-feed .action', { hasText: 'Cancel?' }).click();
    await expect(alice.locator('#chat-feed')).toContainText('noise');
});

test('players can vote to kick another player', async ({ browser }) => {
    const name = roomName('kick');
    const alice = await openPlayer(browser, 'Alice');
    const bob = await openPlayer(browser, 'Bob');
    const carl = await openPlayer(browser, 'Carl');
    const dan = await openPlayer(browser, 'Dan');

    await createRoom(alice, name);
    await joinRoom(bob, name);
    await joinRoom(carl, name);
    await joinRoom(dan, name);
    await expect(playerRows(alice)).toHaveCount(4);

    // A regular player starts a vote...
    await bob.locator('tr:not(.local)', { hasText: 'Dan' }).hover();
    await bob.locator('tr:not(.local)', { hasText: 'Dan' }).locator('.btn-remove').click();

    await expect(carl.locator('#chat-feed')).toContainText('Do you want to kick Dan?');
    await expect(bob.locator('#chat-feed')).toContainText('Ongoing vote to kick Dan.');
    await expect(dan.locator('#chat-feed')).toContainText('Ongoing vote to kick Dan.');

    // ...the room master's vote is enough to kick
    await alice.locator('#chat-feed .action', { hasText: 'Yes!' }).click();

    await expect(playerRows(alice)).toHaveCount(3);
    await expect(alice.locator('#chat-feed')).toContainText('Farewell Dan, you have been kicked.');
});

test('lists the room only once, with a lock when private', async ({ browser }) => {
    const name = roomName('private');
    const alice = await openPlayer(browser, 'Alice');
    const bob = await openPlayer(browser, 'Bob');

    await bob.goto('/');
    await createRoom(alice, name);
    await alice.locator('.icon-params').click();
    await alice.locator('#is-private').click();

    const row = bob.locator('#rooms tr.room', { hasText: name });

    await expect(row).toHaveClass(/private/);
    await expect(row.locator('.icon-lock')).toBeVisible();

    const password = await alice.locator('#password').inputValue();

    expect(password).toMatch(/^\d{4}$/);

    await row.locator('input.password').fill(password);
    await bob.keyboard.press('Enter');

    await expect(bob).toHaveURL(new RegExp(`#/room/${name}\\?password=${password}$`));
    await expect(playerRows(bob)).toHaveCount(2);
});
