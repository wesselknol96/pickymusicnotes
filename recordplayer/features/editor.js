function toggleEditMode() {
    if (state.locked) return;

    if (state.editMode) {
        state.editMode = false;
        state.editSnapshot = null;
        state.activeSubsectionId = null;
        saveSongs();
    } else {
        if (!canEditActiveSong()) {
            state.auth.message = state.songSource === 'cloud'
                ? 'Open personal songs to edit. Online songs are published from your personal version.'
                : '';
            renderAuth();
            return;
        }
        state.editSnapshot = JSON.stringify(state.songs);
        state.editMode = true;
        stopSong();
    }
    notifyEditMode();
    render();
}

function cancelEditMode() {
    if (state.editSnapshot) {
        try {
            state.songs = JSON.parse(state.editSnapshot);
            saveSongs();
        } catch (error) {
            console.warn('Could not restore edit snapshot.', error);
        }
    }

    state.editMode = false;
    state.editSnapshot = null;
    state.insertSectionIndex = null;
    state.activeSubsectionId = null;
    notifyEditMode();
    render();
}

function notifyEditMode() {
    window.parent.postMessage({ type: 'songwriter:editMode', enabled: state.editMode }, '*');
}

function scheduleSectionMenuClose() {
    cancelSectionMenuClose();
    state.sectionMenuTimer = window.setTimeout(() => {
        document.getElementById('section-menu').hidden = true;
    }, 900);
}

function cancelSectionMenuClose() {
    if (!state.sectionMenuTimer) return;
    window.clearTimeout(state.sectionMenuTimer);
    state.sectionMenuTimer = null;
}

function scheduleSubsectionMenuClose(menu) {
    cancelSubsectionMenuClose();
    state.subsectionMenuTimer = window.setTimeout(() => {
        if (menu) menu.hidden = true;
    }, 900);
}

function cancelSubsectionMenuClose() {
    if (!state.subsectionMenuTimer) return;
    window.clearTimeout(state.subsectionMenuTimer);
    state.subsectionMenuTimer = null;
}

function toggleRandomizer() {
    const controls = document.querySelector('.random-chord-controls');
    if (!controls) return;
    controls.hidden = !controls.hidden;
    document.getElementById('random-toggle').classList.toggle('active', !controls.hidden);
}

async function addSong() {
    if (state.songSource !== 'local') {
        state.songSource = 'local';
        state.songs = await loadSongs();
    }
    const song = createSong();
    state.songs.unshift(song);
    state.activeSongId = song.id;
    state.activeSectionId = song.sections[0].id;
    saveSongs();
    render();
}

async function toggleOnlineAvailability(event) {
    const song = activeSong();
    if (!song || state.songSource !== 'local') return;

    if (event.target.checked && !state.auth.user) {
        song.isOnline = false;
        event.target.checked = false;
        state.auth.message = state.auth.client ? 'Log in om deze song online beschikbaar te maken.' : state.auth.message;
        renderAuth();
        openAuthPopup();
        return;
    }

    song.isOnline = event.target.checked;
    markLocalSongOnline(song.id, song.isOnline);
    await setCloudSongOnline(song, song.isOnline);
    await saveSongs({ immediateJson: true });
    render();
}

function openDeleteSongPopup(songId) {
    if (!state.editMode) return;

    const song = state.songs.find(item => item.id === songId);
    if (!song) return;

    state.pendingDeleteSongId = songId;
    document.getElementById('delete-song-title').textContent = `Remove ${song.title || 'Untitled Song'}?`;
    document.getElementById('delete-song-copy').textContent = 'This removes it from your saved cache and the local songs JSON when the local server can write it.';
    document.getElementById('delete-song-popup').hidden = false;
}

function closeDeleteSongPopup() {
    state.pendingDeleteSongId = null;
    document.getElementById('delete-song-popup').hidden = true;
}

async function confirmDeleteSong() {
    const songId = state.pendingDeleteSongId;
    if (!songId) return;

    closeDeleteSongPopup();
    await deleteSong(songId);
}

async function deleteSong(songId) {
    if (!state.editMode) return;

    const songIndex = state.songs.findIndex(song => song.id === songId);
    if (songIndex < 0) return;
    const removedSong = state.songs[songIndex];

    state.songs.splice(songIndex, 1);
    if (!state.songs.length) state.songs.push(createSong());

    const nextSong = state.songs[Math.min(songIndex, state.songs.length - 1)];
    state.activeSongId = nextSong?.id || null;
    state.activeSectionId = nextSong?.sections[0]?.id || null;
    state.activeSubsectionId = nextSong?.sections[0]?.subsections[0]?.id || null;
    state.editSnapshot = JSON.stringify(state.songs);

    stopSong();
    if (removedSong.isOnline) {
        await deleteCloudSong(removedSong);
    }
    if (state.songSource === 'cloud') {
        await deleteCloudSong(removedSong);
    } else {
        await saveSongs({ immediateJson: true });
    }
    render();
}

function addSection(type, index = null) {
    if (!state.editMode) return;
    const song = activeSong();
    if (!song) return;

    const section = createSection(type || 'verse');
    const insertAt = Number.isInteger(index) ? clamp(index, 0, song.sections.length) : song.sections.length;
    song.sections.splice(insertAt, 0, section);
    state.activeSectionId = section.id;
    state.activeSubsectionId = section.subsections[0]?.id || null;
    state.insertSectionIndex = null;
    saveSongs();
    renderEditor();
}

function deleteSection(sectionId) {
    const song = activeSong();
    if (!song || song.sections.length <= 1) return;
    song.sections = song.sections.filter(section => section.id !== sectionId);
    state.activeSectionId = song.sections[0]?.id || null;
    state.activeSubsectionId = song.sections[0]?.subsections[0]?.id || null;
    saveSongs();
    renderEditor();
}

function duplicateSection(sectionId, index = null) {
    if (!state.editMode) return;
    const song = activeSong();
    if (!song) return;

    const section = song.sections.find(item => item.id === sectionId);
    if (!section) return;

    const insertAt = Number.isInteger(index)
        ? clamp(index, 0, song.sections.length)
        : song.sections.findIndex(item => item.id === section.id) + 1;
    const copy = cloneSection(section);
    song.sections.splice(insertAt, 0, copy);
    state.activeSectionId = copy.id;
    state.activeSubsectionId = copy.subsections[0]?.id || null;
    saveSongs();
    renderEditor();
}

function addSubsection(sectionId = state.activeSectionId, index = null, type = 'chords') {
    if (!state.editMode) return;
    const section = activeSong()?.sections.find(item => item.id === sectionId) || activeSection();
    if (!section) return;

    const subsection = createSubsection(type === 'tabs' ? 'tabs' : 'chords');
    const insertAt = Number.isInteger(index) ? clamp(index, 0, section.subsections.length) : section.subsections.length;
    section.subsections.splice(insertAt, 0, subsection);
    state.activeSectionId = section.id;
    state.activeSubsectionId = subsection.id;
    saveSongs();
    renderEditor();
}

function duplicateSubsection(sectionId, subsectionId, index = null) {
    if (!state.editMode) return;
    const section = activeSong()?.sections.find(item => item.id === sectionId) || activeSection();
    if (!section) return;

    const subsection = section.subsections.find(item => item.id === subsectionId);
    if (!subsection) return;

    const insertAt = Number.isInteger(index)
        ? clamp(index, 0, section.subsections.length)
        : section.subsections.findIndex(item => item.id === subsection.id) + 1;
    const copy = cloneSubsection(subsection);
    section.subsections.splice(insertAt, 0, copy);
    state.activeSectionId = section.id;
    state.activeSubsectionId = copy.id;
    saveSongs();
    renderEditor();
}

function deleteSubsection(sectionId = state.activeSectionId, subsectionId = state.activeSubsectionId) {
    if (!state.editMode) return;
    const section = activeSong()?.sections.find(item => item.id === sectionId) || activeSection();
    if (!section || section.subsections.length <= 1) return;

    const targetId = subsectionId || activeSubsection()?.id;
    section.subsections = section.subsections.filter(subsection => subsection.id !== targetId);
    state.activeSectionId = section.id;
    state.activeSubsectionId = section.subsections[0]?.id || null;
    saveSongs();
    renderEditor();
}

function duplicateSelection() {
    if (!state.editMode) return;
    const song = activeSong();
    const section = activeSection();
    if (!song || !section) return;

    const subsection = section.subsections.find(item => item.id === state.activeSubsectionId);
    if (subsection) {
        const index = section.subsections.findIndex(item => item.id === subsection.id);
        const copy = cloneSubsection(subsection);
        section.subsections.splice(index + 1, 0, copy);
        state.activeSubsectionId = copy.id;
    } else {
        const index = song.sections.findIndex(item => item.id === section.id);
        const copy = cloneSection(section);
        song.sections.splice(index + 1, 0, copy);
        state.activeSectionId = copy.id;
        state.activeSubsectionId = copy.subsections[0]?.id || null;
    }

    saveSongs();
    renderEditor();
}

function reorderSection(sourceId, targetId) {
    const song = activeSong();
    if (!song || sourceId === targetId) return;

    const sourceIndex = song.sections.findIndex(section => section.id === sourceId);
    const targetIndex = song.sections.findIndex(section => section.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const [section] = song.sections.splice(sourceIndex, 1);
    song.sections.splice(targetIndex, 0, section);
    state.draggedSectionId = null;
    saveSongs();
    renderEditor();
}

function updateSongMeta() {
    const song = activeSong();
    if (!song) return;

    song.title = document.getElementById('song-title').value;
    song.artist = document.getElementById('song-artist').value;
    saveSongs();
}

function updateSongNumber(event) {
    const song = activeSong();
    if (!song) return;
    if (!canEditActiveSong()) {
        renderEditor();
        return;
    }

    if (event.target.id === 'song-bpm') song.bpm = clamp(Number(event.target.value) || 96, 30, 240);
    if (event.target.id === 'beats-per-bar') song.beatsPerBar = clamp(Number(event.target.value) || 4, 1, 12);
    if (event.target.id === 'transpose') song.transpose = clamp(Number(event.target.value) || 0, -12, 12);
    if (event.target.id === 'capo') song.capo = clamp(Number(event.target.value) || 0, -12, 12);
    if (event.target.id === 'countdown') song.countdown = normalizeCountdown(event.target.value);
    saveSongs();
    renderEditor();
}

function resetPlayBpm() {
    const song = activeSong();
    if (!song) return;
    document.getElementById('play-bpm').value = song.bpm || 96;
    syncStaticNumberWheels();
    saveSongs();
}

function resetTranspose() {
    const song = activeSong();
    if (!song || !canEditActiveSong()) return;
    document.getElementById('transpose').value = 0;
    song.transpose = 0;
    syncStaticNumberWheels();
    saveSongs();
    renderEditor();
}

function resetCapo() {
    const song = activeSong();
    if (!song || !canEditActiveSong()) return;
    document.getElementById('capo').value = 0;
    song.capo = 0;
    syncStaticNumberWheels();
    saveSongs();
    renderEditor();
}

function resetCountdown() {
    const song = activeSong();
    if (!song || !canEditActiveSong()) return;
    document.getElementById('countdown').value = 0;
    song.countdown = 0;
    syncStaticNumberWheels();
    saveSongs();
    renderEditor();
}

function resetMeasure() {
    const song = activeSong();
    if (!song || !canEditActiveSong()) return;
    document.getElementById('beats-per-bar').value = 4;
    song.beatsPerBar = 4;
    syncStaticNumberWheels();
    saveSongs();
    renderEditor();
}

function resetSongBpm() {
    const song = activeSong();
    if (!song || !canEditActiveSong()) return;
    document.getElementById('song-bpm').value = 96;
    document.getElementById('play-bpm').value = 96;
    song.bpm = 96;
    syncStaticNumberWheels();
    saveSongs();
    renderEditor();
}

function reorderSubsection(sectionId, sourceId, targetId) {
    const section = activeSong()?.sections.find(item => item.id === sectionId);
    if (!section || sourceId === targetId) return;

    const sourceIndex = section.subsections.findIndex(subsection => subsection.id === sourceId);
    const targetIndex = section.subsections.findIndex(subsection => subsection.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const [subsection] = section.subsections.splice(sourceIndex, 1);
    section.subsections.splice(targetIndex, 0, subsection);
    state.draggedSubsectionId = null;
    state.draggedSubsectionSectionId = null;
    state.dropTargetSubsectionId = null;
    state.activeSectionId = section.id;
    state.activeSubsectionId = subsection.id;
    saveSongs();
    renderEditor();
}

function isPlaybackDisabled(song = activeSong()) {
    return Boolean(!song || !song.playable);
}

function syncControlAvailability(song = activeSong()) {
    const playbackDisabled = isPlaybackDisabled(song);
    const app = document.getElementById('songwriter-app');
    app.classList.toggle('playback-disabled', playbackDisabled);

    ['play-btn', 'pause-btn', 'stop-btn', 'next-section-btn', 'previous-section-btn'].forEach(id => {
        const control = document.getElementById(id);
        if (control) control.disabled = playbackDisabled;
    });

    ['play-bpm', 'reset-bpm'].forEach(id => {
        const control = document.getElementById(id);
        if (control) control.disabled = !song;
        syncWheelAvailability(id, !song);
    });

    const randomNow = document.getElementById('random-now');
    if (randomNow) randomNow.disabled = Boolean(!song || (!state.editMode && !song.playable));

    const editLocked = !state.editMode;
    ['playable-toggle', 'song-bpm', 'random-playback', 'online-available', 'capo', 'countdown'].forEach(id => {
        const control = document.getElementById(id);
        const disabled = id === 'online-available'
            ? editLocked || state.songSource !== 'local'
            : editLocked;
        if (control) control.disabled = disabled;
        syncWheelAvailability(id, disabled);
    });

    ['reset-capo', 'reset-countdown', 'reset-measure', 'reset-song-bpm'].forEach(id => {
        const control = document.getElementById(id);
        if (control) control.disabled = editLocked;
    });

    const songEditLocked = !canEditActiveSong();
    ['beats-per-bar'].forEach(id => {
        const control = document.getElementById(id);
        if (control) control.disabled = songEditLocked;
        syncWheelAvailability(id, songEditLocked);
    });

    const transposeLocked = !song || state.editMode;
    const transpose = document.getElementById('transpose');
    if (transpose) transpose.disabled = transposeLocked;
    syncWheelAvailability('transpose', transposeLocked);
    const resetTranspose = document.getElementById('reset-transpose');
    if (resetTranspose) resetTranspose.disabled = transposeLocked;
}

function syncWheelAvailability(inputId, disabled) {
    const input = document.getElementById(inputId);
    const wheel = input?.nextElementSibling?.classList.contains('number-wheel') ? input.nextElementSibling : null;
    if (!wheel) return;
    wheel.tabIndex = disabled ? -1 : 0;
    wheel.setAttribute('aria-disabled', disabled ? 'true' : 'false');
}
