import { describe, expect, expectTypeOf, it } from "vitest";
import { z, ZodError, ZodNumber, ZodString } from "zod";

import { setup } from "./utils";
import {
  resolveDOMFormMeta,
  MobxZodObjectField,
  empty,
  partial,
  MobxZodField,
} from "../src";
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
        optionalNumber: z.number().optional(),
        transformEffects: z.string().transform((s) => s.length),
        transformEffects2: z
          .string()
          .transform((s) => s.length)
          .transform((l) => l > 5),
        boxed: z
          .object({
            field1: z.string(),
            field2: z.string(),
          })
          .box(),
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

      expectTypeOf(o.fields.optional.innerField).toEqualTypeOf<
        MobxZodField<ZodString>
      >();

      expectTypeOf(o.fields.optionalNumber.innerField).toEqualTypeOf<
        MobxZodField<ZodNumber>
      >();

      const _transformEffects: z.ZodEffects<z.ZodString, number, string> =
        o.fields.transformEffects.effects;

      const _transformEffects2: z.ZodEffects<z.ZodString, number, string> =
        o.fields.transformEffects.effects;

      const _box: ReturnType<typeof o.fields.boxed.type.innerType> = z.object({
        field1: z.string(),
        field2: z.string(),
      });
    });

    it("should extend zod", () => {
      const schema = z.object({ a: z.number().formMeta({ label: "label" }) });

      const _shouldGetString: string | undefined =
        schema.shape.a._formMeta.label;

      const schema2 = schema.shape.a.formMeta({ description: "description" });

      const _shouldGetString2: string | undefined =
        schema2._formMeta.description;
      const _shouldGetString3: string | undefined = schema2._formMeta.label;

      const boxed = z.object({}).box();
      const _inner: typeof boxed._def.schema = z.object({});
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

    expect(schema.shape.string.getFormMeta().decode("string")).toBe("string");

    expect(schema.shape.string.getFormMeta().safeDecode(12345)).toMatchObject({
      success: false,
      input: 12345,
    });

    expect(schema.shape.number.getFormMeta().decode("12345")).toBe(12345);
    expect(
      schema.shape.number.getFormMeta().safeDecode("", true),
    ).toMatchObject({
      success: true,
      data: undefined,
    });
    expect(schema.shape.number.getFormMeta().safeDecode("x")).toMatchObject({
      success: false,
      input: "x",
    });
    expect(
      schema.shape.number.getFormMeta().safeDecode("114514x"),
    ).toMatchObject({
      success: false,
      input: "114514x",
    });

    expect(
      schema.getFormMeta().decode({
        string: "string",
        number: "12345",
      }),
    ).toMatchObject({
      string: "string",
      number: 12345,
    });

    const array = schema.array();

    expect(
      array.getFormMeta().decode([{ string: "string", number: "12345" }]),
    ).toMatchObject([{ string: "string", number: 12345 }]);

    expect(array.getFormMeta().safeDecode("not-an-array")).toMatchObject({
      success: false,
      input: "not-an-array",
    });

    expect(z.string().nullable().getFormMeta().decode("")).toBe(null);
    expect(z.string().nullable().getFormMeta().decode(null)).toBe(null);
    expect(z.string().nullable().getFormMeta().decode(undefined)).toBe(null);
    expect(
      z
        .object({
          name: z.string(),
          url: z.string(),
        })
        .optional()
        .nullable()
        .getFormMeta()
        .encode({
          name: "name",
          url: "url",
        }),
    ).toMatchObject({
      name: "name",
      url: "url",
    });

    expect(z.enum(["A", "B"]).getFormMeta().safeDecode("A")).toMatchObject({
      success: true,
      data: "A",
    });

    expect(z.enum(["A", "B"]).getFormMeta().safeDecode("C")).toMatchObject({
      success: false,
      input: "C",
    });

    // Should decode boxed
    expect(
      z.object({ a: z.number() }).box().getFormMeta().safeDecode({ a: 1 }),
    ).toMatchObject({
      success: true,
      data: { a: 1 },
    });

    // Should decode bad boxed
    expect(
      z.object({ a: z.number() }).box().getFormMeta().safeDecode(undefined),
    ).toMatchObject({
      data: undefined,
      success: true,
    });

    // Should decode type we don't handle yet
    expect(
      z.record(z.string(), z.number()).box().getFormMeta().safeDecode({
        a: 1,
      }),
    ).toMatchObject({
      data: {
        a: 1,
      },
      success: true,
    });
  });

  it("should encode values", () => {
    // ZodString
    expect(z.string().getFormMeta().encode("12345")).toBe("12345");

    // ZodNumber
    expect(z.number().getFormMeta().encode(12345)).toBe("12345");
    expect(z.number().getFormMeta().encode(undefined)).toBe("");

    // ZodBoolean
    expect(z.boolean().getFormMeta().encode(empty)).toBe(undefined);
    expect(z.boolean().getFormMeta().encode(true)).toBe(true);
    expect(z.boolean().getFormMeta().encode(false)).toBe(false);

    // ZodEnum
    expect(z.enum(["A", "B"]).getFormMeta().encode(empty)).toBe(undefined);
    expect(z.enum(["A", "B"]).getFormMeta().encode("A")).toMatchObject("A");

    // ZodOptional
    expect(z.string().optional().getFormMeta().encode(empty)).toBe("");
    expect(z.string().optional().getFormMeta().encode(null)).toBe("");
    expect(z.string().optional().getFormMeta().encode(undefined)).toBe("");

    // ZodNullable
    expect(z.string().nullable().getFormMeta().encode(empty)).toBe("");
    expect(z.string().nullable().getFormMeta().encode(null)).toBe("");
    expect(z.string().nullable().getFormMeta().encode(undefined)).toBe("");

    // ZodArray
    expect(z.number().array().getFormMeta().encode([1, 2, 3])).toMatchObject([
      "1",
      "2",
      "3",
    ]);

    expect(
      z.string().array().getFormMeta().encode(["1", "2", "3", ""]),
    ).toMatchObject(["1", "2", "3", ""]);

    expect(z.number().array().getFormMeta().encode(empty)).toMatchObject([]);

    expect(
      z
        .discriminatedUnion("answer", [
          z.object({
            answer: z.literal("OK"),
          }),
          z.object({
            answer: z.literal("NO"),
            reason: z.string().min(1),
          }),
        ])
        .getFormMeta()
        .encode(empty),
    ).toMatchObject({
      answer: "OK",
    });

    expect(
      z
        .discriminatedUnion("answer", [
          z.object({
            answer: z.literal("OK"),
          }),
          z.object({
            answer: z.literal("NO"),
            reason: z.string().min(1),
          }),
        ])
        .getFormMeta()
        .encode({
          answer: "OK",
        }),
    ).toMatchObject({
      answer: "OK",
    });

    expect(
      z
        .discriminatedUnion("answer", [
          z.object({
            answer: z.literal("OK"),
          }),
          z.object({
            answer: z.literal("NO"),
            reason: z.string().min(1),
          }),
        ])
        .getFormMeta()
        .encode({
          answer: "NO",
          reason: "no comments",
        }),
    ).toMatchObject({
      answer: "NO",
      reason: "no comments",
    });

    // ZodEffects
    expect(
      z
        .number()
        .transform((x) => String(x))
        .getFormMeta()
        .encode(123),
    ).toMatchObject("123");

    // Should recursively find the sourceType
    expect(
      z
        .number()
        .transform((x) => String(x))
        .transform((x) => x.length)
        .getFormMeta()
        .encode(123),
    ).toMatchObject("123");

    // Should pass through nullable and optional
    expect(
      z
        .object({
          a: z.string(),
          b: z.string(),
        })
        .nullable()
        .optional()
        .getFormMeta()
        .encode({ a: "a", b: "b" }),
    ).toMatchObject({ a: "a", b: "b" });

    // partial
    expect(
      z
        .object({
          a: z.string(),
          b: z.string(),
        })
        .getFormMeta()
        .encode(
          partial({
            a: "a",
          }),
        ),
    ).toMatchObject({ a: "a", b: "" });

    expect(
      z
        .object({
          a: z.enum(["A", "B"]),
          b: z.enum(["C", "D"]),
        })
        .getFormMeta()
        .encode(partial({ b: "C" })),
    ).toMatchObject({ a: "A", b: "C" });
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

  it("should parse input", () => {
    // MobxZodBox
    const boxedString = z.string().box();

    expect(boxedString.parse("1234")).toBe("1234");

    const boxedObject = z.object({ a: z.string() }).box();

    expect(boxedObject.parse({ a: "1234" })).toMatchObject({ a: "1234" });
  });
});
