import { useMemo, useEffect } from "react";

import { MobxZodForm, MobxZodFormOptions } from "./MobxZodForm";
import { type MobxZodTypes } from "./types";

export const useForm = <T extends MobxZodTypes>(
  schema: T,
  options: MobxZodFormOptions<T> = {}
) => {
  const form = useMemo(() => new MobxZodForm(schema, options), []);
  useEffect(() => {
    return form.startValidationTask();
  }, []);

  return form;
};
