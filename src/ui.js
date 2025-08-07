import { startTimer, stopTimer, continueTimer, setDuration, getTimerState, resetTimer } from './timer.js';
import { setPosition, initCanvas } from './canvas.js';
import { getOptions, saveOption } from './options.js';
import { getVideoSize } from './zoom.js';

export function initGui() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const gui = { canvas, ctx };

    const options = getOptions();
    canvas.height = options.boxSize;
    canvas.width = options.boxSize;

    document.getElementById('actions').addEventListener('click', event => {
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
                if (getTimerState() === Symbol.for('stop')) startTimer(gui);
                else stopTimer(gui);
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

    const optionsElement = document.getElementById('options');
    optionsElement.style.visibility = 'hidden';

    document.getElementById('subActions').addEventListener('click', event => {
        switch (event.target.id) {
            case 'btn_options':
                if (optionsElement.style.visibility === 'hidden') {
                    optionsElement.style.visibility = 'visible';
                    document.body.style.overflowY = 'scroll';
                } else {
                    optionsElement.style.visibility = 'hidden';
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

    document.getElementById('position').addEventListener('click', event => {
        setPosition(event.target.id, gui, getVideoSize());
    });

    document.getElementById('timerSize').addEventListener('click', event => {
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
        const newSize = getOptions().boxSize + value;
        saveOption('boxSize', newSize);
        setPosition(getOptions().position, gui, getVideoSize());
    });

    ['Standard', 'Warning', 'Timeout'].forEach(state => setupColorSelector(state, gui));

    return gui;
}

function setupColorSelector(state, gui) {
    const numberSelector = document.getElementById(`colorSelectorNumber${state}`);
    const backgroundSelector = document.getElementById(`colorSelectorBackground${state}`);
    const exampleElement = document.getElementById(`colorSelectorExample${state}`);

    const numberOption = `number${state}`;
    const backgroundOption = `background${state}`;

    const options = getOptions();
    numberSelector.value = options[numberOption];
    backgroundSelector.value = options[backgroundOption];
    exampleElement.style.color = options[numberOption];
    exampleElement.style.backgroundColor = options[backgroundOption];

    numberSelector.addEventListener('change', e => {
        saveOption(numberOption, e.target.value);
        initCanvas(gui);
    });
    numberSelector.addEventListener('input', e => {
        exampleElement.style.color = e.target.value;
    });

    backgroundSelector.addEventListener('change', e => {
        saveOption(backgroundOption, e.target.value);
        initCanvas(gui);
    });
    backgroundSelector.addEventListener('input', e => {
        exampleElement.style.backgroundColor = e.target.value;
    });
}
