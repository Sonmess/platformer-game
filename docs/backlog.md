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

## M4

- [ ] Viac levelov s rôznymi paletami pozadia (2026-11-05, presunuté z M3 2026-11-19); terén môže použiť pripravené
  štýly „kamenné murivo“ a „vrstvená skala“ z `tools/tiles.mjs` (2026-11-20)

## Neskôr

- [ ] Doladiť plynulosť vodorovnej pohyblivej plošiny — po oprave v kroku 7 M2 ostalo jemné chvenie
  (fyzika beží po 60 Hz krokoch bez interpolácie, kamera sa hýbe inak ako plošina) (2026-11-19)
- [ ] Dvojskok / wall jump — rozšírenie pohybu
- [ ] Dotykové ovládanie pre mobil + gamepad
- [ ] Adaptívna hudba
- [ ] Nastavenia: hlasitosť, reduce motion, ich ukladanie
- [ ] Verejné nasadenie (GitHub Pages / itch.io)
