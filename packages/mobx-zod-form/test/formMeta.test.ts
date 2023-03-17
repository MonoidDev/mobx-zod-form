import { describe, expect, it } from "vitest";
import { z } from "zod";

import { setup } from "./utils";

setup();

describe("formMeta tests", () => {
  it("get empty meta", () => {
    const labeled = z.number();
    expect([labeled._formMeta]).toMatchObject([{}]);
  });

  it("record meta", () => {
    const labeled = z.number().formMeta({ label: "label" });
    expect(labeled._formMeta.label).toBe("label");

    const described = labeled.formMeta({ description: "..." });
    expect(described._formMeta.description).toBe("...");

    const labeledAndRefined = z.number().formMeta({ label: "refined" }).min(1);

    expect(labeledAndRefined.getFormMeta().label).toBe("refined");
  });
});
