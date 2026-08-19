// animations.js - Animation effects for Quiztimer4Zoom

const Animations = {
	// Helper function to convert hex color to rgba with transparency
	hexToRgba(hex, alpha) {
		const r = parseInt(hex.slice(1, 3), 16);
		const g = parseInt(hex.slice(3, 5), 16);
		const b = parseInt(hex.slice(5, 7), 16);
		return `rgba(${r}, ${g}, ${b}, ${alpha})`;
	},

	// Draw a single frame with custom colors
	async drawFrame(canvas, ctx, time, bgColor, fgColor, options) {
		const { backgroundTransparency, numberTransparency, posX, posY, x, y, zoomSdk, zIndex } = options;

		const bgAlpha = (100 - backgroundTransparency) / 100;
		const fgAlpha = (100 - numberTransparency) / 100;
		const bgColorWithAlpha = this.hexToRgba(bgColor, bgAlpha);
		const fgColorWithAlpha = this.hexToRgba(fgColor, fgAlpha);

		// Clear canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Draw background
		ctx.fillStyle = bgColorWithAlpha;
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Draw text
		ctx.fillStyle = fgColorWithAlpha;
		ctx.fillText(time, posX, posY);

		// Get image data and send to SDK
		const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

		const drawResult = await zoomSdk.drawImage({
			imageData,
			zIndex,
			x,
			y,
		});

		return drawResult.imageId;
	},

	// Draw a frame with scale transform
	async drawFrameWithScale(canvas, ctx, time, scale, options) {
		const { backgroundTransparency, numberTransparency, posX, posY, x, y, zoomSdk, zIndex, getColorState, getColorsForState } = options;

		const currentColorState = getColorState(time);
		const colors = getColorsForState(currentColorState);
		const fgColor = colors.number;
		const bgColor = colors.background;

		const bgAlpha = (100 - backgroundTransparency) / 100;
		const fgAlpha = (100 - numberTransparency) / 100;
		const bgColorWithAlpha = this.hexToRgba(bgColor, bgAlpha);
		const fgColorWithAlpha = this.hexToRgba(fgColor, fgAlpha);

		// Clear canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Save context state
		ctx.save();

		// Apply scale transform from center
		const centerX = canvas.width / 2;
		const centerY = canvas.height / 2;
		ctx.translate(centerX, centerY);
		ctx.scale(scale, scale);
		ctx.translate(-centerX, -centerY);

		// Draw background
		ctx.fillStyle = bgColorWithAlpha;
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Draw text
		ctx.fillStyle = fgColorWithAlpha;
		ctx.fillText(time, posX, posY);

		// Restore context
		ctx.restore();

		// Get image data and send to SDK
		const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

		const drawResult = await zoomSdk.drawImage({
			imageData,
			zIndex,
			x,
			y,
		});

		return drawResult.imageId;
	},

	// Pulse animation on number change (3 frames: 100% -> 110% -> 100%).
	// Trimming the settle-back frame (to save one SDK round-trip) left the
	// number stuck enlarged until the next second's tick reset it — and since
	// each tick's draw is itself a real Zoom SDK round-trip with variable
	// latency, that reset landed at an unpredictable moment, reading as an
	// irregular jump rather than a pulse. Settling back to 100% inside this
	// animation's own short, fixed-timing window fixes that.
	async pulseTransition(canvas, ctx, time, options) {
		const frames = 3;
		const frameDelay = 33;
		const scales = [1.0, 1.1, 1.0];

		for (let i = 0; i < frames; i++) {
			const currentScale = scales[i];

			const newImageId = await this.drawFrameWithScale(canvas, ctx, time, currentScale, options);

			// Clear old image
			if (options.prevImageId !== '0') {
				options.zoomSdk.clearImage({ imageId: options.prevImageId });
			}
			options.prevImageId = newImageId;

			// Wait before next frame (except on last frame)
			if (i < frames - 1) {
				await new Promise(resolve => setTimeout(resolve, frameDelay));
			}
		}

		// Update cache tracking
		options.lastDrawnTime = time;
		options.lastColorState = options.getColorState(time);
	},

	// Draw a frame with position offset for shake effect
	async drawFrameWithOffset(canvas, ctx, time, offsetX, options) {
		const { backgroundTransparency, numberTransparency, posX, posY, x, y, zoomSdk, zIndex, getColorState, getColorsForState } = options;

		const currentColorState = getColorState(time);
		const colors = getColorsForState(currentColorState);
		const fgColor = colors.number;
		const bgColor = colors.background;

		const bgAlpha = (100 - backgroundTransparency) / 100;
		const fgAlpha = (100 - numberTransparency) / 100;
		const bgColorWithAlpha = this.hexToRgba(bgColor, bgAlpha);
		const fgColorWithAlpha = this.hexToRgba(fgColor, fgAlpha);

		// Clear canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Draw background
		ctx.fillStyle = bgColorWithAlpha;
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Draw text
		ctx.fillStyle = fgColorWithAlpha;
		ctx.fillText(time, posX, posY);

		// Get image data and send to SDK with offset X position
		const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

		const drawResult = await zoomSdk.drawImage({
			imageData,
			zIndex,
			x: x + offsetX,
			y,
		});

		return drawResult.imageId;
	},

	// Shake animation when entering timeout (5 frames, ~150ms total)
	async shakeTransition(canvas, ctx, time, options) {
		const frames = 5;
		const frameDelay = 30; // 30ms per frame = ~150ms total
		const offsets = [0, -8, 8, -4, 0]; // Wobble left and right, then center

		for (let i = 0; i < frames; i++) {
			const currentOffset = offsets[i];

			const newImageId = await this.drawFrameWithOffset(canvas, ctx, time, currentOffset, options);

			// Clear old image
			if (options.prevImageId !== '0') {
				options.zoomSdk.clearImage({ imageId: options.prevImageId });
			}
			options.prevImageId = newImageId;

			// Wait before next frame (except on last frame)
			if (i < frames - 1) {
				await new Promise(resolve => setTimeout(resolve, frameDelay));
			}
		}

		// Update cache tracking
		options.lastDrawnTime = time;
		options.lastColorState = options.getColorState(time);
	},

	// Blinking animation when time reaches zero (loops until stopped)
	async blinkAtTimeout(canvas, ctx, time, options) {
		const { backgroundTransparency, numberTransparency, posX, posY, x, y, zoomSdk, zIndex, getColorsForState } = options;

		// Get timeout colors
		const timeoutColors = getColorsForState('timeout');
		const bgColor = timeoutColors.background;
		const fgColor = timeoutColors.number;

		// Create inverted colors for blink effect
		const invertedBgColor = '#000000'; // Black for dramatic effect

		// 7 frames (odd) so the animation starts AND ends on the selected
		// background instead of finishing on the inverted black flash.
		const frames = 7; // 3 complete black flashes, settling back on the real color
		const frameDelay = 200; // 200ms per frame = slower, more dramatic blink

		for (let i = 0; i < frames; i++) {
			const isEven = i % 2 === 0;
			const currentBgColor = isEven ? bgColor : invertedBgColor;
			const currentFgColor = fgColor;

			const newImageId = await this.drawFrame(canvas, ctx, time, currentBgColor, currentFgColor, options);

			// Clear old image
			if (options.prevImageId !== '0') {
				zoomSdk.clearImage({ imageId: options.prevImageId });
			}
			options.prevImageId = newImageId;

			// Wait before next frame
			if (i < frames - 1) {
				await new Promise(resolve => setTimeout(resolve, frameDelay));
			}
		}

		// Update cache tracking
		options.lastDrawnTime = time;
		options.lastColorState = 'timeout';
	}
};

// Dual-mode export. The browser loads this as a classic <script>, so `Animations`
// must exist as a global; the test suite imports it as a module. A bare `export`
// cannot be used here — it is a syntax error in a classic script.
if (typeof globalThis !== 'undefined') {
	globalThis.Animations = Animations;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = { Animations };
}
