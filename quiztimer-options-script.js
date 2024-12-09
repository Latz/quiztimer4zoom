document.onreadystatechange = async () => {
	if (document.readyState === 'complete') {
		document.getElementById('options').style.display = 'hidden';

		// --- colorSelectorNumberStandard -------------------------------------------------------
		const colorSelectorNumberStandard = document.getElementById(
			'colorSelectorNumberStandard'
		);
		const colorSelectorBackgroundStandard = document.getElementById(
			'colorSelectorBackgroundStandard'
		);

		const colorSelectorExampleStandard = document.getElementById(
			'colorSelectorExampleStandard'
		);

		//--- set color selectors
		console.log(quiztimerOptions.numberStandard);
		colorSelectorNumberStandard.value = quiztimerOptions.numberStandard;
		colorSelectorBackgroundStandard.value = quiztimerOptions.backgroundStandard;
		colorSelectorExampleStandard.style.color = quiztimerOptions.numberStandard;
		colorSelectorExampleStandard.style.backgroundColor =
			quiztimerOptions.backgroundStandard;

		colorSelectorNumberStandard.addEventListener('change', e => {
			saveOption('numberStandard', e.target.value);
		});
		colorSelectorNumberStandard.addEventListener('input', e => {
			colorSelectorExampleStandard.style.color = e.target.value;
		});

		colorSelectorBackgroundStandard.addEventListener('change', e => {
			saveOption('backgroundStandard', e.target.value);
		});
		colorSelectorBackgroundStandard.addEventListener('input', e => {
			colorSelectorExampleStandard.style.backgroundColor = e.target.value;
		});

		// --- colorSelectorNumberWarning -------------------------------------------------------
		const colorSelectorNumberWarning = document.getElementById(
			'colorSelectorNumberWarning'
		);
		const colorSelectorBackgroundWarning = document.getElementById(
			'colorSelectorBackgroundWarning'
		);

		const colorSelectorExampleWarning = document.getElementById(
			'colorSelectorExampleWarning'
		);

		// set color selectors
		colorSelectorNumberWarning.value = quiztimerOptions.numberWarning;
		colorSelectorBackgroundWarning.value = quiztimerOptions.backgroundWarning;
		colorSelectorExampleWarning.style.color = quiztimerOptions.numberWarning;
		colorSelectorExampleWarning.style.backgroundColor =
			quiztimerOptions.backgroundWarning;

		colorSelectorNumberWarning.addEventListener('change', e => {
			saveOption('numberWarning', e.target.value);
		});
		colorSelectorNumberWarning.addEventListener('input', e => {
			colorSelectorExampleWarning.style.color = e.target.value;
		});

		colorSelectorBackgroundWarning.addEventListener('change', e => {
			saveOption('backgroundWarning', e.target.value);
		});
		colorSelectorBackgroundWarning.addEventListener('input', e => {
			colorSelectorExampleWarning.style.backgroundColor = e.target.value;
		});
		// --- colorSelectorNumberTimeout -------------------------------------------------------
		const colorSelectorNumberTimeout = document.getElementById(
			'colorSelectorNumberTimeout'
		);
		const colorSelectorBackgroundTimeout = document.getElementById(
			'colorSelectorBackgroundTimeout'
		);

		const colorSelectorExampleTimeout = document.getElementById(
			'colorSelectorExampleTimeout'
		);

		// set color selectors
		colorSelectorNumberTimeout.value = quiztimerOptions.numberTimeout;
		colorSelectorBackgroundTimeout.value = quiztimerOptions.backgroundTimeout;
		colorSelectorExampleTimeout.style.color = quiztimerOptions.numberTimeout;
		colorSelectorExampleTimeout.style.backgroundColor =
			quiztimerOptions.backgroundTimeout;

		colorSelectorNumberTimeout.addEventListener('change', e => {
			saveOption('numberTimeout', e.target.value);
		});
		colorSelectorNumberTimeout.addEventListener('input', e => {
			colorSelectorExampleTimeout.style.color = e.target.value;
		});

		colorSelectorBackgroundTimeout.addEventListener('change', e => {
			saveOption('backgroundTimeout', e.target.value);
		});
		colorSelectorBackgroundTimeout.addEventListener('input', e => {
			colorSelectorExampleTimeout.style.backgroundColor = e.target.value;
		});
	}
};

function saveOption(optionName, optionValue) {
	console.log('saveOption', optionName, optionValue);
	quiztimerOptions[optionName] = optionValue;
	localStorage.setItem('quiztimer', JSON.stringify(quiztimerOptions));
}
