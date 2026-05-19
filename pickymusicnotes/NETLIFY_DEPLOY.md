# Netlify Deployment Guide for pickymusicnotes.com

## Prerequisites

- Your project folder locally
- A GitHub account (optional but recommended)
- Netlify account (free at netlify.com)

## Quick Start (Easiest Method)

### Step 1: Prepare Your Project
Ensure your folder structure looks like this:
```
pickymusicnotes/
├── index.html
├── css/styles.css
├── js/app.js
├── data/guitar.json
└── README.md
```

### Step 2: Deploy via Drag & Drop
1. Visit [app.netlify.com](https://app.netlify.com)
2. Sign up or log in to your Netlify account
3. Look for "Deploys" section
4. Drag your entire `pickymusicnotes` folder into the drop zone
5. Your site is now live! (Netlify will give you a URL like `peaceful-name-12345.netlify.app`)

### Step 3: Connect Your Domain
1. Go to your Netlify dashboard
2. Find your site
3. Click "Site settings"
4. Scroll to "Domain management"
5. Click "Add custom domain"
6. Enter `pickymusicnotes.com`
7. Follow the instructions to update your domain's DNS settings

## GitHub Integration (Recommended for Updates)

### Setup (First Time)
1. Create a GitHub repository for your project
2. Push your code to GitHub
3. Visit [netlify.com](https://netlify.com)
4. Click "New site from Git"
5. Choose "GitHub"
6. Authorize Netlify
7. Select your repository
8. Click "Deploy site"

### Auto-Deploy When You Update
Once connected to GitHub:
- Every time you push changes, Netlify automatically redeploys
- Your site is always up-to-date
- No manual steps needed!

### Push to GitHub from Command Line

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Picky Music Notes website"

# Add remote repository (replace with your GitHub repo URL)
git remote add origin https://github.com/yourusername/pickymusicnotes.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Using Netlify CLI (Advanced)

### Install
```bash
npm install -g netlify-cli
```

### Deploy
```bash
# Navigate to your project
cd path/to/pickymusicnotes

# Login to Netlify
netlify login

# Deploy (preview)
netlify deploy

# Deploy to production
netlify deploy --prod
```

## DNS Configuration

After adding your custom domain in Netlify, update your domain registrar's DNS:

### If registrar supports Netlify DNS (Easiest)
1. Go to your domain registrar (GoDaddy, Namecheap, etc.)
2. Update nameservers to Netlify's:
   - ns1.netlify.com
   - ns2.netlify.com
   - ns3.netlify.com
   - ns4.netlify.com

### Manual DNS Records (If above doesn't work)
Contact your registrar's support or check their documentation for adding:
- **Type:** A Record
- **Name:** @ or leave blank
- **Value:** IP provided by Netlify
- **TTL:** 3600 (or default)

Then add a CNAME for www:
- **Type:** CNAME
- **Name:** www
- **Value:** your-site-name.netlify.app

## Troubleshooting

### Site shows 404 errors
- Ensure `index.html` is in the root directory
- Check file paths in HTML (use relative paths like `css/styles.css`)

### Styles not loading
- Verify CSS file exists at `css/styles.css`
- Check browser console for errors (F12 → Console)
- Check file permissions

### JavaScript errors
- Open browser console (F12)
- Look for error messages
- Check that `data/guitar.json` exists
- Verify JSON file is valid (use jsonlint.com)

### Custom domain not working
- DNS changes can take 24-48 hours to propagate
- Clear browser cache (Ctrl+Shift+Delete)
- Check Netlify's DNS configuration is correct

## Environment Variables (Advanced)

If you need to add API keys later:

1. Go to your Netlify site settings
2. Click "Build & deploy" → "Environment"
3. Add key-value pairs
4. Access in JavaScript via API calls (not directly in JS)

## Performance Tips

1. **Images**: Use optimized formats (WebP when possible)
2. **CSS**: Already minified in production
3. **JavaScript**: Already optimized for performance
4. **Caching**: Netlify handles this automatically

## SSL Certificate

Netlify provides free HTTPS automatically:
- Your site is secure by default
- No additional setup needed
- Redirects HTTP → HTTPS

## Update Your Site

### Via GitHub (Recommended)
```bash
# Make changes locally
# Then commit and push
git add .
git commit -m "Add more chords"
git push origin main

# Netlify automatically redeploys!
```

### Via Drag & Drop
Simply drag your updated folder to Netlify again to trigger a new deploy.

## Monitoring & Analytics

1. Go to your Netlify dashboard
2. Check "Deploys" to see deployment history
3. View "Analytics" to see visitor stats
4. Check "Functions" for any serverless function usage

## Support Resources

- **Netlify Docs**: https://docs.netlify.com
- **Community Forum**: https://community.netlify.com
- **Contact Support**: Available in your Netlify account settings

---

You're all set! 🎸 Your website should now be live at pickymusicnotes.com
