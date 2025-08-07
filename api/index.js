import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import os from 'os';
import routes from './routes.js';
import { port } from '../config.js';

const __dirname = path.resolve(path.dirname(''));

function noCache(req, res, next) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
}

const app = express();
app.use(express.static(path.join(__dirname, '.')));
app.use(cookieParser());
app.use(noCache);
app.use('/', routes);

// Now start the server
export default app;

// for local testing start the server
if (os.hostname() === 'pascal' && !app.parent) {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}
