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
const running = Symbol('running');
const stop = Symbol('stop');

document.onreadystatechange = async () => {
	if (document.readyState === 'complete') {
		let zIndex;
		let prevImageId = '0';
		let videoSize = quiztimerOptions.size;

		const stop = Symbol('stop');
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
		const gui = initGui(state);
		await initZoomSdk(gui);
	}
};

// ----------------------------------------------------------------------------------
function initGui(state) {
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

// ----------------------------------------------------------------------------------------------------------
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
			console.log('Initial authorization complete', authResponse);
		},
	});

	// Get the video size from the config result
	let height = configResult.media.renderTarget.height;
	let width = configResult.media.renderTarget.width;
	let videoSize = { height, width };

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
} //
// --------------------------------------------------------------------------------------------
function initCanvas(gui) {
	const fontFamily = 'Arial';

	// Calculate font and canvas dimensions.
	const [textX, textY, fontSize, canvasWidth, canvasHeight] =
		calcFontsize(fontFamily);

	// Update module-level position variables.
	let posX = textX;
	let posY = textY;

	// Set canvas dimensions. This also clears the canvas and its context state.
	gui.canvas.width = canvasWidth;
	gui.canvas.height = canvasHeight;

	// Reset canvas context properties after the resize.
	gui.ctx.font = `bold ${fontSize}px ${fontFamily}`;
	gui.ctx.textAlign = 'left';
	gui.ctx.textBaseline = 'alphabetic';

	// Draw the initial state of the timer.
	drawImage(gui.canvas, gui.ctx, duration);
}

console.log('main ended');
