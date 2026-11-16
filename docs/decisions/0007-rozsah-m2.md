# ADR 0007: Rozsah Milestone 2

- Stav: prijaté (2026-11-05)

## Kontext
M1 je hotový a otestovaný: jeden hrateľný level s mačkou, parallax pozadím, efektmi a zvukmi. Hra je zatiaľ
veľmi jednoduchá: okrem hráča sa v nej nič nehýbe a začína rovno levelom.

## Rozhodnutie
- **Rámec hry:** úvodná obrazovka s názvom **„Lost Cat“**, pauza (Esc/P), pokojná 8-bit hudobná slučka
  generovaná skriptom (ako zvuky v ADR 0006), M = stlmiť hudbu.
- **Nepriatelia bez stomp mechaniky:** mačka ich **vystraší mňauknutím** (kláves X, dosah ~4 dlaždice pred
  mačkou, cooldown ~2 s). Vystrašený nepriateľ sa ~3 s nehýbe, trasie sa a je neškodný, potom pokračuje.
  - **Ježko** chodí po zemi tam a späť (vystrašený = zvinutý do gule).
  - **Vrána** lieta po zadanej dráhe (vystrašená zamrzne vo vzduchu).
- **Plošiny:** pohyblivé (vodorovné aj zvislé) a prepadávacie (trasú sa, padnú, vrátia sa).
- **Level:** stále jeden; nové prvky sa zakomponujú do `level1`. Ďalšie levely sú až v M3.
- Grafika nepriateľov, plošín a mňaukania je vlastná (`tools/sprites.mjs`), rovnako zvuky (`tools/sfx.mjs`).

## Dôsledky
- Mňaukanie je jediná nová akcia hráča; skok a pohyb sa nemenia, takže ladenie z M1 ostáva platné.
- Nepriatelia a plošiny reagujú na eventy a majú vlastný stav s resetom pri reštarte levelu (restart-safe).
- Traversal testy musia pokryť aj úseky s nepriateľmi (prechod s mňauknutím) a s plošinami.
