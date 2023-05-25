import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { observer } from "mobx-react";
import { describe, it } from "vitest";
import { z } from "zod";

import { TextInput } from "./TextInput";
import { useForm } from "../src";

const SimpleForm = observer(() => {
  const form = useForm(
    z.object({
      username: z.string().min(1).label("Username"),
      password: z.string().min(6).label("Password"),
    }),
  );

  return (
    <form
      {...form.bindForm({ onSubmit: console.info })}
      style={{ border: `1px solid black` }}
    >
      <TextInput field={form.root.fields.username} />
      <TextInput field={form.root.fields.password} />
      <button type="submit">Submit</button>
    </form>
  );
});

describe("simple", () => {
  it("renders SimpleForm", () => {
    render(<SimpleForm />);
  });

  it("displays error", async () => {
    const user = userEvent.setup();

    render(<SimpleForm />);
    await user.type(screen.getByLabelText("Password"), "abc");

    // Click away
    await userEvent.click(document.body);

    await screen.findByText("String must contain at least 6 character(s)");

    // Submit the form
    await userEvent.click(screen.getByText("Submit"));

    await screen.findByText("String must contain at least 1 character(s)");
    await screen.findByText("String must contain at least 6 character(s)");
  });
});
