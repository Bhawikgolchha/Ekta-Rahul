# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Single-page static wedding landing site for Ekta & Rahul (1–3 May 2026, Ponneri Gymkhana Club, hashtag `#EkRahForever`). No build system, no package manager, no framework — just `index.html` plus assets in `images/` and a few PNGs at the repo root.

## Running locally

There is no build step. Serve the directory over HTTP (file:// breaks some assets and ScrollTrigger):

```
python -m http.server 8765
```

`.claude/launch.json` defines this as the `ekta-static` configuration. After it's running, open `http://localhost:8765/`.

## Architecture

The repo now ships **two self-contained sites side-by-side**, both standalone HTML — no build, no framework, no shared CSS/JS:

- **`index.html` — v2 "Shaadi Card, Reborn"** (the live site). Paper-and-marigold Indian luxe, Devanagari hero typography, ink + cream palette. Vanilla JS only (no GSAP). 5-diya tap-to-light intro, per-event live countdowns, blessings wall (localStorage key `ekrah_bless`), photo gallery, magnetic dock, pull-to-bless petal shower, shake-to-shower (DeviceMotion), long-press wishes, ambient shehnai toggle (Web Audio API), photo doodle canvas. Camera-modal photo filters (5 overlay SVGs) ported from v1 sit inside `#filters`.
- **`index-v1.html` — original dark-purple GSAP build.** Frozen as a fallback; reachable at `/index-v1.html` on Vercel. Self-contained — edit only if reviving.

### v2 layout (index.html)

1. **External fonts** — single Google Fonts call up top loads Fraunces, Instrument Sans, Instrument Serif, and Tiro Devanagari Hindi. Required: don't strip the preconnect lines.
2. **`<style>` block** (~lines 14–1330) — CSS custom properties (`--ink`, `--paper`, `--marigold`, `--gold-deep`, etc.) and per-event tone overrides via `--ev-tone`. Camera-modal CSS at the very end of this block.
3. **Intro overlay** (`.intro`, near top of `<body>`) — 5 diyas; tapping each lights it; all-lit OR 30s timeout removes `body.locked` and reveals the page.
4. **Sections in order:** `.topbar`, `.hero` (ek × राहुल), `.tagline`, `.events-cd` (per-event countdown rail), `.chapters` (one per ceremony, color-toned, with doodle canvas), `.venue`, `.party` (parents' names), `.blessings`, `.gallery`, `.filters`, `.closing`, then the magnetic `.dock`.
5. **Inline `<script>` block** (~lines 1969–2750) — single big IIFE chain. Order matters: diya intro IIFE → reveal observer → magnetic dock → doodle → blessings persistence → countdown timers → pull-to-bless → shake → shehnai oscillator → closing-petal observer → camera-modal filters IIFE (last).

### Things to know before editing v2

- **Image paths live in `images/`.** v2's source from Claude Design used sibling paths (`./hero-couple.png`); we rewrote them to `images/...`. New images go there.
- **Filter overlays live in `images/filters/`.** Five SVGs: marigold, mehndi, ekrah-banner, padharo, dhol-diya. The same files are used both as `<img>` thumbnails on the cards and composited onto the camera canvas.
- **Camera modal expects `body.locked`** to disable scroll while it's open (same class the diya intro uses; reuse, don't redefine).
- **No GSAP, no jQuery, no CDN libs other than Google Fonts.** If you need an animation, use Web Animations (`element.animate()`), CSS transitions, or IntersectionObserver.
- **Real contact data to keep intact:**
  - Instagram: `https://www.instagram.com/ekrah_forever?igsh=MWdnbzZ6ZWZrMjFmdw==`
  - WhatsApp / RSVP: `+91 86514 73405` → `https://wa.me/918651473405`
  - Venue: Ponneri Gymkhana Club, 76 Peruncheri, Ponneri – 601204, Tamil Nadu
  - Parent names: Ekta — D/o Manoj Kumar Bothra and Vijaya Devi Bothra · Rahul — S/o Surendraji Surana and Shobha Devi Surana
  - Six events with sub-venues: Mayra (3rd Floor Hall) · Tamil Carnival (Pool Side Lawn) · Musical Night (Open Terrace) · Sangeet (Main Lawn) · Milni & Phera (Pavilion) · Reception (Main Lawn). **No Mehndi event. No Champagne in Reception copy.**

## Photo upload (YD Studio / Kamero)

- **Upload URL:** `https://yd-studio-india.kamero.ai/ekrahforever`
- **QR asset:** `images/upload-qr.png` — YD Studio-branded QR code linking to the same URL.
- **In-page section:** `#upload` (between `#timeline` and `#venue`) — shows QR + "Tap to upload" CTA button.
- **Popup:** `#uploadPopup` — fires once per session after a 30-second delay. Auto-closes after a 10-second countdown. Dismissible via ✕ button, backdrop click, or `Esc` key. Gated by `sessionStorage` key `uploadPopupShown`.
- **CSS classes:** `.upload-popup`, `.upload-popup-backdrop`, `.upload-popup-card`, `.upload-popup-close`, `.upload-popup-auto`, `.upload-qr` (reused inside card), `.cam-btn.primary`.

## Commit style

Recent history uses short imperative subjects with optional scope-y prefixes (`Round 2: …`, `Launch …`, `Replace …`). Keep that tone — single-line subject, no Conventional Commits prefix.
