// Project-owned pixel art, drawn as text. Run: `node tools/sprites.mjs` → PNG spritesheets in public/assets/own/.
// Each frame is a list of rows; one character = one pixel (see PALETTE, '.' = transparent).
// Frames are drawn as fills only; a 1px dark outline is added automatically around every sprite
// marked `outline: true`. No dependencies: a tiny PNG encoder lives at the bottom.
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const PALETTE = {
    o: '#231a2b',   // outline (added automatically, but can be drawn by hand too)
    g: '#b9bcc6',   // cat fur
    d: '#7b7f8e',   // cat stripes / far legs
    w: '#f1eef2',   // cat chest, muzzle, paws
    p: '#e893a6',   // ears inside, nose
    e: '#5fcf6a',   // eye
    k: '#3a2c24',   // log bark (dark)
    l: '#7a5232',   // log
    s: '#6d6f78',   // stone
    S: '#9a9ca6',   // stone highlight
    r: '#d8452f',   // flame outer
    y: '#ffb53a',   // flame middle
    Y: '#fff1a8',   // flame core
    a: '#4a4e57',   // ash / cold embers
    K: '#1a1a22',   // pupil
    b: '#3b3734',   // hedgehog spines (dark); cool grey so it stands out from the orange-brown ground
    B: '#7a7068',   // hedgehog spines
    h: '#e6c9a0',   // hedgehog face and belly
    n: '#2a1a14',   // hedgehog nose and feet
    c: '#22222e',   // crow feathers
    C: '#4d4d6b',   // crow wing highlight
    L: '#b8bcd6',   // crow rim (light outline)
    F: '#3b86d6',   // feather vane: normal (blue)
    f: '#a6dcff',   //   its light edge
    I: '#9aa4b6',   // feather vane: silver
    i: '#eef2f8',
    J: '#d99a1e',   // feather vane: gold
    j: '#ffe58a',
    q: '#fff8e6',   // feather quill (all kinds)
    M: '#e8607f',   // yarn ball
    m: '#a8344f',   //   wound strands (dark)
    t: '#ffb6c8',   //   highlight
    G: '#7ccf3c',   // snake scales: bright lime, so it reads against the dark bushes and the brown ground
    H: '#3d7a26',   //   its dark pattern
    u: '#e8e27a',   //   belly
    P: '#a64fd1',   //   poison (hood spots, venom); the poison cloud uses the same purple
    A: '#33211a',   // tree bark: dark (cracks, shaded edge)
    D: '#553829',   //   bark
    E: '#7a5538',   //   lit edge, ridges
    N: '#1d4630',   // leaves: dark (also the vine stem)
    O: '#33703a',   //   leaves
    Q: '#5f9e3c',   //   light leaves
    R: '#b3aec8',   // stalactite: lit side
    T: '#7e7996',   //   stone
    U: '#57536b',   //   shade
    V: '#ffcf3a',   // golden fish: gold
    W: '#fff3a6',   //   shine
    X: '#c98a12',   //   shade, fins
    Z: '#120f18',   // crack in the rock (secret room hint)
    1: '#5a4673',   // bat: body and ears
    2: '#33273f',   //   wing membrane
    3: '#ffd85a',   //   eyes
    4: '#d18cab'    //   inside the ears, the mouth
};

// ── Cat: 32×22 frames, facing right, feet on the bottom row ────────────────────────────────
// Parts are composed per frame so the run cycle only changes legs, tail and a 1px body bob.
const W = 32, H = 22;

const HEAD = [          // 10×9, placed at the body's front
    'g.....g...',
    'gg...gg...',
    'gpg.gpg...',
    'ggggggggg.',
    'gggggeKggg',
    'gggggggggp',
    'gggggwwwww',
    '.ggwwwwww.',
    '..gwwww...'
];
const HEAD_HURT = [     // knocked out: "x" eye, mouth open
    'g.....g...',
    'gg...gg...',
    'gpg.gpg...',
    'ggggKgKgg.',
    'gggggKgggg',
    'ggggKgKggp',
    'gggggwwKKw',
    '.ggwwwwKK.',
    '..gwwww...'
];
const HEAD_CLAW = [     // narrowed eye, ears laid back a little
    '..........',
    'gg....g...',
    'gpg..gpg..',
    'ggggggggg.',
    'gggggKKggg',
    'gggggggggp',
    'gggggwwwww',
    '.ggwwwwww.',
    '..gwwww...'
];
const HEAD_MEOW = [     // same head, mouth open
    'g.....g...',
    'gg...gg...',
    'gpg.gpg...',
    'ggggggggg.',
    'gggggeKggg',
    'gggggggggp',
    'gggggwwKKK',
    '.ggwwwKKpK',
    '..gwwwwKK.'
];
const BODY = [          // 18×7
    '.ggdgggdggggdgggg.',
    'ggggggggggggggggg.',
    'gdggggdgggggdggggg',
    'gggggggggggggggggg',
    'ggdggggdggggggggg.',
    '.gwwwwwwwwwwwwwwg.',
    '..wwwwwwwwwwwwww..'
];
// Tails: [x, y] pixels relative to the body's back-top corner, drawn 2px thick (x, y) + (x, y + 1).
const TAIL_UP = [[-1, 1], [-2, 0], [-3, -1], [-3, -2], [-4, -3], [-4, -4], [-3, -5], [-2, -6]];
const TAIL_BACK = [[-1, 1], [-2, 1], [-3, 0], [-4, 0], [-5, -1], [-6, -1], [-7, -2], [-8, -3]];
const TAIL_LOW = [[-1, 2], [-2, 2], [-3, 3], [-4, 3], [-5, 3], [-6, 3], [-7, 2]];

// A leg is a column of pixels from the body's bottom down, each row with an x shift (positive =
// forward). Legs are 2px wide; near legs use fur, far legs the darker shade; the paw row is white
// and one pixel longer towards the front.
function leg (x, shifts, far)
{
    return { x, shifts, far };
}
const STAND = [0, 0, 0, 0, 0];
const FWD = [0, 0, 1, 1, 2];
const BACK = [0, 0, -1, -1, -2];
const TUCK = [1, 1, 2];           // short: tucked under the body (airborne / mid-stride)

/** `extra`: [x, y, colour] pixels drawn last, in frame coordinates (e.g. a raised paw). */
function catFrame ({ bob = 0, tail = TAIL_UP, legs, head = HEAD, extra = [] })
{
    const grid = Array.from({ length: H }, () => Array(W).fill('.'));
    const put = (x, y, c) => { if (x >= 0 && x < W && y >= 0 && y < H && c !== '.') grid[y][x] = c; };

    const bodyX = 5, bodyY = 10 - bob;                     // body rows 10..16, legs 17..21
    // Far legs first, so the near ones and the body overlap them.
    for (const l of [...legs].sort((a, b) => Number(b.far) - Number(a.far))) {
        l.shifts.forEach((dx, i) => {
            const y = bodyY + BODY.length + i;
            const paw = i === l.shifts.length - 1;
            const c = paw ? 'w' : l.far ? 'd' : 'g';
            put(bodyX + l.x + dx, y, c);
            put(bodyX + l.x + dx + 1, y, c);
            if (paw) put(bodyX + l.x + dx + 2, y, c);
        });
    }
    BODY.forEach((row, y) => [...row].forEach((c, x) => put(bodyX + x, bodyY + y, c)));
    head.forEach((row, y) => [...row].forEach((c, x) => put(bodyX + 13 + x, bodyY - 6 + y, c)));
    for (const [x, y] of tail) { put(bodyX + x, bodyY + y, 'g'); put(bodyX + x, bodyY + y + 1, 'g'); }
    for (const [x, y, c] of extra) put(x, y, c);
    return grid.map(r => r.join(''));
}

const legsStanding = [leg(2, STAND, true), leg(4, STAND, false), leg(12, STAND, true), leg(14, STAND, false)];

const CAT = {
    idle: [
        catFrame({ legs: legsStanding }),
        // Breathing: the body settles by a pixel and the tail tip flicks.
        catFrame({ legs: legsStanding, tail: TAIL_UP.map(([x, y], i) => i >= 6 ? [x - 1, y + 1] : [x, y]) })
    ],
    run: [
        catFrame({ legs: [leg(2, BACK, true), leg(4, BACK, false), leg(12, FWD, true), leg(14, FWD, false)], tail: TAIL_BACK }),
        catFrame({ bob: 1, legs: [leg(4, TUCK, true), leg(6, TUCK, false), leg(11, TUCK, true), leg(12, TUCK, false)], tail: TAIL_BACK }),
        catFrame({ legs: [leg(3, FWD, true), leg(5, FWD, false), leg(11, BACK, true), leg(13, BACK, false)], tail: TAIL_BACK }),
        catFrame({ bob: 1, legs: [leg(2, TUCK, true), leg(4, TUCK, false), leg(13, TUCK, true), leg(14, TUCK, false)], tail: TAIL_BACK })
    ],
    jump: [
        // Rising: stretched, front paws reaching up-forward, hind legs pushing back.
        catFrame({ bob: 2, legs: [leg(1, [-1, -2, -3], true), leg(3, [-1, -2, -3], false), leg(14, [1, 2, 3], true), leg(15, [1, 2, 3], false)], tail: TAIL_LOW }),
        // Falling: legs reaching down for the landing, tail up for balance.
        catFrame({ legs: [leg(2, FWD, true), leg(4, FWD, false), leg(12, FWD, true), leg(14, FWD, false)], tail: TAIL_UP })
    ],
    // Meow: head raised a pixel, mouth wide open (dark with a pink tongue), tail straight up.
    meow: [
        catFrame({ bob: 1, legs: legsStanding, head: HEAD_MEOW, tail: TAIL_UP })
    ],
    // Claw swipe: the near front paw shoots forward under the chin with its claws out, tail back.
    claw: [
        catFrame({
            legs: [leg(2, STAND, true), leg(4, STAND, false), leg(12, STAND, true)], head: HEAD_CLAW, tail: TAIL_BACK,
            extra: [
                // the arm, a row below the chin (the outline keeps the two apart), the white paw, three claws
                ...[20, 21, 22, 23, 24, 25].map(x => [x, 15, 'g']), ...[22, 23, 24, 25, 26].map(x => [x, 14, 'g']),
                [27, 13, 'w'], [28, 13, 'w'], [27, 14, 'w'], [28, 14, 'w'], [29, 14, 'w'],
                [29, 12, 'q'], [30, 13, 'q'], [30, 15, 'q']
            ]
        })
    ],
    // Hurt (the death animation spins and drops it): legs splayed out, tail limp, "x" eye.
    hurt: [
        catFrame({ legs: [leg(1, BACK, true), leg(3, BACK, false), leg(13, FWD, true), leg(15, FWD, false)], head: HEAD_HURT, tail: TAIL_LOW })
    ]
};

// ── Climbing cat: 32×22 frames, seen from behind, hugging a vine or trunk ─────────────────────────
// Back of the head with both ears, a striped back, the tail hanging down; the paws reach out to the sides. Frame 1
// has the left front and right hind paw up, frame 2 is its mirror image, so the two alternate like climbing steps.
function catClimbFrame ()
{
    const grid = Array.from({ length: H }, () => Array(W).fill('.'));
    const put = (x, y, c) => { if (x >= 0 && x < W && y >= 0 && y < H) grid[y][x] = c; };
    const rows = (x0, y0, lines) => lines.forEach((r, y) => [...r].forEach((c, x) => { if (c !== '.') put(x0 + x, y0 + y, c); }));
    rows(11, 1, [           // head, 10 wide
        '.g......g.',
        '.gg....gg.',
        '.gggggggg.',
        'gggdggdggg',
        'gggggggggg',
        'ggggddgggg',
        '.gggggggg.'
    ]);
    rows(11, 8, [           // back with stripes, 10 wide
        '..gggggg..',
        '.gggggggg.',
        'ggddggddgg',
        'gggggggggg',
        'gggggggggg',
        'ggddggddgg',
        'gggggggggg',
        '.gggggggg.',
        '..gggggg..'
    ]);
    // Tail: hangs from the rump and curls at the tip.
    for (const [x, y] of [[15, 17], [15, 18], [15, 19], [16, 20], [17, 21]]) { put(x, y, 'g'); put(x + 1, y, 'g'); }
    // Paws: [shoulder/hip x, y] → arm pixels out to the side, white paw at the end.
    const limb = (pts, paw) => { for (const [x, y] of pts) put(x, y, 'g'); for (const [x, y] of paw) put(x, y, 'w'); };
    limb([[11, 8], [10, 7], [9, 6]], [[8, 5], [7, 5], [8, 4]]);             // left front: reaching up
    limb([[21, 10], [22, 10]], [[23, 10], [24, 10], [23, 11]]);             // right front: holding at the shoulder
    limb([[11, 15], [10, 16]], [[9, 17], [8, 17], [9, 18]]);                // left hind: low
    limb([[21, 13], [22, 12]], [[23, 12], [24, 11], [23, 11]]);             // right hind: pulled up
    return grid.map(r => r.join(''));
}
const climbA = catClimbFrame();
const mirror = frame => frame.map(r => [...r].reverse().join(''));
CAT.climb = [climbA, mirror(climbA)];

// ── Tree trunk (climbable): a 16×16 bark tile repeated up the trunk, roots on the ground, a leafy crown on top ───
// Bark: lit left edge, shaded right edge, two wavy cracks (period 8, so the tile repeats seamlessly) and a knot.
const TRUNK_BARK = Array.from({ length: 16 }, (_, y) => {
    const crack1 = 4 + (y % 8 < 4 ? 0 : 1), crack2 = 10 + (y % 8 < 4 ? 1 : 0);
    return Array.from({ length: 16 }, (_, x) => {
        if (x === 0 || x === 15) return 'A';
        if (x === 1) return 'E';
        if (x === 14) return 'A';
        if (x === crack1 || x === crack2) return 'A';
        if (y >= 5 && y <= 7 && x >= 7 && x <= 8) return y === 6 ? 'A' : 'E';      // knot
        if (x === crack1 + 1 || x === crack2 + 1) return 'E';
        return 'D';
    }).join('');
});
const TRUNK_ROOTS = [          // 32×10: the trunk (cols 8..23) flaring into roots on the ground
    '........AEDDADDDDDADDDDA........',
    '........AEDDADDDDDADDDDA........',
    '.......AEDDDADDDDDDADDDDA.......',
    '.......AEDDDADDDDDDADDDDA.......',
    '......AEDDDDDADDDDDDADDDDA......',
    '.....AEDDDADDDADDDDDDADDDDA.....',
    '....AEDDDAA.DDADDDDDADDADDDA....',
    '...AEDDDA...ADDADDDDADA.ADDDA...',
    '.AEEDDDA....AEDDA..ADDA..ADDDA..',
    'AEDDDAA.....AEDA....ADA...ADDDA.'
];
// Crown: 56×40, a lumpy cluster of leaves built from overlapping circles, lit from the upper left.
const TRUNK_CROWN = (() => {
    const CW = 56, CH = 40;
    const blobs = [[28, 22, 15], [15, 24, 11], [41, 24, 11], [21, 13, 10], [35, 12, 10], [28, 8, 8], [9, 30, 7], [47, 30, 7], [28, 31, 9]];
    const inside = (x, y) => blobs.find(([bx, by, r]) => (x - bx) ** 2 + (y - by) ** 2 <= r * r);
    return Array.from({ length: CH }, (_, y) => Array.from({ length: CW }, (_, x) => {
        const b = inside(x, y);
        if (!b) return '.';
        const [bx, by, r] = b;
        const d = Math.hypot(x - bx + r * 0.35, y - by + r * 0.35) / r;      // distance from the lit spot
        const speckle = (x * 7 + y * 13) % 11 === 0;
        if (d < 0.55) return speckle ? 'O' : 'Q';
        if (d < 1.05) return speckle ? 'N' : 'O';
        return speckle ? 'O' : 'N';
    }).join(''));
})();

// ── Vine (climbable): a 14×16 stem tile repeated down, a knot of leaves where it hangs from, a curled tip ───
const VINE_STEM = [
    '......N.......',
    '......N.......',
    '.....NN.......',
    '..QO.N........',
    '.QOONN........',
    '..OON.........',
    '.....N........',
    '.....NN.......',
    '......N.......',
    '.......N......',
    '.......NOOQ...',
    '.......NNOOQ..',
    '.......N.OO...',
    '......NN......',
    '......N.......',
    '......N.......'
];
const VINE_TIP = [
    '......N.......',
    '......N.......',
    '.....NN.......',
    '....OQN.......',
    '...OQQON......',
    '...OQOON......',
    '....OON.......',
    '.....N........',
    '......N.......',
    '..............'
];
const VINE_KNOT = [
    '.....OQQO.........',
    '..OQQOQOOON.OQ....',
    '.OQOONOOQOOOQQO...',
    'NOOONNOOOONNOOON..',
    '.NNOO.NNNOO.NNN...',
    '......ONN.........',
    '.......NN.........',
    '.......N..........'
].map(r => r.padEnd(18, '.'));

// ── Stalactite (cave hazard): 12×26, hanging from its top row, the tip at the bottom; lit from the left ─────────
const STALACTITE = [Array.from({ length: 26 }, (_, y) => {
    const half = Math.max(0, Math.round(5 * Math.pow(1 - y / 25, 0.9)));
    return Array.from({ length: 12 }, (_, x) => {
        const d = x - 5.5;
        if (Math.abs(d) > half + 0.5 || (y > 22 && Math.abs(d) > 0.5)) return '.';
        if (d < -half + 1.5) return 'R';                          // lit edge
        if (d > half - 1.5) return 'U';                           // shaded edge
        return (x + y) % 7 === 0 ? 'U' : 'T';                      // a few streaks of shade
    }).join('');
})];

// ── Golden fish (treasure): 16×12, facing left, a fanned tail on the right; frame 2 = a glint along its back ──────
const FISH = [
    '................',
    '.....XXXX.......',
    '...XVVVVVX....XX',
    '..XVWWVVVVX..XVX',
    '.XVWKVVVVVVXXVVX',
    'XVVVVVVXVVVVVVX.',
    'XVVVVVVVXVVVVVX.',
    '.XVVVVVXVVVVXXVX',
    '..XVVVVVVVVX..XVX',
    '...XXVVVVXX....XX',
    '.....XXXX.......',
    '................'
].map(r => r.padEnd(16, '.').slice(0, 16));
const FISH_GLINT = FISH.map((r, y) => y === 2 ? r.slice(0, 5) + 'WW' + r.slice(7) : y === 3 ? r.slice(0, 7) + 'W' + r.slice(8) : r);

// ── A crack in the cave rock (16×40, two and a half tiles tall), the only hint of a secret room behind a wall that is not really
// there: a dark zigzag split that widens towards the floor, lit along its left lip, branching, with rubble at its foot. ──
const CRACK = [(() => {
    const g = Array.from({ length: 40 }, () => Array(16).fill('.'));
    const put = (x, y, c) => { if (x >= 0 && x < 16 && y >= 0 && y < 40) g[y][x] = c; };
    for (let y = 1; y < 37; y++) {
        const main = 7 + Math.round(Math.sin(y / 3.4) * 2.2);
        const width = y < 6 ? 1 : y < 16 ? 2 : y < 27 ? 3 : 4;               // wider towards the floor
        for (let k = 0; k < width; k++) put(main + k, y, 'Z');
        put(main - 1, y, 'R');                                              // the lit lip on the left
        if (width > 1) put(main + width, y, 'U');                           // the shaded lip on the right
    }
    for (const [x0, y0, dir, len] of [[7, 5, -1, 4], [9, 12, 1, 5], [6, 19, -1, 5], [10, 25, 1, 4], [6, 30, -1, 4]]) {
        for (let i = 1; i <= len; i++) put(x0 + dir * (i + 1), y0 + i, 'Z');  // branches
    }
    for (const [x, y, c] of [[2, 38, 'T'], [3, 38, 'U'], [3, 37, 'T'], [12, 38, 'T'], [13, 38, 'U'], [13, 37, 'R'], [7, 39, 'U'], [8, 39, 'T'], [10, 39, 'U']]) put(x, y, c);
    return g.map(r => r.join(''));
})()];

// ── Bat (enemy, level 3): 18×14 frames. Hanging upside down from its feet (top row) with its wings wrapped round it;
// flying with the wings up, then down; scared with the wings flung wide and the mouth open. Light rim like the crow's.
const BW = 18, BH = 14;
function batGrid () { return Array.from({ length: BH }, () => Array(BW).fill('.')); }
const bput = (g, x, y, c) => { if (x >= 0 && x < BW && y >= 0 && y < BH) g[y][x] = c; };
function batHang ()
{
    const g = batGrid(), cx = 8.5;
    for (let y = 1; y < 10; y++) for (let x = 0; x < BW; x++) {
        if (((x - cx) / 4.6) ** 2 + ((y - 5.5) / 4.6) ** 2 <= 1) bput(g, x, y, Math.abs(x - cx) < 1.6 ? '1' : '2');
    }
    bput(g, 8, 0, '1'); bput(g, 9, 0, '1');                                    // the feet gripping the branch
    for (let y = 9; y < 13; y++) for (let x = 0; x < BW; x++) if (Math.hypot(x - cx, y - 10.5) <= 2.3) bput(g, x, y, '1');   // head, upside down
    bput(g, 7, 11, '3'); bput(g, 10, 11, '3');
    bput(g, 6, 13, '1'); bput(g, 11, 13, '1');                                 // ears pointing down
    return g.map(r => r.join(''));
}
function batFly (wingsUp, scared = false)
{
    const g = batGrid(), cx = 8.5;
    for (const side of [-1, 1]) {
        for (let k = 0; k <= 7; k++) {
            const x = Math.round(cx + side * (2 + k));
            const top = scared ? 4 : wingsUp ? Math.round(5 - k * 0.6) : Math.round(5 + k * 0.4);
            const bottom = (scared ? 7 : wingsUp ? Math.round(8 - k * 0.5) : Math.round(8 + k * 0.5)) - (k % 3 === 2 ? 1 : 0);   // scalloped edge
            for (let y = top; y <= bottom; y++) bput(g, x, y, '2');
        }
    }
    for (let y = 4; y < 11; y++) for (let x = 0; x < BW; x++) if (((x - cx) / 2.4) ** 2 + ((y - 7) / 3.4) ** 2 <= 1) bput(g, x, y, '1');
    for (let y = 1; y < 5; y++) for (let x = 0; x < BW; x++) if (Math.hypot(x - cx, y - 3) <= 2.1) bput(g, x, y, '1');       // head
    bput(g, 7, 0, '1'); bput(g, 10, 0, '1'); bput(g, 7, 1, '4'); bput(g, 10, 1, '4');                                         // ears
    if (scared) { bput(g, 7, 3, 'w'); bput(g, 10, 3, 'w'); bput(g, 8, 4, '4'); bput(g, 9, 4, '4'); }
    else { bput(g, 7, 3, '3'); bput(g, 10, 3, '3'); }
    return g.map(r => r.join(''));
}
const BAT = { hang: [batHang()], fly: [batFly(true), batFly(false)], scared: [batFly(true, true)] };
// The branch stub a bat hangs from: 28×6, bark.
const BAT_BRANCH = [[
    '..........kk................',
    '.kkllllllkklllllllllllkk....',
    'kllllkllllllllkllllllllllkk.',
    'klllllllllkllllllllklllllllk',
    '.kkllllkllllllllllllllkkkk..',
    '...kkkk..kkkkkkkkkkkk.......'
]];

// ── Campfire (checkpoint): 24×24, unlit = 1 frame, lit = 4 flame frames ──────────────────────
// ── Hedgehog (enemy): 20×14 frames, facing right, feet on the bottom row ───────────────────────
// Walking: spiny back, pointed face with a black nose; two leg poses. Scared: a spiky ball.
const HEDGEHOG_BODY = [
    '......b.b.b.........',
    '....b.BbBbBb.b......',
    '...bBBBBBBBBBb......',
    '..bBBBbBBBBbBBb.....',
    '.bBBBBBBBBBBBBBh....',
    '.bBBbBBBBbBBBBhhh...',
    'bBBBBBBBBBBBBhhKhh..',
    'bBBBBbBBBBBBBhhhhhhn',
    '.bBBBBBBBBBBhhhhhh..',
    '..hhhhhhhhhhhhhh....',
    '...hhhhhhhhhhhh.....'
];
// One empty row on top (room for the outline), the body, then two rows of legs.
const hedgehogWalk = legs => ['.'.repeat(20), ...HEDGEHOG_BODY, legs, legs];
const HEDGEHOG = {
    walk: [
        hedgehogWalk('...nn...nn..nn..nn..'),
        hedgehogWalk('....nn..nn...nn..nn.')
    ],
    scared: [[
        '....................',
        '.......b.b.b........',
        '.....bBbBbBbBb......',
        '....bBBBBBBBBBb.....',
        '...bBBbBBBbBBBBb....',
        '..bBBBBBBBBBBBBBb...',
        '..bBBbBBBbBBBbBBb...',
        '..bBBBBBBBBBBBBBb...',
        '..bBBBbBBBbBBBBBb...',
        '..bBBBBBBBBBBBBBb...',
        '...bBBBBBBBBBBBb....',
        '....bBBBhhhBBBb.....',
        '.....bbhhhhhbb......',
        '.......nnnnn........'
    ]]
};

// ── Crow (enemy): 20×16 frames, facing right, feet on row 14 ─────────────────────────────────
// A body shared by the flap frames, plus a wing drawn up or down over it. Scared: feathers puffed
// up, wings flung out, beak open, eye wide.
const CROW_BODY = [
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
    '.............ccc....',
    '............cccwc...',
    'cc.........ccccKcyy.',
    '.ccc...cccccccccyyy.',
    '..cccccccccccccc....',
    '...cccccccccccc.....',
    '.....cccccccc.......',
    '.......c..c.........',
    '.......y..y.........',
    '......yy.yy.........',
    '....................'
];
function crowFrame (wing)
{
    const grid = CROW_BODY.map(r => [...r]);
    for (const [x, y, ch] of wing) grid[y][x] = ch;
    return grid.map(r => r.join(''));
}
// [x, y, char] points of a wing.
const WING_UP = [
    [3, 1, 'c'], [3, 2, 'c'], [4, 2, 'c'], [4, 3, 'c'], [5, 3, 'c'], [4, 4, 'c'], [5, 4, 'C'], [6, 4, 'c'],
    [5, 5, 'c'], [6, 5, 'C'], [7, 5, 'c'], [5, 6, 'c'], [6, 6, 'C'], [7, 6, 'C'], [8, 6, 'c'],
    [6, 7, 'c'], [7, 7, 'C'], [8, 7, 'C'], [9, 7, 'c'], [8, 8, 'C'], [9, 8, 'C']
];
const WING_DOWN = [
    [6, 9, 'C'], [7, 9, 'C'], [8, 9, 'C'], [5, 10, 'C'], [6, 10, 'C'], [7, 10, 'C'],
    [3, 11, 'c'], [4, 11, 'C'], [5, 11, 'C'], [6, 11, 'c'], [2, 12, 'c'], [3, 12, 'C'], [4, 12, 'c'], [2, 13, 'c'], [3, 13, 'c']
];
const fit = r => r.padEnd(20, '.').slice(0, 20);
const CROW = {
    fly: [crowFrame(WING_UP), crowFrame(WING_DOWN)],
    scared: [[
        '....................',
        '....................',
        '............c.c.....',
        '...........ccccc....',
        '..........cccwwc....',
        'c.........cccwKcyy..',
        'cc.......ccccccc.yy.',
        '.cc....ccccccccc....',
        '..ccccccccccccccc...',
        '.cCCccccccccccccc...',
        'cCCCcccccccccccc....',
        '.cc..cccccccccc.....',
        '.......c..c.........',
        '.......y..y.........',
        '......yy.yy.........',
        '....................'
    ].map(fit)]
};

// ── Snake (enemy): 24×12 frames, facing right, lying on the bottom row ───────────────────────────
// The body is a wave along the ground (tail on the left), drawn from a sine so the two slither frames only shift
// its phase; the neck rises at the right into a head. Warning: a cobra hood with purple spots flares out and the
// body swells; spraying: the hood stays up and the mouth gapes, dripping poison.
const SW = 24, SH = 12;
const SNAKE_HEAD = [            // 7 wide, rows 3..11: head, then the neck down to the body
    '.GGGG..',
    'GGGKGG.',
    'GGGGGG.',
    'GGu....',
    'GGu....',
    'GGu....',
    'GGu....',
    'GGu....',
    'GGu....'
];
const SNAKE_HEAD_TONGUE = SNAKE_HEAD.map((r, y) => y === 2 ? 'GGGGGGr' : y === 3 ? 'GGu...r' : r);
const SNAKE_HOOD = [            // 9 wide, rows 1..11: head over a flared hood
    '...GGGG..',
    '..GGGKGG.',
    '..GGGGGG.',
    '.GGGuGGG.',
    'GPGGuGGPG',
    'GPGGuGGPG',
    'GGHGuGHGG',
    '.GGGuGGG.',
    '..GGu....',
    '..GGu....',
    '..GGu....'
];
const SNAKE_HOOD_SPRAY = SNAKE_HOOD.map((r, y) => y === 1 ? '..GGGKGGP' : y === 2 ? '..GGGnnnP' : y === 3 ? '.GGGuGGP.' : r);
function snakeFrame ({ phase, swell = 0, head, headX, headY })
{
    const g = Array.from({ length: SH }, () => Array(SW).fill('.'));
    for (let x = 0; x < 18; x++) {
        const lift = Math.round((1 - Math.cos(x * Math.PI / 4 + phase)) / 2 * 2);     // 0..2 px: humps
        const thick = x < 2 ? 1 : x < 4 ? 2 : 2 + swell;
        const bottom = SH - 1 - lift;
        for (let t = 0; t < thick; t++) {
            const y = bottom - t;
            g[y][x] = t === 0 && thick > 1 ? 'u' : t === thick - 1 && x % 3 === 0 ? 'H' : 'G';
        }
    }
    head.forEach((row, dy) => [...row].forEach((c, dx) => { if (c !== '.') g[headY + dy][headX + dx] = c; }));
    return g.map(r => r.join(''));
}
const SNAKE = {
    slither: [
        snakeFrame({ phase: 0, head: SNAKE_HEAD, headX: 16, headY: 3 }),
        snakeFrame({ phase: Math.PI, head: SNAKE_HEAD_TONGUE, headX: 16, headY: 3 })
    ],
    // Hood up and trembling: the two frames swell the body by turns.
    warn: [
        snakeFrame({ phase: 0, swell: 1, head: SNAKE_HOOD, headX: 14, headY: 1 }),
        snakeFrame({ phase: 0, swell: 0, head: SNAKE_HOOD, headX: 14, headY: 1 })
    ],
    spray: [snakeFrame({ phase: 0, swell: 1, head: SNAKE_HOOD_SPRAY, headX: 14, headY: 1 })]
};

// ── Feather (collectible): 14×16 frames, leaning right, quill at the bottom left ───────────────
// One template, recoloured per kind (normal = blue, silver, gold): V = vane, v = its light edge, q = quill.
// Four frames: plain, then a white glint sliding down the vane.
const FEATHER_TEMPLATE = [
    '..............',
    '..........VV..',
    '.........vVVV.',
    '........vVqVV.',
    '.......vVqVV..',
    '......vVqVVV..',
    '.....vVqVVV...',
    '....vVqVVV....',
    '...vVqVVV.....',
    '...VqVVV......',
    '...qVVV.......',
    '..qVV.........',
    '..q...........',
    '.q............',
    '..............',
    '..............'
];
const GLINTS = [null, [11, 2], [9, 5], [7, 8]];
function featherFrames (vane, light)
{
    return GLINTS.map(glint => FEATHER_TEMPLATE.map((row, y) => [...row].map((c, x) =>
        glint && glint[0] === x && glint[1] === y ? 'w' : c === 'V' ? vane : c === 'v' ? light : c).join('')));
}
const FEATHER = {
    normal: featherFrames('F', 'f'),
    silver: featherFrames('I', 'i'),
    gold: featherFrames('J', 'j')
};

// ── Yarn ball (power-up): 16×16, a pink ball of wound strands with a loose end ─────────────────
const YARN = [[
    '................',
    '......MMMM......',
    '....MMtMMmMM....',
    '...MtMMmMMMmM...',
    '..MtMMmMMMmMMM..',
    '..MMMmMMMmMMMM..',
    '.MMMmMMMmMMMmMM.',
    '.MmMMMmMMMmMMMM.',
    '.MMMmMMMmMMMmMM.',
    '.MMmMMMmMMMmMMM.',
    '..MMMmMMMmMMMM..',
    '..MmMMMmMMMmMM..',
    '...MMmMMMmMMM...',
    '....MMMMMMMm....',
    '......MMMM..m...',
    '.............mm.'
]];

const FW = 24;
const FIRE_BASE = [            // rows 18..23
    '....kllk........kllk....',
    '.....kllllk..kllllk.....',
    '......kllllllllllk......',
    '..SsS...kllllllk...SsS..',
    '.SsssS.kllllllllk.SsssS.',
    'sSsssSsSsSsSsSsSsSsssSss'
];
// Flame shape: full width per row from the tip (row 4) down to the logs (row 17); each frame
// sways the rows sideways (more at the tip) so the 4 frames flicker.
const FLAME_WIDTHS = [1, 2, 3, 3, 4, 5, 6, 7, 8, 9, 10, 10, 8, 6];
function flameFrame (f)
{
    const rows = [];
    FLAME_WIDTHS.forEach((w, r) => {
        const sway = Math.round(Math.sin(r * 0.7 + f * Math.PI / 2) * (1 - r / FLAME_WIDTHS.length) * 2);
        const left = Math.round(FW / 2 - w / 2) + sway;
        const row = Array(FW).fill('.');
        for (let x = 0; x < w; x++) {
            const edge = x === 0 || x === w - 1;
            const core = r > 4 && x >= 2 && x < w - 2;
            row[left + x] = edge || r < 2 ? 'r' : core ? 'Y' : 'y';
        }
        rows.push(row.join(''));
    });
    return rows;
}
const blank = '.'.repeat(FW);
const FIRE = {
    // Cold: the same logs and stones, a wisp of ash instead of flames.
    unlit: [[...Array(14).fill(blank), '...........a............', '..........a.a...........', '.........aa.aa..........', '..........aaa...........', ...FIRE_BASE]],
    lit: [0, 1, 2, 3].map(f => [...Array(4).fill(blank), ...flameFrame(f), ...FIRE_BASE])
};

// ── Rendering ─────────────────────────────────────────────────────────────────────────────
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];

function withOutline (frame, skip = '', edge = 'o')
{
    const h = frame.length, w = frame[0].length;
    const filled = (x, y) => x >= 0 && y >= 0 && x < w && y < h && frame[y][x] !== '.' && !skip.includes(frame[y][x]);
    return frame.map((row, y) => [...row].map((c, x) => {
        if (c !== '.') return c;
        return filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1) ? edge : '.';
    }).join(''));
}

function sheet (frames, outline, skip, edge)
{
    const fw = frames[0][0].length, fh = frames[0].length;
    for (const f of frames) {
        if (f.length !== fh || f.some(r => r.length !== fw)) throw new Error(`frame size mismatch (want ${fw}×${fh})`);
    }
    const out = frames.map(f => outline ? withOutline(f, skip, edge) : f);
    const w = fw * out.length, h = fh;
    const rgba = Buffer.alloc(w * h * 4);
    out.forEach((f, i) => f.forEach((row, y) => [...row].forEach((c, x) => {
        if (c === '.') return;
        if (!PALETTE[c]) throw new Error(`unknown palette char '${c}'`);
        rgba.set(hex(PALETTE[c]), ((y * w) + i * fw + x) * 4);
    })));
    return { w, h, rgba };
}

function png ({ w, h, rgba })
{
    const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
    const crc = buf => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
    const chunk = (type, data) => {
        const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
        const td = Buffer.concat([Buffer.from(type), data]);
        const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
        return Buffer.concat([len, td, c]);
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;   // 8-bit RGBA
    const raw = Buffer.alloc((w * 4 + 1) * h);
    for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const OUT = 'public/assets/own';
mkdirSync(OUT, { recursive: true });
const write = (name, frames, outline, skip, edge) => {
    writeFileSync(`${OUT}/${name}.png`, png(sheet(frames, outline, skip, edge)));
    console.log(`${OUT}/${name}.png  ${frames.length} frame(s) ${frames[0][0].length}×${frames[0].length}`);
};
write('cat-idle', CAT.idle, true);
write('cat-run', CAT.run, true);
write('cat-jump', CAT.jump, true);
write('cat-meow', CAT.meow, true);
write('cat-hurt', CAT.hurt, true);
write('cat-claw', CAT.claw, true);
write('cat-climb', CAT.climb, true);
write('trunk-bark', [TRUNK_BARK], false);
write('trunk-roots', [TRUNK_ROOTS], false);
write('trunk-crown', [TRUNK_CROWN], true);
write('vine-stem', [VINE_STEM], true);
write('vine-tip', [VINE_TIP], true);
write('vine-knot', [VINE_KNOT], true);
write('stalactite', STALACTITE, true);
write('golden-fish', [FISH, FISH_GLINT], true);
write('bat-hang', BAT.hang, true, '', 'L');
write('bat-fly', BAT.fly, true, '', 'L');
write('bat-scared', BAT.scared, true, '', 'L');
write('bat-branch', BAT_BRANCH, true);
write('secret-crack', CRACK, false);
write('feather-normal', FEATHER.normal, true);
write('feather-silver', FEATHER.silver, true);
write('feather-gold', FEATHER.gold, true);
write('yarn', YARN, true);
// HUD lives icon: the cat's head on its own, with a pixel of room on every side for the outline.
write('cat-head', [['.'.repeat(12), ...HEAD.map(r => '.' + r + '.'), '.'.repeat(12)]], true);
write('campfire-unlit', FIRE.unlit, true);
write('campfire-lit', FIRE.lit, true, 'rYy');      // no outline around the flames
write('hedgehog-walk', HEDGEHOG.walk, true);
write('hedgehog-scared', HEDGEHOG.scared, true);
// A black bird vanishes against the dark bushes: a light rim keeps it readable as a hazard.
write('crow-fly', CROW.fly, true, '', 'L');
write('crow-scared', CROW.scared, true, '', 'L');
write('snake-slither', SNAKE.slither, true);
write('snake-warn', SNAKE.warn, true);
write('snake-spray', SNAKE.spray, true);
