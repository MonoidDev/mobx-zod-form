import { runInAction, toJS } from "mobx";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { observeForm } from "./utils";
import { empty, unwrapDecodeResult } from "../src";
import { MobxZodForm } from "../src/MobxZodForm";

describe("form tests", () => {
  it("should observe input", () => {
    const form = new MobxZodForm(
      z.object({
        username: z.string(),
      }),
      {
        setActionOptions: {
          validateSync: true,
        },
      },
    );

    const observeInput = observeForm((observe) => {
      observe(unwrapDecodeResult(form.root.fields.username.decodeResult));
    });

    form.root.fields.username.setRawInput("fuck you");
    form.root.fields.username.setRawInput("leatherman");

    expect(observeInput.observed).toMatchObject(["", "fuck you", "leatherman"]);
  });

  it("should observe issues", () => {
    const form = new MobxZodForm(
      z.object({
        username: z.string().min(1).max(2),
      }),
      {
        setActionOptions: {
          validateSync: true,
        },
      },
    );

    const ob = observeForm((observe) => {
      observe(form.root.fields.username.issues.map((i) => i.message));
    });

    form.root.fields.username.setRawInput("");
    form.root.fields.username.setRawInput("joe");
    form.root.fields.username.setRawInput("ed");

    expect(ob.observed).toMatchObject([
      [],
      ["String must contain at least 1 character(s)"],
      ["String must contain at most 2 character(s)"],
      [],
    ]);
  });

  it("should react only on changing fields", () => {
    const form = new MobxZodForm(
      z.object({
        username: z.string(),
        password: z.string(),
      }),
    );

    const observeUsername = observeForm((ob) => {
      ob(unwrapDecodeResult(form.root.fields.username.decodeResult));
    });

    const observePassword = observeForm((ob) => {
      ob(unwrapDecodeResult(form.root.fields.password.decodeResult));
    });

    form.root.fields.username.setRawInput("hello");
    form.root.fields.username.setRawInput("world");

    form.root.fields.password.setRawInput("qwerty");
    form.root.fields.password.setRawInput("123456");

    form.root.fields.username.setRawInput("joe");

    expect(observeUsername.observed).toMatchObject([
      "",
      "hello",
      "world",
      "joe",
    ]);
    expect(observePassword.observed).toMatchObject(["", "qwerty", "123456"]);
  });

  it("should react only on changing issues", () => {
    const form = new MobxZodForm(
      z.object({
        username: z.string().min(1).max(2),
        password: z.string().min(1).max(2),
      }),
      {
        setActionOptions: {
          validateSync: true,
        },
      },
    );

    const obUsername = observeForm((observe) => {
      observe(form.root.fields.username.errorMessages);
    });

    const obPassword = observeForm((observe) => {
      observe(form.root.fields.password.errorMessages);
    });

    form.root.fields.username.setRawInput("123");
    form.root.fields.username.setRawInput("1234");
    form.root.fields.username.setRawInput("");

    expect(obUsername.observed).toMatchObject([
      [],
      ["String must contain at most 2 character(s)"],
      ["String must contain at least 1 character(s)"],
    ]);

    // Should only react once because the error message doesn't change.
    expect(obPassword.observed).toMatchObject([
      [],
      ["String must contain at least 1 character(s)"],
    ]);
  });

  it("should get referential equal rawInput", () => {
    const form = new MobxZodForm(
      z.object({
        ids: z.array(z.number().min(0)),
      }),
    );

    expect(
      (form.rawInput as any).ids === form.root.fields.ids.rawInput,
    ).toBeTruthy();
  });

  it("should react on array issues", () => {
    const form = new MobxZodForm(
      z.object({
        ids: z.array(z.number().min(0)),
      }),
      {
        setActionOptions: {
          validateSync: true,
        },
      },
    );

    const obIdAt0 = observeForm((observe) => {
      observe(
        form.root.decodeResult.success && form.root.decodeResult.data.ids[0],
      );
    });

    const obIdAt0Issues = observeForm((observe) => {
      observe(form.root.fields.ids.elements[0]?.errorMessages);
    });

    // obIdAt0 reacts
    // obIdAt0Issues reacts because .ids.elements is changed
    form.root.fields.ids.push(-1);
    // obIdAt0, obIdAt0Issues reacts
    form.root.fields.ids.push(-2);

    const fieldAt0 = form.root.fields.ids.elements[0];
    const fieldAt1 = form.root.fields.ids.elements[1];

    const obIdAt1Issues = observeForm((observe) => {
      observe(fieldAt1.errorMessages);
    });

    // obIdAt0, fieldAt1 reacts
    fieldAt1.setOutput(3);

    // obIdAt0 reacts
    // obIdAt0Issues doesn't because elements and error message don't not change
    // obIdAt1Issues doesn't
    fieldAt0.setOutput(-3);

    expect(obIdAt0.observed).toMatchObject([undefined, -1, -1, -1, -3]);

    expect(obIdAt0Issues.observed).toMatchObject([
      undefined,
      ["Number must be greater than or equal to 0"],
      ["Number must be greater than or equal to 0"],
    ]);

    expect(obIdAt1Issues.observed).toMatchObject([
      ["Number must be greater than or equal to 0"],
      [],
    ]);
  });

  it("should push array", () => {
    const form = new MobxZodForm(
      z.object({
        objects: z.array(
          z.object({
            a: z.string().optional(),
            b: z.string(),
          }),
        ),
      }),
      {
        setActionOptions: {
          validateSync: true,
        },
      },
    );

    form.root.fields.objects.push(empty);
  });

  it("should delete arrays in the middle", () => {
    const form = new MobxZodForm(
      z.object({
        ids: z.array(z.number().min(0)),
        objects: z.array(
          z.object({
            a: z.number(),
            b: z.number(),
          }),
        ),
        discriminatedUnions: z
          .discriminatedUnion("tag", [
            z.object({
              tag: z.literal("A"),
            }),
            z.object({
              tag: z.literal("B"),
            }),
          ])
          .array(),
        nestedArray: z.number().array().array(),
      }),
      {
        setActionOptions: {
          validateSync: true,
        },
      },
    );

    form.root.fields.ids.push(1, 2, 3);

    expect(form.root.fields.ids.elements[0].path).toMatchObject(["ids", 0]);
    expect(form.root.fields.ids.elements[1].path).toMatchObject(["ids", 1]);
    expect(form.root.fields.ids.elements[2].path).toMatchObject(["ids", 2]);

    form.root.fields.ids.shift();

    expect(form.root.fields.ids.elements[0].path).toMatchObject(["ids", 0]);
    expect(form.root.fields.ids.elements[1].path).toMatchObject(["ids", 1]);

    form.root.fields.objects.push(
      {
        a: 1,
        b: 2,
      },
      {
        a: 3,
        b: 4,
      },
      {
        a: 5,
        b: 6,
      },
    );

    expect(
      form.root.fields.objects.elements.map((e) => e.fields.a.path),
    ).toMatchObject([
      ["objects", 0, "a"],
      ["objects", 1, "a"],
      ["objects", 2, "a"],
    ]);

    form.root.fields.objects.splice(1, 1, []);

    expect(
      form.root.fields.objects.elements.map((e) => e.fields.a.path),
    ).toMatchObject([
      ["objects", 0, "a"],
      ["objects", 1, "a"],
    ]);

    form.root.fields.discriminatedUnions.push({
      tag: "A",
    });

    form.root.fields.discriminatedUnions.push({
      tag: "B",
    });

    form.root.fields.discriminatedUnions.splice(0, 1, []);

    expect(form.root.fields.discriminatedUnions.decodeResult).toMatchObject({
      success: true,
      data: [{ tag: "B" }],
    });

    expect(
      form.root.fields.discriminatedUnions.elements[0].discriminatorField.path,
    ).toMatchObject(["discriminatedUnions", 0, "tag"]);

    form.root.fields.nestedArray.push([1], [2]);

    form.root.fields.nestedArray.splice(0, 1, []);

    expect(
      form.root.fields.nestedArray.elements[0].elements[0].path,
    ).toMatchObject(["nestedArray", 0, 0]);

    expect(form.root.fields.nestedArray.elements[0].path).toMatchObject([
      "nestedArray",
      0,
    ]);
  });

  it("should react on changes for array.length", () => {
    const form = new MobxZodForm(
      z.object({
        names: z.array(z.string()),
      }),
      {
        setActionOptions: {
          validateSync: true,
        },
      },
    );

    const obLength = observeForm((observe) => {
      observe(form.root.fields.names.length);
    });

    form.root.fields.names.push("alice");
    form.root.fields.names.push("bob");
    form.root.fields.names.push("carl");

    // Shouldn't react, because the computed length is not changed
    form.root.fields.names.elements.at(-1)?.setOutput("changed");

    expect(obLength.observed).toMatchObject([0, 1, 2, 3]);
  });

  it("should change length for array", () => {
    const form = new MobxZodForm(
      z.object({
        ages: z.array(z.number()),
      }),
      {
        setActionOptions: {
          validateSync: true,
        },
      },
    );

    form.root.fields.ages.setOutput([1]);

    expect(form.root.fields.ages.length).toBe(1);

    form.root.fields.ages.setOutput([1, empty]);

    // Even for invalid input, the array should grow on it.
    expect(form.root.fields.ages.length).toBe(2);
  });

  it("should not crash while visiting `innerField`", () => {
    const form = new MobxZodForm(
      z
        .object({
          optional: z.string().optional(),
        })
        .array(),
      {
        initialOutput: [
          {
            optional: "abc",
          },
          {
            optional: "def",
          },
          {
            optional: "efg",
          },
        ],
        setActionOptions: {
          validateSync: true,
        },
      },
    );

    const ob = observeForm((ob) => {
      ob(form.root.elements[0].fields.optional.innerField.rawInput);
    });

    form.root.splice(0, 1, []);

    expect(ob.observed).toMatchObject(["abc", "def"]);
  });

  it("should react on field changes for omittable types", () => {
    const form = new MobxZodForm(
      z.object({
        optional: z
          .object({
            a: z.number(),
          })
          .optional(),
        nullable: z
          .object({
            a: z.number(),
          })
          .optional()
          .nullable(),
      }),
    );

    const obOptional = observeForm((ob) =>
      ob(!!form.root.fields.optional.innerField),
    );
    const obNullable = observeForm((ob) =>
      ob(!!form.root.fields.nullable.innerField),
    );

    form.root.fields.optional.setOutput({
      a: 1,
    });
    form.root.fields.nullable.setOutput({
      a: 2,
    });

    expect(obOptional.observed).toMatchObject([false, true]);
    expect(obNullable.observed).toMatchObject([false, true]);
  });

  it("should not react on field changes for omittable types if the inner type is primitive because they always present", () => {
    const form = new MobxZodForm(
      z.object({
        optionalString: z.string().optional(),
        nullableString: z.string().nullable(),
        optionalNumber: z.number().optional(),
        nullableNumber: z.number().nullable(),
        optionalBoolean: z.boolean().optional(),
        nullableBoolean: z.boolean().nullable(),
        optionalDate: z.date().optional(),
        nullableDate: z.date().nullable(),
        optionalAny: z.any().optional(),
        nullableAny: z.any().nullable(),
        optionalUndefined: z.undefined().optional(),
        nullableUndefined: z.undefined().nullable(),
        optionalNull: z.null().optional(),
        nullableNull: z.null().nullable(),
        optionalEnum: z.enum(["a", "b"]).optional(),
        nullableEnum: z.enum(["a", "b"]).nullable(),
        optionalLiteral: z.literal("test").optional(),
        nullableLiteral: z.literal("test").nullable(),
      }),
    );

    const observers = [
      observeForm((ob) => ob(!!form.root.fields.optionalString.innerField)),
      observeForm((ob) => ob(!!form.root.fields.nullableString.innerField)),
      observeForm((ob) => ob(!!form.root.fields.optionalNumber.innerField)),
      observeForm((ob) => ob(!!form.root.fields.nullableNumber.innerField)),
      observeForm((ob) => ob(!!form.root.fields.optionalBoolean.innerField)),
      observeForm((ob) => ob(!!form.root.fields.nullableBoolean.innerField)),
      observeForm((ob) => ob(!!form.root.fields.optionalDate.innerField)),
      observeForm((ob) => ob(!!form.root.fields.nullableDate.innerField)),
      observeForm((ob) => ob(!!form.root.fields.optionalAny.innerField)),
      observeForm((ob) => ob(!!form.root.fields.nullableAny.innerField)),
      observeForm((ob) => ob(!!form.root.fields.optionalUndefined.innerField)),
      observeForm((ob) => ob(!!form.root.fields.nullableUndefined.innerField)),
      observeForm((ob) => ob(!!form.root.fields.optionalNull.innerField)),
      observeForm((ob) => ob(!!form.root.fields.nullableNull.innerField)),
      observeForm((ob) => ob(!!form.root.fields.optionalEnum.innerField)),
      observeForm((ob) => ob(!!form.root.fields.nullableEnum.innerField)),
      observeForm((ob) => ob(!!form.root.fields.optionalLiteral.innerField)),
      observeForm((ob) => ob(!!form.root.fields.nullableLiteral.innerField)),
    ];

    // Set output values to trigger potential changes
    form.root.fields.optionalString.setOutput("filled");
    form.root.fields.nullableString.setOutput("filled");
    form.root.fields.optionalNumber.setOutput(42);
    form.root.fields.nullableNumber.setOutput(42);
    form.root.fields.optionalBoolean.setOutput(true);
    form.root.fields.nullableBoolean.setOutput(true);
    form.root.fields.optionalDate.setOutput(new Date());
    form.root.fields.nullableDate.setOutput(new Date());
    form.root.fields.optionalAny.setOutput("any");
    form.root.fields.nullableAny.setOutput("any");
    form.root.fields.optionalUndefined.setOutput(undefined);
    form.root.fields.nullableUndefined.setOutput(undefined);
    form.root.fields.optionalNull.setOutput(null);
    form.root.fields.nullableNull.setOutput(null);
    form.root.fields.optionalEnum.setOutput("a");
    form.root.fields.nullableEnum.setOutput("a");
    form.root.fields.optionalLiteral.setOutput("test");
    form.root.fields.nullableLiteral.setOutput("test");

    // All primitive types should always have innerField present (no reactivity)
    observers.forEach((observer) => {
      expect(observer.observed).toMatchObject([true]);
    });
  });

  it("should have non-nullish innerField for omittable types", () => {
    const form = new MobxZodForm(
      z.object({
        optional: z.string().optional(),
        nullable: z.string().nullable(),
      }),
    );

    const obOptional = observeForm((ob) =>
      ob(form.root.fields.optional.rawInput),
    );
    const obNullable = observeForm((ob) =>
      ob(form.root.fields.optional.rawInput),
    );

    form.root.fields.optional.innerField.setOutput("filled");
    form.root.fields.optional.innerField.setOutput("filled");

    expect(obOptional.observed).toMatchObject(["", "filled"]);
    expect(obNullable.observed).toMatchObject(["", "filled"]);
  });

  it("should react on parent input change for arrays", () => {
    const form = new MobxZodForm(
      z.object({
        array: z.number().array(),
      }),
      {
        initialOutput: { array: [1, 2, 3] },
      },
    );

    const obElements = observeForm((ob) => ob(form.root.fields.array.length));

    form.root.setOutput({
      array: [],
    });

    form.root.setOutput({
      array: [1, 2, 3, 4],
    });

    expect(obElements.observed).toMatchObject([3, 0, 4]);
  });

  it("should encode new element for arrays", () => {
    const form = new MobxZodForm(
      z.object({
        array: z.number().array(),
      }),
    );

    form.root.fields.array.push(0);

    expect(toJS(form.rawInput)).toMatchObject({
      array: ["0"],
    });

    form.root.fields.array.push(empty);

    expect(toJS(form.rawInput)).toMatchObject({
      array: ["0", ""],
    });
  });

  it("should handle rawInput other than array for arryas", () => {
    const form = new MobxZodForm(
      z.object({
        array: z.number().array(),
      }),
      {
        setActionOptions: {
          validateSync: true,
        },
      },
    );

    form._setRawInputAt(["array"], undefined);
    form.root.fields.array.push(0);

    expect(toJS(form.rawInput)).toMatchObject({
      array: ["0"],
    });
  });

  it("should react on discriminated union", () => {
    const form = new MobxZodForm(
      z.discriminatedUnion("answer", [
        z.object({
          answer: z.literal("OK"),
        }),
        z.object({
          answer: z.literal("NO"),
          reason: z.string().min(1).label("Reason"),
          array: z.string().array(),
        }),
      ]),
      {
        setActionOptions: {
          validateSync: true,
        },
      },
    );

    expect(form.rawInput).toMatchObject({
      answer: "OK",
    });

    form.root.discriminatorField.setOutput("NO");
    // Should auto-fill reason with initial value
    expect(toJS(form.rawInput)).toMatchObject({
      answer: "NO",
      reason: "",
      array: [],
    });

    expect(
      form.root.fieldsResult.success &&
        form.root.fieldsResult.fields.discriminator === "NO" &&
        form.root.fieldsResult.fields.reason.errorMessages,
    ).toMatchObject(["String must contain at least 1 character(s)"]);

    form.root.setOutput({
      answer: "NO",
      reason: "xyz",
      array: [],
    });

    expect(toJS(form.rawInput)).toMatchObject({
      answer: "NO",
      reason: "xyz",
    });

    if (
      form.root.fieldsResult.success &&
      form.root.fieldsResult.fields.discriminator === "NO"
    ) {
      expect(form.root.fieldsResult.fields.reason.rawInput).toBe("xyz");

      expect(
        form.root.fieldsResult.fields.reason.type.getFormMeta().label,
      ).toBe("Reason");
    } else {
      throw new Error("unexpected field value");
    }

    form.root.discriminatorField.setOutput("OK");

    expect(toJS(form.rawInput)).toMatchObject({
      answer: "OK",
    });

    form.root.discriminatorField.setOutput("NO");

    expect(toJS(form.rawInput)).toMatchObject({
      answer: "NO",
      reason: "xyz",
    });
  });

  it("should handle effects in field", () => {
    const form = new MobxZodForm(
      z.object({
        refined: z.string().refine((s) => s.length > 1),
      }),
    );

    form.root.fields.refined.setOutput("xxxx");

    expect(form.root.fields.refined.decodeResult).toMatchObject({
      success: true,
      data: "xxxx",
    });
  });

  it("should handle box", () => {
    const form = new MobxZodForm(
      z.object({
        boxed: z
          .object({
            a: z.instanceof(Function),
          })
          .box(),
      }),
    );

    // Should initialized with empty
    expect(
      form.parsed.success === false &&
        form.parsed.error.issues.map((i) => i.message),
    ).toMatchObject(["Required"]);

    form.root.fields.boxed.setOutput({ a: new Function() });

    expect(form.parsed).toMatchInlineSnapshot(`
      {
        "data": {
          "boxed": {
            "a": [Function],
          },
        },
        "success": true,
      }
    `);

    // Should be undefined
    form.root.fields.boxed.setOutput(empty);
    expect(
      form.parsed.success === false &&
        form.parsed.error.issues.map((i) => i.message),
    ).toMatchObject(["Required"]);
  });

  it("should cache computed values", () => {
    runInAction(() => {
      const form = new MobxZodForm(
        z.object({
          refined: z.object({}),
        }),
      );

      expect(form.root.fields.refined.rawInput).toBe(
        form.root.fields.refined.rawInput,
      );

      expect(form.root.fields.refined.decodeResult).toBe(
        form.root.fields.refined.decodeResult,
      );
    });
  });

  it("should react on nullable inner field issues", () => {
    const form = new MobxZodForm(
      z.object({
        username: z.string().min(1).max(2).nullable(),
        nested: z
          .object({
            age: z.number(),
          })
          .nullable(),
      }),
      {
        initialOutput: {
          username: "",
          nested: {
            age: 1,
          },
        },
        setActionOptions: {
          validateSync: true,
        },
      },
    );

    const obNullableField = observeForm((observe) => {
      observe(form.root.fields.username.issues.map((i) => i.message));
    });

    const obInnerField = observeForm((observe) => {
      observe(
        form.root.fields.username.innerField.issues.map((i) => i.message),
      );
    });

    form.root.fields.username.setRawInput("");
    form.root.fields.username.setRawInput("joe");

    expect(obNullableField.observed).toMatchObject([
      [],
      [],
      ["String must contain at most 2 character(s)"],
    ]);

    expect(obInnerField.observed).toMatchObject([
      [],
      [],
      ["String must contain at most 2 character(s)"],
    ]);
  });

  it("should react on nullable object inner field issues", () => {
    const form = new MobxZodForm(
      z.object({
        nested: z
          .object({
            age: z.number(),
          })
          .nullable(),
      }),
      {
        initialOutput: {
          nested: {
            age: 1,
          },
        },
        setActionOptions: {
          validateSync: true,
        },
      },
    );

    {
      const ob = observeForm((observe) => {
        const mmm = form.root.fields.nested.innerField!.fields.age.issues.map(
          (i) => i.message,
        );
        observe(mmm);
      });

      form.root.fields.nested.innerField!.fields.age.setRawInput("abc");

      expect(ob.observed).toMatchObject([
        [],
        ["Expected number, received string"],
      ]);
    }
  });
});
