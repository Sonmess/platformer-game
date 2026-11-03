# Game plan (návrh)

> Stav: **SCHVÁLENÉ** (2026-11-03) — otvorené otázky sú rozhodnuté, pozri [Rozhodnutia](#rozhodnutia) a `docs/decisions/`.

## Pitch

Krátka 2D plošinovka v prehliadači so sviežim ovládaním a hlbokým parallax pozadím.
Hráč prebieha cez level, preskakuje prekážky, zbiera predmety a dobehne do cieľa.

## Cieľ prvého prototypu (Milestone 1)

Jeden hrateľný level, ktorý už vyzerá a hrá sa „hotovo“. Ovládanie: klávesnica (šípky/WASD + medzerník).
Po každom kroku: `npm test`, kontrola konzoly, screenshot a tvoj playtest. Položky „overené playtestom“
sa automaticky testovať nedajú a odškrtávajú sa až po tvojom vyskúšaní.

### Fáza A — hrateľnosť (greybox)

- [ ] **1. Hráč a pohyb** — beh, jednoduchý skok, vstupná vrstva `Input.ts`, test API `press()`/`teleport()`.
  Test: po spawne stojí na zemi, `press(right)` ho posunie doprava, skok ho dostane nad zem a späť.
- [ ] **2. Level z tilemapy** — greybox Tiled JSON, 4–5 obrazoviek, plošiny, jama.
  Test: stena zastaví hráča, plošinou neprepadne.
- [ ] **3. Kamera** — sledovanie s deadzone, look-ahead, hranice levelu.
  Test: kamera sa posunie a nepresiahne okraj levelu.
- [ ] **4. Smrť a respawn** — jama, bodáky, checkpointy, event bus, `state.ts`.
  Test: smrť → respawn na checkpointe, počet smrtí +1.
- [ ] **5. Zbierateľné predmety + HUD** — mince, počítadlo (paralelná scéna Hud).
  Test: zber mince → počet +1, minca zmizne.
- [ ] **6. Cieľ + „Level complete“** — výsledky a reštart.
  Test: cieľ → LevelComplete; reštart 5× dá rovnaký počiatočný stav.

### Fáza B — pocit zo skoku

- [ ] **7. Ladenie skoku** — fyzika odvodená z výšky skoku a času do vrcholu, coyote time, jump buffer,
  variabilná výška, ťažší pád, zrýchlenie/brzdenie.
  Test: výška plného skoku ±15 %, ťuk nižší ako podržanie, coyote a buffer fungujú. Pocit: overené playtestom.

### Fáza C — vizuál

- [ ] **8. Výber CC0 asset packu** — 2–3 návrhy, licencie overené, zápis do `public/assets/CREDITS.md`.
- [ ] **9. Grafika levelu a postavy** — tileset, animácie (státie, beh, skok, pád), mince, bodáky, cieľ.
  Test: stav animácie v `getState()` zodpovedá pohybu.
- [ ] **10. Parallax pozadie** — 4–5 vrstiev.
  Test: vrstvy sa posúvajú rôznou rýchlosťou.

### Fáza D — efekty, zvuk, záver

- [ ] **11. Juice** — prach pri skoku/dopade, squash & stretch, jemný shake pri smrti, efekt zberu.
  Test: efekty nemenia fyziku. Pocit: overené playtestom.
- [ ] **12. Zvukové efekty** — skok, dopad, zber, smrť, cieľ (CC0).
  Test: eventy spúšťajú zvuky. Hlasitosť a kvalita: overené playtestom.
- [ ] **13. Finálna kontrola M1** — všetky testy, FPS ~60, playtest celého levelu, aktualizácia dokumentov.

## Rozhodnutia

| # | Téma | Rozhodnutie | ADR |
|---|---|---|---|
| 1 | Téma / prostredie | Les / príroda | [0001](decisions/0001-tema-a-postavicka.md) |
| 2 | Postavička | Malé zvieratko (líška/mačka) | [0001](decisions/0001-tema-a-postavicka.md) |
| 3 | Vizuálny štýl | Pixel art 480×270, celočíselný zoom, `pixelArt: true` | [0002](decisions/0002-vizualny-styl-a-grafika.md) |
| 4 | Grafika | Greybox, potom CC0 asset pack (licencie do `public/assets/CREDITS.md`) | [0002](decisions/0002-vizualny-styl-a-grafika.md) |
| 5 | Mechaniky navyše | Žiadne v M1 (dvojskok, nepriatelia → backlog) | [0003](decisions/0003-rozsah-m1.md) |
| 6 | Mobil | Nie, len klávesnica v M1 | [0003](decisions/0003-rozsah-m1.md) |
| 7 | Zvuk | Jednoduché SFX cez event bus, hudba neskôr | [0003](decisions/0003-rozsah-m1.md) |
| 8 | Nasadenie | Lokálne demo, bez verejného nasadenia | [0003](decisions/0003-rozsah-m1.md) |

## Mimo rozsahu M1

Viac levelov, menu s nastaveniami, ukladanie postupu, leaderboard, multiplayer.
