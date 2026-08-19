/**
 * @fileoverview Quiztimer4Zoom - A countdown timer for Zoom meetings with customizable appearance and animations.
 * This script manages timer state, rendering to canvas, Zoom SDK integration, and user interactions.
 */

// --------------------------------------------------------------------------------
// Load options from local storage or set defaults
// --------------------------------------------------------------------------------

/** @type {string} Timer position on screen (posTopLeft, posTopRight, posBottomLeft, posBottomRight) */
const position = JSON.parse(localStorage.getItem('position')) || 'posTopLeft';

/**
 * Box size bounds in pixels. Every draw sends an RGBA canvas readback over
 * the Zoom SDK bridge (width * height * 4 bytes), so an unbounded boxSize
 * directly multiplies the payload size of every single draw call.
 */
const MIN_BOX_SIZE = 100;
const MAX_BOX_SIZE = 600;

/**
 * Clamps a box size to [MIN_BOX_SIZE, MAX_BOX_SIZE].
 *
 * @param {number} size - Requested box size in pixels
 * @returns {number} Clamped box size
 */
function clampBoxSize(size) {
	return Math.min(MAX_BOX_SIZE, Math.max(MIN_BOX_SIZE, size));
}

/** @type {number} Size of the timer display box in pixels */
const boxSize = clampBoxSize(JSON.parse(localStorage.getItem('boxSize')) || 300);

/** @type {{number: string, background: string}} Standard state colors */
const colorsStandard = JSON.parse(localStorage.getItem('colorsStandard')) || {
	number: '#000000',
	background: '#ffffff',
};

/** @type {{number: string, background: string}} Warning state colors (when time <= 5 seconds) */
const colorsWarning = JSON.parse(localStorage.getItem('colorsWarning')) || {
	number: '#000000',
	background: '#ffff00',
};

/** @type {{number: string, background: string}} Timeout state colors (when time = 0) */
const colorsTimeout = JSON.parse(localStorage.getItem('colorsTimeout')) || {
	number: '#000000',
	background: '#ff0000',
};

/** @type {number} Text X position offset */
const textX = JSON.parse(localStorage.getItem('textX')) || 0;

/** @type {number} Text Y position offset */
const textY = JSON.parse(localStorage.getItem('textY')) || 0;

/** @type {number} Timer Y position on video canvas */
const y = JSON.parse(localStorage.getItem('y')) || 0;

/** @type {number} Timer X position on video canvas */
const x = JSON.parse(localStorage.getItem('x')) || 0;

/** @type {number} Background transparency percentage (0-100) */
const backgroundTransparency = JSON.parse(localStorage.getItem('backgroundTransparency')) || 0;

/** @type {number} Number transparency percentage (0-100) */
const numberTransparency = JSON.parse(localStorage.getItem('numberTransparency')) || 0;

/**
 * Converts a transparency percentage into a canvas alpha value.
 * The sliders express transparency (0% = fully opaque, 100% = fully transparent),
 * while canvas/rgba needs the inverse (opacity).
 *
 * @param {number} transparency - Transparency percentage (0-100)
 * @returns {number} Alpha value 0-1
 */
function transparencyToAlpha(transparency) {
	return (100 - transparency) / 100;
}

/** @type {boolean} Enable pulse animation on time changes */
const pulseAnimation = JSON.parse(localStorage.getItem('pulseAnimation')) !== false; // Default to true

/** @type {boolean} Enable shake animation on timeout */
const shakeAnimation = JSON.parse(localStorage.getItem('shakeAnimation')) !== false; // Default to true

/** @type {boolean} Enable blinking animation at timeout */
const blinkAnimation = JSON.parse(localStorage.getItem('blinkAnimation')) !== false; // Default to true

/**
 * @typedef {Object} QuiztimerOptions
 * @property {string} position - Timer position on screen
 * @property {number} boxSize - Size of timer box in pixels
 * @property {{number: string, background: string}} colorsStandard - Standard state colors
 * @property {{number: string, background: string}} colorsWarning - Warning state colors
 * @property {{number: string, background: string}} colorsTimeout - Timeout state colors
 * @property {number} textX - Text X position offset
 * @property {number} textY - Text Y position offset
 * @property {number} y - Y position on video canvas
 * @property {number} x - X position on video canvas
 * @property {number} backgroundTransparency - Background transparency (0-100)
 * @property {number} numberTransparency - Number transparency (0-100)
 * @property {boolean} pulseAnimation - Enable pulse animation
 * @property {boolean} shakeAnimation - Enable shake animation
 * @property {boolean} blinkAnimation - Enable blinking animation at timeout
 */
const quiztimerOptions = {
	position,
	boxSize,
	colorsStandard,
	colorsWarning,
	colorsTimeout,
	textX,
	textY,
	y,
	x,
	backgroundTransparency,
	numberTransparency,
	pulseAnimation,
	shakeAnimation,
	blinkAnimation,
};

/** @type {{height: number, width: number}} Zoom video dimensions */
let videoSize;

/**
 * Main initialization function that runs when the DOM is fully loaded.
 * Sets up timer state, UI elements, and Zoom SDK integration.
 */
document.onreadystatechange = async () => {
	if (document.readyState === 'complete') {
		/** @type {number} Z-index for layering timer on video */
		let zIndex;

		/** @type {string} ID of the previous image drawn on Zoom canvas */
		let prevImageId = '0';

		/** @type {boolean} Whether a Zoom rendering context is currently active */
		let renderingContextActive = false;

		/** @type {boolean} Whether Zoom SDK event listeners have already been registered */
		let listenersRegistered = false;

		/** @type {Symbol} Timer stopped state */
		const stop = Symbol('stop');

		/** @type {Symbol} Timer running state */
		const running = Symbol('running');

		/** @type {Symbol} Current timer state */
		let state = stop;

		/** @type {number} Timer duration in seconds */
		let duration = 20;

		/** @type {number} Seconds remaining on timer */
		let timeLeft = 0;

		/** @type {number} Interval ID for timed reset */
		let timedResetId;

		/** @type {number} X position where text is drawn */
		let posX = 10;

		/** @type {number} Y position where text is drawn */
		let posY = 10;

		/** @type {number} X offset (from posX) at which the second digit of "18" naturally starts */
		let secondDigitOffset18 = 0;

		/** @type {number|null} Last time value that was drawn */
		let lastDrawnTime = null;

		/** @type {string|null} Last color state ('standard', 'warning', 'timeout') */
		let lastColorState = null;

		/** @type {ImageData|null} Cached image data for optimized redraws */
		let cachedImageData = null;

		/** @type {HTMLButtonElement} Start/Stop button element */
		const btnStartStop = document.getElementById('btn_startStop');

		/** @type {HTMLButtonElement} Continue button element */
		const btnContinue = document.getElementById('btn_continue');

		// Disable continue button initially - only enable when countdown is stopped
		btnContinue.disabled = true;

		// Initialize dark mode from localStorage
		const savedDarkMode = localStorage.getItem('darkMode') === 'true';
		if (savedDarkMode) {
			document.body.classList.add('dark-mode');
			const btnDarkmode = document.getElementById('btn_darkmode');
			if (btnDarkmode) {
				btnDarkmode.textContent = '☀️';
			}
			// Update about box logo
			const aboutLogo = document.querySelector('.about-logo');
			if (aboutLogo) {
				aboutLogo.src = '/images/qt4z-dark.jpg';
			}
		}

		// --------------------------------------------------------------------
		const gui = initGui();

		// Close the Zoom rendering context before the page unloads, so a reload
		// doesn't collide with a still-open context from the previous page instance
		// (Zoom's native client rejects a new runRenderingContext call otherwise
		// with "The app already called render Js-api first").
		window.addEventListener('pagehide', () => {
			zoomSdk.closeRenderingContext().catch(() => {});
		});

		await initZoomSdk(gui);

		// --------------------------------------------------------------------
		/**
		 * Listens for keydown events on the document and performs specific actions based on the pressed keys.
		 * Prevents the default behavior of the keys.
		 * If the space key is pressed:
		 *   - If the state is 'stop', starts the timer.
		 *   - If the state is 'running', stops the timer.
		 * If the 'c' key is pressed, continues the timer.
		 */
		document.addEventListener('keydown', function (event) {
			event.preventDefault();
			if (event.key === ' ') {
				if (state === stop) startTimer(gui);
				else if (state === running) stopTimer(gui);
			}
			if (event.key === 'c') continueTimer(gui);
		});
		/**
		 * Initializes the GUI by setting up the canvas and context, and adding event listeners for various actions.
		 * Actions include starting or stopping the timer, continuing the timer, and setting the duration to 20 or 30 seconds.
		 * Also sets up tab navigation, color pickers, transparency sliders, and animation toggles.
		 *
		 * @returns {{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D}} GUI object with canvas and context
		 */
		function initGui() {
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d', {
				willReadFrequently: true,
			});

			const gui = { canvas, ctx };
			canvas.height = quiztimerOptions.boxSize;
			canvas.width = quiztimerOptions.boxSize;
			const actions = document.getElementById('actions');
			actions.addEventListener('click', event => {
				if (event.target.closest('.ripple-button')) {
					const button = event.target.closest('.ripple-button');
					const ripple = document.createElement('span');
					const rect = button.getBoundingClientRect();
					const size = Math.max(rect.width, rect.height);
					const x = event.clientX - rect.left - size / 2;
					const y = event.clientY - rect.top - size / 2;

					ripple.style.width = ripple.style.height = `${size}px`;
					ripple.style.left = `${x}px`;
					ripple.style.top = `${y}px`;

					ripple.classList.add('ripple');
					button.appendChild(ripple);

					ripple.addEventListener('animationend', () => {
						ripple.remove();
					});
				}

				const targetId = event.target.id || event.target.closest('button')?.id;
				switch (targetId) {
					case 'btn_startStop':
						if (state === stop) startTimer(gui);
						else if (state === running) stopTimer(gui);
						break;
					case 'btn_continue':
						continueTimer(gui);
						break;
					case 'btn_20sec':
						setDuration(gui, 20);
						break;
					case 'btn_30sec':
						setDuration(gui, 30);
						break;
				}
			});

			const options = document.getElementById('options');
			options.style.visibility = 'hidden';

			const subActions = document.getElementById('subActions');
			subActions.addEventListener('click', event => {
				switch (event.target.id) {
					case 'btn_options':
						// toggle options visibility
						if (options.style.visibility === 'hidden') {
							options.style.visibility = 'visible';
							document.body.style.overflowY = 'scroll';
						} else {
							options.style.visibility = 'hidden';
							document.body.style.overflowY = 'hidden';
						}
						break;
					case 'btn_panic':
						resetTimer(gui);
						break;
					case 'btn_help': {
						// Show about box
						const aboutBox = document.getElementById('aboutBox');
						aboutBox.showModal();
						break;
					}
					case 'btn_darkmode': {
						// Toggle dark mode
						document.body.classList.toggle('dark-mode');
						const isDarkMode = document.body.classList.contains('dark-mode');
						localStorage.setItem('darkMode', isDarkMode);
						// Update button icon
						const btnDarkmode = document.getElementById('btn_darkmode');
						btnDarkmode.textContent = isDarkMode ? '☀️' : '🌙';
						// Update about box logo
						const aboutLogo = document.querySelector('.about-logo');
						if (aboutLogo) {
							aboutLogo.src = isDarkMode ? '/images/qt4z-dark.jpg' : '/images/qt4z.png';
						}
						break;
					}
				}
			});

			// Tab switching functionality
			const tabButtons = document.querySelectorAll('.tab-button');
			const tabPanels = document.querySelectorAll('.tab-panel');

			for (const button of tabButtons) {
				button.addEventListener('click', () => {
					// Remove active state from all buttons
					for (const btn of tabButtons) {
						btn.setAttribute('aria-selected', 'false');
					}
					// Hide all panels
					for (const panel of tabPanels) {
						panel.setAttribute('hidden', '');
					}
					// Activate clicked button
					button.setAttribute('aria-selected', 'true');
					// Show corresponding panel
					const panelId = button.getAttribute('aria-controls');
					document.getElementById(panelId).removeAttribute('hidden');
				});
			}

			// About box functionality
			const aboutBox = document.getElementById('aboutBox');
			const btnAboutClose = document.getElementById('btn_aboutClose');

			btnAboutClose.addEventListener('click', () => {
				aboutBox.close();
			});

			// Close dialog when clicking outside (on backdrop)
			aboutBox.addEventListener('click', event => {
				// Check if click was directly on the dialog (backdrop area)
				if (event.target === aboutBox) {
					aboutBox.close();
				}
			});

			// add click listeners to corner positions
			document.getElementById('positionCorners').addEventListener('click', event => {
				setPosition(event.target.id, gui);
			});

			// add listeners to size buttons
			const buttons_timerSize = document.getElementById('timerSize');
			buttons_timerSize.addEventListener('click', event => {
				let value;
				switch (event.target.id) {
					case 'btn_timerSizeMinus':
						if (canvas.height > 0) value = -1;
						break;
					case 'btn_timerSizePlus':
						value = 1;
						break;
					case 'btn_timerSizeMinusFast':
						if (canvas.height > 4) value = -5;
						break;
					case 'btn_timerSizePlusFast':
						value = 5;
						break;
				}
				if (value === undefined) return;
				quiztimerOptions.boxSize = clampBoxSize(quiztimerOptions.boxSize + value);
				setPosition(quiztimerOptions.position, gui);
				localStorage.setItem('boxSize', JSON.stringify(quiztimerOptions.boxSize));
			});

			// Add listeners for transparency sliders
			const backgroundTransparencySlider = document.getElementById('backgroundTransparencySlider');
			const numberTransparencySlider = document.getElementById('numberTransparencySlider');

			if (backgroundTransparencySlider) {
				backgroundTransparencySlider.addEventListener('input', event => {
					quiztimerOptions.backgroundTransparency = Number.parseInt(event.target.value);
					localStorage.setItem('backgroundTransparency', JSON.stringify(quiztimerOptions.backgroundTransparency));
					invalidateCache();
					if (!isDrawing) {
						isDrawing = true;
						drawImage(gui.canvas, gui.ctx, duration).then(() => {
							isDrawing = false;
						});
					}
				});
			}

			if (numberTransparencySlider) {
				numberTransparencySlider.addEventListener('input', event => {
					quiztimerOptions.numberTransparency = Number.parseInt(event.target.value);
					localStorage.setItem('numberTransparency', JSON.stringify(quiztimerOptions.numberTransparency));
					invalidateCache();
					if (!isDrawing) {
						isDrawing = true;
						drawImage(gui.canvas, gui.ctx, duration).then(() => {
							isDrawing = false;
						});
					}
				});
			}

			// Add listener for pulse animation toggle
			const pulseAnimationToggle = document.getElementById('pulseAnimationToggle');
			if (pulseAnimationToggle) {
				// Set initial state from options
				pulseAnimationToggle.checked = quiztimerOptions.pulseAnimation;

				pulseAnimationToggle.addEventListener('change', event => {
					quiztimerOptions.pulseAnimation = event.target.checked;
					localStorage.setItem('pulseAnimation', JSON.stringify(quiztimerOptions.pulseAnimation));
				});
			}

			// Add listener for shake animation toggle
			const shakeAnimationToggle = document.getElementById('shakeAnimationToggle');
			if (shakeAnimationToggle) {
				// Set initial state from options
				shakeAnimationToggle.checked = quiztimerOptions.shakeAnimation;

				shakeAnimationToggle.addEventListener('change', event => {
					quiztimerOptions.shakeAnimation = event.target.checked;
					localStorage.setItem('shakeAnimation', JSON.stringify(quiztimerOptions.shakeAnimation));
				});
			}

			// Add listener for blink animation toggle
			const blinkAnimationToggle = document.getElementById('blinkAnimationToggle');
			if (blinkAnimationToggle) {
				// Set initial state from options
				blinkAnimationToggle.checked = quiztimerOptions.blinkAnimation;

				blinkAnimationToggle.addEventListener('change', event => {
					quiztimerOptions.blinkAnimation = event.target.checked;
					localStorage.setItem('blinkAnimation', JSON.stringify(quiztimerOptions.blinkAnimation));
				});
			}

			return gui;
		}

		/**
		 * Resets the timer to its initial state by clearing the canvas and reinitializing the Zoom SDK.
		 *
		 * @param {{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D}} gui - GUI object containing canvas and context
		 * @example
		 * resetTimer(gui);
		 */
		function resetTimer(gui) {
			clear(gui);
		}
		/**
		 * Updates the timer duration and redraws the display with the new time.
		 *
		 * @param {{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D}} gui - GUI object with canvas and context
		 * @param {number} time - New duration value in seconds
		 */
		function setDuration(gui, time) {
			duration = time;
			if (!isDrawing) {
				isDrawing = true;
				drawImage(gui.canvas, gui.ctx, duration).then(() => {
					isDrawing = false;
				});
			}
		}
		/**
		 * Sets the timer position on the video canvas based on corner selection.
		 * Updates x/y coordinates, invalidates cache, and redraws the timer.
		 *
		 * @param {string} position - Position identifier (posTopLeft, posTopRight, posBottomLeft, posBottomRight)
		 * @param {{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D}} gui - GUI object with canvas and context
		 * @returns {Promise<void>}
		 */
		async function setPosition(position, gui) {
			switch (position) {
				case 'posTopLeft':
					quiztimerOptions.x = 0;
					quiztimerOptions.y = 0;
					break;
				case 'posTopRight':
					quiztimerOptions.x = videoSize.width - gui.canvas.width;
					quiztimerOptions.y = 0;
					break;
				case 'posBottomLeft':
					quiztimerOptions.x = 0;
					quiztimerOptions.y = videoSize.height - gui.canvas.height;

					break;
				case 'posBottomRight':
					quiztimerOptions.x = videoSize.width - gui.canvas.width;
					quiztimerOptions.y = videoSize.height - gui.canvas.height;
					break;
			}
			invalidateCache();
			initCanvas(gui);
			if (!isDrawing) {
				isDrawing = true;
				await drawImage(gui.canvas, gui.ctx, duration);
				isDrawing = false;
			}
			quiztimerOptions.position = position;
			localStorage.setItem('position', JSON.stringify(quiztimerOptions.position));
			localStorage.setItem('x', JSON.stringify(quiztimerOptions.x));
			localStorage.setItem('y', JSON.stringify(quiztimerOptions.y));
		}
		/**
		 * Initializes the Zoom SDK with required capabilities and sets up rendering context.
		 * Configures video dimensions, runs rendering context on camera view, and adds event listeners.
		 *
		 * @param {{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D}} gui - GUI object with canvas and context
		 * @returns {Promise<void>}
		 * @example
		 * await initZoomSdk(gui);
		 */
		async function initZoomSdk(gui) {
			// Initialize the Zoom SDK with the given capabilities
			const configResult = await zoomSdk.config({
				version: '0.16.19',
				popoutSize: { width: 322, height: 350 },
				capabilities: [
					'authorize',
					'onAuthorized',
					// 'shareApp',
					'drawImage',
					'clearImage',
					'runRenderingContext',
					'getRunningContext',
					'closeRenderingContext',
					'onMyMediaChange',
				],
				onAuthorized: _authResponse => {
				},
			});

			// Get the video size from the config result. Some clients/contexts
			// return a config without media.renderTarget; bail out with a clear
			// message instead of throwing deep inside initialization.
			const renderTarget = configResult?.media?.renderTarget;
			if (!renderTarget?.width || !renderTarget?.height) {
				console.error('Zoom did not provide a camera render target; timer overlay unavailable.', configResult?.runningContext);
				return;
			}
			videoSize = { height: renderTarget.height, width: renderTarget.width };

			// Run the rendering context with the given view
			zoomSdk
				.runRenderingContext({
					view: 'camera',
				})
				.then(async () => {
					renderingContextActive = true;
					// Get the current running context
					await zoomSdk.getRunningContext();
					// Initialize the timer
					initCanvas(gui);
					if (!listenersRegistered) {
						addEventListeners(gui);
						listenersRegistered = true;
					}
				})
				.catch(async error => {
					// Log the error
					console.error('Zoom rendering context error:', error);
				});
		} // initZoomSdk

		/**
		 * Registers Zoom SDK event listeners for app visibility, popout, and media changes.
		 * Handles video on/off state by closing or reinitializing the rendering context.
		 *
		 * @param {{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D}} gui - GUI object with canvas and context
		 */
		function addEventListeners(gui) {
			// Close the rendering context when the user's camera goes off, and
			// re-establish it when the camera comes back on.
			zoomSdk.addEventListener('onMyMediaChange', event => {
				const videoOn = event?.media?.video?.state;
				if (videoOn === false) {
					if (!renderingContextActive) return;
					zoomSdk
						.closeRenderingContext()
						.then(() => {
							renderingContextActive = false;
						})
						.catch(error => {
							console.error('Error closing rendering context:', error);
						});
				} else if (videoOn && !renderingContextActive) {
					initZoomSdk(gui);
				}
			});
		} // addEventListeners

		/**
		 * Calculates the optimal font size to fit "88" within the canvas width.
		 * Uses binary search to find the largest font size that fits with padding.
		 * Returns position and sizing information for text rendering.
		 *
		 * @param {string} fontFamily - Font family name to use for calculation
		 * @returns {[number, number, number, number, number]} Array containing [x, y, fontSize, canvasWidth, canvasHeight]
		 */
		function calcFontSize(fontFamily) {
			// Create virtual canvas for calculations
			const virtualCanvas = document.createElement('canvas');
			const virtualCtx = virtualCanvas.getContext('2d');
			virtualCanvas.width = quiztimerOptions.boxSize;

			const text = '88';
			const paddingPercent = 5; // Padding as percentage of text size

			// Binary search to find largest possible font size that fits the width
			let minSize = 10;
			let maxSize = 1000;
			let bestFontSize = minSize;

			while (maxSize - minSize > 1) {
				bestFontSize = Math.floor((minSize + maxSize) / 2);
				virtualCtx.font = `bold ${bestFontSize}px ${fontFamily}`;

				const metrics = virtualCtx.measureText(text);
				const textWidth = metrics.width;
				const textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
				const padding = (textHeight * paddingPercent) / 100;

				if (textWidth + padding * 2 <= virtualCanvas.width) {
					minSize = bestFontSize;
				} else {
					maxSize = bestFontSize;
				}
			}

			// Use the found size and get final measurements
			bestFontSize = minSize;
			virtualCtx.font = `bold ${bestFontSize}px ${fontFamily}`;

			const finalMetrics = virtualCtx.measureText(text);
			const finalTextWidth = finalMetrics.width;
			const finalTextHeight = finalMetrics.actualBoundingBoxAscent + finalMetrics.actualBoundingBoxDescent;
			const padding = (finalTextHeight * paddingPercent) / 100;

			// Set final canvas height
			virtualCanvas.height = finalTextHeight + padding * 2;

			// Calculate position to center text horizontally
			const x = (virtualCanvas.width - finalTextWidth) / 2;
			const y = finalMetrics.actualBoundingBoxAscent + padding;

			return [x, y, bestFontSize, virtualCanvas.width, virtualCanvas.height];
		}
		/**
		 * Initializes the canvas with proper dimensions, font settings, and initial timer display.
		 * Calculates font size, sets canvas dimensions, applies text styles, and draws initial time.
		 *
		 * @param {{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D}} gui - GUI object with canvas and context
		 */
		function initCanvas(gui) {
			// Calculate optimal font size and positioning
			const fontFamily = 'Arial';
			const [x, y, bestFontSize, canvasWidth, canvasHeight] = calcFontSize(fontFamily);

			// Update global position variables
			posX = x;
			posY = y;

			// Set canvas dimensions
			gui.canvas.height = canvasHeight;
			gui.canvas.width = canvasWidth;

			// Reset font after canvas resize (canvas resize clears font settings)
			gui.ctx.font = `bold ${bestFontSize}px ${fontFamily}`;

			// Offset for tightening two-digit numbers 10-19: digits in Arial are
			// tabular (fixed advance width), so drawing the second digit at its
			// natural start position produces the same spacing as default
			// fillText — no visual tightening. Pull it in by ~15% of its own
			// advance width instead so 19-10 read visibly closer than default.
			const width1 = gui.ctx.measureText('1').width;
			const width8 = gui.ctx.measureText('8').width;
			secondDigitOffset18 = width1 - width8 * 0.15;

			// Invalidate cache and draw initial time
			invalidateCache();
			drawImage(gui.canvas, gui.ctx, duration);
		}

		/**
		 * Resets the timer to initial state and reinitializes the Zoom SDK rendering context.
		 * Clears all active timers, resets UI state, and closes/reopens the rendering context.
		 * This is a full reset that restarts the entire timer system.
		 *
		 * @param {{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D}} gui - GUI object with canvas and context
		 */
		function clear(gui) {
			// Clear all active timers
			if (timerTimeoutId) {
				clearTimeout(timerTimeoutId);
				timerTimeoutId = null;
			}
			if (timedResetId) {
				clearInterval(timedResetId);
				timedResetId = null;
			}

			// Reset timer state
			state = stop;
			timeLeft = duration;
			isDrawing = false;

			// Reset UI state
			btnStartStop.innerText = 'Start';
			btnContinue.disabled = true;
			btnContinue.classList.remove('active');

			const progressFill = btnContinue.querySelector('.progress-fill');
			if (progressFill) {
				progressFill.style.width = '0%';
			}

			// Invalidate cache to force fresh draw
			invalidateCache();

			// Close and reinitialize the Zoom rendering context
			zoomSdk
				.closeRenderingContext()
				.then(() => {
					renderingContextActive = false;
					initZoomSdk(gui);
				})
				.catch(error => {
					console.error('Error closing rendering context:', error);
					// Attempt to reinitialize anyway
					renderingContextActive = false;
					initZoomSdk(gui);
				});
		}
		/**
		 * Recalculates the X position to center text when time changes from double to single digit.
		 *
		 * @param {number} time - Current time value
		 */
		function recalcPosX(time) {
			const width = gui.ctx.measureText(time - 1).width;
			posX = (gui.canvas.width - width) / 2;
		}

		/**
		 * Draws a two-digit time value 10-19 as two separate glyphs, keeping the
		 * leading "1" fixed at x and placing the second digit at the offset
		 * naturally used by "18", so 19-10 all sit as tightly as "18" without
		 * the "1" shifting position.
		 *
		 * @param {CanvasRenderingContext2D} ctx
		 * @param {number} time
		 * @param {number} x
		 * @param {number} y
		 */
		function drawTightTwoDigit(ctx, time, x, y) {
			const str = String(time);
			ctx.fillText(str[0], x, y);
			ctx.fillText(str[1], x + secondDigitOffset18, y);
		}

		/**
		 * Starts the timer from the current duration value.
		 * Clears any pending timed reset, updates button states, and begins countdown.
		 *
		 * @param {{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D}} gui - GUI object with canvas and context
		 * @returns {Promise<void>}
		 */
		async function startTimer(gui) {
			if (timedResetId) clearInterval(timedResetId); // User restarts timer before automatic reset is complete -> clear autommatic reset

			state = running;
			btnStartStop.innerText = 'Stop';

			btnContinue.disabled = true;
			const progressFill = btnContinue.querySelector('.progress-fill');
			progressFill.style.width = '0%';
			btnContinue.classList.remove('active');

			runTimer(duration, gui);
		}
		/**
		 * Stops the timer and enables the continue button.
		 * Clears the running timeout, updates UI state, and starts timed reset countdown.
		 *
		 * @param {{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D}} gui - GUI object with canvas and context
		 */
		function stopTimer(gui) {
			// Set the state to stop
			state = stop;

			// Enable the continue button during countdown
			btnContinue.disabled = false;

			// Clear the timeout to stop the timer
			if (timerTimeoutId) {
				clearTimeout(timerTimeoutId);
			}

			// Update the button text to "Start"
			btnStartStop.innerText = 'Start';

			// Apply dark state to continue button
			btnContinue.classList.add('active');

			// Reset the timer after a delay
			timedReset(gui);
		}
		/**
		 * Continues the timer from the paused state with remaining time.
		 * Resumes countdown, updates button states, and clears timed reset.
		 *
		 * @param {{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D}} gui - GUI object with canvas and context
		 */
		function continueTimer(gui) {
			// Set the state to running
			state = running;

			// Update the button text to "Stop"
			btnStartStop.innerText = 'Stop';

			// Disable the continue button
			btnContinue.disabled = true;

			// Clear the interval to stop the timed reset
			clearInterval(timedResetId);

			// Reset the progress bar and remove dark state
			const progressFill = btnContinue.querySelector('.progress-fill');
			progressFill.style.width = '0%';
			btnContinue.classList.remove('active');

			// Start the timer with the remaining time
			runTimer(timeLeft, gui);
		}
		/**
		 * Initiates a 5-second countdown before automatically resetting the timer.
		 * Shows progress bar animation on the continue button during countdown.
		 * If countdown completes, disables continue button and redraws timer at full duration.
		 *
		 * @param {{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D}} gui - GUI object with canvas and context
		 */
		function timedReset(gui) {
			const progressFill = btnContinue.querySelector('.progress-fill');
			progressFill.style.width = '100%';
			let width = 100;
			timedResetId = setInterval(() => {
				width -= 2;
				progressFill.style.width = width + '%';
				if (width <= 0) {
					clearInterval(timedResetId);
					progressFill.style.width = '0%';
					// Disable the continue button after countdown completes
					btnContinue.disabled = true;
					recalcPosX(duration);
					if (!isDrawing) {
						isDrawing = true;
						drawImage(gui.canvas, gui.ctx, duration).then(() => {
							isDrawing = false;
						});
					}
				}
			}, 50);
		}
		/** @type {boolean} Flag to prevent concurrent drawImage calls */
		let isDrawing = false;

		/** @type {number|null} Performance timestamp when timer started */
		let timerStartTime = null;

		/** @type {number|null} Timeout ID for timer update scheduling */
		let timerTimeoutId = null;

		/** @type {number|null} Last time value that was displayed */
		let lastDisplayedTime = null;

		/** @type {boolean} Flag to track if blinking animation has been triggered */
		let blinkingTriggered = false;

		/**
		 * Runs the timer countdown from the specified duration.
		 * Uses performance.now() for accurate timing independent of execution delays.
		 * Schedules updates every 50ms and triggers animations on time changes.
		 *
		 * @param {number} duration - Starting duration in seconds
		 * @param {{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D}} gui - GUI object with canvas and context
		 */
		function runTimer(duration, gui) {
			timeLeft = duration;
			timerStartTime = performance.now(); // Record start time once
			lastDisplayedTime = duration;
			blinkingTriggered = false; // Reset blink flag

			// Initial draw with async handling
			isDrawing = true;
			drawImage(gui.canvas, gui.ctx, timeLeft).then(() => {
				isDrawing = false;
			});

			// Start the timing loop
			scheduleTimerUpdate(duration, gui);
		}

		/**
		 * Schedules the next timer update check using setTimeout.
		 * Calculates elapsed time and updates display only when time value changes.
		 * Continues scheduling updates until timer reaches 0, then stops and resets.
		 *
		 * @param {number} duration - Original starting duration in seconds
		 * @param {{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D}} gui - GUI object with canvas and context
		 */
		function scheduleTimerUpdate(duration, gui) {
			timerTimeoutId = setTimeout(async () => {
				const elapsedMs = performance.now() - timerStartTime;

				// Calculate the current time based on actual elapsed time, not setInterval ticks
				// This makes the timer independent of execution delays
				const newTimeLeft = Math.round(duration - elapsedMs / 1000);

				// Only update display if the time value has changed
				if (newTimeLeft !== lastDisplayedTime) {
					timeLeft = newTimeLeft;
					lastDisplayedTime = newTimeLeft;

					if (timeLeft % 10 === 9) {
						recalcPosX(timeLeft);
					}

					// Draw the new time with animations (if enabled). Awaited so
					// isDrawing has settled before the timeLeft<=0 check below
					// decides whether to trigger the blink animation.
					if (!isDrawing) {
						isDrawing = true;
						await drawImage(
							gui.canvas,
							gui.ctx,
							timeLeft,
							quiztimerOptions.pulseAnimation,
							quiztimerOptions.shakeAnimation
						);
						isDrawing = false;
					}
				}

				// Check if timer should stop
				if (timeLeft <= 0) {
					btnStartStop.innerText = 'Start';
					state = stop;

					// Trigger blinking animation if enabled and not already triggered
					if (quiztimerOptions.blinkAnimation && !blinkingTriggered && !isDrawing) {
						blinkingTriggered = true;
						isDrawing = true;

						// Prepare animation options
						const animOptions = {
							backgroundTransparency: quiztimerOptions.backgroundTransparency,
							numberTransparency: quiztimerOptions.numberTransparency,
							posX,
							posY,
							x: quiztimerOptions.x,
							y: quiztimerOptions.y,
							zoomSdk,
							zIndex,
							prevImageId,
							getColorState,
							getColorsForState,
						};

						Animations.blinkAtTimeout(gui.canvas, gui.ctx, 0, animOptions).then(() => {
							prevImageId = animOptions.prevImageId;
							isDrawing = false;
							timedReset(gui);
						});
					} else {
						timedReset(gui);
					}
				} else {
					// Schedule the next update check
					scheduleTimerUpdate(duration, gui);
				}
			}, 150); // The display only needs whole-second resolution; 150ms gives
			// ~6-7 checks per second, comfortably enough to never miss a
			// second boundary while cutting JS wake-ups ~3x versus 50ms.
		}

		/**
		 * Determines the current color state based on time remaining.
		 *
		 * @param {number} time - Seconds remaining
		 * @returns {'standard'|'warning'|'timeout'} Color state identifier
		 */
		function getColorState(time) {
			if (time === 0) return 'timeout';
			if (time <= 5) return 'warning';
			return 'standard';
		}

		/**
		 * Retrieves the color configuration for a given state.
		 *
		 * @param {'standard'|'warning'|'timeout'} state - Color state identifier
		 * @returns {{number: string, background: string}} Color configuration object
		 */
		function getColorsForState(state) {
			const stateMap = {
				standard: quiztimerOptions.colorsStandard,
				warning: quiztimerOptions.colorsWarning,
				timeout: quiztimerOptions.colorsTimeout,
			};
			return stateMap[state];
		}

		/**
		 * Invalidates the render cache when colors or layout change.
		 * Forces a full redraw on the next drawImage call.
		 */
		function invalidateCache() {
			lastDrawnTime = null;
			lastColorState = null;
			cachedImageData = null;
		}

		/**
		 * Converts a hex color to rgba format with specified alpha transparency.
		 *
		 * @param {string} hex - Hex color code (e.g., '#FF0000')
		 * @param {number} alpha - Alpha value from 0 (transparent) to 1 (opaque)
		 * @returns {string} RGBA color string (e.g., 'rgba(255, 0, 0, 0.5)')
		 */
		function hexToRgba(hex, alpha) {
			const r = Number.parseInt(hex.slice(1, 3), 16);
			const g = Number.parseInt(hex.slice(3, 5), 16);
			const b = Number.parseInt(hex.slice(5, 7), 16);
			return `rgba(${r}, ${g}, ${b}, ${alpha})`;
		}

		/**
		 * Draws the timer display on the canvas and sends it to Zoom SDK.
		 * Optimized with caching to reduce unnecessary SDK calls.
		 * Handles state transitions with optional animations (pulse, shake).
		 * Applies transparency settings and manages image replacement on Zoom canvas.
		 *
		 * @param {HTMLCanvasElement} canvas - Canvas element to draw on
		 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
		 * @param {number} time - Time value to display
		 * @param {boolean} [enablePulse=false] - Enable pulse animation on time changes
		 * @param {boolean} [enableShake=false] - Enable shake animation on timeout
		 * @returns {Promise<void>}
		 */
		async function drawImage(canvas, ctx, time, enablePulse = false, enableShake = false) {
			// Determine if visual content has changed
			const currentColorState = getColorState(time);
			const contentChanged = lastDrawnTime !== time || lastColorState !== currentColorState;

			// Skip SDK call entirely if nothing visual changed
			if (!contentChanged) {
				return; // Don't call SDK if visual content is identical
			}

			const colors = getColorsForState(currentColorState);
			const fgColor = colors.number;
			const bgColor = `${colors.background}`;

			// Detect state transition (not just time change)
			const stateChanged = lastColorState !== null && lastColorState !== currentColorState;
			const timeChanged = lastDrawnTime !== time && !stateChanged;
			const enteringTimeout = stateChanged && currentColorState === 'timeout';

			// Prepare animation options
			const animOptions = {
				backgroundTransparency: quiztimerOptions.backgroundTransparency,
				numberTransparency: quiztimerOptions.numberTransparency,
				posX,
				posY,
				secondDigitOffset18,
				x: quiztimerOptions.x,
				y: quiztimerOptions.y,
				zoomSdk,
				zIndex,
				prevImageId,
				lastDrawnTime,
				lastColorState,
				getColorState,
				getColorsForState,
			};

			// If entering timeout state and shake is enabled, play shake animation
			if (enteringTimeout && enableShake) {
				await Animations.shakeTransition(canvas, ctx, time, animOptions);
				prevImageId = animOptions.prevImageId;
				lastDrawnTime = animOptions.lastDrawnTime;
				lastColorState = animOptions.lastColorState;
				return;
			}

			// If only time changed and pulse is enabled, play pulse animation
			if (timeChanged && enablePulse) {
				await Animations.pulseTransition(canvas, ctx, time, animOptions);
				prevImageId = animOptions.prevImageId;
				lastDrawnTime = animOptions.lastDrawnTime;
				lastColorState = animOptions.lastColorState;
				return;
			}

			// Apply transparency: convert hex to rgba with alpha
			// 0% = fully transparent, 100% = fully opaque
			const bgAlpha = transparencyToAlpha(quiztimerOptions.backgroundTransparency);
			const fgAlpha = transparencyToAlpha(quiztimerOptions.numberTransparency);
			const bgColorWithAlpha = hexToRgba(bgColor, bgAlpha);
			const fgColorWithAlpha = hexToRgba(fgColor, fgAlpha);

			// Clear canvas to transparent before drawing
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			// Redraw canvas
			ctx.fillStyle = bgColorWithAlpha;
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			// Draw text
			ctx.fillStyle = fgColorWithAlpha;
			if (time >= 10 && time <= 19) {
				drawTightTwoDigit(ctx, time, posX, posY);
			} else {
				ctx.fillText(time, posX, posY);
			}

			// Cache the image data
			cachedImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
			lastDrawnTime = time;
			lastColorState = currentColorState;

			//---------------------------------------------------------------
			const x = quiztimerOptions.x;
			const y = quiztimerOptions.y;

			// First time: create the image
			if (prevImageId === '0') {
				if (zIndex === undefined) {
					zIndex = 1;
				}
				const drawResult = await zoomSdk.drawImage({
					imageData: cachedImageData,
					zIndex,
					x,
					y,
				});
				prevImageId = drawResult.imageId;
			} else {
				// For subsequent draws, just draw new image - SDK will handle replacing the old one
				// Don't clear, just draw on top with the same zIndex
				const drawResult = await zoomSdk.drawImage({
					imageData: cachedImageData,
					zIndex,
					x,
					y,
				});

				// Clear the old image after the new one is drawn and returned
				zoomSdk.clearImage({ imageId: prevImageId }).catch(() => {}); // Fire and forget after new one is ready

				prevImageId = drawResult.imageId;
			}
		}

		// ========================================================================================================
		// === Color options ============================================================================================
		// ========================================================================================================

		// --- colorSelectorNumberStandard -------------------------------------------------------
		const colorSelectorNumberStandard = document.getElementById('colorSelectorNumberStandard');
		const colorSelectorBackgroundStandard = document.getElementById('colorSelectorBackgroundStandard');
		const colorExampleStandard = document.getElementById('colorExampleStandard');

		//--- set color selectors
		colorSelectorNumberStandard.value = quiztimerOptions.colorsStandard.number;
		colorSelectorBackgroundStandard.value = quiztimerOptions.colorsStandard.background;
		colorExampleStandard.style.color = quiztimerOptions.colorsStandard.number;
		colorExampleStandard.style.background = quiztimerOptions.colorsStandard.background;

		colorSelectorNumberStandard.addEventListener('input', e => {
			colorExampleStandard.style.color = e.target.value;
			quiztimerOptions.colorsStandard.number = e.target.value;
			invalidateCache();
		});

		colorSelectorBackgroundStandard.addEventListener('input', e => {
			colorExampleStandard.style.background = e.target.value;
			quiztimerOptions.colorsStandard.background = e.target.value;
			invalidateCache();
		});

		colorSelectorNumberStandard.addEventListener('change', _e => {
			saveOption('colorsStandard', quiztimerOptions.colorsStandard, gui);
		});

		colorSelectorBackgroundStandard.addEventListener('change', _e => {
			saveOption('colorsStandard', quiztimerOptions.colorsStandard, gui);
		});
		// --- colorSelectorNumberWarning -------------------------------------------------------
		const colorSelectorNumberWarning = document.getElementById('colorSelectorNumberWarning');
		const colorSelectorBackgroundWarning = document.getElementById('colorSelectorBackgroundWarning');
		const colorExampleWarning = document.getElementById('colorExampleWarning');

		colorSelectorNumberWarning.value = quiztimerOptions.colorsWarning.number;
		colorSelectorBackgroundWarning.value = quiztimerOptions.colorsWarning.background;
		colorExampleWarning.style.color = quiztimerOptions.colorsWarning.number;
		colorExampleWarning.style.background = quiztimerOptions.colorsWarning.background;

		colorSelectorNumberWarning.addEventListener('input', e => {
			colorExampleWarning.style.color = e.target.value;
			quiztimerOptions.colorsWarning.number = e.target.value;
			invalidateCache();
		});

		colorSelectorBackgroundWarning.addEventListener('input', e => {
			colorExampleWarning.style.background = e.target.value;
			quiztimerOptions.colorsWarning.background = e.target.value;
			invalidateCache();
		});

		colorSelectorNumberWarning.addEventListener('change', _e => {
			saveOption('colorsWarning', quiztimerOptions.colorsWarning, gui);
		});

		colorSelectorBackgroundWarning.addEventListener('change', _e => {
			saveOption('colorsWarning', quiztimerOptions.colorsWarning, gui);
		});

		//--- colorSelectorNumberTimeout -------------------------------------------------------
		const colorSelectorNumberTimeout = document.getElementById('colorSelectorNumberTimeout');
		const colorSelectorBackgroundTimeout = document.getElementById('colorSelectorBackgroundTimeout');
		const colorExampleTimeout = document.getElementById('colorExampleTimeout');

		colorSelectorNumberTimeout.value = quiztimerOptions.colorsTimeout.number;
		colorSelectorBackgroundTimeout.value = quiztimerOptions.colorsTimeout.background;
		colorExampleTimeout.style.color = quiztimerOptions.colorsTimeout.number;
		colorExampleTimeout.style.background = quiztimerOptions.colorsTimeout.background;

		colorSelectorNumberTimeout.addEventListener('input', e => {
			colorExampleTimeout.style.color = e.target.value;
			quiztimerOptions.colorsTimeout.number = e.target.value;
			invalidateCache();
		});

		colorSelectorBackgroundTimeout.addEventListener('input', e => {
			colorExampleTimeout.style.background = e.target.value;
			quiztimerOptions.colorsTimeout.background = e.target.value;
			invalidateCache();
		});

		colorSelectorNumberTimeout.addEventListener('change', _e => {
			saveOption('colorsTimeout', quiztimerOptions.colorsTimeout, gui);
		});

		colorSelectorBackgroundTimeout.addEventListener('change', _e => {
			saveOption('colorsTimeout', quiztimerOptions.colorsTimeout, gui);
		});

		// --- Transparency Sliders -------------------------------------------------------
		const backgroundTransparencySlider = document.getElementById('backgroundTransparencySlider');
		const numberTransparencySlider = document.getElementById('numberTransparencySlider');

		// Set initial values
		backgroundTransparencySlider.value = quiztimerOptions.backgroundTransparency;
		numberTransparencySlider.value = quiztimerOptions.numberTransparency;

		// Update examples when background transparency changes
		backgroundTransparencySlider.addEventListener('input', e => {
			const alphaValue = Number.parseInt(e.target.value);
			quiztimerOptions.backgroundTransparency = alphaValue;
			invalidateCache();
			updateExampleTransparency();
			// Update the timer display in the video immediately
			if (!isDrawing && state === stop) {
				isDrawing = true;
				drawImage(gui.canvas, gui.ctx, duration).then(() => {
					isDrawing = false;
				});
			}
		});

		backgroundTransparencySlider.addEventListener('change', _e => {
			localStorage.setItem('backgroundTransparency', JSON.stringify(quiztimerOptions.backgroundTransparency));
		});

		// Update examples when number transparency changes
		numberTransparencySlider.addEventListener('input', e => {
			const alphaValue = Number.parseInt(e.target.value);
			quiztimerOptions.numberTransparency = alphaValue;
			invalidateCache();
			updateExampleTransparency();
			// Update the timer display in the video immediately
			if (!isDrawing && state === stop) {
				isDrawing = true;
				drawImage(gui.canvas, gui.ctx, duration).then(() => {
					isDrawing = false;
				});
			}
		});

		numberTransparencySlider.addEventListener('change', _e => {
			localStorage.setItem('numberTransparency', JSON.stringify(quiztimerOptions.numberTransparency));
		});

		/**
		 * Updates the transparency on all color example previews in the UI.
		 * Applies current background and number transparency settings to preview elements.
		 */
		function updateExampleTransparency() {
			const examples = ['colorExampleStandard', 'colorExampleWarning', 'colorExampleTimeout'];

			for (const exampleId of examples) {
				const example = document.getElementById(exampleId);
				if (example) {
					// 0% transparency = fully opaque, 100% = fully transparent
					const bgAlpha = transparencyToAlpha(quiztimerOptions.backgroundTransparency);
					const fgAlpha = transparencyToAlpha(quiztimerOptions.numberTransparency);
					const bgColor = example.style.background;
					const fgColor = example.style.color;

					// Apply both transparencies
					example.style.background = hexToRgba(bgColor, bgAlpha);
					example.style.color = hexToRgba(fgColor, fgAlpha);
				}
			}
		}

		// Apply initial transparency to examples
		updateExampleTransparency();

		/**
		 * Saves an option to localStorage and redraws the timer display.
		 *
		 * @param {string} name - Option name/key for localStorage
		 * @param {*} value - Option value to save (will be JSON stringified)
		 * @param {{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D}} gui - GUI object with canvas and context
		 */
		function saveOption(name, value, gui) {
			localStorage.setItem(name, JSON.stringify(value));
			drawImage(gui.canvas, gui.ctx, duration);
		}
	}
};
