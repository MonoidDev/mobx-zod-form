import {
  z,
  ZodAny,
  ZodArray,
  ZodBoolean,
  ZodDiscriminatedUnion,
  ZodEffects,
  ZodEnum,
  ZodLiteral,
  ZodNullable,
  ZodNumber,
  ZodObject,
  ZodOptional,
  ZodString,
  ZodTypeAny,
  ZodTypeDef,
} from "zod";

import { MobxFatalError, MobxZodDecodeError } from "./errors";

export type SafeDecodeResultSuccess<Decoded> = {
  success: true;
  data: Decoded;
};

export type SafeDecodeResultError<RawInput> = {
  success: false;
  input: RawInput;
};

export type SafeDecodeResult<RawInput, Decoded> =
  | SafeDecodeResultSuccess<Decoded>
  | SafeDecodeResultError<RawInput>;

/**
 *
 * @param result
 * @returns The data if success, throws if MobxZodDecodeError not.
 */
export const unwrapDecodeResult = <RawInput, Decoded>(
  result: SafeDecodeResult<RawInput, Decoded>,
): Decoded => {
  if (result.success) {
    return result.data;
  } else {
    throw new MobxZodDecodeError(result);
  }
};

/**
 *
 * @param result
 * @param mapper
 * @param defaultValue
 * @returns The return value of mapper applied to data if success, defaultValue if not.
 */
export const mapDecodeResult = <RawInput, Decoded, O>(
  result: SafeDecodeResult<RawInput, Decoded>,
  mapper: (data: Decoded) => O,
  defaultValue: O,
) => {
  if (result.success) {
    return mapper(result.data);
  } else {
    return defaultValue;
  }
};

export const decodeResultEqual = <RawInput, Decoded>(
  result: SafeDecodeResult<RawInput, Decoded>,
  value: Decoded,
  defaultValue = false,
) => {
  if (result.success) {
    return value === result.data;
  } else {
    return defaultValue;
  }
};

export interface FormMeta {
  label?: string;
  description?: string;
  encode: (output: unknown) => any;

  safeDecode: (
    input: unknown,
    passthrough?: boolean, // Whether to pass failed input as data. Useful to be handled by zod.
  ) => SafeDecodeResult<unknown, any>;
  decode: (input: any) => any;
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
  const inputFormMeta = type._formMeta as Partial<FormMeta>;

  return {
    ...inputFormMeta,
    safeDecode(input, passthrough: boolean = false) {
      if (inputFormMeta?.safeDecode) {
        return inputFormMeta.safeDecode(input, passthrough);
      }

      if (type instanceof ZodString) {
        if (typeof input === "string") {
          return {
            success: true,
            data: input,
          };
        }
      } else if (type instanceof ZodNumber) {
        if (typeof input === "string") {
          // Decode string-like input

          const trimmed = input.trim();
          if (trimmed.length > 0) {
            const parsed = Number.parseFloat(trimmed);

            if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
              return {
                success: true,
                data: parsed,
              };
            }
          }
        } else if (typeof input === "number") {
          return {
            success: true,
            data: input,
          };
        }
      } else if (type instanceof ZodBoolean) {
        if (typeof input === "boolean") {
          return {
            success: true,
            data: input,
          };
        }
      } else if (type instanceof ZodOptional || type instanceof ZodNullable) {
        if (input == null) {
          return {
            success: true,
            data: this.getInitialOutput(),
          };
        }

        const innerType = type.unwrap();
        const innerDecoded = resolveDOMFormMeta(innerType).safeDecode(input);

        // For innerType is empty string, cast it to null
        if (
          innerType instanceof ZodString &&
          innerDecoded.success &&
          !innerDecoded.data
        ) {
          return {
            success: true,
            data: this.getInitialOutput(),
          };
        }

        if (innerDecoded == null) {
          return {
            success: true,
            data: this.getInitialOutput(),
          };
        }

        return innerDecoded;
      } else if (type instanceof ZodLiteral) {
        if (input === type.value) {
          return {
            success: true,
            data: input,
          };
        }
      } else if (type instanceof ZodAny) {
        return {
          success: true,
          data: input,
        };
      } else if (type instanceof ZodObject) {
        if (typeof input === "object" && input !== null) {
          try {
            const decoded = Object.fromEntries(
              Object.entries(type.shape).map(([key, value]) => [
                key,
                unwrapDecodeResult(
                  resolveDOMFormMeta(value as any).safeDecode(
                    (input as Record<string, any>)[key],
                    passthrough,
                  ),
                ),
              ]),
            );
            return {
              success: true,
              data: decoded,
            };
          } catch (e) {
            if (e instanceof MobxZodDecodeError) {
              return {
                success: false,
                input,
              };
            }
            throw e;
          }
        }
      } else if (type instanceof ZodArray) {
        if (Array.isArray(input)) {
          try {
            return {
              success: true,
              data: input.map(
                (v) =>
                  unwrapDecodeResult(
                    resolveDOMFormMeta(type.element as any).safeDecode(
                      v,
                      passthrough,
                    ),
                  ),
                passthrough,
              ),
            };
          } catch (e) {
            if (e instanceof MobxZodDecodeError) {
              return {
                success: false,
                input,
              };
            }
            throw e;
          }
        }
      } else if (type instanceof ZodDiscriminatedUnion) {
        const discriminatorData = (input as any)?.[type.discriminator];
        const currentOption = type.optionsMap.get(discriminatorData);

        if (currentOption) {
          return resolveDOMFormMeta(currentOption).safeDecode(
            input,
            passthrough,
          );
        }
      } else if (type instanceof ZodEffects) {
        return resolveDOMFormMeta(type.innerType()).safeDecode(
          input,
          passthrough,
        );
      } else {
        throw new MobxFatalError(
          `${type.constructor.name} is not handled. Is that type supported?`,
        );
      }

      if (!passthrough) {
        return {
          success: false,
          input,
        };
      } else {
        return {
          success: true,
          data: input,
        };
      }
    },
    decode(input) {
      if (inputFormMeta?.decode) {
        return inputFormMeta.decode(input);
      }

      const decodeResult = this.safeDecode(input);
      return unwrapDecodeResult(decodeResult);
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
      } else if (type instanceof ZodBoolean) {
        return output;
      } else if (type instanceof ZodOptional || type instanceof ZodNullable) {
        if (output === empty || output == null) {
          return this.getInitialOutput();
        } else {
          return resolveDOMFormMeta(type.unwrap()).encode(output);
        }
      } else if (type instanceof ZodLiteral) {
        return output;
      } else if (type instanceof ZodAny) {
        return output;
      } else if (type instanceof ZodObject) {
        if (output === empty) {
          return this.getInitialOutput();
        }

        return Object.fromEntries(
          Object.entries(type.shape).map(([key, value]) => [
            key,
            resolveDOMFormMeta(value as any).encode(output[key]),
          ]),
        );
      } else if (type instanceof ZodArray) {
        if (output === empty) {
          return [];
        }

        return output.map((o: any) =>
          resolveDOMFormMeta(type.element as any).encode(o),
        );
      } else if (type instanceof ZodDiscriminatedUnion) {
        if (output === empty) {
          return this.getInitialOutput();
        }

        const currentDiscriminator = output[type.discriminator];
        const currentOption = type.optionsMap.get(currentDiscriminator);

        if (currentOption) {
          return resolveDOMFormMeta(currentOption).encode(output);
        }
      } else if (type instanceof ZodEffects) {
        return resolveDOMFormMeta(type.innerType()).encode(output);
      }

      throw new MobxFatalError(
        `${type.constructor.name} is not handled. Is that type supported?`,
      );
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
      } else if (type instanceof ZodLiteral) {
        return type.value;
      } else if (type instanceof ZodAny) {
        return undefined;
      } else if (type instanceof ZodObject) {
        return Object.fromEntries(
          Object.entries(type.shape).map(([key, value]) => [
            key,
            resolveDOMFormMeta(value as any).getInitialOutput(),
          ]),
        );
      } else if (type instanceof ZodArray) {
        return [];
      } else if (type instanceof ZodDiscriminatedUnion) {
        const defaultOption = type.options[0];
        return resolveDOMFormMeta(defaultOption).encode(empty);
      } else if (type instanceof ZodEffects) {
        return resolveDOMFormMeta(type.innerType()).getInitialOutput();
      }

      throw new MobxFatalError(
        `${type.constructor.name} is not handled. Is that type supported?`,
      );
    },
  };
};

export const empty = Object.create(null) as any;
