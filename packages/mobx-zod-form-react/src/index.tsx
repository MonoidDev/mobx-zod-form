import React, { useMemo, useEffect, useContext } from "react";

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

export const FormContext = React.createContext<MobxZodForm<MobxZodTypes>>(
  null as any,
);

export const FormContextProvider = <T extends MobxZodTypes>({
  form,
  children,
}: React.PropsWithChildren<{
  form: MobxZodForm<T>;
}>) => {
  return (
    <FormContext.Provider value={form as any}>{children}</FormContext.Provider>
  );
};

export function useFormContext<T extends MobxZodTypes>(): MobxZodForm<T>;

export function useFormContext<T extends MobxZodTypes>(_t: T): MobxZodForm<T>;

export function useFormContext<T extends MobxZodTypes>(_t?: T): MobxZodForm<T> {
  const context = useContext(FormContext);

  if (!context) {
    throw new Error(
      "Are you calling useFormContext under FormContextProvider?",
    );
  }

  return context as any as MobxZodForm<T>;
}
