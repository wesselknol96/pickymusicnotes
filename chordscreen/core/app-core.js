const HALF_NOTES = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
const TYPE_ORDER = ['major', 'minor', '7', 'maj7', 'm7', 'sus2', 'sus4', 'dim', 'aug', '6', '9', 'add9'];
const ROWS = ['note', 'type', 'variant'];
const VARIANT_SLOTS = ['type 1', 'type 2', 'type 3', 'type 4', 'type 5', 'type 6', 'type 7', 'type 8', 'type 9', 'type 10'];
const MIN_VISIBLE_FRETS = 12;
const MAX_VISIBLE_FRETS = 24;
const PENTATONIC_INTERVALS = {
    major: [0, 2, 4, 7, 9],
    minor: [0, 3, 5, 7, 10]
};

const config = {
    instruments: {
        'acoustic-guitar': {
            name: 'Acoustic Guitar',
            dataFile: 'data/acoustic-guitar.json',
            strings: 6,
            frets: 21,
            stringTuning: ['E', 'A', 'D', 'G', 'B', 'e']
        }
    }
};

const appState = {
    currentInstrument: 'acoustic-guitar',
    chordData: {},
    currentChord: null,
    selection: {
        note: 'A',
        type: 'major',
        variant: 'type 1'
    },
    capoFret: 0,
    visibleFrets: 21,
    stringOffsets: [0, 0, 0, 0, 0, 0],
    tuningAnimations: [null, null, null, null, null, null],
    pentatonicMode: false,
    activeRow: 'note',
    wheelLock: null,
    pickerActive: false,
    listenersInitialized: false
};

document.addEventListener('DOMContentLoaded', () => {
    startActiveVisitorCount();
    initializeApp();
});

async function initializeApp() {
    const instrument = config.instruments[appState.currentInstrument];

    try {
        appState.chordData = await loadChordData(instrument.dataFile);

        if (!appState.listenersInitialized) {
            setupEventListeners();
            appState.listenersInitialized = true;
        }

        selectDefaultChord();
        renderSelectorRows();
        displayChord(getSelectedChord());
    } catch (error) {
        console.error('Error initializing app:', error);
        alert('Error loading chord data. Please check the console.');
    }
}

async function loadChordData(filePath) {
    const response = await fetch(filePath);

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
}
