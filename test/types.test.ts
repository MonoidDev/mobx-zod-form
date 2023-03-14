import { describe, expect, it } from "vitest";
import { z } from "zod";

import { resolveDOMMobxZodMeta, MobxZodObjectField } from "../src";

let TYPE_TESTS = false;

TYPE_TESTS &&
  describe("type tests", () => {
    it("should get fields", () => {
      const schema = z.object({
        a: z.string(),
        b: z.number(),
        deep: z.object({
          c: z.string(),
        }),
      });

      const o: MobxZodObjectField<typeof schema> = {} as any;

      const _shouldGetStringField: (typeof o.fields.a)["type"] = z.string();

      const _shouldGetNumberField: (typeof o.fields.b)["type"] = z.number();

      const _shouldGetDeepStringField: (typeof o.fields.deep.fields.c)["type"] =
        z.string();
    });

    it("should extend zod", () => {
      const schema = z.object({ a: z.number().mobxMeta({ label: "label" }) });

      const _shouldGetString: string = schema.shape.a._mobxMeta.label;

      const schema2 = schema.shape.a.mobxMeta({ description: "description" });

      const _shouldGetString2: string = schema2._mobxMeta.description;
      const _shouldGetString3: string = schema2._mobxMeta.label;
    });
  });

describe("field tests", () => {
  it("should decode values", () => {
    const schema = z.object({
      string: z.string(),
      number: z.number(),
    });

    expect(resolveDOMMobxZodMeta(schema.shape.string).decode("string")).toBe(
      "string"
    );
    // Wrong input should be passed as-is, for zod to throw an error.
    expect(resolveDOMMobxZodMeta(schema.shape.string).decode(12345)).toBe(
      12345
    );

    expect(resolveDOMMobxZodMeta(schema.shape.number).decode("12345")).toBe(
      12345
    );
    expect(resolveDOMMobxZodMeta(schema.shape.number).decode("x")).toBe("x");

    expect(
      resolveDOMMobxZodMeta(schema).decode({
        string: "string",
        number: "12345",
      })
    ).toMatchObject({
      string: "string",
      number: 12345,
    });

    const array = schema.array();

    expect(
      resolveDOMMobxZodMeta(array).decode([
        { string: "string", number: "12345" },
      ])
    ).toMatchObject([
      {
        string: "string",
        number: 12345,
      },
    ]);

    expect(resolveDOMMobxZodMeta(array).decode("not-an-array")).toBe(
      "not-an-array"
    );
  });

  it("should encode values", () => {
    expect(resolveDOMMobxZodMeta(z.number()).encode(12345)).toBe("12345");
    expect(resolveDOMMobxZodMeta(z.number()).encode(undefined)).toBe("");

    expect(resolveDOMMobxZodMeta(z.string()).encode("12345")).toBe("12345");

    expect(resolveDOMMobxZodMeta(z.boolean()).encode(true)).toBe(true);

    expect(
      resolveDOMMobxZodMeta(z.number().array()).encode([1, 2, 3])
    ).toMatchObject(["1", "2", "3"]);

    expect(
      resolveDOMMobxZodMeta(z.string().array()).encode(["1", "2", "3", ""])
    ).toMatchObject(["1", "2", "3", ""]);
  });

  it("should get initial output", () => {
    expect(resolveDOMMobxZodMeta(z.string()).getInitialOutput()).toBe("");

    expect(resolveDOMMobxZodMeta(z.number()).getInitialOutput()).toBe(
      undefined
    );

    expect(
      resolveDOMMobxZodMeta(
        z.object({ a: z.string(), b: z.number(), c: z.array(z.number()) })
      ).getInitialOutput()
    ).toMatchObject({
      a: "",
      b: undefined,
      c: [],
    });
  });
});
