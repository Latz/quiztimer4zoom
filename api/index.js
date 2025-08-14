// index.js

import express from 'express';
import cookieSession from 'cookie-session';
import { getInstallURL, getToken, getDeeplink } from '../scripts/zoom-api.js';
import { getAppContext } from '../scripts/cipher.js';
import cookieParser from 'cookie-parser';
import os from 'os';
import dotenv from 'dotenv';

// -----------------------------------------------------
import path from 'path';
import { get } from 'http';
const __dirname = path.resolve(path.dirname(''));

// load .env variables for development
let zoomApp;
const port = 3000;
if (os.hostname() === 'pascal') {
	dotenv.config();
}
zoomApp = {
	host: 'https://zoom.us',
	sessionSecret: process.env.SESSION_SECRET,
	zoomClientId: process.env.ZM_CLIENT_ID,
	zoomClientSecret: process.env.ZM_CLIENT_SECRET,
	redirectUrl: process.env.ZM_REDIRECT_URL,
};

function noCache(req, res, next) {
	res.setHeader(
		'Cache-Control',
		'no-store, no-cache, must-revalidate, proxy-revalidate'
	);
	res.setHeader('Pragma', 'no-cache');
	res.setHeader('Expires', '0');
	res.setHeader('Surrogate-Control', 'no-store'); // Also useful for CDNs
	next();
}

const app = express();
app.use(express.static(path.join(__dirname, '.')));

app.use(cookieParser());

app.use(noCache);

app.get('/', async (req, res, next) => {
	const header = req.header('x-zoom-app-context');
	const isZoom = header && getAppContext(header);
	if (isZoom) {
		res.sendFile(path.join(__dirname, '/api/quiztimer.html'));
	} else {
		res.send(`Please<a href="/install">Click</a> to install.`);
	}
});

let session = cookieSession({
	name: 'session',
	httpOnly: true,
	keys: [zoomApp.sessionSecret],
	maxAge: 24 * 60 * 60 * 1000,
	secure: process.env.NODE_ENV === 'production',
});

app.get('/install', session, async (req, res) => {
	const { url, state, verifier } = getInstallURL();
	session.state = state;
	session.verifier = verifier;

	res.cookie('verifier', encodeURI(verifier), { maxAge: 20 * 60 * 60 * 1000 });

	res.redirect(url.href);
});

const authRoutes = express.Router();
authRoutes.get('/auth', session, async (req, res) => {
	console.log('Cookies: ', decodeURI(req.cookies.verifier));
	req.session.state = null;
	const code = req.query.code;
	const verifier = decodeURI(req.cookies.verifier);
	req.session.verifier = null;
	const { access_token: accessToken } = await getToken(code, verifier);

	const deeplink = await getDeeplink(accessToken);
	res.redirect(deeplink);
});
app.use('/', authRoutes);
app.use(express.static(path.join(__dirname, 'scripts')));

// -----------------------------------------------------
// Now start the server
export default app;

// for local testing start the server
if (os.hostname() === 'pascal' && !app) {
	console.log('starting server');
	app.listen(port, () => {
		console.log(`Server running on port ${port}`);
	});
}

console.log('end of init api/index.js');
