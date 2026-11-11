import { Game } from './game/ui';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const game = new Game(canvas);
// a long press must not open the browser context menu in the middle of a game
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
// dev-only handle for automated UI tests (stripped from production builds)
if (import.meta.env.DEV) (window as unknown as { __game: Game }).__game = game;
