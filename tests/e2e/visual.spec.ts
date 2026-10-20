import { expect, test, type Page } from '@playwright/test';
import { createRoom, joinRoom, openPlayer, playerRows, roomName } from './helpers';

/**
 * Visual regression tests: the look of the game must not change when the front-end is refactored.
 * The baselines were taken on Linux (headless Chromium, no web font), update them with
 * `npx playwright test visual --update-snapshots` when the design is changed on purpose.
 */
test.skip(process.platform !== 'linux', 'Baselines are rendered on Linux');
test.use({ launchOptions: { args: ['--font-render-hinting=none', '--disable-lcd-text'] } });

const snapshotOptions = (page: Page, masked: string[] = []) => ({
    animations: 'disabled' as const,
    mask: masked.map((selector) => page.locator(selector)),
    maskColor: '#ff00ff'
});

test('room list', async ({ browser }) => {
    const page = await openPlayer(browser, 'Alice', { color: '#ff0000' });

    await page.goto('/');
    await expect(page.locator('.room-list')).toBeVisible();

    await expect(page).toHaveScreenshot('room-list.png', snapshotOptions(page, ['.tuto .circle', '#rooms', '.title']));
});

test('about', async ({ browser }) => {
    const page = await openPlayer(browser, 'Alice', { color: '#ff0000' });

    await page.goto('/#/about');
    await expect(page.locator('#about')).toBeVisible();
    await page.waitForFunction(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0));

    await expect(page).toHaveScreenshot('about.png', snapshotOptions(page, ['#about img']));
});

test('profile panel', async ({ browser }) => {
    const page = await openPlayer(browser, 'Alice', { color: '#ff0000' });

    await page.goto('/');
    await page.locator('.profile-link').click();
    await expect(page.locator('.panel')).toHaveClass(/active/);
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot(
        'profile-panel.png',
        snapshotOptions(page, ['.tuto .circle', '#rooms', '.title'])
    );
});

test('color picker', async ({ browser }) => {
    const page = await openPlayer(browser, 'Alice', { color: '#336699' });

    await page.goto('/');
    await page.locator('.profile-link').click();
    await expect(page.locator('.panel')).toHaveClass(/active/);
    await page.waitForTimeout(500);
    await page.locator('#profile-color').click();
    await expect(page.locator('.colorpicker')).toBeVisible();

    // The profile panel is fixed on the right, the picker opens below the color field
    await expect(page).toHaveScreenshot('color-picker.png', {
        ...snapshotOptions(page),
        clip: { x: 780, y: 100, width: 500, height: 380 }
    });
});

test('first visit profile tutorial', async ({ browser }) => {
    const page = await openPlayer(browser, 'Nobody', { profile: false });

    await page.goto('/');
    await page.locator('.top-right-form input[name=name]').fill(roomName('first'));
    await page.keyboard.press('Enter');
    await expect(page.locator('.profile-tuto')).toHaveClass(/active/);
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('profile-tutorial.png', snapshotOptions(page, ['#profile #profile-color']));
});

test('room and parameters', async ({ browser }) => {
    const name = roomName('visual');
    const alice = await openPlayer(browser, 'Alice', { color: '#ff0000' });
    const bob = await openPlayer(browser, 'Bob', { color: '#0000ff' });

    await createRoom(alice, name);
    await joinRoom(bob, name);
    await expect(playerRows(alice)).toHaveCount(2);
    await bob.locator('tr.local .player-ready').click();
    await expect(alice.locator('tr:not(.local) .player-ready.ready')).toBeVisible();

    const masked = ['.room h2.header', '#chat-feed'];

    await expect(alice).toHaveScreenshot('room.png', snapshotOptions(alice, masked));

    await alice.locator('.icon-params').click();
    await alice.locator('.preset', { hasText: 'All' }).click();
    await expect(alice.locator('.preset.active')).toHaveText('All');
    await alice.waitForTimeout(500);

    await expect(alice).toHaveScreenshot('room-parameters.png', snapshotOptions(alice, masked));
    await expect(bob).toHaveScreenshot('room-as-guest.png', snapshotOptions(bob, masked));
});

test('game screen', async ({ browser }) => {
    const name = roomName('visual');
    const alice = await openPlayer(browser, 'Alice', { color: '#ff0000' });
    const bob = await openPlayer(browser, 'Bob', { color: '#0000ff' });

    await createRoom(alice, name);
    await joinRoom(bob, name);
    await expect(playerRows(alice)).toHaveCount(2);
    await alice.locator('tr.local .player-ready').click();
    await bob.locator('tr.local .player-ready').click();
    await expect(alice).toHaveURL(new RegExp(`#/game/${name}`));
    await expect(alice.locator('.game-players .player')).toHaveCount(2);

    await expect(alice).toHaveScreenshot(
        'game.png',
        snapshotOptions(alice, [
            '#game-infos h3',
            '#render',
            '#warmup',
            '#chat-feed',
            '#kill-log-feed',
            '#game-infos footer'
        ])
    );
});
