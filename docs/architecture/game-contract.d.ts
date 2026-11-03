/** Design contract for M Arcade; no runtime implementation is implied. */
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type Input =
  | { type: 'tilt'; direction: 'up' | 'down' | 'left' | 'right' }
  | { type: 'wheel'; steps: number }
  | { type: 'center' }
  | { type: 'continue' };
export type Phase = 'ready' | 'playing' | 'won' | 'lost';
export interface Ranking {
  id: string;
  metric: 'points' | 'milliseconds';
  order: 'asc' | 'desc';
  limit: number;
  ties: 'keep-existing';
}
export interface HudItem { id: string; label: string; value: string; }
export interface ScoreCandidate { boardId: string; value: number; }
export interface Effects {
  dirty?: boolean;
  checkpoint?: boolean;
  completion?: { kind: 'won' | 'lost'; score?: ScoreCandidate; canContinue?: boolean };
}
export interface RuntimeServices { now(): number; random(): number; }
export interface GameRuntime {
  input(action: Input): Effects;
  update(dtMs: number, nowMs: number): Effects;
  /** Must not advance physics, write saves or navigate. Recorder/Theme get concrete shared types during implementation. */
  render(recorder: unknown, viewport: {x:number;y:number;w:number;h:number}, theme: unknown, nowMs:number): void;
  /** Board-independent values for the shared score/status rail. */
  hud(): HudItem[];
  phase(): Phase;
  animating(): boolean;
  /** Current eligible record; supports Save score before a run ends. */
  scoreCandidate(): ScoreCandidate | undefined;
  snapshot(): Json;
  dispose(): void;
}
export interface GameModule {
  validate(state: Json, stateVersion: number): boolean;
  migrate(state: Json, fromVersion: number): Json;
  create(modeId: string, saved: Json | undefined, services: RuntimeServices): GameRuntime;
}
export interface GameDefinition {
  id: string;
  title: string;
  moduleVersion: string;
  stateVersion: number;
  icon: string;
  modes: Array<{id:string;label:string}>;
  controls: { help: string[]; centerDuringPlay: 'pause' | 'game-action' };
  timing: { maxDeltaMs: number };
  rankings: Ranking[];
  /** A literal require loader, resolved by the build-time module map. */
  load(): GameModule;
}
