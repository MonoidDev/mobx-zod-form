import { useState } from "react";

import {
  MobxZodOmittableField,
  MobxOmittableTypes,
  getDecodeResult,
} from "@monoid-dev/mobx-zod-form";
import { observer } from "mobx-react";

import { AnyInput } from "./AnyInput";

export const OmittableInput: React.FC<{
  field: MobxZodOmittableField<MobxOmittableTypes>;
}> = observer(({ field }) => {
  return (
    <div>
      <div>
        <input
          type="checkbox"
          checked={!field.innerField}
          onChange={(e) =>
            e.target.checked
              ? field.setOutput(null)
              : field.setOutput(field.type.getFormMeta().getInitialOutput())
          }
        />
        Omit
      </div>
      {field.innerField ? <AnyInput field={field.innerField as any} /> : null}
    </div>
  );
});
