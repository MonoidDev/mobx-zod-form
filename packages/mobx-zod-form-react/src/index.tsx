import React, { useMemo, useEffect, useContext, useId } from "react";

import { MobxZodField, type MobxZodTypes } from "@monoid-dev/mobx-zod-form";
import { MobxZodPluginHandlerName } from "@monoid-dev/mobx-zod-form";
import type { ZodTypeAny } from "zod";

import { NotReactFormField } from "./errors";
import { ReactForm, ReactFormOptions } from "./ReactForm";
import {
  createReactFormPlugin,
  type ReactFormPluginEventListenerMap,
} from "./reactFormPlugin";

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

  const id = useId();

  const form = useMemo(() => {
    const { control, plugin } = createReactFormPlugin<T>();

    const f = new ReactForm<T>(
      schema,
      {
        id,
        ...defaultOptions,
        ...options,
        setActionOptions: {
          ...defaultOptions.setActionOptions,
          ...options.setActionOptions,
        },
        plugins: [
          plugin,
          ...(defaultOptions.plugins ?? []),
          ...(options?.plugins ?? []),
        ],
      },
      control,
    );

    control.setForm(f);

    return f;
  }, []);

  useEffect(() => form.start(), [form]);

  useEffect(() => {
    if (options.enableReinitialize && "initialOutput" in options) {
      form.withSetActionOptions({ setDirty: false }, () => {
        form.root.setOutput(options.initialOutput as never);
      });
    }
  }, [options.initialOutput, form]);

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

/**
 * Listen to form event for the current component.
 */
export const useFormEvent = <
  T extends MobxZodTypes,
  K extends MobxZodPluginHandlerName,
>(
  form: ReactForm<T>,
  event: K,
  handler: ReactFormPluginEventListenerMap<T>[K],
  deps: React.DependencyList = [],
) => {
  useEffect(() => {
    form._pluginControl.addEventListener(event, handler);
    return () => {
      form._pluginControl.removeEventListener(event, handler);
    };
  }, deps);
};
