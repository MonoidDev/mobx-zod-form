import {
  isDiscriminatorType,
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
  ZodEnum,
  ZodError,
  ZodNumber,
  ZodString,
  ZodTypeAny,
} from "zod";

import { UnsupportedInputType } from "./errors";

export interface ReactFormOptions<T extends MobxZodTypes>
  extends MobxZodFormOptions<T> {
  /**
   * When input `initialOutput` changes (per useEffect), set the output as the new one.
   * @default: false
   */
  enableReinitialize?: boolean;
}

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

export type BindFieldResult = {};

export class ReactForm<T extends MobxZodTypes> extends MobxZodForm<T> {
  _boundSubmitForm?: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  _submitFuture?: PromiseWithResolvers<void>;

  bindForm(options: BindFormOptions<T> = {}): React.ComponentProps<"form"> {
    this._boundSubmitForm = async (e: React.FormEvent<HTMLFormElement>) => {
      await this.handleSubmit(async () => {
        if (this.parsed.success) {
          await options?.onSubmit?.(this.parsed.data, e);
        } else {
          await options?.onSubmitError?.(this.parsed.error, e);
        }
      });
    };

    return {
      ref: (element) => {
        this.element = element;
      },
      onSubmit: async (e) => {
        e.preventDefault();
        e.stopPropagation();

        await this._boundSubmitForm!(e).then(
          () => {
            this._submitFuture?.resolve();
          },
          (e) => {
            this._submitFuture?.reject(e);
          },
        );
      },
      action: "#",
    };
  }

  /**
   * Programatically submit the form.
   *
   * 1. Triggers a submit event on the form.
   * 2. Await the submission handler to resolve or reject.
   */
  async submitForm() {
    if (!this._boundSubmitForm || !this.element) {
      throw new Error("bindForm must be called before submitForm");
    }

    this._submitFuture = Promise.withResolvers();

    this.element?.dispatchEvent(
      new Event("submit", { cancelable: true, bubbles: true }),
    );
    await this._submitFuture.promise;
  }

  static getDomName<T extends ZodTypeAny>(field: MobxZodField<T>) {
    return field.path.join(".");
  }

  static getDomId<T extends ZodTypeAny>(
    field: MobxZodField<T>,
    options: BindInputOptions = { type: "text" },
  ) {
    const baseId = this.getDomName(field) + "__" + field.uniqueId;

    switch (options.type) {
      case "checkbox":
      case "radio":
        return `${baseId}__${options.value}`;
      default:
        return baseId;
    }
  }

  bindLabel<T extends ZodTypeAny>(
    field: MobxZodField<T>,
    options: BindInputOptions = { type: "text" },
  ): React.ComponentProps<"label"> {
    return {
      htmlFor: ReactForm.getDomId(field, options),
      children: field.type.getFormMeta().label,
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
            fieldType instanceof ZodNumber ||
            fieldType instanceof ZodEnum ||
            isDiscriminatorType(fieldType)
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
      name: ReactForm.getDomName(field),
      id: ReactForm.getDomId(field, options),
      type: options.type,
      onBlur: () => field.setTouched(true),
      ref(element) {
        field.element = element;
      },
      ...getPropsForType(),
    };
  }

  bindTextArea<T extends ZodTypeAny>(field: MobxZodField<T>) {
    return {
      name: ReactForm.getDomName(field),
      id: ReactForm.getDomId(field),
      onBlur: () => field.setTouched(true),
      ref(element) {
        field.element = element;
      },
      value: field.rawInput as any,
      onChange: (e) => {
        field.setOutput(e.target.value);
      },
    } satisfies React.ComponentProps<"textarea">;
  }
}
