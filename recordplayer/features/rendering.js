function render() {
    const app = document.getElementById('songwriter-app');
    if (isPlaybackDisabled(activeSong())) state.showDetailedDurationsDisplay = false;
    app.classList.toggle('editing', state.editMode);
    app.classList.toggle('locked', state.locked);
    app.classList.toggle('compact', state.compact);
    app.classList.toggle('playback-disabled', isPlaybackDisabled(activeSong()));
    app.classList.toggle('hide-edit-detailed-durations', !state.showDetailedDurationsEdit);
    app.classList.toggle('hide-display-detailed-durations', !state.showDetailedDurationsDisplay);
    app.classList.toggle('show-display-section-titles', state.showSectionTitlesDisplay);
    app.classList.toggle('hide-edit-repetitions', !state.showRepetitionsEdit);
    app.classList.toggle('show-display-repetitions', state.showRepetitionsDisplay);
    app.classList.toggle('hide-edit-chord-tabs', !state.showChordTabsEdit);

    document.getElementById('mode-label').textContent = state.editMode ? 'Edit mode' : 'Display mode';
    const editButton = document.getElementById('edit-toggle');
    const editable = canEditActiveSong();
    editButton.classList.toggle('active', state.editMode);
    editButton.setAttribute('aria-pressed', state.editMode ? 'true' : 'false');
    editButton.disabled = state.locked || state.libraryEditMode || (!editable && !state.editMode);
    editButton.textContent = state.editMode ? '\u2713' : '\u270e';
    editButton.setAttribute('aria-label', state.editMode ? 'Save edit' : 'Edit song');
    editButton.title = state.locked
        ? 'Unlock to edit'
        : (state.libraryEditMode ? 'Save or cancel library edits first' : (editable ? (state.editMode ? 'Save song' : 'Edit song') : 'Only the owner can edit this cloud song'));
    document.getElementById('cancel-edit').hidden = !state.editMode;
    document.getElementById('random-toggle')?.classList.toggle('active', !document.querySelector('.random-chord-controls')?.hidden);
    document.getElementById('export-song').disabled = !state.editMode || !activeSong();
    document.getElementById('import-song').disabled = !state.editMode || !canEditActiveSong();
    renderAuth();

    renderLibraryBrowser();
    renderEditor();
}

function renderSongList() {
    renderLibraryBrowser();
}

let lastRenderedEditorSongId = null;

function renderEditor() {
    const song = activeSong();
    const scrollState = captureEditorScrollState(song);
    if (!song) {
        document.getElementById('song-title').value = '';
        document.getElementById('song-artist').value = '';
        document.getElementById('song-meta-display').textContent = state.songSource === 'cloud'
            ? 'No online songs'
            : 'No songs';
        document.getElementById('song-detail-display').textContent = '';
        document.getElementById('sections').replaceChildren();
        syncControlAvailability(null);
        lastRenderedEditorSongId = null;
        return;
    }

    document.getElementById('song-title').value = song.title || '';
    document.getElementById('song-artist').value = song.artist || '';
    document.getElementById('song-meta-display').textContent = `${song.title || 'Song Title'} - ${formatSongAttribution(song)}`.toUpperCase();
    document.getElementById('song-detail-display').textContent = formatSongDetailDisplay(song);
    document.getElementById('song-bpm').value = song.bpm || 96;
    document.getElementById('play-bpm').value = document.getElementById('play-bpm').value || song.bpm || 96;
    document.getElementById('beats-per-bar').value = song.beatsPerBar || 4;
    document.getElementById('capo').value = clamp(song.capo || 0, -12, 12);
    document.getElementById('countdown').value = normalizeCountdown(song.countdown);
    document.getElementById('transpose').value = clamp(song.transpose || 0, -12, 12);
    document.getElementById('playable-toggle').checked = Boolean(song.playable);
    document.getElementById('random-playback').checked = Boolean(song.randomPlayback);
    document.getElementById('online-available').checked = canPublishOnline() && isLocalSongOnline(song);
    document.getElementById('show-detailed-durations-edit').checked = state.showDetailedDurationsEdit;
    const displayDurationToggle = document.getElementById('show-detailed-durations-display');
    displayDurationToggle.checked = state.showDetailedDurationsDisplay;
    displayDurationToggle.disabled = state.editMode || isPlaybackDisabled(song);
    const displaySectionTitlesToggle = document.getElementById('show-section-titles-display');
    displaySectionTitlesToggle.checked = state.showSectionTitlesDisplay;
    displaySectionTitlesToggle.disabled = state.editMode;
    const displayRepetitionsToggle = document.getElementById('show-repetitions-display');
    displayRepetitionsToggle.checked = state.showRepetitionsDisplay;
    displayRepetitionsToggle.disabled = state.editMode;
    document.getElementById('show-repetitions-edit').checked = state.showRepetitionsEdit;
    document.getElementById('show-chord-tabs-edit').checked = state.showChordTabsEdit;
    syncStaticNumberWheels();
    syncControlAvailability(song);

    const sections = document.getElementById('sections');
    const menu = document.getElementById('section-menu');
    if (menu && !document.querySelector('.toolbar-actions > #section-menu')) {
        document.querySelector('.toolbar-actions').appendChild(menu);
        menu.hidden = true;
    }
    sections.replaceChildren();
    sections.appendChild(renderSectionInserter(song, 0));
    song.sections.forEach((section, index) => {
        sections.appendChild(renderSection(section, song));
        sections.appendChild(renderSectionInserter(song, index + 1));
    });
    sections.appendChild(renderSongCredits(song));
    lastRenderedEditorSongId = song.id;
    restoreEditorScrollState(scrollState);
    updateSongScrollBar();
}

function captureEditorScrollState(song) {
    const page = document.getElementById('song-page');
    if (!page || !song || !state.editMode || lastRenderedEditorSongId !== song.id) return null;

    return {
        element: page,
        scrollTop: page.scrollTop,
        scrollLeft: page.scrollLeft
    };
}

function restoreEditorScrollState(scrollState) {
    if (!scrollState) return;

    const restore = () => {
        scrollState.element.scrollTop = scrollState.scrollTop;
        scrollState.element.scrollLeft = scrollState.scrollLeft;
    };

    restore();
    window.requestAnimationFrame(restore);
}

function formatSongAttribution(song) {
    const artist = song?.artist || 'Unknown Artist';
    const ownerName = song?.ownerName?.trim();
    if (!ownerName) return artist;

    const normalizedArtist = artist.trim().toLowerCase();
    const normalizedOwner = ownerName.toLowerCase();
    if (
        normalizedArtist === normalizedOwner
        || normalizedArtist === 'artist'
        || normalizedArtist === 'unknown artist'
    ) {
        return ownerName;
    }

    const ownerSuffix = `by ${ownerName}`;
    return normalizedArtist.includes(normalizedOwner)
        ? artist
        : `${artist} ${ownerSuffix}`;
}

function renderSongCredits(song) {
    const credits = document.createElement('footer');
    credits.className = 'song-credits';
    const maker = song?.ownerName?.trim() || 'unknown maker';
    const writer = song?.writer?.trim() || song?.originalWriter?.trim() || song?.artist?.trim() || 'unknown writer';
    credits.textContent = `Placeholder credits: made by ${maker}. Original author/writer: ${writer}.`;
    return credits;
}

function formatSongDetailDisplay(song) {
    const capo = clamp(Number(song?.capo) || 0, -12, 12);
    const beatsPerBar = clamp(Number(song?.beatsPerBar) || 4, 1, 12);
    const countdown = normalizeCountdown(song?.countdown);
    const bpm = clamp(Number(song?.bpm) || 96, 30, 240);
    return `Capo ${formatOrdinal(capo)}, Countdown ${countdown}, Measure 1/${beatsPerBar}, Original BPM ${bpm}`;
}

function formatOrdinal(value) {
    const number = Math.round(Number(value) || 0);
    if (number === 0) return '0';
    const absNumber = Math.abs(number);
    const teen = absNumber % 100;
    const suffix = teen >= 11 && teen <= 13
        ? 'th'
        : ({ 1: 'st', 2: 'nd', 3: 'rd' }[absNumber % 10] || 'th');
    return `${number}${suffix}`;
}

function renderSectionInserter(song, index) {
    const inserter = document.createElement('div');
    inserter.className = 'section-inserter';
    const previousSection = index > 0 ? song.sections[index - 1] : null;
    const nextSection = song.sections[index] || null;
    const contextualSection = previousSection || nextSection;
    inserter.dataset.sectionType = normalizeSectionType(contextualSection?.type, contextualSection?.title);

    const button = document.createElement('button');
    button.className = 'edit-circle-btn section-insert-btn';
    button.type = 'button';
    button.textContent = '+';
    button.title = 'Add section here';
    button.addEventListener('click', event => {
        event.stopPropagation();
        addSection('verse', index);
    });

    if (previousSection) {
        const duplicate = createDuplicateButton('section-duplicate-btn', 'Duplicate section');
        duplicate.classList.add('duplicate-before-plus');
        duplicate.dataset.sectionType = normalizeSectionType(previousSection.type, previousSection.title);
        duplicate.addEventListener('click', event => {
            event.stopPropagation();
            duplicateSection(previousSection.id, index);
        });
        inserter.appendChild(duplicate);
    }

    if (nextSection) {
        const duplicate = createDuplicateButton('section-duplicate-btn', 'Duplicate section');
        duplicate.classList.add('duplicate-after-plus');
        duplicate.dataset.sectionType = normalizeSectionType(nextSection.type, nextSection.title);
        duplicate.addEventListener('click', event => {
            event.stopPropagation();
            duplicateSection(nextSection.id, index);
        });
        inserter.appendChild(duplicate);
    }

    inserter.appendChild(button);
    return inserter;
}

function renderSection(section, song) {
    const article = document.createElement('section');
    const classes = ['song-section'];
    section.type = normalizeSectionType(section.type, section.title);
    section.title = labelForType(section.type);
    if (section.id === state.activeSectionId) classes.push('active-edit');
    if (section.id === state.dropTargetSectionId) classes.push('drop-before');
    article.className = classes.join(' ');
    article.dataset.sectionId = section.id;
    article.dataset.sectionType = section.type;
    article.draggable = state.editMode;

    article.addEventListener('click', event => {
        if (eventTargetIsEditorControl(event)) return;
        state.activeSectionId = section.id;
        state.activeSubsectionId = null;
        renderEditor();
    });
    article.addEventListener('dragstart', event => {
        if (event.target.closest('.subsection-drag-handle')) return;
        if (!state.editMode || !event.target.closest('.drag-handle')) {
            event.preventDefault();
            return;
        }
        state.draggedSectionId = section.id;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', section.id);
    });
    article.addEventListener('dragover', event => {
        if (!state.editMode || !state.draggedSectionId || state.draggedSubsectionId) return;
        event.preventDefault();
        if (state.dropTargetSectionId !== section.id && state.draggedSectionId !== section.id) {
            state.dropTargetSectionId = section.id;
            renderEditor();
        }
    });
    article.addEventListener('dragleave', event => {
        if (!article.contains(event.relatedTarget)) {
            state.dropTargetSectionId = null;
            renderEditor();
        }
    });
    article.addEventListener('drop', event => {
        event.preventDefault();
        state.dropTargetSectionId = null;
        reorderSection(state.draggedSectionId, section.id);
    });
    article.addEventListener('dragend', () => {
        state.draggedSectionId = null;
        state.dropTargetSectionId = null;
        renderEditor();
    });

    article.appendChild(renderSectionMeters(section, song));
    article.appendChild(renderSectionHead(section));
    article.appendChild(renderSubsectionInserter(section, 0));
    section.subsections.forEach((subsection, index) => {
        article.appendChild(renderSubsection(section, subsection, song));
        article.appendChild(renderSubsectionInserter(section, index + 1));
    });
    return article;
}

function renderSectionMeters(section, song) {
    const meters = document.createElement('aside');
    meters.className = 'section-meters';

    meters.appendChild(renderMeterWheel('BPM', song.bpm || 96, {
        min: 30,
        max: 240,
        onChange: value => {
            song.bpm = value;
            document.getElementById('song-bpm').value = String(value);
            document.getElementById('play-bpm').value = String(value);
            syncStaticNumberWheels();
            saveSongs();
        }
    }));

    meters.appendChild(renderMeterWheel('DUR', section.bars || 4, {
        min: 1,
        max: 64,
        onChange: value => {
            section.bars = value;
            saveSongs();
        }
    }));

    return meters;
}

function renderMeterWheel(label, value, config) {
    const meter = document.createElement('label');
    meter.className = 'section-meter';

    const text = document.createElement('span');
    text.className = 'section-meter-label';
    text.textContent = label;

    const wheel = createNumberWheel({
        value,
        min: config.min,
        max: config.max,
        step: 1,
        format: item => String(item),
        onChange: config.onChange
    });
    wheel.classList.add('section-meter-wheel');
    wheel.addEventListener('click', event => event.stopPropagation());
    wheel.addEventListener('wheel', event => event.stopPropagation());

    meter.append(text, wheel);
    return meter;
}

function renderSectionHead(section) {
    const head = document.createElement('div');
    head.className = 'section-head';

    const handle = createDragHandle('drag-handle', 'Drag section');
    handle.addEventListener('pointerdown', event => startSectionPointerDrag(event, section.id));

    const title = state.editMode ? document.createElement('select') : document.createElement('span');
    title.className = 'section-title';
    section.type = normalizeSectionType(section.type, section.title);
    section.title = labelForType(section.type);

    if (state.editMode) {
        title.setAttribute('aria-label', 'Section title');
        SECTION_TYPES.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = labelForType(type);
            title.appendChild(option);
        });
        title.value = section.type;
        title.addEventListener('change', event => {
            section.type = normalizeSectionType(event.target.value);
            section.title = labelForType(section.type);
            saveSongs();
            renderEditor();
        });
    } else {
        title.textContent = section.title;
    }

    const comment = renderComment(section);

    const bars = createNumberWheel({
        value: section.bars || 4,
        min: 1,
        max: 64,
        step: 1,
        format: value => String(value),
        onChange: value => {
            section.bars = value;
            saveSongs();
        }
    });
    bars.classList.add('section-bars');
    bars.title = 'Section bars';
    bars.addEventListener('click', event => {
        event.stopPropagation();
    });
    bars.addEventListener('wheel', event => {
        event.stopPropagation();
    });

    const remove = document.createElement('button');
    remove.className = 'icon-btn edit-circle-btn delete-section';
    remove.type = 'button';
    remove.title = 'Delete section';
    remove.textContent = '✕';
    remove.addEventListener('click', event => {
        event.stopPropagation();
        deleteSection(section.id);
    });

    head.append(handle, title, comment, bars, remove);
    return head;
}

function renderComment(section) {
    const input = document.createElement('input');
    input.className = 'section-comment';
    input.placeholder = 'Comments';
    input.value = section.comment || '';
    input.addEventListener('input', event => {
        section.comment = event.target.value;
        saveSongs();
    });
    return input;
}

function renderSubsection(section, subsection, song) {
    const wrapper = document.createElement('div');
    const classes = ['subsection'];
    if (isTabsSubsection(section, subsection)) classes.push('tabs-subsection');
    if (subsection.id === state.activeSubsectionId) classes.push('active-edit');
    if (subsection.id === state.dropTargetSubsectionId) classes.push('drop-before');
    wrapper.className = classes.join(' ');
    wrapper.dataset.subsectionId = subsection.id;
    wrapper.draggable = state.editMode;
    wrapper.addEventListener('pointerdown', () => {
        state.activeSectionId = section.id;
        state.activeSubsectionId = subsection.id;
    });
    wrapper.addEventListener('click', event => {
        if (eventTargetIsEditorControl(event)) return;
        state.activeSectionId = section.id;
        state.activeSubsectionId = subsection.id;
        renderEditor();
    });
    wrapper.addEventListener('dragstart', event => {
        if (!state.editMode || !event.target.closest('.subsection-drag-handle')) {
            event.preventDefault();
            return;
        }
        state.draggedSubsectionId = subsection.id;
        state.draggedSubsectionSectionId = section.id;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', subsection.id);
    });
    wrapper.addEventListener('dragover', event => {
        if (!state.editMode || !state.draggedSubsectionId || state.draggedSubsectionSectionId !== section.id) return;
        event.preventDefault();
        if (state.dropTargetSubsectionId !== subsection.id && state.draggedSubsectionId !== subsection.id) {
            state.dropTargetSubsectionId = subsection.id;
            renderEditor();
        }
    });
    wrapper.addEventListener('dragleave', event => {
        if (!wrapper.contains(event.relatedTarget)) {
            state.dropTargetSubsectionId = null;
            renderEditor();
        }
    });
    wrapper.addEventListener('drop', event => {
        if (!state.draggedSubsectionId || state.draggedSubsectionSectionId !== section.id) return;
        event.preventDefault();
        reorderSubsection(section.id, state.draggedSubsectionId, subsection.id);
    });
    wrapper.addEventListener('dragend', () => {
        state.draggedSubsectionId = null;
        state.draggedSubsectionSectionId = null;
        state.dropTargetSubsectionId = null;
        renderEditor();
    });

    wrapper.appendChild(renderSubsectionHandle(section, subsection));

    if (isTabsSubsection(section, subsection)) {
        wrapper.appendChild(renderTabEditor(section, subsection));
    } else {
        wrapper.appendChild(renderChordLine(subsection, song));
    }
    wrapper.appendChild(renderLyrics(subsection));

    const remove = document.createElement('button');
    remove.className = 'edit-circle-btn subsection-delete';
    remove.type = 'button';
    remove.title = 'Remove subsection';
    remove.textContent = '✕';
    remove.addEventListener('click', event => {
        event.stopPropagation();
        deleteSubsection(section.id, subsection.id);
    });
    wrapper.appendChild(remove);
    return wrapper;
}

function createDragHandle(className, title) {
    const handle = document.createElement('span');
    handle.className = className;
    handle.draggable = state.editMode;
    handle.title = title;
    handle.setAttribute('aria-label', title);

    const dots = document.createElement('span');
    dots.className = 'drag-dots';
    for (let index = 0; index < 4; index += 1) {
        dots.appendChild(document.createElement('span'));
    }
    handle.appendChild(dots);
    return handle;
}

function renderSubsectionHandle(section, subsection) {
    const handle = createDragHandle('subsection-drag-handle', 'Drag subsection');
    handle.addEventListener('pointerdown', event => startSubsectionPointerDrag(event, section.id, subsection.id));
    return handle;
}

function createDuplicateButton(className, title) {
    const duplicate = document.createElement('button');
    duplicate.className = `edit-circle-btn ${className}`;
    duplicate.type = 'button';
    duplicate.title = title;
    duplicate.setAttribute('aria-label', title);

    const icon = document.createElement('span');
    icon.className = 'duplicate-icon';
    icon.setAttribute('aria-hidden', 'true');
    duplicate.appendChild(icon);
    return duplicate;
}

function startSectionPointerDrag(event, sectionId) {
    startPointerDrag(event, {
        itemSelector: '.song-section',
        itemId: sectionId,
        setDragging: () => {
            state.draggedSectionId = sectionId;
            state.draggedSubsectionId = null;
        },
        setDropTarget: targetId => {
            state.dropTargetSectionId = targetId;
        },
        clearDropTarget: () => {
            state.dropTargetSectionId = null;
        },
        reorder: targetId => reorderSection(sectionId, targetId),
        cleanup: () => {
            state.draggedSectionId = null;
        }
    });
}

function startSubsectionPointerDrag(event, sectionId, subsectionId) {
    startPointerDrag(event, {
        itemSelector: `.song-section[data-section-id="${sectionId}"] .subsection`,
        itemId: subsectionId,
        setDragging: () => {
            state.draggedSubsectionId = subsectionId;
            state.draggedSubsectionSectionId = sectionId;
            state.draggedSectionId = null;
        },
        setDropTarget: targetId => {
            state.dropTargetSubsectionId = targetId;
        },
        clearDropTarget: () => {
            state.dropTargetSubsectionId = null;
        },
        reorder: targetId => reorderSubsection(sectionId, subsectionId, targetId),
        cleanup: () => {
            state.draggedSubsectionId = null;
            state.draggedSubsectionSectionId = null;
        }
    });
}

function startPointerDrag(event, config) {
    if (!state.editMode || event.button > 0) return;

    event.preventDefault();
    event.stopPropagation();
    config.setDragging();

    const handle = event.currentTarget;
    const origin = handle.closest(config.itemSelector);
    let latestTargetId = null;
    let moved = false;
    handle.setPointerCapture?.(event.pointerId);

    const updateTarget = clientY => {
        const items = [...document.querySelectorAll(config.itemSelector)];
        const target = items.find(item => {
            if (item === origin) return false;
            const rect = item.getBoundingClientRect();
            return clientY >= rect.top && clientY <= rect.bottom;
        });
        latestTargetId = target?.dataset.sectionId || target?.dataset.subsectionId || null;
        config.setDropTarget(latestTargetId);
        items.forEach(item => item.classList.toggle('drop-before', item === target));
    };

    const onPointerMove = moveEvent => {
        if (Math.abs(moveEvent.clientY - event.clientY) < 4) return;
        moved = true;
        updateTarget(moveEvent.clientY);
    };

    const finish = () => {
        handle.releasePointerCapture?.(event.pointerId);
        handle.removeEventListener('pointermove', onPointerMove);
        handle.removeEventListener('pointerup', finish);
        handle.removeEventListener('pointercancel', cancel);

        const targetId = latestTargetId;
        document.querySelectorAll(`${config.itemSelector}.drop-before`).forEach(item => item.classList.remove('drop-before'));
        config.clearDropTarget();
        config.cleanup();
        if (moved && targetId && targetId !== config.itemId) {
            config.reorder(targetId);
        } else {
            renderEditor();
        }
    };

    const cancel = () => {
        handle.releasePointerCapture?.(event.pointerId);
        handle.removeEventListener('pointermove', onPointerMove);
        handle.removeEventListener('pointerup', finish);
        handle.removeEventListener('pointercancel', cancel);
        document.querySelectorAll(`${config.itemSelector}.drop-before`).forEach(item => item.classList.remove('drop-before'));
        config.clearDropTarget();
        config.cleanup();
        renderEditor();
    };

    handle.addEventListener('pointermove', onPointerMove);
    handle.addEventListener('pointerup', finish);
    handle.addEventListener('pointercancel', cancel);
}

function renderSubsectionInserter(section, index) {
    const inserter = document.createElement('div');
    inserter.className = 'subsection-inserter';
    inserter.dataset.sectionType = normalizeSectionType(section.type, section.title);

    const button = document.createElement('button');
    button.className = 'edit-circle-btn subsection-insert-btn';
    button.type = 'button';
    button.textContent = '+';
    button.title = 'Add subsection here';

    const menu = document.createElement('div');
    menu.className = 'subsection-type-menu';
    menu.hidden = true;
    menu.addEventListener('pointerleave', () => scheduleSubsectionMenuClose(menu));
    menu.addEventListener('pointerenter', cancelSubsectionMenuClose);

    [
        { type: 'chords', label: 'Chord subsection' },
        { type: 'tabs', label: 'Tab subsection' }
    ].forEach(item => {
        const option = document.createElement('button');
        option.className = 'panel-btn';
        option.type = 'button';
        option.textContent = item.label;
        option.addEventListener('click', event => {
            event.stopPropagation();
            addSubsection(section.id, index, item.type);
            menu.hidden = true;
        });
        menu.appendChild(option);
    });

    button.addEventListener('click', event => {
        event.stopPropagation();
        menu.hidden = !menu.hidden;
        cancelSubsectionMenuClose();
    });

    const previousSubsection = index > 0 ? section.subsections[index - 1] : null;
    const nextSubsection = section.subsections[index] || null;

    if (previousSubsection) {
        const duplicate = createDuplicateButton('subsection-duplicate-btn', 'Duplicate subsection');
        duplicate.classList.add('duplicate-before-plus');
        duplicate.addEventListener('click', event => {
            event.stopPropagation();
            duplicateSubsection(section.id, previousSubsection.id, index);
        });
        inserter.appendChild(duplicate);
    }

    if (nextSubsection) {
        const duplicate = createDuplicateButton('subsection-duplicate-btn', 'Duplicate subsection');
        duplicate.classList.add('duplicate-after-plus');
        duplicate.addEventListener('click', event => {
            event.stopPropagation();
            duplicateSubsection(section.id, nextSubsection.id, index);
        });
        inserter.appendChild(duplicate);
    }

    inserter.append(button, menu);
    return inserter;
}

function renderChordLine(subsection, song) {
    syncSubsectionRepetitionData(subsection);
    const line = document.createElement('div');
    line.className = 'chord-line';

    for (let rowStart = 0; rowStart < Math.max(1, subsection.chords.length); rowStart += 5) {
        const repetitionIndex = Math.floor(rowStart / 5);
        const isLastChordRow = rowStart + 5 >= Math.max(1, subsection.chords.length);
        const row = document.createElement('span');
        row.className = 'chord-edit-row';
        const rowChords = subsection.chords.slice(rowStart, rowStart + 5);
        const firstAdd = createAddChordButton(subsection, rowStart);
        firstAdd.style.gridColumn = '1';
        row.appendChild(firstAdd);

        rowChords.forEach((chord, rowIndex) => {
            const index = rowStart + rowIndex;
            const chordColumn = String(rowIndex * 2 + 2);
            const nextAddColumn = String(rowIndex * 2 + 3);
            const token = document.createElement('span');
            token.className = 'chord-token';
            token.dataset.chordId = chord.id;
            token.style.setProperty('--chord-column', chordColumn);

            const tab = createChordTabDisplay(chord);
            const name = createChordNameSelector(chord, song, createRemoveChordButton(subsection, index));

            const bars = createOptionWheel({
                className: 'chord-bars',
                value: Number(closestChordBarOption(chord.bars || 1)),
                options: CHORD_BAR_OPTIONS,
                onChange: value => {
                    chord.bars = value;
                    saveSongs();
                }
            });
            bars.title = 'Chord bars';
            bars.addEventListener('click', event => {
                event.stopPropagation();
            });
            bars.addEventListener('wheel', event => {
                event.stopPropagation();
            });

            token.append(tab, name, bars);
            ChordTooltip.attachChord(token, chord, song);
            const nextAdd = createAddChordButton(subsection, index + 1);
            nextAdd.style.gridColumn = nextAddColumn;
            row.append(token, nextAdd);
        });

        if (isLastChordRow) {
            row.appendChild(renderLineRepetitionControl(subsection.chordLineRepetitions[repetitionIndex], value => {
                subsection.chordLineRepetitions[repetitionIndex] = value;
                saveSongs();
            }));
        }
        line.appendChild(row);
    }

    return line;
}

function createChordTabDisplay(chord) {
    const tab = document.createElement('span');
    tab.className = 'chord-tab-display';
    tab.textContent = getChordTabText(chord);
    return tab;
}

function createChordNameSelector(chord, song, removeButton = null) {
    const wrapper = document.createElement('span');
    wrapper.className = 'chord-select';

    const getDisplayChordName = () => state.editMode ? chord.name : transposeChord(chord.name, song.transpose || 0);

    const input = document.createElement('input');
    input.className = 'chord-name';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.value = getDisplayChordName();
    input.size = Math.max(1, input.value.length);

    const variantBadge = document.createElement('sup');
    variantBadge.className = 'chord-variant-badge';
    variantBadge.textContent = String(getChordVariantNumber(chord));

    const menu = document.createElement('div');
    menu.className = 'chord-select-menu';
    menu.hidden = true;

    const syncDisplayValue = () => {
        input.value = document.activeElement === input ? chord.name : getDisplayChordName();
        input.size = Math.max(1, input.value.length);
        variantBadge.textContent = String(getChordVariantNumber(chord));
        updateChordVariantBadgePosition(wrapper, input);
    };

    const openMenu = (query = '') => {
        renderChordSelectMenu(menu, chord, input, query);
        menu.hidden = false;
        wrapper.classList.add('open');
    };

    const closeMenu = () => {
        menu.hidden = true;
        wrapper.classList.remove('open');
        syncDisplayValue();
    };

    input.addEventListener('focus', () => {
        input.value = input.value || chord.name;
        input.select();
        openMenu(input.value);
    });
    input.addEventListener('input', event => {
        input.size = Math.max(1, event.target.value.length);
        updateChordVariantBadgePosition(wrapper, input);
        openMenu(event.target.value);
    });
    input.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            event.preventDefault();
            closeMenu();
            input.blur();
            return;
        }
        if (event.key !== 'Enter') return;

        const firstChoice = getChordNoteChoices(input.value)[0];
        if (!firstChoice) return;
        event.preventDefault();
        chooseChordPath(chord, firstChoice.note, firstChoice.types[0]?.type || firstAvailableChordType(firstChoice.note), firstChoice.types[0]?.variants[0] || '');
        closeMenu();
    });
    input.addEventListener('click', event => {
        event.stopPropagation();
        openMenu(input.value);
    });
    wrapper.addEventListener('focusout', () => {
        window.setTimeout(() => {
            if (!wrapper.contains(document.activeElement)) closeMenu();
        }, 120);
    });
    wrapper.addEventListener('pointerdown', event => event.stopPropagation());
    wrapper.addEventListener('wheel', event => {
        event.preventDefault();
        event.stopPropagation();
    });
    menu.addEventListener('wheel', event => {
        event.preventDefault();
        event.stopPropagation();
    });

    if (removeButton) wrapper.append(input, variantBadge, removeButton, menu);
    else wrapper.append(input, variantBadge, menu);
    window.requestAnimationFrame(() => updateChordVariantBadgePosition(wrapper, input));
    return wrapper;
}

function updateChordVariantBadgePosition(wrapper, input) {
    const context = updateChordVariantBadgePosition.canvasContext
        || (updateChordVariantBadgePosition.canvasContext = document.createElement('canvas').getContext('2d'));
    if (!context) return;

    const style = window.getComputedStyle(input);
    context.font = style.font || `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    wrapper.style.setProperty('--chord-text-width', `${context.measureText(input.value || '').width}px`);
}

function renderChordSelectMenu(menu, chord, input, query) {
    menu.replaceChildren();

    const noteList = document.createElement('div');
    noteList.className = 'chord-select-panel chord-note-panel';
    const typeList = document.createElement('div');
    typeList.className = 'chord-select-panel chord-type-panel';
    const variantList = document.createElement('div');
    variantList.className = 'chord-select-panel chord-variant-panel';

    const choices = getChordNoteChoices(query);
    if (!choices.length) {
        const empty = document.createElement('span');
        empty.className = 'chord-select-empty';
        empty.textContent = 'No chord';
        noteList.appendChild(empty);
        menu.append(noteList);
        return;
    }

    const showVariants = (note, type, variants) => {
        variantList.replaceChildren();
        variants.forEach(variant => {
            const button = createChordSelectButton(formatChordVariantLabel(variant), () => {
                chooseChordPath(chord, note, type, variant);
                input.blur();
            });
            button.classList.toggle('active', variant === getSelectedChordVariant(chord, note, type));
            variantList.appendChild(button);
        });
    };

    const showTypes = choice => {
        typeList.replaceChildren();
        variantList.replaceChildren();
        choice.types.forEach(typeChoice => {
            const button = createChordSelectButton(formatChordSymbol(choice.note, typeChoice.type), () => {
                chooseChordPath(chord, choice.note, typeChoice.type, typeChoice.variants[0]);
                input.blur();
            });
            button.addEventListener('pointerenter', () => showVariants(choice.note, typeChoice.type, typeChoice.variants));
            button.addEventListener('focus', () => showVariants(choice.note, typeChoice.type, typeChoice.variants));
            typeList.appendChild(button);
        });
        if (choice.types[0]) showVariants(choice.note, choice.types[0].type, choice.types[0].variants);
    };

    choices.forEach(choice => {
        const button = createChordSelectButton(choice.note, () => {
            const type = choice.types[0]?.type || firstAvailableChordType(choice.note);
            chooseChordPath(chord, choice.note, type, choice.types[0]?.variants[0] || '');
            input.blur();
        });
        button.addEventListener('pointerenter', () => showTypes(choice));
        button.addEventListener('focus', () => showTypes(choice));
        noteList.appendChild(button);
    });

    showTypes(choices[0]);
    menu.append(noteList, typeList, variantList);
}

function createChordSelectButton(label, onChoose) {
    const button = document.createElement('button');
    button.className = 'chord-select-option';
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        onChoose();
    });
    return button;
}

function getChordNoteChoices(query = '') {
    const notes = state.chordLibrary?.notes || {};
    const chordQuery = parseChordSearchQuery(query);

    return NOTES
        .filter(note => notes[note])
        .filter(note => chordNoteMatchesQuery(note, chordQuery))
        .map(note => ({
            note,
            types: orderedChordTypes(note)
                .map(type => ({ type, variants: Object.keys(notes[note]?.[type] || {}) }))
                .filter(typeChoice => chordTypeMatchesQuery(typeChoice.type, chordQuery))
                .filter(typeChoice => typeChoice.variants.length)
        }))
        .filter(choice => choice.types.length);
}

function parseChordSearchQuery(query = '') {
    const raw = String(query || '').trim();
    const match = raw.match(/^([a-gA-G])(#?)(.*)$/);
    if (!match) {
        return {
            notePrefix: '',
            exactSharp: false,
            suffix: raw.toLowerCase()
        };
    }

    return {
        notePrefix: `${match[1].toUpperCase()}${match[2]}`,
        exactSharp: match[2] === '#',
        suffix: String(match[3] || '').trim().toLowerCase()
    };
}

function chordNoteMatchesQuery(note, query) {
    if (!query.notePrefix) return true;
    if (query.exactSharp) return note === query.notePrefix;
    return note.startsWith(query.notePrefix);
}

function chordTypeMatchesQuery(type, query) {
    if (!query.suffix) return true;
    return getChordTypeSearchLabels(type).some(label => label.startsWith(query.suffix));
}

function getChordTypeSearchLabels(type) {
    const symbol = formatChordSymbol('', type).toLowerCase();
    const labels = [type.toLowerCase(), symbol];
    if (type === 'major') labels.push('', 'maj');
    if (type === 'minor') labels.push('m', 'min');
    return [...new Set(labels)];
}

function orderedChordTypes(note) {
    const availableTypes = Object.keys(state.chordLibrary?.notes?.[note] || {});
    const ordered = CHORD_TYPE_ORDER.filter(type => availableTypes.includes(type));
    return [...ordered, ...availableTypes.filter(type => !ordered.includes(type)).sort()];
}

function firstAvailableChordType(note) {
    return orderedChordTypes(note)[0] || 'major';
}

function chooseChordPath(chord, note, type, variant) {
    chord.name = formatChordSymbol(note, type);
    chord.note = note;
    chord.type = type;
    chord.variant = variant || Object.keys(state.chordLibrary?.notes?.[note]?.[type] || {})[0] || '';
    saveSongs();
    renderEditor();
}

function getChordVariantNumber(chord) {
    const path = getChordPathFromChord(chord);
    if (!path) return 1;

    const variants = Object.keys(state.chordLibrary?.notes?.[path.note]?.[path.type] || {});
    const variant = getSelectedChordVariant(chord, path.note, path.type);
    return Math.max(1, variants.indexOf(variant) + 1);
}

function getChordTabText(chord) {
    const path = getChordPathFromChord(chord);
    if (!path) return '';

    const variant = getSelectedChordVariant(chord, path.note, path.type);
    const voicing = state.chordLibrary?.notes?.[path.note]?.[path.type]?.[variant];
    if (typeof voicing?.frets === 'string') return voicing.frets;
    if (Array.isArray(voicing?.positions)) {
        return voicing.positions
            .slice(0, 6)
            .map(value => Number(value) < 0 ? 'x' : String(value))
            .join('-');
    }
    return '';
}

function getSelectedChordVariant(chord, note, type) {
    const variants = Object.keys(state.chordLibrary?.notes?.[note]?.[type] || {});
    if (variants.includes(chord.variant)) return chord.variant;
    return variants[0] || '';
}

function getChordPathFromChord(chord) {
    if (chord.note && chord.type) {
        return { note: chord.note, type: chord.type };
    }

    return getChordPathFromName(chord.name);
}

function getChordPathFromName(name) {
    const parsed = parseChordSearchQuery(name);
    if (!parsed.notePrefix) return null;

    const note = state.chordLibrary?.notes?.[parsed.notePrefix] ? parsed.notePrefix : NOTES.find(item => item === parsed.notePrefix);
    if (!note) return null;

    const type = orderedChordTypes(note).find(item => getChordTypeSearchLabels(item).includes(parsed.suffix)) || firstAvailableChordType(note);
    return { note, type };
}

function formatChordSymbol(note, type) {
    if (type === 'major') return note;
    if (type === 'minor') return `${note}m`;
    return `${note}${type}`;
}

function formatChordVariantLabel(variant) {
    return String(variant || 'default')
        .replace(/^type\s+/i, 'Type ')
        .replace(/\bchord\b/i, 'chord');
}

function createAddChordButton(subsection, index) {
    const add = document.createElement('button');
    add.className = 'icon-btn add-chord';
    add.type = 'button';
    add.title = 'Add chord';
    add.textContent = '+';
    add.addEventListener('click', event => {
        event.stopPropagation();
        subsection.chords.splice(index, 0, createChord('G'));
        syncSubsectionRepetitionData(subsection);
        saveSongs();
        renderEditor();
    });
    return add;
}

function createRemoveChordButton(subsection, index) {
    const remove = document.createElement('button');
    remove.className = 'icon-btn remove-chord';
    remove.type = 'button';
    remove.title = 'Remove chord';
    remove.setAttribute('aria-label', 'Remove chord');
    remove.textContent = '✕';
    remove.addEventListener('click', event => {
        event.stopPropagation();
        subsection.chords.splice(index, 1);
        syncSubsectionRepetitionData(subsection);
        saveSongs();
        renderEditor();
    });
    return remove;
}

function renderLyrics(subsection) {
    syncSubsectionRepetitionData(subsection);
    const wrapper = document.createElement('div');
    wrapper.className = 'lyrics-lines';
    const lines = getLyricLines(subsection);
    if (!lines.length) lines.push('');

    lines.forEach((line, index) => {
        wrapper.appendChild(createLyricRow(subsection, line, index));
    });

    return wrapper;
}

function createLyricRow(subsection, line, index) {
    const row = document.createElement('div');
    row.className = 'lyric-row';

    const input = state.editMode ? document.createElement('input') : document.createElement('span');
    input.className = 'lyrics-line';
    if (state.editMode) {
        input.placeholder = 'Lyrics';
        input.value = line;
        input.addEventListener('input', () => {
            const lines = getLyricLinesFromDom(input.closest('.lyrics-lines'));
            subsection.lyrics = lines.join('\n');
            saveSongs();
        });
    } else {
        input.textContent = line;
    }

    const add = document.createElement('button');
    add.className = 'icon-btn lyric-line-add';
    add.type = 'button';
    add.title = 'Add lyric line';
    add.setAttribute('aria-label', 'Add lyric line');
    add.textContent = '+';
    add.addEventListener('click', event => {
        event.stopPropagation();
        const lines = getLyricLines(subsection);
        lines.splice(index + 1, 0, '');
        subsection.lyrics = lines.join('\n');
        subsection.lyricLineDurations.splice(index + 1, 0, 1);
        subsection.lyricLineRepetitions.splice(index + 1, 0, 1);
        syncSubsectionRepetitionData(subsection);
        saveSongs();
        renderEditor();
    });

    const remove = document.createElement('button');
    remove.className = 'icon-btn lyric-line-delete';
    remove.type = 'button';
    remove.title = 'Remove lyric line';
    remove.setAttribute('aria-label', 'Remove lyric line');
    remove.textContent = '✕';
    remove.addEventListener('click', event => {
        event.stopPropagation();
        const lines = getLyricLines(subsection);
        if (lines.length <= 1) {
            lines[0] = '';
            subsection.lyricLineDurations = [1];
            subsection.lyricLineRepetitions = [1];
        } else {
            lines.splice(index, 1);
            subsection.lyricLineDurations.splice(index, 1);
            subsection.lyricLineRepetitions.splice(index, 1);
        }
        subsection.lyrics = lines.join('\n');
        syncSubsectionRepetitionData(subsection);
        saveSongs();
        renderEditor();
    });

    const repetitionValue = state.editMode || String(line || '').trim()
        ? subsection.lyricLineRepetitions[index]
        : 1;
    const repetition = renderLineRepetitionControl(repetitionValue, value => {
        subsection.lyricLineRepetitions[index] = value;
        saveSongs();
    });

    if (state.editMode) {
        const duration = renderLyricDurationControl(subsection.lyricLineDurations[index], value => {
            subsection.lyricLineDurations[index] = value;
            saveSongs();
        });
        row.append(duration);
    }
    row.append(input, add, remove, repetition);
    return row;
}

function getLyricLines(subsection) {
    const lines = String(subsection.lyrics || '').split('\n');
    return lines.length ? lines : [''];
}

function getLyricLinesFromDom(wrapper) {
    return [...(wrapper?.querySelectorAll('.lyrics-line') || [])].map(field => field.value);
}

function renderLyricDurationControl(value, onChange) {
    const wheel = createOptionWheel({
        className: 'lyric-duration-wheel',
        value: Number(closestChordBarOption(value || 1)),
        options: CHORD_BAR_OPTIONS,
        onChange
    });
    wheel.title = 'Lyric timing';
    wheel.setAttribute('aria-label', 'Lyric timing');
    wheel.addEventListener('click', event => event.stopPropagation());
    wheel.addEventListener('wheel', event => event.stopPropagation());
    return wheel;
}

function renderLineRepetitionControl(value, onChange) {
    const normalized = normalizeLineRepetition(value);
    if (!state.editMode) return renderLineRepetitionMarker(normalized);

    const wheel = createNumberWheel({
        value: normalized,
        min: LINE_REPETITION_MIN,
        max: LINE_REPETITION_MAX,
        step: 1,
        format: item => `x${item}`,
        onChange
    });
    wheel.classList.add('line-repetition-wheel');
    wheel.title = 'Line repetitions';
    wheel.setAttribute('aria-label', 'Line repetitions');
    wheel.addEventListener('click', event => event.stopPropagation());
    wheel.addEventListener('wheel', event => event.stopPropagation());
    return wheel;
}

function renderLineRepetitionMarker(value) {
    const marker = document.createElement('span');
    marker.className = 'line-repetition-marker';
    marker.textContent = value > 1 ? `x${value}` : '';
    return marker;
}

function renderTabEditor(section, subsection) {
    syncSubsectionRepetitionData(subsection);
    subsection.tabs = normalizeTabData(subsection.tabs);

    const wrapper = document.createElement('div');
    wrapper.className = 'tab-editor';

    const rail = document.createElement('div');
    rail.className = 'tab-rail';
    rail.addEventListener('keydown', event => handleTabRailKeydown(event, section, subsection, rail));

    const strings = document.createElement('div');
    strings.className = 'tab-strings';
    subsection.tabs.strings.forEach(label => {
        const stringLabel = document.createElement('span');
        stringLabel.className = 'tab-string-label';
        stringLabel.textContent = label;
        strings.appendChild(stringLabel);
    });

    const grid = document.createElement('div');
    grid.className = 'tab-grid';
    grid.style.setProperty('--tab-columns', String(subsection.tabs.columns.length));
    wrapper.style.setProperty('--tab-columns', String(subsection.tabs.columns.length));
    wrapper.style.setProperty('--tab-grid-display-width', `calc(var(--tile) * ${subsection.tabs.columns.length * 0.72})`);

    subsection.tabs.columns.forEach((column, columnIndex) => {
        const stack = document.createElement('div');
        stack.className = `tab-column${isTabSpacerColumn(columnIndex) ? ' tab-spacer-column' : ' tab-value-column'}`;

        const spacerTop = document.createElement('span');
        spacerTop.className = 'tab-column-duration-spacer';
        stack.appendChild(spacerTop);

        if (!isTabSpacerColumn(columnIndex)) {
            stack.appendChild(renderTabDurationWheel(column, section, subsection));
        }

        const resetColumn = document.createElement('button');
        resetColumn.className = 'tab-column-reset';
        resetColumn.type = 'button';
        resetColumn.title = 'Clear tab column';
        resetColumn.setAttribute('aria-label', 'Clear tab column');
        resetColumn.textContent = '↺';
        resetColumn.addEventListener('click', event => {
            event.stopPropagation();
            column.frets = column.frets.map(() => 0);
            saveSongs();
            renderEditor();
        });

        column.frets.forEach((fret, stringIndex) => {
            stack.appendChild(renderTabCell(section, subsection, column, columnIndex, stringIndex, fret));
        });
        stack.appendChild(isTabSpacerColumn(columnIndex) ? document.createElement('span') : resetColumn);
        grid.appendChild(stack);
    });

    rail.append(strings, grid);
    wrapper.appendChild(rail);
    if (state.editMode) {
        wrapper.appendChild(renderTabRepetitionControl(subsection));
    } else {
        const marker = renderLineRepetitionMarker(subsection.tabRepetitions);
        marker.classList.add('tab-repetition-marker');
        wrapper.appendChild(marker);
    }
    return wrapper;
}

function renderTabRepetitionControl(subsection) {
    const wheel = renderLineRepetitionControl(subsection.tabRepetitions, value => {
        subsection.tabRepetitions = value;
        saveSongs();
    });
    wheel.classList.add('tab-repetition-wheel');
    wheel.title = 'Tab repetitions';
    wheel.setAttribute('aria-label', 'Tab repetitions');
    return wheel;
}

function renderTabDurationWheel(column, section, subsection) {
    const wheel = createOptionWheel({
        className: 'tab-duration-wheel',
        value: Number(closestChordBarOption(column.duration || 1)),
        options: CHORD_BAR_OPTIONS,
        onChange: value => {
            state.activeSectionId = section.id;
            state.activeSubsectionId = subsection.id;
            column.duration = value;
            saveSongs();
        }
    });
    wheel.title = 'Tab duration';
    wheel.addEventListener('click', event => event.stopPropagation());
    wheel.addEventListener('wheel', event => event.stopPropagation());
    return wheel;
}

function renderTabCell(section, subsection, column, columnIndex, stringIndex, fret) {
    const cell = document.createElement('div');
    cell.className = 'tab-cell';

    if (isTabSpacerColumn(columnIndex)) {
        const spacer = document.createElement('span');
        spacer.className = 'tab-spacer-dash';
        cell.appendChild(spacer);
        return cell;
    }

    const wheel = createOptionWheel({
        className: 'tab-fret-wheel',
        value: Number(normalizeTabFret(fret)),
        options: TAB_FRET_OPTIONS,
        onChange: value => {
            const normalized = normalizeTabFret(value);
            column.frets[stringIndex] = normalized;
            wheel.classList.toggle('muted-tab-fret', normalized === 0);
            saveSongs();
        }
    });
    wheel.classList.toggle('muted-tab-fret', normalizeTabFret(fret) === 0);
    wheel.dataset.columnIndex = String(columnIndex);
    wheel.dataset.stringIndex = String(stringIndex);
    wheel.title = 'Tab fret';
    wheel.addEventListener('click', event => {
        event.stopPropagation();
    });
    wheel.addEventListener('wheel', event => {
        event.stopPropagation();
    });
    wheel.addEventListener('keydown', event => handleTabCellInput(event, section, subsection, columnIndex, stringIndex), true);
    cell.appendChild(wheel);
    return cell;
}

function handleTabCellInput(event, section, subsection, columnIndex, stringIndex) {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
        event.stopPropagation();
        const horizontalStep = event.key === 'ArrowRight' ? 2 : event.key === 'ArrowLeft' ? -2 : 0;
        const nextColumn = normalizeEditableTabColumn(columnIndex + horizontalStep, subsection.tabs.columns.length);
        const nextString = clamp(stringIndex + (event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0), 0, TAB_STRINGS.length - 1);
        focusTabCell(nextColumn, nextString, event.currentTarget.closest('.tab-rail'));
        return;
    }

    if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        event.stopPropagation();
        setTabFret(section, subsection, columnIndex, stringIndex, 0, false);
        updateNumberWheel(event.currentTarget, 0);
        event.currentTarget.classList.add('muted-tab-fret');
        return;
    }

    if (event.key.toLowerCase() === 'x') {
        event.preventDefault();
        event.stopPropagation();
        setTabFret(section, subsection, columnIndex, stringIndex, -1, false);
        updateNumberWheel(event.currentTarget, -1);
        event.currentTarget.classList.remove('muted-tab-fret');
        focusTabCell(columnIndex + 2, stringIndex, event.currentTarget.closest('.tab-rail'));
        return;
    }

    if (event.key === '/') {
        event.preventDefault();
        event.stopPropagation();
        setTabFret(section, subsection, columnIndex, stringIndex, -2, false);
        updateNumberWheel(event.currentTarget, -2);
        event.currentTarget.classList.remove('muted-tab-fret');
        focusTabCell(columnIndex + 2, stringIndex, event.currentTarget.closest('.tab-rail'));
        return;
    }

    if (event.key.toLowerCase() === 'r') {
        event.preventDefault();
        event.stopPropagation();
        setTabFret(section, subsection, columnIndex, stringIndex, -3, false);
        updateNumberWheel(event.currentTarget, -3);
        event.currentTarget.classList.remove('muted-tab-fret');
        focusTabCell(columnIndex + 2, stringIndex, event.currentTarget.closest('.tab-rail'));
        return;
    }

    if (event.key === '~') {
        event.preventDefault();
        event.stopPropagation();
        setTabFret(section, subsection, columnIndex, stringIndex, -4, false);
        updateNumberWheel(event.currentTarget, -4);
        event.currentTarget.classList.remove('muted-tab-fret');
        focusTabCell(columnIndex + 2, stringIndex, event.currentTarget.closest('.tab-rail'));
        return;
    }

    if (/^\d$/.test(event.key)) {
        event.preventDefault();
        event.stopPropagation();
        const next = Number(event.key);
        if (next === 0) {
            setTabFret(section, subsection, columnIndex, stringIndex, 0, false);
            updateNumberWheel(event.currentTarget, 0);
            event.currentTarget.classList.add('muted-tab-fret');
            return;
        }
        setTabFret(section, subsection, columnIndex, stringIndex, clamp(next, 1, 24), false);
        updateNumberWheel(event.currentTarget, normalizeTabFret(next));
        event.currentTarget.classList.remove('muted-tab-fret');
    }
}

function handleTabRailKeydown(event, section, subsection, rail) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    const target = event.target.closest('[data-column-index][data-string-index]');
    if (!target) return;

    event.preventDefault();
    event.stopPropagation();

    const columnIndex = Number(target.dataset.columnIndex);
    const stringIndex = Number(target.dataset.stringIndex);
    const horizontalStep = event.key === 'ArrowRight' ? 2 : event.key === 'ArrowLeft' ? -2 : 0;
    const nextColumn = normalizeEditableTabColumn(columnIndex + horizontalStep, subsection.tabs.columns.length);
    const nextString = clamp(stringIndex + (event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0), 0, TAB_STRINGS.length - 1);
    focusTabCell(nextColumn, nextString, rail);
}

function isTabSpacerColumn(columnIndex) {
    return columnIndex % 2 === 0;
}

function normalizeEditableTabColumn(columnIndex, columnCount) {
    const clamped = clamp(columnIndex, 0, columnCount - 1);
    if (!isTabSpacerColumn(clamped)) return clamped;
    return clamp(clamped + (clamped <= 0 ? 1 : -1), 0, columnCount - 1);
}

function focusTabCell(columnIndex, stringIndex, root = document) {
    const next = root.querySelector(`[data-column-index="${columnIndex}"][data-string-index="${stringIndex}"]`);
    next?.focus();
}

function setTabFret(section, subsection, columnIndex, stringIndex, value, rerender = true) {
    state.activeSectionId = section.id;
    state.activeSubsectionId = subsection.id;
    subsection.tabs = normalizeTabData(subsection.tabs);
    subsection.tabs.columns[columnIndex].frets[stringIndex] = normalizeTabFret(value);
    saveSongs();
    if (rerender) renderEditor();
}
