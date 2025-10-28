/**
 * Accessibility Manager Module
 * Handles ARIA attribute management, keyboard navigation, and screen reader announcements
 * Implements WCAG 2.1 AA standards
 */

class A11yManager {
	constructor() {
		this.announcer = null;
		this.isOptionsOpen = false;
		this.focusableElements = [];
		this.initAnnouncer();
		this.setupKeyboardShortcuts();
		this.setupFocusManagement();
	}

	/**
	 * Initialize live region announcer for screen reader announcements
	 */
	initAnnouncer() {
		// Create a live region for screen reader announcements
		this.announcer = document.createElement('div');
		this.announcer.id = 'a11y-announcer';
		this.announcer.setAttribute('aria-live', 'assertive');
		this.announcer.setAttribute('aria-atomic', 'true');
		this.announcer.className = 'sr-only';
		this.announcer.style.position = 'absolute';
		this.announcer.style.left = '-10000px';
		this.announcer.style.width = '1px';
		this.announcer.style.height = '1px';
		this.announcer.style.overflow = 'hidden';
		document.body.appendChild(this.announcer);
	}

	/**
	 * Announce messages to screen readers
	 * @param {string} message - The message to announce
	 * @param {string} type - 'polite' or 'assertive' (default: 'assertive')
	 */
	announce(message, type = 'assertive') {
		if (this.announcer) {
			this.announcer.setAttribute('aria-live', type);
			this.announcer.textContent = message;
			// Clear after announcement
			setTimeout(() => {
				this.announcer.textContent = '';
			}, 1000);
		}
	}

	/**
	 * Setup enhanced keyboard shortcuts
	 */
	setupKeyboardShortcuts() {
		document.addEventListener('keydown', (event) => {
			// Ctrl+O or Cmd+O to toggle options
			if ((event.ctrlKey || event.metaKey) && event.key === 'o') {
				event.preventDefault();
				this.toggleOptions();
			}

			// Escape to close options
			if (event.key === 'Escape') {
				if (this.isOptionsOpen) {
					this.closeOptions();
					event.preventDefault();
				}
			}

			// Tab navigation help
			if (event.key === '?') {
				this.showKeyboardHelp();
				event.preventDefault();
			}
		});
	}

	/**
	 * Setup focus management for trap and restore
	 */
	setupFocusManagement() {
		// Store initial focus
		this.initialFocus = document.activeElement;

		// Get all focusable elements
		this.getFocusableElements();
	}

	/**
	 * Get all focusable elements in the document
	 */
	getFocusableElements() {
		const focusableSelectors = [
			'button:not(:disabled)',
			'a[href]',
			'input:not(:disabled)',
			'select:not(:disabled)',
			'textarea:not(:disabled)',
			'[tabindex]:not([tabindex="-1"])',
			'[role="button"]:not([aria-disabled="true"])',
		].join(',');

		this.focusableElements = Array.from(document.querySelectorAll(focusableSelectors));
	}

	/**
	 * Trap focus within a specific container
	 * @param {HTMLElement} container - The container to trap focus in
	 */
	trapFocus(container) {
		const focusableElements = container.querySelectorAll(
			'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
		);

		if (focusableElements.length === 0) return;

		const firstElement = focusableElements[0];
		const lastElement = focusableElements[focusableElements.length - 1];

		container.addEventListener('keydown', (event) => {
			if (event.key !== 'Tab') return;

			if (event.shiftKey) {
				// Shift + Tab
				if (document.activeElement === firstElement) {
					event.preventDefault();
					lastElement.focus();
				}
			} else {
				// Tab
				if (document.activeElement === lastElement) {
					event.preventDefault();
					firstElement.focus();
				}
			}
		});
	}

	/**
	 * Toggle options panel visibility
	 */
	toggleOptions() {
		const optionsPanel = document.getElementById('options');
		const optionsBtn = document.getElementById('btn_options');

		if (!optionsPanel) return;

		this.isOptionsOpen = !this.isOptionsOpen;

		if (this.isOptionsOpen) {
			this.openOptions();
		} else {
			this.closeOptions();
		}
	}

	/**
	 * Open options panel
	 */
	openOptions() {
		const optionsPanel = document.getElementById('options');
		const optionsBtn = document.getElementById('btn_options');

		if (!optionsPanel) return;

		optionsPanel.setAttribute('aria-hidden', 'false');
		optionsBtn.setAttribute('aria-expanded', 'true');
		this.isOptionsOpen = true;

		// Focus first element in options
		const firstFocusable = optionsPanel.querySelector(
			'button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
		);
		if (firstFocusable) {
			firstFocusable.focus();
		}

		this.announce('Options panel opened. Press Escape to close.', 'polite');
	}

	/**
	 * Close options panel
	 */
	closeOptions() {
		const optionsPanel = document.getElementById('options');
		const optionsBtn = document.getElementById('btn_options');

		if (!optionsPanel) return;

		optionsPanel.setAttribute('aria-hidden', 'true');
		optionsBtn.setAttribute('aria-expanded', 'false');
		this.isOptionsOpen = false;

		// Return focus to options button
		optionsBtn.focus();
		this.announce('Options panel closed', 'polite');
	}

	/**
	 * Update timer button state (aria-pressed)
	 * @param {string} state - 'started' or 'stopped'
	 */
	updateTimerButtonState(state) {
		const btn = document.getElementById('btn_startStop');
		if (!btn) return;

		const isPressed = state === 'running';
		btn.setAttribute('aria-pressed', isPressed);
		btn.textContent = isPressed ? 'Stop' : 'Start';

		const announcement = isPressed ? 'Timer started' : 'Timer stopped';
		this.announce(announcement, 'assertive');
	}

	/**
	 * Update progress bar accessibility attributes
	 * @param {number} current - Current countdown value
	 * @param {number} total - Total countdown duration
	 */
	updateProgress(current, total) {
		const progressBar = document.getElementById('countdown');
		if (!progressBar) return;

		const percentage = (current / total) * 100;
		progressBar.value = percentage;

		// Update aria-valuenow for screen readers
		progressBar.setAttribute('aria-valuenow', Math.round(percentage));
		progressBar.setAttribute('aria-label', `Timer progress: ${current} of ${total} seconds remaining`);
	}

	/**
	 * Update opacity value display with live region
	 * @param {number} value - Opacity value (0-255)
	 */
	updateOpacityDisplay(value) {
		const opacityValue = document.getElementById('opacityValue');
		const opacitySlider = document.getElementById('opacitySlider');

		if (opacityValue) {
			const percentage = Math.round((value / 255) * 100);
			opacityValue.textContent = `${percentage}%`;
			opacityValue.setAttribute('aria-label', `Opacity: ${percentage}%`);
		}

		if (opacitySlider) {
			opacitySlider.setAttribute('aria-valuenow', value);
			opacitySlider.setAttribute('aria-label', `Timer background opacity: ${Math.round((value / 255) * 100)}%`);
		}

		this.announce(`Opacity set to ${Math.round((value / 255) * 100)}%`, 'polite');
	}

	/**
	 * Update timer size display with live region
	 * @param {number} size - Timer size in pixels
	 */
	updateSizeDisplay(size) {
		const sizeValue = document.getElementById('val_timerSize');
		if (sizeValue) {
			sizeValue.textContent = size;
			sizeValue.setAttribute('aria-label', `Timer size: ${size} pixels`);
			this.announce(`Timer size set to ${size} pixels`, 'polite');
		}
	}

	/**
	 * Announce position change
	 * @param {string} position - Position name (TopLeft, TopRight, etc.)
	 */
	announcePositionChange(position) {
		const positionLabels = {
			TopLeft: 'top left',
			TopRight: 'top right',
			BottomLeft: 'bottom left',
			BottomRight: 'bottom right',
		};

		const label = positionLabels[position] || position;
		this.announce(`Timer position changed to ${label}`, 'polite');
	}

	/**
	 * Announce color change
	 * @param {string} type - Color type (numberStandard, backgroundWarning, etc.)
	 * @param {string} color - Hex color code
	 */
	announceColorChange(type, color) {
		const typeLabels = {
			numberStandard: 'standard timer number',
			numberWarning: 'warning timer number',
			numberTimeout: 'timeout timer number',
			backgroundStandard: 'standard timer background',
			backgroundWarning: 'warning timer background',
			backgroundTimeout: 'timeout timer background',
		};

		const label = typeLabels[type] || type;
		this.announce(`${label} color changed to ${color}`, 'polite');
	}

	/**
	 * Show keyboard shortcuts help dialog
	 */
	showKeyboardHelp() {
		const shortcuts = `
Keyboard Shortcuts:
- Space: Start/Stop timer
- C: Continue timer
- Ctrl+O (or Cmd+O): Toggle options
- Escape: Close options
- Tab: Navigate through controls
- Shift+Tab: Navigate backwards
- ?: Show this help
		`;

		this.announce(shortcuts, 'assertive');

		// Also show in console for developers
		console.info('Keyboard Shortcuts:', shortcuts);
	}

	/**
	 * Announce timer state with remaining time
	 * @param {number} seconds - Remaining seconds
	 * @param {string} state - Timer state (running, stopped, expired)
	 */
	announceTimerState(seconds, state) {
		let message = '';
		switch (state) {
			case 'running':
				message = `Timer running: ${seconds} seconds remaining`;
				break;
			case 'stopped':
				message = `Timer stopped: ${seconds} seconds remaining`;
				break;
			case 'expired':
				message = 'Timer expired. Time is up!';
				break;
			default:
				message = `Timer state: ${seconds} seconds`;
		}

		this.announce(message, state === 'expired' ? 'assertive' : 'polite');
	}

	/**
	 * Add keyboard support to image buttons (convert to button elements)
	 * This is called to enhance accessibility of existing image buttons
	 */
	enhanceImageButtons() {
		// Size control buttons - already converted to buttons in HTML

		// Position buttons - already buttons in HTML

		// Color example preview updates
		this.setupColorPreviewUpdates();
	}

	/**
	 * Setup color preview updates with aria-live regions
	 */
	setupColorPreviewUpdates() {
		const colorInputs = document.querySelectorAll('input[type="color"]');

		colorInputs.forEach((input) => {
			input.addEventListener('change', (event) => {
				// Update example preview
				const exampleId = event.target.id
					.replace('colorSelectorNumber', 'colorSelectorExample')
					.replace('colorSelectorBackground', 'colorSelectorExample');

				const example = document.getElementById(exampleId);
				if (!example) return;

				const className = event.target.id.includes('Background') ? 'backgroundColor' : 'color';
				const isNumber = event.target.id.includes('Number');
				const type = event.target.id.includes('Standard')
					? 'Standard'
					: event.target.id.includes('Warning')
						? 'Warning'
						: 'Timeout';

				if (isNumber) {
					example.style.color = event.target.value;
					this.announceColorChange(`number${type}`, event.target.value);
				} else {
					example.style.backgroundColor = event.target.value;
					this.announceColorChange(`background${type}`, event.target.value);
				}
			});
		});
	}

	/**
	 * Announce duration change when presets are used
	 * @param {number} seconds - Duration in seconds
	 */
	announceDurationChange(seconds) {
		const message = `Timer duration set to ${seconds} seconds`;
		this.announce(message, 'polite');
	}

	/**
	 * Enable high contrast mode
	 */
	enableHighContrast() {
		document.body.classList.add('high-contrast');
		this.announce('High contrast mode enabled', 'polite');
	}

	/**
	 * Disable high contrast mode
	 */
	disableHighContrast() {
		document.body.classList.remove('high-contrast');
		this.announce('High contrast mode disabled', 'polite');
	}

	/**
	 * Toggle high contrast mode
	 */
	toggleHighContrast() {
		const enabled = document.body.classList.toggle('high-contrast');
		const message = enabled ? 'High contrast mode enabled' : 'High contrast mode disabled';
		this.announce(message, 'polite');
	}
}

// Export for use in main script
export default A11yManager;
