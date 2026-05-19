function displayChord(chord) {
    if (!chord) return;

    appState.currentChord = chord;

    if (appState.pentatonicMode) {
        const scale = getSelectedPentatonicScale();

        document.getElementById('chord-name').textContent = scale.name;
        renderPentatonicNotation();
        renderFretboard(chord, scale);
        return;
    }

    document.getElementById('chord-name').textContent = chord.name || 'Unknown Chord';
    renderTabNotation(chord);
    renderFretboard(chord);
}

function renderTabNotation(chord) {
    const notation = document.getElementById('fret-notation');
    notation.innerHTML = '';

    getAdjustedPositions(chord).slice().reverse().forEach(value => {
        const note = document.createElement('span');
        note.className = value === 0 ? 'tab-empty' : (value === -1 ? 'tab-dot muted' : 'tab-dot');
        note.textContent = value === -1 ? '✕' : value || '';
        notation.appendChild(note);
    });
}

function renderPentatonicNotation() {
    const notation = document.getElementById('fret-notation');
    notation.innerHTML = '';
}

function renderFretboard(chord, scale = null) {
    const fretboard = document.getElementById('fretboard');
    const instrumentConfig = config.instruments[appState.currentInstrument];
    const stringCount = instrumentConfig.strings;
    const fretCount = appState.visibleFrets;
    const positions = getAdjustedPositions(chord);
    const labelTiles = 1.4;
    const fretTileWidth = 2;
    const topTiles = 3;
    const boardTiles = labelTiles + fretCount * fretTileWidth + 1;

    fretboard.innerHTML = '';
    fretboard.style.setProperty('--fretboard-tiles', boardTiles);

    for (let fret = 0; fret <= fretCount; fret++) {
        const line = document.createElement('span');
        line.className = fret === 0 ? 'fret-line nut' : 'fret-line';
        line.style.left = tilePosition(labelTiles + fret * fretTileWidth);
        fretboard.appendChild(line);
    }

    const endLine = document.createElement('span');
    endLine.className = 'end-line';
    endLine.style.left = tilePosition(labelTiles + fretCount * fretTileWidth - 0.05);
    endLine.setAttribute('role', 'slider');
    endLine.setAttribute('aria-label', 'Visible fret count');
    endLine.setAttribute('aria-valuemin', MIN_VISIBLE_FRETS.toString());
    endLine.setAttribute('aria-valuemax', MAX_VISIBLE_FRETS.toString());
    endLine.setAttribute('aria-valuenow', fretCount.toString());
    fretboard.appendChild(endLine);
    setupEndLineDrag(endLine, fretboard, labelTiles, fretTileWidth);

    const combMarker = document.createElement('span');
    combMarker.className = 'comb-marker';
    combMarker.textContent = 'K';
    combMarker.style.left = tilePosition(labelTiles + fretCount * fretTileWidth - 0.05);
    combMarker.style.top = tilePosition(2);
    fretboard.appendChild(combMarker);
    setupEndLineDrag(combMarker, fretboard, labelTiles, fretTileWidth);
    bindFretboardGroupActive(fretboard, [endLine, combMarker], 'end-active');

    const capo = document.createElement('span');
    capo.className = 'capo-line';
    capo.style.left = tilePosition(capoTilePosition(appState.capoFret, labelTiles, fretTileWidth));
    capo.setAttribute('role', 'slider');
    capo.setAttribute('aria-label', 'Capo fret');
    capo.setAttribute('aria-valuemin', '0');
    capo.setAttribute('aria-valuemax', fretCount.toString());
    capo.setAttribute('aria-valuenow', appState.capoFret.toString());
    fretboard.appendChild(capo);
    setupCapoDrag(capo, fretboard, labelTiles, fretTileWidth, fretCount);
    setupCapoWheel(capo, fretCount);
    const capoControls = [capo];

    instrumentConfig.stringTuning.forEach((note, index) => {
        const stringPosition = stringTileY(index, stringCount, topTiles);
        const stringLine = document.createElement('span');
        stringLine.className = 'string-line';
        stringLine.style.left = tilePosition(labelTiles);
        stringLine.style.top = tilePosition(stringPosition);
        stringLine.style.width = tilePosition(fretCount * fretTileWidth);
        stringLine.style.height = `${1 + (stringCount - 1 - index) * 0.5}px`;
        fretboard.appendChild(stringLine);

        const label = document.createElement('span');
        label.className = 'string-label';
        renderTuningWheel(label, index);
        label.style.left = tilePosition(0);
        label.style.top = tilePosition(stringPosition);
        fretboard.appendChild(label);
        setupTuningWheel(label, index);

        if (index === stringCount - 1) {
            const reset = document.createElement('button');
            reset.className = 'tuning-reset';
            reset.type = 'button';
            reset.textContent = '↺';
            reset.setAttribute('aria-label', 'Reset tuning to EADGBe');
            reset.style.left = tilePosition(0);
            reset.style.top = tilePosition(stringPosition - 2);
            reset.addEventListener('click', resetTuning);
            fretboard.appendChild(reset);
        }
    });

    for (let fret = 1; fret <= fretCount; fret++) {
        const number = document.createElement('span');
        number.className = fret === appState.capoFret ? 'fret-number capo-number' : 'fret-number';
        number.textContent = fret;
        number.style.left = tilePosition(labelTiles + fret * fretTileWidth - 1);
        number.style.top = tilePosition(14);
        fretboard.appendChild(number);

        if (fret === appState.capoFret) {
            setupCapoDrag(number, fretboard, labelTiles, fretTileWidth, fretCount);
            setupCapoWheel(number, fretCount);
            capoControls.push(number);
        }
    }

    if (appState.capoFret === 0) {
        const capoZero = document.createElement('span');
        capoZero.className = 'fret-number capo-number capo-zero';
        capoZero.textContent = '0';
        capoZero.style.left = tilePosition(capoTilePosition(0, labelTiles, fretTileWidth));
        capoZero.style.top = tilePosition(14);
        fretboard.appendChild(capoZero);
        setupCapoDrag(capoZero, fretboard, labelTiles, fretTileWidth, fretCount);
        setupCapoWheel(capoZero, fretCount);
        capoControls.push(capoZero);
    }

    bindFretboardGroupActive(fretboard, capoControls, 'capo-active');

    if (scale) {
        renderPentatonicMarkers(fretboard, instrumentConfig, scale, labelTiles, fretTileWidth, topTiles, fretCount);
        return;
    }

    positions.slice(0, stringCount).forEach((fret, index) => {
        const y = stringTileY(index, stringCount, topTiles);
        const marker = document.createElement('span');

        if (fret === -1) {
            if (appState.capoFret > fretCount) return;

            marker.className = 'mute-marker';
            marker.textContent = '✕';
            marker.style.left = tilePosition(capoTilePosition(appState.capoFret, labelTiles, fretTileWidth));
            marker.style.top = tilePosition(y);
        } else if (fret === 0) {
            return;
        } else {
            const absoluteFret = fret + appState.capoFret;
            if (absoluteFret > fretCount) return;

            marker.className = 'finger-dot';
            marker.textContent = fret;
            marker.style.left = tilePosition(labelTiles + absoluteFret * fretTileWidth - fretTileWidth / 2);
            marker.style.top = tilePosition(y);
        }

        fretboard.appendChild(marker);
    });
}

function bindFretboardGroupActive(fretboard, elements, className) {
    const setActive = () => fretboard.classList.add(className);
    const clearActive = () => fretboard.classList.remove(className);

    elements.forEach(element => {
        element.addEventListener('pointerenter', setActive);
        element.addEventListener('pointerleave', clearActive);
        element.addEventListener('focusin', setActive);
        element.addEventListener('focusout', clearActive);
    });
}

function setupCapoDrag(capo, fretboard, labelTiles, fretTileWidth, fretCount) {
    capo.addEventListener('pointerdown', event => {
        event.preventDefault();

        const moveCapo = moveEvent => {
            const rect = fretboard.getBoundingClientRect();
            const tileSize = getTileSize();
            const rawTiles = (moveEvent.clientX - rect.left) / tileSize;
            const nextFret = nearestCapoFret(rawTiles, labelTiles, fretTileWidth, fretCount);

            if (nextFret !== appState.capoFret) {
                appState.capoFret = nextFret;
                renderSelectorRows();
                displayChord(getSelectedChord());
            }
        };

        const stopDrag = () => {
            window.removeEventListener('pointermove', moveCapo);
            window.removeEventListener('pointerup', stopDrag);
            window.removeEventListener('pointercancel', stopDrag);
        };

        window.addEventListener('pointermove', moveCapo);
        window.addEventListener('pointerup', stopDrag);
        window.addEventListener('pointercancel', stopDrag);
    });
}

function setupCapoWheel(element, fretCount) {
    element.addEventListener('pointerenter', () => {
        setWheelLock({ type: 'capo', max: fretCount });
    });
}

function capoTilePosition(fret, labelTiles, fretTileWidth) {
    if (fret === 0) return labelTiles;

    return labelTiles + fret * fretTileWidth - 1;
}

function nearestCapoFret(rawTiles, labelTiles, fretTileWidth, fretCount) {
    let nearestFret = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (let fret = 0; fret <= fretCount; fret++) {
        const distance = Math.abs(rawTiles - capoTilePosition(fret, labelTiles, fretTileWidth));

        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestFret = fret;
        }
    }

    return nearestFret;
}

function setupEndLineDrag(endLine, fretboard, labelTiles, fretTileWidth) {
    endLine.addEventListener('pointerdown', event => {
        event.preventDefault();

        const moveEndLine = moveEvent => {
            const rect = fretboard.getBoundingClientRect();
            const tileSize = getTileSize();
            const rawTiles = (moveEvent.clientX - rect.left) / tileSize;
            const rawFretCount = (rawTiles - labelTiles) / fretTileWidth;
            const nextFretCount = Math.max(
                MIN_VISIBLE_FRETS,
                Math.min(MAX_VISIBLE_FRETS, Math.round(rawFretCount))
            );

            if (nextFretCount !== appState.visibleFrets) {
                appState.visibleFrets = nextFretCount;
                appState.capoFret = Math.min(appState.capoFret, nextFretCount);
                renderSelectorRows();
                displayChord(getSelectedChord());
            }
        };

        const stopDrag = () => {
            window.removeEventListener('pointermove', moveEndLine);
            window.removeEventListener('pointerup', stopDrag);
            window.removeEventListener('pointercancel', stopDrag);
        };

        window.addEventListener('pointermove', moveEndLine);
        window.addEventListener('pointerup', stopDrag);
        window.addEventListener('pointercancel', stopDrag);
    });

    endLine.addEventListener('pointerenter', () => {
        setWheelLock({ type: 'endLine' });
    });
}

function handleWheelLock(event) {
    if (!appState.wheelLock) return;
    if (event.target.closest?.('#chord-controls')) return;

    if (Date.now() - appState.wheelLock.lastWheelAt > 650) {
        clearWheelLock();
        return;
    }

    event.preventDefault();
    event.stopPropagation();
    appState.wheelLock.lastWheelAt = Date.now();

    if (appState.wheelLock.type === 'capo') {
        moveCapoByWheel(event.deltaY, appState.wheelLock.max);
        return;
    }

    moveEndLineByWheel(event.deltaY);
}

function renderTuningWheel(label, stringIndex) {
    const currentIndex = getOpenStringNoteIndex(stringIndex);
    const previousIndex = normalizeNoteIndex(currentIndex - 1);
    const nextIndex = normalizeNoteIndex(currentIndex + 1);
    const animation = appState.tuningAnimations[stringIndex];

    label.innerHTML = '';
    label.classList.toggle('scroll-up', animation === 'up');
    label.classList.toggle('scroll-down', animation === 'down');
    label.appendChild(createTuningNote('next', formatDisplayNote(nextIndex, stringIndex)));
    label.appendChild(createTuningNote('current', formatDisplayNote(currentIndex, stringIndex)));
    label.appendChild(createTuningNote('previous', formatDisplayNote(previousIndex, stringIndex)));
}

function createTuningNote(position, text) {
    const note = document.createElement('span');
    note.className = `tuning-note ${position}`;
    note.textContent = text;
    return note;
}

function setupTuningWheel(label, stringIndex) {
    label.addEventListener('pointerenter', () => {
        clearWheelLock();
    });
    label.addEventListener('wheel', event => {
        event.preventDefault();
        event.stopPropagation();

        const direction = event.deltaY < 0 ? 1 : -1;
        const nextOffset = Math.max(-12, Math.min(12, appState.stringOffsets[stringIndex] + direction));
        if (nextOffset === appState.stringOffsets[stringIndex]) return;

        appState.stringOffsets[stringIndex] = nextOffset;
        appState.tuningAnimations[stringIndex] = direction > 0 ? 'up' : 'down';
        renderSelectorRows();
        displayChord(getSelectedChord());
        window.setTimeout(() => {
            appState.tuningAnimations[stringIndex] = null;
            displayChord(getSelectedChord());
        }, 180);
    }, { passive: false });
}

function resetTuning() {
    appState.stringOffsets = [0, 0, 0, 0, 0, 0];
    appState.tuningAnimations = [null, null, null, null, null, null];
    renderSelectorRows();
    displayChord(getSelectedChord());
}

function renderPentatonicMarkers(fretboard, instrumentConfig, scale, labelTiles, fretTileWidth, topTiles, fretCount) {
    const scaleNotes = new Set(scale.noteIndexes);

    instrumentConfig.stringTuning.forEach((openNote, stringIndex) => {
        const y = stringTileY(stringIndex, instrumentConfig.strings, topTiles);
        const openNoteIndex = getOpenStringNoteIndex(stringIndex);

        for (let fret = appState.capoFret + 1; fret <= fretCount; fret++) {
            const soundingNote = (openNoteIndex + fret) % HALF_NOTES.length;
            if (!scaleNotes.has(soundingNote)) continue;

            const marker = document.createElement('span');
            marker.className = soundingNote === scale.rootIndex ? 'scale-dot root' : 'scale-dot';
            marker.textContent = soundingNote === scale.rootIndex ? scale.root : '';
            marker.style.left = tilePosition(labelTiles + fret * fretTileWidth - fretTileWidth / 2);
            marker.style.top = tilePosition(y);
            fretboard.appendChild(marker);
        }
    });
}

function getSelectedPentatonicScale() {
    const mode = appState.selection.type === 'minor' || appState.selection.type === 'm7' ? 'minor' : 'major';
    const rootIndex = noteIndex(appState.selection.note);
    const intervals = PENTATONIC_INTERVALS[mode];

    return {
        root: appState.selection.note,
        rootIndex,
        mode,
        name: `${appState.selection.note} ${formatChoice(mode)} Pentatonic`,
        noteIndexes: intervals.map(interval => (rootIndex + interval) % HALF_NOTES.length)
    };
}

