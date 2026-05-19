# Picky Music Notes

A static chord-learning and songwriting website with chord browsing, fretboard views, local song editing, and Supabase-backed cloud features.

## Features

- Chord browser with notes, chord types, and variants.
- Interactive guitar fretboard and scale tools.
- Songwriter screen with local browser storage.
- Optional account and cloud-song features through Supabase.
- Responsive layout for desktop and mobile.

## Project Structure

```text
pickymusicnotes/
├── index.html
├── css/
├── js/
├── data/
├── chordscreen/
├── recordplayer/
├── songwriter/
├── local-server.js
├── GITHUB_DEPLOY.md
└── README.md
```

## Local Development

Open `index.html` directly for a quick preview, or run the local Node server when testing local API helpers:

```bash
node local-server.js
```

Then visit:

```text
http://127.0.0.1:8001/
```

## Deployment to GitHub Pages

This project deploys as a static site through GitHub Actions.

1. Push the repository to GitHub.
2. In the repository, open **Settings** -> **Pages**.
3. Set **Source** to **GitHub Actions**.
4. Push to `main`.

The workflow in `.github/workflows/pages.yml` publishes the repo root. See `GITHUB_DEPLOY.md` for the full setup and custom-domain notes.

## Static Hosting Notes

GitHub Pages does not run `local-server.js`, so `/api/active-visitors` and `/api/songs` are local-development helpers only. On Pages, song edits still persist in browser storage, and cloud-account features use Supabase.
