import { empty } from "@monoid-dev/mobx-zod-form";
import { render, screen } from "@testing-library/react";
import { observer } from "mobx-react";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { TextInput } from "./TextInput";
import { useForm } from "../src";

describe("formOptions", () => {
  it("initialOutput", () => {
    const Form = observer(() => {
      const form = useForm(
        z.object({
          username: z.string().min(1).label("Username"),
          password: z.string().min(6).label("Password"),
          age: z.number().label("Age"),
          emptyNumber: z.number().label("Empty Number"),
          optionalNumber: z.number().optional().label("Optional Number"),
          optionalString: z.string().optional().label("Optional String"),
        }),
        {
          initialOutput: {
            username: empty,
            password: "114514",
            age: 1,
            emptyNumber: empty,
            optionalNumber: empty,
            optionalString: undefined,
          },
        },
      );

      return (
        <form
          {...form.bindForm({ onSubmit: console.info })}
          style={{ border: `1px solid black` }}
        >
          <TextInput field={form.root.fields.username} />
          <TextInput field={form.root.fields.password} />
          <TextInput field={form.root.fields.age} />
          <TextInput field={form.root.fields.emptyNumber} />
          <TextInput field={form.root.fields.optionalNumber} />
          <TextInput field={form.root.fields.optionalString} />
          <button type="submit">Submit</button>
        </form>
      );
    });

    render(<Form />);

    expect(
      screen.getByLabelText("Username") as HTMLInputElement,
    ).toHaveProperty("value", "");

    expect(
      screen.getByLabelText("Password") as HTMLInputElement,
    ).toHaveProperty("value", "114514");

    expect(screen.getByLabelText("Age") as HTMLInputElement).toHaveProperty(
      "value",
      "1",
    );

    expect(
      screen.getByLabelText("Empty Number") as HTMLInputElement,
    ).toHaveProperty("value", "");

    expect(
      screen.getByLabelText("Optional Number") as HTMLInputElement,
    ).toHaveProperty("value", "");

    expect(
      screen.getByLabelText("Optional String") as HTMLInputElement,
    ).toHaveProperty("value", "");
  });

  it("validateOnMount", () => {});

  it("setActionOptions", () => {});

  it("shouldFocusError", () => {});

  it("enableReinitialize", () => {});
});
