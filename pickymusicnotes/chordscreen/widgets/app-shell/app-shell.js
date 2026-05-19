function setupEventListeners() {
    document.querySelectorAll('.tab-btn:not(:disabled)').forEach(btn => {
        btn.addEventListener('click', event => {
            switchInstrument(event.target.closest('.tab-btn').dataset.instrument);
        });
    });

    document.getElementById('pentatonic-toggle')?.addEventListener('change', event => {
        appState.pentatonicMode = event.target.checked;
        displayChord(getSelectedChord());
    });

    document.getElementById('chord-controls').addEventListener('pointerdown', event => {
        appState.pickerActive = true;
        const row = event.target.closest('.selector-row');
        if (row?.dataset.row) {
            appState.activeRow = row.dataset.row;
        }
    });
    document.getElementById('chord-controls').addEventListener('wheel', handleSelectorWheel, { passive: false });
    window.addEventListener('keydown', event => {
        const isArrowKey = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key);
        const isInsidePicker = Boolean(event.target.closest?.('#chord-controls'));

        if (isArrowKey && (appState.pickerActive || isInsidePicker)) {
            appState.pickerActive = true;
            handleSelectorKeys(event);
        }
    }, { capture: true });
    document.addEventListener('pointerdown', event => {
        if (!event.target.closest('#chord-controls')) {
            appState.pickerActive = false;
        }
    });
    window.addEventListener('wheel', handleWheelLock, { capture: true, passive: false });
    window.addEventListener('message', handleSongwriterMessage);
    document.querySelectorAll('#sheet-lock-btn, #chord-lock-btn').forEach(button => {
        button.addEventListener('click', toggleSheetLock);
    });
    document.getElementById('send-chord-btn')?.addEventListener('click', sendCurrentChordToSongwriter);
    document.querySelectorAll('[data-song-action]').forEach(button => {
        button.addEventListener('click', () => {
            postToSongwriter({ type: 'picky:editAction', action: button.dataset.songAction });
        });
    });
    document.getElementById('request-open')?.addEventListener('click', openRequestModal);
    document.getElementById('request-close')?.addEventListener('click', closeRequestModal);
    document.querySelector('[data-request-close]')?.addEventListener('click', closeRequestModal);
    document.getElementById('donate-open')?.addEventListener('click', openDonateModal);
    document.getElementById('donate-close')?.addEventListener('click', closeDonateModal);
    document.querySelector('[data-donate-close]')?.addEventListener('click', closeDonateModal);
    window.addEventListener('keydown', event => {
        if (event.key !== 'Escape') return;
        closeRequestModal();
        closeDonateModal();
    });
    document.querySelectorAll('.screen-dot').forEach(dot => {
        if (!dot.dataset.screen) return;
        dot.addEventListener('click', () => activateScreen(dot.dataset.screen));
    });
    document.getElementById('screen-lock-dot')?.addEventListener('click', toggleSheetLock);
    window.addEventListener('wheel', handleScreenWheel, { passive: false });
    setupScreenSwipe();
}

function handleSongwriterMessage(event) {
    if (!event.data || typeof event.data !== 'object') return;

    if (event.data.type === 'songwriter:setChord') {
        applyChordName(event.data.chord);
    }

    if (event.data.type === 'songwriter:editMode') {
        document.body.classList.toggle('songwriter-editing', Boolean(event.data.enabled));
        document.getElementById('send-chord-btn')?.classList.toggle('active', Boolean(event.data.enabled));
    }
}

function toggleSheetLock() {
    const locked = !document.body.classList.contains('sheet-locked');

    if (locked) {
        document.body.classList.toggle('lock-from-songwriter', document.body.classList.contains('screen-songwriter'));
        document.body.classList.toggle('lock-from-chords', !document.body.classList.contains('screen-songwriter'));
    } else {
        document.body.classList.remove('lock-from-songwriter', 'lock-from-chords');
    }

    document.body.classList.toggle('sheet-locked', locked);
    const screenLockDot = document.getElementById('screen-lock-dot');
    if (screenLockDot) {
        screenLockDot.classList.toggle('active', locked);
        screenLockDot.setAttribute('aria-pressed', locked ? 'true' : 'false');
        screenLockDot.setAttribute('aria-label', locked ? 'Unlock screens' : 'Lock screens');
    }
    document.querySelectorAll('#sheet-lock-btn, #chord-lock-btn').forEach(button => {
        button.classList.toggle('active', locked);
        button.setAttribute('aria-pressed', locked ? 'true' : 'false');
    });
    setSongwriterLockVisual(locked);
    postToSongwriter({ type: 'picky:lock', locked });
}

function sendCurrentChordToSongwriter() {
    postToSongwriter({
        type: 'picky:addChord',
        chord: `${appState.selection.note}${formatChordSuffix(appState.selection.type)}`
    });
}

function activateScreen(screen) {
    if (document.body.classList.contains('sheet-locked')) return;

    const nextScreen = screen === 'songwriter' ? 'songwriter' : 'chords';
    document.body.classList.toggle('screen-songwriter', nextScreen === 'songwriter');
    document.querySelectorAll('.screen-dot').forEach(dot => {
        if (dot.id === 'screen-lock-dot') return;
        dot.classList.toggle('active', dot.dataset.screen === nextScreen);
    });
}

let screenWheelTimer = 0;

function handleScreenWheel(event) {
    if (document.body.classList.contains('sheet-locked')) return;
    if (!isBackgroundScreenWheel(event)) return;

    event.preventDefault();
    const now = Date.now();
    if (now - screenWheelTimer < 620) return;
    screenWheelTimer = now;

    const goingToSongwriter = event.deltaY > 0 || event.deltaX > 0;
    activateScreen(goingToSongwriter ? 'songwriter' : 'chords');
}

function isBackgroundScreenWheel(event) {
    const target = event.target;
    if (!target?.closest) return true;

    return !target.closest('button, input, textarea, select, iframe, #chord-controls, .fretboard, .scale-tools, .request-frame, .bridge-tools, .chord-lock-tools, .app-menu-shell, .container, .songwriter-frame, .support-tools');
}

function setSongwriterLockVisual(locked) {
    const app = document.getElementById('songwriter-frame')?.contentDocument?.getElementById('songwriter-app');
    if (!app) return;

    app.classList.toggle('locked', locked);
    app.classList.toggle('compact', locked);
    if (locked) app.classList.remove('editing');
}

function setupScreenSwipe() {
    const pages = document.getElementById('app-pages');
    if (!pages) return;

    let dragStartX = 0;
    let dragStartY = 0;
    let dragging = false;
    let hasMoved = false;

    document.addEventListener('pointerdown', event => {
        if (document.body.classList.contains('sheet-locked')) return;
        if (event.target.closest('button, input, textarea, select, iframe, #chord-controls, .fretboard, .scale-tools, .request-frame, .bridge-tools')) return;

        dragStartX = event.clientX;
        dragStartY = event.clientY;
        dragging = true;
        hasMoved = false;
    });

    document.addEventListener('pointermove', event => {
        if (!dragging) return;

        const deltaX = event.clientX - dragStartX;
        const deltaY = event.clientY - dragStartY;
        if (!hasMoved && Math.abs(deltaX) < 8) return;
        if (!hasMoved && Math.abs(deltaY) > Math.abs(deltaX)) {
            dragging = false;
            return;
        }

        hasMoved = true;
        const currentOffset = document.body.classList.contains('screen-songwriter') ? -window.innerWidth : 0;
        const nextOffset = Math.max(-window.innerWidth, Math.min(0, currentOffset + deltaX));
        pages.classList.add('dragging');
        pages.style.transform = `translateX(${nextOffset}px)`;
    });

    document.addEventListener('pointerup', event => {
        if (!dragging) return;
        dragging = false;
        pages.classList.remove('dragging');
        pages.style.transform = '';

        const deltaX = event.clientX - dragStartX;
        const deltaY = event.clientY - dragStartY;
        if (Math.abs(deltaX) < 70 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return;

        activateScreen(deltaX < 0 ? 'songwriter' : 'chords');
    });

    document.addEventListener('pointercancel', () => {
        dragging = false;
        pages.classList.remove('dragging');
        pages.style.transform = '';
    });
}

function openRequestModal() {
    document.getElementById('request-modal')?.removeAttribute('hidden');
}

function closeRequestModal() {
    document.getElementById('request-modal')?.setAttribute('hidden', '');
}

function openDonateModal() {
    document.getElementById('donate-modal')?.removeAttribute('hidden');
}

function closeDonateModal() {
    document.getElementById('donate-modal')?.setAttribute('hidden', '');
}

function postToSongwriter(message) {
    document.getElementById('songwriter-frame')?.contentWindow?.postMessage(message, '*');
}

function startActiveVisitorCount() {
    const visitorCount = document.getElementById('visitor-count');
    if (!visitorCount) return;

    let visitorId = getVisitorSessionId();
    if (!visitorId) {
        visitorId = createVisitorId();
        saveVisitorSessionId(visitorId);
    }

    const update = async () => {
        try {
            const response = await fetch('/api/active-visitors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ visitorId })
            });

            if (!response.ok) {
                throw new Error(`Visitor count failed with status ${response.status}`);
            }

            const data = await response.json();
            visitorCount.textContent = `Active visitors: ${data.activeVisitors}`;
        } catch (error) {
            visitorCount.textContent = 'Active visitors: 1';
        }
    };

    update();
    window.setInterval(update, 5000);
}

function createVisitorId() {
    if (window.crypto?.randomUUID) {
        return window.crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getVisitorSessionId() {
    try {
        return sessionStorage.getItem('pickyMusicVisitorId');
    } catch {
        return '';
    }
}

function saveVisitorSessionId(visitorId) {
    try {
        sessionStorage.setItem('pickyMusicVisitorId', visitorId);
    } catch {
        return;
    }
}

function switchInstrument(instrumentName) {
    if (!config.instruments[instrumentName]) return;

    appState.currentInstrument = instrumentName;

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.instrument === instrumentName);
    });

    initializeApp();
}


