// scratch/test_js_loading.js
global.window = {
  devicePixelRatio: 1,
  addEventListener: () => {},
  AudioContext: class {
    constructor() {
      this.sampleRate = 44100;
      this.currentTime = 0;
    }
    createBuffer() { return { getChannelData: () => new Float32Array(100) }; }
    createBufferSource() { return { connect: () => {}, start: () => {} }; }
    createBiquadFilter() { return { frequency: { setValueAtTime: () => {} }, connect: () => {} }; }
    createGain() { return { gain: { setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {} }; }
    createOscillator() { return { frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {}, start: () => {}, stop: () => {} }; }
  },
  webkitAudioContext: class {},
};
global.document = {
  getElementById: (id) => {
    return {
      addEventListener: () => {},
      classList: { add: () => {}, remove: () => {}, contains: () => false },
      appendChild: () => {},
      querySelectorAll: () => [],
      style: {},
      getContext: () => ({
        scale: () => {},
        fillRect: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        fillText: () => {},
        save: () => {},
        restore: () => {},
      }),
      getBoundingClientRect: () => ({ width: 680, height: 200 }),
    };
  },
  querySelectorAll: () => [],
  addEventListener: () => {},
};
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
};

const fs = require('fs');
const path = require('path');
global.fetch = async (url) => {
  const filePath = path.resolve(__dirname, '..', url);
  const content = fs.readFileSync(filePath, 'utf-8');
  return {
    ok: true,
    json: async () => JSON.parse(content),
  };
};

(async () => {
  try {
    console.log("Attempting to import main.js...");
    await import('../src/main.js');
    console.log("SUCCESS: main.js loaded without runtime errors!");
  } catch (err) {
    console.error("FAILURE: Runtime error during import:", err);
    process.exit(1);
  }
})();
