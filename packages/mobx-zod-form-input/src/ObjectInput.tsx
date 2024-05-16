import { MobxZodObjectField } from "@monoid-dev/mobx-zod-form";
import { SomeZodObject, ZodNumber, ZodObject, ZodString } from "zod";

import { Cell } from "./Cell";
import { EnumInput } from "./EnumInput";
import { NumberInput } from "./NumberInput";
import { StringInput } from "./StringInput";

export const ObjectInput: React.FC<{
  field: MobxZodObjectField<SomeZodObject>;
}> = ({ field }) => {
  return (
    <Cell
      field={field}
      childrenWrapperProps={{ style: { paddingLeft: "1rem" } }}
    >
      {Object.entries(field.fields).map(([key, field]) =>
        field.type instanceof ZodString ? (
          <StringInput key={key} field={field as any} />
        ) : field.type instanceof ZodNumber ? (
          <NumberInput key={key} field={field as any} />
        ) : field.type instanceof ZodObject ? (
          <ObjectInput key={key} field={field as any} />
        ) : (
          <EnumInput key={key} field={field as any} />
        ),
      )}
    </Cell>
  );
};
