# Picky Music Notes - Chord Learning Website

A visually stunning website to learn and master chords across different instruments, starting with guitar.

## 🎸 Features

- **Beautiful UI**: Modern gradient design with smooth animations
- **Chord Browser**: Select notes, chord types, and variants
- **Visual Fretboard**: See chord positions on an interactive guitar fretboard
- **Quick Access**: Fast buttons to jump to common chords
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Instrument-Agnostic Architecture**: Easy to add piano, ukulele, bass, etc.

## 📁 Project Structure

```
pickymusicnotes/
├── index.html           # Main HTML file
├── css/
│   └── styles.css       # All styling (gradients, animations, layout)
├── js/
│   └── app.js           # Main application logic
├── data/
│   └── guitar.json      # Chord data for guitar
└── README.md            # This file
```

## 🎵 Data Structure (guitar.json)

The JSON file is organized hierarchically:

```json
{
  "notes": {
    "A": {
      "major": {
        "open chord": {
          "name": "A (Open Chord)",
          "frets": "0-0-2-2-2-0",
          "positions": [0, 0, 2, 2, 2, 0],
          "difficulty": "beginner"
        }
      }
    }
  }
}
```

### Notation Guide:
- `0` = Open string (don't press)
- `1-6` = Fret number to press
- `x` or `-1` = Muted string (don't play)
- Positions are read left-to-right (E-A-D-G-B-E for guitar)

## ➕ Adding New Chords

Simply add more entries to the guitar.json file following the same pattern:

```json
"C#": {
  "major": {
    "open chord": {
      "name": "C# (Open Chord)",
      "frets": "x-4-6-6-6-4",
      "positions": [-1, 4, 6, 6, 6, 4],
      "difficulty": "hard"
    }
  }
}
```

## 🎹 Adding New Instruments

To add a new instrument (e.g., Piano or Ukulele), follow these steps:

### 1. Update `config` in `app.js`:

```javascript
const config = {
    instruments: {
        guitar: { /* existing config */ },
        piano: {
            name: 'Piano',
            dataFile: 'data/piano.json',
            keys: 88,
            whiteKeys: 52,
            // ... other piano-specific config
        }
    }
};
```

### 2. Create new data file (e.g., `data/piano.json`):

Use a similar structure but with piano-specific data:

```json
{
  "notes": {
    "A": {
      "major": {
        "standard": {
          "name": "A Major",
          "keys": [49, 53, 57],
          "pattern": "A-C#-E"
        }
      }
    }
  }
}
```

### 3. Update HTML tabs in `index.html`:

Add a new button in the tabs section:

```html
<button class="tab-btn" data-instrument="piano">
    <span class="tab-icon">🎹</span>
    <span class="tab-text">Piano</span>
</button>
```

### 4. Create an instrument-specific draw function in `app.js`:

```javascript
function drawPiano(chord) {
    // Draw piano keys with highlighted notes
}
```

### 5. Update the `drawFretboard()` function to be instrument-aware:

Or create a dispatcher that calls the appropriate drawing function.

## 🚀 Deployment to Netlify

### Option 1: Using Netlify Drag & Drop

1. Go to [netlify.com](https://netlify.com)
2. Drag and drop your project folder
3. Done! Your site is live

### Option 2: Connect GitHub Repository

1. Push your project to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Click "New site from Git"
4. Connect your GitHub account
5. Select the repository
6. Click "Deploy"

### Option 3: Using Netlify CLI

```bash
# Install Netlify CLI (requires Node.js)
npm install -g netlify-cli

# Navigate to your project directory
cd pickymusicnotes

# Deploy
netlify deploy

# Or for production
netlify deploy --prod
```

## 🎨 Customization

### Change Colors

Edit the gradient colors in `css/styles.css`:

```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

Try out colors at [coolors.co](https://coolors.co)

### Adjust Fretboard Display

In `drawFretboard()` function in `js/app.js`, modify:

```javascript
const fretCount = 6;          // Number of visible frets
const dotRadius = 10;         // Size of position dots
```

### Change Responsive Breakpoints

Look for `@media` queries in `css/styles.css` to adjust tablet/mobile layouts.

## 📊 Expected Chord Count

The guitar.json currently contains ~30 common chords. You can expand it to 2000+ by:

1. Adding more notes (including sharps/flats like C#, F#, etc.)
2. Adding more chord types (dim, aug, add9, sus2, etc.)
3. Adding more variants (different bar positions, alternatives)

Example structure for expansion:

```
Notes: 12 (C, C#, D, D#, E, F, F#, G, G#, A, A#, B)
Types: 15+ (major, minor, sus2, sus4, 7, 9, m7, maj7, dim, aug, add9, etc.)
Variants: 3-5 per combination (open, bar, alternate fingerings)

Total: 12 × 15 × 4 = 720+ chords (easily expandable to 2000+)
```

## 🎯 Future Enhancements

- [ ] Audio playback of chords
- [ ] Search and filtering by difficulty
- [ ] User progress tracking
- [ ] Video tutorials for each chord
- [ ] Mobile app version
- [ ] Multiple instruments on one screen
- [ ] Chord progressions trainer
- [ ] Dark mode theme

## 📝 License

Feel free to use and modify this project for your needs!

## 🤝 Contributing

To expand the chord library or add new features, simply:

1. Add more data to the JSON files
2. Update the UI if needed
3. Test thoroughly across devices

Happy learning! 🎸
