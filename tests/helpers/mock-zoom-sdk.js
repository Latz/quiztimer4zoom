import { vi } from 'vitest';

export function createMockZoomSdk() {
	return {
		config: vi.fn(() => Promise.resolve({
			media: { renderTarget: { width: 1280, height: 720 } },
		})),
		drawImage: vi.fn(() => Promise.resolve('mock-image-id-1')),
		clearImage: vi.fn(() => Promise.resolve()),
		runRenderingContext: vi.fn(() => Promise.resolve()),
		getRunningContext: vi.fn(() => Promise.resolve()),
		closeRenderingContext: vi.fn(() => Promise.resolve()),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		authorize: vi.fn(() => Promise.resolve()),
	};
}
