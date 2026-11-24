# Backlog

Nápady a úlohy mimo aktuálneho míľnika. Formát: `- [ ] názov — krátky popis (zdroj/dátum)`

## Hotové v M2 (pozri `docs/gameplan.md`)

- Titulná obrazovka, pauza, hudba (jednoduchá slučka)
- Nepriatelia — namiesto stompu ich mačka vystraší mňauknutím
- Pohyblivé a prepadávacie plošiny, predĺžený level

## Hotové v M3 (pozri `docs/gameplan.md`)

- Animácia smrti a férový respawn, 3 životy + klbko vlny, pierka (1/5/10 bodov), útok pazúrikmi, hadík s jedom,
  šplhanie po lianach a kmeňoch, úprava levelu
- Úvodná obrazovka: ovládanie doplnené o pazúry a šplhanie, „čerešne“ → „pierka“

## Hotové po M3

- Vlastné dlaždice terénu namiesto hnedej podlahy (ADR 0009, 2026-11-20)
- Prepadávacie plošiny s vlastným vzhľadom: staré drevené dosky s povrazmi (popraskaná tráva a červenkastá skala
  vygenerované pre ďalšie levely) (2026-11-20)
- S klbkom siahnu pazúriky ďalej (+10 px); checkpoint sa aktivuje aj pri preskočení (spúšťač 10 dlaždíc nad ohniskom);
  pierka pridávajú životy aj nad štartovné 3, najviac 9 (2026-11-20)

## Hotové v M4 (pozri `docs/gameplan.md`)

- Level 2 „Jaskyňa“ s vlastným terénom, pozadím a hudbou, padajúce stalaktity, levely ako dáta, lineárny postup
  s uloženým odomknutím a výberom levelu (ADR 0010, 2026-11-20)
- Doladenie jaskyne: východ s mesačným svetlom, tajná miestnosť so zlatou rybičkou, dvaja ježkovia pred východom,
  víťazná znelka ako mňaukanie; prvý checkpoint a prvé klbko odstránené (2026-11-20)
- [ ] Korene v jaskyni s vlastným vzhľadom (zatiaľ vyzerajú ako zelené liany) (2026-11-20)
- [ ] Úvodná obrazovka: riadok „cieľ“ spomína len jaskyňu na konci lesa (2026-11-20)

## Naplánované v M5 (pozri `docs/gameplan.md`)

- Level 3 „Les za súmraku“: prefarbený les s vlastnou oblohou (mesiac, hviezdy), tmavší terén, večerná hudba, netopier,
  zlatá rybička v tajnej miestnosti (ADR 0011, 2026-11-20)

## Ďalšie míľniky

- [ ] Ďalšie levely; terén môže použiť pripravené štýly „kamenné murivo“ a „vrstvená skala“ z `tools/tiles.mjs`
  a prepadávacie plošiny „popraskaná tráva“ / „červenkastá skala“ (2026-11-05, upravené 2026-11-20)
- [ ] Prvky „vietor“, „gejzír“ a „svetlušky a tma“ pre ďalšie levely (2026-11-20)
- [ ] Zlaté rybičky aj v leveli 1 a 2 (2026-11-20)
- [ ] **Level na lodičke** (nadväzuje na koniec levelu 3, kde mačka skočí do lodičky): iný typ hry — mačka sa plaví
  na lodičke a uhýba prekážkam doľava a doprava, kamera je za ňou (pohľad zozadu, akoby do hĺbky). Treba vlastný
  rámec scény (nie plošinovka), vlastnú grafiku vody a prekážok; vhodné ako samostatný míľnik (2026-11-23)
- [ ] **Koniec hry: chalúpka** — na konci poslednej úrovne chalúpka so svietiacim oknom (mačka je doma) a záverečná
  obrazovka „Mačka je doma!“ namiesto „Hra dokončená!“ (2026-11-23)

## Neskôr

- [ ] Obchodník (v niektorom leveli): mačka vymení nájdené poklady (zlaté rybičky) za kozmetiku (2026-11-20)
- [ ] Ďalšie spôsoby skrytia tajných miestností: vchod nad stropom cez koreň, stena rozbitá pazúrikmi (2026-11-20)

- [ ] Doladiť plynulosť vodorovnej pohyblivej plošiny — po oprave v kroku 7 M2 ostalo jemné chvenie
  (fyzika beží po 60 Hz krokoch bez interpolácie, kamera sa hýbe inak ako plošina) (2026-11-19)
- [ ] Dvojskok / wall jump — rozšírenie pohybu
- [ ] Dotykové ovládanie pre mobil + gamepad
- [ ] Adaptívna hudba
- [ ] Nastavenia: hlasitosť, reduce motion, ich ukladanie
- [ ] Verejné nasadenie (GitHub Pages / itch.io)
