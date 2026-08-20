import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import request from 'supertest';
import { getInstallURL, getToken, getDeeplink } from '../../scripts/zoom-api.js';
import { getAppContext } from '../../scripts/cipher.js';

vi.mock('../../scripts/zoom-api.js', () => ({
	getInstallURL: vi.fn(() => ({
		url: new URL('https://zoom.us/oauth/authorize?response_type=code&client_id=test'),
		state: 'mock-state-value',
		verifier: 'mock-verifier-value',
	})),
	getToken: vi.fn(() => Promise.resolve({ access_token: 'mock-access-token' })),
	getDeeplink: vi.fn(() => Promise.resolve('zoomus://zoom.us/wc/join/mock-deeplink')),
}));

vi.mock('../../scripts/cipher.js', () => ({
	getAppContext: vi.fn(() => ({ uid: 'test-user', mid: 'test-meeting' })),
	contextHeader: 'x-zoom-app-context',
}));

let app;

beforeAll(async () => {
	const mod = await import('../../api/index.js');
	app = mod.default;
});

afterEach(() => {
	getInstallURL.mockClear();
	getToken.mockClear();
	getDeeplink.mockClear();
	getAppContext.mockClear();
});

/**
 * Runs the /install route and returns its signed session cookie(s).
 * /auth reads state/verifier from the signed session, so tests must
 * establish a real session rather than setting plain cookies.
 *
 * @returns {Promise<string[]>} Cookie header values for a follow-up request
 */
async function startInstallSession() {
	const res = await request(app).get('/install');
	const setCookie = res.headers['set-cookie'] || [];
	return setCookie.map(c => c.split(';')[0]);
}

describe('Express server', () => {
	describe('GET /', () => {
		it('returns 200 without zoom context header', async () => {
			const res = await request(app).get('/');
			expect(res.status).toBe(200);
		});

		it('returns html content-type', async () => {
			const res = await request(app).get('/');
			expect(res.headers['content-type']).toMatch(/html/);
		});

		it('sets cache-control: no-store', async () => {
			const res = await request(app).get('/');
			expect(res.headers['cache-control']).toMatch(/no-store/);
		});

		it('returns 200 with valid zoom context header', async () => {
			const res = await request(app)
				.get('/')
				.set('x-zoom-app-context', 'mock-context-header');
			expect(res.status).toBe(200);
		});

		it('injects nonce into response when zoom context present', async () => {
			const res = await request(app)
				.get('/')
				.set('x-zoom-app-context', 'mock-context-header');
			expect(res.text).toMatch(/nonce=/);
		});

		it('propagates errors from getAppContext to the error handler', async () => {
			getAppContext.mockImplementationOnce(() => {
				throw new Error('boom');
			});
			const res = await request(app)
				.get('/')
				.set('x-zoom-app-context', 'mock-context-header');
			expect(res.status).toBe(500);
			expect(res.body.error).toBe('boom');
		});
	});

	describe('GET /install', () => {
		it('redirects to Zoom OAuth URL', async () => {
			const res = await request(app).get('/install');
			expect(res.status).toBe(302);
			expect(res.headers.location).toContain('zoom.us');
		});

		it('sets a signed session cookie with httpOnly', async () => {
			const res = await request(app).get('/install');
			const cookies = res.headers['set-cookie'];
			expect(cookies).toBeDefined();
			const sessionCookie = cookies.find(c => c.startsWith('session='));
			expect(sessionCookie).toBeTruthy();
			expect(sessionCookie).toMatch(/httponly/i);
		});

		it('sets the session cookie with SameSite=Lax', async () => {
			const res = await request(app).get('/install');
			const cookies = res.headers['set-cookie'];
			const sessionCookie = cookies.find(c => c.startsWith('session='));
			expect(sessionCookie).toMatch(/samesite=lax/i);
		});

		it('does NOT expose state/verifier as unsigned plain cookies', async () => {
			// Regression guard: mirroring these into plain cookies made the
			// CSRF state check forgeable.
			const res = await request(app).get('/install');
			const cookies = res.headers['set-cookie'] || [];
			expect(cookies.find(c => c.startsWith('verifier='))).toBeUndefined();
			expect(cookies.find(c => c.startsWith('state='))).toBeUndefined();
		});

		it('propagates errors from getInstallURL to the error handler', async () => {
			getInstallURL.mockImplementationOnce(() => {
				throw new Error('install boom');
			});
			const res = await request(app).get('/install');
			expect(res.status).toBe(500);
			expect(res.body.error).toBe('install boom');
		});
	});

	describe('GET /auth', () => {
		it('returns 400 when code is missing', async () => {
			const res = await request(app)
				.get('/auth')
				.set('Cookie', ['verifier=mock-verifier', 'state=mock-state']);
			expect(res.status).toBe(400);
			expect(res.body.error).toBe('Missing required parameters');
		});

		it('returns 400 when state query param is missing', async () => {
			const sessionCookie = await startInstallSession();
			const res = await request(app).get('/auth?code=somecode').set('Cookie', sessionCookie);
			expect(res.status).toBe(400);
			expect(res.body.error).toBe('Missing required parameters');
		});

		it('returns 400 when there is no session (state/verifier absent)', async () => {
			const res = await request(app).get('/auth?code=somecode&state=somestate');
			expect(res.status).toBe(400);
			expect(res.body.error).toBe('Missing required parameters');
		});

		it('returns 403 when state does not match the session', async () => {
			const sessionCookie = await startInstallSession();
			const res = await request(app).get('/auth?code=somecode&state=different-state').set('Cookie', sessionCookie);
			expect(res.status).toBe(403);
			expect(res.body.error).toBe('Invalid state parameter');
		});

		it('ignores attacker-supplied plain cookies (CSRF protection)', async () => {
			// No session established; forged plain cookies must not be trusted.
			const res = await request(app)
				.get('/auth?code=valid-code&state=forged-state')
				.set('Cookie', ['verifier=forged-verifier', 'state=forged-state']);
			expect(res.status).toBe(400);
			expect(res.body.error).toBe('Missing required parameters');
		});

		it('redirects to deeplink when all params are valid', async () => {
			const sessionCookie = await startInstallSession();
			const res = await request(app).get('/auth?code=valid-code&state=mock-state-value').set('Cookie', sessionCookie);
			expect(res.status).toBe(302);
			expect(res.headers.location).toBe('zoomus://zoom.us/wc/join/mock-deeplink');
		});

		it('returns 500 when getToken resolves without an access_token', async () => {
			getToken.mockResolvedValueOnce({});
			const sessionCookie = await startInstallSession();
			const res = await request(app).get('/auth?code=valid-code&state=mock-state-value').set('Cookie', sessionCookie);
			expect(res.status).toBe(500);
			expect(res.body.error).toBe('Failed to obtain access token');
		});

		it('propagates errors from getToken to the error handler', async () => {
			getToken.mockRejectedValueOnce(new Error('token exchange failed'));
			const sessionCookie = await startInstallSession();
			const res = await request(app).get('/auth?code=valid-code&state=mock-state-value').set('Cookie', sessionCookie);
			expect(res.status).toBe(500);
			expect(res.body.error).toBe('token exchange failed');
		});

		it('propagates errors from getDeeplink to the error handler', async () => {
			getDeeplink.mockRejectedValueOnce(new Error('deeplink failed'));
			const sessionCookie = await startInstallSession();
			const res = await request(app).get('/auth?code=valid-code&state=mock-state-value').set('Cookie', sessionCookie);
			expect(res.status).toBe(500);
			expect(res.body.error).toBe('deeplink failed');
		});
	});

	describe('validateInput middleware', () => {
		it('returns 400 when code is longer than 500 chars', async () => {
			const longCode = 'a'.repeat(501);
			const res = await request(app).get(`/auth?code=${longCode}&state=s`)
				.set('Cookie', ['verifier=v', 'state=s']);
			expect(res.status).toBe(400);
			expect(res.body.error).toBe('Code parameter too long');
		});

		it('returns 400 when code is supplied as an object (non-string)', async () => {
			// The array case (code[]=a&code[]=b) is unreachable here: the HTTP
			// parameter pollution middleware collapses arrays to their first
			// value before validateInput runs. An object-shaped query param
			// survives that middleware and reaches the non-string check.
			const res = await request(app).get('/auth?code[a]=1&state=s')
				.set('Cookie', ['verifier=v', 'state=s']);
			expect(res.status).toBe(400);
			expect(res.body.error).toBe('Invalid code parameter');
		});
	});

	describe('HTTP parameter pollution middleware', () => {
		it('keeps only the first value when a query param is duplicated', async () => {
			const res = await request(app).get('/auth?code=first&code=second&state=s')
				.set('Cookie', ['verifier=v', 'state=s']);
			// Duplicate `code` is collapsed to a single string before validateInput
			// runs, so this must not hit the "Invalid code parameter" (array) branch.
			expect(res.body.error).not.toBe('Invalid code parameter');
		});
	});

	describe('404 handler', () => {
		it('returns 404 for unknown routes', async () => {
			const res = await request(app).get('/does-not-exist');
			expect(res.status).toBe(404);
			expect(res.body.error).toBe('Not Found');
		});
	});
});
