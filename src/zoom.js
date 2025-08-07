import { initCanvas } from './canvas.js';

let isInitializing = true;
let videoSize;

export async function initZoomSdk(gui) {
    const configResult = await zoomSdk.config({
        version: '0.16.19',
        popoutSize: { width: 322, height: 350 },
        capabilities: [
            'authorize',
            'onAuthorized',
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

    videoSize = {
        height: configResult.media.renderTarget.height,
        width: configResult.media.renderTarget.width,
    };

    try {
        await zoomSdk.runRenderingContext({ view: 'camera' });
        await zoomSdk.getRunningContext();
        initCanvas(gui);
        addEventListeners(gui);
        isInitializing = false;
    } catch (error) {
        console.log('Error:', error);
    }
}

function addEventListeners(gui) {
    zoomSdk.addEventListener('onAppVisibilityChange', event => {
        console.log('onAppVisibilityChange', event);
    });

    zoomSdk.addEventListener('onAppPopout', event => {
        console.log(event);
    });

    zoomSdk.addEventListener('onMyMediaChange', event => {
        if (isInitializing) return;
        if (event.media.video.state === false) {
            zoomSdk.closeRenderingContext().catch(e => console.log(e));
        } else {
            initZoomSdk(gui);
            initCanvas(gui);
        }
    });
}

export function getVideoSize() {
    return videoSize;
}

export async function drawImage(options) {
    return await zoomSdk.drawImage(options);
}

export async function clearImage(imageId) {
    return await zoomSdk.clearImage(imageId);
}

export async function closeRenderingContext() {
    return await zoomSdk.closeRenderingContext();
}
