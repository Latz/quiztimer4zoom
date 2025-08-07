import { getOptions, saveOptions } from './options.js';
import { drawImage as zoomDrawImage, clearImage as zoomClearImage } from './zoom.js';

let zIndex = 0;
let prevImageId = '0';
let posX = 10, posY = 10;

function getColors(time) {
    const options = getOptions();
    if (time === 0) {
        return {
            fgColor: options.numberTimeout,
            bgColor: options.backgroundTimeout,
        };
    }
    if (time <= 5) {
        return {
            fgColor: options.numberWarning,
            bgColor: options.backgroundWarning,
        };
    }
    return {
        fgColor: options.numberStandard,
        bgColor: options.backgroundStandard,
    };
}

function calcFontsize(fontFamily) {
    const options = getOptions();
    if (!calcFontsize.virtualCanvas) {
        calcFontsize.virtualCanvas = document.createElement('canvas');
        calcFontsize.virtualCtx = calcFontsize.virtualCanvas.getContext('2d');
    }

    const virtualCanvas = calcFontsize.virtualCanvas;
    const virtualCtx = calcFontsize.virtualCtx;

    virtualCanvas.width = options.boxSize;
    virtualCanvas.height = options.boxSize;

    const text = '88';
    const paddingPercent = 5;

    const baseFontString = `bold 10px ${fontFamily}`;
    virtualCtx.font = baseFontString;

    const metrics = virtualCtx.measureText(text);
    const textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

    let minSize = 10;
    let maxSize = Math.min(500, options.boxSize);
    let bestFontSize = minSize;

    while (maxSize - minSize > 0.5) {
        const testSize = Math.floor((minSize + maxSize) / 2);
        virtualCtx.font = `bold ${testSize}px ${fontFamily}`;

        const testMetrics = virtualCtx.measureText(text);
        const testWidth = testMetrics.width;
        const testHeight = testMetrics.actualBoundingBoxAscent + testMetrics.actualBoundingBoxDescent;
        const padding = (testHeight * paddingPercent) / 100;

        if (testWidth + padding * 2 <= virtualCanvas.width) {
            minSize = testSize;
            bestFontSize = testSize;
        } else {
            maxSize = testSize;
        }
    }

    virtualCtx.font = `bold ${bestFontSize}px ${fontFamily}`;
    const finalMetrics = virtualCtx.measureText(text);
    const finalTextWidth = finalMetrics.width;
    const finalTextHeight = finalMetrics.actualBoundingBoxAscent + finalMetrics.actualBoundingBoxDescent;
    const padding = (finalTextHeight * paddingPercent) / 100;

    const x = (virtualCanvas.width - finalTextWidth) / 2;
    const y = finalMetrics.actualBoundingBoxAscent + padding;
    const canvasHeight = finalTextHeight + padding * 2;

    return [x, y, bestFontSize, virtualCanvas.width, canvasHeight];
}

export function initCanvas(gui) {
    const fontFamily = 'Arial';
    let [x, y, bestFontSize, canvasWidth, canvasHeight] = calcFontsize(fontFamily);
    posX = x;
    posY = y;

    gui.canvas.height = canvasHeight;
    gui.canvas.width = canvasWidth;

    const { fgColor, bgColor } = getColors(20);

    gui.ctx.font = `bold ${bestFontSize}px ${fontFamily}`;
    gui.ctx.fillStyle = bgColor;
    gui.ctx.textAlign = 'left';
    gui.ctx.textBaseline = 'alphabetic';

    drawImage(gui.canvas, gui.ctx, 20);
}

export async function drawImage(canvas, ctx, time) {
    const options = getOptions();
    let fgColor = options.numberStandard;
    let bgColor = `${options.backgroundStandard}`;
    if (time <= 5) {
        fgColor = options.numberWarning;
        bgColor = `${options.backgroundWarning}`;
    }
    if (time === 0) {
        fgColor = options.numberTimeout;
        bgColor = `${options.backgroundTimeout}`;
    }

    zIndex++;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = fgColor;
    ctx.fillText(time, posX, posY);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const x = options.x;
    const y = options.y;

    const imageId = await zoomDrawImage({
        imageData,
        zIndex,
        x,
        y,
    });

    if (prevImageId !== '0') {
        zoomClearImage(prevImageId);
    }
    prevImageId = imageId;
}

export function setPosition(position, gui, videoSize) {
    const options = getOptions();
    const { width: videoWidth, height: videoHeight } = videoSize;
    const { width: canvasWidth, height: canvasHeight } = gui.canvas;
    let newX = options.x;
    let newY = options.y;

    if (position.includes('Left')) {
        newX = 0;
    } else if (position.includes('Right')) {
        newX = videoWidth - canvasWidth;
    }

    if (position.includes('Top')) {
        newY = 0;
    } else if (position.includes('Bottom')) {
        newY = videoHeight - canvasHeight;
    }

    saveOptions({ x: newX, y: newY, position: position });

    initCanvas(gui);
    drawImage(gui.canvas, gui.ctx, 20); // 20 is a placeholder for the current duration
}
