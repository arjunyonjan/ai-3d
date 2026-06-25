# Memory Pyramid — TODOs

## Done
- [x] Filled SVG icons at 14×14 (tech + platform)
- [x] `recent` field (1=recent→43=stale) in data.js — top 5 highlighted
- [x] `.recent-high` CSS class — brighter glow, border, bg
- [x] Ghost hitbox scales: r=5 for top 5, r=4 for rest
- [x] Event forwarding: CSS2D → canvas (drag/click pass-through)
- [x] Reset view button (bottom-right) — closes features, resets camera, clears search
- [x] Color scheme shifted to greenish-aqua (#0a1410 bg, #00ffa0 accent)
- [x] Auto-rank — `recent` values from mtime on disk
- [x] Glow halos — radial-gradient sprites for recent-5 nodes
- [x] Feature pyramid layout (rows below node)
- [x] Isolation mode — click folder hides others, camera animates to focus, back arrow
- [x] Smooth camera lerp (1s cubic-ease)
- [x] Auto-open AI-3 on page load
- [x] Neural web lines between folder nodes (glowing, pulsing)
- [x] Drag does not toggle features (pointerdown distance check)
- [x] Success/fail icons on feature labels (✓ / ⚠)
- [x] Glow halos follow their node during drag
- [x] Playwright isolation test

## TODO
- [ ] **Label icons/container click not toggling** — only text click works; icons and empty area of label div don't trigger isolation/toggle
