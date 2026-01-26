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

	const cols = 16;
	let rows = 16;
	const dropBase = 600;
	const softDropRate = 40;
	const scoreEl = document.getElementById('score');
	const linesEl = document.getElementById('lines');
	const statusEl = document.getElementById('status');
	const pauseBtn = document.getElementById('btnPause');
	const resetBtn = document.getElementById('btnReset');
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
	let dpr = window.devicePixelRatio || 1;

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
		dropInterval = dropBase * Math.pow(0.99, steps);
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
		if (paused) {
			panel.dataset.state = 'paused';
		} else if (!gameOver) {
			panel.dataset.state = 'running';
		} else {
			panel.removeAttribute('data-state');
		}
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
					grid[current.y + y][current.x + x] = 1;
				}
			});
		});
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
				if (grid[y][x]) {
					drawCell(ctx, x, y, cell, colors.block, offsetY);
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
					drawCell(ctx, gx, gy, cell, colors.block, offsetY);
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
				nextCtx.fillStyle = colors.block;
				nextCtx.fillRect(px, py, blockSize, blockSize);
			});
		});
	};

	const drop = () => {
		if (!current || gameOver) {
			return;
		}
		current.y += 1;
		if (collide(current)) {
			current.y -= 1;
			mergePiece();
			clearLines();
			spawnPiece();
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
		mergePiece();
		clearLines();
		spawnPiece();
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

	const softDrop = () => {
		if (!current || gameOver) {
			return;
		}
		current.y += 1;
		if (collide(current)) {
			current.y -= 1;
			mergePiece();
			clearLines();
			spawnPiece();
		}
		dropCounter = 0;
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

	let softDropActive = false;

	const setSoftDrop = (active) => {
		if (softDropActive === active) {
			return;
		}
		softDropActive = active;
		dropInterval = active ? dropBase / 2 : dropBase;
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
			setPressed(touchLeft, true);
		} else if (event.code === 'ArrowRight') {
			move(1);
			setPressed(touchRight, true);
		} else if (event.code === 'ArrowDown') {
			hardDrop();
			setPressed(touchDrop, true);
		} else if (event.code === 'ArrowUp') {
			rotatePiece(1);
			setPressed(touchUp, true);
		} else if (event.code === 'KeyA') {
			rotatePiece(-1);
			setPressed(touchRotateCCW, true);
		} else if (event.code === 'KeyD') {
			rotatePiece(1);
			setPressed(touchRotateCW, true);
		} else if (event.code === 'Space') {
			hardDrop();
			setPressed(touchDrop, true);
		} else if (event.code === 'KeyP') {
			togglePause();
		} else if (event.code === 'KeyR') {
			resetGame();
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
		touchDrop.addEventListener('click', (event) => {
			event.preventDefault();
			hardDrop();
		});
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
	update();
})();
