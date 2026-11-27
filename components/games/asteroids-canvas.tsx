"use client";

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { createAsteroidsGame } from "@/lib/games/asteroids/engine";
import type {
	AsteroidsCallbacks,
	AsteroidsGame,
} from "@/lib/games/asteroids/types";

export type AsteroidsCanvasHandle = Pick<
	AsteroidsGame,
	"pause" | "resume" | "restart" | "stop"
>;

type Props = AsteroidsCallbacks & {
	ref?: Ref<AsteroidsCanvasHandle>;
};

export function AsteroidsCanvas({ onChange, onGameOver, ref }: Props) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const gameRef = useRef<AsteroidsGame | null>(null);
	// Los callbacks se leen desde una ref para no recrear el motor si el padre re-renderiza.
	const callbacksRef = useRef<AsteroidsCallbacks>({ onChange, onGameOver });

	useEffect(() => {
		callbacksRef.current = { onChange, onGameOver };
	}, [onChange, onGameOver]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const game = createAsteroidsGame(canvas, {
			onChange: (s) => callbacksRef.current.onChange(s),
			onGameOver: (s) => callbacksRef.current.onGameOver(s),
		});
		gameRef.current = game;
		return () => {
			game.destroy();
			gameRef.current = null;
		};
	}, []);

	useImperativeHandle(
		ref,
		() => ({
			pause: () => gameRef.current?.pause(),
			resume: () => gameRef.current?.resume(),
			restart: () => gameRef.current?.restart(),
			stop: () => gameRef.current?.stop(),
		}),
		[],
	);

	return (
		<canvas
			ref={canvasRef}
			width={800}
			height={600}
			className="absolute inset-0 block h-full w-full"
		/>
	);
}
