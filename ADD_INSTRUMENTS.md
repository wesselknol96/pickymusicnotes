# Adding New Instruments - Implementation Guide

This guide shows you how to add piano, ukulele, bass, and other instruments to your website.

## Architecture Overview

The app uses a modular instrument system:

1. **Configuration** (`config` object in app.js)
2. **Data Files** (e.g., `data/guitar.json`, `data/piano.json`)
3. **UI Tabs** (buttons in index.html)
4. **Rendering Functions** (instrument-specific drawing in app.js)

## 🎹 Adding Piano

### Step 1: Create Piano Configuration

Edit `js/app.js` and add to the `config` object:

```javascript
const config = {
    instruments: {
        guitar: { /* existing */ },
        piano: {
            name: 'Piano',
            dataFile: 'data/piano.json',
            octaves: 3,
            startOctave: 1,
            whiteKeyWidth: 50,
            whiteKeyHeight: 200,
            blackKeyWidth: 32,
            blackKeyHeight: 130
        }
    }
};
```

### Step 2: Create Piano Data File

Create `data/piano.json`:

```json
{
  "notes": {
    "C": {
      "major": {
        "root position": {
          "name": "C Major",
          "keys": ["C", "E", "G"],
          "octaves": [1, 1, 1],
          "fingers": "1-3-5"
        },
        "first inversion": {
          "name": "C Major (First Inversion)",
          "keys": ["E", "G", "C"],
          "octaves": [1, 1, 2],
          "fingers": "1-3-5"
        }
      },
      "minor": {
        "root position": {
          "name": "C Minor",
          "keys": ["C", "Eb", "G"],
          "octaves": [1, 1, 1],
          "fingers": "1-3-5"
        }
      }
    }
  }
}
```

### Step 3: Add HTML Tab

In `index.html`, add to the tabs section:

```html
<button class="tab-btn" data-instrument="piano">
    <span class="tab-icon">🎹</span>
    <span class="tab-text">Piano</span>
</button>
```

### Step 4: Create Piano Drawing Function

In `js/app.js`, add after the `drawFretboard()` function:

```javascript
function drawPiano(chord) {
    const canvas = document.getElementById('fretboard-canvas');
    const ctx = canvas.getContext('2d');
    const pianoConfig = config.instruments.piano;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const whiteNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const blackNotes = ['C#', 'D#', 'F#', 'G#', 'A#'];
    
    let xPos = 30;
    const yStart = 50;
    
    // Draw white keys
    for (let i = 0; i < 21; i++) {
        const note = whiteNotes[i % 7];
        const x = xPos + (i * pianoConfig.whiteKeyWidth);
        
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.fillStyle = '#fff';
        ctx.fillRect(x, yStart, pianoConfig.whiteKeyWidth - 2, pianoConfig.whiteKeyHeight);
        ctx.strokeRect(x, yStart, pianoConfig.whiteKeyWidth - 2, pianoConfig.whiteKeyHeight);
        
        // Label
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(note, x + pianoConfig.whiteKeyWidth / 2 - 1, yStart + pianoConfig.whiteKeyHeight - 10);
    }
    
    // Draw black keys
    const blackKeyPositions = [0.6, 1.6, 2.6, 3.6, 4.6];
    for (let octave = 0; octave < 3; octave++) {
        blackKeyPositions.forEach((pos, index) => {
            if ((index !== 2 && index !== 4) || index === 2) { // Skip E-F and B-C gaps
                const x = xPos + ((octave * 7 + pos) * pianoConfig.whiteKeyWidth);
                ctx.fillStyle = '#1a1a1a';
                ctx.fillRect(x, yStart, pianoConfig.blackKeyWidth, pianoConfig.blackKeyHeight);
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 1;
                ctx.strokeRect(x, yStart, pianoConfig.blackKeyWidth, pianoConfig.blackKeyHeight);
            }
        });
    }
    
    // Highlight chord notes
    if (chord && chord.keys) {
        chord.keys.forEach((key, index) => {
            // Find and highlight the key
            // Implementation depends on your UI preferences
        });
    }
}
```

### Step 5: Update Draw Dispatcher

Modify the display logic to call the right function:

```javascript
function displayChord(chord) {
    if (!chord) return;
    
    appState.currentChord = chord;
    document.getElementById('chord-name').textContent = chord.name || 'Unknown Chord';
    document.getElementById('fret-notation').textContent = chord.frets || chord.keys.join('-');
    
    // Call appropriate drawing function based on instrument
    if (appState.currentInstrument === 'guitar') {
        drawFretboard(chord);
    } else if (appState.currentInstrument === 'piano') {
        drawPiano(chord);
    }
}
```

---

## 🎸 Adding Ukulele

### Create `data/ukulele.json`:

```json
{
  "notes": {
    "A": {
      "major": {
        "open chord": {
          "name": "A Major",
          "frets": "0-0-0-0",
          "positions": [0, 0, 0, 0],
          "difficulty": "beginner"
        }
      }
    }
  }
}
```

### Update `app.js` config:

```javascript
ukulele: {
    name: 'Ukulele',
    dataFile: 'data/ukulele.json',
    strings: 4,
    frets: 12,
    stringTuning: ['G', 'C', 'E', 'A']
}
```

### HTML Tab:

```html
<button class="tab-btn" data-instrument="ukulele">
    <span class="tab-icon">🎸</span>
    <span class="tab-text">Ukulele</span>
</button>
```

---

## 🎻 Adding Bass Guitar

### Create `data/bass.json`:

```json
{
  "notes": {
    "A": {
      "major": {
        "open chord": {
          "name": "A (Open)",
          "frets": "0-0-0-0",
          "positions": [0, 0, 0, 0],
          "difficulty": "beginner"
        }
      }
    }
  }
}
```

### Update `app.js` config:

```javascript
bass: {
    name: 'Bass',
    dataFile: 'data/bass.json',
    strings: 4,
    frets: 8,
    stringTuning: ['E', 'A', 'D', 'G']
}
```

---

## 🎷 Adding Saxophone or Winds

For single-note instruments:

### Create `data/saxophone.json`:

```json
{
  "notes": {
    "A": {
      "major": {
        "standard": {
          "name": "A Scale",
          "notes": ["A", "B", "C#", "D", "E", "F#", "G#"],
          "fingering": "diagram-url-or-description"
        }
      }
    }
  }
}
```

### Create a specialized drawing function:

```javascript
function drawSaxophoneFingers(chord) {
    // Display fingering chart instead of fretboard
}
```

---

## 📋 Checklist for Adding New Instruments

- [ ] Add configuration to `config.instruments`
- [ ] Create data JSON file in `data/`
- [ ] Add HTML tab button with icon
- [ ] Create appropriate drawing function
- [ ] Update `displayChord()` to dispatch correctly
- [ ] Update CSS if needed for different display sizes
- [ ] Test all chord selections
- [ ] Verify quick access buttons work
- [ ] Test responsive design
- [ ] Document in README.md

---

## 🎯 Styling Tips for New Instruments

Add instrument-specific CSS classes:

```css
.instrument-piano {
    /* Piano-specific styles */
}

.instrument-ukulele {
    /* Ukulele-specific styles */
}

/* Hide/show content based on active instrument */
.instrument-guitar #fretboard-canvas {
    display: block;
}

.instrument-piano #piano-keys {
    display: block;
}
```

---

## Performance Considerations

- Load only active instrument's data
- Cache rendered chords
- Use efficient canvas drawing
- Consider WebGL for complex visualizations
- Optimize JSON file sizes

---

## Advanced: Instrument-Specific Features

### Piano-Only Features
- Show hand position indicators
- Display chord symbols (Roman numerals)
- Show all possible voicings

### Guitar/Bass-Only Features
- Show strumming patterns
- Display fingering difficulty ratings
- Show finger pressure (light/heavy)

### All Instruments
- Audio playback of chords
- MIDI export
- Recording functionality

---

Start with piano or ukulele—they follow similar patterns to guitar! 🎵
