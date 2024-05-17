import { MobxZodField } from "@monoid-dev/mobx-zod-form";
import { getForm } from "@monoid-dev/mobx-zod-form-react";
import { observer } from "mobx-react";
import { ZodEnum } from "zod";

export const EnumInput: React.FC<{
  field: MobxZodField<ZodEnum<[string, ...string[]]>>;
}> = observer(({ field }) => {
  return (
    <select {...(getForm(field).bindField(field, { type: "select" }) as any)}>
      {field.type.options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
});
