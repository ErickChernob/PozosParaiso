# Deployment Guide — Pozos Paraíso

This guide covers uploading `public_html_ready/` (or the equivalent
`public_html_ready.zip`) to a traditional Apache/cPanel host — Hostinger,
GoDaddy, or any similar shared hosting provider. No build step, no database,
no Node.js — every file is deployed exactly as it is in this repository.

---

## 1. Back up the current hosting before touching anything

Even if the current live site is old, broken, or a placeholder, back it up
first so there is always a way back.

1. Log in to your host's control panel (cPanel, hPanel on Hostinger, or
   GoDaddy's hosting dashboard).
2. Open **File Manager**, navigate to `public_html`, select everything
   inside it, and use the built-in **Compress / Zip** action to create one
   archive (e.g. `public_html_backup_YYYY-MM-DD.zip`). Download that archive
   to your own computer and keep it somewhere safe — don't rely on it staying
   on the server.
3. If a database was in use for the old site (this project doesn't use one,
   but check in case something else was previously deployed to this hosting
   account), export it via phpMyAdmin (**Export → Quick → Go**) and download
   the `.sql` file too.
4. Only proceed to step 2 once you have that backup downloaded locally.

## 2. Upload the files

Two options — pick whichever your host makes easier.

### Option A — File Manager (no FTP client needed)
1. In cPanel/hPanel File Manager, navigate into `public_html`.
2. If this is replacing an existing site, delete or move aside the old
   files first (after confirming step 1's backup succeeded).
3. Upload `public_html_ready.zip` directly into `public_html`.
4. Right-click the uploaded zip and choose **Extract**. Make sure it
   extracts its contents directly into `public_html`, not into a new
   `public_html_ready/` subfolder — see step 3 below for how to check this.
5. Delete the uploaded `.zip` file afterward (no need to leave it on the
   server).

### Option B — FTP/SFTP client (FileZilla, Cyberduck, etc.)
1. Get your FTP/SFTP credentials from your host's control panel (host,
   username, password, port — usually 21 for FTP or 22 for SFTP).
2. Connect, then navigate to `public_html` on the remote side.
3. Extract `public_html_ready.zip` **locally on your own computer first**,
   then upload the *contents* of the extracted `public_html_ready/` folder
   (not the folder itself) into `public_html`.
4. Upload everything, including the `.htaccess` file — FTP clients
   sometimes hide dotfiles by default; make sure "show hidden files" is
   enabled so `.htaccess` actually transfers. Missing `.htaccess` means the
   HTTPS/www redirects, custom 404, and caching/compression rules silently
   won't work.

## 3. Where index.html must be located

`index.html` must sit **directly inside `public_html`**, not inside a
subfolder:

```
public_html/
  index.html        <- correct
  contacto.html
  nosotros.html
  404.html
  css/
  js/
  images/
  fonts/
  php/
  .htaccess
  robots.txt
  sitemap.xml
```

If you instead end up with `public_html/public_html_ready/index.html` or
`public_html/independent-static-site/index.html`, the domain will show a
directory listing or a 404 instead of the site — move everything up one
level so `index.html` is at the top.

## 4. Configure the domain

- If the domain is already pointed at this hosting account (nameservers or
  A record already set), no DNS change is needed — just make sure the
  domain's document root is `public_html` (the default on virtually all
  cPanel/Hostinger/GoDaddy shared hosting).
- If this is a new domain, point its nameservers (or A record) to the
  hosting provider per their instructions, and wait for DNS propagation
  (can take anywhere from a few minutes to ~24 hours).
- **Confirm the real production domain matches what's hardcoded in this
  project.** The domain `pozosparaiso.com` (non-www) was *inferred* from the
  site's own published email addresses, not confirmed by anyone — it appears
  in `.htaccess`, `robots.txt`, `sitemap.xml`, and the `<link rel="canonical">`
  / Open Graph / Twitter meta tags in `index.html`, `nosotros.html`, and
  `contacto.html`. If the real domain is different (or should be the `www.`
  version instead of non-www), update those files before or right after
  upload. See `MIGRATION_NOTES.md` §5 for the exact list of places.

## 5. Verify SSL

1. Most cPanel hosts (including Hostinger and GoDaDaddy) offer a free
   **AutoSSL** or **Let's Encrypt** option — enable it from the control
   panel's SSL/TLS section for this domain if it isn't already active.
   Issuance is usually automatic within a few minutes once DNS is pointed
   correctly.
2. Visit `https://yourdomain.com/` in a browser and confirm the padlock
   icon shows a valid certificate (click it → "Certificate is valid").
3. Also test `http://yourdomain.com/` (plain HTTP) and confirm it
   automatically redirects to `https://` — this is handled by `.htaccess`,
   but only takes effect if `mod_rewrite` is enabled on the server (it is by
   default on essentially all cPanel hosts).
4. Test both `https://www.yourdomain.com/` and `https://yourdomain.com/`
   and confirm one of them 301-redirects to the other (whichever is set as
   canonical in `.htaccess` — non-www by default in this project).

## 6. Clear hosting cache

- If the host uses a server-side cache/CDN layer (cPanel's "LiteSpeed
  Cache" plugin, Hostinger's built-in caching, Cloudflare if it's in front
  of the domain, etc.), purge/clear it after uploading so visitors don't see
  a stale cached version of the old site.
- This project's own `.htaccess` sets short/moderate browser cache
  lifetimes for CSS/JS (1 week) and images (1 month) specifically so that
  future updates don't get stuck in visitors' *browser* caches for too
  long — but a host-level cache is separate and needs to be purged manually
  through the host's own control panel.
- If using Cloudflare or a similar CDN, also purge its cache and consider
  temporarily setting the caching level to "Bypass" while verifying the
  deployment, then restoring normal caching afterward.

## 7. Test the site after deployment

Work through this checklist on the live domain:

- [ ] `https://yourdomain.com/` loads and looks correct (compare against
      the screenshots/description in `FINAL_QA_REPORT.md`).
- [ ] `https://yourdomain.com/nosotros.html` and `.../contacto.html` load.
- [ ] The mobile hamburger menu opens/closes (resize the browser or test on
      an actual phone).
- [ ] The photo gallery slider on the home and "Nosotros" pages advances
      (arrows, dots, and autoplay).
- [ ] The contact form actually **sends an email** — submit a real test
      message on `contacto.html` and confirm it arrives at
      `jose.garduno@pozosparaiso.com` / `enrique.murcio@pozosparaiso.com`
      (check spam folders the first time). This is the one piece of
      functionality that could not be tested end-to-end before deployment,
      since it depends on the live server's mail configuration — see
      `MIGRATION_NOTES.md` §3.
- [ ] Visiting a nonexistent page (e.g. `https://yourdomain.com/xyz`) shows
      the custom 404 page, not a generic server error or blank page.
- [ ] Open the browser's developer console (F12) on each page and confirm
      there are no red errors and no failed (404) network requests.
- [ ] `https://yourdomain.com/robots.txt` and `.../sitemap.xml` both load.

## 8. How to roll back if necessary

If something goes wrong after deployment:

1. In File Manager (or via FTP), delete everything currently in
   `public_html`.
2. Re-upload and extract the backup archive created in step 1
   (`public_html_backup_YYYY-MM-DD.zip`) into `public_html`.
3. If a database was restored as part of step 1, re-import the `.sql`
   backup via phpMyAdmin.
4. Purge any host-level or CDN cache again (step 6) so the rollback is
   visible immediately instead of serving a cached version of the broken
   deployment.
5. If only specific files were the problem (rather than needing a full
   rollback), the original, untouched Webflow export is preserved in this
   project's `webflow-export/` folder and the pre-optimization version is
   fully recoverable from this repository's git history — no work is lost
   either way.
