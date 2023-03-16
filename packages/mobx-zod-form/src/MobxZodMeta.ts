import {
  z,
  ZodArray,
  ZodBoolean,
  ZodNumber,
  ZodObject,
  ZodString,
  ZodTypeAny,
  ZodTypeDef,
} from "zod";

import { Expand } from "./type-utils";

export interface MobxZodMetaOptional {
  label?: string;
  description?: string;
}

export interface MobxZodMeta extends MobxZodMetaOptional {
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
    _mobxMeta: Readonly<{}>;

    mobxMeta<T extends Partial<MobxZodMeta>, Z extends ZodTypeAny>(
      this: Z,
      meta: T,
    ): Expand<
      Z & {
        _mobxMeta: Expand<T & Z["mobxMeta"]>;
      }
    >;

    eraseMobxMeta<Z extends ZodTypeAny>(
      this: Z,
    ): Expand<
      Z & {
        _mobxMeta: Partial<MobxZodMeta>;
      }
    >;
  }
}

/**
 * Extend zod so that you can append `mobxZodMeta` onto it.
 * @param zod the z object imported from zod
 */
export function extendZodWithMobxZodForm(zod: typeof z) {
  if (zod.ZodType.prototype.mobxMeta !== undefined) {
    console.warn(
      "`extendZodWithMobxZodForm` is already called on the same z object. You probably should not call it twice.",
    );
    return;
  }

  Object.defineProperty(zod.ZodType.prototype, "_mobxMeta", {
    get() {
      return this._def._mobxMeta || {}; // To match type definition '_mobxMeta: Readonly<{}>'
    },
  });

  zod.ZodType.prototype.mobxMeta = function (meta: any) {
    const o = new (this as any).constructor({
      ...this._def,
      _mobxMeta: {
        ...this._mobxMeta,
        ...meta,
      },
    });

    return o;
  };
}

/**
 * Resolved MobxZodMeta for en/decoding on DOM inputs.
 * Encodes number as decimal strings, and other as-is.
 */
export const resolveDOMMobxZodMeta = (type: ZodTypeAny): MobxZodMeta => {
  const inputMobxZodMeta = type._mobxMeta as MobxZodMeta;

  return {
    ...inputMobxZodMeta,
    decode(input) {
      if (inputMobxZodMeta?.decode) {
        return inputMobxZodMeta.decode(input);
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
      } else if (type instanceof ZodObject) {
        if (typeof input === "object") {
          return Object.fromEntries(
            Object.entries(type.shape).map(([key, value]) => [
              key,
              resolveDOMMobxZodMeta(value as any).decode(input[key]),
            ]),
          );
        }
      } else if (type instanceof ZodArray) {
        if (Array.isArray(input)) {
          return input.map((v) =>
            resolveDOMMobxZodMeta(type.element as any).decode(v),
          );
        }
      }

      return input;
    },
    encode(output: any) {
      if (inputMobxZodMeta?.encode) {
        return inputMobxZodMeta.encode(output);
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
      } else if (type instanceof ZodObject) {
        if (output === empty) {
          return Object.entries(type.shape).map(([key, value]) => [
            key,
            resolveDOMMobxZodMeta(value as any).encode(empty),
          ]);
        }

        return Object.fromEntries(
          Object.entries(type.shape).map(([key, value]) => [
            key,
            resolveDOMMobxZodMeta(value as any).encode(output[key]),
          ]),
        );
      } else if (type instanceof ZodArray) {
        if (type === empty) {
          return [];
        }

        return output.map((o: any) =>
          resolveDOMMobxZodMeta(type.element as any).encode(o),
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
      } else if (type instanceof ZodObject) {
        return Object.fromEntries(
          Object.entries(type.shape).map(([key, value]) => [
            key,
            resolveDOMMobxZodMeta(value as any).getInitialOutput(),
          ]),
        );
      } else if (type instanceof ZodArray) {
        return [];
      }
    },
  };
};

export const empty = Object.create(null) as any;
