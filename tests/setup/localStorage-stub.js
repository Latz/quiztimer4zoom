// Node.js v22+ implements the WebStorage API natively. Without --localstorage-file,
// accessing globalThis.localStorage throws a SecurityError. Override it with a
// safe in-memory stub so tests can run without the CLI flag.
// jsdom environments provide their own working localStorage, so we skip them.

let needsStub = false;
try {
	globalThis.localStorage.getItem('__vitest_probe__');
} catch (e) {
	if (e && e.name === 'SecurityError') {
		needsStub = true;
	}
}

if (needsStub) {
	let _store = {};
	Object.defineProperty(globalThis, 'localStorage', {
		configurable: true,
		enumerable: true,
		get() {
			return {
				getItem(k) { return Object.prototype.hasOwnProperty.call(_store, k) ? _store[k] : null; },
				setItem(k, v) { _store[k] = String(v); },
				removeItem(k) { delete _store[k]; },
				clear() { _store = {}; },
				get length() { return Object.keys(_store).length; },
				key(i) { return Object.keys(_store)[i] ?? null; },
			};
		},
	});
}
