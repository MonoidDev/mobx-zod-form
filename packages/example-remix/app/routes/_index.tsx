import { Suspense, useEffect, useState } from "react";

import {
  MobxZodField,
  extendZodWithMobxZodForm,
} from "@monoid-dev/mobx-zod-form";
import { getForm, useForm } from "@monoid-dev/mobx-zod-form-react";
import { defer, type MetaFunction } from "@remix-run/node";
import { Await, useLoaderData } from "@remix-run/react";
import { observer } from "mobx-react";
import { z, type ZodString } from "zod";

extendZodWithMobxZodForm(z);

export const loader = () => {
  return defer({
    p: new Promise<null>((r) => setTimeout(() => r(null), 3000)),
  });
};

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export const TextInput = observer(
  ({ field }: { field: MobxZodField<ZodString> }) => {
    const form = getForm(field);

    return (
      <div>
        <label {...form.bindLabel(field)} />
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
      </div>
    );
  },
);

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

function DeferredForm() {
  const { p } = useLoaderData<typeof loader>();

  return (
    <Suspense fallback="loading...">
      <Await resolve={p}>
        <div>
          A defered form
          <SimpleForm />
          <script
            dangerouslySetInnerHTML={{ __html: 'console.log("fuck you")' }}
          />
        </div>
      </Await>
    </Suspense>
  );
}

function SetData() {
  const [data, setData] = useState(0);

  useEffect(() => {
    setTimeout(() => {
      console.info("setting data");
      setData(42);
    }, 2000);
  }, []);

  return <span>{data}</span>;
}

export default function Index() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8" }}>
      <h1>Welcome to Remix</h1>
      <ul>
        <li>
          <a
            target="_blank"
            href="https://remix.run/tutorials/blog"
            rel="noreferrer"
          >
            15m Quickstart Blog Tutorial
          </a>
        </li>
        <li>
          <a
            target="_blank"
            href="https://remix.run/tutorials/jokes"
            rel="noreferrer"
          >
            Deep Dive Jokes App Tutorial
          </a>
        </li>
        <li>
          <a target="_blank" href="https://remix.run/docs" rel="noreferrer">
            Remix Docs
          </a>
        </li>
      </ul>

      <SetData />

      <div>
        <p>There shouldn't be any errors about hydration.</p>

        <SimpleForm />

        <SimpleForm />
      </div>

      <DeferredForm />
    </div>
  );
}
