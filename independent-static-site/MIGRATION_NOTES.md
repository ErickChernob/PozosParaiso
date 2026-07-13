# Migration Notes — Pozos Paraíso (Webflow export → independent static site)

This document records what changed when `webflow-export/` (the original, untouched
Webflow code export) was converted into `independent-static-site/` (this project):
a framework-free HTML/CSS/JS site meant to be uploaded as-is into an Apache
`public_html` directory. No visual redesign was performed — the goal throughout
was byte-for-byte content parity and pixel-level visual parity, with only the
underlying platform dependencies swapped out.

`webflow-export/` is left completely unmodified as a rollback reference. Nothing
in this document required touching it.

---

## 1. Removed Webflow dependencies

| Removed | Replaced with |
|---|---|
| `js/webflow.js` (Webflow runtime: navbar, slider, IX/interactions, forms, touch/focus/links modules) | `js/main.js` — hand-written vanilla JS (see §2) |
| `<script src="https://d3e54v103j8qbb.cloudfront.net/js/jquery-3.5.1...">` (Webflow-CDN-pinned jQuery) | Nothing — `main.js` has zero dependencies, jQuery was only ever used internally by `webflow.js`'s own modules |
| `<script src="https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js">` + inline `WebFont.load(...)` call | `css/fonts.css` — self-hosted `@font-face` rules (see §4) |
| `<link rel="preconnect" href="https://fonts.googleapis.com">` / `fonts.gstatic.com` | Removed — no longer fetching anything from Google at runtime |
| `<html data-wf-page="…" data-wf-site="…">` | Removed — Webflow project/site IDs, meaningless off-platform |
| `<meta name="generator" content="Webflow">` | Removed |
| `<!-- This site was created in Webflow... -->` / `<!-- Last Published: ... -->` HTML comments | Removed |
| `data-wf-page-id` / `data-wf-element-id` / `data-name="Email Form"` etc. on the contact `<form>` | Removed — Webflow Designer/form-backend metadata, not used by anything |
| `data-doc-height`, `data-animation`, `data-easing`, `data-easing2` on the navbar | Removed — confirmed unused once the replacement nav JS/CSS was built and verified (kept `data-collapse` and `data-duration`, which the new JS/CSS genuinely read — see §2) |
| `.w-webflow-badge` CSS block ("Made in Webflow" badge styles) in `css/webflow.css` | Removed from `css/base.css`. The badge was never actually rendered by this export (no matching HTML element — it's only ever injected by Webflow's *own* hosted runtime), so this was dead, branding-specific CSS. |
| Internal icon-font family name `'webflow-icons'` | Renamed to `'pp-icons'` inside `css/base.css`. Purely a cosmetic identifier — the embedded base64 font glyphs (hamburger icon, slider arrows) are unchanged. Note: the font binary's own internal `name` table metadata still contains the string "webflow-icons" baked into the font file itself (invisible to users, not fixable without regenerating the font binary with a tool like FontForge — flagged for awareness, not fixed, since it renders nothing to anyone). |
| Inline `<style>` block with `.spinner` CSS (loading-spinner utility) in every page's `<head>` | Removed — confirmed dead: no element in any of the 3 pages ever had `class="spinner"`, and no `data-ix="preloader-fade-out"` element existed either. |

**Left in place, unpruned:** `css/base.css` (renamed from `webflow.css`) still contains the ~105 of ~129 selectors that are not used by this specific site (grid columns, dropdown, tabs, lightbox, file-upload, rich-text, background-video, CMS-binding classes, etc.), per the audit's explicit "don't remove CSS just because it looks unused — confirm usage across every page/breakpoint first, and don't optimize aggressively in this phase" guidance. Pruning that is a good candidate for a later, dedicated cleanup pass once the site has been live and verified for a while.

---

## 2. Replaced interactions

| Interaction | Old mechanism | New mechanism |
|---|---|---|
| Mobile nav open/close | `webflow.js` navbar module | `js/main.js` `initMobileNav()` — toggles a `.nav-open` class, driven by the *already-present* `data-collapse="medium"` / `data-duration="600"` attributes (base.css's original `[data-collapse='medium']` media-query rule still hides the menu by default below 991px; the JS/CSS only add what happens on open). Includes keyboard support (Enter/Space on the button), closes on outside click, `Escape`, choosing a link, or resizing past 991px. |
| Gallery slider (6 photos, `index.html` + `nosotros.html`) | `webflow.js` slider module | Originally a small hand-written flexbox + `transform: translateX()` carousel (`initSliders()`); **later replaced with the Splide library** after recurring bugs. See §11 — the row here is kept for historical record of the *first* replacement, from Webflow to hand-written JS. |
| Scroll-triggered fade/slide-in (hero titles, section titles, 4 service cards) | `webflow.js` "IX" (legacy Interactions 1.0) engine, whose full interaction config was extracted from inside the `webflow.js` bundle itself (see the original audit) | `IntersectionObserver` in `js/main.js` (`initScrollReveal()`) adds an `.is-visible` class the first time each `[data-ix="…"]` element scrolls into view; `css/interactions.css` defines the matching opacity/transform/transition values (including the original stagger delays: 250ms / 750ms / 1250ms / 1600ms for the 4 service cards) so the choreography matches the original as closely as CSS allows. |
| Hover-scale on the hero subtitle (Webflow's "Portfolio Interaction", targeting `.white`) | `webflow.js` IX hover trigger | Pure CSS `:hover` rule in `interactions.css`. **Found and fixed during testing:** the hero subtitle is *both* a hover target (`.white`) and a scroll-reveal target (`data-ix="title-slide-in-2"`), and both features set the `transform` property — the higher-specificity reveal rule was silently winning and the hover effect did nothing once the element had settled into view. Fixed with a combined, `:hover`-scoped selector that composes both transforms and restores a fast (400ms) transition just for the hover state, without touching the original reveal-in timing. |
| Smooth scroll for in-page nav/footer anchors (`#Inicio`, `#Nosotros`, `#Services`, `#Contact`) | `webflow.js` "links" module | CSS `scroll-behavior: smooth` on `<html>` (with a `prefers-reduced-motion` override to disable it for users who've asked for that) |
| Touch-device detection (`w-mod-touch` class) | `webflow.js` "touch" module + inline bootstrap script | A small inline bootstrap script (kept inline and blocking in `<head>`, same as the original, to avoid a flash of unstyled/unrevealed content) swaps `<html class="no-js">` to `class="js"`, and adds `class="touch"` when touch is detected. Nothing in the CSS currently depends on `.touch` (double-checked — the original didn't use it for anything visual either), so it's carried forward mainly for forward-compatibility if a future style needs it. |
| Contact form submission | Webflow's native form widget (`w-form`, AJAX POST to Webflow's own hosted backend via `data-wf-page-id`) — **this never actually worked once off Webflow's servers; see §3** | `php/send-form.php` (plain PHP, no libraries) + progressive-enhancement JS in `main.js`. See §3 for details. |

---

## 3. The contact form — read this before launch

The original export's form had **no working backend** once removed from Webflow
hosting — it POSTs to nowhere (no `action` attribute) and relies on Webflow's own
AJAX form-processing service, which isn't reachable from an independently-hosted
site. This was flagged as the #1 risk in the original audit and has been resolved
as follows:

- `php/send-form.php` validates the submission, rejects obvious spam via a
  honeypot field (a visually-hidden `name="company"` input real users never
  fill in), and sends the message via PHP's built-in `mail()` to the two
  addresses already published in the site footer (`jose.garduno@pozosparaiso.com`,
  `enrique.murcio@pozosparaiso.com`).
- The form now has `action="php/send-form.php" method="post"` and works with
  **JavaScript on or off**: `main.js` intercepts the submit and does it via
  `fetch()` (showing the existing "¡Gracias!" / error message divs in place,
  no page reload); if JS is unavailable, the browser does a normal form POST
  and the PHP script 302-redirects back to the referring page with
  `?form=success` or `?form=error`, which a small script in `main.js` reads on
  load to show the same message — but this fallback path itself needs no JS
  to *submit*, only to *display the styled confirmation message*; the email
  still sends either way.
- **This uses PHP** (`mail()`), which is the one explicitly-permitted exception
  in the task's "no PHP unless strictly required for an existing feature"
  rule — the contact form is an existing, published feature of the site, and
  there is no other zero-backend way to make it actually send an email without
  introducing a third-party account/service.

**Must be verified after deployment, not testable in this sandbox:** PHP's
`mail()` function depends on the hosting server having a working mail
transfer agent configured (sendmail/postfix/etc.). This sandbox has no MTA
installed, so `mail()` reliably returns `false` here — every other part of
the pipeline (validation, honeypot, the fetch/JSON handshake, the non-JS
redirect-with-query-param fallback) was verified working end-to-end via both
a real browser (Playwright) and direct `curl` requests; only the actual
outbound email send is unverified. Hostinger and GoDaddy shared hosting both
ship with a working `mail()` by default, but **send a real test submission
from the live site before considering this done**, and check the receiving
inboxes' spam folders the first time.

---

## 4. External dependencies

**Localized (now served from this project, no runtime network dependency):**

- **Fonts** — Montserrat, Vollkorn, Raleway, downloaded directly from Google's
  font CDN (`fonts.gstatic.com`) as 5 `.woff2` files in `fonts/`, all under the
  SIL Open Font License 1.1, which explicitly permits self-hosting/redistribution.
  All three families ship as *variable* fonts (confirmed via `fontTools`): one
  physical file per style (normal/italic) covers every weight, so `css/fonts.css`
  declares 5 `@font-face` rules with weight *ranges* (e.g. `100 900`) rather than
  the 26 individual pinned-weight rules Google's own CSS returns — functionally
  identical, just without needless duplication.
- **Images, icons, background assets** — all were already local in the original
  export; copied as-is into `images/` (see §6 for the one filename fix).
- **`webflow.js`, jQuery** — removed entirely; replaced with `js/main.js` (§2).

**Left external, on purpose (per the task's explicit instruction not to duplicate
these):**

- Nothing currently. The audit found **no** analytics, tracking pixels, embedded
  maps, video embeds, or WhatsApp links anywhere in this export — the "map" is a
  static screenshot image (`google-earth.png`), not a live embed, and there is no
  WhatsApp integration in the source project despite the task brief's assumption
  that one might exist. If any of these are added later, they should stay
  external per the task's own rule (don't self-host third-party trackers/widgets).

---

## 5. Files that must be reviewed manually before/at launch

- **`.htaccess`** — the HTTPS-force and www/non-www-consistency rules assume the
  production domain is `pozosparaiso.com` (non-www canonical). This was
  **inferred**, not confirmed: it's the domain used in the site's own published
  email addresses (`@pozosparaiso.com`), but nobody has stated the actual
  production domain. **Confirm the real domain before launch** and update:
  - `.htaccess` (the www/non-www `RewriteCond`)
  - `robots.txt` (`Sitemap:` line)
  - `sitemap.xml` (all three `<loc>` values)
  - the `<link rel="canonical">`, `og:url`, `og:image`, `twitter:image` tags in
    all 3 pages' `<head>` (6 occurrences total across `index.html`,
    `nosotros.html`, `contacto.html`)
- **`php/send-form.php`** — confirm the recipient addresses are still correct,
  and send a real test submission after deployment (see §3).
- **`images/logo-pozosparaiso-mobile.png`** — see §6; this file was renamed
  from a broken filename. If the client has a "real"/higher-res source file for
  this logo, it would be worth swapping in, since the recovered file is exactly
  whatever was in the original broken export.

---

## 6. Bugs found and fixed (pre-existing in the Webflow export, not introduced here)

These were flagged in the original audit and fixed as part of this migration,
not new issues introduced by decoupling:

1. **Broken mobile-logo image, on all 3 pages.** The HTML asked for
   `images/LogoPozosParaíso.png`; the actual file in the export was named
   `LogoPozosParai#U0301so.png` (a mangled Unicode filename — the accented
   character was serialized as literal text instead of the real character,
   apparently corrupted during Webflow's own export process). This image
   404'd in every browser, before any migration work. **Fixed**: the file was
   renamed to `images/logo-pozosparaiso-mobile.png` (clean ASCII, no special
   characters — see §7 for why that matters on some Apache configs) and the
   3 HTML references updated to match.
2. **Broken footer links.** On `nosotros.html`, the footer's "Servicios" and
   "Contacto" links pointed to `href="#"` instead of `index.html#Services` /
   `contacto.html`. On `contacto.html`, "Nosotros" and "Servicios" had the same
   problem. **Fixed** — now point to the correct pages/anchors.
3. **Inconsistent "go home" behavior for the header logo.** The logo link was
   `href="#"` on every page (scrolls to top of the *current* page rather than
   navigating home on `nosotros.html`/`contacto.html`). **Fixed** — now
   `href="index.html"` everywhere.

## 7. New bug found and fixed during this migration's own testing

- **No-JS mobile navigation lockout.** Early in testing, disabling JavaScript
  entirely (verified with Playwright's `javaScriptEnabled: false`) revealed that
  the mobile nav menu was permanently `display: none` below 991px with no way
  to open it — the collapse behavior is pure CSS (driven by
  `[data-collapse='medium']`, unchanged from the original), but the *opening*
  behavior was 100% dependent on the new nav JS. Without JS, mobile visitors
  would have had zero way to reach any other page. **Fixed** in
  `css/interactions.css`: a `.no-js .nav-menu { display: flex !important }`
  rule (paired with `.no-js .menu-button { display: none }`, since the
  now-nonfunctional hamburger button would otherwise be a dead-looking element)
  shows the menu open and stacked by default when JavaScript isn't running, so
  every link stays reachable — not collapsible without JS, but never
  inaccessible. This directly satisfies the "preserve progressive enhancement"
  requirement and is a strict improvement over the original Webflow export,
  which had the identical failure mode (confirmed by rendering the untouched
  `webflow-export/` copy through this session's network, where the
  Webflow-CDN-hosted jQuery file is blocked by the sandbox's outbound proxy —
  a concrete, real demonstration of exactly the fragility flagged in the
  original audit: the entire page's headings, subtitles, and service cards
  rendered invisible because the scroll-reveal engine never initialized without
  jQuery. That specific failure mode is now structurally impossible in the
  independent site, since nothing it does at runtime depends on any external
  network request.)

---

## 8. Known limitations

- **Mobile nav open/close is a simplified animation.** The original Webflow
  "over-right" interaction is a proprietary sliding overlay panel effect (it
  dynamically injects its own `.w-nav-overlay` wrapper element via JS). This
  was intentionally not reproduced pixel-for-pixel; the rebuilt menu instead
  fades/slides down into the existing document flow using the exact colors,
  fonts, and spacing already defined in `style.css`'s mobile breakpoints
  (visually and functionally equivalent, just a simpler open transition). This
  was called out as an acceptable simplification in the original audit's
  migration plan.
- **`.htaccess` behavior is unverified in this environment.** No Apache
  instance was available to test against in this sandbox (only PHP's built-in
  dev server, which does not process `.htaccess` at all). The file was
  hand-written to standard, conservative Apache/mod_rewrite syntax and
  reviewed carefully, but the HTTPS redirect, www/non-www redirect, custom
  404, and directory-listing prevention should all be spot-checked once this
  is live on real Apache hosting.
- **`mail()` sending is unverified** — see §3.
- **No legacy Webflow-subdomain redirects were added to `.htaccess`.** This
  project is a direct Designer export with no evidence it was ever published
  live on a `*.webflow.io` subdomain with a different URL structure, so there
  was nothing concrete to redirect from. If the site previously lived
  somewhere else with different URLs, add explicit rules before launch.
- **`css/base.css` still carries a large amount of unused Webflow-framework
  CSS** (grid columns, dropdown/tabs/lightbox/file-upload/rich-text styles
  this site never uses). Left in place deliberately per the task's "don't
  optimize aggressively in this phase" instruction — a good target for a later
  cleanup pass, not a functional problem today.
- **The icon-font binary's internal name metadata** still contains the string
  "webflow-icons" (see §1) — invisible to end users, not worth regenerating
  the font file to fix.

---

## 9. Deployment requirements

- Standard Apache shared hosting with PHP support (Hostinger, GoDaddy, or
  equivalent). No database, no Node.js, no build step, no package manager —
  every file in `independent-static-site/` is deployed exactly as-is.
- Upload the **contents** of `independent-static-site/` into `public_html/`
  (not the folder itself) so `index.html` lands at the domain root.
- Before going live: confirm the production domain and update the 4 files
  listed in §5; send a real test submission through the contact form on both
  `index.html` and `contacto.html` and confirm the emails arrive.
- `mod_rewrite` should be enabled for the `.htaccess` HTTPS/www rules to take
  effect (wrapped in `<IfModule mod_rewrite.c>` so the site still works even
  if it isn't — the redirects just won't happen).

---

## 10. Pages and breakpoints tested

Tested with a real Chromium browser (Playwright) driving the site through
PHP's built-in server, at the same breakpoints the CSS itself defines
(1280px+ desktop, 991px tablet, 767px/479px mobile), using viewports of
1440×900 (desktop), 810×1080 (tablet), and 390×844 (mobile) as representative
samples within those ranges:

- **All 3 pages** (`index.html`, `nosotros.html`, `contacto.html`) loaded at
  all 3 viewport sizes with zero browser console errors.
- **Mobile navigation** — open/close via click and keyboard, closes on
  choosing a link / outside click / `Escape` / resizing past 991px, and the
  no-JS fallback (menu open and fully navigable without JavaScript, verified
  with JS explicitly disabled).
- **Gallery slider** — dot navigation generated correctly (6 dots for 6
  slides), arrow-click advances/retreats with the correct transform, autoplay
  reads the markup's configured interval.
- **Scroll-reveal animations** — verified all 6 wired-up elements (2 hero
  titles + 4 service cards) reach `opacity: 1` / `is-visible` with correct
  positioning after scrolling into view, including confirming the two
  longest-delayed service cards (1250ms/1600ms) do complete, just later.
- **Hover-scale** on the hero subtitle — confirmed it scales up on hover and
  reverts on mouse-out (this required a real fix; see §2/§7).
- **Contact form** — tested the fetch/JS path, the honeypot rejection path,
  field-validation rejection, and the non-JS redirect-with-query-param
  fallback, all via both a real browser and direct HTTP requests (mail
  delivery itself untestable here — see §3).
- **No-JavaScript pass** — loaded `index.html` with JavaScript completely
  disabled and confirmed all content is visible (nothing stuck at
  `opacity: 0`), the mobile nav is fully usable, and the contact form is a
  normal working HTML form.
- **Text-content diff** — every page's visible text content was
  programmatically diffed against the original `webflow-export/` files; the
  only differences are the intentionally-improved `<title>` tags (metadata)
  and one visually-hidden honeypot label. No visible copy was altered.

**Not tested / cannot be tested in this environment:** real Apache
`.htaccess` behavior, and actual outbound email delivery via `mail()` — both
flagged in §8/§9 for verification after deployment.

---

## 11. Gallery carousel: hand-written JS → Splide

The hand-written carousel described in §2 (`initSliders()`) went through two
rounds of bug fixes post-launch (a `loading="lazy"` vs. transform-reveal
timing conflict, then a `focusin`/`focusout` bubbling bug that reset the
autoplay timer erratically) and still had reported issues. Rather than keep
patching bespoke carousel logic, it was replaced entirely with
[Splide](https://splidejs.com/) (v4.1.4, MIT license), a small,
dependency-free, actively-maintained carousel library — chosen over Swiper
(too many unused features for a simple 6-image gallery), GLightbox (a
lightbox, not a carousel — wrong tool for this job), and another hand-written
rewrite (same bug-risk category as what was being replaced).

**What changed:**

- `js/main.js`: `initSliders()` (~130 lines of custom carousel logic) was
  deleted entirely and replaced with `initGallery()`, a ~30-line function that
  mounts Splide on `.gallery-splide` elements. The autoplay speed is a single
  named constant at the top of the file, `GALLERY_AUTOPLAY_INTERVAL_MS`
  (currently `2000`) — change that one value to adjust timing; nothing else
  in the file needs touching.
- `index.html` / `nosotros.html`: the old `.slider.w-slider` markup (Webflow's
  slider structure: `.w-slider-mask`, `.w-slide`, hand-written arrow buttons,
  `.w-slider-nav` dots) was replaced with Splide's own markup convention
  (`.splide > .splide__track > .splide__list > .splide__slide`). Splide
  generates its own arrows/pagination dynamically at runtime — they are not
  hand-authored in the HTML.
- `css/base.css` and `css/interactions.css`: every `.w-slider*` /
  `.w-slide` / `.w-icon-slider*` rule was removed (confirmed via a
  project-wide grep that zero references remain anywhere in HTML/CSS/JS).
- `css/style.css`: the two rules that existed solely for the old carousel
  (`.slider`, `.image_inslider`, plus one responsive override) were removed —
  the only edit made to this otherwise-untouched "pristine" file, and narrow
  enough to match the file's existing precedent of small targeted fixes.
- New files: `js/vendor/splide.min.js`, `css/vendor/splide-core.min.css`
  (Splide's *unstyled*, structure-only CSS build — deliberately chosen over
  the themed build so the gallery's look could be authored from scratch to
  match this site, rather than overriding a library theme), and
  `js/vendor/splide.LICENSE.txt`. Both self-hosted (no CDN), consistent with
  how Google Fonts was self-hosted in §4 — this project has no runtime
  dependency on any third-party server.
- New file `css/gallery.css`: all of the gallery's visible styling (sizing,
  flat rectangular arrow buttons, circular pagination dots, hover/focus
  states, the `.no-js` fallback). Written to match the site's existing flat
  design language (no border-radius or shadows anywhere else on the site,
  color-only hover transitions) — Splide's own default theme was not used.

**Behavior preserved / added:**

- Autoplay (2s interval), infinite loop, pauses on hover and on keyboard
  focus — same as before, now handled by Splide's own tested `Autoplay`
  component instead of custom timer logic.
- Spanish ARIA labels for all generated controls (arrows, pagination dots,
  play/pause) via Splide's `i18n` option.
- Keyboard `Left`/`Right` arrow navigation while focus is inside the
  carousel — an *additive* improvement (`keyboard: true`); the old
  implementation didn't have this.
- No-JS fallback: `css/gallery.css` overrides Splide's default
  `visibility: hidden` (which normally stays hidden until Splide's JS mounts)
  so that without JavaScript, all 6 photos still render, stacked vertically
  at full width — following the same `.no-js`/`.js` progressive-enhancement
  pattern already used site-wide (see §2, "Touch-device detection").

**Verified during testing:** desktop mouse (arrow click, dot click), full
keyboard navigation and focus-based autoplay pause/resume, touch swipe on a
simulated mobile viewport, autoplay timing consistency (~2000ms ± rendering
jitter), zero console errors/failed requests across the same viewport matrix
used in §10, and the no-JS fallback with JavaScript explicitly disabled.

One easy-to-misread detail if this component is touched again: Splide's
`type: 'loop'` mode clones a couple of slides at each end of the track for
seamless wraparound, so `.gallery-splide .splide__slide` matches more DOM
elements than there are real photos — any future script or CSS that needs to
find "the real active slide" should exclude
`.splide__slide--clone` (e.g.
`.splide__slide.is-active:not(.splide__slide--clone)`).
