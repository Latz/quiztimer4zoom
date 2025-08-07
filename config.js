import dotenv from 'dotenv';
import os from 'os';

// Load .env file in development
if (os.hostname() === 'pascal') {
    dotenv.config();
}

export const zoomApp = {
    host: 'https://zoom.us',
    sessionSecret: process.env.SESSION_SECRET,
    zoomClientId: process.env.ZM_CLIENT_ID,
    zoomClientSecret: process.env.ZM_CLIENT_SECRET,
    redirectUrl: process.env.ZM_REDIRECT_URL,
};

export const port = process.env.PORT || 3000;
