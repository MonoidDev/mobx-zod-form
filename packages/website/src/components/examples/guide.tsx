/* eslint-disable @typescript-eslint/no-unused-vars */
import { useForm } from "@monoid-dev/mobx-zod-form-react";
import { observer } from "mobx-react";
import { z } from "zod";

/* #schema */
z.object({
  username: z.string().min(1).max(32),
  password: z.string().min(6),
});
/* #schema */

() => {
  /* #basic-form */
  function Form() {
    return (
      <form>
        /* #basic-form-fields */
        <input name="username" minLength={1} maxLength={32} />
        <input name="password" minLength={6} />
        /* #basic-form-fields */
        <button type="submit">Create Account</button>
      </form>
    );
  }

  /* #basic-form */
};

() => {
  /* #use-form */
  const Form = observer(() => {
    const form = useForm(
      z.object({
        username: z.string().min(1).max(32),
        password: z.string().min(6),
      }),
    );

    return (
      <form>
        /* #basic-form-fields */
        <input name="username" minLength={1} maxLength={32} />
        <input name="password" minLength={6} />
        /* #basic-form-fields */
        <button type="submit">Create Account</button>
      </form>
    );
  });

  /* #use-form */
};

() => {
  /* #bind-form */
  const Form = observer(() => {
    const form = useForm(
      z.object({
        username: z.string().min(1).max(32),
        password: z.string().min(6),
      }),
    );

    const { fields } = form.root;

    /* #bind-form-1 */
    return (
      <form
        {...form.bindForm({
          onSubmit(data) {
            alert(`Hello, ${data.username}!`);
          },
          onSubmitError() {
            alert("Hello, fix your errors and try again!");
          },
        })}
      >
        {/* #bind-form-1 */}
        {/* #bind-field-1 */}
        <input {...form.bindField(fields.username)} placeholder="Username" />
        {/* #bind-field-1 */}
        <br />
        {fields.username.touched &&
          fields.username.errorMessages.map((e, i) => (
            <div style={{ color: "red" }} key={i}>
              {e}
            </div>
          ))}

        {/* #bind-field-2 */}
        <input
          {...form.bindField(fields.password)}
          placeholder="Password"
          type="password"
        />
        {/* #bind-field-2 */}
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

  /* #bind-form */
};

() => {
  /* #decode-result */
  const Form = observer(() => {
    const form = useForm(
      z.object({
        age: z.number().min(20),
      }),
    );

    const { fields } = form.root;

    return (
      <form
        {...form.bindForm({
          onSubmit(data /* { age: number; } */) {
            alert(`You are ${data.age}-year-old. `);
          },
        })}
      >
        <input {...form.bindField(fields.age)} />
        <div>
          {fields.age.decodeResult.success
            ? fields.age.type.minValue! > fields.age.decodeResult.data
              ? `You are ${
                  fields.age.type.minValue! - fields.age.decodeResult.data
                } years younger than 20`
              : "Old enough"
            : null}
        </div>
        {fields.age.touched &&
          fields.age.errorMessages.map((e, i) => (
            <div style={{ color: "red" }} key={i}>
              {e}
            </div>
          ))}
      </form>
    );
  });

  /* #decode-result */
};
