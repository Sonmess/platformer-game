# ADR 0006: Vlastné 8-bitové zvukové efekty

- Stav: prijaté (2026-11-05)

## Kontext
Krok 12 M1 potrebuje zvuky pre skok, dopad, zber, checkpoint, smrť a cieľ (ADR 0003: jednoduché SFX cez event bus).
Repo je verejné, takže každý cudzí zvuk musí mať licenciu, ktorá dovoľuje šírenie. Grafika postavy je už vlastná
(ADR 0005).

## Rozhodnutie
- Zvuky syntetizuje skript `tools/sfx.mjs` (štvorec, trojuholník, šum; posun výšky tónu, obálka). Výstupom sú
  16-bit mono WAV súbory (22 050 Hz) v `public/assets/own/sfx/`. Šum je zo seedovaného generátora, takže
  opakované spustenie dá identické súbory.
- Prehráva ich `src/systems/Audio.ts` výhradne podľa eventov; hlasitosti a rozptyl výšky tónu sú v `AUDIO`
  v `constants.ts`. Čerešne zbierané rýchlo za sebou stúpajú vo výške tónu.

## Dôsledky
- Žiadne sťahovanie ani licenčné obmedzenia; zvuk ladí s pixel artom a dá sa upraviť editom skriptu.
- Retro charakter je zámer; ak bude neskôr treba iné zvuky, dajú sa nahradiť CC0 balíkom bez zmeny kódu
  (stačí URL v `AUDIO`).
- Prehliadač pustí zvuk až po prvej interakcii (kláves alebo klik); AudioContext odomkne Phaser sám.
