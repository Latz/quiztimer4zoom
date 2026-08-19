import crypto from 'node:crypto';

/**
 * Builds a valid AES-256-GCM encrypted Zoom App Context header.
 * Matches the binary format that cipher.js expects:
 *   [ivLen(1)] [iv(12)] [aadLen(2 LE)] [aad] [cipherLen(4 LE)] [cipherText] [tag(16)]
 *
 * @param {Object} plaintext - The JSON object to encrypt
 * @param {string} secret - The client secret (used to derive the key via sha256)
 * @returns {{ header: string, secret: string, plaintext: Object }}
 */
export function buildCipherVector(plaintext, secret = 'test-client-secret') {
	const key = crypto.createHash('sha256').update(secret).digest();

	const iv = crypto.randomBytes(12);
	const aad = crypto.randomBytes(16);
	const plaintextStr = JSON.stringify(plaintext);

	const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
		.setAAD(aad)
		.setAutoPadding(false);

	const cipherText = Buffer.concat([
		cipher.update(plaintextStr, 'utf-8'),
		cipher.final(),
	]);
	const tag = cipher.getAuthTag();

	// Pack into binary buffer
	const ivLenBuf = Buffer.alloc(1);
	ivLenBuf.writeUInt8(iv.length);

	const aadLenBuf = Buffer.alloc(2);
	aadLenBuf.writeUInt16LE(aad.length);

	const cipherLenBuf = Buffer.alloc(4);
	cipherLenBuf.writeInt32LE(cipherText.length);

	const packed = Buffer.concat([ivLenBuf, iv, aadLenBuf, aad, cipherLenBuf, cipherText, tag]);

	return {
		header: packed.toString('base64'),
		secret,
		plaintext,
	};
}
