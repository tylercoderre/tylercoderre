(() => {
	const canvas = document.getElementById('game');
	if (!canvas) {
		return;
	}

	const ctx = canvas.getContext('2d');
	const root = document.documentElement;
	const breakoutRoot = document.querySelector('[data-breakout]');

	const W = canvas.width;
	const H = canvas.height;
	const rows = 6;
	const cols = 10;
	const brickGap = 3;
	const brickW = (W - (cols + 1) * brickGap) / cols;
	const brickH = 18;

	const paddle = { w: 80, h: 12, x: W / 2 - 40, y: H - 36, speed: 6 };
	const ball = { x: W / 2, y: H / 2 + 60, r: 6, vx: 3, vy: -3, speedInc: 0.05 };

	let bricks;
	let score;
	let lives;
	let running = false;
	let paused = false;
	let loopId;
	let leftPressed = false;
	let rightPressed = false;
	let colors = null;
	let themeToken = '';
	const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

	const fmt = (n) => n.toString().padStart(6, '0');

	const readCssVar = (styles, name, fallback) => {
		const value = styles.getPropertyValue(name).trim();
		return value || fallback;
	};

	const updateThemeColors = () => {
		const styles = getComputedStyle(breakoutRoot || root);
		colors = {
			canvas: readCssVar(styles, '--breakout-canvas-bg', readCssVar(styles, '--tc-background-primary', '#ffffff')),
			grid: readCssVar(styles, '--breakout-grid', readCssVar(styles, '--tc-border', '#cccccc')),
			paddle: readCssVar(styles, '--breakout-paddle', readCssVar(styles, '--tc-text-primary', '#111111')),
			ball: readCssVar(styles, '--breakout-ball', readCssVar(styles, '--tc-text-primary', '#111111')),
			brick: readCssVar(styles, '--breakout-brick', readCssVar(styles, '--tc-text-primary', '#111111')),
		};
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
		for (let r = 0; r < rows; r += 1) {
			for (let c = 0; c < cols; c += 1) {
				bricks.push({
					x: brickGap + c * (brickW + brickGap),
					y: 60 + r * (brickH + brickGap),
					w: brickW,
					h: brickH,
					alive: true,
				});
			}
		}
	};

	const updateHUD = () => {
		const scoreEl = document.getElementById('score');
		const livesEl = document.getElementById('lives');
		if (scoreEl) {
			scoreEl.textContent = fmt(score);
		}
		if (livesEl) {
			livesEl.textContent = lives.toString().padStart(2, '0');
		}
	};

	const setStatus = (msg) => {
		const statusEl = document.getElementById('status');
		if (statusEl) {
			statusEl.textContent = msg || '← → to move • Space = start/pause • R = reset';
		}
	};

	const centerBallOnPaddle = (randomDir = false) => {
		ball.x = paddle.x + paddle.w / 2;
		ball.y = paddle.y - ball.r - 1;
		const dir = randomDir ? (Math.random() < 0.5 ? -1 : 1) : 1;
		ball.vx = 3 * dir;
		ball.vy = -3;
	};

	const resetGame = () => {
		score = 0;
		lives = 3;
		updateHUD();
		resetLevel();
		centerBallOnPaddle(true);
		running = false;
		paused = false;
		setStatus('PRESS SPACE OR START');
		render();
		clearInterval(loopId);
	};

	const start = () => {
		if (!running) {
			running = true;
			paused = false;
			loop();
			setStatus('');
		}
	};

	const pause = () => {
		paused = !paused;
		setStatus(paused ? 'PAUSED' : '');
	};

	const loop = () => {
		clearInterval(loopId);
		loopId = setInterval(() => {
			if (running && !paused) {
				update();
				render();
			}
		}, 1000 / 60);
	};

	const update = () => {
		syncThemeColors();

		if (leftPressed) {
			paddle.x -= paddle.speed;
		}
		if (rightPressed) {
			paddle.x += paddle.speed;
		}
		paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));

		ball.x += ball.vx;
		ball.y += ball.vy;

		if (ball.x < ball.r) {
			ball.x = ball.r;
			ball.vx *= -1;
		}
		if (ball.x > W - ball.r) {
			ball.x = W - ball.r;
			ball.vx *= -1;
		}
		if (ball.y < ball.r) {
			ball.y = ball.r;
			ball.vy *= -1;
		}

		if (ball.y > H + ball.r) {
			lives -= 1;
			updateHUD();
			if (lives <= 0) {
				gameOver();
				return;
			}
			centerBallOnPaddle(true);
			paused = true;
			setStatus('PRESS SPACE TO SERVE');
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
			updateHUD();
			resetLevel();
			centerBallOnPaddle(true);
			paused = true;
			setStatus('LEVEL CLEARED — PRESS SPACE');
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
			drawRect(brick.x, brick.y, brick.w, brick.h, colors.brick);
		}

		drawRect(paddle.x, paddle.y, paddle.w, paddle.h, colors.paddle);
		drawBall(ball.x, ball.y, ball.r, colors.ball);
	};

	const drawRect = (x, y, w, h, color) => {
		ctx.fillStyle = color;
		ctx.fillRect(x, y, w, h);
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
		setStatus('GAME OVER — PRESS R TO RESET');
		clearInterval(loopId);
	};

	document.addEventListener('keydown', (event) => {
		const key = event.key.toLowerCase();
		if (key === 'arrowleft') {
			leftPressed = true;
		} else if (key === 'arrowright') {
			rightPressed = true;
		} else if (key === ' ') {
			if (!running) {
				start();
			} else {
				pause();
			}
		} else if (key === 'r') {
			resetGame();
		}
	});

	document.addEventListener('keyup', (event) => {
		const key = event.key.toLowerCase();
		if (key === 'arrowleft') {
			leftPressed = false;
		} else if (key === 'arrowright') {
			rightPressed = false;
		}
	});

	const startBtn = document.getElementById('btnStart');
	const pauseBtn = document.getElementById('btnPause');
	const resetBtn = document.getElementById('btnReset');

	if (startBtn) {
		startBtn.addEventListener('click', start);
	}
	if (pauseBtn) {
		pauseBtn.addEventListener('click', pause);
	}
	if (resetBtn) {
		resetBtn.addEventListener('click', resetGame);
	}

	const refreshTheme = () => {
		syncThemeColors(true);
		render();
	};

	const themeObserver = new MutationObserver(refreshTheme);
	themeObserver.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
	mediaQuery.addEventListener('change', refreshTheme);

	syncThemeColors();
	resetGame();
})();
