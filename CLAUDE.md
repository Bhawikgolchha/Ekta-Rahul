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

Everything lives in `index.html` (~2300 lines, single source of truth). It is organized top-to-bottom as:

1. **`<style>` block** (lines ~36–1284) — all CSS inline. Uses CSS custom properties for the palette and a few keyframe animations (`knockBob`, etc.). No external CSS file.
2. **Intro overlay** (`#intro`, ~1288–1374) — the "Padharo Sa" doors-opening sequence. Body starts with class `intro-locked`; the IIFE at the bottom of the page removes it after the doors animate open.
3. **Page sections**, each marked by a banner comment and an `id`, in this order: `#hero`, `#story`, `#timeline`, `#dress`, `#venue`, `#faq`, then `<footer>`.
4. **Inline `<script>` for the intro** (~1771–1866) — vanilla JS IIFE that builds the door studs, marigold garland, wires the "Knock to Enter" button, handles Esc/Enter/click-to-skip, and on completion removes `intro-locked` and dispatches a `resize` event so ScrollTrigger recalculates.
5. **GSAP + ScrollTrigger** loaded from cdnjs as deferred scripts, then a second inline script (~1871–2298) that polls `window.gsap` and registers all scroll-driven animations. Anything scroll-reactive belongs in this block.

### Things to know before editing

- **Lots of base64-inlined images.** The hero preload `<link>` and the footer logo `<img>` use `data:image/jpeg;base64,…` blobs that make the file huge (the file exceeds the Read tool's token limit — read with `offset`/`limit` or grep for the section first). When making edits, anchor on nearby section comment banners or `id="…"` attributes rather than scrolling through line numbers.
- **Edit order matters for the intro.** If you touch the intro DOM (`#intro`, `#doors`, `#intro-stage`), keep the IDs the script queries by name in sync. The script also relies on `body.intro-locked` to disable scroll until doors open.
- **GSAP is optional-by-runtime.** The second script polls until GSAP loads, so the page must work visually without it. Don't put critical layout in scroll triggers — use them for enhancement only.
- **Real links to keep intact**: Instagram (`@ekrah_forever`) and WhatsApp (`+91 97908 91316`) in the footer. Recent commits show socials were intentionally swapped from placeholders to real handles.

## Commit style

Recent history uses short imperative subjects with optional scope-y prefixes (`Round 2: …`, `Launch …`, `Replace …`). Keep that tone — single-line subject, no Conventional Commits prefix.
