(() => {
	const canvas = document.getElementById('game');
	if (!canvas) {
		return;
	}

	const ctx = canvas.getContext('2d');
	const root = document.documentElement;
	const breakoutRoot = document.querySelector('[data-breakout]');
	const breakoutScript = document.querySelector('script[src$="assets/scripts/breakout.js"]');

	const W = canvas.width;
	const H = canvas.height;
	const rows = 6;
	const cols = 8;
	const brickGap = 3;
	const brickW = (W - (cols + 1) * brickGap) / cols;
	const brickH = 18;
	const maxLives = 3;

	const paddle = { w: 80, h: 12, x: W / 2 - 40, y: H - 36, speed: 6 };
	const ball = { x: W / 2, y: H / 2 + 60, r: 6, vx: 3, vy: -3, speedInc: 0.05 };

	let bricks;
	let score;
	let lives;
	let running = false;
	let paused = false;
	let awaitingServe = false;
	let loopId;
	let leftPressed = false;
	let rightPressed = false;
	const pressedControls = new Set();
	const controlOrder = [];
	let hudHeight = 0;
	let colors = null;
	let themeToken = '';
	let brickStyleEnabled = false;
	let faSolidFontTemplate = '900 1em "Font Awesome 6 Sharp", "Font Awesome 6 Free"';
	const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
	const smallQuery = window.matchMedia('(max-width: 480px)');
	let isSmall = smallQuery.matches;
	const rowHalftoneLevel = [900, 700, 500, 900, 700, 500];
	const halftonePatternScale = 1;
	const halftonePatternDefs = {
		500: { size: 2, base: 'paper', dots: [[0, 0], [1, 1]], dot: 'ink' },
		700: { size: 4, base: 'ink', dots: [[0, 0], [2, 2]], dot: 'paper' },
	};
	const halftonePatternCache = new Map();
	const breakoutSounds = new Map();

	const getBreakoutSoundUrl = (filename) => (breakoutScript && breakoutScript.src
		? new URL(`../media/interface/${filename}`, breakoutScript.src).toString()
		: `/assets/media/interface/${filename}`);

	const getBreakoutSound = (filename) => {
		if (typeof Audio !== 'function') {
			return null;
		}
		if (!breakoutSounds.has(filename)) {
			const audio = new Audio(getBreakoutSoundUrl(filename));
			audio.preload = 'auto';
			breakoutSounds.set(filename, audio);
		}
		return breakoutSounds.get(filename);
	};

	const playBreakoutSound = (filename) => {
		if (root.getAttribute('data-sound') === 'off') {
			return;
		}
		const audio = getBreakoutSound(filename);
		if (!audio) {
			return;
		}
		try {
			audio.currentTime = 0;
			const playPromise = audio.play();
			if (playPromise && typeof playPromise.catch === 'function') {
				playPromise.catch(() => {
					// Ignore sound playback failures.
				});
			}
		} catch (error) {
			// Ignore sound playback failures.
		}
	};

	const fmt = (n) => n.toString().padStart(6, '0');

	const readCssVar = (styles, name, fallback) => {
		const value = styles.getPropertyValue(name).trim();
		return value || fallback;
	};

	const updateThemeColors = () => {
		const styles = getComputedStyle(breakoutRoot || root);
		colors = {
			text: readCssVar(styles, '--tc-text', '#111111'),
			canvas: readCssVar(styles, '--breakout-canvas-bg', readCssVar(styles, '--tc-background', '#ffffff')),
			grid: readCssVar(styles, '--breakout-grid', readCssVar(styles, '--tc-border', '#cccccc')),
			paddle: readCssVar(styles, '--breakout-paddle', readCssVar(styles, '--tc-text', '#111111')),
			ball: readCssVar(styles, '--breakout-ball', readCssVar(styles, '--tc-text', '#111111')),
			brick: readCssVar(styles, '--breakout-brick', readCssVar(styles, '--tc-text', '#111111')),
		};
		faSolidFontTemplate = readCssVar(styles, '--fa-font-sharp-solid', '900 1em "Font Awesome 6 Sharp", "Font Awesome 6 Free"');
	};

	const getThemeToken = () => {
		const explicitTheme = root.getAttribute('data-theme');
		if (explicitTheme) {
			return explicitTheme;
		}
		return mediaQuery.matches ? 'system-dark' : 'system-light';
	};

	const syncThemeColors = (force = false) => {
		const token = getThemeToken();
		if (force || token !== themeToken || !colors) {
			themeToken = token;
			updateThemeColors();
		}
	};

	const resetLevel = () => {
		bricks = [];
		const topOffset = hudHeight + (smallQuery.matches ? 96 : 48);
		for (let r = 0; r < rows; r += 1) {
			for (let c = 0; c < cols; c += 1) {
				bricks.push({
					x: brickGap + c * (brickW + brickGap),
					y: topOffset + r * (brickH + brickGap),
					w: brickW,
					h: brickH,
					row: r,
					isLifeBrick: false,
					alive: true,
				});
			}
		}
		if (bricks.length) {
			const lifeBrickIndex = Math.floor(Math.random() * bricks.length);
			bricks[lifeBrickIndex].isLifeBrick = true;
		}
	};

	const getFaFont = (size) => {
		const normalized = faSolidFontTemplate || '900 1em "Font Awesome 6 Sharp", "Font Awesome 6 Free"';
		const withLineHeight = normalized.replace(/1em\/1/g, `${size}px/${size}px`);
		const withSize = withLineHeight.replace(/1em/g, `${size}px`);
		if (withSize.includes('px')) {
			return withSize;
		}
		return `900 ${size}px "Font Awesome 6 Sharp", "Font Awesome 6 Free"`;
	};

	const getHalftoneFill = (level) => {
		if (level === 900) {
			return colors.brick;
		}

		const def = halftonePatternDefs[level];
		if (!def) {
			return colors.brick;
		}

		const paletteKey = `${colors.brick}|${colors.canvas}|${level}`;
		if (halftonePatternCache.has(paletteKey)) {
			return halftonePatternCache.get(paletteKey);
		}

		const tile = document.createElement('canvas');
		const tileSize = def.size * halftonePatternScale;
		tile.width = tileSize;
		tile.height = tileSize;
		const tileCtx = tile.getContext('2d');
		if (!tileCtx) {
			return colors.brick;
		}

		const ink = colors.brick;
		const paper = colors.canvas;
		const baseColor = def.base === 'ink' ? ink : paper;
		const dotColor = def.dot === 'ink' ? ink : paper;

		tileCtx.fillStyle = baseColor;
		tileCtx.fillRect(0, 0, tileSize, tileSize);
		tileCtx.fillStyle = dotColor;
		def.dots.forEach(([x, y]) => {
			tileCtx.beginPath();
			tileCtx.arc(x * halftonePatternScale, y * halftonePatternScale, halftonePatternScale, 0, Math.PI * 2);
			tileCtx.fill();
		});

		const pattern = ctx.createPattern(tile, 'repeat');
		const fill = pattern || colors.brick;
		halftonePatternCache.set(paletteKey, fill);
		return fill;
	};

	const getBrickFill = (brick) => {
		if (!brickStyleEnabled) {
			return colors.brick;
		}
		const level = rowHalftoneLevel[brick.row] || 900;
		return getHalftoneFill(level);
	};

	const renderLives = () => {
		const livesEl = document.getElementById('lives');
		if (!livesEl) {
			return;
		}
		const livesCount = Math.max(0, lives);
		const lost = Math.max(0, maxLives - livesCount);
		livesEl.setAttribute(
			'aria-label',
			`${livesCount} ${livesCount === 1 ? 'life' : 'lives'} remaining`
		);
		livesEl.textContent = '';
		for (let i = 0; i < maxLives; i += 1) {
			const heart = document.createElement('span');
			heart.className = 'life-heart';
			if (i < lost) {
				heart.classList.add('is-empty');
			}
			heart.setAttribute('aria-hidden', 'true');
			livesEl.appendChild(heart);
		}
	};

	const updateHUD = () => {
		const scoreEl = document.getElementById('score');
		if (scoreEl) {
			scoreEl.textContent = fmt(score);
		}
		renderLives();
	};

	const updateHudState = () => {
		const panel = document.querySelector('.breakout .panel');
		if (!panel) {
			return;
		}
		if (!running) {
			panel.removeAttribute('data-state');
			return;
		}
		panel.dataset.state = paused ? 'paused' : 'running';
	};

	const setStatus = (msg) => {
		const statusEl = document.getElementById('status');
		if (statusEl) {
			statusEl.textContent = msg || 'PRESS SPACE TO START';
		}
	};

	const updateStatus = () => {
		if (!running) {
			setStatus('PRESS SPACE TO START');
			return;
		}
		if (awaitingServe) {
			setStatus('PRESS SPACE TO SERVE');
			return;
		}
		if (paused) {
			setStatus('PAUSED — PRESS SPACE TO RESUME');
			return;
		}
		setStatus('PRESS SPACE TO PAUSE');
	};

	const centerBallOnPaddle = (randomDir = false) => {
		ball.x = paddle.x + paddle.w / 2;
		ball.y = paddle.y - ball.r - 1;
		const dir = randomDir ? (Math.random() < 0.5 ? -1 : 1) : 1;
		ball.vx = 3 * dir;
		ball.vy = -3;
	};

	const attachBallToPaddle = () => {
		ball.x = paddle.x + paddle.w / 2;
		ball.y = paddle.y - ball.r - 1;
	};

	const resetGame = () => {
		score = 0;
		lives = maxLives;
		updateHUD();
		resetLevel();
		centerBallOnPaddle(true);
		running = false;
		paused = false;
		awaitingServe = true;
		updateHudState();
		updateStatus();
		render();
		clearInterval(loopId);
	};

	const start = () => {
		if (!running) {
			running = true;
			paused = false;
			awaitingServe = false;
			updateHudState();
			loop();
			updateStatus();
		}
	};

	const pause = () => {
		paused = !paused;
		if (!paused && awaitingServe) {
			awaitingServe = false;
		}
		updateHudState();
		updateStatus();
	};

	const loop = () => {
		clearInterval(loopId);
		loopId = setInterval(() => {
			if (!running) {
				return;
			}
			updatePaddle();
			if (paused) {
				if (awaitingServe) {
					attachBallToPaddle();
				}
			} else {
				updateBall();
			}
			render();
		}, 1000 / 60);
	};

	const updatePaddle = () => {
		if (leftPressed) {
			paddle.x -= paddle.speed;
		}
		if (rightPressed) {
			paddle.x += paddle.speed;
		}
		paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));
	};

	const updateBall = () => {
		ball.x += ball.vx;
		ball.y += ball.vy;
		let hitWall = false;

		if (ball.x < ball.r) {
			ball.x = ball.r;
			ball.vx *= -1;
			hitWall = true;
		}
		if (ball.x > W - ball.r) {
			ball.x = W - ball.r;
			ball.vx *= -1;
			hitWall = true;
		}
		if (ball.y - ball.r <= hudHeight) {
			ball.y = hudHeight + ball.r;
			ball.vy *= -1;
			hitWall = true;
		}
		if (hitWall) {
			playBreakoutSound('type_05.wav');
		}

		if (ball.y > H + ball.r) {
			lives -= 1;
			playBreakoutSound('caution.wav');
			updateHUD();
			if (lives <= 0) {
				gameOver();
				return;
			}
			centerBallOnPaddle(true);
			paused = true;
			awaitingServe = true;
			updateHudState();
			updateStatus();
		}

		if (
			ball.y + ball.r >= paddle.y &&
			ball.y - ball.r <= paddle.y + paddle.h &&
			ball.x >= paddle.x &&
			ball.x <= paddle.x + paddle.w
		) {
			ball.y = paddle.y - ball.r - 1;
			const hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
			const speed = Math.hypot(ball.vx, ball.vy) * (1 + ball.speedInc);
			const angle = hit * (Math.PI / 3);
			ball.vx = speed * Math.sin(angle);
			ball.vy = -Math.abs(speed * Math.cos(angle));
			playBreakoutSound('type_03.wav');
		}

		for (const brick of bricks) {
			if (!brick.alive) {
				continue;
			}
			if (
				ball.x + ball.r > brick.x &&
				ball.x - ball.r < brick.x + brick.w &&
				ball.y + ball.r > brick.y &&
				ball.y - ball.r < brick.y + brick.h
				) {
					brick.alive = false;
					score += 10;
					if (brick.isLifeBrick) {
						if (lives < maxLives) {
							lives += 1;
							playBreakoutSound('notification.wav');
						} else {
							playBreakoutSound('button.wav');
						}
					} else {
						playBreakoutSound('type_01.wav');
					}
					updateHUD();
				const prevX = ball.x - ball.vx;
				const prevY = ball.y - ball.vy;
				const hitLeft = prevX <= brick.x;
				const hitRight = prevX >= brick.x + brick.w;
				const hitTop = prevY <= brick.y;
				const hitBottom = prevY >= brick.y + brick.h;
				if ((hitLeft && !hitTop && !hitBottom) || (hitRight && !hitTop && !hitBottom)) {
					ball.vx *= -1;
				} else {
					ball.vy *= -1;
				}
				break;
			}
		}

		if (bricks.every((brick) => !brick.alive)) {
			score += 100;
			playBreakoutSound('celebration.wav');
			updateHUD();
			resetLevel();
			centerBallOnPaddle(true);
			paused = true;
			awaitingServe = true;
			updateHudState();
			updateStatus();
		}
	};

	const render = () => {
		syncThemeColors();

		ctx.fillStyle = colors.canvas;
		ctx.fillRect(0, 0, W, H);

		for (const brick of bricks) {
			if (!brick.alive) {
				continue;
			}
			drawRect(brick.x, brick.y, brick.w, brick.h, getBrickFill(brick));
			if (brick.isLifeBrick) {
				drawLifeBrickIcon(brick);
			}
		}

		drawRect(paddle.x, paddle.y, paddle.w, paddle.h, colors.paddle);
		drawBall(ball.x, ball.y, ball.r, colors.ball);
	};

	const drawRect = (x, y, w, h, color) => {
		ctx.fillStyle = color;
		ctx.fillRect(x, y, w, h);
	};

	const drawLifeBrickIcon = (brick) => {
		const iconSize = Math.max(10, Math.min(brick.h - 4, brick.w - 8));
		const x = Math.round(brick.x);
		const y = Math.round(brick.y);
		const w = Math.round(brick.w);
		const h = Math.round(brick.h);
		ctx.save();

		// 1px outset border in background color.
		ctx.fillStyle = colors.canvas;
		ctx.fillRect(x - 1, y - 1, w + 2, 1);
		ctx.fillRect(x - 1, y + h, w + 2, 1);
		ctx.fillRect(x - 1, y, 1, h);
		ctx.fillRect(x + w, y, 1, h);

		// 1px inset border in text color.
		ctx.fillStyle = colors.text;
		ctx.fillRect(x + 1, y + 1, w - 2, 1);
		ctx.fillRect(x + 1, y + h - 2, w - 2, 1);
		ctx.fillRect(x + 1, y + 1, 1, h - 2);
		ctx.fillRect(x + w - 2, y + 1, 1, h - 2);

		// Heart icon always uses the background color for contrast.
		ctx.fillStyle = colors.canvas;
		ctx.font = getFaFont(iconSize);
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText('\uf004', x + w / 2, y + h / 2 + 0.5);
		ctx.restore();
	};

	const drawBall = (x, y, r, color) => {
		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.arc(x, y, r, 0, Math.PI * 2);
		ctx.fill();
	};

	const gameOver = () => {
		running = false;
		paused = false;
		awaitingServe = false;
		updateHudState();
		setStatus('GAME OVER — PRESS R TO RESET');
		clearInterval(loopId);
	};

	const updateHudHeight = () => {
		const hud = document.getElementById('hud');
		if (!hud) {
			hudHeight = 0;
			return;
		}
		const rect = hud.getBoundingClientRect();
		const nextHeight = rect.height || 0;
		const nextIsSmall = smallQuery.matches;
		if (hudHeight === nextHeight && isSmall === nextIsSmall) {
			return;
		}
		hudHeight = nextHeight;
		isSmall = nextIsSmall;
		if (!running) {
			resetLevel();
			if (colors) {
				render();
			}
		}
	};

	const handleSpaceAction = () => {
		if (!running) {
			start();
		} else {
			pause();
		}
	};

	const setPressedState = (button, pressed) => {
		if (!button) {
			return;
		}
		button.classList.toggle('is-pressed', pressed);
	};

	const updateActiveControls = () => {
		const active = controlOrder[controlOrder.length - 1];
		leftPressed = active === 'left';
		rightPressed = active === 'right';
	};

	const registerPress = (control) => {
		if (!pressedControls.has(control)) {
			pressedControls.add(control);
		}
		const index = controlOrder.indexOf(control);
		if (index !== -1) {
			controlOrder.splice(index, 1);
		}
		controlOrder.push(control);
		updateActiveControls();
	};

	const registerRelease = (control) => {
		if (pressedControls.has(control)) {
			pressedControls.delete(control);
		}
		const index = controlOrder.indexOf(control);
		if (index !== -1) {
			controlOrder.splice(index, 1);
		}
		updateActiveControls();
	};

	document.addEventListener('keydown', (event) => {
		const key = event.key.toLowerCase();
		const isSpace = event.code === 'Space' || key === ' ' || key === 'spacebar';
		const isArrow = key === 'arrowleft' || key === 'arrowright';
		const target = event.target;
		const isEditable =
			target &&
			(target.isContentEditable ||
				target.tagName === 'INPUT' ||
				target.tagName === 'TEXTAREA' ||
				target.tagName === 'SELECT');
		if (!isEditable && (isArrow || isSpace)) {
			event.preventDefault();
		}
			if (key === 'arrowleft') {
				if (!event.repeat) {
					playBreakoutSound('tap_05.wav');
					registerPress('left');
				}
				setPressedState(touchLeft, true);
			} else if (key === 'arrowright') {
				if (!event.repeat) {
					playBreakoutSound('tap_05.wav');
					registerPress('right');
				}
				setPressedState(touchRight, true);
			} else if (isSpace) {
				setPressedState(touchSpace, true);
				if (!event.repeat) {
					playBreakoutSound('tap_05.wav');
					registerPress('space');
					handleSpaceAction();
				}
			} else if (key === 'r') {
				if (!event.repeat) {
					playBreakoutSound('tap_05.wav');
				}
				resetGame();
			}
		});

	document.addEventListener('keyup', (event) => {
		const key = event.key.toLowerCase();
		const isSpace = event.code === 'Space' || key === ' ' || key === 'spacebar';
		if (key === 'arrowleft') {
			registerRelease('left');
			setPressedState(touchLeft, false);
		} else if (key === 'arrowright') {
			registerRelease('right');
			setPressedState(touchRight, false);
		} else if (isSpace) {
			registerRelease('space');
			setPressedState(touchSpace, false);
		}
	});

	const startBtn = document.getElementById('btnStart');
	const pauseBtn = document.getElementById('btnPause');
	const styleBtn = document.getElementById('btnStyle');
	const resetBtn = document.getElementById('btnReset');
	const touchLeft = document.querySelector('[data-touch-control="left"]');
	const touchRight = document.querySelector('[data-touch-control="right"]');
	const touchSpace = document.querySelector('[data-touch-control="space"]');

	const setBrickStyle = (enabled) => {
		brickStyleEnabled = Boolean(enabled);
		if (breakoutRoot) {
			breakoutRoot.setAttribute('data-brick-style', brickStyleEnabled ? 'halftone' : 'flat');
		}
		if (styleBtn) {
			styleBtn.setAttribute('aria-pressed', brickStyleEnabled ? 'true' : 'false');
		}
		render();
	};

	if (startBtn) {
		startBtn.addEventListener('click', start);
	}
	if (pauseBtn) {
		pauseBtn.addEventListener('click', pause);
	}
	if (styleBtn) {
		styleBtn.addEventListener('click', () => {
			setBrickStyle(!brickStyleEnabled);
		});
	}
	if (resetBtn) {
		resetBtn.addEventListener('click', resetGame);
	}

	const bindHoldButton = (button, onPress, onRelease, options = {}) => {
		if (!button) {
			return;
		}
		const { preventDefault = true } = options;
		const press = (event) => {
			if (preventDefault) {
				event.preventDefault();
			}
			onPress();
		};
		const release = (event) => {
			if (preventDefault) {
				event.preventDefault();
			}
			onRelease();
		};
		button.addEventListener('pointerdown', press);
		button.addEventListener('pointerup', release);
		button.addEventListener('pointerleave', release);
		button.addEventListener('pointercancel', release);
	};

	bindHoldButton(touchLeft, () => {
		registerPress('left');
		setPressedState(touchLeft, true);
	}, () => {
		registerRelease('left');
		setPressedState(touchLeft, false);
	});

	bindHoldButton(touchRight, () => {
		registerPress('right');
		setPressedState(touchRight, true);
	}, () => {
		registerRelease('right');
		setPressedState(touchRight, false);
	});

	if (touchSpace) {
		bindHoldButton(touchSpace, () => {
			registerPress('space');
			setPressedState(touchSpace, true);
		}, () => {
			registerRelease('space');
			setPressedState(touchSpace, false);
		}, { preventDefault: false });
		touchSpace.addEventListener('click', (event) => {
			event.preventDefault();
			handleSpaceAction();
		});
	}

	const refreshTheme = () => {
		syncThemeColors(true);
		render();
	};

	const themeObserver = new MutationObserver(refreshTheme);
	themeObserver.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
	mediaQuery.addEventListener('change', refreshTheme);

	window.addEventListener('resize', () => {
		updateHudHeight();
	});

	updateHudHeight();
	syncThemeColors();
	resetGame();
	setBrickStyle(false);
})();
