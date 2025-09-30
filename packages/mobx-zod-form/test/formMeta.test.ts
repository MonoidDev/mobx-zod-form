import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  decodeResultIsSuccessfulAnd,
  getDecodeResultOr,
  MobxZodForm,
} from "../src";

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

    const labeledAndOptional = z
      .number()
      .formMeta({ label: "optional" })
      .optional();

    expect(labeledAndOptional.getFormMeta().label).toBe("optional");

    const labeledAndNullable = z
      .number()
      .formMeta({ label: "nullable" })
      .nullable();

    expect(labeledAndNullable.getFormMeta().label).toBe("nullable");

    const labeledAndEffects = z
      .number()
      .formMeta({ label: "transformed" })
      .transform((x) => x + 1);

    expect(labeledAndEffects.getFormMeta().label).toBe("transformed");

    const labeledAndEffectsAndLabeled = z
      .number()
      .formMeta({ label: "transformed" })
      .transform((x) => x + 1)
      .formMeta({ label: "transformed2" });

    expect(labeledAndEffectsAndLabeled.getFormMeta().label).toBe(
      "transformed2",
    );

    const refinedAndLabeled = z
      .string()
      .refine((x) => x.length > 1, "length > 1")
      .formMeta({ label: "transformed2" });

    expect(refinedAndLabeled.getFormMeta().label).toBe("transformed2");
    expect(refinedAndLabeled.innerType().getFormMeta().label).toBe(
      "transformed2",
    );

    const labelShorthand = z.string().label("label");

    expect(labelShorthand.getFormMeta().label).toBe("label");

    const nullableAndUnwrap = z.string().nullable().label("label").unwrap();
    expect(nullableAndUnwrap.getFormMeta().label).toBe("label");
  });

  it("get initial output correctly", () => {
    expect(z.string().getFormMeta().getInitialOutput()).toBe("");
    expect(z.number().getFormMeta().getInitialOutput()).toBe(undefined);
    expect(z.boolean().getFormMeta().getInitialOutput()).toBe(false);
    expect(z.enum(["cn", "jp"]).getFormMeta().getInitialOutput()).toBe("cn");
    expect(z.literal("141").getFormMeta().getInitialOutput()).toBe("141");
    expect(z.any().getFormMeta().getInitialOutput()).toBe(undefined);
    expect(z.undefined().getFormMeta().getInitialOutput()).toBe(undefined);
    expect(z.null().getFormMeta().getInitialOutput()).toBe(null);
    expect(z.date().getFormMeta().getInitialOutput()).toBe(undefined);

    // Should respect user getInitialOutput
    expect(
      z
        .enum(["cn", "jp"])
        .formMeta({
          getInitialOutput() {
            return "jp";
          },
        })
        .getFormMeta()
        .getInitialOutput(),
    ).toBe("jp");
  });
});

describe("DecodeResult utility functions", () => {
  it("decodeResultIsSuccessfulAnd", () => {
    expect(
      decodeResultIsSuccessfulAnd(
        { success: true, data: 1 },
        (d: number) => d < 42,
      ),
    ).toBe(true);

    expect(
      decodeResultIsSuccessfulAnd(
        { success: false, input: 1 },
        (d: number) => d < 42,
      ),
    ).toBe(false);

    expect(
      decodeResultIsSuccessfulAnd(
        { success: true, data: 1 },
        (d: number) => d >= 42,
      ),
    ).toBe(false);

    expect(
      decodeResultIsSuccessfulAnd(
        { success: false, input: 1 },
        (d: number) => d >= 42,
      ),
    ).toBe(false);
  });

  it("getDecodeResultOr", () => {
    expect(
      getDecodeResultOr(
        {
          success: true,
          data: ["a"],
        },
        [],
      ),
    );
  });
});

describe("DecodeResult utility functions by field methods", () => {
  it("unwrapDecodeResult - successful decode", () => {
    const form = new MobxZodForm(z.object({ age: z.number() }));
    form.root.fields.age.setRawInput("25");

    const result = form.root.fields.age.unwrapDecodeResult();
    expect(result).toBe(25);
  });

  it("unwrapDecodeResult - failed decode throws error", () => {
    const form = new MobxZodForm(z.object({ age: z.number() }));
    form.root.fields.age.setRawInput("invalid");

    expect(() => form.root.fields.age.unwrapDecodeResult()).toThrow();
  });

  it("mapDecodeResult - successful decode", () => {
    const form = new MobxZodForm(z.object({ age: z.number() }));
    form.root.fields.age.setRawInput("25");

    const result = form.root.fields.age.mapDecodeResult((age) => age * 2, -1);
    expect(result).toBe(50);
  });

  it("mapDecodeResult - failed decode returns default", () => {
    const form = new MobxZodForm(z.object({ age: z.number() }));
    form.root.fields.age.setRawInput("invalid");

    const result = form.root.fields.age.mapDecodeResult((age) => age * 2, -1);
    expect(result).toBe(-1);
  });

  it("decodeResultIsSuccessfulAnd - with predicate", () => {
    const form = new MobxZodForm(z.object({ age: z.number() }));
    form.root.fields.age.setRawInput("25");

    expect(
      form.root.fields.age.decodeResultIsSuccessfulAnd((age) => age > 18),
    ).toBe(true);
    expect(
      form.root.fields.age.decodeResultIsSuccessfulAnd((age) => age > 30),
    ).toBe(false);
  });

  it("decodeResultIsSuccessfulAnd - failed decode", () => {
    const form = new MobxZodForm(z.object({ age: z.number() }));
    form.root.fields.age.setRawInput("invalid");

    expect(
      form.root.fields.age.decodeResultIsSuccessfulAnd((age) => age > 0),
    ).toBe(false);
  });

  it("getDecodeResult - successful decode", () => {
    const form = new MobxZodForm(z.object({ name: z.string() }));
    form.root.fields.name.setRawInput("John");

    expect(form.root.fields.name.getDecodeResult()).toBe("John");
  });

  it("getDecodeResult - failed decode returns undefined", () => {
    const form = new MobxZodForm(z.object({ age: z.number() }));
    form.root.fields.age.setRawInput("invalid");

    expect(form.root.fields.age.getDecodeResult()).toBeUndefined();
  });

  it("getDecodeResultOr - successful decode", () => {
    const form = new MobxZodForm(z.object({ count: z.number() }));
    form.root.fields.count.setRawInput("10");

    expect(form.root.fields.count.getDecodeResultOr(0)).toBe(10);
  });

  it("getDecodeResultOr - failed decode returns default", () => {
    const form = new MobxZodForm(z.object({ count: z.number() }));
    form.root.fields.count.setRawInput("invalid");

    expect(form.root.fields.count.getDecodeResultOr(0)).toBe(0);
  });

  it("decodeResultEqual - successful decode with match", () => {
    const form = new MobxZodForm(z.object({ status: z.string() }));
    form.root.fields.status.setRawInput("active");

    expect(form.root.fields.status.decodeResultEqual("active")).toBe(true);
    expect(form.root.fields.status.decodeResultEqual("inactive")).toBe(false);
  });

  it("decodeResultEqual - failed decode returns default", () => {
    const form = new MobxZodForm(z.object({ age: z.number() }));
    form.root.fields.age.setRawInput("invalid");

    expect(form.root.fields.age.decodeResultEqual(25)).toBe(false);
    expect(form.root.fields.age.decodeResultEqual(25, true)).toBe(true);
  });

  it("field methods work with optional fields", () => {
    const form = new MobxZodForm(z.object({ age: z.number().optional() }));

    // Test with valid number
    form.root.fields.age.setRawInput("30");
    expect(form.root.fields.age.unwrapDecodeResult()).toBe(30);
    expect(form.root.fields.age.getDecodeResult()).toBe(30);
    expect(form.root.fields.age.decodeResultEqual(30)).toBe(true);

    // Test with undefined (empty string for optional number)
    form.root.fields.age.setRawInput("");
    expect(form.root.fields.age.unwrapDecodeResult()).toBeUndefined();
    expect(form.root.fields.age.getDecodeResult()).toBeUndefined();
    expect(form.root.fields.age.getDecodeResultOr(100)).toBeUndefined();
  });

  it("field methods work with nullable fields", () => {
    const form = new MobxZodForm(z.object({ name: z.string().nullable() }));

    // Test with valid string
    form.root.fields.name.setRawInput("Alice");
    expect(form.root.fields.name.unwrapDecodeResult()).toBe("Alice");
    expect(
      form.root.fields.name.mapDecodeResult((s) => s?.toUpperCase(), "DEFAULT"),
    ).toBe("ALICE");

    // Test with null (empty string for nullable string)
    form.root.fields.name.setRawInput("");
    expect(form.root.fields.name.unwrapDecodeResult()).toBeNull();
    expect(form.root.fields.name.getDecodeResult()).toBeNull();
    expect(form.root.fields.name.decodeResultEqual(null)).toBe(true);
  });

  it("field methods work with nested object fields", () => {
    const form = new MobxZodForm(
      z.object({
        user: z.object({
          age: z.number(),
          name: z.string(),
        }),
      }),
    );

    form.root.fields.user.fields.age.setRawInput("42");
    form.root.fields.user.fields.name.setRawInput("Bob");

    expect(form.root.fields.user.fields.age.unwrapDecodeResult()).toBe(42);
    expect(form.root.fields.user.fields.name.getDecodeResult()).toBe("Bob");
    expect(
      form.root.fields.user.fields.age.decodeResultIsSuccessfulAnd(
        (age) => age > 40,
      ),
    ).toBe(true);
    expect(
      form.root.fields.user.fields.name.mapDecodeResult((n) => n.length, 0),
    ).toBe(3);
  });

  it("field methods work with array fields", () => {
    const form = new MobxZodForm(
      z.object({
        items: z.array(z.number()),
      }),
    );

    form.root.fields.items.push(10, 20, 30);

    expect(form.root.fields.items.elements[0].unwrapDecodeResult()).toBe(10);
    expect(form.root.fields.items.elements[1].getDecodeResult()).toBe(20);
    expect(form.root.fields.items.elements[2].decodeResultEqual(30)).toBe(true);
    expect(
      form.root.fields.items.elements[0].mapDecodeResult((n) => n * 2, 0),
    ).toBe(20);
  });
});
