# GEI Dam Learning Academy

Six-level Genesis Engineered Interpretations Academy.

## Pages
- `index.html` — Academy dashboard / Control Room
- `level1.html` — Genesis / Light
- `level2.html` — Dam / Firmament
- `level3.html` — Reservoir
- `level4.html` — Operations
- `level5.html` — The Mill
- `level6.html` — The System
- `vault.html` — A'Dam Vault

## Player progression
The Academy uses `gei-academy-state-v1` in browser localStorage for the player name, XP, avatar, theme, and completed foundation levels.

Players must save a username before entering a level. The six foundation levels are Levels 1–6. There is no Day 7.

## Gameplay
The level pages use a single-frame mobile presentation with `overflow:hidden` and the comfortable-reading typography pass intended for adults and kids.

The game uses the shared `js/gei-game-audio.js` Web Audio engine for click, correct, wrong, save, level completion, and certificate/Vault fanfare sounds.

## Vault
The Vault is the reward area after the six-day foundation.

## Dashboard audio control
The experimental dashboard-wide audio toggle is intentionally not included in this clean package.

## Deployment
Keep the HTML files together with the `js/` folder. For GitHub Pages, publish the repository root. For Hostinger, upload the same structure.

## Troubleshooting
If a level redirects to the dashboard, save the explorer username first. If sounds are silent on a mobile browser, tap an in-game control to provide the browser's user-gesture needed to start Web Audio.
