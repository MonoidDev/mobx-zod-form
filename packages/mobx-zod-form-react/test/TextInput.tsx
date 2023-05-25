import { MobxZodField } from "@monoid-dev/mobx-zod-form";
import { observer } from "mobx-react";
import { ZodString, ZodNumber, ZodOptional } from "zod";

import { getForm } from "../src";

export const TextInput = observer(
  ({
    field,
  }: {
    field: MobxZodField<
      ZodString | ZodNumber | ZodOptional<ZodNumber> | ZodOptional<ZodString>
    >;
  }) => {
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
