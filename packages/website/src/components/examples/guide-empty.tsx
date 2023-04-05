/* eslint-disable @typescript-eslint/no-unused-vars */

import { empty } from "@monoid-dev/mobx-zod-form";
import { useForm } from "@monoid-dev/mobx-zod-form-react";
import { z } from "zod";

const Form = () => {
  const form = useForm(z.object({ name: z.string(), age: z.number() }), {
    initialOutput: {
      name: "Joe",
      age: empty,
    },
  });

  console.info("should get true:", form.root.fields.age.rawInput === "");
};
