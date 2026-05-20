const STORAGE_KEY = 'picky-songwriter-songs-v1';
const UI_SETTINGS_KEY = 'picky-songwriter-ui-settings-v1';
const SETLISTS_STORAGE_KEY = 'picky-songwriter-setlists-v1';
const CLOUD_CACHE_KEY = 'picky-songwriter-cloud-cache-v2';
const LOCAL_ONLINE_IDS_KEY = 'picky-songwriter-online-song-ids-v1';
const SECTION_TYPES = ['intro', 'verse', 'pre-chorus', 'chorus', 'bridge', 'solo', 'interlude', 'instrumental', 'tag', 'odd', 'outro'];
const NOTES = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
const RANDOM_TYPES = ['', 'm', '7', 'maj7', 'm7', 'sus2', 'sus4', 'add9'];
const CHORD_TYPE_ORDER = ['major', 'minor', '7', 'maj7', 'm7', 'sus2', 'sus4', 'dim', 'aug', '6', '9', 'add9'];
const CHORD_BAR_OPTIONS = [
    { value: 4, label: '4' },
    { value: 2, label: '2' },
    { value: 1, label: '1' },
    { value: 0.5, label: '1/2' },
    { value: 0.25, label: '1/4' },
    { value: 0.125, label: '1/8' },
    { value: 0.0625, label: '1/16' },
    { value: 0.03125, label: '1/32' }
];
const LINE_REPETITION_MIN = 1;
const LINE_REPETITION_MAX = 9;
const STATIC_NUMBER_WHEELS = {
    'play-bpm': { min: 30, max: 240, step: 1 },
    'song-bpm': { min: 30, max: 240, step: 1 },
    'beats-per-bar': { min: 1, max: 12, step: 1, format: value => `1/${value}` },
    countdown: { min: 0, max: 16, step: 1 },
    transpose: { min: -12, max: 12, step: 1 },
    capo: { min: -12, max: 12, step: 1 },
    'random-bars': { min: 1, max: 16, step: 1 }
};
const TAB_STRINGS = ['e', 'B', 'G', 'D', 'A', 'E'];
const TAB_FRET_OPTIONS = [
    { value: -4, label: '~' },
    { value: -3, label: 'r', aliases: ['r~'] },
    { value: -2, label: '/', aliases: ['/~'] },
    { value: -1, label: '✕', aliases: ['x'] },
    { value: 0, label: '–', aliases: ['-'] },
    ...Array.from({ length: 24 }, (_, index) => ({ value: index + 1, label: String(index + 1) }))
];

const state = {
    songs: [],
    activeSongId: null,
    setlists: [],
    songSource: 'local',
    libraryScreen: 'songs',
    libraryEditMode: false,
    editMode: false,
    locked: false,
    compact: false,
    showDetailedDurationsEdit: false,
    showDetailedDurationsDisplay: false,
    showSectionTitlesDisplay: true,
    showRepetitionsEdit: true,
    showRepetitionsDisplay: true,
    showChordTabsEdit: false,
    hasSetDetailedDurationsEdit: false,
    hasSetDetailedDurationsDisplay: false,
    songSourceRequestId: 0,
    showLibraryAuthors: true,
    showLibraryRatings: true,
    showLibraryStructure: true,
    search: '',
    chordLibrary: null,
    draggedSectionId: null,
    dropTargetSectionId: null,
    draggedSubsectionId: null,
    draggedSubsectionSectionId: null,
    dropTargetSubsectionId: null,
    subsectionMenuTimer: null,
    activeSectionId: null,
    activeSubsectionId: null,
    sectionMenuTimer: null,
    editSnapshot: null,
    insertSectionIndex: null,
    pendingDeleteSongId: null,
    saveTimer: null,
    cloudSaveTimer: null,
    auth: {
        client: null,
        user: null,
        profile: null,
        status: 'offline',
        message: ''
    },
    player: {
        timer: null,
        audio: null,
        playing: false,
        beatInBar: 0,
        chordIndex: 0,
        beatsLeftInChord: 0,
        countdownBeatsLeft: 0,
        pendingChordStart: false,
        randomBarsUntilNext: 0
    }
};

document.addEventListener('DOMContentLoaded', initializeSongwriter);

async function initializeSongwriter() {
    loadUiSettings();
    await initializeCloudAuth();
    state.chordLibrary = await loadRecordChordLibrary();
    await window.ChordTooltip?.ready;
    state.songs = await loadSongs();
    state.setlists = loadSetlists();
    await loadLibraryRatings?.();
    state.activeSongId = state.songs[0]?.id || null;
    state.activeSectionId = activeSong()?.sections[0]?.id || null;
    state.activeSubsectionId = activeSong()?.sections[0]?.subsections[0]?.id || null;

    setupSectionMenu();
    setupEvents();
    setupStaticNumberWheels();
    render();
    notifyEditMode();
}

async function loadRecordChordLibrary() {
    try {
        const response = await fetch('../../data/acoustic-guitar.json');
        if (!response.ok) throw new Error(`Chord library failed with ${response.status}`);
        return await response.json();
    } catch (error) {
        console.warn('Could not load chord library for record player.', error);
        return null;
    }
}
