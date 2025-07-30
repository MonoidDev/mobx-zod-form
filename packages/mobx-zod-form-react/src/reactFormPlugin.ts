import type { MobxZodPlugin, MobxZodTypes } from "@monoid-dev/mobx-zod-form";

import type { ReactForm } from "./ReactForm";

export type ReactFormPluginHookedEvents =
  | "onStart"
  | "onEnd"
  | "onBeforeValidate"
  | "onAfterValidate"
  | "onBeforeSubmit"
  | "onAfterSubmit";

export type ReactFormPluginEventListenerMap<T extends MobxZodTypes> = {
  [K in ReactFormPluginHookedEvents]: (form: ReactForm<T>) => void;
};

export type ReactFormPluginEventListener = (form: any) => void;

export type ReactFormPluginControl<T extends MobxZodTypes> = {
  setForm: (f: ReactForm<T>) => void;
  addEventListener: <K extends ReactFormPluginHookedEvents>(
    event: K,
    handler: ReactFormPluginEventListenerMap<T>[K],
  ) => void;
  removeEventListener: <K extends ReactFormPluginHookedEvents>(
    event: K,
    handler: ReactFormPluginEventListenerMap<T>[K],
  ) => void;
};

const eventListenerOrder: Record<
  ReactFormPluginHookedEvents,
  "direct" | "inverted"
> = {
  onStart: "direct",
  onEnd: "inverted",
  onBeforeValidate: "direct",
  onAfterValidate: "inverted",
  onBeforeSubmit: "direct",
  onAfterSubmit: "inverted",
};

export const createReactFormPlugin = <T extends MobxZodTypes>() => {
  const hookedEventsRegistry = new Map<
    ReactFormPluginHookedEvents,
    ReactFormPluginEventListener[]
  >();

  let form!: ReactForm<T>;

  const handleEvent = (ev: ReactFormPluginHookedEvents) => {
    (hookedEventsRegistry.get(ev) ?? []).forEach((listener) => {
      if (!form) {
        throw new Error(
          `ReactForm plugin event "${ev}" was triggered before the form was set.`,
        );
      }

      listener(form);
    });
  };

  const plugin: MobxZodPlugin = {
    name: "react-form-plugin",
    onStart: (_) => handleEvent("onStart"),
    onEnd: (_) => handleEvent("onEnd"),
    onBeforeValidate: (_) => handleEvent("onBeforeValidate"),
    onAfterValidate: (_) => handleEvent("onAfterValidate"),
    onBeforeSubmit: (_) => handleEvent("onBeforeSubmit"),
    onAfterSubmit: (_) => handleEvent("onAfterSubmit"),
  };

  const control: ReactFormPluginControl<T> = {
    setForm: (f) => {
      form = f;
    },
    addEventListener: <K extends ReactFormPluginHookedEvents>(
      event: K,
      handler: ReactFormPluginEventListenerMap<T>[K],
    ) => {
      const order = eventListenerOrder[event];

      hookedEventsRegistry.set(event, [
        ...(order === "inverted" ? [handler] : []),
        ...(hookedEventsRegistry.get(event) ?? []),
        ...(order === "direct" ? [handler] : []),
      ]);
    },
    removeEventListener: <K extends ReactFormPluginHookedEvents>(
      event: K,
      handler: ReactFormPluginEventListenerMap<T>[K],
    ) => {
      const listeners = hookedEventsRegistry.get(event);
      if (listeners) {
        hookedEventsRegistry.set(
          event,
          listeners.filter((l) => l !== handler),
        );
      }
    },
  };

  return {
    plugin,
    control,
  };
};
