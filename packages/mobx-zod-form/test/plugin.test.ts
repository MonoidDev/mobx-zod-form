import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { setup } from "./utils";
import { MobxZodForm } from "../src/MobxZodForm";

setup();

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
            name: "fill-username-with-aaaa",
            onBeforeSubmit() {
              form.root.fields.username.setOutput("aaaa");
            },
          },
        ],
      },
    );

    await form.handleSubmit(() => {
      expect(form.parsed.success && form.parsed.data).toMatchObject({
        username: "aaaa",
      });
    });
  });
});
