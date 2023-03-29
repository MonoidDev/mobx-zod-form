import React from "react";

import { extendZodWithMobxZodForm } from "@monoid-dev/mobx-zod-form";
import { useForm } from "@monoid-dev/mobx-zod-form-react";
import { observer } from "mobx-react";
import { createRoot } from "react-dom/client";
import { z } from "zod";

extendZodWithMobxZodForm(z);

const Form = observer(() => {
  const form = useForm(
    z.object({
      username: z.string().min(1).max(32),
      password: z.string().min(6),
    }),
  );

  const { fields } = form.root;

  /* #bindForm */
  return (
    <form
      {...form.bindForm({
        onSubmit(data) {
          alert(`Hello, ${data.username}!`);
        },
      })}
    >
      {/* #bindForm */}
      <input {...form.bindField(fields.username)} placeholder="Username" />
      <br />
      {fields.username.touched &&
        fields.username.errorMessages.map((e, i) => (
          <div style={{ color: "red" }} key={i}>
            {e}
          </div>
        ))}

      <input
        {...form.bindField(fields.password)}
        placeholder="Password"
        type="password"
      />
      {fields.password.touched &&
        fields.password.errorMessages.map((e, i) => (
          <div style={{ color: "red" }} key={i}>
            {e}
          </div>
        ))}
      <br />

      <button>Create Account</button>
    </form>
  );
});

const root = createRoot(document.getElementById("root")!);

root.render(<Form />);
