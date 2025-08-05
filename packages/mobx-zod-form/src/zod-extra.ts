import {
  z,
  output,
  input,
  ZodEffects,
  ZodIssueCode,
  ZodNullable,
  ZodOptional,
  ZodType,
  ZodTypeAny,
  ZodTypeDef,
  ZodString,
  ZodNumber,
  ZodBoolean,
  ZodEnum,
  ZodLiteral,
  ZodAny,
  ZodUndefined,
  ZodNull,
  ZodDate,
} from "zod";

import { FormMeta, resolveDOMFormMeta } from "./FormMeta";
import { MobxZodDiscriminatedUnionFieldTypes } from "./MobxZodField";
import { MobxZodDiscriminatedUnion, MobxZodPrimitiveTypes } from "./types";

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

    /**
     * A wrapping type that parses as-is like its inner type,
     * but forbids mobx-zod-form from creating fields or encoding/decoding for inner fields.
     * In other words, the inner value will be treated as if it is an atomic value.
     *
     * This means you can deal with the object with your custom logics.
     */
    box(): MobxZodBox<this>;

    /**
     * Shorthand for `.formMeta({ label })`
     */
    label<Z extends ZodTypeAny>(this: Z, label: string): Z;
  }
}

/**
 * Extend zod so that you can append `formMeta` onto it.
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
    if (this instanceof ZodEffects) {
      return new ZodEffects({
        ...this._def,
        schema: this.innerType().formMeta(meta),
      });
    } else if (this instanceof ZodNullable) {
      return new ZodNullable({
        ...this._def,
        innerType: this.unwrap().formMeta(meta),
      });
    } else if (this instanceof ZodOptional) {
      return new ZodOptional({
        ...this._def,
        innerType: this.unwrap().formMeta(meta),
      });
    } else {
      const o = new (this as any).constructor({
        ...this._def,
        _formMeta: {
          ...this._formMeta,
          ...meta,
        },
      });

      return o;
    }
  };

  zod.ZodType.prototype.label = function (this, label) {
    return this.formMeta({ label });
  };

  zod.ZodType.prototype.getFormMeta = function () {
    return resolveDOMFormMeta(this);
  };

  zod.ZodType.prototype.box = function () {
    return MobxZodBox.create(this);
  };
}

export type DiscriminatorType<T extends MobxZodDiscriminatedUnion> = ZodType<
  T["options"][number]["shape"][T["discriminator"]]["_output"],
  ZodTypeDef
>;

export const discriminatorType = <T extends MobxZodDiscriminatedUnion>(
  type: T,
): DiscriminatorType<T> => {
  const innerType =
    z.custom<MobxZodDiscriminatedUnionFieldTypes<T>["_discriminatorOutput"]>();

  (innerType._def as any).__isDiscriminatorType = true;

  const result = innerType.superRefine((arg, ctx) => {
    // @see https://github.com/colinhacks/zod/blob/6dad90785398885f7b058f5c0760d5ae5476b833/src/types.ts#L2929

    if (!type.optionsMap.get(arg)) {
      ctx.addIssue({
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(type.optionsMap.keys()),
        path: [type.discriminator],
      });
      return z.INVALID;
    }
  });

  return result;
};

export const isDiscriminatorType = (
  t: ZodTypeAny,
): t is DiscriminatorType<MobxZodDiscriminatedUnion> => {
  return (unwrapZodType(t)._def as any).__isDiscriminatorType === true;
};

export const unwrapZodType = (t: ZodTypeAny): ZodTypeAny => {
  if (t instanceof ZodEffects) {
    return unwrapZodType(t.innerType());
  } else if (t instanceof ZodNullable || t instanceof ZodOptional) {
    return unwrapZodType(t.unwrap());
  }
  return t;
};

export const isPrimitiveZodType = (
  t: ZodTypeAny,
): t is MobxZodPrimitiveTypes => {
  return (
    t instanceof ZodString ||
    t instanceof ZodNumber ||
    t instanceof ZodBoolean ||
    t instanceof ZodEnum ||
    t instanceof ZodLiteral ||
    t instanceof ZodAny ||
    t instanceof ZodUndefined ||
    t instanceof ZodNull ||
    t instanceof ZodDate
  );
};

export interface MobxZodBoxDef<T extends ZodTypeAny> extends ZodTypeDef {
  schema: T;
}

export class MobxZodBox<
  T extends ZodTypeAny,
  Output = output<T>,
  Input = input<T>,
> extends ZodType<Output, MobxZodBoxDef<T>, Input> {
  _parse(input: z.ParseInput): z.ParseReturnType<Output> {
    return this._def.schema._parse(input);
  }

  innerType(): T {
    return this._def.schema;
  }

  static create = <I extends ZodTypeAny>(schema: I) => {
    return new MobxZodBox({
      schema,
    });
  };
}
