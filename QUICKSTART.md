# Quick Start Guide

## Local Preview

For the fastest preview, open `index.html` in a browser.

For server-based local testing, run:

```bash
node local-server.js
```

Then open:

```text
http://127.0.0.1:8001/
```

## Deploy to GitHub Pages

1. Create a GitHub repository.
2. Push this project to the `main` branch.
3. In GitHub, open **Settings** -> **Pages**.
4. Set **Source** to **GitHub Actions**.
5. The included workflow publishes the site after each push.

See `GITHUB_DEPLOY.md` for detailed steps and custom-domain notes.

## What Is Included

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
