import {
  MobxZodField,
  unwrapZodType,
  type MobxZodTypes,
} from "@monoid-dev/mobx-zod-form";
import {
  MobxZodForm,
  type MobxZodFormOptions,
} from "@monoid-dev/mobx-zod-form";
import {
  ZodArray,
  ZodBoolean,
  ZodError,
  ZodNumber,
  ZodString,
  ZodTypeAny,
} from "zod";

import { UnsupportedInputType } from "./errors";

export interface ReactFormOptions<T extends MobxZodTypes>
  extends MobxZodFormOptions<T> {}

export interface BindFormOptions<T extends MobxZodTypes> {
  onSubmit?: (
    values: T["_output"],
    e: React.FormEvent<HTMLFormElement>,
  ) => void | Promise<void>;
  onSubmitError?: (
    errors: ZodError<T>,
    e: React.FormEvent<HTMLFormElement>,
  ) => void | Promise<void>;
}

export type BindFieldPrimitive = string | number | boolean;

export type BindInputOptions =
  | {
      type: "checkbox";
      value?: BindFieldPrimitive;
    }
  | {
      type: "radio";
      value?: BindFieldPrimitive;
    }
  | {
      type:
        | "color"
        | "date"
        | "datetime-local"
        | "email"
        | "file"
        | "month"
        | "number"
        | "password"
        | "range"
        | "search"
        | "tel"
        | "text"
        | "time"
        | "url"
        | "week"
        | "textarea"
        | "select";
    };

export class ReactForm<T extends MobxZodTypes> extends MobxZodForm<T> {
  bindForm(options: BindFormOptions<T> = {}): React.ComponentProps<"form"> {
    return {
      onSubmit: async (e) => {
        e.preventDefault();
        e.stopPropagation();

        await this.handleSubmit(async () => {
          if (this.parsed.success) {
            await options?.onSubmit?.(this.parsed.data, e);
          } else {
            await options?.onSubmitError?.(this.parsed.error, e);
          }
        });
      },
      action: "#",
    };
  }

  bindField<T extends ZodTypeAny>(
    field: MobxZodField<T>,
    options: BindInputOptions = { type: "text" },
  ): React.ComponentProps<"input"> {
    const getPropsForType = (): React.ComponentProps<"input"> => {
      const fieldType = unwrapZodType(field.type);

      switch (options.type) {
        case "checkbox":
          if (fieldType instanceof ZodArray) {
            const current = field.decodeResult.success
              ? (field.decodeResult.data as any[])
              : [];
            const checked = current.includes(options.value);

            return {
              checked:
                field.decodeResult.success &&
                (field.decodeResult.data as any[])?.includes(options.value),
              onChange: () =>
                field.setOutput(
                  checked
                    ? current.filter((v) => v !== options.value)
                    : [...current, options.value],
                ),
            };
          } else if (fieldType instanceof ZodBoolean) {
            return {
              checked: field.decodeResult.success && !!field.decodeResult.data,
              onChange: (e) => {
                field.setOutput(e.target.checked);
              },
            };
          }
          break;
        case "radio":
          if (
            fieldType instanceof ZodString ||
            fieldType instanceof ZodBoolean ||
            fieldType instanceof ZodNumber
          ) {
            return {
              checked:
                field.decodeResult.success &&
                field.decodeResult.data === options.value,
              onChange: () => {
                field.setOutput(options.value);
              },
            };
          }
        case "color":
        case "date":
        case "datetime-local":
        case "email":
        case "file":
        case "month":
        case "number":
        case "password":
        case "range":
        case "search":
        case "tel":
        case "text":
        case "time":
        case "url":
        case "week":
        case "textarea":
        case "select":
          return {
            value: field.rawInput as any,
            onChange: (e) => {
              field.setOutput(e.target.value);
            },
          };
      }

      throw new UnsupportedInputType(options.type, fieldType);
    };

    return {
      name: field.path.join("."),
      type: options.type,
      onBlur: () => field.setTouched(true),
      ...getPropsForType(),
    };
  }
}
