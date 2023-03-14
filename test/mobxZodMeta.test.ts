import { describe, expect, it } from "vitest";
import { z } from "zod";

import { setup } from "./utils";

setup();

describe("mobxZodMeta tests", () => {
  it("get empty meta", () => {
    const labeled = z.number();
    expect([labeled._mobxMeta]).toMatchObject([{}]);
  });

  it("record meta", () => {
    const labeled = z.number().mobxMeta({ label: "label" });
    expect(labeled._mobxMeta.label).toBe("label");

    const described = labeled.mobxMeta({ description: "..." });
    expect(described._mobxMeta.description).toBe("...");
  });
});
