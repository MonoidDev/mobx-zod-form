import React from "react";

import type { MobxZodField } from "@monoid-dev/mobx-zod-form";
import { getForm } from "@monoid-dev/mobx-zod-form-react";
import { observer } from "mobx-react";
import type { z } from "zod";

export type CellProps = React.PropsWithChildren<{
  field: MobxZodField<z.ZodTypeAny>;
  childrenWrapperProps?: React.ComponentProps<"div">;
}>;

export const Cell: React.FC<CellProps> = observer(
  ({ field, children, childrenWrapperProps }) => {
    const boundLabelProps = getForm(field).bindLabel(field);

    return (
      <div>
        <label
          {...{
            ...boundLabelProps,
            children: boundLabelProps.children || field.path.at(-1),
          }}
        />

        <div {...childrenWrapperProps}>{children}</div>

        {[...field.errorMessages, ...field.extraErrorMessages].map(
          (message, i) => (
            <div key={i} style={{ color: "red" }}>
              {message}
            </div>
          ),
        )}
      </div>
    );
  },
);
