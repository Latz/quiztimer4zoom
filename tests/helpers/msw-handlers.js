import { http, HttpResponse } from 'msw';

export const handlers = [
	http.post('https://zoom.us/oauth/token', () => {
		return HttpResponse.json({
			access_token: 'mock-access-token',
			token_type: 'bearer',
			refresh_token: 'mock-refresh-token',
			expires_in: 3600,
		});
	}),

	http.post('https://api.zoom.us/v2/zoomapp/deeplink', () => {
		return HttpResponse.json({
			deeplink: 'zoomus://zoom.us/wc/join/mock-deeplink',
		});
	}),
];
