import { defineConfig } from '@playwright/test';

// Headless Chromium renders WebGL in software (SwiftShader) by default; with several workers the
// parallax layers then drop frames and the physics tests flake. On Windows, render on the real GPU.
const gpuArgs = process.platform === 'win32' ? ['--use-angle=d3d11', '--ignore-gpu-blocklist'] : [];
// Tests never make a sound (the specs read the sfx log and music state, not audio output).
const muteArgs = ['--mute-audio'];

export default defineConfig({
    testDir: 'tests/e2e',
    // Physics tests feed input per frame; with more parallel browsers frames stretch and they flake.
    workers: 2,
    use: {
        baseURL: 'http://localhost:8080',
        launchOptions: { args: [...gpuArgs, ...muteArgs] }
    },
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:8080',
        reuseExistingServer: true
    }
});
