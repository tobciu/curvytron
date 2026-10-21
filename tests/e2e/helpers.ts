import { expect, type Browser, type Page } from '@playwright/test';

let counter = 0;

/** Unique room name, the server keeps rooms of previous tests alive for a while. */
export function roomName(prefix = 'room'): string {
    return `${prefix}${Date.now() % 100000}${counter++}`;
}

/**
 * Open a page of a new "player": own browser context, profile already filled in
 * (so the profile panel does not open), web font blocked (offline determinism).
 */
export async function openPlayer(
    browser: Browser,
    name: string,
    options: { color?: string; profile?: boolean } = {}
): Promise<Page> {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    await page.route('**/fonts.googleapis.com/**', (route) => route.abort());
    // Remote avatars of the about page: same size whatever the network is
    await page.route('**/gravatar.com/**', (route) =>
        route.fulfill({
            contentType: 'image/svg+xml',
            body: '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="#888"/></svg>'
        })
    );

    if (options.profile !== false) {
        const profile = { name, color: options.color ?? '#ff0000', sound: false };

        await page.addInitScript((value) => {
            if (!window.localStorage.getItem('PROFILE')) {
                window.localStorage.setItem('PROFILE', JSON.stringify(value));
            }
        }, profile);
    }

    return page;
}

/** Create a room from the room list, the browser ends up inside it. */
export async function createRoom(page: Page, name: string): Promise<void> {
    await page.goto('/');
    await page.locator('.top-right-form input[name=name]').fill(name);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`#/room/${name}$`));
    await expect(page.locator('.room h2.header')).toContainText(name.toUpperCase(), { ignoreCase: true });
}

/** Join an existing room from the room list. */
export async function joinRoom(page: Page, name: string): Promise<void> {
    await page.goto('/');
    await page.locator('#rooms tr.room', { hasText: name }).click();
    await expect(page).toHaveURL(new RegExp(`#/(room|game)/${name}$`));
}

export function playerRows(page: Page) {
    return page.locator('.room-players tbody tr:not(:has(td.empty))');
}

/** Add a local player to the current room. */
export async function addLocalPlayer(page: Page, name: string): Promise<void> {
    const before = await page.locator('.room-players tr.local').count();

    await page.locator('#add-user-name').fill(name);
    await page.keyboard.press('Enter');
    await expect(page.locator('.room-players tr.local')).toHaveCount(before + 1);
}

/** Toggle the ready state of every local player (they are all expected to be not ready yet). */
export async function readyAll(page: Page): Promise<void> {
    const rows = page.locator('.room-players tr.local');
    const count = await rows.count();

    for (let index = 0; index < count; index++) {
        await rows.nth(index).locator('.player-ready').click();
    }
}
