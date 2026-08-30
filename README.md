# GEI Academy — Mission Audio Bootstrap Fix

The six supplied Level 1–6 pages are preserved and receive one shared audio bootstrap.

The shared `js/gei-game-audio.js` now exposes `GEI_AUDIO_UNLOCK()`.
The level pages call it from the first real user gesture, before mission click handlers.

Expected:
- tap answer → click
- correct → correct sound
- wrong → gentle womp
- next/save → save
- level completion → ascending fanfare

The dashboard is intentionally not modified.
