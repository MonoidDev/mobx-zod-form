import { useMemo, useEffect } from "react";

import { MobxZodForm, MobxZodFormOptions } from "@monoid-dev/mobx-zod-form";
import { type MobxZodTypes } from "@monoid-dev/mobx-zod-form";

export const useForm = <T extends MobxZodTypes>(
  schema: T,
  options: MobxZodFormOptions<T> = {},
) => {
  const form = useMemo(() => new MobxZodForm(schema, options), []);
  useEffect(() => {
    return form.startValidationWorker();
  }, []);

  return form;
};
