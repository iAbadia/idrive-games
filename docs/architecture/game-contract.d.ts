/** M Arcade runtime contract. Implementation uses CommonJS JavaScript. */
export type Json =
    | null
    | boolean
    | number
    | string
    | Json[]
    | { [key: string]: Json };
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
export interface HudItem {
    label: string;
    value: string;
}
export interface ScoreCandidate {
    boardId: string;
    value: number;
}
export interface ScoreRecord {
    runId: string;
    name: string | null;
    value: number;
}
export type Records = { [boardId: string]: ScoreRecord[] };
export interface Effects {
    dirty?: boolean;
    checkpoint?: boolean;
    pause?: boolean;
}
export interface RuntimeServices {
    now(): number;
    random(): number;
}
export interface FrameRecording {
    words(): Uint32Array;
}
export interface GameRuntime {
    input(action: Input): Effects;
    update(dtMs: number, nowMs: number): Effects;
    /** Returns the board recording; must not advance simulation, save or navigate. */
    render(nowMs: number, paused: boolean): FrameRecording;
    hud(): HudItem[];
    actions(): Array<{ label: string; selected: boolean }>;
    phase(): Phase;
    animating(): boolean;
    pause(): void;
    canContinue(): boolean;
    applyRecords(records: Records, metric: Ranking['metric']): void;
    scoreCandidate(): ScoreCandidate | undefined;
    snapshot(): Json;
    dispose(): void;
}
export interface GameModule {
    validate(state: Json, stateVersion: number): boolean;
    /** Validate old formats and migrate them to the current state version. */
    migrate(state: Json, fromVersion: number): Json;
    create(
        modeId: string,
        saved: Json | undefined,
        services: RuntimeServices,
    ): GameRuntime;
}
export interface GameDefinition {
    id: string;
    title: string;
    tagline: string;
    accent: string;
    winTitle?: string;
    moduleVersion: string;
    stateVersion: number;
    icon: string;
    defaultMode: string;
    modes: Array<{ id: string; label: string }>;
    controls: { help: string[]; centerDuringPlay: 'pause' | 'game-action' };
    timing: { maxDeltaMs: number };
    rankings: Ranking[];
    load(): GameModule;
}
