# Final QA Report — Pozos Paraíso Production Readiness

This report covers the production-readiness pass performed on top of the
independent static site built in the previous phase. It documents what was
tested, what was found and fixed, and what still needs a human check after
deployment. The deployable output is `public_html_ready/` (and
`public_html_ready.zip`); this report and `DEPLOYMENT_GUIDE.md` live outside
that folder since they aren't meant to be uploaded to the web server.

---

## 1. Pages tested

All 4 HTML pages in the project:

- `index.html` (home)
- `nosotros.html` (about)
- `contacto.html` (contact)
- `404.html` (custom not-found page)

## 2. Viewports tested

Automated (Chromium via Playwright, served through PHP's built-in server)
at the 6 widths requested, each cross-checked against the CSS's own
breakpoints (1280px, 991px, 767px, 479px) to specifically exercise the
boundary behavior around those thresholds:

| Viewport | Falls into breakpoint bucket |
|---|---|
| 1440px | above 1280px refinement |
| 1280px | exactly at the 1280px refinement threshold |
| 1024px | between 991px and 1280px (base styles only) |
| 768px | just above the 767px mobile threshold (tablet bucket) |
| 480px | just above the 479px small-mobile threshold |
| 375px | below all thresholds (smallest mobile bucket) |

At every width × every page: zero browser console errors, zero failed or
4xx+ network requests. Screenshots were captured both as full-page composites
and as real-scroll segment captures (see §8 for a testing-methodology note on
why segment captures were needed).

## 3. Interactions tested

- **Mobile navigation** — opens/closes via mouse click and via keyboard
  (Enter/Space on the toggle, which is a real `<button>`); closes on
  choosing a link, clicking outside, pressing Escape, or resizing past the
  991px breakpoint; verified with JavaScript **disabled** that the menu
  falls back to always-open/stacked (no dead end for non-JS visitors).
- **Gallery slider** (home + "Nosotros" pages) — dot navigation generation,
  arrow-click advance/retreat (mouse and keyboard), autoplay timing read
  from the markup's own `data-delay`/`data-autoplay` attributes.
- **Scroll-reveal animations** — all 6 wired-up elements (2 hero titles + 4
  service cards) confirmed reaching their final visible state after
  scrolling into view, including the two longest-staggered service cards
  (1250ms/1600ms delays).
- **Hover-scale** on the hero subtitle — confirmed scaling in on hover and
  reverting on mouse-out.
- **Every internal link and same-page anchor** on every page — resolved via
  direct HTTP requests (all 200) and DOM checks (every `#anchor` target
  confirmed to exist on its page).
- **Buttons**: "MÁs" (navigates home→nosotros), "Contáctanos" (scrolls to
  the contact section), "Enviar" (submits the contact form).
- **Contact form** — the fetch/JavaScript submission path, the honeypot
  spam-trap rejection path, field-validation rejection, and the no-JavaScript
  fallback (a real HTML form POST with a server-side redirect back to a
  status message) were all exercised via both a real browser and direct HTTP
  requests. Actual email delivery could not be verified in this environment
  (no mail transfer agent installed in the sandbox) — see §6.
- **Keyboard-only pass** — Tab order reaches the header, hamburger toggle,
  and slider controls; a visible focus outline now appears on every custom
  interactive control (see §5, this was a real bug found and fixed).
- **404 behavior** — `404.html` renders correctly with the site's normal
  header/footer and a link home; `.htaccess` maps it as the `ErrorDocument`
  for real 404s (this specific piece — Apache actually invoking it for an
  unmatched URL — could not be tested in this sandbox, which has no Apache
  instance; only PHP's built-in dev server, which does not process
  `.htaccess` at all. Verify this on the live host after deployment).

**Not applicable / not present in this design, so not tested:** dropdown
menus, tabs, and accordions (none exist anywhere in this 3-page site's
design — confirmed by the original Webflow-dependency audit and re-confirmed
in this pass, see §7); a "back to top" button (never part of the original
design; not invented here since the brief is to preserve, not add, features);
embedded third-party media/widgets and WhatsApp links (none exist in the
source content — see §4).

## 4. Broken links / bugs found and corrected this phase

1. **Footer email addresses were plain text, not links.** Wrapped in
   `mailto:` links (visually identical — same color, no underline except on
   hover/focus — styled via a small addition to `interactions.css`) so
   they're one-tap on mobile. No phone numbers exist anywhere in the
   content, so there was nothing to convert to `tel:` links.
2. **CSS specificity bug (introduced and caught in this pass):** adding
   `width`/`height` attributes to `<img>` tags for layout-shift prevention
   collided with `style.css` rules that set only `width` and relied on the
   browser's implicit `height:auto` — without a fix, the browser used the
   literal `height` *attribute* as a real (if low-priority) CSS value,
   stretching the header logo, footer logo, gallery photos, and map image.
   Fixed with an explicit `height: auto` rule in `interactions.css` scoped
   to exactly the affected classes. Caught by a Playwright regression pass
   before it reached this report, not left in the deliverable.
3. **Keyboard focus indicators were invisible** on the mobile-nav toggle
   and the slider arrows — inherited `outline: 0` rules from the original
   Webflow framework CSS (`base.css`). Restored with `:focus-visible`
   outlines (keyboard-only, so mouse clicks don't show a ring) on every
   custom interactive control.
4. **The mobile-nav toggle and slider arrows were `<div role="button">`,
   not real buttons.** Converted to `<button type="button">` for native
   keyboard activation and correct assistive-technology semantics. This
   surfaced a CSS cascade bug during testing (a `color: inherit` reset
   accidentally overrode the arrows' intended white color against the photo
   background, making them nearly invisible) — fixed by narrowing the reset
   to only the properties that actually needed it (`background`, `border`,
   `margin`, `appearance`), verified visually before and after.
5. **No `<main>` landmark existed** anywhere in the document — added
   (`display: contents`, so it has zero effect on the existing flex-based
   page layout) purely for assistive-technology navigation.
6. Everything flagged in the *previous* migration phase (corrupted
   mobile-logo filename, two broken footer cross-page links, inconsistent
   header-logo "go home" behavior) remains fixed and was re-verified in
   this pass.

**Investigated and confirmed not a bug:** two apparent visual issues
(missing service cards/map at 1024px width; a blank gray box in the
gallery slider) turned out to be artifacts of Playwright's `fullPage`
screenshot mode, which resizes the viewport instantly instead of scrolling
— IntersectionObserver-based reveals and native `loading="lazy"` images
don't reliably fire in that mode. Confirmed via direct DOM/computed-style
inspection and real-scroll screenshots that actual users see everything
correctly.

## 5. Accessibility fixes made this phase

- Restored visible keyboard focus outlines (see §4.3).
- Converted the mobile-nav toggle and slider arrows to real `<button>`
  elements (see §4.4).
- Added a `<main>` landmark (see §4.5).
- Confirmed no links lack an accessible name (the one apparent case — the
  logo link containing only an `<img>` — correctly derives its accessible
  name from that image's `alt="Pozos Paraíso"`).
- Confirmed every form field has a properly associated `<label for>`.
- Confirmed `lang="es"` is set on every page.

**Known limitation, deliberately not changed:** heading levels skip in
places (e.g. an `<h1>` followed directly by an `<h5>` for the hero
subtitle, and an `<h2>` followed by `<h6>` footer labels). This is
inherited from the original Webflow design, which used heading tags mainly
as typography hooks rather than strict document-outline levels. Retagging
these safely turned out to require more than a tag swap: `style.css`'s
bare `h1`–`h6` selectors set *different* margin, line-height, and color
per tag level that the `.heading`/`.heading-2` classes don't fully
override, so changing an element's tag (e.g. `h5` → `h2`) would visibly
change its spacing and color, not just its semantic level. Fixing this
properly would mean adding compensating CSS for every retagged element —
a larger, riskier change than appropriate for this pass. Left as a
documented, low-priority item for a future dedicated pass.

## 6. Remaining external services

**None.** The original audit found no analytics, tracking pixels, embedded
maps, video embeds, or WhatsApp links anywhere in the source content, and
that remains true — there was nothing third-party to preserve, and nothing
was added. The site's only outbound-adjacent feature is the contact form,
which posts to this project's own `php/send-form.php` (not a third-party
service).

**Requires post-deployment verification (cannot be tested in this
environment):**
- **Email delivery** — `php/send-form.php` uses PHP's built-in `mail()`.
  This sandbox has no mail transfer agent installed, so `mail()` reliably
  returns `false` here; every other part of the pipeline (validation,
  honeypot, the fetch/JSON handshake, the non-JS redirect fallback) was
  verified working. Hostinger and GoDaddy shared hosting both ship with a
  working `mail()` by default, but send a real test submission after
  deploying — see `DEPLOYMENT_GUIDE.md` §7.
- **`.htaccess` behavior** — no real Apache instance was available in this
  sandbox (only PHP's dev server, which ignores `.htaccess` entirely). The
  HTTPS redirect, www/non-www redirect, custom 404, compression, caching
  headers, and security headers were hand-written to standard syntax and
  reviewed carefully, but should be spot-checked live (see
  `DEPLOYMENT_GUIDE.md` §7 checklist).

## 7. Confirmation: Webflow runtime dependencies removed

A full-project grep for `webflow`, `website-files`, `data-wf`, `w-nav`,
`w-slider`, `w-dropdown`, `w-tab`, `Webflow.push`, `Webflow.require`, and
`webflow.js` was run across every HTML, CSS, JS, and PHP file in
`public_html_ready/`. Results:

| Pattern | Found? | Disposition |
|---|---|---|
| `webflow.js` script tag | No | Removed in the prior phase; replaced by `js/main.js` |
| `Webflow.push` / `Webflow.require` | No | N/A — no Webflow runtime is loaded at all |
| `data-wf-*` attributes | No | Removed in the prior phase (page/site IDs, form metadata) |
| `website-files` (Webflow's CDN domain) | No | Never present in the source; confirmed absent |
| literal string "webflow" (case-insensitive) | Only in code comments | 12 occurrences, all in `MIGRATION_NOTES.md`-adjacent explanatory comments inside `css/interactions.css`, `js/main.js`, and `php/send-form.php` describing *what each piece replaces*, plus 3 pre-existing upstream comments inside the vendored, unmodified `normalize.css`. None are functional; none are user-facing. |
| `w-nav`, `w-slider`, `w-form`, `w-input`, `w-button`, `w--current` (class names) | Yes | **Required.** These are the CSS/JS hooks this project's own `base.css`/`interactions.css`/`js/main.js` are built around — they are Webflow-*originated* naming, but there is no Webflow runtime left for them to depend on. Renaming them now would touch every CSS/JS/HTML file for zero functional benefit and real regression risk, which is explicitly out of scope for this pass. |
| `w-dropdown`, `w-tab` (class names) | No | Confirmed absent — this site never used dropdowns or tabs, in the original or here |

**The site does not require the Webflow runtime, Webflow hosting, or any
Webflow-owned CDN to function.** Every script, stylesheet, and font is
self-hosted; the one remaining outbound dependency removed in this project's
history (Google's WebFont loader + a Webflow-CDN-pinned jQuery) was already
eliminated in the prior migration phase. This was independently, concretely
demonstrated during testing: rendering the untouched `webflow-export/` copy
in this sandbox showed the entire page's headings and service cards as
invisible, because this sandbox's network policy blocks the specific
Webflow CDN domain that export depends on for jQuery — a real illustration
of the fragility that decoupling was meant to fix. The independent site has
no such dependency and rendered correctly throughout every test in this
report.

## 8. Testing methodology note

Two categories of false alarm came up during this pass and are recorded
here so they aren't mistaken for real bugs later:

1. **`fullPage` screenshot artifacts.** Playwright's full-page screenshot
   mode resizes the viewport instantly rather than scrolling incrementally,
   which doesn't reliably trigger `IntersectionObserver`-based reveals or
   native `loading="lazy"` images before the pixel capture happens. Two
   apparent "missing content" screenshots were resolved by switching to
   real incremental-scroll captures and direct DOM/computed-style checks,
   which confirmed the underlying page was correct all along.
2. **Slider/reveal timing jitter between separate test runs.** Comparing
   screenshots from two independently-executed test scripts (each with its
   own wall-clock timing) showed pixel differences concentrated exactly in
   the autoplaying carousel and the timed reveal animations. A dedicated
   controlled A/B test (both versions loaded in the same script run, with
   autoplay paused and reveal transitions given a fixed, generous settle
   time) proved these were 100% timing artifacts — every computed style,
   position, and dimension was identical.

Where a discrepancy could not be immediately explained this way (the image
distortion bug in §4.2 and the invisible-arrow bug in §4.4), it was treated
as a real bug, root-caused, and fixed rather than dismissed.
