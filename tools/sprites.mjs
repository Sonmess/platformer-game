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
    t: '#ffb6c8'    //   highlight
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
