function playSong() {
    const song = activeSong();
    if (!song || !song.playable || state.player.playing) return;

    const timeline = buildTimeline(song);
    if (!timeline.length) return;

    startPassiveBeatLightning();
    state.player.playing = true;
    if (state.player.beatsLeftInChord <= 0) {
        state.player.chordIndex = 0;
        state.player.beatInBar = 0;
        state.player.beatsLeftInChord = timeline[0].beats;
        state.player.countdownBeatsLeft = countdownBeatCount(song);
        state.player.pendingChordStart = state.player.countdownBeatsLeft > 0;
        if (state.player.pendingChordStart) {
            document.querySelectorAll('.chord-token.playing').forEach(token => token.classList.remove('playing'));
            resetPlaybackWheelLabels();
        } else {
            postChord(timeline[0].chord);
            highlightActiveChord();
        }
    }

    const beatMs = 60000 / currentBpm();
    state.player.timer = window.setInterval(() => tickPlayer(), beatMs);
    tickPlayer();
}

function pauseSong() {
    clearPlayerTimer();
    state.player.playing = false;
    stopPassiveBeatLightning();
}

function stopSong() {
    clearPlayerTimer();
    state.player.playing = false;
    state.player.beatInBar = 0;
    state.player.chordIndex = 0;
    state.player.beatsLeftInChord = 0;
    state.player.countdownBeatsLeft = 0;
    state.player.pendingChordStart = false;
    state.player.randomBarsUntilNext = 0;
    document.getElementById('beat-lamp')?.classList.remove('bar-start', 'sub-beat', 'beat-hit');
    document.querySelectorAll('.chord-token.playing').forEach(token => token.classList.remove('playing'));
    resetPlaybackWheelLabels();
    stopPassiveBeatLightning();
}

function movePlaybackSection(direction) {
    const song = activeSong();
    if (!song || !song.playable) return;

    const currentIndex = Math.max(0, song.sections.findIndex(section => section.id === state.activeSectionId));
    const nextIndex = clamp(currentIndex + direction, 0, song.sections.length - 1);
    const nextSection = song.sections[nextIndex];
    if (!nextSection) return;

    state.activeSectionId = nextSection.id;
    state.activeSubsectionId = nextSection.subsections[0]?.id || null;

    const timeline = buildTimeline(song);
    const timelineIndex = timeline.findIndex(item => item.sectionId === nextSection.id);
    if (timelineIndex >= 0) {
        state.player.chordIndex = timelineIndex;
        state.player.beatsLeftInChord = timeline[timelineIndex].beats;
        state.player.beatInBar = 0;
        state.player.countdownBeatsLeft = 0;
        state.player.pendingChordStart = false;
        postChord(timeline[timelineIndex].chord);
        highlightActiveChord();
    }

    renderEditor();
}

function tickPlayer() {
    const song = activeSong();
    const timeline = buildTimeline(song);
    if (!song || !timeline.length) {
        stopSong();
        return;
    }

    if (state.player.countdownBeatsLeft > 0) {
        pulseBeat(song);
        playClick(state.player.beatInBar === 0);
        state.player.countdownBeatsLeft -= 1;
        state.player.beatInBar = state.player.countdownBeatsLeft > 0
            ? (state.player.beatInBar + 1) % (song.beatsPerBar || 4)
            : 0;
        return;
    }

    if (state.player.beatsLeftInChord <= 0) {
        state.player.chordIndex += 1;
        if (state.player.chordIndex >= timeline.length) {
            stopSong();
            return;
        }
        state.player.beatsLeftInChord = timeline[state.player.chordIndex].beats;
        postChord(timeline[state.player.chordIndex].chord);
        highlightActiveChord();
    }

    if (state.player.pendingChordStart) {
        state.player.pendingChordStart = false;
        postChord(timeline[state.player.chordIndex].chord);
        highlightActiveChord();
    }

    pulseBeat(song);
    playClick(state.player.beatInBar === 0);

    state.player.beatsLeftInChord -= 1;
    updatePlaybackCountdown();

    state.player.beatInBar = (state.player.beatInBar + 1) % (song.beatsPerBar || 4);
    maybeRandomize(song);
}

function playClick(isBarStart) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!state.player.audio) state.player.audio = new AudioContext();

    const context = state.player.audio;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = isBarStart ? 1200 : 820;
    gain.gain.setValueAtTime(0.001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.055);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.06);
}

function maybeRandomize(song) {
    const enabled = document.getElementById('random-playback').checked;
    if (!enabled || state.player.beatInBar !== 0) return;

    state.player.randomBarsUntilNext -= 1;
    if (state.player.randomBarsUntilNext > 0) return;

    const everyBars = clamp(Number(document.getElementById('random-bars').value) || 4, 1, 16);
    state.player.randomBarsUntilNext = everyBars;
    const chord = randomChord();
    document.getElementById('random-output').textContent = chord;
    postChord(transposeChord(chord, song.transpose || 0));
}

function buildTimeline(song) {
    if (!song) return [];
    const beatsPerBar = song.beatsPerBar || 4;
    return song.sections.flatMap(section => section.subsections.flatMap(subsection => {
        syncSubsectionRepetitionData(subsection);
        const rows = [];
        const rowCount = chordLineCount(subsection);
        for (let rowStart = 0; rowStart < (subsection.chords || []).length; rowStart += 5) {
            const rowIndex = Math.floor(rowStart / 5);
            const rowChords = subsection.chords.slice(rowStart, rowStart + 5);
            const repetitions = rowIndex === rowCount - 1
                ? normalizeLineRepetition(subsection.chordLineRepetitions[rowIndex])
                : 1;
            for (let repetition = 0; repetition < repetitions; repetition += 1) {
                rowChords.forEach(chord => {
                    rows.push({
                        sectionId: section.id,
                        subsectionId: subsection.id,
                        chordId: chord.id,
                        chord: transposeChord(chord.name, song.transpose || 0),
                        beats: Math.max(1, Math.round((chord.bars || 1) * beatsPerBar))
                    });
                });
            }
        }
        return rows;
    }));
}

function countdownBeatCount(song) {
    return normalizeCountdown(song?.countdown) * (song?.beatsPerBar || 4);
}

function highlightActiveChord() {
    const timeline = buildTimeline(activeSong());
    const active = timeline[state.player.chordIndex];
    document.querySelectorAll('.chord-token').forEach(token => {
        token.classList.toggle('playing', Boolean(active && token.dataset.chordId === active.chordId));
    });
    updatePlaybackCountdown();
}

function resetPlaybackWheelLabels() {
    document.querySelectorAll('.chord-token .chord-bars').forEach(wheel => {
        if (wheel._wheelConfig) {
            updateNumberWheel(wheel, Number(wheel.dataset.value));
        }
    });
}

function updatePlaybackCountdown() {
    resetPlaybackWheelLabels();
    if (!state.player.playing) return;

    const active = buildTimeline(activeSong())[state.player.chordIndex];
    if (!active) return;

    document.querySelectorAll(`.chord-token[data-chord-id="${active.chordId}"] .chord-bars .wheel-number.current`).forEach(number => {
        number.textContent = String(Math.max(0, state.player.beatsLeftInChord));
    });
}

function postChord(chord) {
    if (!state.locked) return;
    window.parent.postMessage({ type: 'songwriter:setChord', chord }, '*');
}
