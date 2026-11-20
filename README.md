# platformer-game

2D plošinovka do webového prehliadača s parallax scrollovacím pozadím. Cieľom je hra, ktorá sa hrá plynulo a vyzerá profesionálne.

**Stav:** Milestone 3 je hotový — hra **Lost Cat**: úvodná obrazovka, pauza, hudba
a jeden dlhý lesný level (~8 obrazoviek, 6 checkpointov) s ježkami, vranami a hadíkmi, s pohyblivými a prepadávacími
plošinami, lianami a stromami na šplhanie. Mačka má 3 životy, mňaukanie, pazúriky a klbko vlny ako power-up.
Ďalšie levely sú plánované v M4. Postup a rozhodnutia: [`docs/gameplan.md`](docs/gameplan.md).

## Ovládanie

| Kláves | Akcia |
|---|---|
| ← → alebo A D | beh |
| Medzerník, ↑, W alebo Z | skok (dlhším podržaním vyššie) |
| ↑ / W a ↓ / S pri liane alebo kmeni | chytiť sa a šplhať hore / dole (pri liane a kmeni skáče len medzerník) |
| Medzerník pri šplhaní | so smerom = odraz do strany, bez smeru = pustiť sa |
| X | mňau (vystraší nepriateľov pred mačkou; potom ~2 s nabíjanie) |
| C | útok pazúrikmi (zasiahnutý nepriateľ utečie z levelu) |
| Esc alebo P | pauza (v pauze Q = úvodná obrazovka) |
| M | hudba zapnúť / vypnúť |
| Enter | hrať (na úvodnej obrazovke) |
| Enter alebo R / Esc | hrať znova / úvodná obrazovka (na obrazovke s výsledkami) |

Cieľom je dobehnúť do jaskyne na konci lesa. Cestou zbieraj pierka (modré 1 bod, strieborné 5, zlaté 10; každých 50 bodov vráti stratený život), ohniská sú checkpointy. Ježka a vranu
sa nedá zašliapnuť — mňauknutie ich na pár sekúnd vystraší a vtedy sa dá cez ne prejsť. Pazúrikmi (C) sa dá vrana hneď vyhnať z levelu; ježko
utečie, len keď je zvinutý od strachu — nevystrašený mačku popichá. Hadík mňaukania sa nebojí: v pravidelnom cykle
sa zastaví, nafúkne kapucňu a vystrekne okolo seba fialový oblak jedu — pazúrikmi ho treba vyhnať v chvíľke pokoja
medzi vlnami. Dosky s puklinami
sa pod mačkou po chvíli zrútia. Ružové klbko vlny mačku „nafúkne“ — zásah ju potom len zmenší. Po lianach a kmeňoch stromov sa dá šplhať
(na kmeň sa mačka chytí aj skokom proti nemu); na ich vrchoch bývajú vzácnejšie pierka. Mačka má 3 životy (hlávky vpravo hore); keď dôjdu, hra končí a level začína odznova.

## Technológie

- [Phaser 4](https://phaser.io/) (Arcade Physics)
- TypeScript + Vite
- Playwright (automatické testy a screenshoty)

## Spustenie

```bash
npm install
npm run dev        # vývojový server (http://localhost:8080)
npm run build      # typecheck + produkčný build
npx playwright install chromium   # raz, pred prvými testami
npm test                          # unit (Vitest) + e2e (Playwright)
npm run test:unit                 # len unit testy
npm run test:e2e                  # len Playwright scenáre
```

## Štruktúra repozitára

| Cesta | Obsah |
|---|---|
| `docs/gameplan.md` | Plán hry, aktuálny míľnik a otvorené otázky |
| `docs/backlog.md` | Nápady a úlohy na neskôr |
| `docs/decisions/` | Rozhodnutia (ADR) |
| `src/` | Hra: `config` (ladiace konštanty), `core` (eventy, stav), `scenes`, `entities`, `systems` (vstup, kamera, parallax, efekty, zvuk) |
| `src/levels/level1.json` | Level (Tiled JSON) |
| `public/assets/` | Grafika, písmo a zvuky; zdroje a licencie v `CREDITS.md` |
| `tools/` | Generátory vlastnej grafiky (`sprites.mjs`), dlaždíc terénu (`tiles.mjs`), zvukov (`sfx.mjs`) a hudby (`music.mjs`); spoločný syntetizátor `synth.mjs` |
| `tests/` | Unit (Vitest) a e2e (Playwright) testy |
| `CLAUDE.md` | Pravidlá projektu pre Claude |
| `.claude/skills/phaser-platformer/` | Claude skill: pocit zo skoku, parallax, efekty, architektúra, testovanie |

## Vývoj s Claude

Projekt je pripravený na prácu s Claude (Claude Code / Cowork). Skill `phaser-platformer` definuje postup: najprv hrateľnosť, potom pocit zo skoku, vizuál a efekty — a po každej zmene overenie v prehliadači.

## Licencie a autori

Skill vychádza z open-source projektov [awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills) (Apache-2.0) a [game-creator](https://github.com/PlayableIntelligence/game-creator) (MIT) — pozri `.claude/skills/phaser-platformer/CREDITS.md`. Zdroje a licencie herných assetov sa evidujú v `public/assets/CREDITS.md`.
