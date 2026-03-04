(() => {
	const canvas = document.getElementById('game');
	if (!canvas) {
		return;
	}

	const ctx = canvas.getContext('2d');
	const nextCanvas = document.getElementById('next');
	const nextCtx = nextCanvas ? nextCanvas.getContext('2d') : null;
	const root = document.documentElement;
	const tetrisRoot = document.querySelector('[data-tetris]');
	const tetrisScript = document.querySelector('script[src$="assets/scripts/tetris.js"]');

	const cols = 16;
	let rows = 16;
	const dropBase = 600;
	const softDropMultiplier = 4;
	const scoreEl = document.getElementById('score');
	const linesEl = document.getElementById('lines');
	const statusEl = document.getElementById('status');
	const pauseBtn = document.getElementById('btnPause');
	const resetBtn = document.getElementById('btnReset');
	const styleToggleInput = document.querySelector('[data-tetris-style-toggle-input]');
	const panel = document.querySelector('.tetris .panel');

	let grid;
	let current;
	let next;
	let score = 0;
	let lines = 0;
	let paused = false;
	let gameOver = false;
	let started = false;
	let dropCounter = 0;
	let lastTime = 0;
	let dropInterval = dropBase;
	let softDropActive = false;
	let pieceStyleEnabled = false;
	let dpr = window.devicePixelRatio || 1;

	const getTetrisSoundUrl = (filename) => (tetrisScript && tetrisScript.src
		? new URL(`../media/interface/${filename}`, tetrisScript.src).toString()
		: `/assets/media/interface/${filename}`);
	const tetrisSounds = new Map();

	const getTetrisSound = (filename) => {
		if (typeof Audio !== 'function') {
			return null;
		}
		if (!tetrisSounds.has(filename)) {
			const audio = new Audio(getTetrisSoundUrl(filename));
			audio.preload = 'auto';
			tetrisSounds.set(filename, audio);
		}
		return tetrisSounds.get(filename);
	};

	const playTetrisSound = (filename) => {
		if (root.getAttribute('data-sound') === 'off') {
			return;
		}
		const audio = getTetrisSound(filename);
		if (!audio) {
			return;
		}
		try {
			audio.currentTime = 0;
			const playPromise = audio.play();
			if (playPromise && typeof playPromise.catch === 'function') {
				playPromise.catch(() => {
					// Ignore playback errors for game sounds.
				});
			}
		} catch (error) {
			// Ignore playback errors for game sounds.
		}
	};

	const playTetrisControlSound = (event) => {
		if (event.repeat) {
			return;
		}
		playTetrisSound('tap_05.wav');
	};

	const shapes = {
		I: [
			[0, 0, 0, 0],
			[1, 1, 1, 1],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
		],
		J: [
			[1, 0, 0],
			[1, 1, 1],
			[0, 0, 0],
		],
		L: [
			[0, 0, 1],
			[1, 1, 1],
			[0, 0, 0],
		],
		O: [
			[1, 1],
			[1, 1],
		],
		S: [
			[0, 1, 1],
			[1, 1, 0],
			[0, 0, 0],
		],
		Z: [
			[1, 1, 0],
			[0, 1, 1],
			[0, 0, 0],
		],
		T: [
			[0, 1, 0],
			[1, 1, 1],
			[0, 0, 0],
		],
	};

	const bag = Object.keys(shapes);

	const readCssVar = (styles, name, fallback) => {
		const value = styles.getPropertyValue(name).trim();
		return value || fallback;
	};

	const getColors = () => {
		const styles = getComputedStyle(tetrisRoot || root);
		return {
			canvas: readCssVar(styles, '--tetris-canvas-bg', readCssVar(styles, '--tc-background', '#ffffff')),
			grid: readCssVar(styles, '--tetris-grid', readCssVar(styles, '--tc-border', '#cccccc')),
			block: readCssVar(styles, '--tetris-block', readCssVar(styles, '--tc-text', '#111111')),
		};
	};

	let colors = getColors();

	const resizeCanvas = (target) => {
		if (!target) {
			return;
		}
		const rect = target.getBoundingClientRect();
		if (!rect.width || !rect.height) {
			return;
		}
		dpr = window.devicePixelRatio || 1;
		target.width = Math.floor(rect.width * dpr);
		target.height = Math.floor(rect.height * dpr);
		const ctx2d = target.getContext('2d');
		ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
	};

	const updateRowsFromCanvas = () => {
		const width = canvas.width / dpr;
		const height = canvas.height / dpr;
		if (!width || !height) {
			return false;
		}
		const nextRows = Math.max(16, Math.round((height / width) * cols));
		if (rows !== nextRows) {
			rows = nextRows;
			return true;
		}
		return false;
	};

	const resetGrid = () => {
		grid = Array.from({ length: rows }, () => Array(cols).fill(0));
	};

	const formatScore = (value) => value.toString().padStart(6, '0');

	const updateScore = () => {
		if (scoreEl) {
			scoreEl.textContent = formatScore(score);
		}
	};

	const formatLines = (value) => value.toString().padStart(3, '0');

	const updateLines = () => {
		if (linesEl) {
			linesEl.textContent = formatLines(lines);
		}
	};

	const updateSpeed = () => {
		const steps = Math.floor(lines / 4);
		const baseInterval = dropBase * Math.pow(0.99, steps);
		dropInterval = softDropActive ? baseInterval / softDropMultiplier : baseInterval;
	};

	const setStatus = (msg) => {
		if (statusEl) {
			statusEl.textContent = msg;
		}
	};

	const updateStatus = () => {
		if (gameOver) {
			setStatus('GAME OVER — PRESS R TO RESET');
			return;
		}
		if (!started) {
			setStatus('PRESS START TO BEGIN');
			return;
		}
		if (paused) {
			setStatus('PAUSED — PRESS START TO RESUME');
			return;
		}
		setStatus('PRESS START TO PAUSE');
	};

	const updatePauseButton = () => {
		if (!pauseBtn) {
			return;
		}
		pauseBtn.textContent = paused || !started ? 'Start' : 'Pause';
	};

	const updatePanelState = () => {
		if (!panel) {
			return;
		}
		if (!started || gameOver) {
			panel.removeAttribute('data-state');
			return;
		}
		panel.dataset.state = paused ? 'paused' : 'running';
	};

	const clearNext = () => {
		if (!nextCtx || !nextCanvas) {
			return;
		}
		const previewWidth = nextCanvas.width / dpr;
		const previewHeight = nextCanvas.height / dpr;
		nextCtx.clearRect(0, 0, previewWidth, previewHeight);
	};

	const randomPiece = () => {
		const type = bag[Math.floor(Math.random() * bag.length)];
		const shape = shapes[type].map((row) => row.slice());
		return {
			type,
			shape,
			x: Math.floor(cols / 2) - Math.ceil(shape[0].length / 2),
			y: -1,
		};
	};

	const collide = (piece) => {
		for (let y = 0; y < piece.shape.length; y += 1) {
			for (let x = 0; x < piece.shape[y].length; x += 1) {
				if (!piece.shape[y][x]) {
					continue;
				}
				const gx = piece.x + x;
				const gy = piece.y + y;
				if (gx < 0 || gx >= cols || gy >= rows) {
					return true;
				}
				if (gy >= 0 && grid[gy][gx]) {
					return true;
				}
			}
		}
		return false;
	};

	const mergePiece = () => {
		current.shape.forEach((row, y) => {
			row.forEach((value, x) => {
				if (value && current.y + y >= 0) {
					grid[current.y + y][current.x + x] = current.type;
				}
			});
		});
	};

	const pieceHalftoneLevel = {
		I: 900,
		J: 800,
		L: 800,
		O: 700,
		S: 600,
		T: 500,
		Z: 600,
	};

	const patternDefs = {
		500: { size: 2, base: 'paper', dots: [[0, 0], [1, 1]], dot: 'ink' },
		600: { size: 2, base: 'ink', dots: [[0, 0]], dot: 'paper' },
		700: { size: 4, base: 'ink', dots: [[0, 0], [2, 2]], dot: 'paper' },
		800: { size: 4, base: 'ink', dots: [[0, 0]], dot: 'paper' },
	};

	const patternCache = new WeakMap();

	const getHalftoneFill = (context, level) => {
		if (level === 900) {
			return colors.block;
		}

		const def = patternDefs[level];
		if (!def) {
			return colors.block;
		}

		const paletteKey = `${colors.block}|${colors.canvas}|${level}`;
		let byContext = patternCache.get(context);
		if (!byContext) {
			byContext = new Map();
			patternCache.set(context, byContext);
		}
		if (byContext.has(paletteKey)) {
			return byContext.get(paletteKey);
		}

		const tile = document.createElement('canvas');
		tile.width = def.size;
		tile.height = def.size;
		const tileCtx = tile.getContext('2d');
		if (!tileCtx) {
			return colors.block;
		}

		const ink = colors.block;
		const paper = colors.canvas;
		const baseColor = def.base === 'ink' ? ink : paper;
		const dotColor = def.dot === 'ink' ? ink : paper;

		tileCtx.fillStyle = baseColor;
		tileCtx.fillRect(0, 0, def.size, def.size);
		tileCtx.fillStyle = dotColor;
		def.dots.forEach(([x, y]) => {
			tileCtx.fillRect(x, y, 1, 1);
		});

		const pattern = context.createPattern(tile, 'repeat');
		const fill = pattern || colors.block;
		byContext.set(paletteKey, fill);
		return fill;
	};

	const getPieceFill = (context, type) => {
		if (!pieceStyleEnabled || !type) {
			return colors.block;
		}
		const level = pieceHalftoneLevel[type];
		return getHalftoneFill(context, level);
	};

	const clearLines = () => {
		let cleared = 0;
		for (let y = rows - 1; y >= 0; y -= 1) {
			if (grid[y].every((cell) => cell !== 0)) {
				grid.splice(y, 1);
				grid.unshift(Array(cols).fill(0));
				cleared += 1;
				y += 1;
			}
		}
		if (cleared) {
			const points = [0, 40, 100, 300, 1200];
			score += points[cleared] || cleared * 40;
			lines += cleared;
			playTetrisSound(cleared === 4 ? 'celebration.wav' : 'notification.wav');
			updateScore();
			updateLines();
			updateSpeed();
		}
	};

	const rotateMatrixCW = (matrix) => matrix[0].map((_, i) => matrix.map((row) => row[i]).reverse());
	const rotateMatrixCCW = (matrix) => matrix[0].map((_, i) => matrix.map((row) => row[row.length - 1 - i]));

	const rotatePiece = (direction = 1) => {
		const original = current.shape.map((row) => row.slice());
		const rotated = direction === -1 ? rotateMatrixCCW(current.shape) : rotateMatrixCW(current.shape);
		const offsets = [0, -1, 1, -2, 2];
		for (const offset of offsets) {
			current.shape = rotated;
			current.x += offset;
			if (!collide(current)) {
				return;
			}
			current.x -= offset;
		}
		current.shape = original;
	};

	const spawnPiece = () => {
		current = next || randomPiece();
		next = randomPiece();
		current.y = -1;
		current.x = Math.floor(cols / 2) - Math.ceil(current.shape[0].length / 2);
		if (collide(current)) {
			gameOver = true;
			updateStatus();
		}
		updatePanelState();
		drawNext();
	};

	const drawCell = (context, x, y, size, color, offsetY = 0) => {
		const px = x * size;
		const py = y * size + offsetY;
		const gap = 1;
		const blockSize = size - gap;
		context.fillStyle = color;
		context.fillRect(px, py, blockSize, blockSize);
	};

	const drawGrid = () => {
		const width = canvas.width / dpr;
		const height = canvas.height / dpr;
		ctx.clearRect(0, 0, width, height);
		const cell = width / cols;
		const boardHeight = rows * cell;
		const offsetY = Math.max(0, height - boardHeight);
		for (let y = 0; y < rows; y += 1) {
			for (let x = 0; x < cols; x += 1) {
					const cellValue = grid[y][x];
					if (cellValue) {
						const cellType = typeof cellValue === 'string' ? cellValue : null;
						drawCell(ctx, x, y, cell, getPieceFill(ctx, cellType), offsetY);
					}
				}
			}
		};

	const drawPiece = () => {
		if (!current) {
			return;
		}
		const width = canvas.width / dpr;
		const height = canvas.height / dpr;
		const cell = width / cols;
		const boardHeight = rows * cell;
		const offsetY = Math.max(0, height - boardHeight);
		current.shape.forEach((row, y) => {
			row.forEach((value, x) => {
				if (!value) {
					return;
				}
					const gx = current.x + x;
					const gy = current.y + y;
					if (gy >= 0) {
						drawCell(ctx, gx, gy, cell, getPieceFill(ctx, current.type), offsetY);
					}
				});
			});
		};

	const drawNext = () => {
		if (!nextCtx || !next) {
			return;
		}
		const previewWidth = nextCanvas.width / dpr;
		const previewHeight = nextCanvas.height / dpr;
		const baseFont = parseFloat(getComputedStyle(tetrisRoot || root).fontSize) || 16;
		const padding = baseFont * 0.5;
		nextCtx.clearRect(0, 0, previewWidth, previewHeight);
		const shape = next.shape;
		const usableWidth = Math.max(0, previewWidth - padding * 2);
		const usableHeight = Math.max(0, previewHeight - padding * 2);
		const size = Math.min(usableWidth / 4, usableHeight / 4);
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;
		shape.forEach((row, y) => {
			row.forEach((value, x) => {
				if (!value) {
					return;
				}
				minX = Math.min(minX, x);
				maxX = Math.max(maxX, x);
				minY = Math.min(minY, y);
				maxY = Math.max(maxY, y);
			});
		});
		if (minX === Infinity) {
			return;
		}
		const shapeWidth = (maxX - minX + 1) * size;
		const shapeHeight = (maxY - minY + 1) * size;
		const offsetX = padding + (usableWidth - shapeWidth) / 2 - minX * size;
		const offsetY = padding + (usableHeight - shapeHeight) / 2 - minY * size;
		shape.forEach((row, y) => {
			row.forEach((value, x) => {
				if (!value) {
					return;
				}
					const px = offsetX + x * size;
					const py = offsetY + y * size;
					const gap = 1;
					const blockSize = size - gap;
					nextCtx.fillStyle = getPieceFill(nextCtx, next.type);
					nextCtx.fillRect(px, py, blockSize, blockSize);
				});
			});
		};

	const applyPieceStyle = (enabled) => {
		pieceStyleEnabled = Boolean(enabled);
		if (styleToggleInput) {
			styleToggleInput.checked = pieceStyleEnabled;
		}
		draw();
		drawNext();
	};

	const lockCurrentPiece = () => {
		mergePiece();
		playTetrisSound('disabled.wav');
		clearLines();
		spawnPiece();
	};

	const drop = () => {
		if (!current || gameOver) {
			return;
		}
		current.y += 1;
		if (collide(current)) {
			current.y -= 1;
			lockCurrentPiece();
		}
		dropCounter = 0;
	};

	const hardDrop = () => {
		if (!current || gameOver) {
			return;
		}
		while (!collide(current)) {
			current.y += 1;
		}
		current.y -= 1;
		lockCurrentPiece();
		dropCounter = 0;
	};

	const move = (dir) => {
		if (!current || gameOver) {
			return;
		}
		current.x += dir;
		if (collide(current)) {
			current.x -= dir;
		}
	};

	const togglePause = () => {
		if (gameOver) {
			return;
		}
		if (!started) {
			started = true;
			paused = false;
			spawnPiece();
		} else {
			paused = !paused;
		}
		updateStatus();
		updatePauseButton();
		updatePanelState();
	};

	const resetGame = () => {
		softDropActive = false;
		resetGrid();
		score = 0;
		lines = 0;
		updateScore();
		updateLines();
		updateSpeed();
		paused = true;
		started = false;
		gameOver = false;
		current = null;
		next = null;
		updateStatus();
		updatePauseButton();
		updatePanelState();
		draw();
		clearNext();
	};

	const draw = () => {
		colors = getColors();
		drawGrid();
		drawPiece();
	};

	const update = (time = 0) => {
		const delta = time - lastTime;
		lastTime = time;
		if (!paused && !gameOver) {
			dropCounter += delta;
			if (dropCounter > dropInterval) {
				drop();
			}
		}
		draw();
		requestAnimationFrame(update);
	};

	const setSoftDrop = (active) => {
		if (softDropActive === active) {
			return;
		}
		softDropActive = active;
		updateSpeed();
		if (active) {
			dropCounter = dropInterval;
		}
	};

	const handleKey = (event) => {
		if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'Space', 'KeyA', 'KeyD'].includes(event.code)) {
			event.preventDefault();
		}
		if (event.repeat && !['ArrowLeft', 'ArrowRight'].includes(event.code)) {
			return;
		}
		if (event.code === 'ArrowLeft') {
			move(-1);
			playTetrisControlSound(event);
			setPressed(touchLeft, true);
		} else if (event.code === 'ArrowRight') {
			move(1);
			playTetrisControlSound(event);
			setPressed(touchRight, true);
		} else if (event.code === 'ArrowDown') {
			setSoftDrop(true);
			playTetrisControlSound(event);
			setPressed(touchDrop, true);
		} else if (event.code === 'ArrowUp') {
			rotatePiece(1);
			playTetrisControlSound(event);
			setPressed(touchUp, true);
		} else if (event.code === 'KeyA') {
			rotatePiece(-1);
			playTetrisControlSound(event);
			setPressed(touchRotateCCW, true);
		} else if (event.code === 'KeyD') {
			rotatePiece(1);
			playTetrisControlSound(event);
			setPressed(touchRotateCW, true);
		} else if (event.code === 'Space') {
			hardDrop();
			setPressed(touchDrop, true);
		} else if (event.code === 'KeyP') {
			togglePause();
			playTetrisControlSound(event);
		} else if (event.code === 'KeyR') {
			resetGame();
			playTetrisControlSound(event);
		}
	};

	const handleKeyUp = (event) => {
		if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'Space', 'KeyA', 'KeyD'].includes(event.code)) {
			event.preventDefault();
		}
		if (event.code === 'ArrowLeft') {
			setPressed(touchLeft, false);
		} else if (event.code === 'ArrowRight') {
			setPressed(touchRight, false);
		} else if (event.code === 'ArrowDown') {
			setSoftDrop(false);
			setPressed(touchDrop, false);
		} else if (event.code === 'ArrowUp') {
			setPressed(touchUp, false);
		} else if (event.code === 'KeyA') {
			setPressed(touchRotateCCW, false);
		} else if (event.code === 'KeyD') {
			setPressed(touchRotateCW, false);
		} else if (event.code === 'Space') {
			setPressed(touchDrop, false);
		}
	};

	const bindHoldButton = (button, onPress, onRelease, interval = 120) => {
		if (!button) {
			return;
		}
		let timer;
		const press = (event) => {
			event.preventDefault();
			onPress();
			if (timer) {
				clearInterval(timer);
			}
			timer = setInterval(onPress, interval);
			button.classList.add('is-pressed');
		};
		const release = (event) => {
			event.preventDefault();
			if (timer) {
				clearInterval(timer);
				timer = null;
			}
			button.classList.remove('is-pressed');
			if (onRelease) {
				onRelease();
			}
		};
		button.addEventListener('pointerdown', press);
		button.addEventListener('pointerup', release);
		button.addEventListener('pointerleave', release);
		button.addEventListener('pointercancel', release);
	};

	const touchLeft = document.querySelector('[data-touch-control="left"]');
	const touchRight = document.querySelector('[data-touch-control="right"]');
	const touchUp = document.querySelector('[data-touch-control="up"]');
	const touchDrop = document.querySelector('[data-touch-control="drop"]');
	const touchRotateCW = document.querySelector('[data-touch-control="rotate-cw"]');
	const touchRotateCCW = document.querySelector('[data-touch-control="rotate-ccw"]');

	const setPressed = (button, pressed) => {
		if (!button) {
			return;
		}
		button.classList.toggle('is-pressed', pressed);
	};

	bindHoldButton(touchLeft, () => move(-1));
	bindHoldButton(touchRight, () => move(1));

	if (touchUp) {
		touchUp.addEventListener('click', (event) => {
			event.preventDefault();
			rotatePiece(1);
		});
	}

	if (touchRotateCW) {
		touchRotateCW.addEventListener('click', (event) => {
			event.preventDefault();
			rotatePiece(1);
		});
	}

	if (touchRotateCCW) {
		touchRotateCCW.addEventListener('click', (event) => {
			event.preventDefault();
			rotatePiece(-1);
		});
	}

	if (touchDrop) {
		touchDrop.addEventListener('pointerdown', (event) => {
			event.preventDefault();
			setSoftDrop(true);
			setPressed(touchDrop, true);
		});
		const releaseSoftDrop = (event) => {
			event.preventDefault();
			setSoftDrop(false);
			setPressed(touchDrop, false);
		};
		touchDrop.addEventListener('pointerup', releaseSoftDrop);
		touchDrop.addEventListener('pointerleave', releaseSoftDrop);
		touchDrop.addEventListener('pointercancel', releaseSoftDrop);
	}

	if (pauseBtn) {
		pauseBtn.addEventListener('click', () => {
			togglePause();
		});
	}

	if (resetBtn) {
		resetBtn.addEventListener('click', () => {
			resetGame();
		});
	}

	if (styleToggleInput) {
		styleToggleInput.addEventListener('change', () => {
			applyPieceStyle(styleToggleInput.checked);
		});
	}

	window.addEventListener('keydown', handleKey);
	window.addEventListener('keyup', handleKeyUp);

	window.addEventListener('resize', () => {
		resizeCanvas(canvas);
		resizeCanvas(nextCanvas);
		if (updateRowsFromCanvas()) {
			resetGame();
			return;
		}
		draw();
		drawNext();
	});

	resizeCanvas(canvas);
	resizeCanvas(nextCanvas);
	updateRowsFromCanvas();

	resetGame();
	applyPieceStyle(styleToggleInput ? styleToggleInput.checked : false);
	update();
})();
