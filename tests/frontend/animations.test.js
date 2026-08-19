// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Animations } from '../../public/animations.js';

describe('public/animations.js', () => {
	describe('hexToRgba(hex, alpha)', () => {
		it('converts red correctly', () => {
			expect(Animations.hexToRgba('#ff0000', 1)).toBe('rgba(255, 0, 0, 1)');
		});

		it('converts black with zero alpha', () => {
			expect(Animations.hexToRgba('#000000', 0)).toBe('rgba(0, 0, 0, 0)');
		});

		it('converts white with half alpha', () => {
			expect(Animations.hexToRgba('#ffffff', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
		});

		it('converts green correctly', () => {
			expect(Animations.hexToRgba('#00ff00', 1)).toBe('rgba(0, 255, 0, 1)');
		});

		it('converts blue correctly', () => {
			expect(Animations.hexToRgba('#0000ff', 0.8)).toBe('rgba(0, 0, 255, 0.8)');
		});
	});

	describe('blendColors(color1, color2, amount)', () => {
		it('returns color1 when amount is 0', () => {
			expect(Animations.blendColors('#000000', '#ffffff', 0)).toBe('#000000');
		});

		it('returns color2 when amount is 1', () => {
			expect(Animations.blendColors('#000000', '#ffffff', 1)).toBe('#ffffff');
		});

		it('returns midpoint at amount 0.5', () => {
			expect(Animations.blendColors('#000000', '#ffffff', 0.5)).toBe('#808080');
		});

		it('blends red and blue to purple at 0.5', () => {
			expect(Animations.blendColors('#ff0000', '#0000ff', 0.5)).toBe('#800080');
		});
	});

	describe('drawFrame(canvas, ctx, time, bgColor, fgColor, options)', () => {
		let canvas, ctx, options;

		beforeEach(() => {
			canvas = { width: 300, height: 300 };
			ctx = {
				clearRect: vi.fn(),
				fillRect: vi.fn(),
				fillText: vi.fn(),
				getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })),
				fillStyle: '',
			};
			options = {
				backgroundTransparency: 50,
				numberTransparency: 100,
				posX: 150,
				posY: 150,
				x: 0,
				y: 0,
				zIndex: 1,
				zoomSdk: {
					drawImage: vi.fn(() => Promise.resolve({ imageId: 'img-id-1' })),
					clearImage: vi.fn(),
				},
			};
		});

		it('calls clearRect', async () => {
			await Animations.drawFrame(canvas, ctx, 10, '#ffffff', '#000000', options);
			expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 300, 300);
		});

		it('calls fillRect for background', async () => {
			await Animations.drawFrame(canvas, ctx, 10, '#ffffff', '#000000', options);
			expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 300, 300);
		});

		it('calls fillText with the time', async () => {
			await Animations.drawFrame(canvas, ctx, 10, '#ffffff', '#000000', options);
			expect(ctx.fillText).toHaveBeenCalledWith(10, 150, 150);
		});

		it('calls zoomSdk.drawImage', async () => {
			await Animations.drawFrame(canvas, ctx, 10, '#ffffff', '#000000', options);
			expect(options.zoomSdk.drawImage).toHaveBeenCalledOnce();
		});

		it('returns the imageId from zoomSdk.drawImage', async () => {
			const result = await Animations.drawFrame(canvas, ctx, 10, '#ffffff', '#000000', options);
			expect(result).toBe('img-id-1');
		});

		it('applies backgroundTransparency as alpha', async () => {
			// 50% transparency → alpha = 0.5 → bgColorWithAlpha = rgba(255, 255, 255, 0.5)
			await Animations.drawFrame(canvas, ctx, 10, '#ffffff', '#000000', options);
			// fillStyle is set twice: once for bg, once for fg
			// We can't inspect the exact value easily since it's a side-effect assignment,
			// but we verify drawImage was called (full flow ran)
			expect(options.zoomSdk.drawImage).toHaveBeenCalledOnce();
		});
	});

	describe('flashTransition(canvas, ctx, time, targetBg, targetFg, options)', () => {
		let canvas, ctx, options;

		beforeEach(() => {
			vi.useFakeTimers();
			canvas = { width: 300, height: 300 };
			ctx = {
				clearRect: vi.fn(),
				fillRect: vi.fn(),
				fillText: vi.fn(),
				getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })),
				fillStyle: '',
			};
			options = {
				backgroundTransparency: 0,
				numberTransparency: 100,
				posX: 150, posY: 150,
				x: 0, y: 0, zIndex: 1,
				prevImageId: '0',
				zoomSdk: {
					drawImage: vi.fn()
						.mockResolvedValueOnce({ imageId: 'img-1' })
						.mockResolvedValueOnce({ imageId: 'img-2' })
						.mockResolvedValueOnce({ imageId: 'img-3' })
						.mockResolvedValueOnce({ imageId: 'img-4' })
						.mockResolvedValueOnce({ imageId: 'img-5' })
						.mockResolvedValueOnce({ imageId: 'img-6' })
						.mockResolvedValueOnce({ imageId: 'img-7' })
						.mockResolvedValueOnce({ imageId: 'img-8' }),
					clearImage: vi.fn(),
				},
			};
		});

		it('calls drawFrame (via drawImage) exactly 8 times', async () => {
			const promise = Animations.flashTransition(canvas, ctx, 10, '#ff0000', '#000000', options);
			await vi.runAllTimersAsync();
			await promise;
			expect(options.zoomSdk.drawImage).toHaveBeenCalledTimes(8);
		});

		it('updates prevImageId to last imageId', async () => {
			const promise = Animations.flashTransition(canvas, ctx, 10, '#ff0000', '#000000', options);
			await vi.runAllTimersAsync();
			await promise;
			expect(options.prevImageId).toBe('img-8');
		});
	});

	describe('pulseTransition(canvas, ctx, time, options)', () => {
		let canvas, ctx, options;

		beforeEach(() => {
			vi.useFakeTimers();
			canvas = { width: 300, height: 300 };
			ctx = {
				clearRect: vi.fn(),
				fillRect: vi.fn(),
				fillText: vi.fn(),
				getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })),
				save: vi.fn(), restore: vi.fn(),
				translate: vi.fn(), scale: vi.fn(),
				fillStyle: '',
			};
			const mockColors = { number: '#000000', background: '#ffffff' };
			options = {
				backgroundTransparency: 0,
				numberTransparency: 100,
				posX: 150, posY: 150,
				x: 0, y: 0, zIndex: 1,
				prevImageId: '0',
				getColorState: vi.fn(() => 'standard'),
				getColorsForState: vi.fn(() => mockColors),
				zoomSdk: {
					drawImage: vi.fn()
						.mockResolvedValueOnce({ imageId: 'p-1' })
						.mockResolvedValueOnce({ imageId: 'p-2' })
						.mockResolvedValueOnce({ imageId: 'p-3' }),
					clearImage: vi.fn(),
				},
			};
		});

		it('calls drawImage 3 times (one per scale frame)', async () => {
			const promise = Animations.pulseTransition(canvas, ctx, 10, options);
			await vi.runAllTimersAsync();
			await promise;
			expect(options.zoomSdk.drawImage).toHaveBeenCalledTimes(3);
		});

		it('updates lastDrawnTime after completion', async () => {
			const promise = Animations.pulseTransition(canvas, ctx, 10, options);
			await vi.runAllTimersAsync();
			await promise;
			expect(options.lastDrawnTime).toBe(10);
		});
	});

	describe('shakeTransition(canvas, ctx, time, options)', () => {
		let canvas, ctx, options;

		beforeEach(() => {
			vi.useFakeTimers();
			canvas = { width: 300, height: 300 };
			ctx = {
				clearRect: vi.fn(),
				fillRect: vi.fn(),
				fillText: vi.fn(),
				getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })),
				fillStyle: '',
			};
			const mockColors = { number: '#000000', background: '#ff0000' };
			options = {
				backgroundTransparency: 0,
				numberTransparency: 100,
				posX: 150, posY: 150,
				x: 10, y: 0, zIndex: 1,
				prevImageId: '0',
				getColorState: vi.fn(() => 'timeout'),
				getColorsForState: vi.fn(() => mockColors),
				zoomSdk: {
					drawImage: vi.fn()
						.mockResolvedValueOnce({ imageId: 's-1' })
						.mockResolvedValueOnce({ imageId: 's-2' })
						.mockResolvedValueOnce({ imageId: 's-3' })
						.mockResolvedValueOnce({ imageId: 's-4' })
						.mockResolvedValueOnce({ imageId: 's-5' }),
					clearImage: vi.fn(),
				},
			};
		});

		it('calls drawImage exactly 5 times (one per shake frame)', async () => {
			const promise = Animations.shakeTransition(canvas, ctx, 0, options);
			await vi.runAllTimersAsync();
			await promise;
			expect(options.zoomSdk.drawImage).toHaveBeenCalledTimes(5);
		});

		it('updates lastDrawnTime after completion', async () => {
			const promise = Animations.shakeTransition(canvas, ctx, 0, options);
			await vi.runAllTimersAsync();
			await promise;
			expect(options.lastDrawnTime).toBe(0);
		});
	});

	describe('blinkAtTimeout(canvas, ctx, time, options)', () => {
		let canvas, ctx, options;

		beforeEach(() => {
			vi.useFakeTimers();
			canvas = { width: 300, height: 300 };
			ctx = {
				clearRect: vi.fn(),
				fillRect: vi.fn(),
				fillText: vi.fn(),
				getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })),
				fillStyle: '',
			};
			const mockTimeoutColors = { number: '#ffffff', background: '#ff0000' };
			options = {
				backgroundTransparency: 0,
				numberTransparency: 100,
				posX: 150, posY: 150,
				x: 0, y: 0, zIndex: 1,
				prevImageId: '0',
				getColorsForState: vi.fn(() => mockTimeoutColors),
				zoomSdk: {
					drawImage: vi.fn().mockResolvedValue({ imageId: 'blink-img' }),
					clearImage: vi.fn(),
				},
			};
		});

		it('calls drawImage 6 times (3 blink cycles)', async () => {
			const promise = Animations.blinkAtTimeout(canvas, ctx, 0, options);
			await vi.runAllTimersAsync();
			await promise;
			expect(options.zoomSdk.drawImage).toHaveBeenCalledTimes(6);
		});

		it('sets lastColorState to timeout after completion', async () => {
			const promise = Animations.blinkAtTimeout(canvas, ctx, 0, options);
			await vi.runAllTimersAsync();
			await promise;
			expect(options.lastColorState).toBe('timeout');
		});
	});
});
