import { describe, it, expect } from "vitest";
import { dummyInput } from "../src/dummy.js";

describe("dummyInput", () => {
  it("fills flat required primitives", () => {
    const r = dummyInput({ type: "object", properties: { city: { type: "string" }, n: { type: "number" } }, required: ["city", "n"] });
    expect(r.ok).toBe(true);
    if (r.ok) { expect(typeof r.value.city).toBe("string"); expect(typeof r.value.n).toBe("number"); }
  });
  it("rejects nested object schema as complex", () => {
    const r = dummyInput({ type: "object", properties: { addr: { type: "object", properties: { city: { type: "string" } } } }, required: ["addr"] });
    expect(r.ok).toBe(false);
  });
  it("rejects $ref/oneOf/anyOf", () => {
    expect(dummyInput({ type: "object", properties: { x: { anyOf: [{ type: "string" }] } as never }, required: ["x"] }).ok).toBe(false);
  });
  it("no-arg schema yields empty object", () => {
    const r = dummyInput({ type: "object", properties: {} });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({});
  });
});
