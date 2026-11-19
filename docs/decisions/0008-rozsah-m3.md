# ADR 0008: Rozsah Milestone 3

- Stav: navrhnuté (2026-11-19), čaká na schválenie plánu v `docs/gameplan.md`

## Kontext
M2 je hotový: hra „Lost Cat“ má úvodnú obrazovku, pauzu, hudbu a dlhý level s ježkami, vranami a plošinami.
Pri playteste vyšli najavo slabé miesta samotnej hry: smrť je okamžitá a po respawne mačku držaná šípka hneď
pošle späť do jamy; chýba motivácia neumierať; čerešne sa k mačke tematicky nehodia; mňaukanie je jediná
interakcia s nepriateľmi. Pred ďalšími levelmi chceme vylepšiť jadro hry.

## Rozhodnutie
- **Smrť:** krátka animácia, vypnuté ovládanie, respawn až po pustení smeru, krátka nezraniteľnosť.
- **Životy:** 9 životov („mačka má 9 životov“), koniec hry pri 0. **Klbko vlny** je power-up: veľká mačka
  vydrží jeden zásah navyše (ako Mario s hubou).
- **Zberateľné:** **pierka** namiesto čerešní — bežné (1 bod), strieborné (5), zlaté (10); 100 bodov = život.
- **Útok pazúrikmi** (kláves C): vranu hneď, ježka len vystrašeného (inak sa mačka popichá). Zasiahnutý
  nepriateľ komicky uteká / odletí z levelu (bez násilia, vhodné pre deti).
- **Hadík:** nový nepriateľ, ktorý v cykle strieka jed okolo seba; mňauknutie naňho nepôsobí, treba počkať
  na pauzu a zaútočiť.
- **Šplhanie** po visiacich lianach a kmeňoch stromov (jedna mechanika, dva vzhľady).
- Všetka nová grafika a zvuky sú vlastné (`tools/sprites.mjs`, `tools/sfx.mjs`).

## Dôsledky
- Pribúda pojem **zásah** (rozdiel medzi zranením a smrťou), na ktorý sa napoja bodáky, nepriatelia aj jed.
- Pribúdajú klávesy C (útok) a šípka hore/dole pri šplhaní; šípka hore ostáva skokom mimo lián a kmeňov.
- Ďalšie levely sa posúvajú do M4; level sa v M3 len upraví pre nové prvky.
