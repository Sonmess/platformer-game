# Game plan (návrh)

> Stav: **DRAFT** — položky označené ❓ treba rozhodnúť pred začatím kódovania.

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

## Otvorené otázky ❓

1. **Téma / prostredie** — napr. les, mesto v noci, hory, sci-fi, niečo spojené s Aktuality.sk?
2. **Postavička** — kto/čo je hráč?
3. **Vizuálny štýl** — pixel art (napr. 480×270, zväčšené) alebo hladká HD ilustrácia (960×540)?
4. **Grafika** — začať procedurálne/greybox a neskôr doplniť voľné (CC0) assety, alebo hneď hľadať asset pack?
5. **Mechaniky navyše** — dvojskok, wall jump, nepriatelia (stomp), pohyblivé plošiny? (odporúčanie: pre M1 nič z toho)
6. **Mobil** — majú byť dotykové ovládače už v M1?
7. **Zvuk** — áno/nie v M1? (odporúčanie: jednoduché SFX áno, hudba neskôr)
8. **Kde hra pobeží** — len lokálne/interné demo, alebo verejné nasadenie (GitHub Pages a pod.)?

## Mimo rozsahu M1

Viac levelov, menu s nastaveniami, ukladanie postupu, leaderboard, multiplayer.
