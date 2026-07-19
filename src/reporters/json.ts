import type { Report } from "../types.js";
export const renderJson = (r: Report): string => JSON.stringify(r, null, 2);
