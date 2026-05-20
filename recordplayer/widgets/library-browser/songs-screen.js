function renderSongsScreen(list, songs) {
    const groups = groupSongsByWork(songs);
    groups.forEach(group => {
        const block = document.createElement('section');
        block.className = 'library-song-group';

        const heading = document.createElement('header');
        heading.className = 'library-song-heading';
        heading.innerHTML = '<h3></h3><p></p>';
        heading.querySelector('h3').textContent = group.title;
        heading.querySelector('p').textContent = group.artist;
        block.appendChild(heading);

        group.versions.forEach((song, index) => {
            block.appendChild(renderSongVersionRow(song, index + 1));
        });

        list.appendChild(block);
    });
}

function groupSongsByWork(songs) {
    const groups = new Map();
    songs.forEach(song => {
        const title = song.title || 'Untitled Song';
        const artist = song.artist || 'Artist';
        const key = `${title.trim().toLowerCase()}::${artist.trim().toLowerCase()}`;
        if (!groups.has(key)) groups.set(key, { title, artist, versions: [] });
        groups.get(key).versions.push(song);
    });

    return [...groups.values()]
        .map(group => ({
            ...group,
            versions: group.versions.sort(compareLibraryItems)
        }))
        .sort((a, b) => {
            const draftDelta = Number(a.title === 'Untitled Song') - Number(b.title === 'Untitled Song');
            if (state.songSource === 'local' && draftDelta) return -draftDelta;
            return a.title.localeCompare(b.title) || a.artist.localeCompare(b.artist);
        });
}

function renderSongVersionRow(song, position) {
    const item = document.createElement('div');
    item.className = `song-list-row library-version-row${song.id === state.activeSongId ? ' active' : ''}`;

    const button = document.createElement('button');
    button.className = 'song-list-item library-version-main';
    button.type = 'button';
    button.innerHTML = `
        <span class="library-version-meta"></span>
        <span class="library-version-detail"><span class="library-position"></span><span class="library-detail-text"></span></span>
        <span class="library-meta-row"><span class="library-position-spacer"></span><span class="library-author library-version-author"></span></span>
    `;
    button.querySelector('.library-version-meta').textContent = formatSongVersionMeta(song);
    button.querySelector('.library-position').textContent = `${position}.`;
    button.querySelector('.library-detail-text').textContent = formatSongStructure(song);
    button.querySelector('.library-version-author').textContent = formatSongVersionAuthor(song);
    button.addEventListener('click', () => activateLibrarySong(song));

    const score = renderScoreBulbs(song, 'song');
    const remove = createLibraryRemoveButton(`Remove ${song.title || 'Untitled Song'}`, () => openDeleteSongPopup(song.id));

    item.append(button, score, remove);
    return item;
}

function activateLibrarySong(song) {
    stopSong();
    state.activeSongId = song.id;
    state.activeSectionId = song.sections[0]?.id || null;
    state.activeSubsectionId = song.sections[0]?.subsections[0]?.id || null;
    render();
}

function formatSongVersionMeta(song) {
    const details = [`Capo ${clamp(Number(song.capo) || 0, -12, 12)}`];
    if (song.playable) details.push('Playable');
    return details.join(', ');
}

function formatSongStructure(song) {
    if (!state.showLibraryStructure) return '';
    const sections = Array.isArray(song.sections) ? song.sections.length : 0;
    const subsections = (song.sections || []).reduce((total, section) => total + (section.subsections?.length || 0), 0);
    return `${sections} ${pluralize(sections, 'section')}, ${subsections} ${pluralize(subsections, 'subsection')}`;
}

function formatSongVersionAuthor(song) {
    if (!state.showLibraryAuthors) return '';
    return song.ownerName || song.versionAuthor || 'Local version';
}
