import {
  z,
  ZodArray,
  ZodBoolean,
  ZodEnum,
  ZodNullable,
  ZodNumber,
  ZodObject,
  ZodOptional,
  ZodString,
  ZodTypeAny,
  ZodTypeDef,
} from "zod";

export interface MobxZodMetaOptional {
  label?: string;
  description?: string;
}

export interface FormMeta extends MobxZodMetaOptional {
  encode: (input: unknown) => any;
  decode: (output: any) => any;
  /**
   * @returns Get the initial output.
   */
  getInitialOutput: () => any;
}

declare module "zod" {
  interface ZodType<
    Output,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    Def extends ZodTypeDef = ZodTypeDef,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    Input = Output,
  > {
    _formMeta: FormMeta;

    /**
     * Extend the form meta of the type. You can retrieve it later with `getFormMeta`.
     * Sorry we cannot better type the returning type,
     * which means you'll get optional properties when you use them,
     * because `zod` does not give us a chance to use generic here.
     * @param this type
     * @param meta custom partial form meta
     */
    formMeta<T extends Partial<FormMeta>, Z extends ZodTypeAny>(
      this: Z,
      meta: T,
    ): Z;

    getFormMeta(): FormMeta;
  }
}

/**
 * Extend zod so that you can append `mobxZodMeta` onto it.
 * @param zod the z object imported from zod
 */
export function extendZodWithMobxZodForm(zod: typeof z) {
  if (zod.ZodType.prototype.formMeta !== undefined) {
    console.warn(
      "`extendZodWithMobxZodForm` is already called on the same z object. You probably should not call it twice.",
    );
    return;
  }

  Object.defineProperty(zod.ZodType.prototype, "_formMeta", {
    get() {
      return this._def._formMeta || {}; // To match type definition '_formMeta: Readonly<{}>'
    },
  });

  zod.ZodType.prototype.formMeta = function (meta: any) {
    const o = new (this as any).constructor({
      ...this._def,
      _formMeta: {
        ...this._formMeta,
        ...meta,
      },
    });

    return o;
  };

  zod.ZodType.prototype.getFormMeta = function () {
    return resolveDOMFormMeta(this);
  };
}

/**
 * Resolved MobxZodMeta for en/decoding on DOM inputs.
 * Encodes number as decimal strings, and other as-is.
 */
export const resolveDOMFormMeta = (type: ZodTypeAny): FormMeta => {
  const inputFormMeta = type._formMeta as FormMeta;

  return {
    ...inputFormMeta,
    decode(input) {
      if (inputFormMeta?.decode) {
        return inputFormMeta.decode(input);
      }

      if (type instanceof ZodString) {
        return input;
      } else if (type instanceof ZodNumber) {
        if (typeof input === "string") {
          // Decode string-like input

          const trimmed = input.trim();
          if (trimmed.length > 0) {
            const parsed = Number.parseFloat(trimmed);

            if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
              return parsed;
            } else {
              return input;
            }
          } else {
            return undefined;
          }
        }

        return input;
      } else if (type instanceof ZodOptional || type instanceof ZodNullable) {
        if (input == null) {
          return this.getInitialOutput();
        }

        const innerType = type.unwrap();
        const innerDecoded = resolveDOMFormMeta(innerType).decode(input);

        // For innerType is empty string
        if (innerType instanceof ZodString && !innerDecoded) {
          return this.getInitialOutput();
        }

        if (innerDecoded == null) {
          return this.getInitialOutput();
        }

        return innerDecoded;
      } else if (type instanceof ZodObject) {
        if (typeof input === "object") {
          return Object.fromEntries(
            Object.entries(type.shape).map(([key, value]) => [
              key,
              resolveDOMFormMeta(value as any).decode(input[key]),
            ]),
          );
        }
      } else if (type instanceof ZodArray) {
        if (Array.isArray(input)) {
          return input.map((v) =>
            resolveDOMFormMeta(type.element as any).decode(v),
          );
        }
      }

      return input;
    },
    encode(output: any) {
      if (inputFormMeta?.encode) {
        return inputFormMeta.encode(output);
      }

      if (type instanceof ZodString) {
        if (output === empty) {
          return "";
        }

        return output;
      } else if (type instanceof ZodNumber) {
        if (output === empty) {
          return "";
        }

        return output == undefined ? "" : String(output);
      } else if (type instanceof ZodOptional || type instanceof ZodNullable) {
        if (output === empty || output == null) {
          return this.getInitialOutput();
        } else {
          return resolveDOMFormMeta(type.unwrap()).encode(type);
        }
      } else if (type instanceof ZodObject) {
        if (output === empty) {
          return Object.entries(type.shape).map(([key, value]) => [
            key,
            resolveDOMFormMeta(value as any).encode(empty),
          ]);
        }

        return Object.fromEntries(
          Object.entries(type.shape).map(([key, value]) => [
            key,
            resolveDOMFormMeta(value as any).encode(output[key]),
          ]),
        );
      } else if (type instanceof ZodArray) {
        if (type === empty) {
          return [];
        }

        return output.map((o: any) =>
          resolveDOMFormMeta(type.element as any).encode(o),
        );
      }

      return output;
    },
    getInitialOutput() {
      if (type instanceof ZodString) {
        return "";
      } else if (type instanceof ZodNumber) {
        return undefined;
      } else if (type instanceof ZodBoolean) {
        return false;
      } else if (type instanceof ZodEnum) {
        return type.options[0];
      } else if (type instanceof ZodOptional) {
        return undefined;
      } else if (type instanceof ZodNullable) {
        return null;
      } else if (type instanceof ZodObject) {
        return Object.fromEntries(
          Object.entries(type.shape).map(([key, value]) => [
            key,
            resolveDOMFormMeta(value as any).getInitialOutput(),
          ]),
        );
      } else if (type instanceof ZodArray) {
        return [];
      }
    },
  };
};

export const empty = Object.create(null) as any;
