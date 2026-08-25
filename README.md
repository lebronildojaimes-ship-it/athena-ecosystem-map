# Athena Ecosystem Map — static prototype

Framework-free, read-only operations view. Copy this folder onto CUDA1 (CachyOS) and serve it locally.

```
python -m http.server 8080
```

Then open the page in Firefox or Chromium. Opening `index.html` as `file://` will not load `mock-data.json`.

## Files

- `index.html` — document
- `styles.css` — design tokens and layout
- `app.js` — rendering and profile scoring
- `mock-data.json` — inventory snapshot (replace this later)
- `README.md` — this file

No CDNs, no webfonts, no analytics, no outbound calls.

## Behaviour

Profiles only change which nodes and services are **expected**. Refresh is presentation-only. Nothing is started, stopped, or configured.

Laptop is **unconfirmed**, not offline, unless a future snapshot actually reports it down.

Localhost-only services are healthy when locally verified. Network-facing services that are ready locally but firewalled are **Restricted** (amber), not Ready.

## Keyboard

- Arrow keys on the node list
- `1`–`4` profiles
- `R` refresh (presentation)
