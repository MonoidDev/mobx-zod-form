import {
  empty,
  MobxZodField,
  extendZodWithMobxZodForm,
  MobxZodObjectField,
} from "@monoid-dev/mobx-zod-form";
import {
  FormContextProvider,
  useForm,
  useFormContext,
} from "@monoid-dev/mobx-zod-form-react";
import { observer } from "mobx-react";
import { z, ZodNumber, ZodString } from "zod";

extendZodWithMobxZodForm(z);

import "./App.css";

const TextInput = observer(
  ({ field }: { field: MobxZodField<ZodString | ZodNumber> }) => {
    return (
      <div>
        <input
          placeholder={field.path.at(-1)?.toString()}
          value={field.rawInput as string}
          onChange={(e) => field.setRawInput(e.target.value)}
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

const Form = () => {
  const form = useForm(
    z.object({
      username: z.string().min(1),
      password: z.string().min(6),
    }),
  );

  return (
    <form style={{ border: `1px solid black` }}>
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

function App() {
  return (
    <div className="App">
      <Form />
      <FormDecode />
      <Form2 />
      <FormArray1 />
      <FormContext1 />
      <ComposableForm />
    </div>
  );
}

export default App;
