import { MobxZodField } from "@monoid-dev/mobx-zod-form";
import { getForm } from "@monoid-dev/mobx-zod-form-react";
import { observer } from "mobx-react";
import { ZodBoolean } from "zod";

export const BooleanInput: React.FC<{
  field: MobxZodField<ZodBoolean>;
}> = observer(({ field }) => {
  return <input {...getForm(field).bindField(field, { type: "checkbox" })} />;
});
