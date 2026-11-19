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

- [x] **1. Hráč a pohyb** — beh, jednoduchý skok, vstupná vrstva `Input.ts`, test API `press()`/`teleport()`.
  Test: po spawne stojí na zemi, `press(right)` ho posunie doprava, skok ho dostane nad zem a späť.
- [x] **2. Level z tilemapy** — greybox Tiled JSON, 4–5 obrazoviek, plošiny, jama.
  Test: stena zastaví hráča, plošinou neprepadne.
- [x] **3. Kamera** — sledovanie s deadzone, look-ahead, hranice levelu.
  Test: kamera sa posunie a nepresiahne okraj levelu.
- [x] **4. Smrť a respawn** — jama, bodáky, checkpointy, event bus, `state.ts`.
  Test: smrť → respawn na checkpointe, počet smrtí +1.
- [x] **5. Zbierateľné predmety + HUD** — mince, počítadlo (paralelná scéna Hud).
  Test: zber mince → počet +1, minca zmizne.
- [x] **6. Cieľ + „Level complete“** — výsledky a reštart.
  Test: cieľ → LevelComplete; reštart 5× dá rovnaký počiatočný stav.

### Fáza B — pocit zo skoku

- [x] **7. Ladenie skoku** — fyzika odvodená z výšky skoku a času do vrcholu, coyote time, jump buffer,
  variabilná výška, ťažší pád, zrýchlenie/brzdenie.
  Test: výška plného skoku ±15 %, ťuk nižší ako podržanie, coyote a buffer fungujú. Pocit: overené playtestom.

### Fáza C — vizuál

- [x] **8. Výber CC0 asset packu** — 2–3 návrhy, licencie overené, zápis do `public/assets/CREDITS.md`.
- [x] **9. Grafika levelu a postavy** — tileset, animácie (státie, beh, skok, pád), mince, bodáky, cieľ.
  Test: stav animácie v `getState()` zodpovedá pohybu.
- [x] **10. Parallax pozadie** — 4–5 vrstiev.
  Test: vrstvy sa posúvajú rôznou rýchlosťou.

### Fáza D — efekty, zvuk, záver

- [x] **11. Juice** — prach pri skoku/dopade, squash & stretch, jemný shake pri smrti, efekt zberu.
  Test: efekty nemenia fyziku. Pocit: overené playtestom.
- [x] **12. Zvukové efekty** — skok, dopad, zber, ohnisko, smrť, cieľ (vlastné 8-bit, ADR 0006).
  Test: eventy spúšťajú zvuky. Hlasitosť a kvalita: overené playtestom.
- [x] **13. Finálna kontrola M1** — všetky testy, FPS ~60, playtest celého levelu, aktualizácia dokumentov.

## Milestone 2 — „Hra s obsahom“

> Stav: **SCHVÁLENÉ** (2026-11-05). Rozsah: [ADR 0007](decisions/0007-rozsah-m2.md).

Z prototypu krátka hra, ktorú sa oplatí dohrať: úvodná obrazovka, pauza, hudba, nepriatelia, ktorých mačka
**vystraší mňauknutím** (bez stomp mechaniky), a pohyblivé a prepadávacie plošiny. Stále jeden level
(ďalšie levely až v M3). Každý krok prináša aj vlastnú grafiku (`tools/sprites.mjs`), zvuky (`tools/sfx.mjs`)
a efekty k novej veci, nie až na konci. Postup ako v M1: po každom kroku testy, screenshot a tvoj playtest.

### Fáza A — rámec hry

- [x] **1. Úvodná obrazovka „Lost Cat“** — názov, pohybujúce sa parallax pozadie, ovládanie,
  „Enter = hrať“. Hra štartuje z nej; z výsledkov Enter/R = hrať znova, Esc = na úvodnú obrazovku.
  Test: boot → Title, Enter → Game, výsledky → Esc → Title; listenery sa nezdvojujú.
- [x] **2. Pauza** — Esc alebo P: zastaví fyziku, čas levelu, animácie a efekty; prekrytie „Pauza“
  (pokračovať / na úvodnú obrazovku).
  Test: počas pauzy sa hráč ani čas nemenia; po pokračovaní hra pokračuje rovnako.
- [x] **3. Hudba** — vlastná pokojná 8-bit slučka (~30 s, bez počuteľného švu) generovaná skriptom
  `tools/music.mjs`; hrá na úvodnej obrazovke aj v leveli, počas pauzy stíšená. M = stlmiť/zapnúť hudbu.
  Test: hrá v slučke, M prepína, po reštarte levelu sa nezdvojí. Kvalita a hlasitosť: overené playtestom.

### Fáza B — mňaukanie a nepriatelia

- [x] **4. Mňaukanie** — kláves X: mačka mňaukne (snímka s otvorenou papuľou, vlna, zvuk), event
  `player:meow`. Dosah ~4 dlaždice pred mačkou, cooldown ~2 s (viditeľný na mačke alebo v HUD).
  Test: cooldown blokuje opakovanie, event nesie pozíciu a smer.
- [x] **5. Ježko** — chodí tam a späť, na okraji plošiny alebo pri stene sa otočí. Dotyk = smrť mačky.
  Po mňauknutí v dosahu sa ~3 s zvinie do gule, trasie sa a je neškodný (dá sa cezeň prejsť),
  potom pokračuje.
  Test: patrola neprepadne z plošiny, dotyk zabije, vystrašený nezabije, po ~3 s opäť nebezpečný.
- [x] **6. Vrána** — lieta hore-dole (alebo tam a späť) v zadanom rozsahu. Dotyk = smrť. Po mňauknutí
  ~3 s zamrzne vo vzduchu, trasie sa a je neškodná.
  Test: drží sa svojej dráhy, vystrašenie funguje rovnako ako pri ježkovi.

### Fáza C — plošiny a level

- [x] **7. Pohyblivé plošiny** — vodorovné a zvislé; mačka sa na nich vezie a dá sa z nich skákať.
  Test: hráč stojiaci na plošine sa pohybuje s ňou a neprepadne; skok z pohybujúcej sa plošiny funguje.
- [x] **8. Prepadávacie plošiny** — po dotyku sa ~0,5 s trasú, potom padnú a po chvíli sa vrátia;
  po smrti sú späť na mieste.
  Test: časovanie pádu a návratu, reset po respawne.
- [x] **9. Úprava levelu** — zakomponovať nepriateľov a plošiny do `level1` (prípadne ho predĺžiť), aby
  každá nová vec mala svoje miesto a level mal stúpajúcu obtiažnosť.
  Test: traversal testy pre všetky nové úseky (aj s nepriateľmi a mňaukaním). Férovosť: overené playtestom.

### Fáza D — záver

- [ ] **10. Finálna kontrola M2** — všetky testy, FPS ~60, reštart 10× bez rozdielov, playtest celej hry
  od úvodnej obrazovky po výsledky, aktualizácia dokumentov.

### Predvolené rozhodnutia M2 (zmeníme, ak pri playteste nebudú sedieť)

- Nepriatelia po smrti mačky **neresetujú** pozíciu (pokračujú v patrole); pri reštarte levelu áno.
- Stav vystrašenia je na nepriateľovi, nie globálny; jedno mňauknutie vystraší všetkých v dosahu.
- Hlasitosť hudby a stlmenie sa pamätajú len počas hry (ukladanie nastavení → backlog).

## Rozhodnutia

| # | Téma | Rozhodnutie | ADR |
|---|---|---|---|
| 1 | Téma / prostredie | Les / príroda | [0001](decisions/0001-tema-a-postavicka.md) |
| 2 | Postavička | Mačka na štyroch nohách (vlastná grafika) | [0001](decisions/0001-tema-a-postavicka.md), [0005](decisions/0005-macka-ohnisko-jaskyna.md) |
| 3 | Vizuálny štýl | Pixel art 480×270, celočíselný zoom, `pixelArt: true` | [0002](decisions/0002-vizualny-styl-a-grafika.md) |
| 4 | Grafika | Greybox, potom CC0 asset pack (licencie do `public/assets/CREDITS.md`) | [0002](decisions/0002-vizualny-styl-a-grafika.md) |
| 5 | Mechaniky navyše | Žiadne v M1 (dvojskok, nepriatelia → backlog) | [0003](decisions/0003-rozsah-m1.md) |
| 6 | Mobil | Nie, len klávesnica v M1 | [0003](decisions/0003-rozsah-m1.md) |
| 7 | Zvuk | Jednoduché SFX cez event bus, hudba neskôr | [0003](decisions/0003-rozsah-m1.md) |
| 8 | Nasadenie | Lokálne demo, bez verejného nasadenia | [0003](decisions/0003-rozsah-m1.md) |
| 9 | Asset pack | Tall Forest (tileset, parallax) + Sunny Land (čerešne, bodáky), ansimuz, CC0 | [0004](decisions/0004-asset-pack.md) |
| 10 | Mačka, checkpoint, cieľ | Vlastná mačka a ohnisko (`tools/sprites.mjs`), cieľ = vchod do jaskyne | [0005](decisions/0005-macka-ohnisko-jaskyna.md) |
| 11 | Zvukové efekty | Vlastné 8-bit zvuky generované skriptom `tools/sfx.mjs` | [0006](decisions/0006-vlastne-zvuky.md) |
| 12 | Rozsah M2 | Úvodná obrazovka, pauza, hudba, ježko a vrána vystrašení mňauknutím (bez stompu), pohyblivé a prepadávacie plošiny; ďalšie levely v M3 | [0007](decisions/0007-rozsah-m2.md) |

## Mimo rozsahu M1

Viac levelov, menu s nastaveniami, ukladanie postupu, leaderboard, multiplayer.

## Mimo rozsahu M2

Ďalšie levely a palety (M3), stomp mechanika (zámerne nie), dvojskok a wall jump, mobil a gamepad,
menu s nastaveniami a ich ukladanie, verejné nasadenie.
