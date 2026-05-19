window.ChordTooltip = (() => {
    let template = null;
    const TOOLTIP_SCALE = 1.2;

    const ready = fetch('../widgets/chord-tooltip/chord-tooltip.html')
        .then(response => (response.ok ? response.text() : ''))
        .then(html => {
            const wrapper = document.createElement('template');
            wrapper.innerHTML = html.trim();
            template = wrapper.content.firstElementChild;
        })
        .catch(() => {
            template = null;
        });

    function create(text) {
        const tooltip = template
            ? template.cloneNode(true)
            : document.createElement('span');
        tooltip.classList.add('chord-tooltip');
        tooltip.role = 'tooltip';
        const title = tooltip.querySelector('.chord-tooltip-title') || tooltip;
        title.textContent = text || '';
        tooltip.hidden = !text;
        return tooltip;
    }

    function attach(anchor, text) {
        if (!anchor) return null;
        anchor.classList.add('chord-tooltip-anchor');
        anchor.setAttribute('aria-label', text || '');
        const tooltip = create(text);
        anchor.appendChild(tooltip);
        const placeTooltip = () => positionTooltip(anchor, tooltip);
        anchor.addEventListener('pointerenter', placeTooltip);
        anchor.addEventListener('focusin', placeTooltip);
        return tooltip;
    }

    function positionTooltip(anchor, tooltip) {
        if (!anchor || !tooltip) return;
        const rect = anchor.getBoundingClientRect();
        const gap = 5;
        const screen = anchor.closest('.song-workspace') || anchor.closest('.songwriter-app') || document.documentElement;
        const screenRect = screen.getBoundingClientRect();

        tooltip.classList.add('positioning');
        tooltip.style.setProperty('--tooltip-left', `${rect.left + rect.width / 2}px`);
        tooltip.classList.remove('above');
        tooltip.style.setProperty('--tooltip-top', `${rect.bottom + gap}px`);

        const scaledTooltipHeight = tooltip.offsetHeight * TOOLTIP_SCALE;
        const wouldOverflowBottom = rect.bottom + gap + scaledTooltipHeight > screenRect.bottom;
        if (wouldOverflowBottom) {
            tooltip.classList.add('above');
            tooltip.style.setProperty('--tooltip-top', `${rect.top - gap}px`);
        }

        tooltip.getBoundingClientRect();
        requestAnimationFrame(() => {
            tooltip.classList.remove('positioning');
        });
    }

    function attachChord(anchor, chord, song) {
        const description = describe(chord, song);
        const tooltip = attach(anchor, description);
        renderFretboard(tooltip?.querySelector('.chord-tooltip-fretboard'), getResolvedChord(chord, song)?.voicing);
        return tooltip;
    }

    function describe(chord, song) {
        const resolved = getResolvedChord(chord, song);
        if (!resolved) return transposeChord(chord.name, song.transpose || 0);

        const typeLabel = formatTypeLabel(resolved.path.type);
        const variantLabel = formatVariantLabel(resolved.variant);
        return `${formatSymbol(resolved.path.note, resolved.path.type)} - ${typeLabel} - ${variantLabel}`;
    }

    function getChordPath(chord) {
        if (chord.note && chord.type) {
            return { note: chord.note, type: chord.type };
        }

        return getChordPathFromName(chord.name);
    }

    function getResolvedChord(chord, song) {
        const sourcePath = getChordPath(chord);
        const displayName = transposeChord(chord.name, song.transpose || 0);
        const displayPath = getChordPathFromName(displayName) || sourcePath;
        if (!displayPath) return null;

        const variant = getSelectedVariant(chord, displayPath.note, displayPath.type);
        return {
            path: displayPath,
            variant,
            voicing: state.chordLibrary?.notes?.[displayPath.note]?.[displayPath.type]?.[variant] || null
        };
    }

    function renderFretboard(board, voicing) {
        if (!board) return;
        board.replaceChildren();

        const positions = getPositions(voicing);
        if (!positions.length) {
            board.hidden = true;
            return;
        }

        board.hidden = false;
        const fretted = positions.filter(fret => fret > 0);
        const minFret = Math.min(...fretted, Number.POSITIVE_INFINITY);
        const maxFret = Math.max(...fretted, 0);
        const startFret = getVisibleStartFret(minFret, maxFret);
        const visibleFrets = Array.from({ length: 6 }, (_, index) => startFret + index);

        const grid = document.createElement('span');
        grid.className = 'chord-tooltip-fret-grid';

        const stringRows = ['e', 'B', 'G', 'D', 'A', 'E']
            .map((stringName, rowIndex) => {
                const stringIndex = positions.length - 1 - rowIndex;
                return { stringName, fret: positions[stringIndex] };
            });

        stringRows.forEach(({ stringName, fret: stringFret }, rowIndex) => {
            const stringWidth = 1 + rowIndex * 0.5;
            const label = document.createElement('span');
            label.className = 'chord-tooltip-string-label';
            label.style.setProperty('--string-weight', String(1 + rowIndex * 0.5));
            label.textContent = stringName;
            grid.appendChild(label);

            visibleFrets.forEach(fret => {
                const cell = document.createElement('span');
                cell.className = 'chord-tooltip-fret-cell';
                cell.style.setProperty('--string-weight', String(1 + rowIndex * 0.5));
                cell.style.setProperty('--string-line-width', `${stringWidth / TOOLTIP_SCALE}px`);
                if (stringFret === fret || (stringFret === -1 && fret === startFret)) {
                    const dot = document.createElement('span');
                    dot.className = 'chord-tooltip-finger-dot';
                    if (stringFret === -1) {
                        dot.classList.add('muted');
                        cell.classList.add('muted-string');
                    }
                    dot.textContent = stringFret === -1 ? 'x' : String(fret);
                    cell.appendChild(dot);
                }
                grid.appendChild(cell);
            });
        });

        const spacer = document.createElement('span');
        spacer.className = 'chord-tooltip-fret-number-spacer';
        grid.appendChild(spacer);

        visibleFrets.forEach(fret => {
            const number = document.createElement('span');
            number.className = 'chord-tooltip-fret-number';
            number.textContent = String(fret);
            grid.appendChild(number);
        });

        board.appendChild(grid);
    }

    function getVisibleStartFret(minFret, maxFret) {
        if (!Number.isFinite(minFret) || maxFret <= 0) return 1;
        if (maxFret <= 6) return 1;
        if (maxFret - minFret <= 5) return minFret;

        return Math.max(1, maxFret - 5);
    }

    function getPositions(voicing) {
        if (Array.isArray(voicing?.positions)) return voicing.positions.slice(0, 6);
        if (typeof voicing?.frets !== 'string') return [];

        return voicing.frets.split('-').slice(0, 6).map(value => {
            const trimmed = value.trim().toLowerCase();
            if (trimmed === 'x') return -1;
            const numeric = Number(trimmed);
            return Number.isFinite(numeric) ? numeric : -1;
        });
    }

    function getChordPathFromName(name) {
        const parsed = parseChordSearchQuery(name);
        if (!parsed.notePrefix) return null;

        const note = state.chordLibrary?.notes?.[parsed.notePrefix] ? parsed.notePrefix : NOTES.find(item => item === parsed.notePrefix);
        if (!note) return null;

        const type = orderedChordTypes(note).find(item => getChordTypeSearchLabels(item).includes(parsed.suffix)) || firstAvailableChordType(note);
        return { note, type };
    }

    function getSelectedVariant(chord, note, type) {
        const voicings = state.chordLibrary?.notes?.[note]?.[type] || {};
        const variants = Object.keys(voicings);
        if (variants.includes(chord.variant)) return chord.variant;
        return variants.find(variant => hasFrettedPosition(voicings[variant])) || variants[0] || '';
    }

    function hasFrettedPosition(voicing) {
        return getPositions(voicing).some(fret => fret > 0);
    }

    function formatSymbol(note, type) {
        if (type === 'major') return note;
        if (type === 'minor') return `${note}m`;
        return `${note}${type}`;
    }

    function formatTypeLabel(type) {
        if (type === 'major') return 'major';
        if (type === 'minor') return 'minor';
        return type;
    }

    function formatVariantLabel(variant) {
        return String(variant || 'default')
            .replace(/^type\s+/i, 'Type ')
            .replace(/\bchord\b/i, 'chord');
    }

    return {
        attach,
        attachChord,
        describe,
        ready
    };
})();
