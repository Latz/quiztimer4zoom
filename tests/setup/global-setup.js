export function setup() {
	process.env.SESSION_SECRET = 'test-session-secret-32-chars-long!!';
	process.env.ZM_CLIENT_ID = 'test-client-id';
	process.env.ZM_CLIENT_SECRET = 'test-client-secret';
	process.env.ZM_REDIRECT_URL = 'http://localhost:3000/auth';
	process.env.NODE_ENV = 'test';
}

export function teardown() {}
