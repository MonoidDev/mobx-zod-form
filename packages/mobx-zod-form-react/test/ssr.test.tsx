import { render } from "@testing-library/react";
import { observer } from "mobx-react";
import ReactDOMServer from "react-dom/server";
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

describe("ssr", () => {
  it("renders SimpleForm", () => {
    // On the server
    const node = (
      <>
        <SimpleForm />
      </>
    );

    const serverHtml = ReactDOMServer.renderToString(node);

    document.body.innerHTML = `<div id="root">${serverHtml}</div>`;

    render(node, {
      hydrate: true,
      container: document.getElementById("root")!,
    });
  });
});
