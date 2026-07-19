export type Category = "conf" | "sec" | "qual";
export type Severity = "error" | "warn" | "info";

export interface ToolInfo {
  name: string;
  description?: string;
  inputSchema?: JsonSchema;
  annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean; [k: string]: unknown };
}
export interface ResourceInfo { uri: string; name?: string; description?: string; }
export interface PromptInfo { name: string; description?: string; }

export interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  [k: string]: unknown;
}

export interface ProbeResult {
  tool: string;
  probed: boolean;
  skippedReason?: string;
  validCall?: { ok: boolean; error?: string; bytes?: number; ms?: number; text?: string };
  invalidCall?: { ok: boolean; jsonRpcError: boolean; crashed: boolean; ms?: number };
}

export interface AuditSnapshot {
  server: { name?: string; version?: string };
  protocolVersion?: string;
  handshakeOk: boolean;
  handshakeError?: string;
  declaredCapabilities: Record<string, unknown>;
  tools: ToolInfo[];
  resources: ResourceInfo[];
  prompts: PromptInfo[];
  probes: ProbeResult[];
}

export interface Finding {
  ruleId: string;
  category: Category;
  severity: Severity;
  message: string;
  target?: string;
  evidence?: string;
}

export interface Report {
  snapshot: AuditSnapshot;
  findings: Finding[];
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  patternPackVersion?: string;
  patternPackUpdated?: string;
}
