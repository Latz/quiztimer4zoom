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

				switch (event.target.id) {
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
			const textHeight =
				metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
			// Set canvas width and adjust height to match text height
			// canvas.width = canvasWidth;
			virtualCanvas.height =
				textHeight + ((textHeight * paddingPercent) / 100) * 2;

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
				const newTextHeight =
					newMetrics.actualBoundingBoxAscent +
					newMetrics.actualBoundingBoxDescent;
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
			const finalTextHeight =
				finalMetrics.actualBoundingBoxAscent +
				finalMetrics.actualBoundingBoxDescent;
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
			const progressbar = document.getElementById('countdown');
			progressbar.value = progressbar.max;

			// Start the timer with the remaining time
			runTimer(timeLeft, gui);
		}
		// --------------------------------------------------------------------
		function timedReset(gui) {
			const timeout = 5000;

			const progressbar = document.getElementById('countdown');
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

		// ------------------------------------------------------------------------------------
		// setup custom events for color selectors

		// --- colorSelectorNumberStandard -------------------------------------------------------
		const colorSelectorNumberStandard = document.getElementById(
			'colorSelectorNumberStandard'
		);

		const colorSelectorBackgroundStandard = document.getElementById(
			'colorSelectorBackgroundStandard'
		);

		const colorSelectorExampleStandard = document.getElementById(
			'colorSelectorExampleStandard'
		);

		// close color picker when color selector is clicked
		document.addEventListener('colorpickeropen', e => {
			console.log('colorpickeropen', e);
		});

		//--- set color selectors
		colorSelectorNumberStandard.value = quiztimerOptions.numberStandard;
		colorSelectorBackgroundStandard.value = quiztimerOptions.backgroundStandard;
		colorSelectorExampleStandard.style.color = quiztimerOptions.numberStandard;
		colorSelectorExampleStandard.style.backgroundColor =
			quiztimerOptions.backgroundStandard;

		colorSelectorNumberStandard.addEventListener('change', e => {
			saveOption('numberStandard', e.target.value, gui);
		});

		colorSelectorNumberStandard.addEventListener('change', e => {
			saveOption('numberStandard', e.target.value, gui);
		});
		colorSelectorNumberStandard.addEventListener('input', e => {
			colorSelectorExampleStandard.style.color = e.target.value;
		});

		colorSelectorBackgroundStandard.addEventListener('change', e => {
			saveOption('backgroundStandard', e.target.value, gui);
		});
		colorSelectorBackgroundStandard.addEventListener('input', e => {
			colorSelectorExampleStandard.style.backgroundColor = e.target.value;
		});

		// --- colorSelectorNumberWarning -------------------------------------------------------
		const colorSelectorNumberWarning = document.getElementById(
			'colorSelectorNumberWarning'
		);
		const colorSelectorBackgroundWarning = document.getElementById(
			'colorSelectorBackgroundWarning'
		);

		const colorSelectorExampleWarning = document.getElementById(
			'colorSelectorExampleWarning'
		);

		// set color selectors
		colorSelectorNumberWarning.value = quiztimerOptions.numberWarning;
		colorSelectorBackgroundWarning.value = quiztimerOptions.backgroundWarning;
		colorSelectorExampleWarning.style.color = quiztimerOptions.numberWarning;
		colorSelectorExampleWarning.style.backgroundColor =
			quiztimerOptions.backgroundWarning;

		colorSelectorNumberWarning.addEventListener('change', e => {
			saveOption('numberWarning', e.target.value, gui);
		});
		colorSelectorNumberWarning.addEventListener('input', e => {
			colorSelectorExampleWarning.style.color = e.target.value;
		});

		colorSelectorBackgroundWarning.addEventListener('change', e => {
			saveOption('backgroundWarning', e.target.value, gui);
		});
		colorSelectorBackgroundWarning.addEventListener('input', e => {
			colorSelectorExampleWarning.style.backgroundColor = e.target.value;
		});
		// --- colorSelectorNumberTimeout -------------------------------------------------------
		const colorSelectorNumberTimeout = document.getElementById(
			'colorSelectorNumberTimeout'
		);
		const colorSelectorBackgroundTimeout = document.getElementById(
			'colorSelectorBackgroundTimeout'
		);

		const colorSelectorExampleTimeout = document.getElementById(
			'colorSelectorExampleTimeout'
		);

		// set color selectors
		colorSelectorNumberTimeout.value = quiztimerOptions.numberTimeout;
		colorSelectorBackgroundTimeout.value = quiztimerOptions.backgroundTimeout;
		colorSelectorExampleTimeout.style.color = quiztimerOptions.numberTimeout;
		colorSelectorExampleTimeout.style.backgroundColor =
			quiztimerOptions.backgroundTimeout;

		colorSelectorNumberTimeout.addEventListener('change', e => {
			saveOption('numberTimeout', e.target.value, gui);
		});
		colorSelectorNumberTimeout.addEventListener('input', e => {
			colorSelectorExampleTimeout.style.color = e.target.value;
		});

		colorSelectorBackgroundTimeout.addEventListener('change', e => {
			saveOption('backgroundTimeout', e.target.value, gui);
		});
		colorSelectorBackgroundTimeout.addEventListener('input', e => {
			colorSelectorExampleTimeout.style.backgroundColor = e.target.value;
		});

		function saveOption(optionName, optionValue, gui) {
			quiztimerOptions[optionName] = optionValue;
			localStorage.setItem('quiztimer', JSON.stringify(quiztimerOptions));
			drawImage(gui.canvas, gui.ctx, duration);
		}
	}
};
