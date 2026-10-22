import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? 4173);
/** The visual tests get their own server: they need to start with an empty room list. */
const visualPort = port + 1;

const server = (serverPort: number) => ({
    command: 'node src/server/launcher.ts',
    env: { PORT: String(serverPort), DATABASE_FILE: ':memory:' },
    url: `http://localhost:${serverPort}`,
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore' as const
});

export default defineConfig({
    testDir: 'tests/e2e',
    timeout: 40_000,
    fullyParallel: false,
    workers: 1,
    reporter: process.env.CI ? 'github' : 'list',
    expect: {
        timeout: 7_000,
        toHaveScreenshot: { maxDiffPixelRatio: 0.02 }
    },
    snapshotPathTemplate: '{testDir}/__screenshots__/{testFileName}/{arg}{ext}',
    use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        launchOptions: {
            executablePath: process.env.CHROMIUM_PATH || undefined,
            args: ['--autoplay-policy=no-user-gesture-required']
        },
        trace: 'retain-on-failure'
    },
    projects: [
        {
            name: 'functional',
            testIgnore: 'visual.spec.ts',
            use: { baseURL: `http://localhost:${port}` }
        },
        {
            name: 'visual',
            testMatch: 'visual.spec.ts',
            use: { baseURL: `http://localhost:${visualPort}` }
        }
    ],
    // The built client (`npm run build`) is served by the real game server.
    webServer: [server(port), server(visualPort)]
});
