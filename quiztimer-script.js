let quiztimerOptions = JSON.parse(localStorage.getItem('quiztimer'));
if (!quiztimerOptions) {
	quiztimerOptions = {
		position: 'TopRight', // TopLeft, TopRight, BottomLeft, BottomRight
		boxSize: 300,
		numberStandard: '#000000',
		numberWarning: '#000000',
		numberTimeout: '#000000',
		backgroundStandard: '#ffffff',
		backgroundWarning: '#ffff00',
		backgroundTimeout: '#ff0000',
		textX: 0,
		textY: 0,
		x: 0,
		y: 0,
	};
	localStorage.setItem('quiztimer', JSON.stringify(quiztimerOptions));
}

let isInitializing = true;

document.onreadystatechange = async () => {
	if (document.readyState === 'complete') {
		let zIndex;
		let prevImageId = '0';
		let videoSize = quiztimerOptions.size;

		const stop = Symbol('stop');
		const running = Symbol('running');
		let state = stop;

		let duration = 20;
		let timerId = 0;
		let timeLeft = 0;
		let timedResetId;

		let posX = 10,
			posY = 10; // where to draw the text

		const btnStartStop = document.getElementById('btn_startStop');
		const btnContinue = document.getElementById('btn_continue');
		const progressbar = document.getElementById('countdown');
		// --------------------------------------------------------------------
		const gui = initGui();
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
			const actionHandlers = {
				btn_startStop: () => {
					if (state === stop) startTimer(gui);
					else if (state === running) stopTimer(gui);
				},
				btn_continue: () => continueTimer(gui),
				btn_20sec: () => setDuration(gui, 20),
				btn_30sec: () => setDuration(gui, 30),
			};
			actions.addEventListener('click', event => {
				const handler = actionHandlers[event.target.id];
				if (handler) {
					handler();
				}
			});

			const options = document.getElementById('options');
			options.style.visibility = 'hidden';

			const subActionHandlers = {
				btn_options: () => {
					const isHidden = options.style.visibility === 'hidden';
					options.style.visibility = isHidden ? 'visible' : 'hidden';
					document.body.style.overflowY = isHidden ? 'scroll' : 'hidden';
				},
				btn_panic: () => resetTimer(gui),
				// btn_help is intentionally omitted as it has no action
			};
			const subActions = document.getElementById('subActions');
			subActions.addEventListener('click', event => {
				const handler = subActionHandlers[event.target.id];
				if (handler) {
					handler();
				}
			});

			// add click listeners to corner positions
			document.getElementById('position').addEventListener('click', event => {
				setPosition(event.target.id, gui);
			});

			// add listeners to size buttons
			const buttons_timerSize = document.getElementById('timerSize');
			const sizeAdjustments = {
				btn_timerSizeMinus: { value: -1, condition: () => canvas.height > 0 },
				btn_timerSizePlus: { value: 1 },
				btn_timerSizeMinusFast: {
					value: -5,
					condition: () => canvas.height > 4,
				},
				btn_timerSizePlusFast: { value: 5 },
			};
			buttons_timerSize.addEventListener('click', event => {
				const adjustment = sizeAdjustments[event.target.id];
				if (!adjustment || (adjustment.condition && !adjustment.condition())) {
					return;
				}

				quiztimerOptions.boxSize += adjustment.value;
				// initCanvas(gui);
				setPosition(quiztimerOptions.position, gui);
				localStorage.setItem('quiztimer', JSON.stringify(quiztimerOptions));
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
		function setPosition(position, gui) {
			const { width: videoWidth, height: videoHeight } = videoSize;
			const { width: canvasWidth, height: canvasHeight } = gui.canvas;

			if (position.includes('Left')) quiztimerOptions.x = 0;
			if (position.includes('Right'))
				quiztimerOptions.x = videoWidth - canvasWidth;

			if (position.includes('Top')) quiztimerOptions.y = 0;
			if (position.includes('Bottom'))
				quiztimerOptions.y = videoHeight - canvasHeight;

			initCanvas(gui);
			drawImage(gui.canvas, gui.ctx, duration);
			quiztimerOptions.position = position;
			localStorage.setItem('quiztimer', JSON.stringify(quiztimerOptions));
		}
		// --------------------------------------------------------------------
		/**
		 * Initializes the Zoom SDK with the given capabilities.
		 * @param {Object} gui - The GUI object containing canvas and context information.
		 * @example
		 * initZoomSdk(gui);
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
				onAuthorized: authResponse => {
					console.log('Initial authorization complete');
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
					isInitializing = false;
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
				console.log('onMyMediaChange', event.media.video.state, isInitializing);
				if (isInitializing) return;
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
			if (time === 0) {
				return {
					fgColor: quiztimerOptions.numberTimeout,
					bgColor: quiztimerOptions.backgroundTimeout,
				};
			}
			if (time <= 5) {
				return {
					fgColor: quiztimerOptions.numberWarning,
					bgColor: quiztimerOptions.backgroundWarning,
				};
			}
			return {
				fgColor: quiztimerOptions.numberStandard,
				bgColor: quiztimerOptions.backgroundStandard,
			};
		}

		// ----------------------------------------------------------------------------------------------------
		function calcFontsize(fontFamily) {
			// Reuse virtual canvas if it exists
			if (!calcFontsize.virtualCanvas) {
				calcFontsize.virtualCanvas = document.createElement('canvas');
				calcFontsize.virtualCtx = calcFontsize.virtualCanvas.getContext('2d');
			}

			const virtualCanvas = calcFontsize.virtualCanvas;
			const virtualCtx = calcFontsize.virtualCtx;

			virtualCanvas.width = quiztimerOptions.boxSize;
			virtualCanvas.height = quiztimerOptions.boxSize;

			const text = '88';
			const paddingPercent = 5;

			// Cache font string
			const baseFontString = `bold 10px ${fontFamily}`;
			virtualCtx.font = baseFontString;

			// Get initial measurements
			const metrics = virtualCtx.measureText(text);
			const textHeight =
				metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

			// Binary search with fewer iterations
			let minSize = 10;
			let maxSize = Math.min(500, quiztimerOptions.boxSize); // Cap max size
			let bestFontSize = minSize;

			while (maxSize - minSize > 0.5) {
				const testSize = Math.floor((minSize + maxSize) / 2);
				virtualCtx.font = `bold ${testSize}px ${fontFamily}`;

				const testMetrics = virtualCtx.measureText(text);
				const testWidth = testMetrics.width;
				const testHeight =
					testMetrics.actualBoundingBoxAscent +
					testMetrics.actualBoundingBoxDescent;
				const padding = (testHeight * paddingPercent) / 100;

				if (testWidth + padding * 2 <= virtualCanvas.width) {
					minSize = testSize;
					bestFontSize = testSize;
				} else {
					maxSize = testSize;
				}
			}

			// Set final font and get measurements
			virtualCtx.font = `bold ${bestFontSize}px ${fontFamily}`;
			const finalMetrics = virtualCtx.measureText(text);
			const finalTextWidth = finalMetrics.width;
			const finalTextHeight =
				finalMetrics.actualBoundingBoxAscent +
				finalMetrics.actualBoundingBoxDescent;
			const padding = (finalTextHeight * paddingPercent) / 100;

			// Calculate centered position
			const x = (virtualCanvas.width - finalTextWidth) / 2;
			const y = finalMetrics.actualBoundingBoxAscent + padding;
			const canvasHeight = finalTextHeight + padding * 2;

			return [x, y, bestFontSize, virtualCanvas.width, canvasHeight];
		}
		// ----------------------------------------------------------------------------------------------------
		function initCanvas(gui) {
			// Set text properties
			console.log('initCanvas!');
			const fontFamily = 'Arial';
			let [x, y, bestFontSize, canvasWidth, canvasHeight] =
				calcFontsize(fontFamily);
			posX = x;
			posY = y;
			console.log('canvasHeight', canvasHeight);
			console.log('canvasWidth', canvasWidth);
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
			console.log('GUI Canvas x, y', gui.canvas.width, gui.canvas.height);

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
			const progressbar = document.getElementById('countdown');
			progressbar.value = progressbar.max;

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

			// Enable the continue button
			btnContinue.disabled = false;

			// Clear the interval to stop the timer
			clearInterval(timerId);

			// Update the button text to "Start"
			btnStartStop.innerText = 'Start';

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

			// Reset the progress bar
			progressbar.value = progressbar.max;

			// Start the timer with the remaining time
			runTimer(timeLeft, gui);
		}
		// --------------------------------------------------------------------
		function timedReset(gui) {
			const timeout = 5000;

			progressbar.value = progressbar.max;
			const chunk = timeout / 10;
			timedResetId = setInterval(() => {
				progressbar.value = progressbar.value - progressbar.max / chunk;
				if (progressbar.value <= 0) {
					clearInterval(timedResetId);
					recalcPosX(duration);
					drawImage(gui.canvas, gui.ctx, duration);
				}
			}, 10);
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

		// --------------------------------------------------------------------
		async function drawImage(canvas, ctx, time) {
			console.log('draw Image');
			let fgColor = quiztimerOptions.numberStandard;
			// -----------------------------------------------------------------------------
			let bgColor = `${quiztimerOptions.backgroundStandard}`;
			if (time <= 5) {
				fgColor = quiztimerOptions.numberWarning;
				bgColor = `${quiztimerOptions.backgroundWarning}`;
			}
			if (time === 0) {
				fgColor = quiztimerOptions.numberTimeout;
				bgColor = `${quiztimerOptions.backgroundTimeout}`;
			}
			//---------------------------------------------------------------
			zIndex++;

			ctx.fillStyle = bgColor;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.fillStyle = fgColor;
			ctx.fillText(time, posX, posY);
			const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
			const x = quiztimerOptions.x;
			const y = quiztimerOptions.y;
			const start = performance.now();
			let imageId = await zoomSdk.drawImage({
				imageData,
				zIndex,
				x,
				y,
			});
			const end = performance.now();
			console.log(`Execution time: ${end - start} milliseconds`);
			// remove previous image
			if (prevImageId !== '0') {
				zoomSdk.clearImage(prevImageId);
			}
			prevImageId = imageId;
		}

		// ========================================================================================================
		// === Options ============================================================================================
		// ========================================================================================================

		// setup custom events for color selectors

		// close color picker when color selector is clicked
		document.addEventListener('colorpickeropen', e => {
			console.log('colorpickeropen', e);
		});

		function setupColorSelector(state, gui) {
			const numberSelector = document.getElementById(
				`colorSelectorNumber${state}`
			);
			const backgroundSelector = document.getElementById(
				`colorSelectorBackground${state}`
			);
			const exampleElement = document.getElementById(
				`colorSelectorExample${state}`
			);

			const numberOption = `number${state}`;
			const backgroundOption = `background${state}`;

			//--- set color selectors
			numberSelector.value = quiztimerOptions[numberOption];
			backgroundSelector.value = quiztimerOptions[backgroundOption];
			exampleElement.style.color = quiztimerOptions[numberOption];
			exampleElement.style.backgroundColor = quiztimerOptions[backgroundOption];

			numberSelector.addEventListener('change', e => {
				saveOption(numberOption, e.target.value, gui);
			});
			numberSelector.addEventListener('input', e => {
				exampleElement.style.color = e.target.value;
			});

			backgroundSelector.addEventListener('change', e => {
				saveOption(backgroundOption, e.target.value, gui);
			});
			backgroundSelector.addEventListener('input', e => {
				exampleElement.style.backgroundColor = e.target.value;
			});
		}

		['Standard', 'Warning', 'Timeout'].forEach(state =>
			setupColorSelector(state, gui)
		);

		function saveOption(optionName, optionValue, gui) {
			quiztimerOptions[optionName] = optionValue;
			localStorage.setItem('quiztimer', JSON.stringify(quiztimerOptions));
			drawImage(gui.canvas, gui.ctx, duration);
		}
	}
};
