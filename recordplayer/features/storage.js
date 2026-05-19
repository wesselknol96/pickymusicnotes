async function loadSongs() {
    if (state.songSource === 'cloud') {
        return loadCloudSongs();
    }

    if (state.auth.client && state.auth.user) {
        return loadPersonalSongs();
    }

    return loadLocalSongs();
}

async function loadLocalSongs() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length) return parsed.map(song => {
                normalizeSong(song);
                song.isOnline = isLocalSongOnline(song);
                return song;
            });
        } catch (error) {
            console.warn('Could not read local songwriter storage.', error);
        }
    }

    try {
        const response = await fetch('../data/songs.json');
        if (!response.ok) throw new Error(`Song seed failed: ${response.status}`);
        const data = await response.json();
        return Array.isArray(data.songs) && data.songs.length ? data.songs.map(normalizeSong) : [createSong()];
    } catch (error) {
        console.warn('Using blank songwriter seed.', error);
        return [createSong()];
    }
}

function loadUiSettings() {
    const stored = localStorage.getItem(UI_SETTINGS_KEY);
    if (!stored) return;

    try {
        const parsed = JSON.parse(stored);
        if (typeof parsed.showDetailedDurationsEdit === 'boolean') {
            state.showDetailedDurationsEdit = parsed.showDetailedDurationsEdit;
        }
        if (typeof parsed.showDetailedDurationsDisplay === 'boolean') {
            state.showDetailedDurationsDisplay = parsed.showDetailedDurationsDisplay;
        }
        if (typeof parsed.showSectionTitlesDisplay === 'boolean') {
            state.showSectionTitlesDisplay = parsed.showSectionTitlesDisplay;
        }
        if (typeof parsed.showRepetitionsEdit === 'boolean') {
            state.showRepetitionsEdit = parsed.showRepetitionsEdit;
        }
        if (typeof parsed.showRepetitionsDisplay === 'boolean') {
            state.showRepetitionsDisplay = parsed.showRepetitionsDisplay;
        }
        if (typeof parsed.showChordTabsEdit === 'boolean') {
            state.showChordTabsEdit = parsed.showChordTabsEdit;
        }
    } catch (error) {
        console.warn('Could not read local songwriter UI settings.', error);
    }
}

function saveUiSettings() {
    localStorage.setItem(UI_SETTINGS_KEY, JSON.stringify({
        showDetailedDurationsEdit: state.showDetailedDurationsEdit,
        showDetailedDurationsDisplay: state.showDetailedDurationsDisplay,
        showSectionTitlesDisplay: state.showSectionTitlesDisplay,
        showRepetitionsEdit: state.showRepetitionsEdit,
        showRepetitionsDisplay: state.showRepetitionsDisplay,
        showChordTabsEdit: state.showChordTabsEdit
    }));
}

function saveSongs(options = {}) {
    const storageKey = state.songSource === 'cloud' ? CLOUD_CACHE_KEY : STORAGE_KEY;
    localStorage.setItem(storageKey, JSON.stringify(state.songs));

    if (state.songSource === 'cloud') {
        return Promise.resolve();
    }

    const accountSong = activeSong();
    if (accountSong && state.auth.user) {
        if (state.cloudSaveTimer) window.clearTimeout(state.cloudSaveTimer);
        state.cloudSaveTimer = window.setTimeout(() => persistCloudSong(accountSong), 700);
    }

    if (options.immediateJson) {
        if (state.cloudSaveTimer) {
            window.clearTimeout(state.cloudSaveTimer);
            state.cloudSaveTimer = null;
        }
        if (state.saveTimer) {
            window.clearTimeout(state.saveTimer);
            state.saveTimer = null;
        }
        return Promise.all([
            accountSong && state.auth.user ? persistCloudSong(accountSong) : Promise.resolve(),
            persistSongsJson()
        ]);
    }

    if (state.saveTimer) window.clearTimeout(state.saveTimer);
    state.saveTimer = window.setTimeout(persistSongsJson, 700);
    return Promise.resolve();
}

async function persistSongsJson() {
    try {
        const response = await fetch('/api/songs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ songs: state.songs })
        });
        if (!response.ok) throw new Error(`Song JSON save failed: ${response.status}`);
    } catch (error) {
        console.warn('Saved to local cache only. Local JSON writing is unavailable here.', error);
    }
}
