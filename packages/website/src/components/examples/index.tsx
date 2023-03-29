/* eslint-disable @typescript-eslint/no-unused-vars */
/* #define-form */
import {
  extendZodWithMobxZodForm,
  MobxZodField,
  MobxZodObjectField,
} from "@monoid-dev/mobx-zod-form";
import { getForm, useForm } from "@monoid-dev/mobx-zod-form-react";
import { observer } from "mobx-react";
import { z, type ZodString, type ZodNumber } from "zod";

// Necessary step to setup zod with mobx-zod-form power!
extendZodWithMobxZodForm(z);

/* #connect-form */
const Form = () => {
  const form = useForm(
    z.object({
      username: z.string().min(1),
      password: z.string().min(6),
    }),
  );

  /* #define-form */

  return (
    <form style={{ border: `1px solid black` }} {...form.bindForm()}>
      <TextInput field={form.root.fields.username} />
      <TextInput field={form.root.fields.password} />
      <button
        onClick={() => {
          form.handleSubmit(() => console.info(form.parsed));
        }}
      >
        Submit
      </button>
    </form>
  );
};
/* #connect-form */

/* #define-controller */
const TextInput = observer(
  ({ field }: { field: MobxZodField<ZodString | ZodNumber> }) => {
    return (
      <div>
        <input
          placeholder={field.path.at(-1)?.toString()}
          {...getForm(field).bindField(field)}
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
/* #define-controller */

/* #form-decode */
const FormDecode = observer(() => {
  const fields = useForm(
    z.object({
      name: z.string().min(1),
      age: z.number(),
    }),
  ).root.fields;

  if (fields.age.decodeResult.success) {
    console.info("Age is:", fields.age.decodeResult.data); // <-- number, not string
  }

  return (
    <form style={{ border: `1px solid black` }}>
      <TextInput field={fields.name} />
      <TextInput field={fields.age} />
    </form>
  );
});
/* #form-decode */

/* #form-compose-schema */
const CreditCardSchema = z.object({
  cardNumber: z.string().min(1),
  secureCode: z.string().min(1),
  expirationMonth: z.number().min(1).max(12),
  expirationYear: z.number().min(new Date().getFullYear()).max(9999),
});

type CreditCardSchema = z.infer<typeof CreditCardSchema>;

const CreditCardInput = (props: {
  field: MobxZodObjectField<typeof CreditCardSchema>;
}) => {
  const {
    field: { fields },
  } = props;

  return (
    <div style={{ border: "1px solid red" }}>
      <div>Input your card info:</div>
      <TextInput field={fields.cardNumber} />
      <TextInput field={fields.secureCode} />
      <TextInput field={fields.expirationMonth} />
      <TextInput field={fields.expirationYear} />
    </div>
  );
};
/* #form-compose-schema */

/* #form-compose-form */
const ComposableForm = () => {
  const fields = useForm(
    z.object({
      bookName: z.string().min(1),
      creditCard: CreditCardSchema,
    }),
  ).root.fields;

  return (
    <div style={{ border: `1px solid black` }}>
      <TextInput field={fields.bookName} />
      <CreditCardInput field={fields.creditCard} />
    </div>
  );
};
/* #form-compose-form */
