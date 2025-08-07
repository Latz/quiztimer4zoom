import { drawImage } from './canvas.js';
import { getOptions } from './options.js';

const stop = Symbol('stop');
const running = Symbol('running');
let state = stop;

let timerId = 0;
let timeLeft = 0;
let timedResetId;
let duration = 20;

const btnStartStop = document.getElementById('btn_startStop');
const btnContinue = document.getElementById('btn_continue');
const progressbar = document.getElementById('countdown');

export function setDuration(gui, time) {
    duration = time;
    drawImage(gui.canvas, gui.ctx, duration);
}

export function startTimer(gui) {
    if (timedResetId) clearInterval(timedResetId);

    state = running;
    btnStartStop.innerText = 'Stop';
    btnContinue.disabled = true;
    timeLeft = duration;
    progressbar.value = progressbar.max;

    runTimer(gui);
}

export function stopTimer(gui) {
    state = stop;
    btnContinue.disabled = false;
    clearInterval(timerId);
    btnStartStop.innerText = 'Start';
    timedReset(gui);
}

export function continueTimer(gui) {
    state = running;
    btnStartStop.innerText = 'Stop';
    btnContinue.disabled = true;
    clearInterval(timedResetId);
    progressbar.value = progressbar.max;
    runTimer(gui);
}

function timedReset(gui) {
    const timeout = 5000;
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

function runTimer(gui) {
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

export function getTimerState() {
    return state;
}

import { closeRenderingContext, initZoomSdk } from './zoom.js';

export function resetTimer(gui) {
    closeRenderingContext().then(() => {
        initZoomSdk(gui);
    });
}
