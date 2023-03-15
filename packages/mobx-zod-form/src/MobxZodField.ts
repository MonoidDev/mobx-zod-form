import {
  ZodString,
  ZodNumber,
  ParsePath,
  ZodBoolean,
  ZodObject,
  ZodArray,
  ZodIssue,
  ZodTypeAny,
  SafeParseReturnType,
  ZodDiscriminatedUnionOption,
  ZodLiteral,
  ZodError,
} from "zod";

import {
  MobxZodArrayFieldImpl,
  MobxZodBaseFieldImpl,
  MobxZodObjectFieldImpl,
} from "./MobxZodFieldImpl";
import { MobxZodForm, InputSetActionOptions } from "./MobxZodForm";
import { MobxZodMeta } from "./MobxZodMeta";
import { IdxOf } from "./type-utils";
import type {
  MobxZodArray,
  MobxZodDiscriminatedUnion,
  MobxZodLiteral,
  MobxZodObject,
  MobxZodTypes,
} from "./types";

export interface MobxZodField<T extends ZodTypeAny> {
  type: T;
  /**
   * An id uniquely identifies the field across the form.
   * Useful for SSR and tracking array field elements.
   */
  readonly uniqueId: number;
  readonly mobxZodMeta: MobxZodMeta;
  path: ParsePath;
  /**
   * The original input, e.g. from DOM string.
   */
  rawInput: unknown;
  /**
   * The input converted from rawInput, e.g. for a number field, "01234" is converted to 1234
   */
  input: T["_input"];
  /**
   * Set the raw input, triggering the form validation
   */
  setRawInput(value: unknown): void;
  /**
   * Set the output, encode it into the form, trigger the form validation
   */
  setOutput(output: T["_output"]): void;
  /**
   * Issues associated with this field
   */
  issues: readonly ZodIssue[];
  _issues: ZodIssue[];
  touched: boolean;
  _touched: boolean;
  setTouched: (touched: boolean) => void;
  errorMessages: readonly string[];
  _errorMessages: string[];
  _updatePath: (newPath: ParsePath) => void;
  _walk: (handler: (f: MobxZodField<any>) => void) => void;
}

export type MapZodTypeToField<T extends MobxZodTypes> = T extends
  | ZodString
  | ZodNumber
  | ZodBoolean
  | MobxZodLiteral
  ? MobxZodField<T>
  : T extends MobxZodObject
  ? MobxZodObjectField<T>
  : T extends MobxZodArray
  ? MobxZodArrayField<T>
  : T extends MobxZodDiscriminatedUnion
  ? MobxZodDiscriminatedUnionField<T>
  : never;

export type MobxZodObjectFieldFields<T extends MobxZodObject> = {
  [K in keyof T["shape"]]: MapZodTypeToField<T["shape"][K]>;
};

export interface MobxZodObjectField<T extends MobxZodObject>
  extends MobxZodField<T> {
  fields: MobxZodObjectFieldFields<T>;
}

export interface MobxZodArrayField<T extends MobxZodArray>
  extends MobxZodField<T> {
  _elementOutput: T["element"]["_output"];

  elements: readonly MapZodTypeToField<T["element"]>[];
  length: number;
  pop(): unknown;
  push(...items: this["_elementOutput"][]): number;
  shift(): unknown;
  // TODO: sort the fields in place
  splice: (
    start: number,
    deleteCount: number,
    values: this["_elementOutput"][],
    options?: InputSetActionOptions
  ) => void;
}

export type MobxZodDiscriminatedUnionFieldFieldsSuccess<
  Discriminator extends string,
  Options extends ZodDiscriminatedUnionOption<string>[]
> = {
  [K in IdxOf<Options>]: Options[K] extends MobxZodObject
    ? MobxZodObjectField<Options[K]>["fields"] & {
        discriminator: Options[K]["shape"][Discriminator]["_output"];
      }
    : never;
}[IdxOf<Options>];

export type MobxZodDiscriminatedUnionFieldsResult<
  Discriminator extends string,
  Options extends ZodDiscriminatedUnionOption<string>[]
> =
  | {
      success: false;
      error: ZodError<unknown>;
    }
  | {
      success: true;
      fields: MobxZodDiscriminatedUnionFieldFieldsSuccess<
        Discriminator,
        Options
      >;
    };

export interface MobxZodDiscriminatedUnionField<
  T extends MobxZodDiscriminatedUnion
> extends MobxZodField<T> {
  _discriminator: T["discriminator"];
  _discriminatorType: T["options"][number]["shape"][T["discriminator"]];
  _discriminatorInput: this["_discriminatorType"]["_input"];
  _discriminatorOutput: this["_discriminatorType"]["_output"];
  discriminatorParsed: SafeParseReturnType<
    this["_discriminatorInput"],
    this["_discriminatorOutput"]
  >;
  fieldsResult: MobxZodDiscriminatedUnionFieldsResult<
    this["_discriminator"],
    T["options"]
  >;
}

export const createFieldForType = <T extends MobxZodTypes>(
  type: T,
  form: MobxZodForm<any>,
  path: ParsePath
): MapZodTypeToField<T> => {
  if (
    type instanceof ZodString ||
    type instanceof ZodNumber ||
    type instanceof ZodBoolean ||
    type instanceof ZodLiteral
  ) {
    return new MobxZodBaseFieldImpl<typeof type>(type, form, path) as any;
  } else if (type instanceof ZodObject) {
    return new MobxZodObjectFieldImpl<typeof type>(type, form, path) as any;
  } else if (type instanceof ZodArray) {
    return new MobxZodArrayFieldImpl<typeof type>(type, form, path) as any;
  }

  // TODO: better error display
  throw new Error("type is not handled");
};
