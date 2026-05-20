function setupEvents() {
    setupLeftMenuScroll();
    setupSongScrollBar();
    document.getElementById('edit-toggle').addEventListener('click', toggleEditMode);
    document.getElementById('cancel-edit').addEventListener('click', cancelEditMode);
    document.getElementById('account-open')?.addEventListener('click', openAuthPopup);
    document.getElementById('account-out')?.addEventListener('click', signOut);
    document.getElementById('auth-close').addEventListener('click', closeAuthPopup);
    document.getElementById('auth-popup').addEventListener('click', event => {
        if (event.target.id === 'auth-popup') closeAuthPopup();
    });
    document.getElementById('auth-form').addEventListener('click', event => {
        event.stopPropagation();
    });
    document.getElementById('auth-form').addEventListener('pointerdown', event => {
        event.stopPropagation();
    });
    document.getElementById('auth-form').addEventListener('submit', event => {
        event.preventDefault();
        signIn();
    });
    document.getElementById('auth-password-toggle').addEventListener('click', () => {
        togglePassword('auth-password', 'auth-password-toggle');
    });
    document.getElementById('auth-signup').addEventListener('click', signUp);
    document.getElementById('section-menu').addEventListener('pointerleave', scheduleSectionMenuClose);
    document.getElementById('section-menu').addEventListener('pointerenter', cancelSectionMenuClose);
    document.getElementById('random-toggle')?.addEventListener('click', toggleRandomizer);
    document.getElementById('export-song').addEventListener('click', exportActiveSongFormat);
    document.getElementById('import-song').addEventListener('click', openSongImportPicker);
    document.getElementById('import-song-file').addEventListener('change', importSongFormatFromFile);
    document.getElementById('cancel-delete-song').addEventListener('click', closeDeleteSongPopup);
    document.getElementById('confirm-delete-song').addEventListener('click', confirmDeleteSong);
    document.getElementById('delete-song-popup').addEventListener('click', event => {
        if (event.target.id === 'delete-song-popup') closeDeleteSongPopup();
    });
    document.getElementById('song-search').addEventListener('input', event => {
        state.search = event.target.value;
        renderLibraryBrowser();
    });
    document.querySelectorAll('.song-source-tab').forEach(button => {
        button.addEventListener('click', () => switchSongSource(button.dataset.source));
    });
    setupLibraryBrowserEvents();

    document.getElementById('play-btn').addEventListener('click', playSong);
    document.getElementById('pause-btn').addEventListener('click', pauseSong);
    document.getElementById('stop-btn').addEventListener('click', stopSong);
    document.getElementById('next-section-btn').addEventListener('click', () => movePlaybackSection(1));
    document.getElementById('previous-section-btn').addEventListener('click', () => movePlaybackSection(-1));
    document.getElementById('reset-bpm').addEventListener('click', resetPlayBpm);
    document.getElementById('reset-transpose').addEventListener('click', resetTranspose);
    document.getElementById('reset-capo').addEventListener('click', resetCapo);
    document.getElementById('reset-countdown').addEventListener('click', resetCountdown);
    document.getElementById('reset-measure').addEventListener('click', resetMeasure);
    document.getElementById('reset-song-bpm').addEventListener('click', resetSongBpm);
    document.getElementById('random-now')?.addEventListener('click', () => {
        const chord = randomChord();
        document.getElementById('random-output').textContent = chord;
        postChord(chord);
    });

    ['song-bpm', 'beats-per-bar', 'transpose', 'capo', 'countdown'].forEach(id => {
        document.getElementById(id).addEventListener('input', updateSongNumber);
    });
    document.getElementById('play-bpm').addEventListener('input', saveSongs);
    document.getElementById('playable-toggle').addEventListener('change', event => {
        const song = activeSong();
        if (!song) return;
        song.playable = event.target.checked;
        if (!song.playable) {
            state.showDetailedDurationsDisplay = false;
            saveUiSettings();
        }
        saveSongs();
        render();
    });
    document.getElementById('random-playback')?.addEventListener('change', event => {
        const song = activeSong();
        if (!song) return;
        song.randomPlayback = event.target.checked;
        saveSongs();
    });
    document.getElementById('online-available').addEventListener('change', toggleOnlineAvailability);
    document.getElementById('show-detailed-durations-edit').addEventListener('change', event => {
        state.hasSetDetailedDurationsEdit = true;
        state.showDetailedDurationsEdit = event.target.checked;
        saveUiSettings();
        render();
    });
    document.getElementById('show-detailed-durations-display').addEventListener('change', event => {
        state.hasSetDetailedDurationsDisplay = true;
        if (isPlaybackDisabled(activeSong())) {
            event.target.checked = false;
        }
        state.showDetailedDurationsDisplay = event.target.checked;
        saveUiSettings();
        render();
    });
    document.getElementById('show-section-titles-display').addEventListener('change', event => {
        state.showSectionTitlesDisplay = event.target.checked;
        saveUiSettings();
        render();
    });
    document.getElementById('show-repetitions-display').addEventListener('change', event => {
        state.showRepetitionsDisplay = event.target.checked;
        saveUiSettings();
        render();
    });
    document.getElementById('show-repetitions-edit').addEventListener('change', event => {
        state.showRepetitionsEdit = event.target.checked;
        saveUiSettings();
        render();
    });
    document.getElementById('show-chord-tabs-edit').addEventListener('change', event => {
        state.showChordTabsEdit = event.target.checked;
        saveUiSettings();
        render();
    });

    ['song-title', 'song-artist'].forEach(id => {
        const input = document.getElementById(id);
        input.addEventListener('input', updateSongMeta);
        input.addEventListener('blur', event => {
            event.target.value = titleCase(event.target.value);
            updateSongMeta();
            renderSongList();
        });
    });

    window.addEventListener('message', handleParentMessage);
}

function setupLeftMenuScroll() {
    const menu = document.querySelector('.left-menu');
    if (!menu) return;

    menu.addEventListener('wheel', event => {
        if (menu.scrollHeight <= menu.clientHeight) return;
        event.preventDefault();
        menu.scrollTop += event.deltaY;
    }, { passive: false, capture: true });
}

function setupSongScrollBar() {
    const page = document.getElementById('song-page');
    const scrollbar = document.getElementById('song-scrollbar');
    const thumb = document.getElementById('song-scrollbar-thumb');
    if (!page || !scrollbar || !thumb) return;

    let dragging = false;
    let dragOffset = 0;

    const scrollToClientY = (clientY, offset = 0) => {
        const maxScroll = page.scrollHeight - page.clientHeight;
        if (maxScroll <= 0) return;

        const rect = scrollbar.getBoundingClientRect();
        const thumbHeight = Number.parseFloat(getComputedStyle(scrollbar).getPropertyValue('--song-scroll-thumb-height')) || thumb.offsetHeight;
        const maxThumbTop = Math.max(1, rect.height - thumbHeight);
        const thumbTop = clamp(clientY - rect.top - offset, 0, maxThumbTop);
        page.scrollTop = (thumbTop / maxThumbTop) * maxScroll;
    };

    scrollbar.addEventListener('pointerdown', event => {
        event.preventDefault();
        const thumbRect = thumb.getBoundingClientRect();
        dragging = true;
        dragOffset = event.target === thumb ? event.clientY - thumbRect.top : thumbRect.height / 2;
        scrollToClientY(event.clientY, dragOffset);
        scrollbar.setPointerCapture?.(event.pointerId);
    });
    scrollbar.addEventListener('pointermove', event => {
        if (dragging) scrollToClientY(event.clientY, dragOffset);
    });
    scrollbar.addEventListener('pointerup', event => {
        dragging = false;
        scrollbar.releasePointerCapture?.(event.pointerId);
    });
    scrollbar.addEventListener('pointercancel', () => {
        dragging = false;
    });
    scrollbar.addEventListener('keydown', event => {
        const step = event.key === 'PageDown' || event.key === 'PageUp'
            ? page.clientHeight * 0.8
            : 48;
        if (event.key === 'ArrowDown' || event.key === 'PageDown') {
            event.preventDefault();
            page.scrollTop += step;
        }
        if (event.key === 'ArrowUp' || event.key === 'PageUp') {
            event.preventDefault();
            page.scrollTop -= step;
        }
        if (event.key === 'Home') {
            event.preventDefault();
            page.scrollTop = 0;
        }
        if (event.key === 'End') {
            event.preventDefault();
            page.scrollTop = page.scrollHeight;
        }
    });

    page.addEventListener('scroll', updateSongScrollBar, { passive: true });
    window.addEventListener('resize', updateSongScrollBar);
    updateSongScrollBar();
}

function updateSongScrollBar() {
    const page = document.getElementById('song-page');
    const scrollbar = document.getElementById('song-scrollbar');
    if (!page || !scrollbar) return;

    const maxScroll = page.scrollHeight - page.clientHeight;
    const trackHeight = scrollbar.clientHeight;
    const enabled = maxScroll > 1 && trackHeight > 0;
    scrollbar.classList.toggle('disabled', !enabled);
    scrollbar.setAttribute('aria-disabled', enabled ? 'false' : 'true');

    if (!enabled) {
        scrollbar.style.setProperty('--song-scroll-thumb-top', '0px');
        scrollbar.style.setProperty('--song-scroll-thumb-height', '100%');
        scrollbar.setAttribute('aria-valuenow', '0');
        return;
    }

    const thumbHeight = clamp((page.clientHeight / page.scrollHeight) * trackHeight, 34, trackHeight);
    const maxThumbTop = Math.max(1, trackHeight - thumbHeight);
    const thumbTop = (page.scrollTop / maxScroll) * maxThumbTop;
    scrollbar.style.setProperty('--song-scroll-thumb-top', `${thumbTop}px`);
    scrollbar.style.setProperty('--song-scroll-thumb-height', `${thumbHeight}px`);
    scrollbar.setAttribute('aria-valuemin', '0');
    scrollbar.setAttribute('aria-valuemax', String(Math.round(maxScroll)));
    scrollbar.setAttribute('aria-valuenow', String(Math.round(page.scrollTop)));
}

function setupStaticNumberWheels() {
    Object.entries(STATIC_NUMBER_WHEELS).forEach(([id, config]) => {
        const input = document.getElementById(id);
        if (!input || input.dataset.wheelReady) return;

        input.dataset.wheelReady = 'true';
        input.classList.add('number-source');
        const wheel = createNumberWheel({
            value: Number(input.value) || Number(input.min) || 0,
            min: config.min,
            max: config.max,
            step: config.step,
            format: config.format || (value => String(value)),
            onChange: value => {
                input.value = String(value);
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
        input.after(wheel);
    });
}

function setupSectionMenu() {
    const menu = document.getElementById('section-menu');
    SECTION_TYPES.forEach(type => {
        const button = document.createElement('button');
        button.className = 'panel-btn';
        button.type = 'button';
        button.textContent = labelForType(type);
        button.addEventListener('click', () => {
            addSection(type, state.insertSectionIndex);
            menu.hidden = true;
        });
        menu.appendChild(button);
    });
}
