import { MobxZodField } from "@monoid-dev/mobx-zod-form";
import { render } from "@testing-library/react";
import { observer } from "mobx-react";
import { describe, it } from "vitest";
import { z, ZodString, ZodNumber } from "zod";

import { getForm, useForm } from "../src";

const TextInput = observer(
  ({ field }: { field: MobxZodField<ZodString | ZodNumber> }) => {
    const form = getForm(field);

    return (
      <div>
        <input
          {...form.bindField(field)}
          placeholder={field.path.at(-1)?.toString()}
        />
        {field.errorMessages.map((e, i) => (
          <div style={{ color: "red" }} key={i}>
            {e}
          </div>
        ))}
      </div>
    );
  },
);

const SimpleForm = () => {
  const form = useForm(
    z.object({
      username: z.string().min(1),
      password: z.string().min(6),
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
};

describe("simple", () => {
  it("renders SimpleForm", () => {
    render(<SimpleForm />);
  });
});
