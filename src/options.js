const defaultOptions = {
    position: 'TopRight',
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

let options = JSON.parse(localStorage.getItem('quiztimer'));
if (!options) {
    options = defaultOptions;
    localStorage.setItem('quiztimer', JSON.stringify(options));
}

export function getOptions() {
    return options;
}

export function saveOption(optionName, optionValue) {
    options[optionName] = optionValue;
    localStorage.setItem('quiztimer', JSON.stringify(options));
}

export function saveOptions(newOptions) {
    options = { ...options, ...newOptions };
    localStorage.setItem('quiztimer', JSON.stringify(options));
}
