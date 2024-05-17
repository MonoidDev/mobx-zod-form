import {
  MobxZodOmittableField,
  MobxOmittableTypes,
} from "@monoid-dev/mobx-zod-form";
import { observer } from "mobx-react";
import { ZodNumber, ZodString } from "zod";

import { AnyInput } from "./AnyInput";
import { NumberInput } from "./NumberInput";
import { StringInput } from "./StringInput";

export const OmittableInput: React.FC<{
  field: MobxZodOmittableField<MobxOmittableTypes>;
}> = observer(({ field }) => {
  if (field.type.unwrap() instanceof ZodString) {
    return <StringInput field={field as any} />;
  } else if (field.type.unwrap() instanceof ZodNumber) {
    return <NumberInput field={field as any} />;
  }

  return (
    <div>
      <div>
        <input
          type="checkbox"
          checked={!field.innerField}
          onChange={(e) =>
            e.target.checked
              ? field.setOutput(null)
              : field.setOutput(
                  field.type.unwrap().getFormMeta().getInitialOutput(),
                )
          }
        />
        omit
      </div>
      {field.innerField ? <AnyInput field={field.innerField as any} /> : null}
    </div>
  );
});
