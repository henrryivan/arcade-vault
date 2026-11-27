export type AsteroidsSnapshot = {
	score: number;
	lives: number; // 0..3
	level: number; // 1..n
};

export type AsteroidsCallbacks = {
	// Solo se llama cuando cambia score, vidas o nivel (no en cada frame).
	onChange: (snapshot: AsteroidsSnapshot) => void;
	// Una sola vez por partida, al perder la última vida.
	onGameOver: (snapshot: AsteroidsSnapshot) => void;
};

export type AsteroidsGame = {
	pause(): void;
	resume(): void;
	restart(): void; // nueva partida: 3 vidas, nivel 1, score 0
	stop(): void; // detiene la simulación y suelta las teclas (modal abierto, FIN)
	destroy(): void; // cancela rAF y quita todos los listeners
};
