# Game plan (návrh)

> Stav: **SCHVÁLENÉ** (2026-11-03) — otvorené otázky sú rozhodnuté, pozri [Rozhodnutia](#rozhodnutia) a `docs/decisions/`.

## Pitch

Krátka 2D plošinovka v prehliadači so sviežim ovládaním a hlbokým parallax pozadím.
Hráč prebieha cez level, preskakuje prekážky, zbiera predmety a dobehne do cieľa.

## Cieľ prvého prototypu (Milestone 1)

Jeden hrateľný level, ktorý už vyzerá a hrá sa „hotovo“:

- [ ] Postavička: beh, skok s coyote time, jump bufferom a variabilnou výškou
- [ ] Level z tilemapy (Tiled), ~3–5 obrazoviek dlhý
- [ ] Kamera sleduje hráča (deadzone, look-ahead, hranice levelu)
- [ ] 4–5 parallax vrstiev pozadia
- [ ] Nebezpečenstvá (jama, bodáky) → okamžitý respawn na checkpointe
- [ ] Zbierateľné predmety + HUD počítadlo
- [ ] Cieľ levelu → obrazovka „Level complete“
- [ ] Juice: prach pri skoku/dopade, squash & stretch, jemný shake pri smrti
- [ ] Ovládanie: klávesnica (šípky/WASD + medzerník)
- [ ] Playwright test: boot bez chýb, skok, respawn, parallax sa hýbe

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
