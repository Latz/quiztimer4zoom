import { initGui } from './ui.js';
import { initZoomSdk } from './zoom.js';

document.onreadystatechange = async () => {
    if (document.readyState === 'complete') {
        const gui = initGui();
        await initZoomSdk(gui);
    }
};
