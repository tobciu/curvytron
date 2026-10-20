import { expect, test } from '@playwright/test';
import { createRoom, openPlayer, roomName } from './helpers';

test('asks for a profile before joining a room', async ({ browser }) => {
    const page = await openPlayer(browser, 'Nobody', { profile: false });
    const name = roomName('profile');

    await page.goto('/');
    await expect(page.locator('.profile-link .name')).toContainText("What's your name?");

    await page.locator('.top-right-form input[name=name]').fill(name);
    await page.keyboard.press('Enter');

    await expect(page.locator('.panel')).toHaveClass(/active/);
    await expect(page.locator('.profile-tuto')).toHaveClass(/active/);
    await expect(page.locator('.profile-tuto .item.first')).not.toHaveClass(/done/);

    // The profile can not be closed while incomplete
    await page.locator('.btn-save').click();
    await expect(page.locator('.panel')).toHaveClass(/active/);

    await page.locator('#profile-name').fill('Alice');
    await page.locator('#profile-name').blur();
    await expect(page.locator('.profile-tuto .item.first')).toHaveClass(/done/);

    await page.locator('.btn-save').click();

    await expect(page.locator('.panel')).not.toHaveClass(/active/);
    await expect(page.locator('.profile-link .name')).toHaveText('Alice');
    await expect(page.locator('.room-players tr.local input.player-name')).toHaveValue('Alice');
});

test('profile survives a reload', async ({ browser }) => {
    const page = await openPlayer(browser, 'Alice');

    await page.goto('/');
    await page.locator('.profile-link').click();
    await expect(page.locator('.panel')).toHaveClass(/active/);

    await page.locator('#profile-name').fill('Zorro');
    await page.locator('#profile-name').blur();

    await page.reload();

    await expect(page.locator('.profile-link .name')).toHaveText('Zorro');
    expect(await page.evaluate(() => JSON.parse(window.localStorage.getItem('PROFILE') as string).name)).toBe('Zorro');
});

test('picks a color with the color picker', async ({ browser }) => {
    const page = await openPlayer(browser, 'Alice', { color: '#ff0000' });

    await page.goto('/');
    await page.locator('.profile-link').click();

    const input = page.locator('#profile-color');

    await expect(input).toHaveValue('#ff0000');
    await expect(page.locator('.colorpicker')).toBeHidden();

    await input.click();
    await expect(page.locator('.colorpicker')).toBeVisible();

    // Click the middle of the hue slider: the color changes
    const hue = page.locator('.colorpicker colorpicker-hue');
    const box = (await hue.boundingBox())!;

    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(input).not.toHaveValue('#ff0000');
    await expect(input).toHaveValue(/^#[0-9a-f]{6}$/);

    // Typing a color works too
    await input.fill('#00ff00');
    await input.blur();
    await expect(input).toHaveCSS('border-top-color', 'rgb(0, 255, 0)');
    await expect(page.locator('.profile-link .circle')).toHaveCSS('background-color', 'rgb(0, 255, 0)');
});

test('toggles sound and radio', async ({ browser }) => {
    const page = await openPlayer(browser, 'Alice');

    await page.goto('/');
    await page.locator('.profile-link').click();

    const sound = page.locator('#profile-sound');
    const radio = page.locator('#profile-radio');

    await expect(sound).not.toHaveClass(/active/);
    await expect(radio).not.toHaveClass(/active/);

    await sound.click();
    await expect(sound).toHaveClass(/active/);

    await radio.click();
    await expect(radio).toHaveClass(/active/);

    const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem('PROFILE') as string));

    expect(stored).toMatchObject({ sound: true, radio: true });
});

test('re-assigns controls', async ({ browser }) => {
    const page = await openPlayer(browser, 'Alice');

    await page.goto('/');
    await page.locator('.profile-link').click();

    const left = page.locator('#profile-controls-0');
    const before = await left.inputValue();

    await left.focus();
    await expect(left).toHaveClass(/active/);
    await page.keyboard.press('a');

    await expect(left).not.toHaveClass(/active/);
    await expect(left).not.toHaveValue(before);
    await expect(left).toHaveValue(/a/i);

    const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem('PROFILE') as string).controls);

    expect(stored[0]).toEqual({ mapper: 'keyboard', value: 65 });
});

test('the profile panel opens and closes from the link', async ({ browser }) => {
    const page = await openPlayer(browser, 'Alice');

    await createRoom(page, roomName('panel'));

    await page.locator('.profile-link').click();
    await expect(page.locator('.panel')).toHaveClass(/active/);

    await page.locator('.profile-form .close').click();
    await expect(page.locator('.panel')).not.toHaveClass(/active/);
});
