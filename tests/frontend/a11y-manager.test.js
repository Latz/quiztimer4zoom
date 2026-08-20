// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import A11yManager from '../../scripts/a11y-manager.js';

function buildMinimalDom() {
	document.body.innerHTML = `
		<div id="options" aria-hidden="true">
			<button id="btn_options_first">First</button>
			<button id="btn_options_last">Last</button>
		</div>
		<button id="btn_options" aria-expanded="false">Options</button>
		<button id="btn_startStop" aria-pressed="false">Start</button>
		<progress id="countdown" value="0" max="100"></progress>
		<span id="opacityValue"></span>
		<input id="opacitySlider" type="range" />
		<span id="val_timerSize"></span>
		<input id="colorSelectorNumberStandard" type="color" value="#000000" />
		<span id="colorSelectorExampleStandard"></span>
		<input id="colorSelectorBackgroundWarning" type="color" value="#ffffff" />
		<span id="colorSelectorExampleWarning"></span>
	`;
}

describe('scripts/a11y-manager.js', () => {
	let manager;

	beforeEach(() => {
		buildMinimalDom();
		manager = new A11yManager();
	});

	describe('initAnnouncer()', () => {
		it('creates #a11y-announcer element in document.body', () => {
			const announcer = document.getElementById('a11y-announcer');
			expect(announcer).not.toBeNull();
		});

		it('announcer has aria-live="assertive"', () => {
			const announcer = document.getElementById('a11y-announcer');
			expect(announcer.getAttribute('aria-live')).toBe('assertive');
		});

		it('announcer has aria-atomic="true"', () => {
			const announcer = document.getElementById('a11y-announcer');
			expect(announcer.getAttribute('aria-atomic')).toBe('true');
		});

		it('announcer has class sr-only', () => {
			const announcer = document.getElementById('a11y-announcer');
			expect(announcer.classList.contains('sr-only')).toBe(true);
		});
	});

	describe('announce(message, type)', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		it('sets textContent to message', () => {
			manager.announce('Hello timer');
			expect(manager.announcer.textContent).toBe('Hello timer');
		});

		it('sets aria-live to provided type', () => {
			manager.announce('Polite message', 'polite');
			expect(manager.announcer.getAttribute('aria-live')).toBe('polite');
		});

		it('defaults to assertive type', () => {
			manager.announce('Default message');
			expect(manager.announcer.getAttribute('aria-live')).toBe('assertive');
		});

		it('clears textContent after 1000ms', () => {
			manager.announce('Timer started');
			expect(manager.announcer.textContent).toBe('Timer started');
			vi.advanceTimersByTime(1001);
			expect(manager.announcer.textContent).toBe('');
		});
	});

	describe('updateTimerButtonState(state)', () => {
		it('sets aria-pressed to true and text to Stop when running', () => {
			manager.updateTimerButtonState('running');
			const btn = document.getElementById('btn_startStop');
			expect(btn.getAttribute('aria-pressed')).toBe('true');
			expect(btn.textContent).toBe('Stop');
		});

		it('sets aria-pressed to false and text to Start when not running', () => {
			manager.updateTimerButtonState('stopped');
			const btn = document.getElementById('btn_startStop');
			expect(btn.getAttribute('aria-pressed')).toBe('false');
			expect(btn.textContent).toBe('Start');
		});

		it('announces "Timer started" when running', () => {
			manager.updateTimerButtonState('running');
			expect(manager.announcer.textContent).toBe('Timer started');
		});

		it('announces "Timer stopped" when not running', () => {
			manager.updateTimerButtonState('stopped');
			expect(manager.announcer.textContent).toBe('Timer stopped');
		});
	});

	describe('updateProgress(current, total)', () => {
		it('sets progress bar value to percentage', () => {
			manager.updateProgress(30, 60);
			const bar = document.getElementById('countdown');
			expect(bar.value).toBe(50);
		});

		it('sets aria-valuenow to rounded percentage', () => {
			manager.updateProgress(30, 60);
			const bar = document.getElementById('countdown');
			expect(bar.getAttribute('aria-valuenow')).toBe('50');
		});

		it('sets aria-label with current and total seconds', () => {
			manager.updateProgress(10, 30);
			const bar = document.getElementById('countdown');
			expect(bar.getAttribute('aria-label')).toContain('10');
			expect(bar.getAttribute('aria-label')).toContain('30');
		});
	});

	describe('toggleOptions() / openOptions() / closeOptions()', () => {
		it('openOptions sets aria-hidden to false on panel', () => {
			manager.openOptions();
			expect(document.getElementById('options').getAttribute('aria-hidden')).toBe('false');
		});

		it('openOptions sets aria-expanded to true on button', () => {
			manager.openOptions();
			expect(document.getElementById('btn_options').getAttribute('aria-expanded')).toBe('true');
		});

		it('closeOptions sets aria-hidden to true on panel', () => {
			manager.openOptions();
			manager.closeOptions();
			expect(document.getElementById('options').getAttribute('aria-hidden')).toBe('true');
		});

		it('closeOptions sets aria-expanded to false on button', () => {
			manager.openOptions();
			manager.closeOptions();
			expect(document.getElementById('btn_options').getAttribute('aria-expanded')).toBe('false');
		});

		it('toggleOptions flips isOptionsOpen', () => {
			expect(manager.isOptionsOpen).toBe(false);
			manager.toggleOptions();
			expect(manager.isOptionsOpen).toBe(true);
			manager.toggleOptions();
			expect(manager.isOptionsOpen).toBe(false);
		});
	});

	describe('announceDurationChange(seconds)', () => {
		it('announces the new duration politely', () => {
			manager.announceDurationChange(20);
			expect(manager.announcer.textContent).toBe('Timer duration set to 20 seconds');
			expect(manager.announcer.getAttribute('aria-live')).toBe('polite');
		});
	});

	describe('keyboard shortcuts', () => {
		it('Ctrl+O calls toggleOptions', () => {
			const spy = vi.spyOn(manager, 'toggleOptions');
			document.dispatchEvent(new KeyboardEvent('keydown', { key: 'o', ctrlKey: true }));
			expect(spy).toHaveBeenCalledOnce();
		});

		it('Escape closes options when open', () => {
			manager.openOptions();
			const spy = vi.spyOn(manager, 'closeOptions');
			document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
			expect(spy).toHaveBeenCalledOnce();
		});

		it('Escape does nothing when options are closed', () => {
			const spy = vi.spyOn(manager, 'closeOptions');
			document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
			expect(spy).not.toHaveBeenCalled();
		});
	});

	describe('trapFocus(container)', () => {
		it('wraps focus from last to first element on Tab', () => {
			const container = document.getElementById('options');
			manager.trapFocus(container);

			const buttons = container.querySelectorAll('button');
			const lastBtn = buttons[buttons.length - 1];
			lastBtn.focus();

			lastBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
			expect(document.activeElement).toBe(buttons[0]);
		});

		it('wraps focus from first to last element on Shift+Tab', () => {
			const container = document.getElementById('options');
			manager.trapFocus(container);

			const buttons = container.querySelectorAll('button');
			buttons[0].focus();

			buttons[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
			expect(document.activeElement).toBe(buttons[buttons.length - 1]);
		});

		it('does nothing when the container has no focusable elements', () => {
			const container = document.createElement('div');
			document.body.appendChild(container);
			expect(() => manager.trapFocus(container)).not.toThrow();
		});
	});

	describe('missing-element guards', () => {
		it('updateTimerButtonState is a no-op when #btn_startStop is absent', () => {
			document.getElementById('btn_startStop').remove();
			expect(() => manager.updateTimerButtonState('running')).not.toThrow();
		});

		it('updateProgress is a no-op when #countdown is absent', () => {
			document.getElementById('countdown').remove();
			expect(() => manager.updateProgress(1, 2)).not.toThrow();
		});

		it('toggleOptions is a no-op when #options is absent', () => {
			document.getElementById('options').remove();
			expect(() => manager.toggleOptions()).not.toThrow();
			expect(manager.isOptionsOpen).toBe(false);
		});

		it('openOptions is a no-op when #options is absent', () => {
			document.getElementById('options').remove();
			expect(() => manager.openOptions()).not.toThrow();
		});

		it('closeOptions is a no-op when #options is absent', () => {
			document.getElementById('options').remove();
			expect(() => manager.closeOptions()).not.toThrow();
		});
	});

	describe('updateOpacityDisplay(value)', () => {
		it('sets percentage text and aria-label on the value element', () => {
			manager.updateOpacityDisplay(128);
			const el = document.getElementById('opacityValue');
			expect(el.textContent).toBe('50%');
			expect(el.getAttribute('aria-label')).toBe('Opacity: 50%');
		});

		it('sets aria-valuenow and aria-label on the slider element', () => {
			manager.updateOpacityDisplay(255);
			const slider = document.getElementById('opacitySlider');
			expect(slider.getAttribute('aria-valuenow')).toBe('255');
			expect(slider.getAttribute('aria-label')).toBe('Timer background opacity: 100%');
		});

		it('announces the opacity percentage', () => {
			manager.updateOpacityDisplay(0);
			expect(manager.announcer.textContent).toBe('Opacity set to 0%');
		});
	});

	describe('updateSizeDisplay(size)', () => {
		it('sets text, aria-label, and announces the new size', () => {
			manager.updateSizeDisplay(42);
			const el = document.getElementById('val_timerSize');
			expect(el.textContent).toBe('42');
			expect(el.getAttribute('aria-label')).toBe('Timer size: 42 pixels');
			expect(manager.announcer.textContent).toBe('Timer size set to 42 pixels');
		});

		it('is a no-op when #val_timerSize is absent', () => {
			document.getElementById('val_timerSize').remove();
			expect(() => manager.updateSizeDisplay(10)).not.toThrow();
		});
	});

	describe('announcePositionChange(position)', () => {
		it('announces a friendly label for known positions', () => {
			manager.announcePositionChange('TopLeft');
			expect(manager.announcer.textContent).toBe('Timer position changed to top left');
		});

		it('falls back to the raw position for unknown values', () => {
			manager.announcePositionChange('Center');
			expect(manager.announcer.textContent).toBe('Timer position changed to Center');
		});
	});

	describe('announceColorChange(type, color)', () => {
		it('announces a friendly label for known types', () => {
			manager.announceColorChange('numberStandard', '#ff0000');
			expect(manager.announcer.textContent).toBe('standard timer number color changed to #ff0000');
		});

		it('falls back to the raw type for unknown values', () => {
			manager.announceColorChange('mysteryType', '#00ff00');
			expect(manager.announcer.textContent).toBe('mysteryType color changed to #00ff00');
		});
	});

	describe('announceTimerState(seconds, state)', () => {
		it('announces running state politely', () => {
			manager.announceTimerState(30, 'running');
			expect(manager.announcer.textContent).toBe('Timer running: 30 seconds remaining');
			expect(manager.announcer.getAttribute('aria-live')).toBe('polite');
		});

		it('announces stopped state politely', () => {
			manager.announceTimerState(15, 'stopped');
			expect(manager.announcer.textContent).toBe('Timer stopped: 15 seconds remaining');
			expect(manager.announcer.getAttribute('aria-live')).toBe('polite');
		});

		it('announces expired state assertively', () => {
			manager.announceTimerState(0, 'expired');
			expect(manager.announcer.textContent).toBe('Timer expired. Time is up!');
			expect(manager.announcer.getAttribute('aria-live')).toBe('assertive');
		});

		it('falls back to a generic message for unknown states', () => {
			manager.announceTimerState(5, 'paused');
			expect(manager.announcer.textContent).toBe('Timer state: 5 seconds');
		});
	});

	describe('showKeyboardHelp()', () => {
		let consoleSpy;

		beforeEach(() => {
			consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
		});

		afterEach(() => {
			consoleSpy.mockRestore();
		});

		it('announces the shortcuts list assertively', () => {
			manager.showKeyboardHelp();
			expect(manager.announcer.textContent).toContain('Keyboard Shortcuts');
			expect(manager.announcer.getAttribute('aria-live')).toBe('assertive');
		});

		it('logs the shortcuts to the console', () => {
			manager.showKeyboardHelp();
			expect(consoleSpy).toHaveBeenCalledOnce();
		});

		it('is triggered by the ? keydown shortcut', () => {
			const spy = vi.spyOn(manager, 'showKeyboardHelp');
			document.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }));
			expect(spy).toHaveBeenCalledOnce();
		});
	});

	describe('high contrast mode', () => {
		it('enableHighContrast adds the high-contrast class and announces it', () => {
			manager.enableHighContrast();
			expect(document.body.classList.contains('high-contrast')).toBe(true);
			expect(manager.announcer.textContent).toBe('High contrast mode enabled');
		});

		it('disableHighContrast removes the high-contrast class and announces it', () => {
			document.body.classList.add('high-contrast');
			manager.disableHighContrast();
			expect(document.body.classList.contains('high-contrast')).toBe(false);
			expect(manager.announcer.textContent).toBe('High contrast mode disabled');
		});

		it('toggleHighContrast turns it on from off', () => {
			manager.toggleHighContrast();
			expect(document.body.classList.contains('high-contrast')).toBe(true);
			expect(manager.announcer.textContent).toBe('High contrast mode enabled');
		});

		it('toggleHighContrast turns it off from on', () => {
			document.body.classList.add('high-contrast');
			manager.toggleHighContrast();
			expect(document.body.classList.contains('high-contrast')).toBe(false);
			expect(manager.announcer.textContent).toBe('High contrast mode disabled');
		});
	});

	describe('setupColorPreviewUpdates() / enhanceImageButtons()', () => {
		beforeEach(() => {
			manager.setupColorPreviewUpdates();
		});

		function changeColor(id, value) {
			const input = document.getElementById(id);
			input.value = value;
			input.dispatchEvent(new Event('change', { bubbles: true }));
		}

		it('updates the example text color for a "number" input', () => {
			changeColor('colorSelectorNumberStandard', '#123456');
			const example = document.getElementById('colorSelectorExampleStandard');
			expect(example.style.color).toBe('rgb(18, 52, 86)');
			expect(manager.announcer.textContent).toBe('standard timer number color changed to #123456');
		});

		it('updates the example background color for a "background" input', () => {
			changeColor('colorSelectorBackgroundWarning', '#abcdef');
			const example = document.getElementById('colorSelectorExampleWarning');
			expect(example.style.backgroundColor).toBe('rgb(171, 205, 239)');
			expect(manager.announcer.textContent).toBe('warning timer background color changed to #abcdef');
		});

		it('does nothing when the matching example element is missing', () => {
			document.getElementById('colorSelectorExampleStandard').remove();
			expect(() => changeColor('colorSelectorNumberStandard', '#000000')).not.toThrow();
		});

		it('enhanceImageButtons() wires up color preview updates', () => {
			const fresh = new A11yManager();
			fresh.enhanceImageButtons();
			changeColor('colorSelectorNumberStandard', '#123456');
			const example = document.getElementById('colorSelectorExampleStandard');
			expect(example.style.color).toBe('rgb(18, 52, 86)');
		});
	});
});
