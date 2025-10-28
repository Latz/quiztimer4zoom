// index.js

import express from 'express';
import cookieSession from 'cookie-session';
import { getInstallURL, getToken, getDeeplink } from '../scripts/zoom-api.js';
import { getAppContext } from '../scripts/cipher.js';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: envFile });

// Validate required environment variables
const requiredEnvVars = ['SESSION_SECRET', 'ZM_CLIENT_ID', 'ZM_CLIENT_SECRET', 'ZM_REDIRECT_URL'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
	throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

const zoomApp = {
	host: 'https://zoom.us',
	sessionSecret: process.env.SESSION_SECRET,
	zoomClientId: process.env.ZM_CLIENT_ID,
	zoomClientSecret: process.env.ZM_CLIENT_SECRET,
	redirectUrl: process.env.ZM_REDIRECT_URL,
};

const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Middleware: Security headers
const app = express();
app.use(helmet());

// Middleware: Prevent HTTP Parameter Pollution (sanitize query parameters)
app.use((req, res, next) => {
	for (const key in req.query) {
		if (Array.isArray(req.query[key])) {
			req.query[key] = req.query[key][0]; // Keep only first value
		}
	}
	next();
});

// Middleware: Request size limits to prevent large payload attacks
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: true }));

// Middleware: Request timeout (30 seconds)
app.use((req, res, next) => {
	req.setTimeout(30000);
	res.setTimeout(30000);
	next();
});

// Middleware: Rate limiting for auth endpoints
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 5, // 5 requests per window
	message: 'Too many requests, please try again later',
	standardHeaders: true,
	legacyHeaders: false,
});

const installLimiter = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hour
	max: 20,
	standardHeaders: true,
	legacyHeaders: false,
});

// Middleware: Cache control
function noCacheMiddleware(req, res, next) {
	res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
	res.setHeader('Pragma', 'no-cache');
	res.setHeader('Expires', '0');
	res.setHeader('Surrogate-Control', 'no-store');
	next();
}

// Static file serving with proper MIME types
app.use(
	express.static(path.join(__dirname, '../public'), {
		setHeaders: (res, filepath) => {
			if (filepath.endsWith('.js')) {
				res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
			} else if (filepath.endsWith('.css')) {
				res.setHeader('Content-Type', 'text/css; charset=utf-8');
			} else if (filepath.endsWith('.html')) {
				res.setHeader('Content-Type', 'text/html; charset=utf-8');
			}
		},
		maxAge: isProduction ? '1d' : 0,
	})
);

app.use(cookieParser());
app.use(noCacheMiddleware);

// Session configuration
const sessionConfig = {
	name: 'session',
	httpOnly: true,
	keys: [zoomApp.sessionSecret],
	maxAge: 24 * 60 * 60 * 1000,
	secure: isProduction,
	sameSite: 'strict',
	overwrite: true,
};

const session = cookieSession(sessionConfig);

// Middleware: Input validation and sanitization
function validateInput(req, res, next) {
	// Validate query parameters
	if (req.query.code && typeof req.query.code !== 'string') {
		return res.status(400).json({ error: 'Invalid code parameter' });
	}
	// Limit code length to prevent injection
	if (req.query.code && req.query.code.length > 500) {
		return res.status(400).json({ error: 'Code parameter too long' });
	}
	next();
}

app.use(validateInput);

// Routes
app.get('/', async (req, res, next) => {
	try {
		const header = req.header('x-zoom-app-context');
		const isZoom = header && getAppContext(header);
		if (isZoom) {
			res.sendFile(path.join(__dirname, '/quiztimer.html'));
		} else {
			res.status(200).send('Please <a href="/install">click here</a> to install.');
		}
	} catch (error) {
		next(error);
	}
});

app.get('/install', installLimiter, session, async (req, res, next) => {
	try {
		const { url, state, verifier } = getInstallURL();
		req.session.state = state;
		req.session.verifier = verifier;

		res.cookie('verifier', encodeURIComponent(verifier), {
			maxAge: 20 * 60 * 60 * 1000,
			httpOnly: true,
			secure: isProduction,
			sameSite: 'strict',
		});

		res.redirect(url.href);
	} catch (error) {
		next(error);
	}
});

app.get('/auth', limiter, session, async (req, res, next) => {
	try {
		const code = req.query.code;
		const verifier = decodeURIComponent(req.cookies.verifier || '');

		if (!code || !verifier) {
			return res.status(400).json({ error: 'Missing required parameters' });
		}

		const { access_token: accessToken } = await getToken(code, verifier);

		if (!accessToken) {
			throw new Error('Failed to obtain access token');
		}

		const deeplink = await getDeeplink(accessToken);
		res.redirect(deeplink);
	} catch (error) {
		next(error);
	}
});

// Error handling middleware
app.use((err, req, res, next) => {
	const status = err.status || err.statusCode || 500;
	const message = err.message || 'Internal Server Error';

	console.error(`[${new Date().toISOString()}] Error:`, message);

	if (isProduction) {
		res.status(status).json({ error: 'An error occurred' });
	} else {
		res.status(status).json({ error: message, stack: err.stack });
	}
});

// 404 handler
app.use((req, res) => {
	res.status(404).json({ error: 'Not Found' });
});

// Start server
const startServer = () => {
	app.listen(port, () => {
		console.log(`[${new Date().toISOString()}] Server running on port ${port}`);
		console.log(`[${new Date().toISOString()}] Environment: ${process.env.NODE_ENV || 'development'}`);
	});
};

if (isProduction || process.env.NODE_ENV !== 'production') {
	startServer();
}

export default app;
