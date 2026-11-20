# ADR 0009: Vlastné dlaždice terénu

- Stav: prijaté (2026-11-20)

## Kontext
Po M3 sa hnedá podlaha z balíka Tall Forest (oranžovohnedá hlina, jedna dlaždica opakovaná na celej dĺžke) hráčovi
zunovala. Parallax pozadie z toho istého balíka ostáva — to je v poriadku. Postavy, predmety, zvuky aj hudba sú už
vlastné (ADR 0005, 0006), takže aj terén môže byť.

## Rozhodnutie
- Dlaždice terénu kreslí procedurálne skript `tools/tiles.mjs` (bez závislostí, deterministický). Tileset zachováva
  rozloženie Tall Forest (7 stĺpcov, rovnaké gid blokov 3×3), takže level aj kód plošín ostávajú bez zmeny; pod
  pôvodné riadky pridáva varianty stredných dlaždíc.
- Z troch návrhov (tráva a tmavá hlina, kamenné murivo s machom, vrstvená skala s kryštálmi) bol vybraný
  **„Tráva a tmavá hlina“**: hrubý svetlozelený trávnik nad tmavou fialovosivou hlinou s kamienkami a korienkami.
  Ostatné dva štýly sa generujú tiež (`public/assets/own/tiles/`) pre ďalšie levely (M4).
- Hra pri štarte levelu vymení časť obyčajných dlaždíc za varianty podľa polohy (`src/core/tiles.ts`,
  `GROUND_TILES` v `constants.ts`): asi 45 % dlaždíc dostane kamienok, korienok alebo kvietok, vždy na tom istom
  mieste. Úvodná obrazovka robí to isté na svojom páse zeme.
- `public/assets/tall-forest/tileset.png` z repa odchádza; z Tall Forest ostáva len parallax.

## Dôsledky
- Terén ladí s ostatnou vlastnou grafikou a dá sa upraviť editom skriptu (`node tools/tiles.mjs`).
- Pohyblivé a prepadávacie plošiny sa pečú z toho istého tilesetu, takže zmenili vzhľad automaticky.
- Nový štýl pre ďalší level = nová funkcia v `STYLES` a cesta k jeho PNG; gid variantov musia sedieť s
  `GROUND_TILES.VARIANTS` (kontroluje unit test).
