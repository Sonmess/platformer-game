# platformer-game

2D plošinovka do webového prehliadača s parallax scrollovacím pozadím. Cieľom je hra, ktorá sa hrá plynulo a vyzerá profesionálne.

**Stav:** Milestone 1 je hotový — jeden hrateľný lesný level s mačkou, parallax pozadím, efektmi a zvukmi.
Postup a rozhodnutia: [`docs/gameplan.md`](docs/gameplan.md).

## Ovládanie

| Kláves | Akcia |
|---|---|
| ← → alebo A D | beh |
| Medzerník, ↑, W alebo Z | skok (dlhším podržaním vyššie) |
| Enter alebo R | hrať znova (na obrazovke s výsledkami) |

Cieľom je dobehnúť do jaskyne na konci lesa. Cestou zbieraj čerešne, ohniská sú checkpointy.

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
| `tools/` | Generátory vlastnej grafiky (`sprites.mjs`) a zvukov (`sfx.mjs`) |
| `tests/` | Unit (Vitest) a e2e (Playwright) testy |
| `CLAUDE.md` | Pravidlá projektu pre Claude |
| `.claude/skills/phaser-platformer/` | Claude skill: pocit zo skoku, parallax, efekty, architektúra, testovanie |

## Vývoj s Claude

Projekt je pripravený na prácu s Claude (Claude Code / Cowork). Skill `phaser-platformer` definuje postup: najprv hrateľnosť, potom pocit zo skoku, vizuál a efekty — a po každej zmene overenie v prehliadači.

## Licencie a autori

Skill vychádza z open-source projektov [awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills) (Apache-2.0) a [game-creator](https://github.com/PlayableIntelligence/game-creator) (MIT) — pozri `.claude/skills/phaser-platformer/CREDITS.md`. Zdroje a licencie herných assetov sa evidujú v `public/assets/CREDITS.md`.
