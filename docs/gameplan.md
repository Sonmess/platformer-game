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

> Stav: **HOTOVÉ** (2026-11-19), schválené 2026-11-05. Rozsah: [ADR 0007](decisions/0007-rozsah-m2.md).

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

- [x] **10. Finálna kontrola M2** — všetky testy, FPS ~60, reštart 10× bez rozdielov, playtest celej hry
  od úvodnej obrazovky po výsledky, aktualizácia dokumentov.

### Predvolené rozhodnutia M2 (zmeníme, ak pri playteste nebudú sedieť)

- Nepriatelia po smrti mačky **neresetujú** pozíciu (pokračujú v patrole); pri reštarte levelu áno.
- Stav vystrašenia je na nepriateľovi, nie globálny; jedno mňauknutie vystraší všetkých v dosahu.
- Hlasitosť hudby a stlmenie sa pamätajú len počas hry (ukladanie nastavení → backlog).

## Milestone 3 — „Lepšia mačka“

> Stav: **HOTOVÉ** (2026-11-19), schválené 2026-11-19. Rozsah: [ADR 0008](decisions/0008-rozsah-m3.md).

Pred ďalšími levelmi vylepšiť samotnú hru: smrť s animáciou a férovým respawnom, 3 životy a klbko vlny
ako power-up, pierka namiesto čerešní, útok pazúrikmi, nový nepriateľ hadík a šplhanie po lianach a kmeňoch.
Stále jeden level (ďalšie levely až v M4). Každý krok prináša aj vlastnú grafiku, zvuky a efekty k novej veci.
Postup ako v M1 a M2: po každom kroku testy, screenshot a tvoj playtest.

### Fáza A — smrť, životy, zásahy

- [x] **1. Animácia smrti a férový respawn** — mačka sa po smrti nezjaví hneď: krátka animácia (vyskočí, pretočí sa
  a spadne / zbledne, ~0,8 s), počas nej je ovládanie vypnuté a kamera stojí. Na checkpointe sa objaví s krátkym
  efektom a **nepohne sa, kým hráč nepustí a znova nestlačí smer** (držaná šípka sa ignoruje), ~1 s bliká
  a je nezraniteľná.
  Test: počas animácie sa mačka nehýbe ani pri držanej šípke; po respawne sa nepohne, kým sa šípka nepustí.
- [x] **2. 3 životy a koniec hry** — v HUD jedna mačacia hlávka za každý život (pôvodne 9, zmenené po playteste). Každá smrť = život dole; pri 0
  obrazovka „Koniec hry“ (Enter = level odznova, Esc = úvodná obrazovka). Výsledky ukážu aj zostávajúce životy.
  Test: smrť uberie život, pri 0 koniec hry, nová hra začína s 3 životmi.
- [x] **3. Pierka namiesto čerešní** — vlastná grafika: bežné pierko (1 bod), strieborné (5 bodov), zlaté
  (10 bodov); jemne sa vznášajú a lesknú. HUD ukazuje body, výsledky body z celkového počtu. Každých 50 bodov
  = stratený život späť (najviac 3; v leveli je 61 bodov, preto 50, nie pôvodných 100). Čerešne zo Sunny Land vypadnú z hry aj z `CREDITS.md`.
  Test: hodnoty pierok, súčet bodov, život späť za 50 bodov.
- [x] **4. Klbko vlny (power-up)** — mačka zoberie klbko a „nafúkne sa“ (väčšia, nadýchaná srsť). Zásah
  (bodáky, nepriateľ, jed) ju vtedy len zmenší a na ~1,5 s je nezraniteľná; zásah malej mačky = smrť. Pád do jamy
  je vždy smrť. Klbká sú v leveli na vybraných miestach. (Hitbox ostáva rovnaký, zväčší sa len vzhľad ×1,25.)
  Test: klbko → veľká; zásah → malá a nezraniteľná; druhý zásah → život dole.

### Fáza B — útok a nový nepriateľ

- [x] **5. Útok pazúrikmi** — kláves C: rýchle švihnutie labkou (~1 dlaždica pred mačkou, krátky cooldown).
  **Vrana**: zasiahnuteľná hneď. **Ježko**: iba keď je vystrašený mňauknutím; zaútočiť na nevystrašeného =
  mačka sa popichá (zásah). Zasiahnutý nepriateľ komicky **uteká / odletí z levelu** a do reštartu levelu sa
  nevráti.
  Test: dosah a cooldown, vrana odletí, vystrašený ježko utečie, nevystrašený ježko mačku zraní.
  Stav: dosah = od stredu mačky po 14 px pred jej hitbox (±12 px na výšku), cooldown 0,4 s, aj vo vzduchu. Vlastná snímka
  s vystretou labkou, tri šmuhy pazúrov, chumáč srsti a zvuky (švih, výkrik + cupot). Utečený nepriateľ ostáva preč aj
  po smrti mačky, vráti sa až s novou hrou. Logika v `src/core/claw.ts` (unit testy), scenáre v `tests/e2e/claw.spec.ts`.
  Pocit a čitateľnosť: overené playtestom.
- [x] **6. Hadík** — nový nepriateľ: plazí sa na krátkom úseku a v pravidelnom cykle **strieka jed okolo seba**
  (oblak v okruhu ~1,5 dlaždice). Pred striekaním sa varovne nafúkne; medzi vlnami je chvíľa, keď sa dá
  zaútočiť pazúrikmi. Mňauknutie naňho nepôsobí. Dotyk hadíka aj jedu = zásah.
  Test: cyklus jedu, jed zraňuje, útok v pauze ho vyženie, mňauknutie nič.
  Stav: cyklus 1,8 s pokoj (plazí sa) → 0,7 s varovanie (zastaví sa, kobria kapucňa s fialovými škvrnami, syčanie)
  → 0,7 s jed (fialový oblak s polomerom presne 1,5 dlaždice, kvapky, „pššš“). Hitbox 16×8, vlastné sprity a zvuky.
  Tiled typ `snake` (obdĺžnik = úsek, spodná hrana = zem). Zatiaľ jeden hadík v leveli (stĺpce 76–79, pred stenou za
  druhým checkpointom), poriadne rozmiestnenie v kroku 8. Logika v `src/core/venom.ts` (unit testy), scenáre
  v `tests/e2e/snake.spec.ts`. Pocit a férovosť: overené playtestom.

### Fáza C — šplhanie

- [x] **7. Liany a kmene** — visiace liany a šplhateľné kmene (Tiled objekty `vine` a `trunk`). Pri liane/kmeni
  šípka hore (W) chytí a šplhá hore, dole (S) zlieza, do strán sa dá z kmeňa/liany odraziť skokom (medzerník).
  Na kmeň sa mačka chytí aj pri skoku proti nemu. Vlastná grafika lián a kmeňov s kôrou, animácia šplhania.
  Test: chytenie, šplhanie hore/dole, odraz skokom, pustenie na vrchu.
  Stav: Tiled obdĺžniky `trunk` (spodná hrana = zem; korene a koruna) a `vine` (visí z hornej hrany, zakrútený
  koniec). Šípka hore / W chytí (aj vo vzduchu) a šplhá 72 px/s; pustená šípka = mačka visí na mieste (bez gravitácie);
  dole / S zlieza, na zemi sa pustí. Medzerník + smer = odraz do strany (skok 3 dlaždice, dá sa skrátiť), medzerník bez
  smeru = pustí sa. Na vrchu podržaná šípka hore mačku vytiahne malým poskokom (1,5 dlaždice), aby mohla vystúpiť na
  rímsu vedľa. Kmeň chytí aj skok proti nemu (vo vzduchu so šípkou k nemu), chôdza okolo nie. Pri liane/kmeni skáče iba
  medzerník (šípka hore šplhá), inde šípka hore skáče ako doteraz. Vlastná grafika (kôra, korene, koruna, liana,
  mačka zozadu s dvomi snímkami šplhania), zvuky (škrabnutie pri chytení, ťuknutia pri šplhaní) a úlomky kôry/lístky.
  Zatiaľ jeden kmeň (stĺpec 1, s rímsou na riadku 7, stĺpce 3–5) a jedna liana (stĺpec 7) pri štarte, poriadne
  rozmiestnenie v kroku 8. Logika v `src/core/climb.ts` (unit testy), scenáre v `tests/e2e/climb.spec.ts`.
  Pocit a čitateľnosť: overené playtestom.

### Fáza D — level a záver

- [x] **8. Úprava levelu** — pierka (aj strieborné a zlaté na ťažších miestach), klbká, hadíky a liany/kmene
  zakomponované do levelu; každá novinka sa najprv predstaví v bezpečnej situácii.
  Test: `route.spec` prejde celý level (aj s útokmi, šplhaním a hadíkmi). Férovosť: overené playtestom.
  Stav: štart (stĺpce 0–15) predstaví šplhanie bez rizika — kmeň so strieborným pierkom na rímse, liana s tromi
  modrými pierkami. Za checkpointom 56 kmeň (stĺpec 59) na rímsu nad širokou jamou so zlatým pierkom, z nej sa
  zoskakuje na plošinu (nepovinná odbočka). Hadík č. 1 ostáva na rovine za checkpointom 73 (bezpečné predstavenie),
  hadík č. 2 stráži útes za checkpointom 190 (stĺpce 193–195, klbko pred ním). Liana v stĺpci 219 končí nad zemou,
  chytá sa výskokom so šípkou hore a vedie na strechu jaskyne so strieborným pierkom. Body z pierok 61 → 84
  (hranica 50 za život ostáva). `route.spec` hrá celý level v 7 úsekoch (od štartu, s pazúrikmi na hadíky, šplhaním
  po kmeňoch a lianach). Férovosť: overené playtestom.
- [x] **9. Finálna kontrola M3** — všetky testy, FPS ~60, reštart 10× bez rozdielov, playtest celej hry,
  aktualizácia dokumentov.
  Stav: unit testy (70) a všetky e2e testy (126) prechádzajú, build je v poriadku. FPS test (> 55 FPS) prechádza
  so zapojenou nabíjačkou (3× za sebou bez opakovania); na batérii notebook obmedzí GPU a hra má len ~40 FPS. Test „reštart 10×“ teraz špiní
  aj stav z M3 (vystrašený a utečený ježko, šplhanie po liane, klbko a veľká mačka, body) a porovnáva aj body,
  klbká a liany/kmene. Úvodná obrazovka ukazuje pazúry a šplhanie a „pierka“ namiesto „čerešní“ (text posunutý
  vyššie, aby sa neprekrýval s „Enter = hrať“). README a backlog aktualizované. Playtest celej hry
  od úvodnej obrazovky po výsledky: v poriadku.

### Predvolené rozhodnutia M3 (zmeníme, ak pri playteste nebudú sedieť)

- Kláves útoku je **C** (vedľa X = mňau). Šípka hore / W pri liane alebo kmeni šplhá, inde skáče ako doteraz.
- Utečení nepriatelia sa vrátia až pri reštarte levelu alebo po konci hry, nie po smrti mačky.
- Koniec hry vracia na začiatok levelu (checkpointy sa zabudnú), body z pierok sa nulujú.
- Veľká mačka (s klbkom) má rovnako široký hitbox ako malá, len o niečo vyšší — level sa nemusí prerábať.

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
| 9 | Asset pack | Tall Forest (tileset, parallax) + Sunny Land (bodáky; čerešne nahradili v M3 vlastné pierka), ansimuz, CC0 | [0004](decisions/0004-asset-pack.md) |
| 10 | Mačka, checkpoint, cieľ | Vlastná mačka a ohnisko (`tools/sprites.mjs`), cieľ = vchod do jaskyne | [0005](decisions/0005-macka-ohnisko-jaskyna.md) |
| 11 | Zvukové efekty | Vlastné 8-bit zvuky generované skriptom `tools/sfx.mjs` | [0006](decisions/0006-vlastne-zvuky.md) |
| 12 | Rozsah M2 | Úvodná obrazovka, pauza, hudba, ježko a vrána vystrašení mňauknutím (bez stompu), pohyblivé a prepadávacie plošiny; ďalšie levely v M3 | [0007](decisions/0007-rozsah-m2.md) |
| 13 | Rozsah M3 | Animácia smrti, 3 životy + klbko vlny, pierka (1/5/10 bodov), útok pazúrikmi, hadík s jedom, šplhanie po lianach a kmeňoch; ďalšie levely v M4 | [0008](decisions/0008-rozsah-m3.md) |

## Mimo rozsahu M1

Viac levelov, menu s nastaveniami, ukladanie postupu, leaderboard, multiplayer.

## Mimo rozsahu M2

Ďalšie levely a palety (M3), stomp mechanika (zámerne nie), dvojskok a wall jump, mobil a gamepad,
menu s nastaveniami a ich ukladanie, verejné nasadenie.

## Mimo rozsahu M3

Ďalšie levely a palety (M4), stomp mechanika (zámerne nie), dvojskok a wall jump, mobil a gamepad,
menu s nastaveniami a ich ukladanie (aj ukladanie postupu), verejné nasadenie.
