import { useMemo } from "react";

import { empty } from "@monoid-dev/mobx-zod-form";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { observer } from "mobx-react";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { TextInput } from "./TextInput";
import { FormOptionsProvider, useForm } from "../src";

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
          <TextInput field={form.root.fields.optionalNumber.innerField} />
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

  it("validateOnMount", async () => {
    const Form = observer(() => {
      const form = useForm(
        z.object({
          username: z.string().min(1).label("Username"),
        }),
        {
          validateOnMount: true,
        },
      );

      // Set touched so error messages are visible.
      useMemo(() => {
        form.root.fields.username.setTouched(true);
      }, []);

      return (
        <form
          {...form.bindForm({ onSubmit: console.info })}
          style={{ border: `1px solid black` }}
        >
          <TextInput field={form.root.fields.username} />
          <button type="submit">Submit</button>
        </form>
      );
    });

    render(<Form />);

    await screen.findByText("String must contain at least 1 character(s)");
  });

  it("setActionOptions.validateSync", () => {
    const Form = observer(() => {
      const form = useForm(
        z.object({
          password: z.string().min(6).label("Password"),
        }),
        {
          setActionOptions: {
            validateSync: true,
          },
        },
      );

      // Set touched so error messages are visible.
      useMemo(() => {
        form.root.fields.password.setTouched(true);
      }, []);

      return (
        <form
          {...form.bindForm({ onSubmit: console.info })}
          style={{ border: `1px solid black` }}
        >
          <TextInput field={form.root.fields.password} />
          <button type="submit">Submit</button>
        </form>
      );
    });

    render(<Form />);

    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "short" },
    });

    screen.getByText("String must contain at least 6 character(s)");
  });

  it("shouldFocusError", async () => {
    // By default
    const Form = observer(() => {
      const form = useForm(
        z.object({
          age: z.number().label("Age").min(18),
        }),
      );

      return (
        <form
          {...form.bindForm({ onSubmit: console.info })}
          style={{ border: `1px solid black` }}
        >
          <TextInput field={form.root.fields.age} />
          <button type="submit">Submit</button>
        </form>
      );
    });

    render(<Form />);

    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(screen.getByLabelText("Age")).toHaveFocus());
  });

  it("enableReinitialize", async () => {
    const Form = observer(({ initialAge }: { initialAge: number }) => {
      const form = useForm(
        z.object({
          age: z.number().label("Age"),
        }),
        {
          initialOutput: {
            age: initialAge,
          },
          enableReinitialize: true,
        },
      );

      return (
        <form
          {...form.bindForm({ onSubmit: console.info })}
          data-testid="form"
          data-isdirty={form.isDirty}
          style={{ border: `1px solid black` }}
        >
          <TextInput field={form.root.fields.age} />
          <button type="submit">Submit</button>
        </form>
      );
    });

    const { rerender } = render(<Form initialAge={3} />);

    expect(screen.getByDisplayValue("3")).toBeInTheDocument();

    rerender(<Form initialAge={empty} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Age")).toHaveValue("");
    });

    rerender(<Form initialAge={22} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Age")).toHaveValue("22");
    });

    /**
     * Reinitialize should not set isDirty to true
     */
    await waitFor(() => {
      expect(screen.getByTestId("form")).toHaveAttribute(
        "data-isdirty",
        "false",
      );
    });
  });

  it("inherits FormOptionsContext", () => {
    const Form = observer(({ initialAge }: { initialAge: number }) => {
      const form = useForm(
        z.object({
          age: z.number().label("Age"),
        }),
        {
          initialOutput: {
            age: initialAge,
          },
        },
      );

      expect(form.options.plugins).toMatchObject([
        {
          name: "plugin",
        },
      ]);

      return (
        <form
          {...form.bindForm({ onSubmit: console.info })}
          style={{ border: `1px solid black` }}
        >
          <TextInput field={form.root.fields.age} />
          <button type="submit">Submit</button>
        </form>
      );
    });

    render(
      <FormOptionsProvider
        options={{
          plugins: [
            {
              name: "plugin",
            },
          ],
        }}
      >
        <Form initialAge={3} />
      </FormOptionsProvider>,
    );
  });
});
