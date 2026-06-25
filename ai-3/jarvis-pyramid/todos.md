# Memory Pyramid — TODOs

## Done
- [x] Filled SVG icons at 14×14 (tech + platform)
- [x] `recent` field (1=recent→43=stale) in data.js — top 5 highlighted
- [x] `.recent-high` CSS class — brighter glow, border, bg
- [x] Ghost hitbox scales: r=5 for top 5, r=4 for rest
- [x] Event forwarding: CSS2D → canvas (drag/click pass-through)
- [x] Reset view button (bottom-right) — closes features, resets camera, clears search
- [x] Color scheme shifted to greenish-aqua (#0a1410 bg, #00ffa0 accent)

## TODO
- [ ] **Auto-rank** — update `recent` values by scanning `mtime` from disk
- [x] **Glow rings** — 3D torus ring aura around recent-5 nodes (rotating, cyan)
- [ ] **Recent toggle** — sort/filter view to show only recent
