const c = document.getElementById("typing"), text = c.textContent;
c.textContent = "";
[...text].forEach((ch, i) => {
  const s = document.createElement("span");
  s.textContent = ch;
  s.style.animationDelay = `${i * 0.02}s`;
  c.appendChild(s);
});

const canvas = document.getElementById('foroforest');
const ctx = canvas.getContext('2d');
const tileSize = 32;
const spriteSize = 16;
const topPadding = 22;
const treeGap = 1;
const treePitch = spriteSize + treeGap;
const treeTileAt = (col, row) => ({ x: (col - 1) * treePitch, y: (row - 1) * treePitch });
const sprites = new Image();
const treeSprites = new Image();
ctx.imageSmoothingEnabled = false;

const tiles = {
  visitor: treeTileAt(28, 9),
  tree: treeTileAt(4, 3),
  path1: { x: 16, y: 0 },
  path2: { x: 32, y: 0 },
  home: { x: 16, y: 32 },
  marker: { x: 0, y: 16 },
  hey: { x: 16, y: 16 },
  wtf: { x: 32, y: 16 }
};
const treeVariants = [
  treeTileAt(4, 3),
  treeTileAt(1, 2),
  treeTileAt(3, 2),
  treeTileAt(4, 2),
  treeTileAt(5, 2)
];
const pathTiles = {
  base: treeTileAt(1, 1),
  alt1: treeTileAt(6, 1),
  alt2: treeTileAt(8, 1),
  alt3: treeTileAt(7, 1)
};

const maze = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [1, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0],
  [1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0],
  [0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 1],
  [1, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 1],
  [1, 1, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1, 1],
  [1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 1, 0, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

let facingright = true, showyap = null;
let visitor = { x: 0, y: 4 };
const isDarkTheme = () => document.documentElement.dataset.theme === 'dark';
const pathDecorations = new Map();
const worldTiles = new Map();
const edgeTreeRows = new Map();

const homeTiles = {
  "14,1": {
    tile: treeTileAt(2, 20),
    heightOffset: 0,
    srcHeight: spriteSize,
    destHeight: tileSize,
    image: treeSprites,
    themeFilter: true
  }
};

worldTiles.set('4,2', {
  tile: treeTileAt(1, 16),
  srcHeight: spriteSize,
  destHeight: tileSize,
  heightOffset: 0,
  image: treeSprites,
  themeFilter: true
});
worldTiles.set('14,2', {
  tile: pathTiles.base,
  srcHeight: spriteSize,
  destHeight: tileSize,
  heightOffset: 0,
  image: treeSprites,
  themeFilter: true
});
worldTiles.set('14,3', {
  tile: treeTileAt(31, 5),
  srcHeight: spriteSize,
  destHeight: tileSize,
  heightOffset: 0,
  image: treeSprites,
  themeFilter: true
});
worldTiles.set('14,4', {
  tile: treeTileAt(4, 3),
  srcHeight: spriteSize,
  destHeight: tileSize,
  heightOffset: 0,
  image: treeSprites,
  themeFilter: true
});

const buildEdgeTrees = () => {
  const maxX = maze[0].length;
  const topRow = 0;
  const bottomRow = maze.length - 1;
  for (let x = 0; x < maxX; x++) {
    edgeTreeRows.set(`${x},${topRow}`, treeVariants[(x + topRow) % treeVariants.length]);
    edgeTreeRows.set(`${x},${bottomRow}`, treeVariants[(x + bottomRow) % treeVariants.length]);
  }
};
buildEdgeTrees();

sprites.src = 'data:image/webp;base64,UklGRjACAABXRUJQVlA4TCMCAAAvL8APEMfAOJKtRLjeIAA7UuQfk0MAspsG20iSGi1a6wwwSYGQCQ+Ll2wCAEwy9w2/aMBLL5pSxN3NTNs2/kutcEtt9wIA+P//D25tV8pz2OhtDHbp3QUQBDRWOHCYJ1yTjusJnom9ZEbRJM0YuWGGo1t6eeZsCajzMsiybbttG8CFhrqIRITmP1UUQUrP1zkR/Z+A8GPGKr5Q/CIQpXPSJ8UvBZXGyT335zVbe+7hyQNSPfNkFb9eZ899iG/Pa1d8e9ZpP0OfsL8zQrRLeNVIg1Dv772T01hjHR496f4+ae0+cHJ/J8xu8eAdwvTv4Qe8vdjlqPJCRm9HL77Mzni5wUAebeTRjvFCtJOvowTIjlKxOzZp5Os4ITtOdb7tjkIPERVpIAICrfdb3DU7ICh0QFGwxfmtOoaOFYqP2OPM7kjojFfjrRzfzKGbhwiQhwgt3s8D5PoqQKhzrQChuZpBe3W+EsazhMFVIw8RHiEMW/NrLTwn1WWkcBA+bkwqqQ2twiEdTIcPJqXBQoDCIbUWZUpp0SqHNHRgQkldBIIjafGQZqCiymOHNAlUBNleYiPRHyjM2wqQWhutQqYwzdIWtSpkFqEwzQY2CpmlCYUZbFoEFQMls2xa+GQxUyYNQl783JKWj7K5mGcwArB8fpRWLJ9LmLlq3hRWDVjlBnwu6wR1Mwu4aitVwDTTpjmtL4Lqtm6uKujiWi/1OgXsUvsg/58CAA==';
treeSprites.src = 'assets/images/404/monochrome-transparent.png';
let assetsReady = 0;
const onAssetLoad = () => {
  assetsReady += 1;
  if (assetsReady === 2) {
    drawgame();
  }
};
sprites.onload = onAssetLoad;
treeSprites.onload = onAssetLoad;
const themeObserver = new MutationObserver(() => drawgame());
themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

const buildPathDecorations = () => {
  const coords = [];
  for (let y = 0; y < maze.length; y++) {
    for (let x = 0; x < maze[y].length; x++) {
      if (maze[y][x] === 0) coords.push([x, y]);
    }
  }
  const specials = [
    pathTiles.alt1, pathTiles.alt1, pathTiles.alt1,
    pathTiles.alt2, pathTiles.alt2,
    pathTiles.alt3, pathTiles.alt3
  ];
  const used = new Set();
  specials.forEach((tile, i) => {
    const rawIndex = Math.round(((i + 1) * coords.length) / (specials.length + 1)) - 1;
    let index = Math.max(0, Math.min(coords.length - 1, rawIndex));
    while (used.has(index)) {
      index = (index + 1) % coords.length;
    }
    used.add(index);
    const [x, y] = coords[index];
    pathDecorations.set(`${x},${y}`, tile);
  });
};
buildPathDecorations();

function drawtile(tile, x, y, srcH = spriteSize, destH = tileSize, offsetY = 0, image = sprites) {
  ctx.drawImage(image, tile.x, tile.y, spriteSize, srcH, x, y + offsetY, tileSize, destH);
}

const getBubbleTheme = () => {
  const styles = getComputedStyle(document.documentElement);
  return {
    fill: styles.getPropertyValue('--tc-text').trim() || '#111111',
    ink: styles.getPropertyValue('--tc-background').trim() || '#ffffff',
    border: styles.getPropertyValue('--tc-border').trim() || '#111111',
    font: styles.getPropertyValue('--tc-font-mono').trim() || 'monospace'
  };
};

const drawSpeechBubble = (x, y, label) => {
  const { fill, ink, border, font } = getBubbleTheme();
  const paddingX = 6;
  const paddingY = 4;
  const fontSize = 10;
  ctx.save();
  ctx.font = `${fontSize}px ${font}`;
  ctx.textBaseline = 'top';
  const textWidth = Math.ceil(ctx.measureText(label).width);
  const bubbleWidth = Math.max(24, textWidth + paddingX * 2);
  const bubbleHeight = fontSize + paddingY * 2;
  const bubbleX = Math.round(x);
  const bubbleY = Math.round(y);
  const radius = 3;

  ctx.fillStyle = fill;
  ctx.strokeStyle = border;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bubbleX + radius, bubbleY);
  ctx.lineTo(bubbleX + bubbleWidth - radius, bubbleY);
  ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY, bubbleX + bubbleWidth, bubbleY + radius);
  ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight - radius);
  ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight, bubbleX + bubbleWidth - radius, bubbleY + bubbleHeight);
  ctx.lineTo(bubbleX + radius, bubbleY + bubbleHeight);
  ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleHeight, bubbleX, bubbleY + bubbleHeight - radius);
  ctx.lineTo(bubbleX, bubbleY + radius);
  ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + radius, bubbleY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(bubbleX + 8, bubbleY + bubbleHeight);
  ctx.lineTo(bubbleX + 12, bubbleY + bubbleHeight + 6);
  ctx.lineTo(bubbleX + 16, bubbleY + bubbleHeight);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = ink;
  ctx.fillText(label, bubbleX + paddingX, bubbleY + paddingY);
  ctx.restore();
};

function drawmaze() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < maze.length; y++) {
    for (let x = 0; x < maze[y].length; x++) {
      const posX = x * tileSize, posY = y * tileSize + topPadding;
      const key = `${x},${y}`, special = homeTiles[key];
      const override = worldTiles.get(key);

      if (override) {
        const prevFilter = ctx.filter;
        if (override.themeFilter) {
          ctx.filter = isDarkTheme() ? 'none' : 'invert(1)';
        }
        drawtile(
          override.tile,
          posX,
          posY,
          override.srcHeight,
          override.destHeight,
          override.heightOffset,
          override.image || sprites
        );
        ctx.filter = prevFilter;
      } else if (maze[y][x] === 0) {
        const prevFilter = ctx.filter;
        ctx.filter = isDarkTheme() ? 'none' : 'invert(1)';
        const pathTile = pathDecorations.get(key) || pathTiles.base;
        drawtile(pathTile, posX, posY, spriteSize, tileSize, 0, treeSprites);
        ctx.filter = prevFilter;
      } else if (!(x === 14 && y === 1)) {
        const prevFilter = ctx.filter;
        ctx.filter = isDarkTheme() ? 'none' : 'invert(1)';
        const variantSeedY = y > 0 && y < maze.length - 1 ? y - 1 : y;
        let treeTile = edgeTreeRows.get(key) || treeVariants[(x + variantSeedY) % treeVariants.length];
        if (x === 0 && y === 3) {
          treeTile = treeTileAt(4, 3);
        }
        drawtile(treeTile, posX, posY, spriteSize, tileSize, 0, treeSprites);
        ctx.filter = prevFilter;
      }

      if (special) {
        const prevFilter = ctx.filter;
        if (special.themeFilter) {
          ctx.filter = isDarkTheme() ? 'none' : 'invert(1)';
        }
        drawtile(
          special.tile,
          posX,
          posY,
          special.srcHeight,
          special.destHeight,
          special.heightOffset,
          special.image || sprites
        );
        ctx.filter = prevFilter;
      }
    }
  }
}

function drawvisitor() {
  const baseX = visitor.x * tileSize;
  const baseY = visitor.y * tileSize + topPadding - 8;

  ctx.save();
  ctx.filter = isDarkTheme() ? 'none' : 'invert(1)';
  if (!facingright) {
    ctx.scale(-1, 1);
    drawtile(tiles.visitor, -baseX - tileSize, baseY, spriteSize, tileSize, 0, treeSprites);
  } else {
    drawtile(tiles.visitor, baseX, baseY, spriteSize, tileSize, 0, treeSprites);
  }
  ctx.restore();

  if (showyap) {
    drawSpeechBubble(baseX, baseY - tileSize + 6, showyap === 'A' ? 'HEY' : 'WTF');
  }
}

function drawgame() {
  drawmaze(); drawvisitor();
}

function movevisitor(dx, dy) {
  let newX = visitor.x + dx, newY = visitor.y + dy;
  if (maze[newY]?.[newX] === 0) {
    visitor = { x: newX, y: newY };
    if (dx !== 0) facingright = dx > 0;
  }

  if (visitor.x === 13 && visitor.y === 3) setTimeout(() => window.location.href = 'index.html', 100);

  drawgame();
}

function triggerYap(yap) {
  showyap = yap;
  drawgame();
  setTimeout(() => { showyap = null; drawgame(); }, 3000);
}


document.getElementById('ctrl').addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const targetId = button.id;
  const moveMap = { upBtn: [0, -1], downBtn: [0, 1], leftBtn: [-1, 0], rightBtn: [1, 0] };
  const actionMap = { aBtn: 'A', bBtn: 'B' };

  if (moveMap[targetId]) {
    movevisitor(...moveMap[targetId]);
  }
  if (actionMap[targetId]) {
    triggerYap(actionMap[targetId]);
  }
});

const keyMap = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], a: 'A', b: 'B' };
const keyButtons = {
  ArrowUp: document.getElementById('upBtn'),
  ArrowDown: document.getElementById('downBtn'),
  ArrowLeft: document.getElementById('leftBtn'),
  ArrowRight: document.getElementById('rightBtn'),
  a: document.getElementById('aBtn'),
  b: document.getElementById('bBtn')
};

const setPressed = (button, pressed) => {
  if (!button) {
    return;
  }
  button.classList.toggle('pressed', pressed);
  button.classList.toggle('is-pressed', pressed);
};

document.addEventListener('keydown', (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  setPressed(keyButtons[key], true);

  const val = keyMap[key];
  if (val) {
    event.preventDefault();
    if (typeof val === 'string') {
      triggerYap(val);
    } else {
      movevisitor(...val);
    }
  }
});

document.addEventListener('keyup', (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  setPressed(keyButtons[key], false);
});

document.querySelectorAll('.dir, .act, .start-key').forEach(button => {
  ['touchstart', 'touchend'].forEach(event =>
    button.addEventListener(event, () => button.classList.toggle('pressed', event === 'touchstart'), { passive: true })
  );
});
