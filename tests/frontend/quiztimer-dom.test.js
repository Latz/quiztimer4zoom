// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Animations are used inside the script — mock them to avoid SDK calls.
// quiztimer-script.js references the bare `Animations` global (set by
// animations.js as a classic <script> in the real page), not an import, so
// the mock must also be installed on globalThis for the module to see it.
const animationsMock = {
	pulseTransition: vi.fn(() => Promise.resolve()),
	shakeTransition: vi.fn(() => Promise.resolve()),
	blinkAtTimeout: vi.fn(() => Promise.resolve()),
	drawFrame: vi.fn(() => Promise.resolve('img-id')),
	hexToRgba: vi.fn((hex, alpha) => `rgba(0,0,0,${alpha})`),
};
vi.mock('../../public/animations.js', () => ({ Animations: animationsMock }));
globalThis.Animations = animationsMock;

function buildDom() {
	document.body.innerHTML = `
		<div id="actions">
			<button id="btn_startStop">Start</button>
			<button id="btn_continue" disabled><span class="progress-fill"></span>Continue</button>
			<button id="btn_20sec">20s</button>
			<button id="btn_30sec">30s</button>
		</div>
		<div id="subActions">
			<button id="btn_options">Options</button>
			<button id="btn_help">Help</button>
			<button id="btn_darkmode">Dark</button>
			<button id="btn_panic">Panic</button>
		</div>
		<div id="options" hidden>
			<div id="positionCorners">
				<button id="posTopLeft" data-position="posTopLeft">TL</button>
				<button id="posTopRight" data-position="posTopRight">TR</button>
				<button id="posBottomLeft" data-position="posBottomLeft">BL</button>
				<button id="posBottomRight" data-position="posBottomRight">BR</button>
			</div>
			<div id="timerSize">
				<button id="btn_timerSizeMinus">-</button>
				<span id="val_timerSize">300</span>
				<button id="btn_timerSizePlus">+</button>
			</div>
			<div id="tabs">
				<button class="tab-button" data-panel="panel-position">Position</button>
				<button class="tab-button" data-panel="panel-size">Size</button>
				<button class="tab-button" data-panel="panel-colors">Colors</button>
				<button class="tab-button" data-panel="panel-animation">Animation</button>
			</div>
			<div id="panel-position"></div>
			<div id="panel-size"></div>
			<div id="panel-colors">
				<input type="color" id="colorSelectorNumberStandard" value="#000000" />
				<input type="color" id="colorSelectorBackgroundStandard" value="#ffffff" />
				<div id="colorExampleStandard"></div>
				<input type="color" id="colorSelectorNumberWarning" value="#000000" />
				<input type="color" id="colorSelectorBackgroundWarning" value="#ffff00" />
				<div id="colorExampleWarning"></div>
				<input type="color" id="colorSelectorNumberTimeout" value="#000000" />
				<input type="color" id="colorSelectorBackgroundTimeout" value="#ff0000" />
				<div id="colorExampleTimeout"></div>
				<input type="range" id="backgroundTransparencySlider" min="0" max="100" value="0" />
				<input type="range" id="numberTransparencySlider" min="0" max="100" value="100" />
			</div>
			<div id="panel-animation">
				<input type="checkbox" id="pulseAnimationToggle" checked />
				<input type="checkbox" id="shakeAnimationToggle" checked />
				<input type="checkbox" id="blinkAnimationToggle" checked />
			</div>
		</div>
		<div id="aboutBox" hidden>
			<button id="btn_aboutClose">Close</button>
		</div>
		<canvas id="canvas"></canvas>
	`;
}

async function loadScript({ localStorageSeed } = {}) {
	vi.resetModules();

	// Provide zoomSdk global (quiztimer-script.js reads it as a bare global)
	globalThis.zoomSdk = {
		config: vi.fn(() => Promise.resolve({ list: [], media: { renderTarget: { height: 350, width: 322 } } })),
		runRenderingContext: vi.fn(() => Promise.resolve()),
		closeRenderingContext: vi.fn(() => Promise.resolve()),
		getRunningContext: vi.fn(() => Promise.resolve({ context: 'inMainClient' })),
		drawImage: vi.fn(() => Promise.resolve('img-id')),
		clearImage: vi.fn(() => Promise.resolve()),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
	};

	// Mock canvas getContext before the script calls canvas.getContext('2d')
	HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
		clearRect: vi.fn(),
		fillRect: vi.fn(),
		fillText: vi.fn(),
		measureText: vi.fn(() => ({ width: 100, actualBoundingBoxAscent: 40, actualBoundingBoxDescent: 10 })),
		save: vi.fn(), restore: vi.fn(), translate: vi.fn(), scale: vi.fn(),
		beginPath: vi.fn(), fill: vi.fn(), roundRect: vi.fn(),
		getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })),
		fillStyle: '', font: '',
	}));

	// Reset body state that persists across DOM rebuilds
	document.body.className = '';

	// Pre-populate localStorage with defaults
	localStorage.clear();
	if (localStorageSeed) {
		for (const [key, value] of Object.entries(localStorageSeed)) {
			localStorage.setItem(key, value);
		}
	}

	buildDom();

	// Import script — it reads localStorage at module top and registers onreadystatechange
	await import('../../public/quiztimer-script.js');

	// Trigger onreadystatechange as 'complete' to init the GUI
	Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true });
	if (document.onreadystatechange) {
		await document.onreadystatechange();
	}
}

describe('public/quiztimer-script.js — DOM integration', () => {
	beforeEach(async () => {
		// scheduleTimerUpdate() computes elapsed time from performance.now(), not
		// just setTimeout ticks, so fake timers must advance it too or the
		// countdown never progresses even as setTimeout callbacks fire.
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] });
		await loadScript();
	});

	it('btn_startStop starts as "Start"', () => {
		expect(document.getElementById('btn_startStop').innerText ?? document.getElementById('btn_startStop').textContent).toMatch(/start/i);
	});

	it('btn_continue starts disabled', () => {
		expect(document.getElementById('btn_continue').disabled).toBe(true);
	});

	it('clicking btn_20sec does not throw', () => {
		expect(() => {
			document.getElementById('btn_20sec').click();
		}).not.toThrow();
	});

	it('clicking btn_30sec does not throw', () => {
		expect(() => {
			document.getElementById('btn_30sec').click();
		}).not.toThrow();
	});

	it('clicking btn_startStop changes button to Stop', async () => {
		document.getElementById('btn_startStop').click();
		// Button text is set synchronously; advance a tick for any microtasks
		await vi.advanceTimersByTimeAsync(0);
		const btn = document.getElementById('btn_startStop');
		const text = btn.innerText ?? btn.textContent;
		expect(text).toMatch(/stop/i);
	});

	it('clicking btn_startStop twice resets to Start', async () => {
		const btn = document.getElementById('btn_startStop');
		btn.click(); // start — text set synchronously
		await vi.advanceTimersByTimeAsync(0);
		btn.click(); // stop — text set synchronously
		await vi.advanceTimersByTimeAsync(0);
		const text = btn.innerText ?? btn.textContent;
		expect(text).toMatch(/start/i);
	});

	it('dark mode toggle adds dark-mode class to body', async () => {
		document.getElementById('btn_darkmode').click();
		expect(document.body.classList.contains('dark-mode')).toBe(true);
	});

	it('dark mode toggle removes dark-mode class on second click', async () => {
		document.getElementById('btn_darkmode').click();
		document.getElementById('btn_darkmode').click();
		expect(document.body.classList.contains('dark-mode')).toBe(false);
	});

	it('options panel shows when btn_options is clicked', async () => {
		document.getElementById('btn_options').click();
		const options = document.getElementById('options');
		expect(options.style.visibility).toBe('visible');
	});

	it('btn_panic click does not throw', () => {
		expect(() => {
			document.getElementById('btn_panic').click();
		}).not.toThrow();
	});

	describe('setPosition (position corner buttons)', () => {
		it.each(['posTopLeft', 'posTopRight', 'posBottomLeft', 'posBottomRight'])(
			'clicking %s does not throw and persists the position to localStorage',
			async position => {
				document.getElementById(position).click();
				await vi.advanceTimersByTimeAsync(0);
				expect(JSON.parse(localStorage.getItem('position'))).toBe(position);
			},
		);
	});

	describe('timer countdown', () => {
		it('running the timer to completion draws every color state and resets', async () => {
			document.getElementById('btn_startStop').click();
			await vi.advanceTimersByTimeAsync(0);

			// Advance well past the 20s default duration in 150ms steps (the
			// scheduleTimerUpdate tick) so every intermediate second — including
			// the <=5s "warning" state and the 0s "timeout" state — gets drawn,
			// and the post-timeout timedReset countdown completes.
			await vi.advanceTimersByTimeAsync(21000);
			await vi.advanceTimersByTimeAsync(3000);

			const btn = document.getElementById('btn_startStop');
			const text = btn.innerText ?? btn.textContent;
			expect(text).toMatch(/start/i);
			expect(document.getElementById('btn_continue').disabled).toBe(true);
		});

		it('stopping and continuing resumes the countdown', async () => {
			document.getElementById('btn_startStop').click();
			await vi.advanceTimersByTimeAsync(500);
			document.getElementById('btn_startStop').click(); // stop
			await vi.advanceTimersByTimeAsync(0);
			expect(document.getElementById('btn_continue').disabled).toBe(false);

			document.getElementById('btn_continue').click(); // continue
			await vi.advanceTimersByTimeAsync(0);
			const btn = document.getElementById('btn_startStop');
			const text = btn.innerText ?? btn.textContent;
			expect(text).toMatch(/stop/i);
			expect(document.getElementById('btn_continue').disabled).toBe(true);
		});

		it('stopping without continuing auto-resets via timedReset', async () => {
			document.getElementById('btn_startStop').click();
			await vi.advanceTimersByTimeAsync(500);
			document.getElementById('btn_startStop').click(); // stop -> starts timedReset
			await vi.advanceTimersByTimeAsync(0);

			// timedReset ticks every 50ms from width=100 down to 0 (~2500ms)
			await vi.advanceTimersByTimeAsync(2600);
			expect(document.getElementById('btn_continue').disabled).toBe(true);
		});
	});

	describe('keydown shortcuts', () => {
		it('space starts the timer when stopped', async () => {
			document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
			await vi.advanceTimersByTimeAsync(0);
			const btn = document.getElementById('btn_startStop');
			const text = btn.innerText ?? btn.textContent;
			expect(text).toMatch(/stop/i);
		});

		it('space stops the timer when running', async () => {
			document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
			await vi.advanceTimersByTimeAsync(0);
			document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
			await vi.advanceTimersByTimeAsync(0);
			const btn = document.getElementById('btn_startStop');
			const text = btn.innerText ?? btn.textContent;
			expect(text).toMatch(/start/i);
		});

		it('"c" continues the timer', async () => {
			document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); // start
			await vi.advanceTimersByTimeAsync(500);
			document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); // stop
			await vi.advanceTimersByTimeAsync(0);
			document.dispatchEvent(new KeyboardEvent('keydown', { key: 'c' })); // continue
			await vi.advanceTimersByTimeAsync(0);
			const btn = document.getElementById('btn_startStop');
			const text = btn.innerText ?? btn.textContent;
			expect(text).toMatch(/stop/i);
		});
	});

	describe('color and transparency inputs', () => {
		it('changing a color input does not throw and persists via saveOption', async () => {
			const input = document.getElementById('colorSelectorNumberStandard');
			input.value = '#123456';
			expect(() => {
				input.dispatchEvent(new Event('change', { bubbles: true }));
			}).not.toThrow();
			await vi.advanceTimersByTimeAsync(0);
			expect(localStorage.getItem('colorsStandard')).toBeTruthy();
		});

		it('moving the background transparency slider does not throw', async () => {
			const slider = document.getElementById('backgroundTransparencySlider');
			slider.value = '50';
			expect(() => {
				slider.dispatchEvent(new Event('input', { bubbles: true }));
				slider.dispatchEvent(new Event('change', { bubbles: true }));
			}).not.toThrow();
			await vi.advanceTimersByTimeAsync(0);
			expect(JSON.parse(localStorage.getItem('backgroundTransparency'))).toBe(50);
		});

		it('moving the number transparency slider does not throw', async () => {
			const slider = document.getElementById('numberTransparencySlider');
			slider.value = '75';
			expect(() => {
				slider.dispatchEvent(new Event('input', { bubbles: true }));
				slider.dispatchEvent(new Event('change', { bubbles: true }));
			}).not.toThrow();
			await vi.advanceTimersByTimeAsync(0);
			expect(JSON.parse(localStorage.getItem('numberTransparency'))).toBe(75);
		});
	});

	describe('timer size buttons', () => {
		it('clicking timer size plus/minus does not throw and updates boxSize', async () => {
			document.getElementById('btn_timerSizePlus').click();
			await vi.advanceTimersByTimeAsync(0);
			const first = JSON.parse(localStorage.getItem('boxSize'));

			document.getElementById('btn_timerSizeMinus').click();
			await vi.advanceTimersByTimeAsync(0);
			const second = JSON.parse(localStorage.getItem('boxSize'));

			expect(typeof first).toBe('number');
			expect(second).toBe(first - 1);
		});
	});

	describe('dark mode restored from localStorage on load', () => {
		it('applies dark-mode class and sun icon when darkMode was previously saved', async () => {
			await loadScript({ localStorageSeed: { darkMode: 'true' } });
			expect(document.body.classList.contains('dark-mode')).toBe(true);
			expect(document.getElementById('btn_darkmode').textContent).toBe('☀️');
		});
	});
});
