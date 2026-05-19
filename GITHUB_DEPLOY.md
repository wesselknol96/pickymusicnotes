# GitHub Pages Deployment Guide for Picky Music Notes

This project is a static website, so GitHub Pages can host it directly from the repository.

## First-Time Setup

1. Create a GitHub repository.
2. Add the repository as your remote:

```bash
git remote add origin https://github.com/YOUR-USERNAME/pickymusicnotes.git
```

3. Push the `main` branch:

```bash
git push -u origin main
```

4. In GitHub, open the repository settings.
5. Go to **Pages**.
6. Under **Build and deployment**, set **Source** to **GitHub Actions**.

The workflow in `.github/workflows/pages.yml` will publish the site whenever you push to `main`.

## Site URL

For a normal project repository, GitHub Pages will publish at:

```text
https://YOUR-USERNAME.github.io/pickymusicnotes/
```

For a user or organization site repository named `YOUR-USERNAME.github.io`, it will publish at:

```text
https://YOUR-USERNAME.github.io/
```

## Custom Domain

In GitHub Pages settings:

1. Add your custom domain, such as `pickymusicnotes.com`.
2. Follow GitHub's DNS instructions for your domain registrar.
3. Enable **Enforce HTTPS** after DNS has finished propagating.

## Notes

- GitHub Pages only serves static files.
- The local `local-server.js` endpoints are for local development and are not available on GitHub Pages.
- Song edits are still saved in the browser and cloud account features still use Supabase.
- A request/contact form needs a separate service or backend when hosted on GitHub Pages.

## Troubleshooting

If the site shows a 404, confirm that:

- The repository pushed successfully.
- GitHub Pages source is set to **GitHub Actions**.
- The latest workflow run completed successfully.
- `index.html` is in the repository root.
