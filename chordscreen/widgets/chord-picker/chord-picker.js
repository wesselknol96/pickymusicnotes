function applyChordName(chordName) {
    const parsed = parseChordName(chordName);
    if (!parsed) return;

    appState.selection.note = parsed.note;
    appState.selection.type = firstAvailableTypeForRequested(parsed.note, parsed.type);
    appState.selection.variant = variantOrFirstAvailable(appState.selection.note, appState.selection.type, appState.selection.variant);
    renderSelectorRows();
    displayChord(getSelectedChord());
}

function parseChordName(chordName) {
    const match = String(chordName || '').trim().match(/^([A-G](?:#)?)(.*)$/);
    if (!match) return null;

    return {
        note: match[1],
        type: chordSuffixToType(match[2].trim())
    };
}

function chordSuffixToType(suffix) {
    const normalized = suffix.toLowerCase();
    if (normalized === 'm' || normalized === 'min' || normalized === 'minor') return 'minor';
    if (normalized === 'maj7') return 'maj7';
    if (normalized === 'm7') return 'm7';
    if (normalized === '7') return '7';
    if (normalized === 'sus2') return 'sus2';
    if (normalized === 'sus4') return 'sus4';
    if (normalized === 'dim') return 'dim';
    if (normalized === 'aug') return 'aug';
    if (normalized === '6') return '6';
    if (normalized === '9') return '9';
    if (normalized === 'add9') return 'add9';
    return 'major';
}

function formatChordSuffix(type) {
    if (type === 'major') return '';
    if (type === 'minor') return 'm';
    return type;
}

function firstAvailableTypeForRequested(note, requestedType) {
    if (hasTypeForPath(note, requestedType)) return requestedType;
    return firstAvailableType(note);
}

function hasTypeForPath(note, type) {
    return Boolean(appState.chordData.notes?.[note]?.[type]);
}

function selectDefaultChord() {
    const defaultPath = getDefaultChordPath();
    if (!defaultPath) return;

    const [note, type, variant] = defaultPath;
    appState.selection.note = note;
    appState.selection.type = type;
    appState.selection.variant = variant;
}

function getDefaultChordPath() {
    const notes = appState.chordData.notes || {};

    if (notes.A?.major?.['open chord']) {
        return ['A', 'major', 'type 1'];
    }

    for (const note of Object.keys(notes)) {
        for (const type of Object.keys(notes[note])) {
            const variants = Object.keys(notes[note][type]);
            if (variants.length > 0) {
                return [note, type, 'type 1'];
            }
        }
    }

    return null;
}

function renderSelectorRows() {
    renderChoiceRow('note', HALF_NOTES, hasNote);
    renderChoiceRow('type', getTypeChoices(), hasType);
    renderChoiceRow('variant', getVariantChoices(), hasVariant);

    document.querySelectorAll('.selector-row').forEach(row => {
        row.classList.toggle('keyboard-row', row.dataset.row === appState.activeRow);
    });
}

function renderChoiceRow(rowName, choices, availabilityCheck) {
    const row = document.getElementById(`${rowName}-row`);
    row.innerHTML = '';

    choices.forEach(choice => {
        const available = availabilityCheck(choice);
        const button = document.createElement('button');
        button.className = 'choice-btn';
        button.type = 'button';
        button.textContent = formatChoice(choice);
        button.dataset.row = rowName;
        button.dataset.value = choice;
        button.tabIndex = rowName === appState.activeRow && choice === appState.selection[rowName] ? 0 : -1;
        button.classList.toggle('active', choice === appState.selection[rowName]);
        button.classList.toggle('unavailable', !available);
        button.setAttribute('aria-pressed', choice === appState.selection[rowName] ? 'true' : 'false');

        if (available) {
            button.addEventListener('click', () => {
                appState.pickerActive = true;
                choose(rowName, choice);
                focusActiveButton();
            });
        }

        row.appendChild(button);
    });
}

function getTypeChoices() {
    return TYPE_ORDER;
}

function getVariantChoices() {
    return VARIANT_SLOTS;
}

function hasNote(note) {
    return Boolean(appState.chordData.notes?.[note]);
}

function hasType(type) {
    return Boolean(appState.chordData.notes?.[appState.selection.note]?.[type]);
}

function hasVariant(variant) {
    const chord = getChordForVariantSlot(appState.selection.note, appState.selection.type, variant);
    return Boolean(chord) && chordFitsNeck(chord);
}

function choose(rowName, value) {
    appState.activeRow = rowName;
    appState.selection[rowName] = value;

    if (rowName === 'note') {
        appState.selection.type = firstAvailableType(value);
        appState.selection.variant = variantOrFirstAvailable(value, appState.selection.type, appState.selection.variant);
    }

    if (rowName === 'type') {
        appState.selection.variant = variantOrFirstAvailable(appState.selection.note, value, appState.selection.variant);
    }

    renderSelectorRows();
    displayChord(getSelectedChord());
}

function firstAvailableType(note) {
    const noteTypes = Object.keys(appState.chordData.notes?.[note] || {});
    return noteTypes.includes(appState.selection.type) ? appState.selection.type : noteTypes[0] || '';
}

function firstAvailableVariant(note, type) {
    return variantOrFirstAvailable(note, type, appState.selection.variant);
}

function variantOrFirstAvailable(note, type, currentVariant) {
    if (hasVariantForPath(note, type, currentVariant)) return currentVariant;

    return VARIANT_SLOTS.find(variant => hasVariantForPath(note, type, variant)) || 'type 1';
}

function handleSelectorKeys(event) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;

    event.preventDefault();
    event.stopPropagation();

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        moveVertical(event.key === 'ArrowDown' ? 1 : -1);
    } else {
        moveHorizontal(event.key === 'ArrowRight' ? 1 : -1);
    }

    renderSelectorRows();
    focusActiveButton();
}

function moveVertical(direction) {
    const currentIndex = ROWS.indexOf(appState.activeRow);
    const nextIndex = Math.max(0, Math.min(ROWS.length - 1, currentIndex + direction));
    appState.activeRow = ROWS[nextIndex];
}

function moveHorizontal(direction) {
    const rowName = appState.activeRow;
    const availableChoices = getAvailableChoices(rowName);
    const currentValue = appState.selection[rowName];
    const currentIndex = Math.max(0, availableChoices.indexOf(currentValue));
    const nextIndex = Math.max(0, Math.min(availableChoices.length - 1, currentIndex + direction));

    if (availableChoices[nextIndex]) {
        choose(rowName, availableChoices[nextIndex]);
    }
}

function getAvailableChoices(rowName) {
    if (rowName === 'note') return HALF_NOTES.filter(hasNote);
    if (rowName === 'type') return getTypeChoices().filter(hasType);
    return getVariantChoices().filter(hasVariant);
}

function focusActiveButton() {
    const selector = `.choice-btn[data-row="${appState.activeRow}"][data-value="${cssEscape(appState.selection[appState.activeRow])}"]`;
    document.querySelector(selector)?.focus();
}

function getSelectedChord() {
    const { note, type, variant } = appState.selection;
    return getChordForVariantSlot(note, type, variant);
}

function getChordForVariantSlot(note, type, variantSlot) {
    const actualVariant = getActualVariantForSlot(note, type, variantSlot);
    if (!actualVariant) return null;
    if (actualVariant.startsWith('generated:')) {
        return getGeneratedVariantMap(note, type)[actualVariant] || null;
    }

    return appState.chordData.notes?.[note]?.[type]?.[actualVariant] || null;
}

function getActualVariantForSlot(note, type, variantSlot) {
    const slotIndex = VARIANT_SLOTS.indexOf(variantSlot);
    if (slotIndex === -1) return '';

    return getOrderedActualVariants(note, type)[slotIndex] || '';
}

function getOrderedActualVariants(note, type) {
    const variantMap = appState.chordData.notes?.[note]?.[type] || {};
    const variants = Object.keys(variantMap);
    const openIndex = variants.indexOf('open chord');
    const openVariant = openIndex === -1 ? [] : ['open chord'];
    const remainingVariants = openIndex === -1
        ? variants
        : variants.filter(variant => variant !== 'open chord');
    const generatedVariants = Object.keys(getGeneratedVariantMap(note, type));
    const orderedByRoot = orderVariantsByRootPosition(note, remainingVariants, variantMap);

    return [...openVariant, ...generatedVariants, ...orderedByRoot];
}

function getGeneratedVariantMap(note, type) {
    const entries = [];
    const generated = {};
    const shapes = getMovableShapes(type);

    if (!shapes) return generated;

    shapes.forEach(shape => {
        getRootFrets(note, shape.rootString).forEach(rootFret => {
            shape.variants.forEach((variant, variantIndex) => {
                const positions = variant.positions(rootFret);
                if (!positions || positions.some(fret => fret < -1 || fret > MAX_VISIBLE_FRETS)) return;

                entries.push({
                    key: `generated:${shape.label}:${rootFret}:${variantIndex}`,
                    rootFret,
                    shapeOrder: shape.rootString,
                    variantOrder: variantIndex,
                    chord: {
                        name: `${note} ${formatChoice(type)} (${shape.label} root fret ${rootFret}, ${variant.label})`,
                        frets: positions.join('-').replaceAll('-1', 'x'),
                        positions,
                        difficulty: rootFret <= 3 ? 'intermediate' : 'hard',
                        generated: true
                    }
                });
            });
        });
    });

    orderGeneratedEntriesByRootPairs(entries).forEach(entry => {
        generated[entry.key] = entry.chord;
    });

    return generated;
}

function orderGeneratedEntriesByRootPairs(entries) {
    const grouped = new Map();

    entries.forEach(entry => {
        const group = grouped.get(entry.rootFret) || [];
        group.push(entry);
        grouped.set(entry.rootFret, group);
    });

    return [...grouped.entries()]
        .sort(([rootFretA], [rootFretB]) => rootFretA - rootFretB)
        .flatMap(([, group]) => group.sort((a, b) => a.variantOrder - b.variantOrder || a.shapeOrder - b.shapeOrder));
}

function makeShape(label, rootString, fullPositions) {
    return {
        label,
        rootString,
        variants: [
            { label: 'full', positions: fullPositions },
            { label: 'trimmed', positions: root => trimOuterStrings(fullPositions(root)) }
        ]
    };
}

function trimOuterStrings(positions) {
    const trimmed = [...positions];
    const playableIndexes = trimmed
        .map((fret, index) => fret >= 0 ? index : -1)
        .filter(index => index !== -1);

    if (playableIndexes.length <= 4) return trimmed;

    trimmed[playableIndexes[playableIndexes.length - 1]] = -1;
    return trimmed;
}

function getMovableShapes(type) {
    const shapeMap = {
        major: [
            makeShape('low E', 0, root => [root, root + 2, root + 2, root + 1, root, root]),
            makeShape('A string', 1, root => [-1, root, root + 2, root + 2, root + 2, root])
        ],
        minor: [
            makeShape('low E', 0, root => [root, root + 2, root + 2, root, root, root]),
            makeShape('A string', 1, root => [-1, root, root + 2, root + 2, root + 1, root])
        ],
        '7': [
            makeShape('low E', 0, root => [root, root + 2, root, root + 1, root, root]),
            makeShape('A string', 1, root => [-1, root, root + 2, root, root + 2, root])
        ],
        maj7: [
            makeShape('low E', 0, root => [root, root + 2, root + 1, root + 1, root, root]),
            makeShape('A string', 1, root => [-1, root, root + 2, root + 1, root + 2, root])
        ],
        m7: [
            makeShape('low E', 0, root => [root, root + 2, root, root, root, root]),
            makeShape('A string', 1, root => [-1, root, root + 2, root, root + 1, root])
        ],
        sus2: [
            makeShape('low E', 0, root => [root, root + 2, root + 4, root + 4, root, root]),
            makeShape('A string', 1, root => [-1, root, root + 2, root + 2, root, root])
        ],
        sus4: [
            makeShape('low E', 0, root => [root, root + 2, root + 2, root + 2, root, root]),
            makeShape('A string', 1, root => [-1, root, root + 2, root + 2, root + 3, root])
        ],
        dim: [
            makeShape('low E', 0, root => [root, root + 1, root + 2, root, root + 2, root]),
            makeShape('A string', 1, root => [-1, root, root + 1, root + 2, root + 1, -1])
        ],
        aug: [
            makeShape('low E', 0, root => [root, root + 3, root + 2, root + 1, root + 1, root]),
            makeShape('A string', 1, root => [-1, root, root + 3, root + 2, root + 2, root + 1])
        ],
        '6': [
            makeShape('low E', 0, root => [root, root + 2, root + 2, root + 1, root + 2, root]),
            makeShape('A string', 1, root => [-1, root, root + 2, root + 2, root + 2, root + 2])
        ],
        '9': [
            makeShape('low E', 0, root => [root, root + 2, root, root + 1, root, root + 2]),
            makeShape('A string', 1, root => [-1, root, root + 2, root, root + 2, root + 2])
        ],
        add9: [
            makeShape('low E', 0, root => [root, root + 2, root + 2, root + 1, root, root + 2]),
            makeShape('A string', 1, root => [-1, root, root + 2, root + 2, root + 2, root + 2])
        ]
    };

    return shapeMap[type] || null;
}

function getRootFrets(note, rootString) {
    const rootIndex = noteIndex(note);
    const stringNoteIndex = noteIndex(config.instruments[appState.currentInstrument].stringTuning[rootString].toUpperCase());
    const firstFret = (rootIndex - stringNoteIndex + HALF_NOTES.length) % HALF_NOTES.length;
    const frets = [];

    for (let fret = firstFret; fret <= MAX_VISIBLE_FRETS; fret += HALF_NOTES.length) {
        frets.push(fret);
    }

    return frets;
}

function orderVariantsByRootPosition(rootNote, variants, variantMap) {
    const grouped = new Map();

    variants.forEach((variant, sourceIndex) => {
        const chord = variantMap[variant];
        const rootPosition = getLowestStringRootPosition(rootNote, chord);
        const group = grouped.get(rootPosition) || [];

        group.push({ variant, sourceIndex });
        grouped.set(rootPosition, group);
    });

    const groups = [...grouped.entries()]
        .sort(([positionA], [positionB]) => positionA - positionB)
        .map(([, group]) => group.sort((a, b) => a.sourceIndex - b.sourceIndex));

    const ordered = [];
    groups.forEach(group => {
        ordered.push(...group.slice(0, 2).map(item => item.variant));
    });
    groups.forEach(group => {
        ordered.push(...group.slice(2).map(item => item.variant));
    });

    return ordered;
}

function getLowestStringRootPosition(rootNote, chord) {
    const instrumentConfig = config.instruments[appState.currentInstrument];
    const rootIndex = noteIndex(rootNote);
    const positions = chord.positions || parseChordNotation(chord.frets);

    for (let stringIndex = 0; stringIndex < instrumentConfig.stringTuning.length; stringIndex++) {
        const fret = positions[stringIndex];
        if (fret < 0 || !Number.isFinite(fret)) continue;

        const openNoteIndex = noteIndex(instrumentConfig.stringTuning[stringIndex].toUpperCase());
        if ((openNoteIndex + fret) % HALF_NOTES.length === rootIndex) {
            return fret;
        }
    }

    return Math.min(...positions.filter(fret => fret > 0), Number.POSITIVE_INFINITY);
}

function hasVariantForPath(note, type, variantSlot) {
    const chord = getChordForVariantSlot(note, type, variantSlot);
    return Boolean(chord) && chordFitsNeck(chord);
}

function chordFitsNeck(chord) {
    const positions = getAdjustedPositions(chord);
    const maxFret = Math.max(...positions.filter(fret => fret > 0), 0);
    return maxFret + appState.capoFret <= appState.visibleFrets;
}

function handleSelectorWheel(event) {
    event.preventDefault();
    const rowName = getWheelSelectorRow(event);

    if (rowName) {
        moveSelectorByWheel(event.deltaY, rowName);
    }
}

function moveCapoByWheel(deltaY, maxFret) {
    const direction = deltaY > 0 ? 1 : -1;
    const nextFret = Math.max(0, Math.min(maxFret, appState.capoFret + direction));

    if (nextFret !== appState.capoFret) {
        appState.capoFret = nextFret;
        renderSelectorRows();
        displayChord(getSelectedChord());
    }
}

function moveEndLineByWheel(deltaY) {
    const direction = deltaY > 0 ? 1 : -1;
    const nextFretCount = Math.max(
        MIN_VISIBLE_FRETS,
        Math.min(MAX_VISIBLE_FRETS, appState.visibleFrets + direction)
    );

    if (nextFretCount !== appState.visibleFrets) {
        appState.visibleFrets = nextFretCount;
        appState.capoFret = Math.min(appState.capoFret, nextFretCount);
        renderSelectorRows();
        displayChord(getSelectedChord());
    }
}

function moveSelectorByWheel(deltaY, rowName) {
    if (!ROWS.includes(rowName)) return;

    const direction = deltaY > 0 ? 1 : -1;
    const choices = getAvailableChoices(rowName);
    if (choices.length === 0) return;

    const currentIndex = Math.max(0, choices.indexOf(appState.selection[rowName]));
    const nextIndex = (currentIndex + direction + choices.length) % choices.length;
    const nextChoice = choices[nextIndex];

    if (nextChoice && nextChoice !== appState.selection[rowName]) {
        appState.pickerActive = true;
        appState.activeRow = rowName;
        choose(rowName, nextChoice);
    }
}

function getWheelSelectorRow(event) {
    const controls = document.getElementById('chord-controls');
    const rect = controls.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const third = rect.height / ROWS.length;
    const rowIndex = Math.max(0, Math.min(ROWS.length - 1, Math.floor(y / third)));

    return ROWS[rowIndex];
}

function setWheelLock(lock) {
    appState.wheelLock = {
        ...lock,
        lastWheelAt: Date.now()
    };
}

function clearWheelLock() {
    appState.wheelLock = null;
}

