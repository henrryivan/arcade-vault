import {
	Asteroid,
	Bullet,
	HEIGHT,
	Particle,
	POINTS,
	POWERUP_DROP_CHANCE,
	POWERUP_DURATION,
	PowerUp,
	Ship,
	WIDTH,
	dist,
	rand,
	type Keys,
} from "./entities";
import type {
	AsteroidsCallbacks,
	AsteroidsGame,
	AsteroidsSnapshot,
} from "./types";

type GameState = "playing" | "dead" | "gameover";
type Status = "running" | "paused" | "stopped";

// Teclas del juego: se bloquea su comportamiento por defecto (scroll de la página).
const GAME_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "Space"]);

function isTextField(target: EventTarget | null) {
	if (!(target instanceof HTMLElement)) return false;
	return (
		target.tagName === "INPUT" ||
		target.tagName === "TEXTAREA" ||
		target.isContentEditable
	);
}

export function createAsteroidsGame(
	canvas: HTMLCanvasElement,
	callbacks: AsteroidsCallbacks,
): AsteroidsGame {
	const W = WIDTH;
	const H = HEIGHT;
	canvas.width = W;
	canvas.height = H;

	const ctx = canvas.getContext("2d");
	if (!ctx) {
		// Sin contexto 2D no hay juego; devolvemos una instancia inerte.
		const noop = () => {};
		return {
			pause: noop,
			resume: noop,
			restart: noop,
			stop: noop,
			destroy: noop,
		};
	}

	// ── Estado (todo dentro de la instancia) ────────────────────────────────────
	let ship: Ship;
	let bullets: Bullet[];
	let asteroids: Asteroid[];
	let particles: Particle[];
	let powerUps: PowerUp[];
	let score = 0;
	let lives = 3;
	let level = 1;
	let state: GameState = "playing";
	let deadTimer = 0;
	let powerUpSpawned = false;
	let killsSinceSpawn = 0;
	let gameOverSent = false;
	let simTime = 0; // ms de simulación (se congela en pausa)

	let status: Status = "running";
	let rafId: number | null = null;
	let lastTime: number | null = null;
	let destroyed = false;

	let lastEmitted: AsteroidsSnapshot | null = null;

	// ── Input ───────────────────────────────────────────────────────────────────
	const keys: Keys = {};
	const justPressed: Keys = {};

	const clearKeys = () => {
		for (const k of Object.keys(keys)) keys[k] = false;
		for (const k of Object.keys(justPressed)) justPressed[k] = false;
	};

	const pressed = (code: string) => {
		const val = justPressed[code];
		justPressed[code] = false;
		return !!val;
	};

	const onKeyDown = (e: KeyboardEvent) => {
		if (status === "stopped" || isTextField(e.target)) return;
		if (GAME_KEYS.has(e.code)) e.preventDefault();
		if (status !== "running") return;
		if (!keys[e.code]) justPressed[e.code] = true;
		keys[e.code] = true;
	};

	const onKeyUp = (e: KeyboardEvent) => {
		keys[e.code] = false;
	};

	window.addEventListener("keydown", onKeyDown);
	window.addEventListener("keyup", onKeyUp);

	// ── Notificación a React ────────────────────────────────────────────────────
	const snapshot = (): AsteroidsSnapshot => ({ score, lives, level });

	const notify = () => {
		if (
			!lastEmitted ||
			lastEmitted.score !== score ||
			lastEmitted.lives !== lives ||
			lastEmitted.level !== level
		) {
			lastEmitted = snapshot();
			callbacks.onChange(lastEmitted);
		}
	};

	// ── Lógica ──────────────────────────────────────────────────────────────────
	function spawnAsteroids(count: number) {
		const SAFE_DIST = 130;
		for (let i = 0; i < count; i++) {
			let x: number, y: number;
			do {
				x = rand(0, W);
				y = rand(0, H);
			} while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
			asteroids.push(new Asteroid(x, y, 3));
		}
	}

	function initGame() {
		ship = new Ship(W, H);
		bullets = [];
		asteroids = [];
		particles = [];
		powerUps = [];
		powerUpSpawned = false;
		killsSinceSpawn = 0;
		score = 0;
		lives = 3;
		level = 1;
		state = "playing";
		gameOverSent = false;
		spawnAsteroids(4);
	}

	function nextLevel() {
		level++;
		bullets = [];
		particles = [];
		powerUps = [];
		powerUpSpawned = false;
		killsSinceSpawn = 0;
		ship.reset();
		spawnAsteroids(3 + level);
	}

	function explode(x: number, y: number, count = 8) {
		for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
	}

	function killShip() {
		explode(ship.x, ship.y, 14);
		ship.dead = true;
		lives--;
		if (lives <= 0) {
			state = "gameover";
		} else {
			state = "dead";
			deadTimer = 2;
		}
	}

	function update(dt: number) {
		if (state === "gameover") return;

		if (state === "dead") {
			deadTimer -= dt;
			particles.forEach((p) => p.update(dt));
			particles = particles.filter((p) => !p.dead);
			asteroids.forEach((a) => a.update(dt, W, H));
			if (deadTimer <= 0) {
				state = "playing";
				ship.reset();
			}
			return;
		}

		// Disparar
		if (pressed("Space")) {
			bullets.push(...ship.tryShoot());
		}

		ship.update(dt, keys);
		bullets.forEach((b) => b.update(dt, W, H));
		asteroids.forEach((a) => a.update(dt, W, H));
		particles.forEach((p) => p.update(dt));
		powerUps.forEach((p) => p.update(dt, W, H));

		bullets = bullets.filter((b) => !b.dead);
		particles = particles.filter((p) => !p.dead);
		powerUps = powerUps.filter((p) => !p.dead);

		for (const p of powerUps) {
			if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
				p.dead = true;
				ship.tripleShot = POWERUP_DURATION;
			}
		}

		// Bala vs asteroide
		const newAsteroids: Asteroid[] = [];
		for (const b of bullets) {
			for (const a of asteroids) {
				if (!a.dead && !b.dead && dist(b, a) < a.radius) {
					b.dead = true;
					a.dead = true;
					score += POINTS[a.size];
					explode(a.x, a.y, a.size * 5);
					newAsteroids.push(...a.split());
					if (!powerUpSpawned) {
						killsSinceSpawn++;
						const guaranteed = killsSinceSpawn >= 5;
						if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
							powerUps.push(new PowerUp(a.x, a.y));
							powerUpSpawned = true;
						}
					}
				}
			}
		}
		asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
		bullets = bullets.filter((b) => !b.dead);

		// Nave vs asteroide
		if (ship.invincible <= 0) {
			for (const a of asteroids) {
				if (dist(ship, a) < ship.radius + a.radius * 0.82) {
					killShip();
					break;
				}
			}
		}

		// Nivel completado
		if (asteroids.length === 0) nextLevel();
	}

	// ── Dibujo ──────────────────────────────────────────────────────────────────
	function drawLifeIcon(x: number, y: number) {
		ctx!.save();
		ctx!.translate(x, y);
		ctx!.rotate(-Math.PI / 2);
		ctx!.strokeStyle = "#fff";
		ctx!.lineWidth = 1.2;
		ctx!.lineJoin = "round";
		ctx!.beginPath();
		ctx!.moveTo(9, 0);
		ctx!.lineTo(-6, -5);
		ctx!.lineTo(-3, 0);
		ctx!.lineTo(-6, 5);
		ctx!.closePath();
		ctx!.stroke();
		ctx!.restore();
	}

	function drawHUD(c: CanvasRenderingContext2D) {
		c.fillStyle = "#fff";
		c.font = "15px monospace";

		c.textAlign = "left";
		c.fillText(`SCORE  ${score}`, 14, 26);

		c.textAlign = "center";
		c.fillText(`NIVEL ${level}`, W / 2, 26);

		for (let i = 0; i < lives; i++) drawLifeIcon(W - 16 - i * 22, 18);

		if (ship.tripleShot > 0) {
			c.textAlign = "left";
			c.fillStyle = "#0ff";
			c.fillText(`3x  ${ship.tripleShot.toFixed(1)}s`, 14, 46);
		}
	}

	function draw() {
		const c = ctx!;
		c.fillStyle = "#000";
		c.fillRect(0, 0, W, H);

		particles.forEach((p) => p.draw(c));
		asteroids.forEach((a) => a.draw(c));
		powerUps.forEach((p) => p.draw(c, simTime));
		bullets.forEach((b) => b.draw(c));
		ship.draw(c);

		drawHUD(c);
	}

	// ── Bucle principal ─────────────────────────────────────────────────────────
	function cancelLoop() {
		if (rafId !== null) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}
	}

	function startLoop() {
		cancelLoop();
		lastTime = null; // el primer frame tras pausa/arranque tiene dt = 0
		rafId = requestAnimationFrame(loop);
	}

	function loop(ts: number) {
		rafId = null;
		if (status !== "running") return;

		const dt =
			lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
		lastTime = ts;
		simTime += dt * 1000;

		update(dt);
		notify();

		// Al perder la última vida: se avisa una sola vez y se detiene la simulación.
		if (state === "gameover" && !gameOverSent) {
			gameOverSent = true;
			status = "stopped";
			clearKeys();
			draw();
			callbacks.onGameOver(snapshot());
			return;
		}

		draw();
		if (status === "running") rafId = requestAnimationFrame(loop);
	}

	// ── API pública ─────────────────────────────────────────────────────────────
	function pause() {
		if (status !== "running") return;
		status = "paused";
		cancelLoop();
		clearKeys();
	}

	function resume() {
		if (status !== "paused") return;
		status = "running";
		startLoop();
	}

	function stop() {
		if (status === "stopped") return;
		status = "stopped";
		cancelLoop();
		clearKeys();
	}

	function restart() {
		if (destroyed) return;
		cancelLoop();
		clearKeys();
		initGame();
		status = "running";
		notify();
		draw();
		startLoop();
	}

	function destroy() {
		destroyed = true;
		status = "stopped";
		cancelLoop();
		clearKeys();
		window.removeEventListener("keydown", onKeyDown);
		window.removeEventListener("keyup", onKeyUp);
	}

	// Arranque
	initGame();
	notify();
	draw();
	startLoop();

	return { pause, resume, restart, stop, destroy };
}
