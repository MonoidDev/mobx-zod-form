import { useEffect } from "react";

import {
  empty,
  MobxZodField,
  extendZodWithMobxZodForm,
  MobxZodObjectField,
  mapDecodeResult,
  partial,
  getDecodeResultOr,
} from "@monoid-dev/mobx-zod-form";
import { ObjectInput } from "@monoid-dev/mobx-zod-form-input";
import {
  FormContextProvider,
  getForm,
  useForm,
  useFormContext,
  useFormEvent,
} from "@monoid-dev/mobx-zod-form-react";
import { observer } from "mobx-react";
import { z, ZodTypeAny } from "zod";
import "./App.css";

extendZodWithMobxZodForm(z);

const TextInput = observer(({ field }: { field: MobxZodField<ZodTypeAny> }) => {
  const form = getForm(field);

  return (
    <div>
      <input
        {...form.bindField(field)}
        placeholder={field.path.at(-1)?.toString()}
      />
      {field.touched &&
        field.errorMessages.map((e, i) => (
          <div style={{ color: "red" }} key={i}>
            {e}
          </div>
        ))}

      {field.extraErrorMessages.map((e, i) => (
        <div style={{ color: "pink" }} key={i}>
          {e}
        </div>
      ))}
    </div>
  );
});

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

const FormArray1Schema = z.object({
  users: z
    .array(
      z.object({
        name: z.string().min(1),
        age: z.number().min(5),
      }),
    )
    .min(1),
});

const FormArray1Inner = observer(({ field }: { field: any }) => {
  return (
    <>
      {field.elements.length > 0 &&
        field.elements.map((userField: any) => (
          <div key={userField.uniqueId}>
            <div style={{ border: `1px solid black` }}>
              <TextInput field={userField.fields.name} />
              <TextInput field={userField.fields.age} />
            </div>
          </div>
        ))}
    </>
  );
});

const FormArray1 = observer(() => {
  const form = useForm(FormArray1Schema, {
    initialOutput: {
      users: [empty],
    },
  });

  return (
    <div style={{ border: `1px solid black` }}>
      <div>Form Array</div>
      <FormArray1Inner field={form.root.fields.users} />

      <button
        type="button"
        onClick={() => form.root.fields.users.push(empty)}
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

const FocusErrorY = () => {
  const form = useForm(
    z.object({
      password: z.string().min(6),
      username: z.string().min(1),
    }),
  );

  return (
    <form
      {...form.bindForm({ onSubmit: console.info })}
      style={{ border: `1px solid black`, height: 120, overflow: "auto" }}
    >
      The form will scroll. It will focus on the first error based on the
      distance to top.
      <TextInput field={form.root.fields.username} />
      <div style={{ height: 100 }} />
      <TextInput field={form.root.fields.password} />
      <button type="submit">Submit</button>
    </form>
  );
};

const FocusErrorX = () => {
  const form = useForm(
    z.object({
      password: z.string().min(6),
      username: z.string().min(1),
      blah: z.string().min(6),
      blahblah: z.string().min(1),
    }),
    {
      shouldFocusError: "first-x",
    },
  );

  return (
    <form
      {...form.bindForm({ onSubmit: console.info })}
      style={{
        border: `1px solid black`,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
      }}
    >
      <div style={{ gridColumn: "1 / -1" }}>
        It will focus on the first error based on the distance to left.
      </div>
      <TextInput field={form.root.fields.username} />
      <TextInput field={form.root.fields.password} />
      <TextInput field={form.root.fields.blah} />
      <TextInput field={form.root.fields.blahblah} />
      <button type="submit">Submit</button>
    </form>
  );
};

const AutoSubmit = observer(() => {
  const form = useForm(z.object({ autoSubmit: z.string() }));

  useEffect(() => {
    form.element?.dispatchEvent(
      new Event("submit", { cancelable: true, bubbles: true }),
    );
  }, [mapDecodeResult(form.root.fields.autoSubmit.decodeResult, (d) => d, "")]);

  return (
    <form {...form.bindForm()}>
      <div>Submit Count: {form.submitCount}</div>
      <TextInput field={form.root.fields.autoSubmit} />
    </form>
  );
});

const OptionalField = observer(() => {
  const form = useForm(
    z.object({
      string: z.string(),
      optionalString: z.string().optional(),
      optionalStringNumberOnlyRegex: z
        .string()
        .regex(/[0-9]+/)
        .optional(),
      optionalStringNumberOnlyRefine: z
        .string()
        .refine(
          (x) => String(x).trim().length > 0 && !Number.isNaN(Number(x)),
          `半角数字で入力してください。`,
        )
        .optional(),
      optionalNumber: z.number().optional(),
      nullishString: z.string().nullish(),
      nullishNumber: z.number().nullish(),
    }),
  );

  return (
    <form
      {...form.bindForm({
        onSubmit() {
          console.info("submit optional field!");
        },
        onSubmitError(e) {
          console.error(e);
        },
      })}
    >
      <div>Should reset successfully</div>

      <TextInput field={form.root.fields.string} />
      <TextInput field={form.root.fields.optionalString} />
      <TextInput field={form.root.fields.optionalStringNumberOnlyRegex} />
      <TextInput field={form.root.fields.optionalStringNumberOnlyRefine} />
      <TextInput field={form.root.fields.optionalNumber} />
      <TextInput field={form.root.fields.nullishString} />
      <TextInput field={form.root.fields.nullishNumber} />
      <button type="submit">Submit</button>
      <button onClick={() => form.root.setOutput(empty)}>Reset</button>
    </form>
  );
});

const TextAreaForm = observer(function TextAreaForm() {
  const form = useForm(
    z.object({
      string: z.string().min(1),
    }),
  );

  const { fields } = form.root;

  return (
    <form
      {...form.bindForm({
        onSubmit(value) {
          alert(JSON.stringify(value));
        },
        onSubmitError(e) {
          console.error(e);
        },
      })}
    >
      <textarea
        style={{ display: "block" }}
        {...form.bindTextArea(fields.string)}
      />
      {fields.string.touched &&
        fields.string.errorMessages.map((e, i) => (
          <div style={{ color: "red" }} key={i}>
            {e}
          </div>
        ))}
      <button type="submit">Submit</button>
    </form>
  );
});

const ExtraErrorMessages = observer(() => {
  const form = useForm(
    z.object({
      string: z.string().min(1),
    }),
  );

  const { fields } = form.root;

  return (
    <form
      {...form.bindForm({
        async onSubmit() {
          await new Promise((r) => setTimeout(r, 500));

          fields.string.setExtraErrorMessages(["extra errors"]);
        },
        onSubmitError(e) {
          console.error(e);
        },
      })}
    >
      <TextInput field={form.root.fields.string} />
      <button type="submit">Submit</button>
    </form>
  );
});

const AutoForm: React.FC = observer(() => {
  const form = useForm(
    z.object({
      string: z.string().min(1),
      number: z.number().min(1),
      nested: z.object({
        string: z.string().min(1),
        number: z.number().min(1),
        nested: z.object({
          string: z.string().min(1),
          number: z.number().min(1),
        }),
      }),
      partialString: z.string().optional(),
      partialNumber: z.number().optional(),
      enum: z.enum(["a", "b", "c"]),
      traderOptions: z
        .object({
          priceWindowSize: z.object({
            A: z.number(),
            B: z.number(),
            C: z.number(),
          }),
          priceStability: z.enum(["all", "first-last", "profit-incremental"]),
          pollInterval: z.number(),
          lots: z.number(),
          coolDownTime: z.number(),
          minimumProfit: z.object({
            open: z.number(),
            close: z.number(),
          }),
          minimumMarginLevel: z.number(),
          checkTraderStatesPeriod: z.number(),
          tradeStrategy: z.enum(["a-first", "concurrent"]),
          logInfo: z.boolean(),
        })
        .partial(),
    }),
  );

  return (
    <form
      {...form.bindForm({
        onSubmit(value) {
          alert(JSON.stringify(value));
        },
        onSubmitError(e) {
          console.error(e);
        },
      })}
      style={{
        border: `1px solid black`,
        padding: "1rem",
      }}
    >
      <ObjectInput field={form.root} />
      <button type="submit">Submit</button>
    </form>
  );
});

const PartialInitialOutput = () => {
  const form = useForm(
    z.object({
      username: z.string().min(1),
      password: z.string().min(6),
    }),
    {
      validateOnMount: true,
      initialOutput: partial({
        username: "admin",
      }),
    },
  );

  return (
    <div style={{ border: `1px solid black` }}>
      <TextInput field={form.root.fields.username} />
      <TextInput field={form.root.fields.password} />
    </div>
  );
};

const SubmitFormTest = () => {
  const form = useForm(
    z.object({
      username: z.string().min(1),
      password: z.string().min(6),
    }),
  );

  return (
    <form
      style={{ border: `1px solid black` }}
      {...form.bindForm({
        async onSubmit(v) {
          await new Promise((r) => setTimeout(r, 500));
          if (v.username === "error") {
            throw new Error("error from onSubmit");
          }
        },
      })}
    >
      <TextInput field={form.root.fields.username} />
      <TextInput field={form.root.fields.password} />

      <button
        onClick={async () => {
          try {
            await form.submitForm();
            alert("returned");
          } catch (e) {
            alert(String(e));
          }
        }}
      >
        invoke submitForm
      </button>
    </form>
  );
};

const NullableInnerFieldIssue = () => {
  const form = useForm(
    z.object({
      number: z.number().min(1).nullable(),
    }),
    {
      initialOutput: {
        number: "xxx" as any,
      },
    },
  );

  return (
    <form
      style={{ border: `1px solid black` }}
      {...form.bindForm({
        async onSubmit() {
          await new Promise((r) => setTimeout(r, 500));
        },
      })}
    >
      <TextInput field={form.root.fields.number.innerField} />

      <TextInput field={form.root.fields.number} />

      <button
        onClick={async () => {
          try {
            await form.submitForm();
            alert("returned");
          } catch (e) {
            alert(String(e));
          }
        }}
      >
        should display the same error for invalid input
      </button>
    </form>
  );
};

const ThrowSyncForm = () => {
  const form = useForm(z.object({}));

  return (
    <form
      {...form.bindForm({
        onSubmit: () => {
          throw new Error("This is a synchronous error from onSubmit");
        },
      })}
      style={{ border: `1px solid black` }}
    >
      <button type="submit">Should see error in console</button>
    </form>
  );
};

const FormEvent = () => {
  const form = useForm(
    z.object({
      uppercasedOnSubmit: z.string(),
    }),
    {
      initialOutput: {
        uppercasedOnSubmit: "initial value",
      },
    },
  );

  useFormEvent(
    form,
    "onBeforeSubmit",
    () => {
      form.root.fields.uppercasedOnSubmit.setOutput(
        getDecodeResultOr(
          form.root.fields.uppercasedOnSubmit.decodeResult,
          "",
        ).toUpperCase(),
      );
    },
    [],
  );

  return (
    <form
      style={{ border: `1px solid black` }}
      {...form.bindForm({
        async onSubmit() {},
      })}
    >
      <TextInput field={form.root.fields.uppercasedOnSubmit} />

      <button type="submit">Should uppercase on submit</button>
    </form>
  );
};

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
      <FocusErrorY />
      <FocusErrorX />
      <AutoSubmit />
      <OptionalField />
      <TextAreaForm />
      <ExtraErrorMessages />
      <PartialInitialOutput />

      <AutoForm />
      <SubmitFormTest />
      <NullableInnerFieldIssue />
      <ThrowSyncForm />
      <FormEvent />
    </div>
  );
}

export default App;
