import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? 4173);

export default defineConfig({
    testDir: 'tests/e2e',
    timeout: 60_000,
    fullyParallel: false,
    workers: 1,
    reporter: process.env.CI ? 'github' : 'list',
    expect: {
        toHaveScreenshot: { maxDiffPixelRatio: 0.02 }
    },
    snapshotPathTemplate: '{testDir}/__screenshots__/{testFileName}/{arg}{ext}',
    use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${port}`,
        viewport: { width: 1280, height: 800 },
        launchOptions: {
            executablePath: process.env.CHROMIUM_PATH || undefined,
            args: ['--autoplay-policy=no-user-gesture-required']
        },
        trace: 'retain-on-failure'
    },
    // The built client (`npm run build`) is served by the real game server.
    webServer: {
        command: 'node src/server/launcher.js',
        env: { PORT: String(port) },
        url: `http://localhost:${port}`,
        reuseExistingServer: !process.env.CI,
        stdout: 'ignore'
    }
});
