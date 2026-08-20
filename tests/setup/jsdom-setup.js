import { vi, beforeEach } from 'vitest';
import { createMockZoomSdk } from '../helpers/mock-zoom-sdk.js';

beforeEach(() => {
	if (typeof globalThis.HTMLCanvasElement !== 'undefined') {
		globalThis.zoomSdk = createMockZoomSdk();

		HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
			clearRect: vi.fn(),
			fillRect: vi.fn(),
			fillText: vi.fn(),
			measureText: vi.fn(() => ({
				width: 100,
				actualBoundingBoxAscent: 40,
				actualBoundingBoxDescent: 10,
			})),
			getImageData: vi.fn(() => new ImageData(1, 1)),
			save: vi.fn(),
			restore: vi.fn(),
			translate: vi.fn(),
			scale: vi.fn(),
			beginPath: vi.fn(),
			fill: vi.fn(),
			roundRect: vi.fn(),
			strokeRect: vi.fn(),
			fillStyle: '',
			strokeStyle: '',
			lineWidth: 0,
			font: '',
		}));
	}
});
