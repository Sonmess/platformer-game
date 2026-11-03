# ADR 0002: Vizuálny štýl a postup s grafikou

- Stav: prijaté (2026-11-03)

## Kontext
Hra má vyzerať profesionálne; treba zvoliť štýl a stratégiu tvorby grafiky.

## Rozhodnutie
- **Pixel art**, interné rozlíšenie **480×270**, zväčšené celočíselným zoomom (×4 = 1920×1080).
- Phaser: `pixelArt: true`, integer zoom.
- Grafika: **greybox najprv**, potom **CC0 asset pack**. Každý asset sa eviduje (zdroj, licencia) v `public/assets/CREDITS.md`.

## Dôsledky
- Zodpovedá poradiu práce v skille: hrateľnosť → pocit zo skoku → vizuál → juice.
- Pri výbere packu dbať na konzistentnú veľkosť dlaždíc (napr. 16×16) a licenciu.
