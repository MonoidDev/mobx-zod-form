import { describe, expect, it } from "vitest";
import { z, ZodError } from "zod";

import { setup } from "./utils";
import { resolveDOMFormMeta, MobxZodObjectField, empty } from "../src";
import { MobxZodForm } from "../src/MobxZodForm";
import { discriminatorType } from "../src/zod-extra";

setup();

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
        literalString: z.literal("literalString"),
        enum: z.enum(["A", "B", "C"]),
        nullable: z.string().nullable(),
        optional: z.string().optional(),
      });

      const o: MobxZodObjectField<typeof schema> = {} as any;

      const _shouldGetStringField: typeof o.fields.a.type = z.string();

      const _shouldGetNumberField: typeof o.fields.b.type = z.number();

      const _shouldGetDeepStringField: typeof o.fields.deep.fields.c.type =
        z.string();

      const _shouldGetLiteralString: typeof o.fields.literalString.type =
        z.literal("literalString");

      const _shouldGetEnum: typeof o.fields.enum.type = z.enum(["A", "B", "C"]);

      const _shouldGetNullable: typeof o.fields.nullable.type = z
        .string()
        .nullable();

      const _shouldGetOptional: typeof o.fields.optional.type = z
        .string()
        .optional();
    });

    it("should extend zod", () => {
      const schema = z.object({ a: z.number().formMeta({ label: "label" }) });

      const _shouldGetString: string | undefined =
        schema.shape.a._formMeta.label;

      const schema2 = schema.shape.a.formMeta({ description: "description" });

      const _shouldGetString2: string | undefined =
        schema2._formMeta.description;
      const _shouldGetString3: string | undefined = schema2._formMeta.label;
    });

    it("should create discriminated union", () => {
      const ZodUnion = z.discriminatedUnion("tag", [
        z.object({ tag: z.literal("A"), weeks: z.number() }),
        z.object({ tag: z.literal("B"), months: z.number() }),
      ]);

      type ZodUnion = typeof ZodUnion;

      type ZodUnionTag = ZodUnion["options"][number]["shape"]["tag"]["_output"];

      const _zodUnionTag: ZodUnionTag = Math.random() < 0.5 ? "A" : "B";

      const stringUnionForm = new MobxZodForm(
        z.discriminatedUnion("tag", [
          z.object({ tag: z.literal("A"), weeks: z.number() }),
          z.object({ tag: z.literal("B"), months: z.number() }),
        ]),
      );

      const _getStringUnionDiscriminator: "A" | "B" =
        stringUnionForm.root._types._discriminatorOutput;

      const stringUnionFieldsResult = stringUnionForm.root.fieldsResult;

      if (stringUnionFieldsResult.success === false) {
        const _getZodError: ZodError = stringUnionFieldsResult.error;
      }

      if (
        stringUnionFieldsResult.success === true &&
        stringUnionFieldsResult.fields.discriminator === "A"
      ) {
        const _getNumber: number =
          stringUnionFieldsResult.fields.weeks.type["_output"];
      }

      if (
        stringUnionFieldsResult.success === true &&
        stringUnionFieldsResult.fields.discriminator === "B"
      ) {
        const _getNumber: number =
          stringUnionFieldsResult.fields.months.type["_output"];
      }

      const booleanUnionForm = new MobxZodForm(
        z.discriminatedUnion("success", [
          z.object({ success: z.literal(true), weeks: z.number() }),
          z.object({ success: z.literal(false), months: z.number() }),
        ]),
      );

      const _getBooleanUnionDiscriminator: true | false =
        booleanUnionForm.root._types._discriminatorOutput;

      const stringUnionDiscriminatorType = discriminatorType(
        stringUnionForm.root.type,
      );

      const _getStringUnionDiscriminator2: "A" | "B" =
        stringUnionDiscriminatorType._output;
    });
  });

describe("field tests", () => {
  it("should decode values", () => {
    const schema = z.object({
      string: z.string(),
      number: z.number(),
    });

    expect(resolveDOMFormMeta(schema.shape.string).decode("string")).toBe(
      "string",
    );
    // Wrong input should be passed as-is, for zod to throw an error.
    expect(resolveDOMFormMeta(schema.shape.string).decode(12345)).toBe(12345);

    expect(resolveDOMFormMeta(schema.shape.number).decode("12345")).toBe(12345);
    expect(resolveDOMFormMeta(schema.shape.number).decode("x")).toBe("x");

    expect(
      resolveDOMFormMeta(schema).decode({
        string: "string",
        number: "12345",
      }),
    ).toMatchObject({
      string: "string",
      number: 12345,
    });

    const array = schema.array();

    expect(
      resolveDOMFormMeta(array).decode([{ string: "string", number: "12345" }]),
    ).toMatchObject([
      {
        string: "string",
        number: 12345,
      },
    ]);

    expect(resolveDOMFormMeta(array).decode("not-an-array")).toBe(
      "not-an-array",
    );

    expect(resolveDOMFormMeta(z.string().nullable()).decode("")).toBe(null);
    expect(resolveDOMFormMeta(z.string().nullable()).decode(null)).toBe(null);
    expect(resolveDOMFormMeta(z.string().nullable()).decode(undefined)).toBe(
      null,
    );
    expect(
      resolveDOMFormMeta(
        z
          .object({
            name: z.string(),
            url: z.string(),
          })
          .optional()
          .nullable(),
      ).encode({
        name: "name",
        url: "url",
      }),
    ).toMatchObject({
      name: "name",
      url: "url",
    });
  });

  it("should encode values", () => {
    expect(resolveDOMFormMeta(z.number()).encode(12345)).toBe("12345");
    expect(resolveDOMFormMeta(z.number()).encode(undefined)).toBe("");

    expect(resolveDOMFormMeta(z.string()).encode("12345")).toBe("12345");

    expect(resolveDOMFormMeta(z.boolean()).encode(true)).toBe(true);

    expect(
      resolveDOMFormMeta(z.number().array()).encode([1, 2, 3]),
    ).toMatchObject(["1", "2", "3"]);

    expect(
      resolveDOMFormMeta(z.string().array()).encode(["1", "2", "3", ""]),
    ).toMatchObject(["1", "2", "3", ""]);

    expect(resolveDOMFormMeta(z.string().nullable()).encode(empty)).toBe(null);
  });

  it("should get initial output", () => {
    expect(resolveDOMFormMeta(z.string()).getInitialOutput()).toBe("");

    expect(resolveDOMFormMeta(z.number()).getInitialOutput()).toBe(undefined);

    expect(
      resolveDOMFormMeta(
        z.object({ a: z.string(), b: z.number(), c: z.array(z.number()) }),
      ).getInitialOutput(),
    ).toMatchObject({
      a: "",
      b: undefined,
      c: [],
    });
  });
});
