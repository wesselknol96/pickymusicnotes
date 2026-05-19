function closestChordBarOption(value) {
    const numericValue = Number(value) || 1;
    return String(CHORD_BAR_OPTIONS.reduce((closest, option) => (
        Math.abs(option.value - numericValue) < Math.abs(closest.value - numericValue) ? option : closest
    ), CHORD_BAR_OPTIONS[0]).value);
}

function randomChord() {
    const note = NOTES[Math.floor(Math.random() * NOTES.length)];
    const type = RANDOM_TYPES[Math.floor(Math.random() * RANDOM_TYPES.length)];
    return `${note}${type}`;
}

function transposeChord(chord, amount) {
    const parsed = String(chord || '').trim().match(/^([A-G](?:#)?)(.*)$/);
    if (!parsed) return chord;

    const noteIndex = NOTES.indexOf(parsed[1]);
    if (noteIndex < 0) return chord;

    const nextIndex = wrap(noteIndex + clamp(Number(amount) || 0, -12, 12), NOTES.length);
    return `${NOTES[nextIndex]}${parsed[2]}`;
}

function normalizeChordName(value) {
    const chord = String(value || '').trim();
    const parsed = chord.match(/^([a-g])(#?)(.*)$/);
    if (!parsed) return chord || 'G';
    return `${parsed[1].toUpperCase()}${parsed[2]}${parsed[3]}`;
}

function titleCase(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/\b([a-z])/g, letter => letter.toUpperCase());
}

function labelForType(type) {
    return String(type || '')
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function normalizeSectionType(type, fallbackTitle = '') {
    const normalizedType = String(type || '').trim().toLowerCase().replace(/\s+/g, '-');
    if (SECTION_TYPES.includes(normalizedType)) return normalizedType;

    const normalizedTitle = String(fallbackTitle || '').trim().toLowerCase().replace(/\s+/g, '-');
    if (SECTION_TYPES.includes(normalizedTitle)) return normalizedTitle;

    return 'verse';
}

function createId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function wrap(value, length) {
    return ((value % length) + length) % length;
}

function clearPlayerTimer() {
    if (state.player.timer) {
        window.clearInterval(state.player.timer);
        state.player.timer = null;
    }
}
