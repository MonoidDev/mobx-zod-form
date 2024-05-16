import { MobxZodField } from "@monoid-dev/mobx-zod-form";
import { getForm } from "@monoid-dev/mobx-zod-form-react";
import { observer } from "mobx-react";
import { ZodString } from "zod";

import { Cell } from "./Cell";

export const StringInput: React.FC<{
  field: MobxZodField<ZodString>;
}> = observer(({ field }) => {
  return (
    <Cell field={field}>
      <input {...getForm(field).bindField(field, { type: "text" })} />
    </Cell>
  );
});
