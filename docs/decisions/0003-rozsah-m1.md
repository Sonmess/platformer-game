# ADR 0003: Rozsah Milestone 1

- Stav: prijaté (2026-11-03)

## Rozhodnutie
- **Mechaniky navyše: žiadne** (dvojskok, wall jump, nepriatelia, pohyblivé plošiny → `docs/backlog.md`).
- **Ovládanie: len klávesnica** (šípky/WASD + medzerník). Mobil a gamepad → backlog.
- **Zvuk:** jednoduché SFX (skok, dopad, zber, smrť) cez event bus; hudba neskôr.
- **Nasadenie:** len lokálne demo, bez verejného nasadenia (GitHub Pages neskôr).

## Dôsledky
- Menší rozsah M1 → viac času na pocit zo skoku a vizuálnu kvalitu.
- Vstupná vrstva (`systems/Input.ts`) zostane rozšíriteľná o dotyk/gamepad bez zmeny gameplay kódu.
