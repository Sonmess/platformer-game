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

## Milestone 4 — „Do jaskyne“

> Stav: **HOTOVÉ** (2026-11-20), schválené 2026-11-20. Rozsah: [ADR 0010](decisions/0010-rozsah-m4.md).

Hra dostane druhý level: mačka vojde do jaskyne na konci lesa a prechádza ňou k východu. Jaskyňa má vlastný terén,
pozadie a hudbu a jeden nový prvok — padajúce stalaktity. Levely sa stanú dátami (rámec aj pre ďalšie levely),
postup medzi nimi je lineárny a hra si pamätá odomknuté levely. Postup ako doteraz: po každom kroku testy,
screenshot a tvoj playtest; každá novinka prináša vlastnú grafiku, zvuky a efekty.

### Fáza A — rámec pre viac levelov

- [x] **1. Levely ako dáta** — zoznam `LEVELS` v `constants.ts`: mapa (Tiled JSON), štýl terénu a jeho varianty,
  vzhľad prepadávacích plošín, vrstvy pozadia a farba oblohy, hudba, názov. Scéna `Game` dostane číslo levelu
  (`init`), `state.level` ho nesie, dev parameter `?play=2` spustí rovno level 2. Level 1 sa nezmení.
  `tests/e2e/landmarks.ts` dostane level ako parameter.
  Test: každý level sa načíta a dá sa reštartovať 10× bez rozdielov; listenery nerastú pri prechode medzi levelmi.
  Stav: `LEVELS` a `levelDef()` v `constants.ts`, mapy v `src/levels/index.ts`; textúry plošín sa pečú pre každý
  level zvlášť (`platform-level1-3`, `crumble-level2-3`…), pozadie a obloha idú z definície levelu. Výsledky aj koniec
  hry reštartujú aktuálny level. Level 2 je zatiaľ greybox (60 stĺpcov, skalný terén so stropom, jama, checkpoint,
  prepadávacia plošina, cieľ; lesné pozadie do kroku 5). Test API: `levelNumber`, `levelName`; `landmarks(n)`
  v testoch; nový `tests/e2e/levels.spec.ts`.
- [x] **2. Prechod medzi levelmi** — výsledky levelu: Enter = ďalší level (s krátkym prelínaním), Esc = úvodná
  obrazovka; životy a body sa prenášajú (výsledky ukážu body za level aj spolu). Po poslednom leveli záverečná
  obrazovka. Koniec hry vráti na začiatok aktuálneho levelu s 3 životmi.
  Test: cieľ levelu 1 → výsledky → Enter → level 2 s rovnakými životmi; koniec hry v leveli 2 → znova level 2.
  Stav: výsledky — Enter = ďalší level (prelínanie), R = ten istý level znova (so životmi a bodmi ako na jeho začiatku,
  takže sa nedajú „farmiť“ pierka), Esc = úvodná obrazovka. Riadky: pierka levelu, „Spolu“ za celú hru, životy, čas.
  Po poslednom leveli titul „Hra dokončená!“ a Enter = nová hra od levelu 1. HUD ukazuje body za celú hru a život navyše
  sa počíta z nich. Logika v `state.enter('new' | 'next' | 'replay' | 'retry')` (unit testy), scenáre
  v `tests/e2e/levels.spec.ts`.
- [x] **3. Uložený postup a výber levelu** — prehliadač si pamätá najvyšší odomknutý level (`localStorage`,
  bez chyby pri zablokovanom úložisku). Úvodná obrazovka: Enter = pokračovať, šípky ←/→ = výber z odomknutých
  levelov (názov levelu na obrazovke).
  Test: dokončenie levelu ho odomkne, po obnovení stránky ostáva; zamknutý level sa vybrať nedá; bez úložiska hra
  začne od levelu 1.
  Stav: kľúč `lost-cat:unlocked-level` (najvyšší odomknutý level, len rastie). Úvodná obrazovka predvolene vyberie
  najvyšší odomknutý level („Enter = pokračovať“), riadok „level 2: Jaskyňa“ so šípkami tam, kam sa dá posunúť.
  Poškodená hodnota alebo zablokované úložisko = level 1, bez chyby. Text na úvodnej obrazovke posunutý vyššie a mačka
  doľava, aby sa nič neprekrývalo. Logika v `src/core/progress.ts` (unit testy), scenáre v `tests/e2e/progress.spec.ts`.

### Fáza B — vzhľad jaskyne

- [x] **4. Terén jaskyne** — nový štýl v `tools/tiles.mjs`: tmavá vlhká skala s kryštálmi, strop (spodný rad bloku)
  s kvapľami a kvapkami, varianty ako pri tráve; vlastný vzhľad prepadávacích plošín v jaskyni.
  Test: varianty sedia s konštantami (unit test ako pri tráve). Vzhľad: overené playtestom.
  Stav: štýl `cave` v `tools/tiles.mjs` — hrboľatá tmavá skala s vlhkými odleskami a prasklinami, svetlejší
  ošúchaný okraj na chodenie (miestami mach), spodný rad bloku = strop s kvapľami (2–7 px) a kvapkami vody; varianty:
  fialové kryštály, vlhký pruh, tyrkysový kryštál. Prepadávacie plošiny v jaskyni: svetlý krehký vápenec s prasklinami.
  Pravidlo pre mapy: podlahy = vrchný + stredný rad, stropy a previsy = stredný + spodný rad. Greybox levelu 2 to už
  používa (strop, nižší previs, plávajúca rímsa). Vzhľad: čaká na playtest (pozadie je do kroku 5 ešte les).
- [x] **5. Pozadie jaskyne** — vlastné parallax vrstvy (nový generátor v `tools/`): vzdialená stena jaskyne so
  slabo žiariacimi kryštálmi, siluety stalagmitov a stalaktitov, bližšie visiace korene; tmavá paleta.
  Test: vrstvy sa posúvajú rôznou rýchlosťou a každý level má svoje pozadie. Vzhľad: overené playtestom.
  Stav: `tools/parallax.mjs` kreslí 4 vrstvy vysoké ako level, bez švu pri opakovaní: stena jaskyne s matne žiariacimi
  kryštálmi (0,1), vzdialené stalaktity a stalagmity (0,3), veľké stĺpy s kryštálmi (0,5), visiace korene a balvany
  (0,75); obloha `#0d0b14`. Z lesa v jaskyni nič neostalo. FPS na nabíjačke: 59–60 v oboch leveloch.
  Vzhľad: čaká na playtest.
- [x] **6. Hudba jaskyne** — druhá slučka v `tools/music.mjs` (pomalšia, s ozvenou); hudba sa pri zmene levelu
  prelne, M a pauza fungujú ako doteraz.
  Test: v leveli 2 hrá jaskynná slučka, vždy len jedna inštancia hudby. Kvalita: overené playtestom.
  Stav: `cave.wav` — 8 taktov, 66 BPM (~29 s), d mol (Dm–B–Gm–A): nízky bordún, jemne rozložené akordy, pomalá
  melódia s dvoma tichšími ozvenami (o bodkovanú osminu), kvapky vody a dunenie pod akordom A, ktorý vedie späť na Dm.
  Lesná slučka sa nezmenila. Každý level má svoju skladbu (`LevelDef.music`); pri zmene levelu sa prelínajú 1,2 s,
  prelínanie beží na hernej slučke, takže prežije prepínanie scén. Úvodná obrazovka hrá les. Kvalita: čaká na playtest.

### Fáza C — nový prvok a level

- [x] **7. Padajúce stalaktity** — visia zo stropu (Tiled typ `stalactite`); keď mačka prebehne pod nimi, ~0,4 s
  sa trasú a sypú kamienky (varovanie, zvuk), potom spadnú a pri dopade sa rozbijú (prach, zvuk). Zásah = zásah
  (veľká mačka sa len zmenší, malá zomrie). Po respawne visia späť. Logika v `src/core/` (unit testy).
  Test: spustí ich prechod pod nimi, varovanie pred pádom, pád zraní, rýchly beh stihne prebehnúť, reset po respawne.
  Stav: Tiled bod `stalactite` = miesto, kde visí (horný stred). Spúšťa ho mačka pod hrotom do 24 px do strany;
  0,45 s sa trasie (hukot, sypú sa kamienky), potom padá (gravitácia 1400 px/s², max. 520 px/s) na prvú pevnú dlaždicu
  pod sebou, nad jamou vypadne z levelu. Zraňuje len počas pádu (hitbox 8×16 nad hrotom), príčina smrti `stalactite`.
  Pri dopade sa rozbije (kúsky, krátke zatrasenie kamery, zvuk). Bežiaca mačka stihne prebehnúť, stojaca nie.
  Po respawne visí späť. Vlastný sprite (12×26) a zvuky `rumble`/`shatter` (hrajú len blízko kamery). V greybox
  leveli 2 sú tri. Logika v `src/core/stalactite.ts` (unit testy), scenáre v `tests/e2e/stalactite.spec.ts`.
  Pocit a férovosť: čaká na playtest.
- [x] **8. Level 2 „Jaskyňa“** — ~200 stĺpcov, nadväzuje na vchod do jaskyne z levelu 1, cieľ = východ z jaskyne
  (svetlo). Stalaktity sa najprv predstavia bezpečne, potom nad jamami a s nepriateľmi; ježkovia, hadíky, liany
  (korene z otvorov v strope), pohyblivé a prepadávacie plošiny nad priepasťami, 5–6 checkpointov, pierka
  (~80–90 bodov, aby jedno prejdenie dalo život navyše), klbká.
  Test: `route.spec` prejde level 2 po úsekoch (aj so stalaktitmi). Férovosť a obtiažnosť: overené playtestom.
  Stav: 200 stĺpcov, 4 checkpointy (61, 98, 133, 171; prvý v stĺpci 28 a prvé klbko odstránené po playteste — level
  bol príliš ľahký), 37 pierok za 83 bodov, 8 stalaktitov, 3 ježkovia, 2 hadíci, 1 klbko. Úseky: vstup (prvý stalaktit nad rovinou) → ježko, dvojica stalaktitov, jama so stalaktitom
  nad dopadom → priepasť (pohyblivá plošina 2 dlaždice nad okrajom, dve vápencové plošiny, rímsa, hadík) → korene
  (útes len cez koreň, zlaté pierko pod nízkym stropom, koreň nad 6 dlaždíc širokou jamou) → hadík, jama a nízka
  chodba so 4 stalaktitmi → ježko, vápencové plošiny nad poslednou jamou, východ. `route.spec` hrá všetkých 6 úsekov
  (robot pri hadíkoch sleduje vzdialenosť priebežne a švihne až na zemi). Korene zatiaľ vyzerajú ako liany.
  Férovosť a obtiažnosť: čaká na playtest.

### Fáza D — záver

- [x] **9. Finálna kontrola M4** — všetky testy, FPS ~60 v oboch leveloch (so zapojenou nabíjačkou), reštart 10×
  v oboch leveloch, playtest od úvodnej obrazovky cez oba levely po záverečnú obrazovku, aktualizácia dokumentov.
  Stav: unit testy (88) a všetky e2e testy (157) prechádzajú, build je v poriadku. FPS test beží v oboch leveloch
  (> 55 FPS, so zapojenou nabíjačkou). Reštart 10× v jaskyni teraz špiní aj stav z M4 (spadnutý stalaktit a smrť pod ním,
  klbko, pierko) a porovnáva stalaktity, nepriateľov, body, klbká, HUD a hudbu. README, backlog a CLAUDE.md
  aktualizované. Playtest (2026-11-20): hra funguje, pred uzavretím M4 ešte doladenie jaskyne (fáza E); krok 9 sa
  zopakuje po nej. Zopakované po fáze E a odstránení prvého checkpointu a klbka v jaskyni: build, unit testy (89)
  a všetky e2e testy (161) prechádzajú, FPS test v oboch leveloch bez opakovania (na nabíjačke). Playtest: v poriadku.

### Fáza E — doladenie jaskyne (po playteste 2026-11-20)

Každý bod je samostatný krok s vlastným testom, screenshotom a playtestom.

- [x] **10. Východ z jaskyne** — na konci levelu 2 otvor v skale s mesačným svetlom, ktorý ukazuje von do lesa za
  súmraku (nadväzuje na ďalší level). Najprv 3 návrhy, vyberieš jeden.
  Test: východ je na mieste cieľa, vbehnutie doň dokončí level. Vzhľad: overené playtestom.
  Stav: vybraný návrh 1 „oblúk do súmraku“ (`tools/exit.mjs`, 96×208): koncová stena jaskyne s oblúkovým otvorom,
  von vidno oblohu za súmraku, kosáčik mesiaca, hviezdy a siluety ihličnanov; šikmý pás mesačného svetla na zemi
  a živé svetlušky pred otvorom (`CaveExit`, `EXIT` v constants). Cieľ sa posunul do otvoru (stĺpce 198–199).
  `LevelDef.exit` — aj ďalšie levely môžu mať vlastný výhľad pri cieli. Vzhľad: čaká na playtest.
- [x] **11. Tajná miestnosť so zlatou rybičkou** — za falošnou stenou (vyzerá ako skala, dá sa ňou prejsť; keď mačka
  vojde, stena sa spriehľadní). Malá prasklina ako nápoveda: prejde ňou len malá mačka (s klbkom nie). Vo vnútri
  **zlatá rybička** — poklad bez vplyvu na hru, jeden na level; výsledky ukážu „Poklad 1/1“ a hra si nájdené poklady
  pamätá. (Neskôr sa dajú vymeniť u obchodníka za kozmetiku — backlog.)
  Test: veľká mačka neprejde, malá áno; stena sa spriehľadní; rybička sa zoberie, ukáže vo výsledkoch a ostane
  zapamätaná po obnovení stránky.
  Stav: miestnosť je vnútri útesu (stĺpce 113–118, riadky 12–14), vchod sprava od zeme za útesom, s tenkou prasklinou.
  Prasklina je výrazná (16×40 px, tmavá kľukatá trhlina s osvetleným okrajom a kamienkami, zväčšená po playteste; z praskliny občas vyletí obláčik prachu, akoby z nej ťahal prievan). Tiled obdĺžnik `secret` (vlastnosť `entrance`) = falošná skala: dlaždice bez kolízie, vnútri sa spriehľadnia na 22 %,
  pri vchode zóna, ktorá zastaví len veľkú mačku. Zlatá rybička (Tiled bod `treasure`, vlastný sprite s lesknutím)
  je za skalou, zvonku ju nevidno. Zvuky: tajomný tón pri objavení, fanfárka pri rybičke; zlaté iskry. Výsledky:
  „Poklad n/1“ (len v leveloch s pokladom); nájdené poklady si hra pamätá (`lost-cat:treasures`), už nájdená rybička
  je slabšia, ale dá sa zobrať znova. Robot v `route.spec` si ju cestou berie. Logika uloženia v `src/core/progress.ts`
  (unit testy), scenáre v `tests/e2e/secret.spec.ts`. Pocit a nápadnosť praskliny: čaká na playtest.
- [x] **12. Dvaja ježkovia pred východom** — k poslednému ježkovi (stĺpce 175–181) druhý, aby ich bolo treba prekonať
  spolu. Test: `route.spec` prejde úsek. Obtiažnosť: overené playtestom.
  Stav: dve hliadky vedľa seba — stĺpce 174–177 a 179–183. Jedno mňauknutie zvyčajne vystraší len prvého, takže treba
  mňauknúť, prvého odohnať pazúrikmi a pri druhom počkať, kým sa mňaukanie dobije (alebo ho vystrašiť naraz, keď sú
  blízko seba). Robot v `route.spec` má na to „opatrný“ režim (`careful`): pazúrikmi odoženie vystrašeného, pred
  nevystrašeným ustúpi, kým nie je mňaukanie pripravené. Obtiažnosť: čaká na playtest.
- [x] **13. Víťazná melódia ako mňaukanie** — tie isté tóny ako znelka po dokončení levelu, ale znejú ako mňaukanie
  (každý tón s „mňau“ ohybom). Kvalita: overené playtestom.
  Stav: `goal.wav` (`tools/sfx.mjs`, funkcia `meowNote`): tie isté tóny C–E–G a držané vysoké C nad akordom, každý
  tón zaspievaný ako mňaukanie — výška sa zospodu vyšvihne nad tón („mňň-“), potom si sadne na tón s vibratom („-au“),
  o oktávu nižšie zdvojené trojuholníkom; tri rýchle „mňau“ a dlhé „mňaaau“ (1,2 s). Kvalita: čaká na playtest.

### Predvolené rozhodnutia M4 (zmeníme, ak pri playteste nebudú sedieť)

- Životy aj body sa medzi levelmi prenášajú; život navyše dáva každých 50 bodov spolu za celú hru.
- Koniec hry vráti na začiatok aktuálneho levelu (nie na level 1); checkpointy sa zabudnú.
- Ukladá sa len najvyšší odomknutý level — nie životy, body ani checkpoint uprostred levelu.
- V jaskyni nie sú vrany. Lietajúci nepriateľ (napr. netopier) a ďalšie prvky (vietor, gejzír) sú v backlogu.
- Level 3 (výstup z jaskyne, les za súmraku) je až v ďalšom míľniku.

## Milestone 5 — „Les za súmraku“

> Stav: **HOTOVÉ** (2026-11-24), schválené 2026-11-20. Rozsah: [ADR 0011](decisions/0011-rozsah-m5.md).

Mačka vyjde z jaskyne do lesa za súmraku. Hra dostane tretí level s prefarbeným lesom, vlastnou oblohou s mesiacom
a hviezdami, tmavším terénom a večernou hudbou. Novým prvkom je netopier, ktorý strmhlav zlietava z konárov. V leveli
je tajná miestnosť so zlatou rybičkou. Level 3 je zatiaľ posledný. Postup ako doteraz: po každom kroku testy,
screenshot a tvoj playtest; každá novinka prináša vlastnú grafiku, zvuky a efekty.

### Fáza A — vzhľad súmraku

- [x] **1. Pozadie za súmraku** — lesné vrstvy pozadia prefarbené do fialovomodrých tónov (`tint` v definícii levelu)
  a nová vlastná vrstva oblohy úplne vzadu (`tools/parallax.mjs`): prechod z tmavomodrej do fialovej a ružovej pri
  obzore, mesiac, hviezdy — v štýle výhľadu z jaskyne. Level 3 dostane zatiaľ zástupnú mapu, aby sa dal spustiť.
  Test: level 3 má svoje vrstvy, posúvajú sa rôznou rýchlosťou, obloha je tmavá. Vzhľad: overené playtestom.
  Stav: `DUSK_PARALLAX`: limetková zadná vrstva lesa nahradená vlastnou oblohou `dusk-sky` (`tools/parallax.mjs`,
  0,05): pásy od tmavomodrej cez fialovú po ružovú žiaru pri obzore, hviezdy, kosáčik mesiaca nízko medzi korunami,
  vzdialené vrcholky stromov; vrstvy `far`/`middle`/`near` lesa tónované do fialovomodrej, bližšie tmavšie. Obloha
  `#141433`. Level 3 je zatiaľ greybox (60 stĺpcov, jama 52–55, checkpoint, prepadávacia plošina, cieľ) s trávou
  z levelu 1 (vlastný terén v kroku 2). Jaskyňa už nie je posledný level. Vzhľad: čaká na playtest.
- [x] **2. Terén a plošiny za súmraku** — nový štýl v `tools/tiles.mjs`: tmavší trávnik a hlina v chladných tónoch
  (ladí so súmrakom, stále čitateľný proti pozadiu), varianty ako pri tráve; vlastný vzhľad prepadávacích plošín.
  Test: varianty sedia s konštantami. Vzhľad: overené playtestom.
  Stav: štýl `dusk` v `tools/tiles.mjs` = tráva z levelu 1 prefarbená: mesačne mätový trávnik nad fialovosivou hlinou,
  bledomodré a ružové kvietky; prepadávacie plošiny `crumble-dusk` = tie isté dosky v chladnom sivofialovom dreve
  (paleta dosiek sa teraz dá meniť jedným riadkom). Vzhľad: čaká na playtest.
- [x] **3. Večerná hudba** — tretia slučka v `tools/music.mjs`: pokojná, večerná (napr. cvrčky a jemná melódia),
  prelínanie pri zmene levelu ako doteraz.
  Test: v leveli 3 hrá večerná slučka, vždy len jedna inštancia. Kvalita: overené playtestom.
  Stav: `dusk.wav` — 8 taktov, 72 BPM (~27 s), F dur (F–Dm–B–C): teplé držané akordy, pomalá melódia ako
  z hracej skrinky (s tichou ozvenou), trilky cvrčkov dvakrát za takt, v 3. a 7. takte sova („hú-hú“). Pri prechode
  z jaskyne sa prelne. Kvalita: čaká na playtest.

### Fáza B — netopier a level

- [x] **4. Netopier** — visí hore nohami na konári (Tiled bod `bat`). Keď sa mačka priblíži, strmhlav k nej zlietne
  oblúkom a vráti sa na konár; dotyk = zásah. Mňauknutie ho vyruší: odletí hore a chvíľu je neškodný. Pazúriky ho
  odoženú z levelu. Vlastný sprite (visí, mávanie krídlami), zvuky (pišťanie, šuchot krídel). Logika v `src/core/`
  (unit testy).
  Test: visí, kým mačka nie je blízko; zlietne a vráti sa; zásah; mňauknutie ho vyruší; pazúriky ho odoženú.
  Stav: Tiled bod `bat` = kde sa drží nohami (pod konárikom, ktorý kreslí sám). Keď je mačka pod ním (do 40 px do strany,
  do 130 px nižšie), prebudí sa (0,32 s, roztiahne krídla, zapiští — varovanie), strmhlav zlietne oblúkom na miesto, kde
  mačka bola (dosah 64 px do strany, 120 px dole), za 1,1 s sa vráti hore a 1,2 s odpočíva. Bežiaca mačka prebehne,
  stojaca dostane zásah. Mňauknutie ho pošle späť na konár, neškodného; pazúriky ho odoženú (aj vystrašeného). Vlastné
  sprity (visí, letí 2 snímky, vystrašený, konárik) so svetlým okrajom, zvuk pišťania a šuchotu. Netopiere sú v poli
  nepriateľov za hadíkmi. Logika v `src/core/bat.ts` (unit testy), scenáre v `tests/e2e/bat.spec.ts`. Pocit: čaká na playtest.
- [x] **5. Level 3 „Les za súmraku“** — ~200 stĺpcov, začína pri východe z jaskyne (vidno ho za mačkou), 4–5
  checkpointov, pierka (~80–90 bodov), klbká, ježkovia, hadíci, pohyblivé a prepadávacie plošiny, liany a kmene,
  netopiere (najprv predstavené bezpečne), tajná miestnosť so zlatou rybičkou. Cieľ na konci lesa.
  Test: `route.spec` prejde level 3 po úsekoch (aj s netopiermi a rybičkou). Férovosť a obtiažnosť: overené playtestom.
  Stav: 200 stĺpcov, 5 checkpointov (34, 68, 108, 144, 172), 34 pierok = 84 bodov, 5 netopierov, dve klbká (54 na rímse
  za kmeňom, 146).
  Úseky: A 0–33 výstup z jaskyne (skala s ústím jaskyne za mačkou, `exit-caveMouth.png`), prvý netopier pod rímsou
  bezpečne pri štarte (nízka rímsa v riadku 12 — strieborné pierko na nej je na plný skok); B 34–67 ježko, kmeň na
  vysokú rímsu s klbkom a netopierom pod ňou, jama 60–63; C 68–107 močiar: plošina do strany, dve prepadávacie dosky,
  rímsa, hadík;
  D 108–143 hlinený kopec (118–128) len po liane v stĺpci 116, v ňom tajná miestnosť (118–121, riadky 8–10) s
  prasklinou smerom k liane, navrchu pierka a zlaté, pod kopcom vrana; E 144–171 netopierí háj: tri rímsy s netopiermi
  nad jamami 154–156 a 163–165; F 172–199 ježko a breh, od stĺpca 190 jazero (`exit-lake.png`, ukotvené v pravom
  dolnom rohu mapy: `exit.at = 'mapEnd'`) s lodičkou a lampášom — mačka skočí z brehu do lodičky (cieľ 191–193),
  do vody = smrť. `LevelDef.entrance` kreslí obrázok na začiatku levelu. `route.spec` má „level 3“ (šesť testov, bot
  vie mňauknúť aj počas skoku: `jumpRight(x, ms, meow)`), `levels.spec` overuje ústie jaskyne, jazero a skok do
  lodičky. Unit testy (93) a všetky e2e testy (175) prechádzajú.
  Playtest (2026-11-24): pierko nad prvým netopierom bolo nedosiahnuteľné (rímsa 6 dlaždíc nad zemou) → rímsa znížená
  do riadku 12; netopier nad prepadávacími doskami bol pasca bez šance → odstránený aj s rímsou, na rímsu za kmeňom
  pribudlo klbko. `bat.spec` skúša netopiera v háji (visí vysoko nad rovnou zemou).
  Playtest 2: do tajnej miestnosti pri liane sa zmestí aj veľká mačka — obmedzenie „len malá mačka“ je teraz voliteľná
  vlastnosť miestnosti v Tiled (`tight`, bool); má ju len miestnosť v leveli 2. Na konci netopierieho hája pribudla
  liana (stĺpec 171): po nej sa vylezie nad rímsy a dá sa vrátiť po nich pre pierka (rímsy rozšírené, medzery 3 dlaždice
  nad jamami). `route.spec` to prejde, `secret.spec` overuje veľkú mačku v miestnosti levelu 3.

### Fáza C — záver

- [x] **6. Finálna kontrola M5** — všetky testy, FPS ~60 vo všetkých troch leveloch (so zapojenou nabíjačkou),
  reštart 10× v leveli 3, playtest celej hry od úvodnej obrazovky cez tri levely po záverečnú obrazovku, aktualizácia
  dokumentov.
  Stav (2026-11-24): unit testy (93) a všetky e2e testy (178) prechádzajú, build je v poriadku. `performance.spec`
  meria FPS aj v leveli 3 (> 55 vo všetkých troch, so zapojenou nabíjačkou). `levels.spec`: reštart levelu 3 z výsledkov
  10× (netopier, smrť v jame, klbko, pierko, lodička) dáva vždy rovnaký počiatočný stav vrátane nepriateľov, miestnosti
  a jazera. Level 3 otestovaný playtestom (2026-11-24) po dvoch kolách úprav. Playtest celej hry
  (úvod → tri levely → záverečná obrazovka) v poriadku; M5 uzavretý 2026-11-24. Testy bežia so stlmeným zvukom
  (`--mute-audio` v `playwright.config.ts`).

### Predvolené rozhodnutia M5 (zmeníme, ak pri playteste nebudú sedieť)

- **Cieľ levelu 3** (rozhodnuté 2026-11-23): les končí pri vode, kde čaká lodička — mačka do nej skočí a level sa
  skončí (nadväzuje na plánovaný level na lodičke, backlog). Hra tým nekončí natrvalo; kým level na lodičke nie je,
  po leveli 3 sa ukáže záverečná obrazovka. Chalúpka ako koniec hry je v backlogu.
- Netopiere sú len v leveli 3; lesu ani jaskyni sa nič nemení.
- Zlatá rybička je len v leveli 3 (skrytá inak ako v jaskyni, napr. vchodom hore cez lianu — z backlogu).
- Životy a body sa prenášajú ako doteraz; uložený postup odomkne level 3 po dokončení jaskyne.

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
| 9 | Asset pack | Tall Forest (parallax; tileset do 2026-11-20, potom vlastný — ADR 0009) + Sunny Land (bodáky; čerešne nahradili v M3 vlastné pierka), ansimuz, CC0 | [0004](decisions/0004-asset-pack.md) |
| 10 | Mačka, checkpoint, cieľ | Vlastná mačka a ohnisko (`tools/sprites.mjs`), cieľ = vchod do jaskyne | [0005](decisions/0005-macka-ohnisko-jaskyna.md) |
| 11 | Zvukové efekty | Vlastné 8-bit zvuky generované skriptom `tools/sfx.mjs` | [0006](decisions/0006-vlastne-zvuky.md) |
| 12 | Rozsah M2 | Úvodná obrazovka, pauza, hudba, ježko a vrána vystrašení mňauknutím (bez stompu), pohyblivé a prepadávacie plošiny; ďalšie levely v M3 | [0007](decisions/0007-rozsah-m2.md) |
| 13 | Rozsah M3 | Animácia smrti, 3 životy + klbko vlny, pierka (1/5/10 bodov), útok pazúrikmi, hadík s jedom, šplhanie po lianach a kmeňoch; ďalšie levely v M4 | [0008](decisions/0008-rozsah-m3.md) |
| 14 | Terén | Vlastné dlaždice „tráva a tmavá hlina“ s variantmi (`tools/tiles.mjs`); murivo a skala pripravené pre ďalšie levely | [0009](decisions/0009-vlastne-dlazdice-terenu.md) |
| 15 | Rozsah M4 | Jeden nový level „Jaskyňa“ (vlastný terén, pozadie, hudba), padajúce stalaktity, levely ako dáta, lineárny postup s uloženým odomknutím; súmrak v lese neskôr | [0010](decisions/0010-rozsah-m4.md) |
| 16 | Rozsah M5 | Jeden nový level „Les za súmraku“ (prefarbený les + vlastná obloha s mesiacom, tmavší terén, večerná hudba), netopier, zlatá rybička len v leveli 3 | [0011](decisions/0011-rozsah-m5.md) |

## Mimo rozsahu M1

Viac levelov, menu s nastaveniami, ukladanie postupu, leaderboard, multiplayer.

## Mimo rozsahu M2

Ďalšie levely a palety (M3), stomp mechanika (zámerne nie), dvojskok a wall jump, mobil a gamepad,
menu s nastaveniami a ich ukladanie, verejné nasadenie.

## Mimo rozsahu M3

Ďalšie levely a palety (M4), stomp mechanika (zámerne nie), dvojskok a wall jump, mobil a gamepad,
menu s nastaveniami a ich ukladanie (aj ukladanie postupu), verejné nasadenie.

## Mimo rozsahu M4

Level 3 (výstup z jaskyne, les za súmraku) a ďalšie levely, lietajúci nepriateľ (netopier), vietor a gejzír,
stomp mechanika (zámerne nie), dvojskok a wall jump, mobil a gamepad, menu s nastaveniami a ich ukladanie,
ukladanie checkpointov a životov, verejné nasadenie.

## Mimo rozsahu M5

Ďalšie levely (napr. ruiny s murivom), obchodník a kozmetika za poklady, poklady v leveli 1 a 2, vietor, gejzír,
svetlušky a tma, stomp mechanika (zámerne nie), dvojskok a wall jump, mobil a gamepad, menu s nastaveniami a ich ukladanie,
verejné nasadenie.
