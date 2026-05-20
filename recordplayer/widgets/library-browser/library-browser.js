function setupLibraryBrowserEvents() {
    document.querySelectorAll('[data-library-screen]').forEach(button => {
        button.addEventListener('click', event => {
            selectLibraryScreen(button.dataset.libraryScreen);
            if (event.target.closest('.library-pill-plus')) {
                if (state.songSource !== 'local') return;
                if (event.target.closest('#new-song')) addSong();
                if (event.target.closest('#new-setlist')) addSetlist();
            }
        });
    });

    ensureRateSongPopup();
    document.getElementById('library-edit-toggle')?.addEventListener('click', beginLibraryEditMode);
    document.getElementById('library-save-edit')?.addEventListener('click', saveLibraryEditMode);
    document.getElementById('library-cancel-edit')?.addEventListener('click', cancelLibraryEditMode);

    [
        ['show-library-authors', 'showLibraryAuthors'],
        ['show-library-ratings', 'showLibraryRatings'],
        ['show-library-structure', 'showLibraryStructure']
    ].forEach(([id, key]) => {
        document.getElementById(id)?.addEventListener('change', event => {
            state[key] = event.target.checked;
            renderLibraryBrowser();
        });
    });
}

function beginLibraryEditMode() {
    state.libraryEditSnapshot = JSON.stringify({
        songs: state.songs,
        setlists: state.setlists
    });
    state.libraryEditMode = true;
    renderLibraryBrowser();
}

function saveLibraryEditMode() {
    state.libraryEditMode = false;
    state.libraryEditSnapshot = null;
    saveSetlists();
    saveSongs();
    renderLibraryBrowser();
}

function cancelLibraryEditMode() {
    if (state.libraryEditSnapshot) {
        try {
            const snapshot = JSON.parse(state.libraryEditSnapshot);
            if (Array.isArray(snapshot.songs)) state.songs = snapshot.songs.map(song => {
                normalizeSong(song);
                return song;
            });
            if (Array.isArray(snapshot.setlists)) state.setlists = snapshot.setlists.map(normalizeSetlist);
            saveSetlists();
            saveSongs();
        } catch (error) {
            console.warn('Could not restore library edit snapshot.', error);
        }
    }

    state.libraryEditMode = false;
    state.libraryEditSnapshot = null;
    render();
}

function selectLibraryScreen(screen) {
    if (!['songs', 'setlists'].includes(screen)) return;
    state.libraryScreen = screen;
    state.search = '';
    const search = document.getElementById('song-search');
    if (search) search.value = '';
    renderLibraryBrowser();
}

function renderLibraryBrowser() {
    const browser = document.getElementById('library-browser');
    const list = document.getElementById('song-list');
    if (!browser || !list) return;

    browser.classList.toggle('library-editing', state.libraryEditMode);
    browser.dataset.screen = state.libraryScreen;
    browser.dataset.source = state.songSource;

    document.querySelectorAll('[data-library-screen]').forEach(button => {
        button.classList.toggle('active', button.dataset.libraryScreen === state.libraryScreen);
    });

    const editButton = document.getElementById('library-edit-toggle');
    if (editButton) {
        editButton.classList.toggle('active', state.libraryEditMode);
        editButton.setAttribute('aria-pressed', state.libraryEditMode ? 'true' : 'false');
        editButton.hidden = state.libraryEditMode;
    }
    const saveEditButton = document.getElementById('library-save-edit');
    if (saveEditButton) saveEditButton.hidden = !state.libraryEditMode;
    const cancelEditButton = document.getElementById('library-cancel-edit');
    if (cancelEditButton) cancelEditButton.hidden = !state.libraryEditMode;

    const search = document.getElementById('song-search');
    if (search) search.placeholder = state.libraryScreen === 'setlists' ? 'search setlists' : 'search songs';

    const newSong = document.getElementById('new-song');
    if (newSong) newSong.classList.toggle('library-add-disabled', state.songSource !== 'local');
    const newSetlist = document.getElementById('new-setlist');
    if (newSetlist) newSetlist.classList.toggle('library-add-disabled', state.songSource !== 'local');

    const authorsToggle = document.getElementById('show-library-authors');
    if (authorsToggle) authorsToggle.checked = state.showLibraryAuthors;
    const ratingsToggle = document.getElementById('show-library-ratings');
    if (ratingsToggle) ratingsToggle.checked = state.showLibraryRatings;
    const structureToggle = document.getElementById('show-library-structure');
    if (structureToggle) structureToggle.checked = state.showLibraryStructure;

    list.replaceChildren();

    if (state.libraryScreen === 'setlists') {
        const setlists = filterSetlistsForLibrary();
        if (!setlists.length) {
            list.appendChild(createLibraryEmpty('No setlists found.'));
            return;
        }
        renderSetlistsScreen(list, setlists);
        return;
    }

    const songs = filterSongsForLibrary();
    if (!songs.length) {
        list.appendChild(createLibraryEmpty(state.songSource === 'cloud' ? 'No public songs found.' : 'No songs found.'));
        return;
    }
    renderSongsScreen(list, songs);
}

function filterSongsForLibrary() {
    const query = state.search.trim().toLowerCase();
    return state.songs.filter(song => {
        const haystack = `${song.title || ''} ${song.artist || ''} ${song.ownerName || ''}`.toLowerCase();
        return haystack.includes(query);
    });
}

function filterSetlistsForLibrary() {
    const query = state.search.trim().toLowerCase();
    return state.setlists
        .filter(setlist => `${setlist.name} ${setlist.authorName}`.toLowerCase().includes(query))
        .sort(compareSetlistsForLibrary);
}

function createLibraryEmpty(text) {
    const empty = document.createElement('p');
    empty.className = 'song-list-empty';
    empty.textContent = text;
    return empty;
}

function createLibraryRemoveButton(label, onClick) {
    const remove = document.createElement('button');
    remove.className = 'delete-song-btn library-remove-btn';
    remove.type = 'button';
    remove.title = label;
    remove.setAttribute('aria-label', label);
    remove.disabled = state.songSource !== 'local';
    remove.textContent = 'x';
    remove.addEventListener('click', event => {
        event.stopPropagation();
        onClick();
    });
    return remove;
}

function renderScoreBulbs(item, type) {
    const panel = document.createElement('div');
    const summary = readLibraryRatingSummary(item.id, type);
    const rating = summary.displayRating;
    panel.className = `library-score-panel${summary.isPerfect ? ' perfect-score' : ''}`;
    panel.hidden = !state.showLibraryRatings;

    const score = document.createElement('div');
    score.className = 'library-score';
    score.title = 'Average community rating';

    for (let index = 1; index <= 8; index += 1) {
        const note = document.createElement('button');
        note.className = `score-note${index <= rating ? ' active' : ''}`;
        note.type = 'button';
        note.textContent = String.fromCharCode(0x266a);
        note.title = `Rate ${index} of 8`;
        note.addEventListener('pointerenter', () => playLibraryScorePreview(index));
        note.addEventListener('click', event => {
            event.stopPropagation();
            openRateSongPopup(item, type, index);
        });
        score.appendChild(note);
    }

    const ratedBy = document.createElement('p');
    ratedBy.className = 'library-rating-count';
    ratedBy.tabIndex = 0;
    ratedBy.textContent = summary.count ? `rated by ${summary.count} ${summary.count === 1 ? 'person' : 'people'}` : 'not rated yet';
    ratedBy.title = summary.names.length ? summary.names.join(', ') : 'No ratings yet';
    const names = document.createElement('span');
    names.className = 'library-rating-names';
    names.textContent = summary.names.length ? summary.names.join(', ') : 'No ratings yet';
    ratedBy.appendChild(names);
    panel.append(score, ratedBy);
    return panel;
}

function ensureRateSongPopup() {
    if (document.getElementById('rate-song-popup')) return;
    const popup = document.createElement('div');
    popup.className = 'confirm-overlay';
    popup.id = 'rate-song-popup';
    popup.hidden = true;
    popup.innerHTML = `
        <section class="confirm-box" role="dialog" aria-modal="true" aria-labelledby="rate-song-title">
            <p class="confirm-kicker">Library score</p>
            <h2 id="rate-song-title">Rate Song??</h2>
            <p class="confirm-copy" id="rate-song-copy">Save this score?</p>
            <div class="confirm-actions">
                <button class="panel-btn confirm-cancel" id="cancel-rate-song" type="button">No</button>
                <button class="panel-btn" id="confirm-rate-song" type="button">Yes</button>
            </div>
        </section>
    `;
    document.getElementById('songwriter-app')?.appendChild(popup);
    document.getElementById('cancel-rate-song')?.addEventListener('click', closeRateSongPopup);
    document.getElementById('confirm-rate-song')?.addEventListener('click', confirmRateSongPopup);
}

function openRateSongPopup(item, type, rating) {
    const popup = document.getElementById('rate-song-popup');
    if (!popup) return;
    if (!state.auth.user) {
        state.auth.message = 'Log in to rate songs.';
        renderAuth();
        openAuthPopup?.();
        return;
    }
    state.pendingLibraryRating = { id: item.id, type, rating };
    const title = document.getElementById('rate-song-title');
    const copy = document.getElementById('rate-song-copy');
    if (title) title.textContent = type === 'song' ? 'Rate Song??' : 'Rate Setlist??';
    if (copy) copy.textContent = `Save ${rating} of 8 for ${item.title || item.name || 'this item'}?`;
    popup.hidden = false;
}

function closeRateSongPopup() {
    state.pendingLibraryRating = null;
    const popup = document.getElementById('rate-song-popup');
    if (popup) popup.hidden = true;
}

async function confirmRateSongPopup() {
    const pending = state.pendingLibraryRating;
    if (pending) {
        await writeLibraryRating(pending.id, pending.type, pending.rating);
        renderLibraryBrowser();
    }
    closeRateSongPopup();
}

async function loadLibraryRatings() {
    state.libraryRatings = {};
    if (!state.auth.client) return;

    const { data, error } = await state.auth.client
        .from('library_ratings')
        .select('item_type, item_id, user_id, user_name, rating, updated_at');

    if (error) {
        console.warn('Could not load library ratings.', error);
        return;
    }

    (data || []).forEach(rating => {
        const key = `${rating.item_type}:${rating.item_id}`;
        if (!state.libraryRatings[key]) state.libraryRatings[key] = [];
        state.libraryRatings[key].push(rating);
    });
}

function playLibraryScorePreview(index) {
    try {
        const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextConstructor) return;
        const context = window.pickyLibraryScoreAudioContext || new AudioContextConstructor();
        window.pickyLibraryScoreAudioContext = context;
        if (context.state === 'suspended') context.resume();

        const now = context.currentTime;
        const frequencies = [261.63, 293.66, 329.63, 349.23, 392, 440, 493.88, 523.25];
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const filter = context.createBiquadFilter();

        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(frequencies[index - 1] || 261.63, now);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1800, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.12, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

        oscillator.connect(filter);
        filter.connect(gain);
        gain.connect(context.destination);
        oscillator.start(now);
        oscillator.stop(now + 0.34);
    } catch {
        return;
    }
}

function readLibraryRating(id, type) {
    return readLibraryRatingSummary(id, type).displayRating;
}

async function writeLibraryRating(id, type, value) {
    if (!state.auth.client || !state.auth.user) return;
    const rating = clamp(Number(value) || 0, 1, 8);
    const userName = displayName?.() || state.auth.user.email || 'Songwriter';
    const { error } = await state.auth.client
        .from('library_ratings')
        .upsert({
            item_type: type,
            item_id: id,
            user_id: state.auth.user.id,
            user_name: userName,
            rating,
            updated_at: new Date().toISOString()
        });

    if (error) {
        console.warn('Could not save library rating.', error);
        state.auth.message = 'Rating could not be saved.';
        renderAuth();
        return;
    }

    await loadLibraryRatings();
}

function readLibraryRatingSummary(id, type) {
    const ratings = state.libraryRatings?.[`${type}:${id}`] || [];
    const count = ratings.length;
    const total = ratings.reduce((sum, item) => sum + clamp(Number(item.rating) || 0, 0, 8), 0);
    const average = count ? total / count : 0;
    const names = ratings
        .map(item => item.user_name || 'Songwriter')
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
    return {
        count,
        names,
        average,
        displayRating: count ? clamp(Math.round(average), 1, 8) : 0,
        isPerfect: count > 0 && ratings.every(item => Number(item.rating) === 8)
    };
}

function compareLibraryItems(a, b) {
    const draftDelta = Number(isDraftLibraryItem(b)) - Number(isDraftLibraryItem(a));
    if (state.songSource === 'local' && draftDelta) return draftDelta;
    const ratingDelta = readLibraryRating(b.id, 'song') - readLibraryRating(a.id, 'song');
    if (ratingDelta) return ratingDelta;
    return String(b.updatedAt || b.updated_at || b.createdAt || '').localeCompare(String(a.updatedAt || a.updated_at || a.createdAt || ''));
}

function compareSetlistsForLibrary(a, b) {
    const draftDelta = Number(isDraftSetlist(b)) - Number(isDraftSetlist(a));
    if (state.songSource === 'local' && draftDelta) return draftDelta;
    const ratingDelta = readLibraryRating(b.id, 'setlist') - readLibraryRating(a.id, 'setlist');
    if (ratingDelta) return ratingDelta;
    return String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''));
}

function isDraftLibraryItem(item) {
    return String(item?.title || '').trim().toLowerCase() === 'untitled song';
}

function isDraftSetlist(item) {
    return String(item?.name || '').trim().toLowerCase() === 'new setlist';
}

function pluralize(count, word) {
    return count === 1 ? word : `${word}s`;
}
