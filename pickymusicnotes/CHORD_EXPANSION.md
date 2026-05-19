# Expanding the Chord Database

This guide will help you grow the guitar.json from ~30 chords to 2000+ chords efficiently.

## Current Structure

```
12 Notes × ~15 Chord Types × ~3-4 Variants = 540-720 possible combinations
```

## 📊 Chord Types to Include

### Triads (3 notes) - Essential
- `major` - Major chord (1-3-5)
- `minor` - Minor chord (1-b3-5)
- `augmented` - Augmented (1-3-#5)
- `diminished` - Diminished (1-b3-b5)

### Suspended Chords
- `sus2` - Suspended 2nd (1-2-5)
- `sus4` - Suspended 4th (1-4-5)

### Seventh Chords
- `dominant7` - Dominant 7th (1-3-5-b7)
- `major7` - Major 7th (1-3-5-7)
- `minor7` - Minor 7th (1-b3-5-b7)
- `minor7b5` - Half-diminished (1-b3-b5-b7)

### Extended & Altered
- `add9` - Add 9th (1-3-5-9)
- `add11` - Add 11th (1-3-5-11)
- `add13` - Add 13th (1-3-5-13)
- `flat9` - Flat 9 (b9)
- `sharp9` - Sharp 9 (#9)
- `flat5` - Flat 5 (b5)

## 🎸 Variants for Each Chord

For each chord type, include these variants:

### Common Variants
- `open chord` - Easy fingering from the open position
- `bar chord (1st fret)` - Bar on 1st fret
- `bar chord (3rd fret)` - Bar on 3rd fret
- `bar chord (5th fret)` - Bar on 5th fret
- `bar chord (8th fret)` - Bar on 8th fret
- `alternate 1` - Alternative fingering
- `alternate 2` - Another alternative
- `inverted` - Different inversions

## 📝 Notes to Include

```
C, C#/Db, D, D#/Eb, E, F, F#/Gb, G, G#/Ab, A, A#/Bb, B
```

You can represent these two ways:
```json
"C#": { /* chords */ }
"Db": { /* same chords as C# */ }
```

Or use a naming convention and handle in JavaScript:
```json
"C": { "variants": { ... } },
"C#": { "variants": { ... } }
```

## 🚀 Expansion Strategy

### Phase 1: Essential Chords (50-100)
Start with major, minor, and 7th chords for all 12 notes in open position.

### Phase 2: Common Variants (200-300)
Add bar chord versions for each at different frets, and sus2/sus4.

### Phase 3: Extended Library (500-800)
Add all chord types from the list above with multiple variants.

### Phase 4: Advanced Voicings (1000+)
Add:
- Higher fret positions (up to 12th fret)
- Inversions (bass notes)
- Alternative fingerings
- Less common variants

## 📋 JSON Template for Expansion

```json
{
  "notes": {
    "C": {
      "major": {
        "open chord": {
          "name": "C Major",
          "frets": "x-3-2-0-1-0",
          "positions": [-1, 3, 2, 0, 1, 0],
          "difficulty": "beginner",
          "description": "Most common C major voicing"
        },
        "bar chord (3rd fret)": {
          "name": "C Major (Bar - 3rd Fret)",
          "frets": "3-3-5-5-5-3",
          "positions": [3, 3, 5, 5, 5, 3],
          "difficulty": "intermediate"
        }
      },
      "minor": {
        "open chord": {
          "name": "C Minor",
          "frets": "x-3-5-5-4-3",
          "positions": [-1, 3, 5, 5, 4, 3],
          "difficulty": "intermediate"
        }
      },
      "major7": {
        "open chord": {
          "name": "Cmaj7",
          "frets": "x-3-2-0-0-0",
          "positions": [-1, 3, 2, 0, 0, 0],
          "difficulty": "beginner"
        }
      },
      "dominant7": {
        "open chord": {
          "name": "C7",
          "frets": "x-3-2-3-1-0",
          "positions": [-1, 3, 2, 3, 1, 0],
          "difficulty": "intermediate"
        }
      }
    }
  }
}
```

## 💻 Efficient Data Generation

### Create a Generator Script

```javascript
// generateChords.js
const chords = {
  "notes": {}
};

const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const types = ['major', 'minor', 'sus2', 'sus4', 'dominant7', 'major7', 'minor7'];
const variants = ['open chord', 'bar chord (1st)', 'bar chord (5th)'];

notes.forEach(note => {
  chords.notes[note] = {};
  
  types.forEach(type => {
    chords.notes[note][type] = {};
    
    variants.forEach(variant => {
      chords.notes[note][type][variant] = {
        name: `${note} ${type} (${variant})`,
        frets: generateFrets(note, type, variant),
        positions: generatePositions(note, type, variant),
        difficulty: calculateDifficulty(variant)
      };
    });
  });
});

console.log(JSON.stringify(chords, null, 2));
```

## 📈 Scaling Tips

1. **Automation**: Use scripts to generate variations
2. **Validate**: Use [jsonlint.com](https://jsonlint.com) to verify syntax
3. **Version Control**: Track changes with Git
4. **Test**: Verify all chords display correctly
5. **Categories**: Add metadata like:
   - `difficulty`: beginner/intermediate/advanced
   - `style`: acoustic/electric/fingerpicking
   - `description`: helpful notes

## 🎯 Quality Checklist

For each chord, verify:
- [ ] Correct fret positions
- [ ] Valid notation (0, 1-6, x/X)
- [ ] Readable name
- [ ] Appropriate difficulty rating
- [ ] At least 1-2 common variants
- [ ] No syntax errors in JSON

## 📚 Resources

- **Guitar Chord Library**: justinguitar.com/guitar-chords
- **Chords Database**: chordify.net
- **Wikipedia**: en.wikipedia.org/wiki/Chord_(music)
- **Music Theory**: musictheory.net

## Future Ideas

Once you have 2000+ chords:
- Add chord progressions (e.g., I-IV-V-I)
- Create practice routines by difficulty
- Add voice leading hints
- Include time signatures
- Add strumming patterns
- Create song examples using the chords

---

Start small, expand gradually, and test often! 🎸
