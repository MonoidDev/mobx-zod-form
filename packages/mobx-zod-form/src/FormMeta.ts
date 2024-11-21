import {
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
} from "zod";

import { MobxFatalError, MobxZodDecodeError } from "./errors";
import { MobxZodBox, unwrapZodType } from "./zod-extra";

export type SafeDecodeResultSuccess<Decoded> = {
  success: true;
  data: Decoded;
};

export type SafeDecodeResultError<RawInput> = {
  success: false;
  input: RawInput;
};

/**
 * A discriminated union for decode reuslt, matched against `success: boolean`.
 */
export type SafeDecodeResult<RawInput, Decoded> =
  | SafeDecodeResultSuccess<Decoded>
  | SafeDecodeResultError<RawInput>;

/**
 * An easy way to get your decoded data if you believe it is `success: true`
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

export const decodeResultIsSuccessfulAnd = <RawInput, Decoded>(
  result: SafeDecodeResult<RawInput, Decoded>,
  predicate: (data: Decoded) => boolean,
) => {
  return result.success && predicate(result.data);
};

export const getDecodeResult = <RawInput, Decoded>(
  result: SafeDecodeResult<RawInput, Decoded>,
) => getDecodeResultOr(result, undefined);

export const getDecodeResultOr = <RawInput, Decoded, O>(
  result: SafeDecodeResult<RawInput, Decoded>,
  defaultValue: O,
) =>
  mapDecodeResult<RawInput, Decoded, Decoded | O>(
    result,
    (v) => v,
    defaultValue,
  );

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

/**
 * Metadata associated with the Zod type definition.
 * You can extend the interface to add whatever information you need.
 * Notice for `label`, `description`, `mobx-zod-form` itself doesn't use them,
 * but you may build your UI based on them.
 */
export interface FormMeta {
  /**
   * The label associated with the field.
   */
  label?: string;
  /**
   * The description associated with the field
   */
  description?: string;

  /**
   * @internal
   * @param output
   * @returns
   */
  encode: (output: unknown) => any;

  /**
   * @internal
   * @param input
   * @param passthrough
   * @returns
   */
  safeDecode: (
    input: unknown,
    passthrough?: boolean, // Whether to pass failed input as data. Useful to be handled by zod.
  ) => SafeDecodeResult<unknown, any>;

  /**
   * @internal
   * @param input
   * @returns
   */
  decode: (input: any) => any;
  /**
   * The initial output for this field. By default, a reasonable default value is given.
   * @see TODO: explain initialOutput
   * @returns Get the initial output.
   */
  getInitialOutput: () => any;
}

/**
 * @internal
 * @param type
 * @returns
 */
export const resolveFormMeta = (type: ZodTypeAny) => {
  let formMeta = type._formMeta as Partial<FormMeta>;

  if (type instanceof ZodOptional || type instanceof ZodNullable) {
    formMeta = {
      ...resolveFormMeta(type.unwrap()),
      ...formMeta,
    };
  } else if (type instanceof ZodEffects) {
    formMeta = {
      ...resolveFormMeta(type.innerType()),
      ...formMeta,
    };
  }

  return formMeta;
};

/**
 * @internal
 * Resolved MobxZodMeta for en/decoding on DOM inputs.
 * Encodes number as decimal strings, and other as-is.
 */
export const resolveDOMFormMeta = (type: ZodTypeAny): FormMeta => {
  let inputFormMeta = resolveFormMeta(type);

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
            const parsed = Number(trimmed);

            if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
              return {
                success: true,
                data: parsed,
              };
            }
          } else if (passthrough) {
            // "" -> undefined
            return {
              success: true,
              data: undefined,
            };
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
      } else if (type instanceof ZodEnum) {
        if (type.options.includes(input)) {
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

        const innerType = unwrapZodType(type);

        // For innerType is empty string, cast it to null
        if (innerType instanceof ZodString && !input) {
          return {
            success: true,
            data: this.getInitialOutput(),
          };
        }

        // For innerType is empty number, cast it to null too.
        if (innerType instanceof ZodNumber) {
          const innerDecoded = resolveDOMFormMeta(innerType).safeDecode(
            input,
            true,
          );
          if (innerDecoded.success && innerDecoded.data === undefined) {
            return {
              success: true,
              data: this.getInitialOutput(),
            };
          }
        }

        return resolveDOMFormMeta(innerType).safeDecode(input, passthrough);
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
      } else if (type instanceof MobxZodBox) {
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
        if (output === empty || output == null) {
          return "";
        }

        return output;
      } else if (type instanceof ZodNumber) {
        if (output === empty || output == null) {
          return "";
        }

        return String(output);
      } else if (type instanceof ZodBoolean) {
        if (output === empty) {
          return undefined;
        }

        return output;
      } else if (type instanceof ZodEnum) {
        if (output === empty) {
          return undefined;
        }

        return output;
      } else if (type instanceof ZodOptional || type instanceof ZodNullable) {
        const innerType = unwrapZodType(type);

        if (output === empty || output == null) {
          if (
            innerType instanceof ZodString ||
            innerType instanceof ZodNumber
          ) {
            return resolveDOMFormMeta(innerType).encode(output);
          }

          return this.getInitialOutput();
        } else {
          return resolveDOMFormMeta(innerType).encode(output);
        }
      } else if (type instanceof ZodLiteral) {
        if (output === empty) {
          return undefined;
        }

        return output;
      } else if (type instanceof ZodAny) {
        if (output === empty) {
          return undefined;
        }

        return output;
      } else if (type instanceof ZodObject) {
        if (output === empty) {
          const initialOutput = this.getInitialOutput();

          return Object.fromEntries(
            Object.entries(type.shape).map(([key, value]) => [
              key,
              resolveDOMFormMeta(value as any).encode(initialOutput[key]),
            ]),
          );
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
      } else if (type instanceof MobxZodBox) {
        if (output === empty) {
          return this.getInitialOutput();
        }

        return output;
      }

      throw new MobxFatalError(
        `${type.constructor.name} is not handled. Is that type supported?`,
      );
    },
    getInitialOutput() {
      if (inputFormMeta.getInitialOutput) {
        return inputFormMeta.getInitialOutput();
      }

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
      } else if (type instanceof MobxZodBox) {
        return undefined;
      }

      throw new MobxFatalError(
        `${type.constructor.name} is not handled. Is that type supported?`,
      );
    },
  };
};

export const empty = Symbol("empty") as any;
