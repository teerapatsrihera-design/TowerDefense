import { Game } from './game/ui';
import { Battle } from './game/engine';
import { DEFAULT_DECK, STAGE_1 } from './game/data';

const canvas = document.getElementById('game') as HTMLCanvasElement;
new Game(canvas, () => new Battle(STAGE_1, DEFAULT_DECK));
