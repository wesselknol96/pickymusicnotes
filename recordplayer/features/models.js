function createSong() {
    const section = createSection('verse');
    return {
        id: createId('song'),
        title: 'Untitled Song',
        artist: 'Artist',
        bpm: 96,
        beatsPerBar: 4,
        countdown: 0,
        capo: 0,
        playable: true,
        randomPlayback: false,
        transpose: 0,
        sections: [section]
    };
}

function createSection(type = 'verse') {
    const normalizedType = normalizeSectionType(type);
    const subsection = createSubsection('chords');
    return {
        id: createId('section'),
        type: normalizedType,
        title: labelForType(normalizedType),
        comment: '',
        bars: 4,
        subsections: [subsection]
    };
}

function createSubsection(type = 'chords') {
    const subsection = {
        id: createId('subsection'),
        type,
        chords: [createChord('G')],
        lyrics: '',
        lyricLineDurations: [1],
        tabRepetitions: 1,
        chordLineRepetitions: [1],
        lyricLineRepetitions: [1]
    };
    if (type === 'tabs') {
        subsection.chords = [];
        subsection.tabs = createTabData();
    }
    return subsection;
}

function createChord(name) {
    return {
        id: createId('chord'),
        name: normalizeChordName(name),
        bars: 1
    };
}

function activeSong() {
    return state.songs.find(song => song.id === state.activeSongId);
}

const DEFAULT_TAB_COLUMN_COUNT = 39;

function createTabData() {
    const columns = Array.from({ length: DEFAULT_TAB_COLUMN_COUNT }, () => createTabColumn());

    return {
        strings: [...TAB_STRINGS],
        columns
    };
}

function createTabColumn(frets = []) {
    return {
        id: createId('tab'),
        duration: 1,
        frets: TAB_STRINGS.map((_, index) => normalizeTabFret(frets[index]))
    };
}

function normalizeTabFret(value) {
    if (value === null || value === undefined || value === '') return 0;
    const trimmed = String(value).trim().toLowerCase();
    if (trimmed === 'x' || trimmed === '✕') return -1;
    if (trimmed === '/' || trimmed === '/~') return -2;
    if (trimmed === 'r' || trimmed === 'r~') return -3;
    if (trimmed === '~') return -4;
    if (trimmed === '-' || trimmed === '–') return 0;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    if (numeric <= -4) return -4;
    if (numeric <= -3) return -3;
    if (numeric <= 0) return Math.round(numeric);
    return clamp(Math.round(numeric), 1, 24);
}

function activeSection() {
    const song = activeSong();
    return song?.sections.find(section => section.id === state.activeSectionId) || song?.sections[0] || null;
}

function activeSubsection() {
    const section = activeSection();
    return section?.subsections.find(subsection => subsection.id === state.activeSubsectionId) || section?.subsections[0] || null;
}

function normalizeSong(song) {
    if (!song || !Array.isArray(song.sections)) return song;

    song.artist = song.artist || 'Artist';
    song.capo = clamp(Number(song.capo) || 0, -12, 12);
    song.countdown = normalizeCountdown(song.countdown);
    song.sections.forEach(section => {
        const legacyTabsSection = section.type === 'tabs';
        if (legacyTabsSection) section.type = 'verse';
        section.type = normalizeSectionType(section.type, section.title);
        section.title = labelForType(section.type);

        if (!Array.isArray(section.subsections) || !section.subsections.length) {
            section.subsections = [{
                id: createId('subsection'),
                type: legacyTabsSection ? 'tabs' : 'chords',
                chords: legacyTabsSection ? [] : Array.isArray(section.chords) && section.chords.length ? section.chords : [createChord('G')],
                tabs: legacyTabsSection ? createTabData() : undefined,
                lyrics: section.lyrics || '',
                lyricLineDurations: [1],
                tabRepetitions: 1,
                chordLineRepetitions: [1],
                lyricLineRepetitions: [1]
            }];
        }

        section.subsections.forEach(subsection => {
            if (!subsection.id) subsection.id = createId('subsection');
            if (legacyTabsSection && !subsection.type) subsection.type = 'tabs';
            if (!subsection.type) subsection.type = 'chords';
            if (isTabsSubsection(section, subsection)) {
                subsection.type = 'tabs';
                subsection.chords = Array.isArray(subsection.chords) ? subsection.chords : [];
                subsection.tabs = normalizeTabData(subsection.tabs);
            } else if (!Array.isArray(subsection.chords) || !subsection.chords.length) {
                subsection.chords = [createChord('G')];
            }
            if (typeof subsection.lyrics !== 'string') subsection.lyrics = '';
            syncSubsectionRepetitionData(subsection);
        });

        delete section.chords;
        delete section.lyrics;
    });

    return song;
}

function syncSubsectionRepetitionData(subsection) {
    subsection.tabRepetitions = normalizeLineRepetition(subsection.tabRepetitions);
    subsection.lyricLineDurations = normalizeDurationList(
        subsection.lyricLineDurations,
        getLyricLineCount(subsection)
    );
    subsection.chordLineRepetitions = normalizeRepetitionList(
        subsection.chordLineRepetitions,
        chordLineCount(subsection)
    );
    subsection.lyricLineRepetitions = normalizeRepetitionList(
        subsection.lyricLineRepetitions,
        getLyricLineCount(subsection)
    );
}

function normalizeRepetitionList(list, length) {
    const source = Array.isArray(list) ? list : [];
    return Array.from({ length: Math.max(1, length) }, (_, index) => normalizeLineRepetition(source[index]));
}

function normalizeDurationList(list, length) {
    const source = Array.isArray(list) ? list : [];
    return Array.from({ length: Math.max(1, length) }, (_, index) => normalizeLineDuration(source[index]));
}

function normalizeLineDuration(value) {
    return Number(closestChordBarOption(value || 1));
}

function normalizeLineRepetition(value) {
    return clamp(Math.round(Number(value) || 1), LINE_REPETITION_MIN, LINE_REPETITION_MAX);
}

function normalizeCountdown(value) {
    return clamp(Math.round(Number(value) || 0), 0, 16);
}

function chordLineCount(subsection) {
    return Math.max(1, Math.ceil(((subsection?.chords || []).length || 1) / 5));
}

function getLyricLineCount(subsection) {
    return Math.max(1, String(subsection?.lyrics || '').split('\n').length);
}

function normalizeTabData(tabs) {
    const normalized = tabs && typeof tabs === 'object' ? tabs : createTabData();
    normalized.strings = Array.isArray(normalized.strings) && normalized.strings.length ? normalized.strings.slice(0, 6) : [...TAB_STRINGS];
    while (normalized.strings.length < TAB_STRINGS.length) normalized.strings.push(TAB_STRINGS[normalized.strings.length]);
    normalized.columns = Array.isArray(normalized.columns) && normalized.columns.length ? normalized.columns : createTabData().columns;
    while (normalized.columns.length < DEFAULT_TAB_COLUMN_COUNT) normalized.columns.push(createTabColumn());
    normalized.columns = normalized.columns.slice(0, DEFAULT_TAB_COLUMN_COUNT);
    normalized.columns.forEach(column => {
        if (!column.id) column.id = createId('tab');
        column.duration = Number(closestChordBarOption(column.duration || 1));
        column.frets = Array.isArray(column.frets) ? column.frets : [];
        column.frets = TAB_STRINGS.map((_, index) => normalizeTabFret(column.frets[index]));
    });
    return normalized;
}

function isTabsSubsection(section, subsection) {
    return subsection?.type === 'tabs';
}

function cloneSection(section) {
    const copy = JSON.parse(JSON.stringify(section));
    copy.id = createId('section');
    copy.subsections = copy.subsections.map(cloneSubsection);
    return copy;
}

function cloneSubsection(subsection) {
    const copy = JSON.parse(JSON.stringify(subsection));
    copy.id = createId('subsection');
    copy.chords = (copy.chords || []).map(chord => ({
        ...chord,
        id: createId('chord')
    }));
    if (copy.tabs?.columns) {
        copy.tabs.columns = copy.tabs.columns.map(column => ({
            ...column,
            id: createId('tab')
        }));
    }
    return copy;
}

function currentBpm() {
    return clamp(Number(document.getElementById('play-bpm').value) || activeSong()?.bpm || 96, 30, 240);
}

function eventTargetIsEditorControl(event) {
    return Boolean(event.target.closest('input, textarea, select, button, .number-wheel'));
}

function syncStaticNumberWheels() {
    Object.keys(STATIC_NUMBER_WHEELS).forEach(id => {
        const input = document.getElementById(id);
        const wheel = input?.nextElementSibling?.classList.contains('number-wheel') ? input.nextElementSibling : null;
        if (!input || !wheel) return;
        updateNumberWheel(wheel, Number(input.value) || 0);
    });
}
