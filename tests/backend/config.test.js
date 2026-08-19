import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('scripts/config.js', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('exports appName as quiztimer4zoom', async () => {
		const { appName } = await import('../../scripts/config.js');
		expect(appName).toBe('quiztimer4zoom');
	});

	it('exports port as 3000', async () => {
		const { port } = await import('../../scripts/config.js');
		expect(port).toBe(3000);
	});

	it('exports zoomApp with values from env vars', async () => {
		const { zoomApp } = await import('../../scripts/config.js');
		expect(zoomApp.clientId).toBe('test-client-id');
		expect(zoomApp.clientSecret).toBe('test-client-secret');
		expect(zoomApp.redirectUrl).toBe('http://localhost:3000/auth');
		expect(zoomApp.sessionSecret).toBe('test-session-secret-32-chars-long!!');
	});

	it('zoomApp has a host property', async () => {
		const { zoomApp } = await import('../../scripts/config.js');
		expect(zoomApp).toHaveProperty('host');
		expect(typeof zoomApp.host).toBe('string');
	});

	it('zoomApp.host picks up overridden env var', async () => {
		vi.stubEnv('ZM_CLIENT_ID', 'overridden-id');
		const { zoomApp } = await import('../../scripts/config.js');
		expect(zoomApp.clientId).toBe('overridden-id');
		vi.unstubAllEnvs();
	});
});
