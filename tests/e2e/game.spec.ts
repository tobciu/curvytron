import { expect, test, type Page } from '@playwright/test';
import { addLocalPlayer, createRoom, joinRoom, openPlayer, playerRows, readyAll, roomName } from './helpers';

/** Create a room with one game that ends after the first round (victory score 1). */
async function startShortGame(browser: Parameters<typeof openPlayer>[0], name: string): Promise<Page> {
    const alice = await openPlayer(browser, 'Alice', { color: '#ff0000' });

    await createRoom(alice, name);
    await addLocalPlayer(alice, 'Bob');
    await alice.locator('.icon-params').click();
    await alice.locator('#max-score').fill('1');
    await alice.locator('.icon-params').click();
    await readyAll(alice);

    await expect(alice).toHaveURL(new RegExp(`#/game/${name}`));

    return alice;
}

test('starts a game when everybody is ready', async ({ browser }) => {
    const name = roomName('game');
    const page = await startShortGame(browser, name);

    await expect(page.locator('body')).toHaveClass(/game-mode/);
    await expect(page.locator('#game-infos h3')).toHaveText(name);
    await expect(page.locator('#game-infos .maxScore span')).toHaveText('1');
    await expect(page.locator('.game-players .player')).toHaveCount(2);
    await expect(page.locator('.game-players .player .player-name')).toHaveText(['Alice', 'Bob']);
    await expect(page.locator('.game-players .player').first()).toHaveClass(/local/);
    await expect(page.locator('#render canvas')).toHaveCount(4);

    // Round countdown (the element itself is only visible for a few seconds)
    await expect(page.locator('#count')).toHaveText(/^[0-3]$/);

    // Metrics
    await expect(page.locator('footer .fps')).toContainText('fps');
    await expect(page.locator('footer .ping')).toContainText('ms');
});

test('plays a round until the game is over, then goes back to the room', async ({ browser }) => {
    const name = roomName('round');
    const page = await startShortGame(browser, name);

    // Nobody steers: avatars hit the wall.
    await expect(page.locator('#kill-log-feed')).toContainText(/crashed on the wall|committed suicide|killed by/, {
        timeout: 45_000
    });
    await expect(page.locator('#end')).toBeVisible({ timeout: 45_000 });
    await expect(page.locator('#end .recap-view')).toHaveClass(/game/);
    await expect(page.locator('#end .recap tr')).toHaveCount(2);
    await expect(page.locator('#end .btn-back-to-room').first()).toBeVisible();

    // Statistics: a line per player, the winner first
    await expect(page.locator('#end .game-stats table.stats tbody tr')).toHaveCount(2);
    await expect(page.locator('#end .game-stats table.stats tbody td.name')).toHaveText(['Alice', 'Bob']);
    await expect(page.locator('#end .game-stats table.stats tbody td:nth-child(2)')).toHaveText(['1', '0']);

    await page.locator('#end .btn-back-to-room').first().click();

    await expect(page).toHaveURL(new RegExp(`#/room/${name}`));
    await expect(playerRows(page)).toHaveCount(2);
});

test('shows the connecting players while the game loads, scores and metrics', async ({ browser }) => {
    const name = roomName('scores');
    const page = await startShortGame(browser, name);

    await expect(page.locator('.game-players .score').first()).toHaveText(/\d+/);
    await expect(page.locator('.game-players')).toHaveClass(/in-round/, { timeout: 15_000 });
});

test('spectators can join a running game', async ({ browser }) => {
    const name = roomName('spectate');
    const alice = await startShortGame(browser, name);
    const bob = await openPlayer(browser, 'Spectator');

    await bob.goto('/');

    const row = bob.locator('#rooms tr.room.in-game', { hasText: name });

    await expect(row).toContainText('Spectate');
    await row.click();

    await expect(bob).toHaveURL(new RegExp(`#/game/${name}`));
    await expect(bob.locator('.spectating')).toContainText('You are in spectator mode');
    await expect(bob.locator('.game-players .player')).toHaveCount(2);
    await expect(alice.locator('#spectators')).toContainText('1');
});

test('leaving a running game asks for confirmation', async ({ browser }) => {
    const name = roomName('leave');
    const page = await startShortGame(browser, name);
    const dialogs: string[] = [];

    page.on('dialog', async (dialog) => {
        dialogs.push(dialog.message());
        await dialog.dismiss();
    });

    await expect(page.locator('.game-players .player')).toHaveCount(2);
    await page.locator('#game-infos .logo').click();

    await expect.poll(() => dialogs).toEqual(['Are you sure you want to leave the game?']);
    await expect(page).toHaveURL(new RegExp(`#/game/${name}`));
});

test('two clients play the same game', async ({ browser }) => {
    const name = roomName('duo');
    const alice = await openPlayer(browser, 'Alice');
    const bob = await openPlayer(browser, 'Bob');

    await createRoom(alice, name);
    await joinRoom(bob, name);
    await expect(playerRows(alice)).toHaveCount(2);

    await alice.locator('tr.local .player-ready').click();
    await expect(alice).toHaveURL(/#\/room\//);
    await bob.locator('tr.local .player-ready').click();

    for (const page of [alice, bob]) {
        await expect(page).toHaveURL(new RegExp(`#/game/${name}`));
        await expect(page.locator('.game-players .player')).toHaveCount(2);
    }

    await expect(alice.locator('.game-players .player.local .player-name')).toHaveText('Alice');
    await expect(bob.locator('.game-players .player.local .player-name')).toHaveText('Bob');
    await expect(alice.locator('#kill-log-feed')).toContainText(/crashed on|committed suicide|killed by/, {
        timeout: 45_000
    });
});
