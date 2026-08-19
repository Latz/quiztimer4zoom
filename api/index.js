/**
 * QuizTimer for Zoom - Express Server
 *
 * This server handles the OAuth flow for the Zoom App and serves the
 * QuizTimer application interface. It implements security best practices
 * including rate limiting, CSP headers, input validation, and secure sessions.
 *
 * @module api/index
 */

import express from 'express';
import cookieSession from 'cookie-session';
import { getInstallURL, getToken, getDeeplink } from '../scripts/zoom-api.js';
import { getAppContext } from '../scripts/cipher.js';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'node:path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import crypto from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Computes an MD5 hash for a file to use in cache-busting URLs
 *
 * Generates a short hash based on file content that changes when the file
 * is modified, forcing browsers to download the updated version.
 *
 * @param {string} filePath - Absolute path to the file to hash
 * @returns {string} 8-character hash string, or timestamp on error
 */
function getFileHash(filePath) {
	try {
		const content = fs.readFileSync(filePath);
		return crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
	} catch (error) {
		console.error(`Error computing hash for ${filePath}:`, error);
		return Date.now().toString(); // Fallback to timestamp if file read fails
	}
}

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

// Load environment variables from appropriate .env file
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: envFile });

// Validate required environment variables are present
const requiredEnvVars = ['SESSION_SECRET', 'ZM_CLIENT_ID', 'ZM_CLIENT_SECRET', 'ZM_REDIRECT_URL'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
	throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

/**
 * Zoom App configuration object
 * Contains OAuth credentials and endpoints
 */
const zoomApp = {
	host: 'https://zoom.us',
	sessionSecret: process.env.SESSION_SECRET,
	zoomClientId: process.env.ZM_CLIENT_ID,
	zoomClientSecret: process.env.ZM_CLIENT_SECRET,
	redirectUrl: process.env.ZM_REDIRECT_URL,
};

const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// ============================================================================
// EXPRESS APP INITIALIZATION & SECURITY MIDDLEWARE
// ============================================================================

const app = express();

// Trust Vercel's proxy so req.ip reflects the real client address.
// Without this every request shares the proxy's IP and the rate limiters
// below become global caps instead of per-client ones.
app.set('trust proxy', 1);

// Apply security headers (XSS protection, no-sniff, frameguard, etc.)
app.use(helmet());

/**
 * Middleware: Prevent HTTP Parameter Pollution
 * Sanitizes query parameters to prevent attacks using duplicate parameter names
 */
app.use((req, res, next) => {
	for (const key in req.query) {
		if (Array.isArray(req.query[key])) {
			req.query[key] = req.query[key][0]; // Keep only first value
		}
	}
	next();
});

// Limit request body size to prevent large payload attacks (DoS protection)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: true }));

/**
 * Middleware: Request timeout protection
 * Ensures requests don't hang indefinitely (30 second limit)
 */
app.use((req, res, next) => {
	req.setTimeout(30000);
	res.setTimeout(30000);
	next();
});

// ============================================================================
// RATE LIMITING CONFIGURATION
// ============================================================================

// Tests drive many requests from a single IP; skip limiting there so the
// limiters can stay strict in production.
const isTest = process.env.NODE_ENV === 'test';

/**
 * Rate limiter for authentication endpoints
 * Allows 5 requests per 15-minute window to prevent brute force attacks
 */
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 5, // 5 requests per window
	message: 'Too many requests, please try again later',
	standardHeaders: true,
	legacyHeaders: false,
	skip: () => isTest,
});

/**
 * Rate limiter for installation endpoint
 * Allows 20 requests per hour for app installation flow
 */
const installLimiter = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hour
	max: 20,
	standardHeaders: true,
	legacyHeaders: false,
	skip: () => isTest,
});

/**
 * Middleware: Disable caching for dynamic content
 * Sets headers to prevent browser and proxy caching
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function noCacheMiddleware(req, res, next) {
	res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
	res.setHeader('Pragma', 'no-cache');
	res.setHeader('Expires', '0');
	res.setHeader('Surrogate-Control', 'no-store');
	next();
}

// ============================================================================
// STATIC FILE SERVING & COOKIE CONFIGURATION
// ============================================================================

/**
 * Serve static files from public directory with proper MIME types
 * Sets cache headers appropriately for production vs development
 */
app.use(
	express.static(path.join(__dirname, '../public'), {
		setHeaders: (res, filepath) => {
			// Explicitly set MIME types to prevent browser misinterpretation
			if (filepath.endsWith('.js')) {
				res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
			} else if (filepath.endsWith('.css')) {
				res.setHeader('Content-Type', 'text/css; charset=utf-8');
			} else if (filepath.endsWith('.html')) {
				res.setHeader('Content-Type', 'text/html; charset=utf-8');
			}
		},
		maxAge: isProduction ? '1d' : 0, // Cache for 1 day in production, no cache in dev
	})
);

app.use(cookieParser());
app.use(noCacheMiddleware);

// ============================================================================
// SESSION CONFIGURATION
// ============================================================================

/**
 * Session configuration for OAuth state management
 * Uses encrypted cookies with 24-hour expiration
 */
const sessionConfig = {
	name: 'session',
	httpOnly: true, // Prevent client-side JavaScript access
	keys: [zoomApp.sessionSecret],
	maxAge: 24 * 60 * 60 * 1000, // 24 hours
	secure: isProduction, // HTTPS only in production
	sameSite: 'lax', // lax allows cookies on OAuth top-level redirects (strict breaks cross-site callbacks)
	overwrite: true,
};

const session = cookieSession(sessionConfig);

// ============================================================================
// INPUT VALIDATION MIDDLEWARE
// ============================================================================

/**
 * Middleware: Validate and sanitize request inputs
 * Prevents injection attacks and validates OAuth code parameter
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function validateInput(req, res, next) {
	// Validate OAuth code parameter type
	if (req.query.code && typeof req.query.code !== 'string') {
		return res.status(400).json({ error: 'Invalid code parameter' });
	}
	// Limit code length to prevent buffer overflow attacks
	if (req.query.code && req.query.code.length > 500) {
		return res.status(400).json({ error: 'Code parameter too long' });
	}
	next();
}

app.use(validateInput);

// ============================================================================
// ROUTES
// ============================================================================

/**
 * Route: Home/Main Application Entry Point
 * GET /
 *
 * Serves the QuizTimer application if accessed from within Zoom.
 * Implements Content Security Policy with nonce for inline scripts
 * and cache-busting for static assets.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
app.get('/', async (req, res, next) => {
	try {
		// Check if request is coming from Zoom App
		const header = req.header('x-zoom-app-context');
		const isZoom = header && getAppContext(header);

		if (isZoom) {
			// Generate cryptographic nonce for Content Security Policy
			const nonce = crypto.randomBytes(16).toString('base64');

			// Read HTML template from file system
			const htmlPath = path.join(__dirname, '/quiztimer.html');
			let html = fs.readFileSync(htmlPath, 'utf8');

			// Compute file hashes for cache busting (ensures users get latest version)
			const stylesCssHash = getFileHash(path.join(__dirname, '../public/styles.css'));
			const quiztimerScriptHash = getFileHash(path.join(__dirname, '../public/quiztimer-script.js'));
			const sdkHash = getFileHash(path.join(__dirname, '../scripts/sdk.js'));
			const animationsHash = getFileHash(path.join(__dirname, '../public/animations.js'));

			// Replace static hash placeholders with actual content hashes
			html = html.replace(/styles\.css\?v=[a-f0-9]+/g, `styles.css?v=${stylesCssHash}`);
			html = html.replace(/quiztimer-script\.js\?v=[a-f0-9]+/g, `quiztimer-script.js?v=${quiztimerScriptHash}`);
			html = html.replace(/sdk\.js\?v=[a-f0-9]+/g, `sdk.js?v=${sdkHash}`);
			html = html.replace(/animations\.js\?v=[a-f0-9]+/g, `animations.js?v=${animationsHash}`);

			// Inject nonce into inline script tags for CSP compliance
			html = html.replace(/<script>/g, `<script nonce="${nonce}">`);

			// Set Content Security Policy header with generated nonce
			res.setHeader('Content-Security-Policy', `script-src 'self' 'nonce-${nonce}'`);
			res.setHeader('Content-Type', 'text/html; charset=utf-8');
			res.send(html);
		} else {
			// Not accessed from Zoom - show installation instructions
			res.status(200).send('Please <a href="/install">click here</a> to install.');
		}
	} catch (error) {
		next(error);
	}
});

/**
 * Route: OAuth Installation Flow
 * GET /install
 *
 * Initiates the Zoom OAuth flow by redirecting to Zoom's authorization page.
 * Uses PKCE (Proof Key for Code Exchange) for enhanced security.
 * Stores state and verifier in session for validation in callback.
 *
 * Rate limited to 20 requests per hour per IP.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
app.get('/install', installLimiter, session, async (req, res, next) => {
	try {
		// Generate OAuth authorization URL with PKCE parameters
		const { url, state, verifier } = getInstallURL();

		// Store OAuth state and PKCE verifier in the signed session.
		// These must NOT be mirrored into plain cookies: unsigned cookies are
		// attacker-controllable, which would let a forged request satisfy the
		// CSRF state check in /auth.
		req.session.state = state;
		req.session.verifier = verifier;

		// Redirect user to Zoom's OAuth authorization page
		res.redirect(url.href);
	} catch (error) {
		next(error);
	}
});

/**
 * Route: OAuth Callback Handler
 * GET /auth
 *
 * Handles the OAuth callback from Zoom after user authorization.
 * Exchanges authorization code for access token using PKCE verifier.
 * Creates deeplink to open the app within Zoom client.
 *
 * Rate limited to 5 requests per 15 minutes per IP.
 *
 * @param {Object} req - Express request object (expects code in query)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
app.get('/auth', limiter, session, async (req, res, next) => {
	try {
		const code = req.query.code;
		const state = req.query.state;

		// Read state/verifier from the signed session, never from plain cookies,
		// so the CSRF check can't be satisfied by attacker-supplied values.
		const verifier = req.session?.verifier || '';
		const storedState = req.session?.state || '';

		if (!code || !state || !verifier || !storedState) {
			return res.status(400).json({ error: 'Missing required parameters' });
		}

		if (state !== storedState) {
			return res.status(403).json({ error: 'Invalid state parameter' });
		}

		// Single-use: clear the state/verifier so the callback can't be replayed
		req.session.state = null;
		req.session.verifier = null;

		// Exchange authorization code for access token using PKCE verifier
		const { access_token: accessToken } = await getToken(code, verifier);

		if (!accessToken) {
			throw new Error('Failed to obtain access token');
		}

		// Generate deeplink URL to open app within Zoom client
		const deeplink = await getDeeplink(accessToken);
		res.redirect(deeplink);
	} catch (error) {
		next(error);
	}
});

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================

/**
 * Global error handler middleware
 * Catches all errors from routes and other middleware
 * Logs errors and returns appropriate response based on environment
 *
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} _next - Express next middleware function (unused but required for Express error handler signature)
 */
app.use((err, req, res, _next) => {
	const status = err.status || err.statusCode || 500;
	const message = err.message || 'Internal Server Error';

	// Log error with timestamp for debugging. Keep the stack in the server logs
	// (it is never sent to the client in production) so failures stay diagnosable.
	console.error(`[${new Date().toISOString()}] Error:`, err.stack || message);

	// In production, hide detailed error messages from users
	if (isProduction) {
		res.status(status).json({ error: 'An error occurred' });
	} else {
		// In development, provide detailed error information
		res.status(status).json({ error: message, stack: err.stack });
	}
});

/**
 * 404 Not Found handler
 * Catches all requests to undefined routes
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
app.use((req, res) => {
	res.status(404).json({ error: 'Not Found' });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

/**
 * Starts the Express server on the configured port
 * Logs startup information including port and environment
 */
const startServer = () => {
	app.listen(port, () => {
		console.log(`[${new Date().toISOString()}] Server running on port ${port}`);
		console.log(`[${new Date().toISOString()}] Environment: ${process.env.NODE_ENV || 'development'}`);
	});
};

if (process.env.NODE_ENV !== 'test') {
	startServer();
}

// Export app for testing purposes
export default app;
