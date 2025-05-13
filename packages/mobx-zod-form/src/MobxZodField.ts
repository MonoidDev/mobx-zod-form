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
  ZodEnum,
  ZodOptional,
  ZodNullable,
  ZodDiscriminatedUnion,
  ZodEffects,
} from "zod";

import { MobxFatalError } from "./errors";
import { FormMeta, SafeDecodeResult } from "./FormMeta";
import { getPathId } from "./js-utils";
import {
  MobxZodArrayFieldImpl,
  MobxZodBaseFieldImpl,
  MobxZodDiscriminatedUnionFieldImpl,
  MobxZodObjectFieldImpl,
  MobxZodOmittableFieldImpl,
} from "./MobxZodFieldImpl";
import { MobxZodForm, InputSetActionOptions } from "./MobxZodForm";
import { Expand, IdxOf, IsAny, UnwrapZodNullish } from "./type-utils";
import type {
  MobxOmittableTypes,
  MobxZodArray,
  MobxZodDiscriminatedUnion,
  MobxZodEffects,
  MobxZodLiteral,
  MobxZodObject,
  MobxZodTypes,
} from "./types";
import { DiscriminatorType, MobxZodBox } from "./zod-extra";

export interface MobxZodField<T extends ZodTypeAny> {
  /**
   * The Zod type associated with the field
   */
  type: T;
  /**
   * The optional HTMLElement associated with the field.
   * Typically set in frontend framework.
   */
  element: HTMLElement | null;
  /**
   * An id uniquely identifies the field across the form.
   * Useful for SSR and tracking array field elements.
   */
  readonly uniqueId: string;
  /**
   * See `FormMeta`.
   */
  readonly formMeta: FormMeta;
  /**
   * The form containing the field.
   */
  readonly form: MobxZodForm<ZodTypeAny>;
  /**
   * The path of the field. Only contains numbers for array indices and strings for object keys.
   * For example, the first field `a` in `items` in `{ items: [{ a: 'text' }] }` would be `['items', 0, 'a']`
   */
  path: ParsePath;
  /**
   * The original input, e.g. from DOM string.
   */
  rawInput: unknown;
  /**
   * The input converted from rawInput, e.g. for a number field, "01234" is converted to 1234
   */
  decodeResult: SafeDecodeResult<unknown, T["_input"]>;
  /**
   * Set the raw input, triggering the form validation
   */
  setRawInput(value: unknown): void;
  /**
   * Set the output, encode it into the form, trigger the form validation
   */
  setOutput(output: T["_output"]): void;
  /**
   * @internal
   * When this field's value has changed involuntarily, e.g. the parent field has called 'setRawInput'
   */
  _onInputChange(): void;
  /**
   * Issues associated with this field.
   */
  issues: readonly ZodIssue[];
  /**
   * @internal
   */
  _issues: ZodIssue[];
  /**
   * Whether user has interacted with the field.
   */
  touched: boolean;
  /**
   * @internal
   */
  _touched: boolean;
  /**
   * Manually set whether the user has interacted with the field.
   * @param touched
   * @returns
   */
  setTouched: (touched: boolean) => void;
  /**
   * Error messages associated with the field.
   */
  errorMessages: readonly string[];
  /**
   * @internal
   */
  _errorMessages: string[];
  /**
   * @internal
   */
  _updatePath: (newPath: ParsePath) => void;
  /**
   * @internal
   */
  _walk: (handler: (f: MobxZodField<any>) => void) => void;
  /**
   * Extra error messages associated with the field,
   * i.e. errors not from the schema.
   * Extra error messages are merely for the user's infomration,
   * and does not block submission by default.
   * Extra errror messages are removed from the field once the input changes or the form is submitted.
   */
  extraErrorMessages: readonly string[];
  /**
   * @internal
   */
  _extraErrorMessages: string[];
  setExtraErrorMessages: (e: string[]) => void;
}

export type FieldWithEffects<
  F extends MobxZodField<ZodTypeAny>,
  E extends MobxZodEffects,
> = Expand<Omit<F, "effects"> & { effects: E }>;

export type MapZodTypeToField<T extends MobxZodTypes> = true extends IsAny<T>
  ? MobxZodField<T>
  : T extends
      | ZodString
      | ZodNumber
      | ZodBoolean
      | ZodEnum<[string, ...string[]]>
      | MobxZodLiteral
  ? MobxZodField<T>
  : T extends ZodOptional<ZodTypeAny>
  ? MobxZodOptionalField<T>
  : T extends ZodNullable<ZodTypeAny>
  ? MobxZodNullableField<T>
  : T extends MobxZodObject
  ? MobxZodObjectField<T>
  : T extends MobxZodArray
  ? MobxZodArrayField<T>
  : T extends MobxZodDiscriminatedUnion
  ? MobxZodDiscriminatedUnionField<T>
  : T extends MobxZodEffects
  ? FieldWithEffects<MapZodTypeToField<T["_def"]["schema"]>, T>
  : T extends MobxZodBox<ZodTypeAny>
  ? MobxZodField<T>
  : never;

export type MobxZodObjectFieldFields<T extends MobxZodObject> = {
  [K in keyof T["shape"]]: MapZodTypeToField<T["shape"][K]>;
};

export interface MobxZodObjectField<T extends MobxZodObject>
  extends MobxZodField<T> {
  /**
   * The child fields of this field, matching the object's shape.
   */
  fields: MobxZodObjectFieldFields<T>;
}

export interface MobxZodArrayField<T extends MobxZodArray>
  extends MobxZodField<T> {
  _elementOutput: T["element"]["_output"];
  /**
   * The child fields of this field.
   */
  elements: readonly MapZodTypeToField<T["element"]>[];
  /**
   * The field array's length.
   */
  length: number;
  /**
   * Array.pop for the field array.
   */
  pop(): unknown;
  /**
   * Array.push for the field array.
   */
  push(...items: this["_elementOutput"][]): number;
  /**
   * Array.shift for the field array
   */
  shift(): unknown;
  // TODO: sort the fields in place
  /**
   * Array.splice for the field array. See MDN for more.
   * @param start
   * @param deleteCount
   * @param values
   * @param options
   * @returns
   */
  splice: (
    start: number,
    deleteCount: number,
    values: this["_elementOutput"][],
    options?: InputSetActionOptions,
  ) => void;
}

// Omit the discriminator field because it is special in forms
export type MobxZodDiscriminatedUnionFieldFieldsSuccess<
  Discriminator extends string,
  Options extends ZodDiscriminatedUnionOption<string>[],
> = {
  [K in IdxOf<Options>]: Options[K] extends MobxZodObject
    ? Omit<MobxZodObjectField<Options[K]>["fields"], Discriminator> & {
        discriminator: Options[K]["shape"][Discriminator]["_output"];
      }
    : never;
}[IdxOf<Options>];

export type MobxZodDiscriminatedUnionFieldsResult<
  Discriminator extends string,
  Options extends ZodDiscriminatedUnionOption<string>[],
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

/**
 * Various computed types for DiscriminatedUnion
 */
export interface MobxZodDiscriminatedUnionFieldTypes<
  T extends MobxZodDiscriminatedUnion,
> {
  _discriminator: T["discriminator"];
  _discriminatorType: DiscriminatorType<T>;
  _discriminatorInput: this["_discriminatorType"]["_input"];
  _discriminatorOutput: this["_discriminatorType"]["_output"];
  _discriminatorParsedResult: SafeParseReturnType<
    this["_discriminatorOutput"],
    this["_discriminatorInput"]
  >;
  _fieldsResult: MobxZodDiscriminatedUnionFieldsResult<
    this["_discriminator"],
    T["options"]
  >;
}

export interface MobxZodDiscriminatedUnionField<
  T extends MobxZodDiscriminatedUnion,
> extends MobxZodField<T> {
  _types: MobxZodDiscriminatedUnionFieldTypes<T>;
  discriminatorField: MobxZodField<DiscriminatorType<T>>;
  fieldsResult: this["_types"]["_fieldsResult"];
}

export type MobxZodOmittableFieldTypes<T extends MobxOmittableTypes> = {
  _innerField: MapZodTypeToField<T["_def"]["innerType"]>;
};

type _MobxZodOmittableFieldInnerField<
  T extends MobxOmittableTypes,
  Default,
  Inner = UnwrapZodNullish<T>,
> = Inner extends ZodNumber
  ? MobxZodField<ZodNumber>
  : Inner extends ZodString
  ? MobxZodField<ZodString>
  : Default;

export interface MobxZodOmittableField<T extends MobxOmittableTypes>
  extends MobxZodField<T> {
  _types: MobxZodOmittableFieldTypes<T>;
  /**
   * If the input is null or undefined, innerField will be undefined;
   * else, it will be the field that its inner type is mapped to.
   * For ZodString and ZodNumber inner type,
   * it is always not undefined,
   * because null or undefined will be encoded to empty string.
   */
  innerField: _MobxZodOmittableFieldInnerField<
    T,
    this["_types"]["_innerField"] | undefined
  >;
}

export interface MobxZodOptionalField<T extends MobxOmittableTypes>
  extends MobxZodOmittableField<T> {}

export interface MobxZodNullableField<T extends MobxOmittableTypes>
  extends MobxZodOmittableField<T> {}

export const createFieldForType = <T extends MobxZodTypes>(
  type: T,
  form: MobxZodForm<any>,
  path: ParsePath,
): MapZodTypeToField<T> => {
  if (
    type instanceof ZodString ||
    type instanceof ZodNumber ||
    type instanceof ZodBoolean ||
    type instanceof ZodEnum ||
    type instanceof ZodLiteral
  ) {
    return new MobxZodBaseFieldImpl<typeof type>(type, form, path) as any;
  } else if (type instanceof ZodOptional || type instanceof ZodNullable) {
    return new MobxZodOmittableFieldImpl<typeof type>(type, form, path) as any;
  } else if (type instanceof ZodObject) {
    return new MobxZodObjectFieldImpl<typeof type>(type, form, path) as any;
  } else if (type instanceof ZodArray) {
    return new MobxZodArrayFieldImpl<typeof type>(type, form, path) as any;
  } else if (type instanceof ZodDiscriminatedUnion) {
    return new MobxZodDiscriminatedUnionFieldImpl(type, form, path) as any;
  } else if (type instanceof ZodEffects) {
    // Where TypeScript breaks down
    const field = createFieldForType<ZodTypeAny>(
      type.sourceType(),
      form,
      path,
    ) as any;
    field.effects = type;
    return field;
  } else if (type instanceof MobxZodBox) {
    return new MobxZodBaseFieldImpl<typeof type>(type, form, path) as any;
  }

  throw new MobxFatalError(
    `type ${
      type.constructor.name
    } is not handled. Check the type at ${JSON.stringify(
      getPathId(path),
    )}. For a list of supported Zod types, see TODO`,
  );
};
