import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { MobxZodPlugin, MobxZodForm } from "../src";

describe("plugin tests", () => {
  it("should run plugins", async () => {
    const hook = vi.fn();

    const form = new MobxZodForm(
      z.object({
        username: z.string(),
      }),
      {
        setActionOptions: {
          validateSync: true,
        },
        plugins: [
          {
            name: "a",
            onStart() {
              hook("a start");
            },
            onEnd() {
              hook("a end");
            },
            onBeforeValidate() {
              hook("a beforeValidate");
            },
            onAfterValidate() {
              hook("a afterValidate");
            },
            onBeforeSubmit() {
              hook("a beforeSubmit");
            },
            onAfterSubmit() {
              hook("a afterSubmit");
            },
          },
          {
            name: "b",
            onStart() {
              hook("b start");
            },
            onEnd() {
              hook("b end");
            },
            onBeforeValidate() {
              hook("b beforeValidate");
            },
            onAfterValidate() {
              hook("b afterValidate");
            },
            onBeforeSubmit() {
              hook("b beforeSubmit");
            },
            onAfterSubmit() {
              hook("b afterSubmit");
            },
          },
        ],
      },
    );

    const end = form.start();

    form.root.fields.username.setOutput("u");

    await form.handleSubmit(() => {});

    end();

    expect(hook.mock.calls).toMatchObject([
      ["a start"],
      ["b start"],

      ["a beforeValidate"],
      ["b beforeValidate"],
      ["b afterValidate"],
      ["a afterValidate"],

      ["a beforeSubmit"],
      ["b beforeSubmit"],

      ["a beforeValidate"],
      ["b beforeValidate"],
      ["b afterValidate"],
      ["a afterValidate"],

      ["b afterSubmit"],
      ["a afterSubmit"],

      ["b end"],
      ["a end"],
    ]);
  });

  it("should modify field for onBeforeSubmit", async () => {
    const fillUsernameWithAaaa: MobxZodPlugin = {
      name: "fill-username-with-aaaa",
      onBeforeSubmit() {
        form.root.fields.username.setOutput("aaaa");
      },
    };

    const form = new MobxZodForm(
      z.object({
        username: z.string(),
      }),
      {
        setActionOptions: {
          validateSync: true,
        },
        plugins: [fillUsernameWithAaaa],
      },
    );

    await form.handleSubmit(() => {
      expect(form.parsed.success && form.parsed.data).toMatchObject({
        username: "aaaa",
      });
    });
  });

  it("validation worker should recover from thrown errors", async () => {
    let throwError = true;
    const throwingPlugin: MobxZodPlugin = {
      name: "throwing-plugin",
      onBeforeValidate() {
        if (throwError) {
          throwError = false;
          throw new Error("Test error in validation");
        }
      },
    };

    const form = new MobxZodForm(
      z.object({
        username: z.string().min(3),
      }),
      {
        plugins: [throwingPlugin],
      },
    );

    const end = form.start();

    // First change triggers error
    form.root.fields.username.setOutput("ab");
    await new Promise((r) => setTimeout(r, 100));

    // Check error is set
    expect(form.root.fields.username.errorMessages).toEqual([
      "String must contain at least 3 character(s)",
    ]);

    // Second change should still work (worker recovered)
    form.root.fields.username.setOutput("abc");
    await new Promise((r) => setTimeout(r, 100));

    // Error should be cleared
    expect(form.root.fields.username.errorMessages).toEqual([]);

    end();
  });
});
