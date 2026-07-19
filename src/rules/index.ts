import type { AuditSnapshot, Finding } from "../types.js";
import { runStructural } from "./structural.js";
export type Rule = (s: AuditSnapshot) => Finding[];
export { runStructural };
