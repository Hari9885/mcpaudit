import type { Report } from "./types.js";
import type { Target } from "./connector.js";
import { collect } from "./collector.js";
import { runStructural } from "./rules/structural.js";
import { loadPack, runPatterns } from "./rules/patterns.js";
import { probe, runProbeRules } from "./prober.js";
import { score } from "./scorer.js";

export interface AuditOpts { timeout: number; probe: boolean; probeUnsafe: boolean; }

export async function audit(target: string | Target, opts: AuditOpts): Promise<Report> {
  const pack = loadPack();
  const { snapshot, client, close } = await collect(target, { timeout: opts.timeout });

  const findings = [...runStructural(snapshot)];
  if (snapshot.handshakeOk) {
    findings.push(...runPatterns(snapshot, pack));
    if (opts.probe && client) {
      snapshot.probes = await probe(client, snapshot, { probeUnsafe: opts.probeUnsafe, timeout: opts.timeout });
      findings.push(...runProbeRules(snapshot, pack));
    }
  }
  await close?.();

  // A server we can't even connect to is unauditable — force the worst grade so a dead
  // server can never slip through a --min-score CI gate on a lone conf-01 deduction.
  const { score: s, grade } = snapshot.handshakeOk ? score(findings) : { score: 0, grade: "F" as const };
  return { snapshot, findings, score: s, grade, patternPackVersion: pack.version, patternPackUpdated: pack.updated };
}
