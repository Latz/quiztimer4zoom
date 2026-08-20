import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'node:crypto';

// Mock axios before importing zoom-api so all HTTP calls are intercepted
vi.mock('axios', () => {
	const mockAxios = vi.fn();
	return { default: mockAxios };
});

import axios from 'axios';
import { getInstallURL, getToken, refreshToken, getDeeplink } from '../../scripts/zoom-api.js';

const TOKEN_RESPONSE = {
	access_token: 'mock-access-token',
	token_type: 'bearer',
	refresh_token: 'mock-refresh-token',
	expires_in: 3600,
};

const DEEPLINK_RESPONSE = {
	deeplink: 'zoomus://zoom.us/wc/join/mock-deeplink',
};

beforeEach(() => {
	vi.clearAllMocks();
	// Default: resolve with token response for token calls, deeplink for deeplink calls
	axios.mockResolvedValue({ data: TOKEN_RESPONSE });
});

function base64URL(s) {
	return s.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

describe('scripts/zoom-api.js', () => {
	describe('getInstallURL()', () => {
		it('returns url, state, and verifier', () => {
			const result = getInstallURL();
			expect(result).toHaveProperty('url');
			expect(result).toHaveProperty('state');
			expect(result).toHaveProperty('verifier');
		});

		it('url points to Zoom OAuth authorize endpoint', () => {
			const { url } = getInstallURL();
			expect(url.href).toContain('zoom.us');
			expect(url.pathname).toBe('/oauth/authorize');
		});

		it('url has correct response_type=code', () => {
			const { url } = getInstallURL();
			expect(url.searchParams.get('response_type')).toBe('code');
		});

		it('url has correct client_id', () => {
			const { url } = getInstallURL();
			expect(url.searchParams.get('client_id')).toBe('test-client-id');
		});

		it('url uses S256 code_challenge_method', () => {
			const { url } = getInstallURL();
			expect(url.searchParams.get('code_challenge_method')).toBe('S256');
		});

		it('code_challenge matches SHA-256(verifier) base64url', () => {
			const { url, verifier } = getInstallURL();
			const digest = crypto.createHash('sha256').update(verifier).digest('base64');
			const expected = base64URL(digest);
			expect(url.searchParams.get('code_challenge')).toBe(expected);
		});

		it('state is a non-empty string', () => {
			const { state } = getInstallURL();
			expect(typeof state).toBe('string');
			expect(state.length).toBeGreaterThan(10);
		});

		it('successive calls produce unique state values', () => {
			const { state: s1 } = getInstallURL();
			const { state: s2 } = getInstallURL();
			expect(s1).not.toBe(s2);
		});

		it('successive calls produce unique verifier values', () => {
			const { verifier: v1 } = getInstallURL();
			const { verifier: v2 } = getInstallURL();
			expect(v1).not.toBe(v2);
		});
	});

	describe('getToken(code, verifier)', () => {
		it('resolves with access_token for valid inputs', async () => {
			const result = await getToken('valid-code', 'valid-verifier');
			expect(result).toHaveProperty('access_token', 'mock-access-token');
		});

		it('resolves with refresh_token', async () => {
			const result = await getToken('valid-code', 'valid-verifier');
			expect(result).toHaveProperty('refresh_token', 'mock-refresh-token');
		});

		it('throws for null code', async () => {
			await expect(getToken(null, 'verifier')).rejects.toThrow();
		});

		it('throws for non-string code', async () => {
			await expect(getToken(42, 'verifier')).rejects.toThrow();
		});

		it('throws for empty string code', async () => {
			await expect(getToken('', 'verifier')).rejects.toThrow();
		});

		it('throws for null verifier', async () => {
			await expect(getToken('code', null)).rejects.toThrow();
		});

		it('throws for empty string verifier', async () => {
			await expect(getToken('code', '')).rejects.toThrow();
		});
	});

	describe('refreshToken(token)', () => {
		it('resolves with a new access_token', async () => {
			const result = await refreshToken('valid-refresh-token');
			expect(result).toHaveProperty('access_token', 'mock-access-token');
		});

		it('throws for null token', async () => {
			await expect(refreshToken(null)).rejects.toThrow();
		});

		it('throws for empty string token', async () => {
			await expect(refreshToken('')).rejects.toThrow();
		});

		it('throws for non-string token', async () => {
			await expect(refreshToken(123)).rejects.toThrow();
		});
	});

	describe('getDeeplink(token)', () => {
		beforeEach(() => {
			axios.mockResolvedValue({ data: DEEPLINK_RESPONSE });
		});

		it('resolves to the deeplink string', async () => {
			const result = await getDeeplink('mock-access-token');
			expect(result).toBe('zoomus://zoom.us/wc/join/mock-deeplink');
		});

		it('returns a string', async () => {
			const result = await getDeeplink('mock-access-token');
			expect(typeof result).toBe('string');
		});
	});
});
