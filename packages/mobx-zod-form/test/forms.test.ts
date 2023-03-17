import { describe, expect, it } from "vitest";
import { z } from "zod";

import { observeForm } from "./utils";
import { setup } from "./utils";
import { MobxZodForm } from "../src/MobxZodForm";

setup();

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
      observe(form.root.fields.username.input);
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
      ob(form.root.fields.username.input);
    });

    const observePassword = observeForm((ob) => {
      ob(form.root.fields.password.input);
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
      observe(form.root.input.ids[0]);
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
});
