function getAdjustedPositions(chord) {
    const positions = chord.positions || parseChordNotation(chord.frets);

    return positions.map((fret, stringIndex) => {
        if (fret < 0 || !Number.isFinite(fret)) return -1;

        const adjustedFret = fret - (appState.stringOffsets[stringIndex] || 0);
        return adjustedFret < 0 ? -1 : adjustedFret;
    });
}

function getOpenStringNoteIndex(stringIndex) {
    const instrumentConfig = config.instruments[appState.currentInstrument];
    const baseNote = instrumentConfig.stringTuning[stringIndex].toUpperCase();

    return normalizeNoteIndex(noteIndex(baseNote) + (appState.stringOffsets[stringIndex] || 0));
}

function formatDisplayNote(noteIndexValue, stringIndex) {
    const normalizedIndex = normalizeNoteIndex(noteIndexValue);
    const sharpName = HALF_NOTES[normalizedIndex];
    const displayName = sharpName;
    const isHighEString = stringIndex === config.instruments[appState.currentInstrument].stringTuning.length - 1;

    return isHighEString && displayName === 'E' ? 'e' : displayName;
}

function normalizeNoteIndex(index) {
    return (index % HALF_NOTES.length + HALF_NOTES.length) % HALF_NOTES.length;
}

function noteIndex(note) {
    return HALF_NOTES.indexOf(note);
}

function getTileSize() {
    const tile = window.getComputedStyle(document.documentElement).getPropertyValue('--tile');
    const parsedTile = Number.parseFloat(tile);

    return Number.isFinite(parsedTile) ? parsedTile : 20;
}

function stringTileY(index, stringCount, topTiles) {
    const reversedIndex = stringCount - 1 - index;
    return topTiles + reversedIndex * 2;
}

function tilePosition(tile) {
    return `calc(var(--tile) * ${tile})`;
}

function parseChordNotation(notation) {
    if (!notation) return [];

    return notation.split('-').map(part => {
        if (part.toLowerCase() === 'x') return -1;
        if (part.toLowerCase() === 'o') return 0;
        return Number.parseInt(part, 10);
    });
}

function formatChoice(choice) {
    if (VARIANT_SLOTS.includes(choice)) {
        return choice.replace('type ', 'Type ');
    }

    return choice.replace(/\b\w/g, letter => letter.toUpperCase());
}

function cssEscape(value) {
    return window.CSS?.escape ? CSS.escape(value) : value.replace(/"/g, '\\"');
}

