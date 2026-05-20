function loadSetlists() {
    try {
        const parsed = JSON.parse(localStorage.getItem(SETLISTS_STORAGE_KEY) || '[]');
        if (Array.isArray(parsed)) return parsed.map(normalizeSetlist);
    } catch (error) {
        console.warn('Could not read setlists.', error);
    }
    return [];
}

function saveSetlists() {
    localStorage.setItem(SETLISTS_STORAGE_KEY, JSON.stringify(state.setlists));
}

function createSetlist() {
    const song = activeSong();
    return {
        id: createId('setlist'),
        name: 'New Setlist',
        authorName: displayName?.() || 'Local builder',
        songIds: song ? [song.id] : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

function normalizeSetlist(setlist) {
    return {
        id: setlist.id || createId('setlist'),
        name: setlist.name || 'Untitled Setlist',
        authorName: setlist.authorName || 'Local builder',
        songIds: Array.isArray(setlist.songIds) ? setlist.songIds : [],
        createdAt: setlist.createdAt || new Date().toISOString(),
        updatedAt: setlist.updatedAt || setlist.createdAt || new Date().toISOString()
    };
}

function addSetlist() {
    if (state.songSource !== 'local') return;
    state.setlists.unshift(createSetlist());
    saveSetlists();
    state.libraryScreen = 'setlists';
    renderLibraryBrowser();
}

function deleteSetlist(setlistId) {
    state.setlists = state.setlists.filter(setlist => setlist.id !== setlistId);
    saveSetlists();
    renderLibraryBrowser();
}

function renderSetlistsScreen(list, setlists) {
    setlists.forEach(setlist => {
        const block = document.createElement('section');
        block.className = 'library-setlist-group';

        const header = document.createElement('header');
        header.className = 'library-setlist-heading';
        header.appendChild(renderSetlistName(setlist));

        const count = document.createElement('p');
        count.textContent = `${setlist.songIds.length} ${pluralize(setlist.songIds.length, 'song')}`;

        const score = renderScoreBulbs(setlist, 'setlist');
        const scoreRow = document.createElement('div');
        scoreRow.className = 'library-setlist-score-row';
        scoreRow.append(count, score);
        header.appendChild(scoreRow);

        const author = document.createElement('p');
        author.className = 'library-author library-setlist-author';
        author.textContent = state.showLibraryAuthors ? setlist.authorName : '';
        const authorRow = document.createElement('div');
        authorRow.className = 'library-setlist-author-row';
        authorRow.append(author);
        const ratingCount = score.querySelector('.library-rating-count');
        if (ratingCount) authorRow.appendChild(ratingCount);
        header.appendChild(authorRow);

        const remove = createLibraryRemoveButton(`Remove ${setlist.name}`, () => deleteSetlist(setlist.id));
        header.appendChild(remove);
        block.appendChild(header);

        setlist.songIds.forEach((songId, index) => {
            const song = state.songs.find(item => item.id === songId);
            if (song) block.appendChild(renderSetlistSongRow(setlist, song, index));
        });

        block.appendChild(renderSetlistAddRow(setlist));

        list.appendChild(block);
    });
}

function renderSetlistName(setlist) {
    if (!state.libraryEditMode || state.songSource !== 'local') {
        const title = document.createElement('h3');
        title.textContent = setlist.name;
        return title;
    }

    const input = document.createElement('input');
    input.className = 'setlist-name-input';
    input.value = setlist.name;
    input.setAttribute('aria-label', 'Setlist name');
    input.addEventListener('input', event => {
        setlist.name = event.target.value;
        setlist.updatedAt = new Date().toISOString();
        saveSetlists();
    });
    return input;
}

function renderSetlistSongRow(setlist, song, index) {
    const row = document.createElement('div');
    row.className = `library-setlist-song song-list-row library-version-row${song.id === state.activeSongId ? ' active' : ''}`;

    const main = document.createElement('button');
    main.className = 'song-list-item library-version-main';
    main.type = 'button';
    main.innerHTML = `
        <span class="library-version-meta"></span>
        <span class="library-version-detail"><span class="library-position"></span><span class="library-detail-text"></span></span>
        <span class="library-meta-row"><span class="library-position-spacer"></span><span class="library-author library-version-author"></span></span>
    `;
    main.querySelector('.library-version-meta').textContent = song.title || 'Untitled Song';
    main.querySelector('.library-position').textContent = `${index + 1}.`;
    main.querySelector('.library-detail-text').textContent = song.artist || 'Artist';
    main.querySelector('.library-version-author').textContent = state.showLibraryAuthors ? (song.ownerName || 'Local version') : '';
    main.addEventListener('click', () => activateLibrarySong(song));

    const score = renderScoreBulbs(song, 'song');
    const remove = createLibraryRemoveButton('Remove from setlist', () => {
        setlist.songIds.splice(index, 1);
        setlist.updatedAt = new Date().toISOString();
        saveSetlists();
        renderLibraryBrowser();
    });

    row.append(main, score, remove);
    return row;
}

function renderSetlistAddRow(setlist) {
    const row = document.createElement('div');
    row.className = 'library-setlist-add-row';
    row.appendChild(createSetlistInsertButton(setlist, setlist.songIds.length));
    return row;
}

function createSetlistInsertButton(setlist, index) {
    const button = document.createElement('button');
    button.className = 'library-mini-plus library-setlist-add-song';
    button.type = 'button';
    button.textContent = '+';
    button.title = 'Add active song here';
    button.disabled = !state.libraryEditMode || state.songSource !== 'local' || !activeSong();
    button.addEventListener('click', () => {
        const song = activeSong();
        if (!song) return;
        setlist.songIds.splice(index, 0, song.id);
        setlist.updatedAt = new Date().toISOString();
        saveSetlists();
        renderLibraryBrowser();
    });
    return button;
}
