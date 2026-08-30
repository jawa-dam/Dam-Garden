# GEI Mission Audio — Final Bootstrap Fix

The six supplied Level 1–6 pages use one shared Web Audio engine.

Audio initialization:
first real user interaction → `GEI_AUDIO_UNLOCK()` → AudioContext resume → existing mission sound handler

The existing `sound(kind)` signature is preserved.

Expected:
tap/click → click
correct → correct
wrong → gentle womp
next/save → save
level completion → fanfare

No dashboard changes are included.
