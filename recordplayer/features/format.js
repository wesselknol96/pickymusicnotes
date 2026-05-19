const SONG_FORMAT_NAME = 'picky-song';
const SONG_FORMAT_VERSION = 1;

function exportActiveSongFormat() {
    const song = activeSong();
    if (!song || !state.editMode) return;

    const payload = {
        format: SONG_FORMAT_NAME,
        version: SONG_FORMAT_VERSION,
        exportedAt: new Date().toISOString(),
        song: stripPortableSongMetadata(song)
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${songFileName(song)}.picky-song.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function openSongImportPicker() {
    if (!state.editMode || !canEditActiveSong()) return;
    const picker = document.getElementById('import-song-file');
    if (!picker) return;
    picker.value = '';
    picker.click();
}

async function importSongFormatFromFile(event) {
    const file = event.target.files?.[0];
    if (!file || !state.editMode || !canEditActiveSong()) return;

    try {
        const text = await file.text();
        const importedSongs = parseSongFormat(text);
        const preparedSongs = importedSongs.reverse().map(song => {
            const normalized = prepareImportedSong(song);
            applyCloudOwner(normalized);
            state.songs.unshift(normalized);
            state.activeSongId = normalized.id;
            state.activeSectionId = normalized.sections[0]?.id || null;
            state.activeSubsectionId = normalized.sections[0]?.subsections[0]?.id || null;
            return normalized;
        });
        if (state.songSource === 'cloud') {
            await Promise.all(preparedSongs.map(persistCloudSong));
        }
        state.editSnapshot = JSON.stringify(state.songs);
        await saveSongs({ immediateJson: true });
        render();
    } catch (error) {
        console.warn('Song import failed.', error);
        window.alert('Could not import that song file.');
    }
}

function parseSongFormat(text) {
    const data = JSON.parse(text);
    const songs = Array.isArray(data?.songs) ? data.songs : [data?.song || data];
    const validSongs = songs.filter(song => song && Array.isArray(song.sections));
    if (!validSongs.length) throw new Error('No compatible songs found.');
    return validSongs;
}

function prepareImportedSong(song) {
    const copy = JSON.parse(JSON.stringify(song));
    delete copy.ownerId;
    delete copy.ownerName;
    delete copy.updatedAt;
    copy.id = createId('song');
    copy.title = copy.title || 'Imported Song';
    copy.artist = copy.artist || 'Artist';
    normalizeSong(copy);
    copy.sections.forEach(section => {
        section.id = createId('section');
        section.subsections.forEach(subsection => {
            subsection.id = createId('subsection');
            subsection.chords = (subsection.chords || []).map(chord => ({
                ...chord,
                id: createId('chord')
            }));
            if (subsection.tabs?.columns) {
                subsection.tabs.columns = subsection.tabs.columns.map(column => ({
                    ...column,
                    id: createId('tab')
                }));
            }
        });
    });
    return copy;
}

function stripPortableSongMetadata(song) {
    const copy = JSON.parse(JSON.stringify(song));
    delete copy.ownerId;
    delete copy.ownerName;
    delete copy.updatedAt;
    return copy;
}

function songFileName(song) {
    const base = `${song.title || 'untitled-song'}-${song.artist || 'artist'}`;
    return base
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'picky-song';
}
