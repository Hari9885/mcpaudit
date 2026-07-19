import type { JsonSchema } from "./types.js";

const PRIMITIVE = new Set(["string", "number", "integer", "boolean"]);

export function dummyInput(schema?: JsonSchema):
  { ok: true; value: Record<string, unknown> } | { ok: false; reason: string } {
  if (!schema || !schema.properties) return { ok: true, value: {} };
  const value: Record<string, unknown> = {};
  const required = new Set(schema.required ?? []);
  for (const [key, prop] of Object.entries(schema.properties)) {
    const p = prop as JsonSchema & { $ref?: unknown; oneOf?: unknown; anyOf?: unknown; allOf?: unknown };
    if (p.$ref || p.oneOf || p.anyOf || p.allOf)
      return { ok: false, reason: "complex schema (ref/oneOf/anyOf)" };
    const t = p.type;
    if (t === "object") return { ok: false, reason: "nested object schema" };
    if (t === "array") {
      const it = p.items?.type;
      if (it && !PRIMITIVE.has(it)) return { ok: false, reason: "array of non-primitives" };
      if (required.has(key)) value[key] = it ? [sample(it)] : [];
      continue;
    }
    if (t && !PRIMITIVE.has(t)) return { ok: false, reason: `unsupported type ${t}` };
    if (required.has(key)) value[key] = sample(t ?? "string");
  }
  return { ok: true, value };
}

function sample(type: string): unknown {
  switch (type) {
    case "number": case "integer": return 1;
    case "boolean": return true;
    default: return "test";
  }
}
