import { MobxZodField } from "@monoid-dev/mobx-zod-form";
import { getForm } from "@monoid-dev/mobx-zod-form-react";
import { observer } from "mobx-react";
import { ZodString } from "zod";

export const StringInput: React.FC<{
  field: MobxZodField<ZodString>;
}> = observer(({ field }) => {
  return <input {...getForm(field).bindField(field, { type: "text" })} />;
});
