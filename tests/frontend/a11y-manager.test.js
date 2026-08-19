// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
	});
});
