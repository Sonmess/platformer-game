# ADR 0004: Asset pack

- Stav: prijaté (2026-11-04)

## Kontext
ADR 0002 určilo pixel art 480×270 a CC0 grafiku po greyboxe. ADR 0001 chce les a malé zvieratko (líška/mačka).
Porovnávané: Sunny Land (+ Tall Forest) od ansimuz, Kenney Pixel Platformer (18×18, bez líšky/mačky),
lesné CC0 sady s ľudskou postavou. CC0 mačky na OpenGameArt nie sú v pixel arte, ktorý by ladil s lesom.

## Rozhodnutie
- **Hráč, predmety, efekty, tileset:** *Sunny Land 2D Pixel Art Pack* (ansimuz, CC0) — hráč je **líška**.
- **Parallax lesa:** *SunnyLand Tall Forest Environment* (ansimuz, CC0) — viac vrstiev hlbokého lesa.
- Dlaždice 16×16 sedia s `TILE = 16`, netreba meniť level ani fyziku.
- Zdroje a licencie: `public/assets/CREDITS.md`.

## Dôsledky
- Rovnaký autor → podobný štýl; Tall Forest je tmavší než svetlý Sunny Land — v kroku 9/10 zladiť
  (napr. použiť tileset Tall Forest pre zem, alebo jemne upraviť odtieň pozadia).
- Pozadia Tall Forest sú vysoké 240 px, hra má 270 px → v kroku 10 doplniť horný pás (farba oblohy/koruny)
  alebo vrstvy posunúť, bez neceločíselného škálovania.
- Postava má snímky 33×32 px, hitbox ostáva 12×16 (sprite sa iba vykreslí okolo neho).
- Zbierateľný predmet: drahokam alebo čerešňa namiesto žltej mince (rozhodne sa v kroku 9).
