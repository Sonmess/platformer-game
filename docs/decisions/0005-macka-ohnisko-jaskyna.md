# ADR 0005: Vlastná mačka, ohnisko ako checkpoint, jaskyňa ako cieľ

- Stav: prijaté (2026-11-04), mení časť ADR 0004

## Kontext
Po kroku 9 (playtest) sa líška zo Sunny Land nepáčila: hráčom má byť **mačka, ktorá chodí po štyroch**.
Nepáčili sa ani tabule s lebkou ako checkpointy a dvere ako cieľ — cieľ má súvisieť s lesom.
Repo je **verejné**, takže assety s licenciou „nešíriť“ (Catset, OboroPixel…) v ňom nemôžu byť.
CC0 pixelová mačka na štyroch nohách s behom aj skokom sa nenašla (čierna mačka od Shepardskin nemá skok
a v tmavom lese by zanikla).

## Rozhodnutie
- **Hráč:** vlastná pixelová mačka 32×22 (státie 2, beh 4, odraz + dopad), nakreslená v `tools/sprites.mjs`.
  Hitbox 18×14 podľa tela mačky.
- **Checkpoint:** vlastné ohnisko 24×24 — vyhasnuté, po dosiahnutí horí (4 snímky). Horí len aktuálny checkpoint.
- **Cieľ:** vchod do jaskyne v skalnatom kopci na konci levelu, postavený z dlaždíc Tall Forest
  (nekolízna vrstva `decor` = tmavé vnútro). Cieľová zóna je v otvore.
- Ostáva z ADR 0004: tileset Tall Forest, čerešne a bodáky zo Sunny Land, parallax Tall Forest (krok 10).

## Dôsledky
- Grafika hráča a checkpointu patrí projektu, žiadne licenčné obmedzenia; úpravy = edit textu + `node tools/sprites.mjs`.
- Prvá verzia (mačka 24×16, ohnisko 16×16) bola pri 480×270 primalá — po playteste prekreslené väčšie.
