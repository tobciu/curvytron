import { expect, test } from '@playwright/test';
import { openPlayer, playerRows, roomName, startDuo } from './helpers';

test('a reload in the middle of a game brings the player back to the game', async ({ browser }) => {
    const name = roomName('reload');
    const { alice, bob } = await startDuo(browser, name);

    await bob.reload();

    await expect(bob).toHaveURL(new RegExp(`#/game/${name}`), { timeout: 15_000 });
    await expect(bob.locator('.game-players .player')).toHaveCount(2);
    await expect(bob.locator('.game-players .player.local .player-name')).toHaveText('Bob');
    // The same player as before, not a second one
    await expect(alice.locator('.game-players .player')).toHaveCount(2);
    await expect(alice.locator('.game-players .player.away')).toHaveCount(0);
});

test('a lost connection is noticed by the others, and the player comes back by itself', async ({ browser }) => {
    const name = roomName('drop');
    const { alice, bob } = await startDuo(browser, name);

    // Close the sockets of Bob like a network that drops
    await bob.evaluate(() => {
        const sockets = (window as unknown as { __sockets: WebSocket[] }).__sockets;

        sockets.forEach((socket) => socket.close());
    });

    await expect(alice.locator('#chat-feed')).toContainText('Bob lost the connection');
    await expect(alice.locator('#chat-feed')).toContainText('Bob is back', { timeout: 30_000 });
    await expect(bob).toHaveURL(new RegExp(`#/game/${name}`), { timeout: 30_000 });
    await expect(bob.locator('.game-players .player.local .player-name')).toHaveText('Bob');
    await expect(alice.locator('.game-players .player')).toHaveCount(2);
});

test('a player that comes late watches this round and plays from the next one', async ({ browser }) => {
    const name = roomName('late');
    const { alice } = await startDuo(browser, name);
    const carol = await openPlayer(browser, 'Carol', { color: '#0000ff' });

    await carol.goto('/');
    await carol.locator('#rooms tr.room', { hasText: name }).click();

    await expect(carol).toHaveURL(new RegExp(`#/game/${name}`));
    await expect(carol.locator('.spectating')).toContainText('You join the next round');
    await expect(carol.locator('.game-players .player')).toHaveCount(3);
    await expect(alice.locator('.game-players .player')).toHaveCount(3);

    // Her score starts at zero, and she takes part when the round is over
    await expect(carol.locator('.spectating')).toBeHidden({ timeout: 60_000 });
    await expect(carol.locator('.game-players .player.local .player-name')).toHaveText('Carol');
    await expect(carol.locator('.game-players .player.local')).not.toHaveClass(/away/);
});

test('a player that never comes back is let go when the game is over', async ({ browser }) => {
    const name = roomName('gone');
    const { alice, bob } = await startDuo(browser, name, '1');

    await bob.context().close();

    await expect(alice.locator('.game-players .player.away')).toHaveCount(1);
    await expect(alice.locator('#end .btn-back-to-room').first()).toBeVisible({ timeout: 60_000 });
    await alice.locator('#end .btn-back-to-room').first().click();
    await expect(alice).toHaveURL(new RegExp(`#/room/${name}`));
    await expect(playerRows(alice)).toHaveCount(1);
});
