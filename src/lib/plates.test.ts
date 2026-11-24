import { describe, expect, it } from "vitest";
import { normalizarPlacaLeida, placasCoinciden } from "./plates";

describe("placasCoinciden", () => {
  it("iguales", () => expect(placasCoinciden("TXA4821", "TXA4821")).toBe(true));
  it("con guion y minúsculas", () => expect(placasCoinciden("TXA4821", "txa-48-21")).toBe(true));
  it("S leída como 5", () => expect(placasCoinciden("TSA4821", "T5A4821")).toBe(true));
  it("0 leído como O", () => expect(placasCoinciden("TXA4021", "TXA4O21")).toBe(true));
  it("un carácter de menos", () => expect(placasCoinciden("TXA4821", "TXA482")).toBe(true));
  it("distintas", () => expect(placasCoinciden("TXA4821", "PUE9937")).toBe(false));
  it("dos caracteres distintos", () => expect(placasCoinciden("TXA4821", "TXA4899")).toBe(false));
  it("vacías", () => {
    expect(placasCoinciden("", "")).toBe(false);
    expect(placasCoinciden("TXA4821", "")).toBe(false);
    expect(placasCoinciden("TXA4821", "--")).toBe(false);
  });
});

describe("normalizarPlacaLeida", () => {
  it("deja solo A-Z0-9", () => expect(normalizarPlacaLeida(" txa-48 21. ")).toBe("TXA4821"));
});
