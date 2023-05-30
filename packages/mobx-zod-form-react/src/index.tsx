import React, { useMemo, useEffect, useContext } from "react";

import { MobxZodField, type MobxZodTypes } from "@monoid-dev/mobx-zod-form";
import { ZodTypeAny } from "zod";

import { NotReactFormField } from "./errors";
import { ReactForm, ReactFormOptions } from "./ReactForm";

export { ReactForm, type ReactFormOptions };

/**
 * The most usual way to initialize a form in a React functional component.
 *
 * @param schema
 * @param options
 * @returns the form instance to build your observable React component.
 */
export const useForm = <T extends MobxZodTypes>(
  schema: T,
  options: ReactFormOptions<T> = {},
) => {
  const defaultOptions = useFormOptionsContext();

  const form = useMemo(
    () =>
      new ReactForm(schema, {
        ...defaultOptions,
        ...options,
        setActionOptions: {
          ...defaultOptions.setActionOptions,
          ...options.setActionOptions,
        },
        plugins: [
          ...(defaultOptions.plugins ?? []),
          ...(options?.plugins ?? []),
        ],
      }),
    [],
  );

  useEffect(() => form.start(), []);

  useEffect(() => {
    if (options.enableReinitialize && "initialOutput" in options) {
      form.root.setOutput(options.initialOutput as never);
    }
  }, [options.initialOutput]);

  return form;
};

export const FormContext = React.createContext<ReactForm<MobxZodTypes>>(
  null as any,
);

export const FormContextProvider = <T extends MobxZodTypes>({
  form,
  children,
}: React.PropsWithChildren<{
  form: ReactForm<T>;
}>) => {
  return (
    <FormContext.Provider value={form as any}>{children}</FormContext.Provider>
  );
};

export function useFormContext<T extends MobxZodTypes>(): ReactForm<T>;

export function useFormContext<T extends MobxZodTypes>(_t: T): ReactForm<T>;

export function useFormContext<T extends MobxZodTypes>(_t?: T): ReactForm<T> {
  const context = useContext(FormContext);

  if (!context) {
    throw new Error(
      "Are you calling useFormContext under FormContextProvider?",
    );
  }

  return context as any as ReactForm<T>;
}

export const getForm = (f: MobxZodField<ZodTypeAny>) => {
  if (f.form && f.form instanceof ReactForm) {
    return f.form;
  } else {
    throw new NotReactFormField(f);
  }
};

export const FormOptionsContext = React.createContext<
  ReactFormOptions<MobxZodTypes>
>({});

export const useFormOptionsContext = () => useContext(FormOptionsContext);

export const FormOptionsProvider = <T extends MobxZodTypes>({
  options,
  children,
}: React.PropsWithChildren<{ options: ReactFormOptions<T> }>) => {
  return (
    <FormOptionsContext.Provider value={options}>
      {children}
    </FormOptionsContext.Provider>
  );
};
