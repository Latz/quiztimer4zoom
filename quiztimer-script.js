let quiztimerOptions = JSON.parse(localStorage.getItem('quiztimer'));
if (!quiztimerOptions) {
	quiztimerOptions = {
		position: 'TopRight', // TopLeft, TopRight, BottomLeft, BottomRight
		size: '300',
		numberStandard: '#000000',
		numberWarning: '#000000',
		numberTimeout: '#000000',
		backgroundStandard: '#ffffff',
		backgroundWarning: '#ffff00',
		backgroundTimeout: '#ff0000',
	};
	localStorage.setItem('quiztimer', JSON.stringify(quiztimerOptions));
}

// Take care, that all options are present after a App update
if (!quiztimerOptions.opacity) {
	quiztimerOptions.opacity = 100;
	localStorage.setItem('quiztimer', JSON.stringify(quiztimerOptions));
}

document.onreadystatechange = async () => {
	if (document.readyState === 'complete') {
		let zIndex;
		let metrix = {};
		let prevImageId = '0';
		let videoSize = quiztimerOptions.size;

		const stop = Symbol('stop');
		const running = Symbol('running');
		let state = stop;

		let duration = 20;
		let timerId = 0;
		let timeLeft = 0;
		let timedResetId;

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
			const canvas = document.getElementById('canvas');
			const ctx = canvas.getContext('2d', {
				willReadFrequently: true,
				alpha: true,
			});
			const gui = { canvas, ctx };
			canvas.height = quiztimerOptions.size;
			canvas.width = quiztimerOptions.size;
			const actions = document.getElementById('actions');
			actions.addEventListener('click', event => {
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

			// add listener to size range
			const val_timerSize = document.getElementById('val_timerSize');

			val_timerSize.innerText = gui.canvas.height;

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
				canvas.height = canvas.height + value;
				canvas.width = canvas.width + value;
				metrix.fontsize = canvas.height;
				val_timerSize.innerText = canvas.height;
				quiztimerOptions.size = canvas.height;
				setPosition(quiztimerOptions.position, gui);
				drawImage(gui.canvas, gui.ctx, duration);
				localStorage.setItem('quiztimer', JSON.stringify(quiztimerOptions));
			});

			// --- Opacity slider-------------------------------------------------------
			const opacity = document.getElementById('opacitySlider');
			const opacityValue = document.getElementById('opacityValue');
			if (quiztimerOptions?.opacity) opacity.value = quiztimerOptions?.opacity;
			else opacity.value = 100;
			opacityValue.innerText = `${opacity.value}%`;
			opacity.value = quiztimerOptions.opacity;

			opacity.addEventListener('input', event => {
				opacityValue.innerText = `${event.target.value}%`;
			});
			opacity.addEventListener('change', event => {
				quiztimerOptions.opacity = parseInt(event.target.value).toString(16);
				drawImage(gui.canvas, gui.ctx, duration);
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
					quiztimerOptions.x = videoSize.width - canvas.width;
					quiztimerOptions.y = 0;
					break;
				case 'posBottomLeft':
					quiztimerOptions.x = 0;
					quiztimerOptions.y = videoSize.height - canvas.height;

					break;
				case 'posBottomRight':
					quiztimerOptions.x = videoSize.width - canvas.width;
					quiztimerOptions.y = videoSize.height - canvas.height;
					break;
			}

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
				popoutSize: { width: 325, height: 206 },
				capabilities: [
					'authorize',
					'onAuthorized',
					'shareApp',
					'drawImage',
					'clearImage',
					'runRenderingContext',
					'getRunningContext',
					'closeRenderingContext',
					'onMyMediaChange',
				],
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
					// Set the font size of the metrix object
					metrix.fontsize = gui.canvas.height;
					// Initialize the timer
					initTimer(gui);
				})
				.catch(async error => {
					// Log the error
					console.log('Error:', error);
				});

			// Set an event listener for the app popout event
			zoomSdk.onAppPopout(event => {
				console.log(event);
			});

			// Set an event listener for the my media change event
			// zoomSdk.onMyMediaChange(event => {
			// 	if (event.media.video.state === true) resetTimer(gui);
			// });
		}

		/**
		 * Initializes the timer with the given duration.
		 * @param {Object} gui - The GUI object containing canvas and context information.
		 * @example
		 * initTimer(gui);
		 */
		async function initTimer(gui) {
			const ctx = gui.ctx;
			const canvas = gui.canvas;

			// Get the metrix object based on the canvas and context
			metrix = getMetrix(canvas, ctx, duration);

			// Set the font for the canvas
			ctx.font = `bold condensed ${metrix.fontsize}px Verdana`;

			// Set the background and text colors
			ctx.fillStyle = quiztimerOptions.backgroundStandard;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.fillStyle = quiztimerOptions.numberStandard;

			// Draw the duration text on the canvas
			ctx.fillText(duration, metrix.x, metrix.y);

			// Set the z-index of the canvas
			zIndex = 2;

			// Draw the image on the canvas
			drawImage(canvas, ctx, duration);
		}

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
		async function startTimer(gui) {
			console.log('startTimer', timedResetId);
			if (timedResetId) clearInterval(timedResetId); // User restarts timer before automatic reset is complete -> clear autommatic reset

			state = running;
			btnStartStop.innerText = 'Stop';
			btnContinue.disabled = true;
			timeLeft = duration;
			const progressbar = document.getElementById('countdown');
			progressbar.value = progressbar.max;

			zIndex = 2;
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
				if (timeLeft < 0) {
					clearInterval(timerId);
					btnStartStop.innerText = 'Start';
					state = stop;
					timedReset(gui);
				}
			}, 1000);
		}

		// ---------------------------------------------------------------
		/**
		 * Calculates the actual width and height of a given string with the
		 * current font, taking into account the actual bounding box.
		 * @param {CanvasRenderingContext2D} ctx - The canvas context to use
		 *   for measuring the string.
		 * @param {string} time - The string to measure.
		 * @returns {{width: number, height: number, descent: number, left: number}}
		 *   An object containing the actual width, height, descent and left
		 *   coordinates of the string.
		 */
		function getActualFontSize(ctx, time) {
			const metrics = ctx.measureText(time);
			let width = Math.abs(
				metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight
			);
			// The actual bounding box height is the sum of the ascent and
			// descent of the string.
			let height =
				Math.abs(metrics.actualBoundingBoxAscent) +
				Math.abs(metrics.actualBoundingBoxDescent);
			// The descent is the distance from the baseline to the bottom
			// of the string.
			let descent = Math.abs(metrics.actualBoundingBoxDescent);
			// The left coordinate is the distance from the left edge of the
			// canvas to the left edge of the string.
			let left = Math.abs(metrics.actualBoundingBoxLeft);
			return { width, height, descent, left };
		}
		// ---------------------------------------------------------------
		function getMetrix(canvas, ctx, time) {
			// use the widest cahracters to measure the size of the font
			let dummyTime = 88;
			if (time < 10) dummyTime = 8;
			let fontsize = 1;
			ctx.font = ` ${fontsize}px ${ctx.fontStyle}`;
			let size = getActualFontSize(ctx, time);
			let i = 0;
			while (
				size.height < canvas.height &&
				size.width < canvas.width &&
				i++ < 10000
			) {
				fontsize = fontsize + 1;
				ctx.font = `bold condensed ${fontsize}px Verdana`;
				size = getActualFontSize(ctx, dummyTime);
			}
			// center vertically
			const y =
				canvas.height - (canvas.height - size.height) / 2 - size.descent / 2;
			const x = 0 - size.left;

			return { x, y, fontsize };
		}
		// --------------------------------------------------------------------
		async function drawImage(canvas, ctx, time) {
			canvas.height = quiztimerOptions.size;
			canvas.width = quiztimerOptions.size;

			const x = quiztimerOptions.x;
			const y = quiztimerOptions.y;
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

			ctx.font = `bold condensed ${metrix.fontsize}px`;
			ctx.fontKerning = 'normal';
			// 			ctx.letterSpacing = '-100px';
			// -------------------------------------------------------------------There-------------

			ctx.fillStyle = bgColor;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.fillStyle = fgColor;
			if (time === duration || time % 10 === 9) {
				metrix = getMetrix(gui.canvas, gui.ctx, time);
			}

			ctx.font = `bold condensed ${metrix.fontsize}px Verdana`;
			ctx.fillText(time, metrix.x, metrix.y);
			const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
			zIndex++;
			let imageId = await zoomSdk.drawImage({
				imageData,
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
