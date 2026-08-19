// animations.js - Animation effects for Quiztimer4Zoom

const Animations = {
	// Helper function to convert hex color to rgba with transparency
	hexToRgba(hex, alpha) {
		const r = parseInt(hex.slice(1, 3), 16);
		const g = parseInt(hex.slice(3, 5), 16);
		const b = parseInt(hex.slice(5, 7), 16);
		return `rgba(${r}, ${g}, ${b}, ${alpha})`;
	},

	// Blend two hex colors by a given amount (0-1)
	blendColors(color1, color2, amount) {
		const r1 = parseInt(color1.slice(1, 3), 16);
		const g1 = parseInt(color1.slice(3, 5), 16);
		const b1 = parseInt(color1.slice(5, 7), 16);

		const r2 = parseInt(color2.slice(1, 3), 16);
		const g2 = parseInt(color2.slice(3, 5), 16);
		const b2 = parseInt(color2.slice(5, 7), 16);

		const r = Math.round(r1 + (r2 - r1) * amount);
		const g = Math.round(g1 + (g2 - g1) * amount);
		const b = Math.round(b1 + (b2 - b1) * amount);

		return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
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

	// Flash animation on state change (8 frames, ~400ms total, eased)
	async flashTransition(canvas, ctx, time, targetBgColor, targetFgColor, options) {
		const flashColor = '#ffffff'; // White flash
		const frames = 8;
		const frameDelay = 50; // 50ms per frame = ~400ms total

		for (let i = 0; i < frames; i++) {
			const linearProgress = i / (frames - 1); // 0..1 across all frames
			// Ease-out: fast at first, settling gently into the target color
			// instead of stepping at a constant rate.
			const progress = 1 - (1 - linearProgress) ** 2;

			// Blend from white flash to target color
			const currentBgColor = this.blendColors(flashColor, targetBgColor, progress);
			const currentFgColor = this.blendColors(flashColor, targetFgColor, progress);

			const newImageId = await this.drawFrame(canvas, ctx, time, currentBgColor, currentFgColor, options);

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

	// Pulse animation on number change (3 frames, ~100ms total)
	async pulseTransition(canvas, ctx, time, options) {
		const frames = 3;
		const frameDelay = 33; // 33ms per frame = ~100ms total
		const scales = [1.0, 1.1, 1.0]; // 100% → 110% → 100%

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

		const frames = 6; // 6 frames = 3 complete blinks
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
