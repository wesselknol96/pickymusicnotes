const CLOUD_SONGS_TABLE = 'songs';

async function initializeCloudAuth() {
    const config = window.PICKY_SUPABASE || {};
    if (!config.url || !config.anonKey || config.url.includes('YOUR_PROJECT')) {
        state.auth.status = 'offline';
        state.auth.message = 'Add Supabase URL and anon key to enable cloud saves.';
        return;
    }

    if (!window.supabase?.createClient) {
        state.auth.status = 'offline';
        state.auth.message = 'Supabase client did not load.';
        return;
    }

    state.auth.client = window.supabase.createClient(config.url, config.anonKey);
    const { data } = await state.auth.client.auth.getSession();
    await applySession(data.session);

    state.auth.client.auth.onAuthStateChange(async (_event, session) => {
        await applySession(session);
        if (document.readyState !== 'loading') await refreshSongsForAuthChange();
    });
}

async function applySession(session) {
    state.auth.user = session?.user || null;
    state.auth.status = state.auth.user ? 'signed-in' : 'signed-out';
    state.auth.profile = state.auth.user ? await ensureProfile() : null;
}

async function syncAuthFromStorage() {
    if (!state.auth.client) return;
    const { data } = await state.auth.client.auth.getSession();
    await applySession(data.session);
    if (state.songSource === 'cloud') await refreshSongsForAuthChange();
    renderAuth();
}

async function ensureProfile() {
    const fallbackName = state.auth.user.user_metadata?.display_name || state.auth.user.email || 'Songwriter';
    const existing = await state.auth.client
        .from('profiles')
        .select('id, display_name, is_admin')
        .eq('id', state.auth.user.id)
        .maybeSingle();

    if (existing.data) return existing.data;
    if (existing.error) console.warn('Could not load Supabase profile.', existing.error);

    const { data, error } = await state.auth.client
        .from('profiles')
        .insert({
            id: state.auth.user.id,
            display_name: fallbackName
        })
        .select('id, display_name, is_admin')
        .single();

    if (error) {
        console.warn('Could not load Supabase profile.', error);
        return { display_name: fallbackName, is_admin: false };
    }
    return data;
}

async function refreshSongsForAuthChange() {
    renderAuth();
    state.songs = await loadSongs();
    state.activeSongId = state.songs[0]?.id || null;
    state.activeSectionId = activeSong()?.sections[0]?.id || null;
    state.activeSubsectionId = activeSong()?.sections[0]?.subsections[0]?.id || null;
    state.editMode = false;
    render();
}

async function switchSongSource(source) {
    if (!['local', 'cloud'].includes(source) || source === state.songSource) return;

    state.songSource = source;
    state.editMode = false;
    state.songs = await loadSongs();
    state.activeSongId = state.songs[0]?.id || null;
    state.activeSectionId = activeSong()?.sections[0]?.id || null;
    state.activeSubsectionId = activeSong()?.sections[0]?.subsections[0]?.id || null;
    render();
}

async function loadCloudSongs() {
    if (!state.auth.client) return loadCloudCache();

    const { data, error } = await state.auth.client
        .from(CLOUD_SONGS_TABLE)
        .select('id, owner_id, owner_name, title, artist, payload, is_online, updated_at')
        .eq('is_online', true)
        .order('updated_at', { ascending: false });

    if (error) {
        console.warn('Could not load cloud songs.', error);
        state.auth.message = 'Cloud songs could not be loaded.';
        return loadCloudCache();
    }

    const songs = (data || []).map(mapCloudSongRow);
    localStorage.setItem(CLOUD_CACHE_KEY, JSON.stringify(songs));
    return songs;
}

async function loadPersonalSongs() {
    if (!state.auth.client || !state.auth.user) return loadLocalSongs();

    const { data, error } = await state.auth.client
        .from(CLOUD_SONGS_TABLE)
        .select('id, owner_id, owner_name, title, artist, payload, is_online, updated_at')
        .eq('owner_id', state.auth.user.id)
        .order('updated_at', { ascending: false });

    if (error) {
        console.warn('Could not load personal cloud songs.', error);
        state.auth.message = 'Personal songs could not be loaded.';
        return loadLocalSongs();
    }

    const songs = (data || []).map(mapCloudSongRow);
    if (songs.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
        return songs;
    }

    return loadLocalSongs();
}

function loadCloudCache() {
    try {
        const parsed = JSON.parse(localStorage.getItem(CLOUD_CACHE_KEY) || '[]');
        if (Array.isArray(parsed) && parsed.length) return parsed.map(normalizeSong);
    } catch (error) {
        console.warn('Could not read cloud cache.', error);
    }
    return [];
}

async function persistActiveCloudSong() {
    if (!state.auth.client || !state.auth.user) return;
    const song = activeSong();
    return persistCloudSong(song);
}

async function persistCloudSong(song) {
    const online = isLocalSongOnline(song);
    return persistCloudSongWithVisibility(song, online);
}

async function persistCloudSongWithVisibility(song, online) {
    if (!state.auth.client || !state.auth.user) return;
    if (!song || !canEditSong(song)) return;

    applyCloudOwner(song);
    song.isOnline = Boolean(online);
    const payload = stripCloudMetadata(song, song.isOnline);
    const { error } = await state.auth.client
        .from(CLOUD_SONGS_TABLE)
        .upsert({
            id: song.id,
            owner_id: song.ownerId,
            owner_name: song.ownerName,
            title: song.title || 'Untitled Song',
            artist: song.artist || 'Artist',
            payload,
            is_online: song.isOnline,
            updated_at: new Date().toISOString()
        });

    if (error) {
        console.warn('Cloud song save failed.', error);
        state.auth.message = 'Saved locally. Cloud save failed.';
    } else {
        state.auth.message = song.isOnline ? 'Cloud saved.' : 'Account saved.';
        markLocalSongOnline(song.id, song.isOnline);
    }
    renderAuth();
    return !error;
}

async function setCloudSongOnline(song, online) {
    return persistCloudSongWithVisibility(song, online);
}

async function deleteCloudSong(song) {
    if (!state.auth.client || !state.auth.user || !canEditSong(song)) return;
    const { error } = await state.auth.client.from(CLOUD_SONGS_TABLE).delete().eq('id', song.id);
    if (error) {
        console.warn('Cloud song delete failed.', error);
        state.auth.message = 'Cloud delete failed.';
        renderAuth();
    } else {
        markLocalSongOnline(song.id, false);
    }
}

function applyCloudOwner(song) {
    if (!state.auth.user) return song;
    song.ownerId = song.ownerId || state.auth.user.id;
    song.ownerName = song.ownerName || displayName();
    return song;
}

function ownedSong(song) {
    return applyCloudOwner(song);
}

function mapCloudSongRow(row) {
    const song = normalizeSong({
        ...row.payload,
        id: row.id,
        title: row.title || row.payload?.title || 'Untitled Song',
        artist: row.artist || row.payload?.artist || 'Artist',
        ownerId: row.owner_id,
        ownerName: row.owner_name,
        isOnline: Boolean(row.is_online),
        updatedAt: row.updated_at
    });
    markLocalSongOnline(song.id, Boolean(row.is_online));
    return song;
}

function stripCloudMetadata(song, online = isLocalSongOnline(song)) {
    const payload = JSON.parse(JSON.stringify(song));
    delete payload.ownerId;
    delete payload.ownerName;
    delete payload.updatedAt;
    payload.isOnline = Boolean(online);
    return payload;
}

function canEditActiveSong() {
    return canEditSong(activeSong());
}

function canEditSong(song) {
    if (!song) return false;
    if (state.songSource !== 'cloud') return true;
    return false;
}

function isSongAdmin() {
    return Boolean(state.auth.profile?.is_admin);
}

function displayName() {
    return state.auth.profile?.display_name || state.auth.user?.user_metadata?.display_name || state.auth.user?.email || 'Songwriter';
}

function renderAuth() {
    document.querySelectorAll('.song-source-tab').forEach(button => {
        if (button.dataset.source === 'local') {
            button.textContent = 'personal songs';
        }
        if (button.dataset.source === 'cloud') {
            button.textContent = 'songs';
        }
        button.classList.toggle('active', button.dataset.source === state.songSource);
    });

    const accountName = document.getElementById('account-name');
    const openButton = document.getElementById('account-open');
    const outButton = document.getElementById('account-out');
    if (!accountName || !openButton || !outButton) return;

    if (state.auth.user) {
        accountName.textContent = `${displayName()}${isSongAdmin() ? ' admin' : ''}`;
        openButton.hidden = true;
        outButton.hidden = false;
    } else {
        accountName.textContent = state.auth.client ? 'Not logged in' : 'Local browser';
        openButton.hidden = false;
        outButton.hidden = true;
    }

    const message = document.getElementById('auth-message');
    if (message) message.textContent = state.auth.message || '';
}

function readOnlineSongIds() {
    try {
        const ids = JSON.parse(localStorage.getItem(LOCAL_ONLINE_IDS_KEY) || '[]');
        return Array.isArray(ids) ? ids : [];
    } catch (_error) {
        return [];
    }
}

function markLocalSongOnline(songId, online) {
    if (!songId) return;
    const ids = new Set(readOnlineSongIds());
    if (online) ids.add(songId);
    else ids.delete(songId);
    localStorage.setItem(LOCAL_ONLINE_IDS_KEY, JSON.stringify([...ids]));
}

function isLocalSongOnline(song) {
    return Boolean(song?.isOnline || readOnlineSongIds().includes(song?.id));
}

function openAuthPopup() {
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'auth:open' }, '*');
        return;
    }
    document.getElementById('auth-popup').hidden = false;
    renderAuth();
}

function closeAuthPopup() {
    document.getElementById('auth-popup').hidden = true;
}

async function signIn() {
    if (!state.auth.client) {
        state.auth.message = 'Supabase is not configured yet.';
        renderAuth();
        return;
    }
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const { error } = await state.auth.client.auth.signInWithPassword({ email, password });
    state.auth.message = error ? error.message : 'Logged in.';
    if (!error) closeAuthPopup();
    renderAuth();
}

async function signUp() {
    if (!state.auth.client) {
        state.auth.message = 'Supabase is not configured yet.';
        renderAuth();
        return;
    }
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const display_name = document.getElementById('auth-name').value.trim() || email;
    const { error } = await state.auth.client.auth.signUp({
        email,
        password,
        options: { data: { display_name } }
    });
    state.auth.message = error ? error.message : 'Account created. Check your email if confirmation is enabled.';
    renderAuth();
}

async function signOut() {
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'auth:signOut' }, '*');
        return;
    }
    if (!state.auth.client) return;
    await state.auth.client.auth.signOut();
    state.songSource = 'local';
    await refreshSongsForAuthChange();
}

function togglePassword(inputId, buttonId) {
    const input = document.getElementById(inputId);
    const button = document.getElementById(buttonId);
    if (!input || !button) return;

    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    button.classList.toggle('showing', !showing);
    button.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
    button.title = showing ? 'Show password' : 'Hide password';
    input.focus();
}
