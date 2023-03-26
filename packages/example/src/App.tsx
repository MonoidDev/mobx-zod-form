import {
  empty,
  MobxZodField,
  extendZodWithMobxZodForm,
  MobxZodObjectField,
} from "@monoid-dev/mobx-zod-form";
import {
  FormContextProvider,
  getForm,
  useForm,
  useFormContext,
} from "@monoid-dev/mobx-zod-form-react";
import { observer } from "mobx-react";
import { z, ZodNumber, ZodString } from "zod";

extendZodWithMobxZodForm(z);

import "./App.css";

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

const FormDecode = () => {
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
};

const Form2 = () => {
  const form = useForm(
    z.object({
      username: z.string().min(1),
      password: z.string().min(6),
    }),
    {
      validateOnMount: true,
    },
  );

  return (
    <div style={{ border: `1px solid black` }}>
      <TextInput field={form.root.fields.username} />
      <TextInput field={form.root.fields.password} />
    </div>
  );
};

const FormArray1 = observer(() => {
  const form = useForm(
    z.object({
      users: z.array(
        z.object({
          name: z.string().min(1),
          age: z.number().min(5),
        }),
      ),
    }),
  );

  return (
    <div style={{ border: `1px solid black` }}>
      {form.root.fields.users.elements.map((userField) => (
        <div key={userField.uniqueId}>
          <div style={{ border: `1px solid black` }}>
            <TextInput field={userField.fields.name} />
            <TextInput field={userField.fields.age} />
          </div>
        </div>
      ))}

      <button
        onClick={() =>
          form.root.fields.users.push({
            name: "",
            age: empty,
          })
        }
      />
    </div>
  );
});

const FormContext1Type = z.object({
  username: z.string().min(1),
  password: z.string().min(6),
  inner: z.string().min(1),
});

const FormContext1Children = observer(() => {
  const form = useFormContext(FormContext1Type);

  return <TextInput field={form.root.fields.inner} />;
});

const FormContext1 = observer(() => {
  const form = useForm(
    z.object({
      username: z.string().min(1),
      password: z.string().min(6),
      inner: z.string().min(1),
    }),
    { validateOnMount: false },
  );

  return (
    <FormContextProvider form={form}>
      <div style={{ border: `1px solid black` }}>
        <TextInput field={form.root.fields.username} />
        <TextInput field={form.root.fields.password} />
        <FormContext1Children />
      </div>
    </FormContextProvider>
  );
});

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

const ExoticFields = observer(() => {
  const form = useForm(
    z.object({
      checkboxBoolean: z.boolean(),
      checkboxArray: z.string().array(),
      ratioBoolean: z.boolean(),
    }),
  );

  return (
    <div style={{ border: `1px solid black` }}>
      <form>
        <div>
          <label>
            Checkbox Boolean
            <input
              {...form.bindField(form.root.fields.checkboxBoolean, {
                type: "checkbox",
              })}
            />
          </label>
        </div>

        <div>
          {["A", "B", "C"].map((v) => (
            <label key={v}>
              Checkbox Array {v}
              <input
                {...form.bindField(form.root.fields.checkboxArray, {
                  type: "checkbox",
                  value: v,
                })}
              />
            </label>
          ))}
        </div>

        <div>
          <label>
            Ratio True
            <input
              {...form.bindField(form.root.fields.ratioBoolean, {
                type: "radio",
                value: true,
              })}
            />
          </label>
          <label>
            Ratio False
            <input
              {...form.bindField(form.root.fields.ratioBoolean, {
                type: "radio",
                value: false,
              })}
            />
          </label>
        </div>
      </form>
    </div>
  );
});

function App() {
  return (
    <div className="App">
      <SimpleForm />
      <FormDecode />
      <Form2 />
      <FormArray1 />
      <FormContext1 />
      <ComposableForm />
      <ExoticFields />
    </div>
  );
}

export default App;
