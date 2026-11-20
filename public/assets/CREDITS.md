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
- **Použité:** bodáky. (Čerešňa ako zbierateľný predmet do M2, v M3 ju nahradili vlastné pierka.) V repe pripravené aj čerešňa, drahokam, efekty zberu a zániku,
  tileset, pozadie (`back`, `middle`) a rekvizity (strom, ker, kameň, huby).
- **Odstránené z repa (2026-11-04):** spritesheety líšky, tabuľa a dvere — nahradené vlastnou grafikou (nižšie).
- **Nepoužité:** hudba z balíka (Pascal Belisle) — tá *vyžaduje* uvedenie autora; ak ju niekedy pridáme, doplniť sem.
- Názvy súborov ponechané ako v balíku (vrátane preklepov `payer-run.png`, `enemy-deadth.png`).

### SunnyLand Tall Forest Environment — `tall-forest/`

- **Autor:** Luis Zuno ([@ansimuz](https://ansimuz.itch.io/))
- **Zdroj:** <https://opengameart.org/node/137607> (`tall_forest_files.zip`, stiahnuté 2026-11-04)
- **Licencia:** CC0 (podľa OpenGameArt); text v balíku: použitie v osobných aj komerčných projektoch, úpravy
  a šírenie povolené, uvedenie autora nie je povinné. Pôvodný text: `tall-forest/LICENSE.txt`.
- **Použité:** parallax vrstvy lesa (`back`, `far`, `middle`; `middle` aj druhýkrát ako bližšia vrstva — zrkadlená
  a stmavená). Tileset terénu bol do 2026-11-20 tiež odtiaľto; nahradili ho vlastné dlaždice (nižšie, ADR 0009) a z repa
  bol odstránený.

### Pixelify Sans (font) — `fonts/PixelifySans.ttf`

- **Autor:** Stefie Justprince (The Pixelify Sans Project Authors)
- **Zdroj:** <https://github.com/google/fonts/tree/main/ofl/pixelifysans> (`PixelifySans[wght].ttf`, stiahnuté 2026-11-04),
  upstream <https://github.com/eifetx/Pixelify-Sans>
- **Licencia:** SIL Open Font License 1.1 — plný text v `fonts/PixelifySans-OFL.txt` (musí ostať pri fonte).
- **Použité:** HUD a obrazovka výsledkov. Pokrýva slovenčinu (overené: á ä č ď é í ĺ ľ ň ó ô ŕ š ť ú ý ž aj veľké);
  mäkčeň na veľkých písmenách je čitateľný od 24 px.
- *Vyskúšané a nepoužité:* Kenney Fonts (CC0) — nemajú znaky s mäkčeňom.

### Vlastná grafika projektu — `own/`

- **Mačka** (`cat-idle`, `cat-run`, `cat-jump`, `cat-meow`, `cat-hurt`, `cat-claw`, hlávka do HUD `cat-head`), **pierka** (`feather-normal`, `feather-silver`, `feather-gold`), **klbko vlny** (`yarn`), **ohnisko** (`campfire-unlit`, `campfire-lit`),
  **ježko** (`hedgehog-walk`, `hedgehog-scared`), **vrana** (`crow-fly`, `crow-scared`) a **hadík** (`snake-slither`, `snake-warn`, `snake-spray`) nakreslené pre tento projekt
  ako textový pixel art v `tools/sprites.mjs`; PNG generuje `node tools/sprites.mjs`. Bez cudzej licencie, patrí projektu.
- **Dlaždice terénu** (`tiles/grass.png` v hre; `tiles/bricks.png` a `tiles/rock.png` pripravené pre ďalšie levely; prepadávacie plošiny `tiles/crumble-*.png`) —
  kreslené procedurálne pre tento projekt skriptom `tools/tiles.mjs`; PNG generuje `node tools/tiles.mjs`. Bez cudzej
  licencie, patrí projektu.
- **Liany a stromy** (`trunk-bark`, `trunk-roots`, `trunk-crown`, `vine-stem`, `vine-tip`, `vine-knot`) a **šplhajúca mačka**
  (`cat-climb`) — textový pixel art v `tools/sprites.mjs`, ako ostatné postavy.
- **Zvukové efekty** (`sfx/`: skok, dopad, pierko, život späť, klbko (nafúknutie / zmenšenie), ohnisko, smrť, cieľ, mňau, švihnutie pazúrikmi, útek nepriateľa, syčanie a striekanie jedu hadíka, chytenie a šplhanie, vystrašenie, praskanie a zrútenie plošiny, koniec hry) — 8-bitové zvuky syntetizované pre tento
  projekt skriptom `tools/sfx.mjs`; WAV generuje `node tools/sfx.mjs`. Bez cudzej licencie, patrí projektu.
- **Hudba** (`music/forest.wav`) — pokojná 8-bitová slučka (30 s) skomponovaná pre tento projekt v
  `tools/music.mjs`; WAV generuje `node tools/music.mjs`. Bez cudzej licencie, patrí projektu.

Ďakujeme autorom — pri ansimuzovej grafike uvedenie mena nie je povinné, ale je vítané.
