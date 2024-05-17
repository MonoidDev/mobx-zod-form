import { MobxZodObjectField } from "@monoid-dev/mobx-zod-form";
import { SomeZodObject } from "zod";

import { AnyInput } from "./AnyInput";
import { Cell } from "./Cell";

export const ObjectInput: React.FC<{
  field: MobxZodObjectField<SomeZodObject>;
}> = ({ field }) => {
  return (
    <div style={{ paddingLeft: "1rem" }}>
      {Object.entries(field.fields).map(([key, field]) => (
        <Cell key={key} field={field}>
          <AnyInput field={field} />
        </Cell>
      ))}
    </div>
  );
};
