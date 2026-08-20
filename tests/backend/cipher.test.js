import { describe, it, expect } from 'vitest';
import { getAppContext, contextHeader } from '../../scripts/cipher.js';
import { buildCipherVector } from '../helpers/cipher-vectors.js';

describe('scripts/cipher.js', () => {
	describe('contextHeader', () => {
		it('is x-zoom-app-context', () => {
			expect(contextHeader).toBe('x-zoom-app-context');
		});
	});

	describe('getAppContext', () => {
		it('decrypts a valid context header', () => {
			const payload = { uid: 'user-123', mid: 'meeting-456', typ: 1 };
			const { header, secret } = buildCipherVector(payload, 'test-client-secret');

			const result = getAppContext(header, secret);

			expect(result).toEqual(payload);
		});

		it('decrypts nested JSON objects', () => {
			const payload = { user: { id: 'u1', name: 'Alice' }, meta: { version: 2 } };
			const { header, secret } = buildCipherVector(payload, 'test-client-secret');

			const result = getAppContext(header, secret);

			expect(result).toEqual(payload);
		});

		it('uses zoomApp.clientSecret when no secret is passed', () => {
			const payload = { uid: 'abc' };
			// global-setup sets ZM_CLIENT_SECRET=test-client-secret
			const { header } = buildCipherVector(payload, 'test-client-secret');

			const result = getAppContext(header); // no secret arg

			expect(result).toEqual(payload);
		});

		it('throws when the secret is wrong (GCM auth tag mismatch)', () => {
			const { header } = buildCipherVector({ uid: 'x' }, 'correct-secret');

			expect(() => getAppContext(header, 'wrong-secret')).toThrow();
		});

		it('throws when header is null', () => {
			expect(() => getAppContext(null)).toThrow();
		});

		it('throws when header is undefined', () => {
			expect(() => getAppContext(undefined)).toThrow();
		});

		it('throws when header is an empty string', () => {
			expect(() => getAppContext('')).toThrow();
		});

		it('throws when header is not a string', () => {
			expect(() => getAppContext(42)).toThrow();
		});

		it('throws when header is malformed base64', () => {
			expect(() => getAppContext('not-a-real-context!!')).toThrow();
		});
	});
});
