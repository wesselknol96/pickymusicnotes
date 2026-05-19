function handleParentMessage(event) {
    if (!event.data || typeof event.data !== 'object') return;

    if (event.data.type === 'picky:lock') {
        state.locked = Boolean(event.data.locked);
        state.compact = state.locked;
        if (state.locked && state.editMode) {
            state.editMode = false;
            state.editSnapshot = null;
            notifyEditMode();
        }
        render();
    }

    if (event.data.type === 'picky:addChord' && state.editMode) {
        addChordToActiveSection(event.data.chord);
    }

    if (event.data.type === 'picky:editAction' && state.editMode) {
        handleExternalEditAction(event.data.action);
    }

    if (event.data.type === 'auth:changed') {
        syncAuthFromStorage();
    }
}

function addChordToActiveSection(chordName) {
    const song = activeSong();
    if (!song) return;
    const section = song.sections.find(item => item.id === state.activeSectionId) || song.sections[0];
    if (!section) return;
    const subsection = section.subsections.find(item => item.id === state.activeSubsectionId) || section.subsections[0];
    if (!subsection) return;

    subsection.chords.push(createChord(chordName || 'G'));
    saveSongs();
    renderEditor();
}

function handleExternalEditAction(action) {
    if (action === 'add-subsection') {
        addSubsection();
        return;
    }

    if (action === 'duplicate-selection') {
        duplicateSelection();
        return;
    }

    if (action === 'remove-subsection') {
        deleteSubsection();
        return;
    }

    if (action === 'remove-section') {
        const section = activeSection();
        if (section) deleteSection(section.id);
    }
}
