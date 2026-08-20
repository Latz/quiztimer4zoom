export const appName = 'quiztimer4zoom';
export const port = 3000;

import dotenv from 'dotenv';
dotenv.config();

const ZM_CLIENT_ID = process.env.ZM_CLIENT_ID;
const ZM_CLIENT_SECRET = process.env.ZM_CLIENT_SECRET;
const ZM_REDIRECT_URL = process.env.ZM_REDIRECT_URL;

// App Name used for isolating logs
const APP_NAME = 'quiztimer4zoom';

// Key used Sign Session Cookies
const SESSION_SECRET = process.env.SESSION_SECRET;

export const zoomApp = {
	host: 'https://zoom.us',
	clientId: ZM_CLIENT_ID,
	clientSecret: ZM_CLIENT_SECRET,
	redirectUrl: ZM_REDIRECT_URL,
	sessionSecret: SESSION_SECRET,
};
