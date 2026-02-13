/**
 * TypeScript type definitions for the Ralph Layer Cake Orchestrator
 *
 * These declarations cover the public API surface. Import them for type safety:
 *   /// <reference path="./types/ralph.d.ts" />
 *   const { Ralph } = require('./lib/ralph');
 */

// --- Core Types ---

export interface RalphOptions {
  /** Project tier: 'micro' | 'small' | 'medium' | 'large'. Default: 'small' */
  tier?: 'micro' | 'small' | 'medium' | 'large';
  /** Auto-approve human gates at L3 and L7. Default: false */
  autoApproveGates?: boolean;
  /** Enable verbose console output. Default: true */
  verbose?: boolean;
  /** Agent execution timeout in ms. 0 = no timeout. Default: 300000 */
  agentTimeout?: number;
  /** Max retries on agent crash/timeout. Default: 3 */
  maxRetries?: number;
  /** Return spawn config without executing. Default: false */
  dryRun?: boolean;
  /** Max cascade depth before escalation. Default: 5 */
  maxCascadeDepth?: number;
  /** Timeout in ms for human gates. 0 = wait forever. Default: 0 */
  gateTimeout?: number;
  /** Auto-approve gates on timeout instead of erroring. Default: false */
  gateAutoApproveOnTimeout?: boolean;
  /** Enable event logging to _events.jsonl. Default: true */
  eventLog?: boolean;
  /** Enable terminal-notifier notifications. Default: true */
  notifications?: boolean;
  /** Webhook URL for external integrations (Slack, Discord). Default: null */
  webhookUrl?: string | null;
  /** Stall detection threshold in ms. Default: 600000 */
  stallThresholdMs?: number;
  /** Stall detection poll interval in ms. Default: 30000 */
  stallPollMs?: number;
}

export interface Position {
  layer: string;
  epic?: string | null;
  feature?: string | null;
  iteration: number;
}

export interface LayerDefinition {
  name: string;
  phase: string;
  agent: string;
  humanGate?: boolean;
  next?: string;
}

export interface SpawnConfig {
  agentType: string;
  model: string;
  layerId: string;
  prompt: string;
  permissions: Record<string, boolean>;
  context: {
    files: string[];
    [key: string]: unknown;
  };
  abortSignal?: AbortSignal;
  registerProcess?: (proc: import('child_process').ChildProcess) => void;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface Artifacts {
  reviewResult?: ReviewResult;
  tokenUsage?: TokenUsage;
  [key: string]: unknown;
}

export interface ReviewResult {
  verdict: 'PASS' | 'ITERATE';
  issues?: ReviewIssue[];
}

export interface ReviewIssue {
  title: string;
  severity: 'MINOR' | 'MAJOR' | 'ESCALATE';
}

export type AgentExecutor = (spawnConfig: SpawnConfig) => Promise<Artifacts>;

export interface RunResult {
  status: string;
  layerId?: string;
  from?: string;
  to?: string;
  message?: string;
  error?: string;
  attempts?: number;
  spawnConfig?: SpawnConfig;
  action?: string;
  [key: string]: unknown;
}

export interface ProgressInfo {
  completed: number;
  total: number;
  percentage: number;
}

export interface StatusInfo {
  position: Position;
  progress: ProgressInfo;
  gates: Record<string, { status: string }>;
  layer: LayerDefinition;
  costs: CostSummary;
  timings: TimingSummary;
}

// --- Event Types ---

export type RalphEventName =
  | 'onLayerStart'
  | 'onLayerComplete'
  | 'onAgentSpawn'
  | 'onValidationResult'
  | 'onRoutingDecision'
  | 'onHumanGateRequired'
  | 'onGateTimeout'
  | 'onCostUpdate'
  | 'onError';

// --- CostTracker ---

export interface CostSummary {
  layers: Record<string, { inputTokens: number; outputTokens: number; calls: number }>;
  totals: { inputTokens: number; outputTokens: number; calls: number };
}

export declare class CostTracker {
  layers: Record<string, { inputTokens: number; outputTokens: number; calls: number }>;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCalls: number;

  record(layerId: string, inputTokens?: number, outputTokens?: number): void;
  getSummary(): CostSummary;
  reset(): void;
}

// --- LayerTimer ---

export interface TimingSummary {
  layers: Record<string, {
    durationMs: number;
    runs: number;
    lastStartedAt: string | null;
    lastEndedAt: string | null;
  }>;
  totalDurationMs: number;
}

export declare class LayerTimer {
  layers: Record<string, {
    startedAt: string | null;
    endedAt: string | null;
    durationMs: number;
    runs: Array<{ startedAt: string; endedAt: string; durationMs: number }>;
  }>;
  totalDurationMs: number;

  start(layerId: string): void;
  end(layerId: string): void;
  getSummary(): TimingSummary;
  reset(): void;
}

// --- PluginManager ---

export type HookName =
  | 'beforeLayerStart'
  | 'afterLayerEnd'
  | 'beforeSpawn'
  | 'afterSpawn'
  | 'onVerdict'
  | 'onError';

export interface Plugin {
  name: string;
  beforeLayerStart?(context: { layerId: string; layer: LayerDefinition; position: Position }): void | Promise<void>;
  afterLayerEnd?(context: { layerId: string; next: string; result: RunResult }): void | Promise<void>;
  beforeSpawn?(context: { layerId: string; spawnConfig: SpawnConfig }): void | Promise<void>;
  afterSpawn?(context: { layerId: string; spawnConfig: SpawnConfig; artifacts: Artifacts }): void | Promise<void>;
  onVerdict?(context: { layerId: string; verdict: string; issues: ReviewIssue[] }): void | Promise<void>;
  onError?(context: { type: string; layerId?: string; error?: string; [key: string]: unknown }): void | Promise<void>;
}

export interface HookResult {
  plugin: string;
  error?: Error;
}

export declare class PluginManager {
  plugins: Plugin[];
  readonly size: number;

  register(plugin: Plugin): void;
  unregister(name: string): boolean;
  run(hookName: HookName, context?: Record<string, unknown>): Promise<HookResult[]>;
  list(): string[];
  get(name: string): Plugin | undefined;
  clear(): void;
}

// --- EventLogger ---

export interface EventEntry {
  timestamp: string;
  type: string;
  layer: string | null;
  epic: string | null;
  verdict: string | null;
  message: string;
  meta?: Record<string, unknown>;
}

export declare class EventLogger {
  projectRoot: string;
  filename: string;
  enabled: boolean;
  filePath: string;
  buffer: EventEntry[];

  constructor(projectRoot: string, options?: { filename?: string; enabled?: boolean });
  log(event: Partial<EventEntry>): void;
  layerStart(layerId: string, layerName: string, epic?: string): void;
  layerEnd(layerId: string, nextLayer: string, epic?: string): void;
  verdict(layerId: string, verdictValue: string, issues?: ReviewIssue[], epic?: string): void;
  error(layerId: string, errorMessage: string, epic?: string): void;
  gateApproval(layerId: string): void;
  gateWaiting(layerId: string): void;
  readAll(): EventEntry[];
  getCounts(): Record<string, number>;
  clear(): void;
}

// --- Ralph Class ---

export declare class Ralph {
  projectRoot: string;
  options: Required<RalphOptions>;
  state: import('./lib/state-machine').StateManager;
  validator: import('./lib/validator').Validator;
  router: import('./lib/router').Router;
  spawner: import('./lib/agent-spawner').AgentSpawner;
  costs: CostTracker;
  timings: LayerTimer;
  eventLogger: EventLogger;
  pluginManager: PluginManager;

  constructor(projectRoot: string, options?: RalphOptions);

  /** Register a plugin with lifecycle hooks. Returns this for chaining. */
  use(plugin: Plugin): this;

  /** Register an event handler */
  on(event: RalphEventName, handler: (data: unknown) => void): this;

  /** Initialize project or resume existing one */
  initialize(): Promise<RunResult>;

  /** Run the next layer */
  runNextLayer(): Promise<RunResult>;

  /** Handle layer completion */
  onLayerComplete(layerId: string, artifacts?: Artifacts): Promise<RunResult>;

  /** Handle review result from Judge */
  handleReviewResult(layerId: string, reviewResult: ReviewResult): Promise<RunResult>;

  /** Approve a human gate */
  approveGate(layerId: string): Promise<unknown>;

  /** Get current project status */
  getStatus(): Promise<StatusInfo>;

  /** Run a full layer cycle (spawn, execute, validate, route) */
  runLayerCycle(agentExecutor: AgentExecutor): Promise<RunResult>;

  /** Run L8 build scoped to a single epic, then L9 review */
  runEpicCycle(agentExecutor: AgentExecutor, epicName: string): Promise<RunResult>;

  /** Get list of epics from L4 artifacts */
  getEpicList(): Promise<string[]>;

  /** Run the full project through all layers */
  runProject(agentExecutor: AgentExecutor): Promise<RunResult>;
}

// --- ParallelExecutor ---

export interface ParallelExecutorOptions {
  concurrency?: number;
}

export declare class ParallelExecutor {
  constructor(ralph: Ralph, agentExecutor: AgentExecutor, options?: ParallelExecutorOptions);
  runEpics(epics: string[]): Promise<Record<string, RunResult>>;
}

// --- Config ---

export interface RalphConfig {
  tier?: string;
  timeout?: number;
  concurrency?: number;
  autoApproveGates?: boolean;
  webhookUrl?: string;
  maxRetries?: number;
  [key: string]: unknown;
}

export declare function loadConfig(projectRoot: string): Promise<RalphConfig>;

// --- Example Plugins ---

export interface LoggerPluginOptions {
  filePath?: string;
  timestamps?: boolean;
  verbose?: boolean;
}

export declare function createLoggerPlugin(options?: LoggerPluginOptions): Plugin & { _buffer: string[] };
export declare function createMetricsPlugin(): Plugin & {
  getReport(): {
    layers: Record<string, {
      starts: number;
      ends: number;
      totalDurationMs: number;
      passes: number;
      iterates: number;
      errors: number;
    }>;
    global: {
      totalStarts: number;
      totalEnds: number;
      totalSpawns: number;
      totalVerdicts: number;
      totalPasses: number;
      totalIterates: number;
      totalErrors: number;
    };
    spawnsByAgent: Record<string, number>;
    errorsByType: Record<string, number>;
    passRate: number | null;
  };
  reset(): void;
};
