# Credits

Každý externý asset (grafika, zvuk, fonty) sa eviduje tu: zdroj, autor, licencia.

## Kód

- Základ projektu vychádza zo šablóny [phaserjs/template-vite-ts](https://github.com/phaserjs/template-vite-ts) (MIT, © Phaser Studio Inc). Demo scény, telemetria a demo obrázky boli odstránené.

## Assety

### Sunny Land 2D Pixel Art Pack — `sunny-land/`

- **Autor:** Luis Zuno ([@ansimuz](https://www.patreon.com/ansimuz))
- **Zdroj:** <https://opengameart.org/content/sunny-land-2d-pixel-art-pack> (`sunny-land-files.zip`, stiahnuté 2026-11-04)
- **Licencia:** CC0 / public domain („Public domain and free to use on whatever you want, personal or commercial.
  Credit is not required but appreciated.“). Pôvodný text: `sunny-land/LICENSE.txt`.
- **Použité:** spritesheety hráča (líška: idle, run, jump, hurt), drahokam, čerešňa, efekty zberu a zániku,
  tileset, pozadie (`back`, `middle`), rekvizity (bodáky, tabuľa, dvere, strom, ker, kameň, huby).
- **Nepoužité:** hudba z balíka (Pascal Belisle) — tá *vyžaduje* uvedenie autora; ak ju niekedy pridáme, doplniť sem.
- Názvy súborov ponechané ako v balíku (vrátane preklepov `payer-run.png`, `enemy-deadth.png`).

### SunnyLand Tall Forest Environment — `tall-forest/`

- **Autor:** Luis Zuno ([@ansimuz](https://ansimuz.itch.io/))
- **Zdroj:** <https://opengameart.org/node/137607> (`tall_forest_files.zip`, stiahnuté 2026-11-04)
- **Licencia:** CC0 (podľa OpenGameArt); text v balíku: použitie v osobných aj komerčných projektoch, úpravy
  a šírenie povolené, uvedenie autora nie je povinné. Pôvodný text: `tall-forest/LICENSE.txt`.
- **Použité:** parallax vrstvy lesa (`back`, `far`, `middle`), tileset, rekvizity (mach, rastlina, kameň).

### Pixelify Sans (font) — `fonts/PixelifySans.ttf`

- **Autor:** Stefie Justprince (The Pixelify Sans Project Authors)
- **Zdroj:** <https://github.com/google/fonts/tree/main/ofl/pixelifysans> (`PixelifySans[wght].ttf`, stiahnuté 2026-11-04),
  upstream <https://github.com/eifetx/Pixelify-Sans>
- **Licencia:** SIL Open Font License 1.1 — plný text v `fonts/PixelifySans-OFL.txt` (musí ostať pri fonte).
- **Použité:** HUD a obrazovka výsledkov. Pokrýva slovenčinu (overené: á ä č ď é í ĺ ľ ň ó ô ŕ š ť ú ý ž aj veľké);
  mäkčeň na veľkých písmenách je čitateľný od 24 px.
- *Vyskúšané a nepoužité:* Kenney Fonts (CC0) — nemajú znaky s mäkčeňom.

Ďakujeme autorom — pri ansimuzovej grafike uvedenie mena nie je povinné, ale je vítané.
