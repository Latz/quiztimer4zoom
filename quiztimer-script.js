// --------------------------------------------------------------------------------
// load options from local storage or set defaults
// --------------------------------------------------------------------------------
const position = JSON.parse(localStorage.getItem('position')) || 'posTopLeft';
const boxSize = JSON.parse(localStorage.getItem('boxSize')) || 300;
const colorsStandard = JSON.parse(localStorage.getItem('colorsStandard')) || {
	number: '#000000',
	background: '#ffffff',
};
const colorsWarning = JSON.parse(localStorage.getItem('colorsWarning')) || {
	number: '#000000',
	background: '#ffff00',
};
const colorsTimeout = JSON.parse(localStorage.getItem('colorsTimeout')) || {
	number: '#000000',
	background: '#ff0000',
};
const textX = JSON.parse(localStorage.getItem('textX')) || 0;
const textY = JSON.parse(localStorage.getItem('textY')) || 0;
const y = JSON.parse(localStorage.getItem('y')) || 0;
const x = JSON.parse(localStorage.getItem('x')) || 0;

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
};
console.log('🚀 ~ quiztimerOptions:', quiztimerOptions);

let videoSize;

document.onreadystatechange = async () => {
	if (document.readyState === 'complete') {
		console.log('X');
		let zIndex;
		let prevImageId = '0';

		const stop = Symbol('stop');
		const running = Symbol('running');
		let state = stop;

		let duration = 20;
		let timerId = 0;
		let timeLeft = 0;
		let timedResetId;

		let posX = 10,
			posY = 10; // where to draw the text

		// Cache for optimized redraws
		let lastDrawnTime = null;
		let lastColorState = null;
		let cachedImageData = null;

		const btnStartStop = document.getElementById('btn_startStop');
		const btnContinue = document.getElementById('btn_continue');
		// --------------------------------------------------------------------
		const gui = initGui();
		console.log('🚀 ~ gui:', gui);
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
		 *
		 * Actions include starting or stopping the timer, continuing the timer, and setting the duration to 20 or 30 seconds.
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
					case 'btn_help':
						break;
				}
			});

			// add click listeners to corner positions
			document.getElementById('position').addEventListener('click', event => {
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
				quiztimerOptions.boxSize = quiztimerOptions.boxSize + value;
				// initCanvas(gui);
				setPosition(quiztimerOptions.position, gui);
				localStorage.setItem('boxSize', JSON.stringify(quiztimerOptions.boxSize));
			});

			return gui;
		}

		/**
		 * Resets the timer to its initial state.
		 * @param {Object} gui - The object containing the canvas and context.
		 * @example
		 * resetTimer(gui);
		 */
		//--------------------------------------------------------------------
		/**
		 * Reset the timer to its initial state by calling the clear function to reset the canvas and its context.
		 *
		 * @param {Object} gui - The GUI object used for the timer interface.
		 */
		function resetTimer(gui) {
			// Reset the timer to its initial state
			// Call clear to reset the canvas and its context
			clear(gui);
		}
		//--------------------------------------------------------------------
		/**
		 * Updates the duration value and triggers the drawing of an image on the canvas.
		 *
		 * @param {Object} gui - The GUI object containing canvas and context properties.
		 * @param {number} time - The new duration value to be set.
		 */
		function setDuration(gui, time) {
			duration = time;
			drawImage(gui.canvas, gui.ctx, duration);
		}
		//--------------------------------------------------------------------
		/**
		 * Sets the position based on the event target ID within the GUI.
		 *
		 * @param {Event} event - The event triggering the position change.
		 * @param {Object} gui - The GUI object containing canvas and context information.
		 */
		async function setPosition(position, gui) {
			console.log('🚀 ~ setPosition ~ position:', position);
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
			drawImage(gui.canvas, gui.ctx, duration);
			quiztimerOptions.position = position;
			console.log('Saved position', quiztimerOptions.position);
			localStorage.setItem('position', JSON.stringify(quiztimerOptions.position));
			localStorage.setItem('x', JSON.stringify(quiztimerOptions.x));
			localStorage.setItem('y', JSON.stringify(quiztimerOptions.y));
		}
		// --------------------------------------------------------------------
		/**
		 * Initializes the Zoom SDK with the given capabilities.
		 * @param {Object} gui - The GUI object containing canvas and context information.
		 * @example
		 * initZoomSdk(gui);
		 */
		async function initZoomSdk(gui) {
			console.log('init Zoom sdk');
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
				onAuthorized: authResponse => {
					console.log('Initial authorization complete', authResponse);
				},
			});

			// Get the video size from the config result
			let height = configResult.media.renderTarget.height;
			let width = configResult.media.renderTarget.width;
			videoSize = { height, width };

			// Run the rendering context with the given view
			zoomSdk
				.runRenderingContext({
					view: 'camera',
				})
				.then(async () => {
					// Get the current running context
					await zoomSdk.getRunningContext();
					// Initialize the timer
					initCanvas(gui);
					addEventListeners(gui);
				})
				.catch(async error => {
					// Log the error
					console.log('Error:', error);
				});
		} // initZoomSdk

		function addEventListeners(gui) {
			// Set an event listener for the app visibility change event
			zoomSdk.addEventListener('onAppVisibilityChange', event => {
				console.log('onAppVisibilityChange', event);
			});

			// Set an event listener for the app popout event
			zoomSdk.addEventListener('onAppPopout', event => {
				console.log(event);
			});

			// Set an event listener for the app popout event
			zoomSdk.addEventListener('onAppVisibilityChange', event => {
				console.log('onAppVisibilityChange', event);
			});

			// Set an event listener for the myMediaChange event
			// and debounce it
			zoomSdk.addEventListener('onMyMediaChange', event => {
				if (event.media.video.state === false) {
					zoomSdk
						.closeRenderingContext()
						.then(() => {
							console.log('closeRenderingContext returned');
						})
						.catch(e => {
							console.log(e);
						});
				} else {
					initZoomSdk(gui);
					initCanvas(gui);
				}
			});
		} // addEventListeners

		// ----------------------------------------------------------------------------------------------------
		function getColors(time) {
			let bgColor = `${quiztimerOptions.backgroundStandard}`;
			let fgColor = quiztimerOptions.numberStandard;
			if (time <= 5) {
				fgColor = quiztimerOptions.numberWarning;
				bgColor = `${quiztimerOptions.backgroundWarning}`;
			}
			if (time === 0) {
				fgColor = quiztimerOptions.numberTimeout;
				bgColor = `${quiztimerOptions.backgroundTimeout}`;
			}
			return { fgColor, bgColor };
		}

		// ----------------------------------------------------------------------------------------------------
		function calcFontsize(fontFamily) {
			// create virtual canvas
			const virtualCanvas = document.createElement('canvas');
			const virtualCtx = virtualCanvas.getContext('2d');
			virtualCanvas.width = quiztimerOptions.boxSize;
			virtualCanvas.height = quiztimerOptions.boxSize;

			const text = '88';
			const paddingPercent = 5; // Padding as percentage of text size
			const cornerRadius = 15; // Radius for rounded corners

			// Set initial font to measure
			virtualCtx.font = `bold 10px ${fontFamily}`;

			// Measure the text
			const metrics = virtualCtx.measureText(text);
			const textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
			// Set canvas width and adjust height to match text height
			// canvas.width = canvasWidth;
			virtualCanvas.height = textHeight + ((textHeight * paddingPercent) / 100) * 2;

			// Clear the virtualCanvas
			virtualCtx.clearRect(0, 0, virtualCanvas.width, virtualCanvas.height);

			// Apply rounded corners to virtualCanvas element via CSS
			virtualCanvas.style.borderRadius = `${cornerRadius}px`;

			// Binary search to find largest possible font size that fits the width
			let minSize = 10;
			let maxSize = 1000;
			let bestFontSize = 0;

			while (maxSize - minSize > 1) {
				bestFontSize = Math.floor((minSize + maxSize) / 2);
				virtualCtx.font = `bold ${bestFontSize}px ${fontFamily}`;

				const newMetrics = virtualCtx.measureText(text);
				const newTextWidth = newMetrics.width;
				const newTextHeight = newMetrics.actualBoundingBoxAscent + newMetrics.actualBoundingBoxDescent;
				const padding = (newTextHeight * paddingPercent) / 100;

				if (newTextWidth + padding * 2 <= virtualCanvas.width) {
					minSize = bestFontSize;
				} else {
					maxSize = bestFontSize;
				}
			}

			// Use the found size
			bestFontSize = minSize;
			virtualCtx.font = `bold  ${bestFontSize}px ${fontFamily}`;

			// Measure the text with final font size
			const finalMetrics = virtualCtx.measureText(text);
			const finalTextWidth = finalMetrics.width;
			const finalTextHeight = finalMetrics.actualBoundingBoxAscent + finalMetrics.actualBoundingBoxDescent;
			const padding = (finalTextHeight * paddingPercent) / 100;

			// Resize virtualCanvas height to match the text height with the new font size
			virtualCanvas.height = finalTextHeight + padding * 2;

			// Calculate position to center text horizontally
			const x = (virtualCanvas.width - finalTextWidth) / 2;
			const y = finalMetrics.actualBoundingBoxAscent + padding;

			return [x, y, bestFontSize, virtualCanvas.width, virtualCanvas.height];
		}
		// ----------------------------------------------------------------------------------------------------
		function initCanvas(gui) {
			// Set text properties
			const fontFamily = 'Arial';
			let [x, y, bestFontSize, canvasWidth, canvasHeight] = calcFontsize(fontFamily);
			posX = x;
			posY = y;
			gui.canvas.height = canvasHeight;
			gui.canvas.width = canvasWidth;

			const { fgColor, bgColor } = getColors(20);

			// ####
			// Reset font after canvas resize (canvas reset clears font settings)
			gui.ctx.font = `bold  ${bestFontSize}px ${fontFamily}`;

			// Set text style
			gui.ctx.fillStyle = bgColor;
			gui.ctx.textAlign = 'left';
			gui.ctx.textBaseline = 'alphabetic';

			invalidateCache();
			drawImage(gui.canvas, gui.ctx, 20);
		}

		// ----------------------------------------------------------------------------------------------------

		/**
		 * Clears the current timer state and reinitializes the Zoom SDK.
		 * @param {Object} gui - The GUI object containing canvas and context information.
		 */
		function clear(gui) {
			// Reset the time left to the initial duration
			timeLeft = duration;

			// Close the current rendering context and reinitialize the Zoom SDK
			zoomSdk.closeRenderingContext().then(() => {
				initZoomSdk(gui);
			});
		}
		// --------------------------------------------------------------------
		function recalcPosX(time) {
			const width = gui.ctx.measureText(time - 1).width;
			posX = (gui.canvas.width - width) / 2;
		}
		// --------------------------------------------------------------------
		async function startTimer(gui) {
			if (timedResetId) clearInterval(timedResetId); // User restarts timer before automatic reset is complete -> clear autommatic reset

			state = running;
			btnStartStop.innerText = 'Stop';

			btnContinue.disabled = true;
			timeLeft = duration;
			const progressFill = btnContinue.querySelector('.progress-fill');
			progressFill.style.width = '0%';
			btnContinue.classList.remove('active');

			runTimer(timeLeft, gui);
		}
		// --------------------------------------------------------------------
		/**
		 * Stops the timer and resets the interface.
		 * @param {Object} gui - The GUI object containing canvas and context information.
		 */
		function stopTimer(gui) {
			// Set the state to stop
			state = stop;

			// Enable the continue button during countdown
			btnContinue.disabled = false;

			// Clear the interval to stop the timer
			clearInterval(timerId);

			// Update the button text to "Start"
			btnStartStop.innerText = 'Start';

			// Apply dark state to continue button
			btnContinue.classList.add('active');

			// Reset the timer after a delay
			timedReset(gui);
		}
		// --------------------------------------------------------------------
		/**
		 * Continues the timer with the remaining time.
		 * @param {Object} gui - The GUI object containing canvas and context information.
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
		// --------------------------------------------------------------------
		function timedReset(gui) {
			const timeout = 5000;

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
					drawImage(gui.canvas, gui.ctx, duration);
				}
			}, 50);
		}
		// --------------------------------------------------------------------
		function runTimer(duration, gui) {
			timeLeft = duration;

			drawImage(gui.canvas, gui.ctx, timeLeft);
			timeLeft--;

			timerId = setInterval(() => {
				drawImage(gui.canvas, gui.ctx, timeLeft);

				timeLeft--;
				if (timeLeft % 10 === 9) {
					recalcPosX(timeLeft);
				}
				if (timeLeft < 0) {
					clearInterval(timerId);
					btnStartStop.innerText = 'Start';
					state = stop;
					timedReset(gui);
				}
			}, 1000);
		}

		// Helper function to determine current color state
		function getColorState(time) {
			if (time === 0) return 'timeout';
			if (time <= 5) return 'warning';
			return 'standard';
		}

		// Helper function to get colors for a given state
		function getColorsForState(state) {
			const stateMap = {
				standard: quiztimerOptions.colorsStandard,
				warning: quiztimerOptions.colorsWarning,
				timeout: quiztimerOptions.colorsTimeout,
			};
			return stateMap[state];
		}

		// Helper function to invalidate the render cache when colors or layout change
		function invalidateCache() {
			lastDrawnTime = null;
			lastColorState = null;
			cachedImageData = null;
		}

		// Optimized drawImage with caching to reduce SDK calls
		async function drawImage(canvas, ctx, time) {
			// Determine if visual content has changed
			const currentColorState = getColorState(time);
			const contentChanged = lastDrawnTime !== time || lastColorState !== currentColorState;

			// Skip canvas redraw if nothing visual changed
			if (contentChanged) {
				const colors = getColorsForState(currentColorState);
				const fgColor = colors.number;
				const bgColor = `${colors.background}`;

				// Redraw canvas only when needed
				ctx.fillStyle = bgColor;
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				ctx.fillStyle = fgColor;
				ctx.fillText(time, posX, posY);

				// Cache the image data
				cachedImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
				lastDrawnTime = time;
				lastColorState = currentColorState;
			}

			//---------------------------------------------------------------
			zIndex++;

			const x = quiztimerOptions.x;
			const y = quiztimerOptions.y;
			let imageId = await zoomSdk.drawImage({
				imageData: cachedImageData,
				zIndex,
				x,
				y,
			});
			// remove previous image
			if (prevImageId !== '0') {
				zoomSdk.clearImage(prevImageId);
			}
			prevImageId = imageId;
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

		// --- save color Options
		function saveOption(name, value, gui) {
			localStorage.setItem(name, JSON.stringify(value));
			drawImage(gui.canvas, gui.ctx, duration);
		}
	}
};
