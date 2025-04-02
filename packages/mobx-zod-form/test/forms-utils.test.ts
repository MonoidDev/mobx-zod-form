import { when } from "mobx";
import { describe, expect, it, beforeAll } from "vitest";
import { z } from "zod";

import { setup } from "./utils";
import { MobxZodForm } from "../src";

setup();

beforeAll(() => {
  globalThis.requestIdleCallback = (cb) => {
    const id = setTimeout(cb);
    return id;
  };
});

describe("form utils tests", () => {
  it("should set dirty", () => {
    const form = new MobxZodForm(
      z.object({
        username: z.string(),
      }),
    );

    form.root.fields.username.setOutput("abc");

    expect(form.isDirty).toBe(true);

    form.root.fields.username.setOutput("");

    expect(form.isDirty).toBe(true);
  });

  it("should submit", async () => {
    const form = new MobxZodForm(
      z.object({
        username: z.string().min(1),
      }),
      {
        setActionOptions: { validateSync: true },
      },
    );

    // Haven't trigger any validation at the start.
    expect(form.root.fields.username._issues).toMatchObject([]);

    expect(form.submitCount).toBe(0);

    await form.handleSubmit(async () => {
      expect(form.isSubmitting).toBe(true);
      expect(form.submitCount).toBe(1);
    });

    expect(form.submitCount).toBe(1);

    // Validation is triggered for every field
    expect(form.root.fields.username.errorMessages).toMatchObject([
      "String must contain at least 1 character(s)",
    ]);

    // Every field is touched
    expect(form.root.touched).toBe(true);
    expect(form.root.fields.username.touched).toBe(true);
  });

  // TODO:
  it("should handle extra errors", () => {});

  it("should observe isValidationPending", async () => {
    const form = new MobxZodForm(
      z.object({
        username: z.string(),
      }),
    );
    form.start();

    form.root.fields.username.setOutput("abc");
    expect(form.isValidationPending).toBe(true);
    await when(() => form.isValidationPending === false);
  });
});
