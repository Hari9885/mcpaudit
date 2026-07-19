import type { Report } from "./types.js";
import { collect } from "./collector.js";
import { runStructural } from "./rules/structural.js";
import { loadPack, runPatterns } from "./rules/patterns.js";
import { probe, runProbeRules } from "./prober.js";
import { score } from "./scorer.js";

export interface AuditOpts { timeout: number; probe: boolean; probeUnsafe: boolean; }

export async function audit(command: string, opts: AuditOpts): Promise<Report> {
  const pack = loadPack();
  const { snapshot, client, close } = await collect(command, { timeout: opts.timeout });

  const findings = [...runStructural(snapshot)];
  if (snapshot.handshakeOk) {
    findings.push(...runPatterns(snapshot, pack));
    if (opts.probe && client) {
      snapshot.probes = await probe(client, snapshot, { probeUnsafe: opts.probeUnsafe, timeout: opts.timeout });
      findings.push(...runProbeRules(snapshot, pack));
    }
  }
  await close?.();

  const { score: s, grade } = score(findings);
  return { snapshot, findings, score: s, grade, patternPackVersion: pack.version, patternPackUpdated: pack.updated };
}
