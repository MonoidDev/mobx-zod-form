import { AsyncLocalStorage } from "async_hooks";

import {
  MobxZodFormLocalStorage,
  createMobxZodFormLocalStorage,
  setAsyncLocalStorage,
} from "@monoid-dev/mobx-zod-form";
import { render } from "@testing-library/react";
import { observer } from "mobx-react";
import ReactDOMServer from "react-dom/server";
import { beforeAll, describe, it } from "vitest";
import { z } from "zod";

import { TextInput } from "./TextInput";
import { useForm } from "../src";
import {
  HydrateMobxZodForm,
  getHydrateScript,
} from "../src/HydrateMobxZodForm";

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

const asl = new AsyncLocalStorage<MobxZodFormLocalStorage>();

beforeAll(() => {
  setAsyncLocalStorage(asl);
});

describe("ssr", () => {
  it("renders SimpleForm", () => {
    // On the server
    const node = (
      <>
        <HydrateMobxZodForm />
        <SimpleForm />
      </>
    );

    const [hydrateScript, serverHtml] = asl.run(
      createMobxZodFormLocalStorage(),
      () => [getHydrateScript(), ReactDOMServer.renderToString(node)],
    );

    // On the client
    setAsyncLocalStorage(undefined);
    document.body.innerHTML = `<div id="root">${serverHtml}</div>`;
    // It seems the hydrate script is not executed by jsdom. We need to manually execute it.
    eval(hydrateScript);

    render(node, {
      hydrate: true,
      container: document.getElementById("root")!,
    });
  });
});
